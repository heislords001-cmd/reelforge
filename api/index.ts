import { app } from '../server-lib/app';

// Vercel's Node runtime treats a default-exported Express app as a request handler.
// it invokes `app(req, res)` per request. No listen() call needed or wanted here.
// vercel.json rewrites every /api/* request to this single function; Express's own router
// (mounted at /api in server-lib/app.ts) still does the real path matching underneath it.
export default app;
