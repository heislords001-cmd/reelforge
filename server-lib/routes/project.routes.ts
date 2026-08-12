import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { projectService } from '../services/projectService';
import { scriptService } from '../services/scriptService';
import { ApiError } from '../utils/ApiError';

export const projectRouter = Router();
projectRouter.use(requireAuth);

const createSchema = z.object({
  prompt: z.string().min(3, 'Tell us what the video is about'),
  targetLengthMinutes: z.number().min(1).max(60).optional(),
  tone: z.string().optional(),
});

projectRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Invalid project details', parsed.error.flatten());

    const project = await projectService.create(req.user!.userId, parsed.data.prompt, {
      targetLengthMinutes: parsed.data.targetLengthMinutes,
      tone: parsed.data.tone,
    });
    res.status(201).json({ project });
  })
);

projectRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const projects = await projectService.listForUser(req.user!.userId, { search });
    res.json({ projects });
  })
);

projectRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const full = await projectService.getFullProject(req.params.id, req.user!.userId);
    res.json(full);
  })
);

projectRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({ title: z.string().min(1).max(200).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Invalid update');

    let project = await projectService.getOwned(req.params.id, req.user!.userId);
    if (parsed.data.title) {
      project = await projectService.rename(req.params.id, req.user!.userId, parsed.data.title);
    }
    res.json({ project });
  })
);

projectRouter.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const project = await projectService.duplicate(req.params.id, req.user!.userId);
    res.status(201).json({ project });
  })
);

projectRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await projectService.remove(req.params.id, req.user!.userId);
    res.status(204).send();
  })
);

projectRouter.patch(
  '/:id/scenes/:sceneId',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      chapterTitle: z.string().optional(),
      narrationText: z.string().optional(),
      imagePrompt: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Invalid scene update');

    await scriptService.updateScene(req.params.sceneId, req.params.id, req.user!.userId, parsed.data);
    const full = await projectService.getFullProject(req.params.id, req.user!.userId);
    res.json(full);
  })
);
