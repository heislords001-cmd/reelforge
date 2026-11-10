import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { renderService } from '../services/renderService';
import { ApiError } from '../utils/ApiError';

export const renderRouter = Router();
renderRouter.use(requireAuth);

/** POST /api/render/:projectId
 *  Enqueues a render job and kicks it off in a background microtask. Returns the job
 *  immediately so the client can start polling. The actual work runs asynchronously in the
 *  same process (fine for a long lived container host, not usable on Vercel). */
renderRouter.post(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const job = await renderService.createJob(req.params.projectId, req.user!.userId);
    res.status(201).json({ job });

    // Start the render after the HTTP response is sent. If this process restarts before it
    // finishes, the job stays in "queued" state and can be retried by a future request.
    setImmediate(async () => {
      try { await renderService.runJob(job.id); }
      catch (err) { /* already written to the DB row by runJob */ }
    });
  })
);

/** GET /api/render/:projectId/jobs: list jobs for this project (most recent first). */
renderRouter.get(
  '/:projectId/jobs',
  asyncHandler(async (req, res) => {
    const jobs = await renderService.listJobs(req.params.projectId, req.user!.userId);
    res.json({ jobs });
  })
);

/** GET /api/render/job/:jobId: poll a specific job for status and progress. */
renderRouter.get(
  '/job/:jobId',
  asyncHandler(async (req, res) => {
    const job = await renderService.getJob(req.params.jobId, req.user!.userId);
    res.json({ job });
  })
);
