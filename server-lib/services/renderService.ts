import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { query } from '../config/database';
import { env } from '../config/env';
import { providerRegistry } from '../providers/registry';
import { storageService } from './storageService';
import { subscriptionService } from './subscriptionService';
import { projectService } from './projectService';
import { assembleVideo, SceneInput } from '../render/ffmpeg';
import { AspectRatio, RenderJob, Scene, SceneImage, VoiceTrack } from '../types';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

/** Render is CPU heavy and takes minutes. This service only runs where RENDER_ENABLED=true,
 *  never on Vercel serverless. It is meant to run on Railway, Render.com, Fly.io, or any
 *  container host where the process stays alive while ffmpeg works. */

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} for ${url}`);
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function updateJob(id: string, fields: Partial<RenderJob>): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (fields.status !== undefined) { vals.push(fields.status); sets.push(`status=$${vals.length}`); }
  if (fields.progress !== undefined) { vals.push(fields.progress); sets.push(`progress=$${vals.length}`); }
  if (fields.output_url !== undefined) { vals.push(fields.output_url); sets.push(`output_url=$${vals.length}`); }
  if (fields.error_message !== undefined) { vals.push(fields.error_message); sets.push(`error_message=$${vals.length}`); }
  if (fields.finished_at !== undefined) { vals.push(fields.finished_at); sets.push(`finished_at=$${vals.length}`); }
  if (!sets.length) return;
  vals.push(id);
  await query(`UPDATE render_jobs SET ${sets.join(',')} WHERE id=$${vals.length}`, vals);
}

export const renderService = {
  async createJob(projectId: string, userId: string): Promise<RenderJob> {
    if (!env.render.enabled) {
      throw ApiError.internal('Video rendering is not available on this deployment. Run the app on a container host with RENDER_ENABLED=true.');
    }

    const planFields = await subscriptionService.getPlanFields(userId);
    const isPremium = subscriptionService.isPremiumActive(planFields);
    const mode = isPremium ? 'clips' : 'kenburns';
    const watermark = !isPremium;

    const { rows } = await query<RenderJob>(
      `INSERT INTO render_jobs (project_id, user_id, mode, watermark)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [projectId, userId, mode, watermark]
    );
    return rows[0];
  },

  async getJob(jobId: string, userId: string): Promise<RenderJob> {
    const { rows } = await query<RenderJob>(
      'SELECT * FROM render_jobs WHERE id=$1 AND user_id=$2',
      [jobId, userId]
    );
    if (!rows[0]) throw ApiError.notFound('Render job not found');
    return rows[0];
  },

  async listJobs(projectId: string, userId: string): Promise<RenderJob[]> {
    const { rows } = await query<RenderJob>(
      'SELECT * FROM render_jobs WHERE project_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 10',
      [projectId, userId]
    );
    return rows;
  },

  /** Runs the actual render. Called from a worker context, never from an HTTP request handler. */
  async runJob(jobId: string): Promise<void> {
    const { rows } = await query<RenderJob>('SELECT * FROM render_jobs WHERE id=$1', [jobId]);
    const job = rows[0];
    if (!job) throw new Error(`Render job ${jobId} not found`);

    const progress = async (msg: string) => {
      logger.info(`[render ${jobId}] ${msg}`);
      await updateJob(jobId, { progress: msg });
    };

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `reelbolt-render-${jobId.slice(0, 8)}-`));
    try {
      await updateJob(jobId, { status: 'running', progress: 'Starting' });

      const { project, scenes, images, voiceTracks } = await projectService.getFullProject(job.project_id, job.user_id);
      if (!scenes.length) throw new Error('No scenes found. Generate a script first.');
      if (!voiceTracks.length) throw new Error('No narration found. Generate audio first.');
      if (!images.length) throw new Error('No images found. Generate video frames first.');

      const aspect: AspectRatio = (project.settings.aspectRatio as AspectRatio) ?? '16:9';
      const imagesByScene = new Map<string, SceneImage>();
      for (const img of images) if (img.is_selected) imagesByScene.set(img.scene_id, img);
      const tracksByScene = new Map<string, VoiceTrack>();
      for (const t of voiceTracks) if (t.scene_id) tracksByScene.set(t.scene_id, t);

      const sceneInputs: SceneInput[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene: Scene = scenes[i];
        const img = imagesByScene.get(scene.id);
        const track = tracksByScene.get(scene.id);
        if (!img) throw new Error(`No image for scene ${i + 1}. Regenerate images.`);
        if (!track) throw new Error(`No narration for scene ${i + 1}. Regenerate audio.`);

        await progress(`Downloading scene ${i + 1} of ${scenes.length}`);
        const imgPath = path.join(workDir, `img-${i}.jpg`);
        const audioPath = path.join(workDir, `audio-${i}.mp3`);
        await Promise.all([downloadFile(img.url, imgPath), downloadFile(track.url, audioPath)]);

        let visual: SceneInput['visual'] = { kind: 'image', path: imgPath };
        if (job.mode === 'clips') {
          try {
            await progress(`Generating animated clip for scene ${i + 1}`);
            const result = await providerRegistry.getImageToVideoProvider().generateClip({
              imageUrl: img.url,
              prompt: scene.image_prompt.slice(0, 500),
              seconds: env.magicHour.clipSeconds,
            });
            const clipPath = path.join(workDir, `clip-${i}.mp4`);
            await fs.writeFile(clipPath, result.buffer);
            visual = { kind: 'clip', path: clipPath };
          } catch (err) {
            logger.warn(`Magic Hour clip failed for scene ${i + 1}, falling back to ken burns`, { err: String(err) });
            // Fall back gracefully rather than failing the whole render.
          }
        }
        sceneInputs.push({ visual, audioPath });
      }

      const outPath = path.join(workDir, 'final.mp4');
      await assembleVideo({
        scenes: sceneInputs,
        aspect,
        watermark: job.watermark,
        workDir,
        outPath,
        onProgress: (msg) => progress(msg),
      });

      await progress('Uploading');
      const videoBytes = await fs.readFile(outPath);
      const { url } = await storageService.uploadVideo(videoBytes);
      await updateJob(jobId, { status: 'succeeded', output_url: url, progress: 'Done', finished_at: new Date().toISOString() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Render job ${jobId} failed`, { error: msg });
      await updateJob(jobId, { status: 'failed', error_message: msg, progress: 'Failed', finished_at: new Date().toISOString() });
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  },
};
