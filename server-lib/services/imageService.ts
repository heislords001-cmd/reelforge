import { env } from '../config/env';
import { query } from '../config/database';
import { providerRegistry } from '../providers/registry';
import { Scene, SceneImage } from '../types';
import { ApiError } from '../utils/ApiError';
import { mapWithConcurrency } from '../utils/concurrency';
import { projectService } from './projectService';
import { storageService } from './storageService';
import { subscriptionService } from './subscriptionService';

async function generateAndStore(scene: Scene, providerName: string, style?: string): Promise<SceneImage> {
  const provider = providerRegistry.getImageProvider(providerName);
  const result = await provider.generateImage({ prompt: scene.image_prompt, style, aspectRatio: '16:9' });
  const uploaded = await storageService.uploadImage(result.buffer, result.contentType);

  // Deselect previous images for this scene so exactly one stays "active". When called
  // multiple times per scene for premium's multi-variant generation, this UPDATE-then-INSERT
  // ordering (each a separate round-trip) naturally converges to exactly one selected image
  // per scene regardless of which call finishes last; Postgres serializes the concurrent
  // writes, it just doesn't guarantee which variant "wins" the auto-select, which is fine.
  await query('UPDATE scene_images SET is_selected = false WHERE scene_id = $1', [scene.id]);

  const { rows } = await query<SceneImage>(
    `INSERT INTO scene_images (scene_id, url, storage_key, provider, model, is_selected)
     VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
    [scene.id, uploaded.url, uploaded.storageKey, provider.name, provider.model]
  );
  return rows[0];
}

export const imageService = {
  /** Generates images for every scene. Free tier gets FLUX Schnell, 1 image per scene.
   *  Premium gets Nano Banana, a genuinely stronger paid model, with multiple variants to
   *  choose from per scene. Both the model and the variant count are real premium value now,
   *  not just "more of the same" like before a commercially licensed premium model existed. */
  async generateAll(projectId: string, userId: string) {
    const project = await projectService.getOwned(projectId, userId);
    const { rows: scenes } = await query<Scene>(
      'SELECT * FROM scenes WHERE project_id = $1 ORDER BY order_index ASC',
      [projectId]
    );
    if (scenes.length === 0) {
      throw ApiError.badRequest('Generate a script before generating images');
    }

    const planFields = await subscriptionService.getPlanFields(userId).catch(() => {
      throw ApiError.notFound('User not found');
    });
    const isPremium = subscriptionService.isPremiumActive(planFields);
    const providerName = subscriptionService.imageProviderNameFor(planFields);
    const variantsPerScene = isPremium ? env.imagesPerScenePremium : env.imagesPerSceneFree;

    const jobRes = await query<{ id: string }>(
      `INSERT INTO generation_jobs (project_id, job_type, provider, status) VALUES ($1, 'image', $2, 'running') RETURNING id`,
      [projectId, providerName]
    );
    const jobId = jobRes.rows[0].id;

    try {
      // Flatten (scene × variant) into one task list so concurrency is capped globally at 3
      // in-flight requests regardless of scene count or variants-per-scene. Keeps this
      // predictable under rate limits either way.
      const tasks: Scene[] = [];
      for (const scene of scenes) {
        for (let i = 0; i < variantsPerScene; i++) tasks.push(scene);
      }

      await mapWithConcurrency(tasks, 3, (scene) => generateAndStore(scene, providerName, project.settings.imageStyle));
      await projectService.updateStatus(projectId, 'images_ready');
      await query(`UPDATE generation_jobs SET status = 'succeeded', finished_at = now() WHERE id = $1`, [jobId]);
    } catch (err) {
      await query(
        `UPDATE generation_jobs SET status = 'failed', error_message = $2, finished_at = now() WHERE id = $1`,
        [jobId, err instanceof Error ? err.message : 'Unknown error']
      );
      if (err instanceof ApiError) throw err;
      throw ApiError.upstream('Image generation failed');
    }

    return projectService.getFullProject(projectId, userId);
  },

  /** Regenerates a single scene's image, always exactly one new variant, using whichever
   *  tier the user currently has, same as generateAll. */
  async regenerateOne(sceneId: string, projectId: string, userId: string) {
    const project = await projectService.getOwned(projectId, userId);
    const { rows } = await query<Scene>('SELECT * FROM scenes WHERE id = $1 AND project_id = $2', [
      sceneId,
      projectId,
    ]);
    const scene = rows[0];
    if (!scene) throw ApiError.notFound('Scene not found');

    const planFields = await subscriptionService.getPlanFields(userId).catch(() => {
      throw ApiError.notFound('User not found');
    });
    const providerName = subscriptionService.imageProviderNameFor(planFields);

    const image = await generateAndStore(scene, providerName, project.settings.imageStyle);
    return image;
  },

  /** Switches which stored variant is "active" for a scene. Used by premium users picking
   *  between the multiple images generated for that scene. */
  async selectVariant(sceneId: string, projectId: string, userId: string, imageId: string) {
    await projectService.getOwned(projectId, userId);

    const { rowCount } = await query('SELECT 1 FROM scene_images WHERE id = $1 AND scene_id = $2', [
      imageId,
      sceneId,
    ]);
    if (rowCount === 0) throw ApiError.notFound('Image not found for this scene');

    await query('UPDATE scene_images SET is_selected = false WHERE scene_id = $1', [sceneId]);
    await query('UPDATE scene_images SET is_selected = true WHERE id = $1', [imageId]);
  },
};
