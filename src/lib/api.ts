import axios from 'axios';
import { AspectRatio, BillingStatus, RenderJob, FullProject, Project, User, VoiceCategory, VoiceControls } from './types';

// Always relative: in production this project serves both the static site and /api/* from
// the same Vercel deployment, so "/api" just resolves. In local dev, vite.config.ts proxies
// "/api" to the standalone Express server on :4000. Either way, no env var to keep in sync.
export const http = axios.create({ baseURL: '/api' });

/** Creation settings chosen on Home. All optional, the server has sensible defaults. */
export interface ProjectOptions {
  targetLengthMinutes?: number;
  tone?: string;
  imageStyle?: string;
  aspectRatio?: AspectRatio;
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('reelforge_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('reelforge_token');
      localStorage.removeItem('reelforge_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message ?? fallback;
  }
  return fallback;
}

export const api = {
  auth: {
    async register(email: string, password: string, name: string) {
      const { data } = await http.post<{ user: User; token: string }>('/auth/register', { email, password, name });
      return data;
    },
    async login(email: string, password: string) {
      const { data } = await http.post<{ user: User; token: string }>('/auth/login', { email, password });
      return data;
    },
    async me() {
      const { data } = await http.get<{ user: User }>('/auth/me');
      return data.user;
    },
  },
  projects: {
    async list(search?: string) {
      const { data } = await http.get<{ projects: Project[] }>('/projects', { params: { search } });
      return data.projects;
    },
    async create(prompt: string, options: ProjectOptions = {}) {
      const { data } = await http.post<{ project: Project }>('/projects', { prompt, ...options });
      return data.project;
    },
    async get(id: string) {
      const { data } = await http.get<FullProject>(`/projects/${id}`);
      return data;
    },
    async rename(id: string, title: string) {
      const { data } = await http.patch<{ project: Project }>(`/projects/${id}`, { title });
      return data.project;
    },
    async duplicate(id: string) {
      const { data } = await http.post<{ project: Project }>(`/projects/${id}/duplicate`);
      return data.project;
    },
    async remove(id: string) {
      await http.delete(`/projects/${id}`);
    },
    async updateScene(projectId: string, sceneId: string, fields: Partial<{ chapterTitle: string; narrationText: string; imagePrompt: string }>) {
      const { data } = await http.patch<FullProject>(`/projects/${projectId}/scenes/${sceneId}`, fields);
      return data;
    },
  },
  generate: {
    async script(projectId: string) {
      const { data } = await http.post<FullProject>(`/generate/${projectId}/script`);
      return data;
    },
    async images(projectId: string) {
      const { data } = await http.post<FullProject>(`/generate/${projectId}/images`);
      return data;
    },
    /** Scans a public YouTube video for its storyline pattern and creates a project that
     *  writes a different, original story in that shape. Writing the script is a separate call. */
    async fromVideo(url: string, options: ProjectOptions & { topicHint?: string } = {}) {
      const { data } = await http.post<{ project: Project }>('/generate/from-video', { url, ...options });
      return data.project;
    },
    async regenerateImage(projectId: string, sceneId: string) {
      const { data } = await http.post(`/generate/${projectId}/images/${sceneId}/regenerate`);
      return data.image;
    },
    async selectImageVariant(projectId: string, sceneId: string, imageId: string) {
      const { data } = await http.post<FullProject>(`/generate/${projectId}/images/${sceneId}/select`, { imageId });
      return data;
    },
    async voice(projectId: string, voiceCategory: VoiceCategory, controls: VoiceControls) {
      const { data } = await http.post<FullProject>(`/generate/${projectId}/voice`, { voiceCategory, controls });
      return data;
    },
    async everything(projectId: string, voiceCategory: VoiceCategory, controls: VoiceControls) {
      const { data } = await http.post<FullProject>(`/generate/${projectId}/everything`, { voiceCategory, controls });
      return data;
    },
  },
  render: {
    async start(projectId: string) {
      const { data } = await http.post<{ job: RenderJob }>(`/render/${projectId}`);
      return data.job;
    },
    async poll(jobId: string) {
      const { data } = await http.get<{ job: RenderJob }>(`/render/job/${jobId}`);
      return data.job;
    },
    async list(projectId: string) {
      const { data } = await http.get<{ jobs: RenderJob[] }>(`/render/${projectId}/jobs`);
      return data.jobs;
    },
  },
  billing: {
    async status() {
      const { data } = await http.get<BillingStatus>('/billing/status');
      return data;
    },
    async startCheckout() {
      const { data } = await http.post<{ authorizationUrl: string; reference: string }>('/billing/checkout');
      return data;
    },
    async verify(reference: string) {
      const { data } = await http.post<{ activated: boolean }>('/billing/verify', { reference });
      return data;
    },
  },
};

export { errorMessage };
