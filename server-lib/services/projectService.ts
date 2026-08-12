import { query } from '../config/database';
import { Project, ProjectSettings, ProjectStatus, Scene, SceneImage, VoiceTrack } from '../types';
import { ApiError } from '../utils/ApiError';

export const projectService = {
  async create(userId: string, prompt: string, settings: Partial<ProjectSettings> = {}): Promise<Project> {
    const title = deriveTitleFromPrompt(prompt);
    const { rows } = await query<Project>(
      `INSERT INTO projects (user_id, title, prompt, settings)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, title, prompt, JSON.stringify(settings)]
    );
    return rows[0];
  },

  async listForUser(userId: string, opts: { search?: string; includeArchived?: boolean } = {}): Promise<Project[]> {
    const conditions = ['user_id = $1'];
    const params: unknown[] = [userId];

    if (!opts.includeArchived) conditions.push('is_archived = false');
    if (opts.search) {
      params.push(`%${opts.search}%`);
      conditions.push(`(title ILIKE $${params.length} OR prompt ILIKE $${params.length})`);
    }

    const { rows } = await query<Project>(
      `SELECT * FROM projects WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`,
      params
    );
    return rows;
  },

  async getOwned(projectId: string, userId: string): Promise<Project> {
    const { rows } = await query<Project>('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [
      projectId,
      userId,
    ]);
    if (!rows[0]) throw ApiError.notFound('Project not found');
    return rows[0];
  },

  async rename(projectId: string, userId: string, title: string): Promise<Project> {
    await this.getOwned(projectId, userId);
    const { rows } = await query<Project>(
      `UPDATE projects SET title = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [title, projectId]
    );
    return rows[0];
  },

  async updateStatus(projectId: string, status: ProjectStatus): Promise<void> {
    await query('UPDATE projects SET status = $1, updated_at = now() WHERE id = $2', [status, projectId]);
  },

  async updateSettings(projectId: string, userId: string, settings: Partial<ProjectSettings>): Promise<Project> {
    const project = await this.getOwned(projectId, userId);
    const merged = { ...project.settings, ...settings };
    const { rows } = await query<Project>(
      `UPDATE projects SET settings = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [JSON.stringify(merged), projectId]
    );
    return rows[0];
  },

  async duplicate(projectId: string, userId: string): Promise<Project> {
    const original = await this.getOwned(projectId, userId);
    const { rows } = await query<Project>(
      `INSERT INTO projects (user_id, title, prompt, status, settings)
       VALUES ($1, $2, $3, 'draft', $4)
       RETURNING *`,
      [userId, `${original.title} (copy)`, original.prompt, JSON.stringify(original.settings)]
    );
    // Note: script/scenes/images are intentionally not copied. A duplicate starts as a
    // fresh generation using the same prompt/settings, keeping storage costs predictable.
    return rows[0];
  },

  async remove(projectId: string, userId: string): Promise<void> {
    await this.getOwned(projectId, userId);
    await query('DELETE FROM projects WHERE id = $1', [projectId]);
  },

  async getFullProject(projectId: string, userId: string) {
    const project = await this.getOwned(projectId, userId);

    const { rows: scriptRows } = await query('SELECT * FROM scripts WHERE project_id = $1', [projectId]);
    const script = scriptRows[0] ?? null;

    const { rows: scenes } = await query<Scene>(
      'SELECT * FROM scenes WHERE project_id = $1 ORDER BY order_index ASC',
      [projectId]
    );

    const sceneIds = scenes.map((s) => s.id);
    let images: SceneImage[] = [];
    if (sceneIds.length > 0) {
      const { rows } = await query<SceneImage>(
        `SELECT * FROM scene_images WHERE scene_id = ANY($1) ORDER BY created_at ASC`,
        [sceneIds]
      );
      images = rows;
    }

    const { rows: voiceTracks } = await query<VoiceTrack>(
      'SELECT * FROM voice_tracks WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );

    return { project, script, scenes, images, voiceTracks };
  },
};

function deriveTitleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/^create (a|an)\s+/i, '');
  const words = trimmed.split(/\s+/).slice(0, 8).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1) || 'Untitled project';
}
