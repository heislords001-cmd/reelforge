import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { scriptService } from '../services/scriptService';
import { imageService } from '../services/imageService';
import { voiceService } from '../services/voiceService';
import { projectService } from '../services/projectService';
import { providerRegistry } from '../providers/registry';
import { ASPECT_RATIOS, DEFAULT_VOICE_CONTROLS, IMAGE_STYLES, VOICE_CATEGORIES } from '../types';
import { ApiError } from '../utils/ApiError';

export const generateRouter = Router();
generateRouter.use(requireAuth);

const voiceSchema = z.object({
  voiceCategory: z.enum(VOICE_CATEGORIES),
  controls: z
    .object({
      speed: z.number().min(0.5).max(2),
      pitch: z.number().min(-12).max(12),
      volume: z.number().min(0).max(100),
      stability: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
});

// POST /api/generate/from-video. Scans a public YouTube video for its storyline pattern and
// creates a project that will write a different, original story in that same shape. Only the
// scan happens here. Writing the script is a second request from the client, so each request
// stays under serverless time limits. Sits under /generate so it gets the tighter rate limit.
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
const fromVideoSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => {
      try {
        return YOUTUBE_HOSTS.includes(new URL(value).hostname);
      } catch {
        return false;
      }
    }, 'Paste a public YouTube link'),
  topicHint: z.string().trim().max(300).optional(),
  targetLengthMinutes: z.number().min(1).max(60).optional(),
  imageStyle: z.enum(IMAGE_STYLES).optional(),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
});

generateRouter.post(
  '/from-video',
  asyncHandler(async (req, res) => {
    const parsed = fromVideoSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Paste a public YouTube link', parsed.error.flatten());

    const blueprint = await providerRegistry.getVideoAnalysisProvider().analyzeVideo(parsed.data.url);
    const topicHint = parsed.data.topicHint || undefined;

    const project = await projectService.create(
      req.user!.userId,
      topicHint ?? `An original ${blueprint.niche} story`,
      {
        blueprint,
        sourceVideoUrl: parsed.data.url,
        topicHint,
        tone: blueprint.tone,
        targetLengthMinutes: parsed.data.targetLengthMinutes,
        imageStyle: parsed.data.imageStyle,
        aspectRatio: parsed.data.aspectRatio,
      }
    );
    res.status(201).json({ project });
  })
);

// POST /api/generate/:projectId/script
generateRouter.post(
  '/:projectId/script',
  asyncHandler(async (req, res) => {
    const full = await scriptService.generate({ projectId: req.params.projectId, userId: req.user!.userId });
    res.json(full);
  })
);

// POST /api/generate/:projectId/images
generateRouter.post(
  '/:projectId/images',
  asyncHandler(async (req, res) => {
    const full = await imageService.generateAll(req.params.projectId, req.user!.userId);
    res.json(full);
  })
);

// POST /api/generate/:projectId/images/:sceneId/regenerate
generateRouter.post(
  '/:projectId/images/:sceneId/regenerate',
  asyncHandler(async (req, res) => {
    const image = await imageService.regenerateOne(req.params.sceneId, req.params.projectId, req.user!.userId);
    res.json({ image });
  })
);

// POST /api/generate/:projectId/images/:sceneId/select. Switch which stored variant is active
generateRouter.post(
  '/:projectId/images/:sceneId/select',
  asyncHandler(async (req, res) => {
    const parsed = z.object({ imageId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Missing imageId');

    await imageService.selectVariant(req.params.sceneId, req.params.projectId, req.user!.userId, parsed.data.imageId);
    const full = await projectService.getFullProject(req.params.projectId, req.user!.userId);
    res.json(full);
  })
);

// POST /api/generate/:projectId/voice
generateRouter.post(
  '/:projectId/voice',
  asyncHandler(async (req, res) => {
    const parsed = voiceSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Invalid voice settings', parsed.error.flatten());

    const controls = { ...DEFAULT_VOICE_CONTROLS, ...parsed.data.controls };
    const full = await voiceService.generateAll(req.params.projectId, req.user!.userId, parsed.data.voiceCategory, controls);
    res.json(full);
  })
);

// POST /api/generate/:projectId/voice/:sceneId/regenerate
generateRouter.post(
  '/:projectId/voice/:sceneId/regenerate',
  asyncHandler(async (req, res) => {
    const parsed = voiceSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Invalid voice settings', parsed.error.flatten());

    const controls = { ...DEFAULT_VOICE_CONTROLS, ...parsed.data.controls };
    const track = await voiceService.regenerateOne(
      req.params.sceneId,
      req.params.projectId,
      req.user!.userId,
      parsed.data.voiceCategory,
      controls
    );
    res.json({ voiceTrack: track });
  })
);

// POST /api/generate/:projectId/everything
// Runs the full pipeline in one request: script -> images -> voice. Each stage persists as
// it completes, so if a later stage fails the user still keeps everything generated so far
// (project.status reflects exactly how far the pipeline got).
//
// Kept for non-serverless hosts (Railway, Render, a VPS) where a single long-lived request
// is fine. On Vercel, avoid calling this route directly. A single request chaining all
// three stages can exceed the function's max duration for longer videos. The frontend
// defaults to calling /script, /images, and /voice as three separate requests instead
// (see ProjectWorkspace.tsx runEverything), which is safe under a duration limit either way.
const everythingSchema = z.object({
  voiceCategory: z.enum(VOICE_CATEGORIES).default('documentary_male'),
  controls: voiceSchema.shape.controls.optional(),
});

generateRouter.post(
  '/:projectId/everything',
  asyncHandler(async (req, res) => {
    const parsed = everythingSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw ApiError.badRequest('Invalid settings', parsed.error.flatten());

    const { projectId } = req.params;
    const userId = req.user!.userId;
    const controls = { ...DEFAULT_VOICE_CONTROLS, ...parsed.data.controls };

    await scriptService.generate({ projectId, userId });
    await imageService.generateAll(projectId, userId);
    const full = await voiceService.generateAll(projectId, userId, parsed.data.voiceCategory, controls);

    res.json(full);
  })
);
