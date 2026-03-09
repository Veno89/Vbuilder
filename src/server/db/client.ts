import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env';
import * as schema from './schema';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === 'production' ? 20 : 10
});

export const db = drizzle(pool, { schema });
export type DatabaseClient = typeof db;
