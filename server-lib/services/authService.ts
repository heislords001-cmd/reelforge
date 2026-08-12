import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { signToken } from '../middleware/auth';
import { User } from '../types';
import { ApiError } from '../utils/ApiError';

interface UserRow extends User {
  password_hash: string;
}

export const authService = {
  async register(email: string, password: string, name: string) {
    const existing = await query<UserRow>('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rowCount > 0) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // trial_ends_at uses its schema default (now() + 30 days). No need to set it explicitly.
    const { rows } = await query<UserRow>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, avatar_url, plan, trial_ends_at, created_at`,
      [email.toLowerCase(), passwordHash, name]
    );
    const user = rows[0];
    const token = signToken({ userId: user.id, email: user.email });
    return { user: toPublicUser(user), token };
  },

  async login(email: string, password: string) {
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw ApiError.unauthorized('Invalid email or password');

    const token = signToken({ userId: user.id, email: user.email });
    return { user: toPublicUser(user), token };
  },

  async getById(userId: string) {
    const { rows } = await query<UserRow>(
      'SELECT id, email, name, avatar_url, plan, trial_ends_at, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (!rows[0]) throw ApiError.notFound('User not found');
    return toPublicUser(rows[0]);
  },
};

function toPublicUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url,
    plan: row.plan,
    trial_ends_at: row.trial_ends_at,
    created_at: row.created_at,
  };
}
