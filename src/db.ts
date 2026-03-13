import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './config.js';
import * as monstersSchema from './schema/monsters.schema.js';

const client = postgres(config.DATABASE_URL, {
  max: 10,            // connection pool size
  idle_timeout: 30,   // seconds before idle connections are closed
});

export const db = drizzle(client, { schema: { ...monstersSchema } });
export type Db = typeof db;
