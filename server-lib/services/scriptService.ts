import { query } from '../config/database';
import { providerRegistry } from '../providers/registry';
import { projectService } from './projectService';
import { subscriptionService } from './subscriptionService';
import { ApiError } from '../utils/ApiError';

interface GenerateScriptArgs {
  projectId: string;
  userId: string;
}

export const scriptService = {
  async generate({ projectId, userId }: GenerateScriptArgs) {
    const project = await projectService.getOwned(projectId, userId);

    // Free trial behaves like premium until it expires, then falls back to the free-tier
    // model. See subscriptionService.scriptProviderNameFor for the actual rule.
    const planFields = await subscriptionService.getPlanFields(userId).catch(() => {
      throw ApiError.notFound('User not found');
    });
    const providerName = subscriptionService.scriptProviderNameFor(planFields);
    const provider = providerRegistry.getScriptProvider(providerName);

    const jobRes = await query<{ id: string }>(
      `INSERT INTO generation_jobs (project_id, job_type, provider, status)
       VALUES ($1, 'script', $2, 'running') RETURNING id`,
      [projectId, provider.name]
    );
    const jobId = jobRes.rows[0].id;

    try {
      const script = await provider.generateScript({
        prompt: project.prompt,
        targetLengthMinutes: project.settings.targetLengthMinutes,
        tone: project.settings.tone,
      });

      // Replace any previous script for this project (regeneration case).
      await query('DELETE FROM scripts WHERE project_id = $1', [projectId]);

      const { rows: scriptRows } = await query<{ id: string }>(
        `INSERT INTO scripts (project_id, hook, introduction, conclusion, call_to_action, raw_markdown, provider, model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          projectId,
          script.hook,
          script.introduction,
          script.conclusion,
          script.callToAction,
          script.rawMarkdown,
          provider.name,
          provider.model,
        ]
      );
      const scriptId = scriptRows[0].id;

      for (let i = 0; i < script.chapters.length; i++) {
        const chapter = script.chapters[i];
        await query(
          `INSERT INTO scenes (script_id, project_id, order_index, chapter_title, narration_text, image_prompt)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [scriptId, projectId, i, chapter.title, chapter.narration, chapter.imagePrompt]
        );
      }

      await projectService.updateStatus(projectId, 'script_ready');
      await query(`UPDATE generation_jobs SET status = 'succeeded', finished_at = now() WHERE id = $1`, [jobId]);

      return projectService.getFullProject(projectId, userId);
    } catch (err) {
      await query(
        `UPDATE generation_jobs SET status = 'failed', error_message = $2, finished_at = now() WHERE id = $1`,
        [jobId, err instanceof Error ? err.message : 'Unknown error']
      );
      if (err instanceof ApiError) throw err;
      throw ApiError.upstream('Script generation failed');
    }
  },

  /** Lets a user edit generated script text before moving on to images/voice. */
  async updateScene(sceneId: string, projectId: string, userId: string, fields: { chapterTitle?: string; narrationText?: string; imagePrompt?: string }) {
    await projectService.getOwned(projectId, userId); // ownership check

    const sets: string[] = [];
    const params: unknown[] = [];
    if (fields.chapterTitle !== undefined) {
      params.push(fields.chapterTitle);
      sets.push(`chapter_title = $${params.length}`);
    }
    if (fields.narrationText !== undefined) {
      params.push(fields.narrationText);
      sets.push(`narration_text = $${params.length}`);
    }
    if (fields.imagePrompt !== undefined) {
      params.push(fields.imagePrompt);
      sets.push(`image_prompt = $${params.length}`);
    }
    if (sets.length === 0) return;

    params.push(sceneId, projectId);
    await query(
      `UPDATE scenes SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length - 1} AND project_id = $${params.length}`,
      params
    );
  },
};
