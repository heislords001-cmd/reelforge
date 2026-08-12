import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Applying schema.sql...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✔ Database schema is up to date.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✘ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
