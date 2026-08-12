import { Router } from 'express';
import { authRouter } from './auth.routes';
import { projectRouter } from './project.routes';
import { generateRouter } from './generate.routes';
import { billingRouter } from './billing.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/generate', generateRouter);
apiRouter.use('/billing', billingRouter);
