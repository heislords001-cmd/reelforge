import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
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

// GET /api/auth/google. Kicks off the redirect flow. The frontend just points a link or
// window.location at this URL directly, there is no JSON response here, only a redirect.
authRouter.get(
  '/google',
  asyncHandler(async (req, res) => {
    if (!env.google.clientId || !env.google.callbackUrl) {
      throw ApiError.internal('Google sign in is not configured on the server');
    }

    // CSRF protection: a random value both sent to Google and stashed in a short lived,
    // httpOnly cookie. The callback below checks the two match before trusting the
    // response, so a forged callback request (without the matching cookie) is rejected.
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('google_oauth_state', state, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: env.google.clientId,
      redirect_uri: env.google.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  })
);

// GET /api/auth/google/callback. Google redirects the user's browser back here after they
// approve. Exchanges the code for a token, fetches the profile, finds or creates the
// account, then redirects to the frontend with our own JWT in the URL for it to pick up.
authRouter.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const state = typeof req.query.state === 'string' ? req.query.state : null;
    const expectedState = req.cookies?.google_oauth_state as string | undefined;
    res.clearCookie('google_oauth_state');

    if (!code || !state || !expectedState || state !== expectedState) {
      logger.warn('Google OAuth callback failed state check');
      return res.redirect(`${env.clientOrigin}/login?error=google_auth_failed`);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        redirect_uri: env.google.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      logger.error('Google token exchange failed', { status: tokenResponse.status });
      return res.redirect(`${env.clientOrigin}/login?error=google_auth_failed`);
    }
    const tokenData = (await tokenResponse.json()) as { access_token: string };

    // Fetching the profile via the access token (rather than decoding the id_token
    // ourselves) avoids needing to verify a JWT signature against Google's rotating public
    // keys. The access token itself was only obtainable by presenting our client secret in
    // the exchange above, so a profile fetched with it is already trustworthy.
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileResponse.ok) {
      logger.error('Google profile fetch failed', { status: profileResponse.status });
      return res.redirect(`${env.clientOrigin}/login?error=google_auth_failed`);
    }
    const profile = (await profileResponse.json()) as {
      sub: string;
      email: string;
      email_verified: boolean;
      name: string;
      picture?: string;
    };

    if (!profile.email_verified) {
      return res.redirect(`${env.clientOrigin}/login?error=google_email_unverified`);
    }

    const { token } = await authService.findOrCreateFromGoogle({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture ?? null,
    });

    res.redirect(`${env.clientOrigin}/auth/callback?token=${encodeURIComponent(token)}`);
  })
);
