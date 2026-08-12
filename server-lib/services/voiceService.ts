import { query } from '../config/database';
import { providerRegistry } from '../providers/registry';
import { DEFAULT_VOICE_CONTROLS, PREMIUM_VOICE_CATEGORIES, Scene, VoiceCategory, VoiceControls, VoiceTrack } from '../types';
import { ApiError } from '../utils/ApiError';
import { mapWithConcurrency } from '../utils/concurrency';
import { projectService } from './projectService';
import { storageService } from './storageService';
import { subscriptionService } from './subscriptionService';

async function synthesizeAndStore(
  projectId: string,
  scene: Scene,
  voiceCategory: VoiceCategory,
  controls: VoiceControls
): Promise<VoiceTrack> {
  const provider = providerRegistry.getVoiceProvider();
  const result = await provider.synthesize({ text: scene.narration_text, voiceCategory, controls });
  const uploaded = await storageService.uploadAudio(result.buffer, result.contentType);

  const { rows } = await query<VoiceTrack>(
    `INSERT INTO voice_tracks (project_id, scene_id, voice_category, url, storage_key, duration_seconds, settings, provider, model)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      projectId,
      scene.id,
      voiceCategory,
      uploaded.url,
      uploaded.storageKey,
      result.durationSeconds ?? null,
      JSON.stringify(controls),
      provider.name,
      'chatterbox-tts',
    ]
  );
  return rows[0];
}

/** Throws if a free/expired-trial user asks for a premium-only voice category. */
async function assertVoiceCategoryAllowed(userId: string, voiceCategory: VoiceCategory) {
  if (!PREMIUM_VOICE_CATEGORIES.includes(voiceCategory)) return;

  const planFields = await subscriptionService.getPlanFields(userId).catch(() => {
    throw ApiError.notFound('User not found');
  });
  if (!subscriptionService.isPremiumActive(planFields)) {
    throw ApiError.forbidden(
      `"${voiceCategory}" is a premium voice. Upgrade to use it, or pick one of the free categories.`
    );
  }
}

export const voiceService = {
  async generateAll(
    projectId: string,
    userId: string,
    voiceCategory: VoiceCategory,
    controls: VoiceControls = DEFAULT_VOICE_CONTROLS
  ) {
    await projectService.getOwned(projectId, userId);
    await assertVoiceCategoryAllowed(userId, voiceCategory);

    const { rows: scenes } = await query<Scene>(
      'SELECT * FROM scenes WHERE project_id = $1 ORDER BY order_index ASC',
      [projectId]
    );
    if (scenes.length === 0) {
      throw ApiError.badRequest('Generate a script before generating narration');
    }

    const jobRes = await query<{ id: string }>(
      `INSERT INTO generation_jobs (project_id, job_type, provider, status) VALUES ($1, 'voice', $2, 'running') RETURNING id`,
      [projectId, providerRegistry.getVoiceProvider().name]
    );
    const jobId = jobRes.rows[0].id;

    try {
      // Clear previous narration so regenerating with a new voice/controls doesn't leave stale tracks.
      await query('DELETE FROM voice_tracks WHERE project_id = $1', [projectId]);

      await mapWithConcurrency(scenes, 3, (scene) => synthesizeAndStore(projectId, scene, voiceCategory, controls));

      await query(
        `UPDATE projects SET settings = settings || $2::jsonb, status = 'voice_ready', updated_at = now() WHERE id = $1`,
        [projectId, JSON.stringify({ voiceCategory, voiceControls: controls })]
      );
      await query(`UPDATE generation_jobs SET status = 'succeeded', finished_at = now() WHERE id = $1`, [jobId]);
    } catch (err) {
      await query(
        `UPDATE generation_jobs SET status = 'failed', error_message = $2, finished_at = now() WHERE id = $1`,
        [jobId, err instanceof Error ? err.message : 'Unknown error']
      );
      if (err instanceof ApiError) throw err;
      throw ApiError.upstream('Voice generation failed');
    }

    return projectService.getFullProject(projectId, userId);
  },

  async regenerateOne(
    sceneId: string,
    projectId: string,
    userId: string,
    voiceCategory: VoiceCategory,
    controls: VoiceControls = DEFAULT_VOICE_CONTROLS
  ) {
    await projectService.getOwned(projectId, userId);
    await assertVoiceCategoryAllowed(userId, voiceCategory);

    const { rows } = await query<Scene>('SELECT * FROM scenes WHERE id = $1 AND project_id = $2', [
      sceneId,
      projectId,
    ]);
    const scene = rows[0];
    if (!scene) throw ApiError.notFound('Scene not found');

    await query('DELETE FROM voice_tracks WHERE scene_id = $1', [sceneId]);
    return synthesizeAndStore(projectId, scene, voiceCategory, controls);
  },
};
