import { Pool } from 'pg';
import { env } from './env';

/**
 * Connection pooling on serverless deserves an explicit note, because it's the #1 way this
 * kind of app falls over silently on Vercel:
 *
 * Each Vercel serverless invocation can be a fresh, isolated process. If every invocation
 * opens its own `pg.Pool` with max:20, and Vercel scales to 30 concurrent invocations, you
 * just asked Postgres for up to 600 connections. Most Postgres plans (including Neon's
 * free tier) allow far fewer than that, and you'll get `too many clients already` errors
 * under real traffic.
 *
 * Two things fix this, both required for a serverless deploy:
 *   1. `max: 1` here. One connection per function instance, not a real pool per instance.
 *   2. Point DATABASE_URL at a *pooled* connection string, not a direct one. Neon, Supabase,
 *      and RDS Proxy all provide a pooled endpoint (PgBouncer under the hood) specifically
 *      for this. It's what actually keeps you under the real connection limit across many
 *      serverless instances. On Neon this is the connection string with `-pooler` in the
 *      hostname; copy that one from the dashboard, not the direct one.
 *
 * On a traditional host (Railway, Render, your own VPS) this file works unchanged. Max:1
 * is a little conservative there but harmless, since only one process is using the pool.
 */
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.isServerless ? 1 : 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  // Neon, Supabase, and most managed Postgres hosts require TLS. Relying on `sslmode=require`
  // in the connection string alone is not always enough. Node's pg driver can still fail to
  // establish trust in a serverless environment, so this is set explicitly. RejectUnauthorized
  // false is the standard, documented setting for these providers: the connection is still
  // encrypted, this just skips full certificate chain verification, which is the normal
  // tradeoff for connecting from a serverless function rather than a fixed server with a
  // known CA bundle. Local Postgres (no sslmode in the URL) skips this entirely.
  ssl: env.databaseUrl.includes('sslmode=require') || env.databaseUrl.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on('error', (err) => {
  // A background/idle client crashed. Log and let the pool recover. Do NOT process.exit()
  // here: on Vercel that would kill the whole function instance for an unrelated request.
  console.error('Unexpected PostgreSQL pool error', err);
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  // Deliberately NOT `pool.query<T>(...)`. Pg's own generic requires T to satisfy its
  // QueryResultRow index-signature constraint, which our domain interfaces (UserRow,
  // Project, etc.) don't structurally satisfy for the same reason described above. Let pg
  // return `any` rows and cast to T ourselves at this one boundary instead.
  const result = await pool.query(text, params as never[]);
  if (env.nodeEnv === 'development') {
    const ms = Date.now() - start;
    if (ms > 200) console.warn(`[slow query] ${ms}ms: ${text.slice(0, 120)}`);
  }
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}
