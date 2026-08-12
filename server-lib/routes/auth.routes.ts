import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { authService } from '../services/authService';
import { ApiError } from '../utils/ApiError';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Invalid registration details', parsed.error.flatten());

    const { user, token } = await authService.register(parsed.data.email, parsed.data.password, parsed.data.name);
    res.status(201).json({ user, token });
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Invalid login details');

    const { user, token } = await authService.login(parsed.data.email, parsed.data.password);
    res.json({ user, token });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getById(req.user!.userId);
    res.json({ user });
  })
);
