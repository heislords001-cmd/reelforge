import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

/**
 * Applies schema.sql. Safe to run on every boot: every statement is CREATE ... IF NOT EXISTS
 * or ALTER ... IF NOT EXISTS, so repeats do nothing. Throws on failure so the caller can
 * stop the server with the real database error in the logs.
 *
 * Path is resolved from the working directory, not __dirname, because this project runs as
 * ES modules where __dirname does not exist.
 */
export async function runMigrations(): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'server-lib', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Command line use: npm run db:migrate
if (process.argv[1] && /migrate\.ts$/.test(process.argv[1])) {
  runMigrations()
    .then(() => console.log('Database schema is up to date.'))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
