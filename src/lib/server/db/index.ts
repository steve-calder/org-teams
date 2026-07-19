import { env } from '$env/dynamic/private';
import { createDatabase } from './factory';

export type { Database } from './factory';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const connection = createDatabase(env.DATABASE_URL);

export const db = connection.db;
