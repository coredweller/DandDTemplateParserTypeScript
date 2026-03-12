import { defineConfig } from 'drizzle-kit';

// Read DATABASE_URL directly — do NOT import src/config.js here.
// src/config.js executes z.parse(process.env) at import time, which requires
// ALL app env vars (NODE_ENV, LOG_LEVEL, PORT, ...). drizzle-kit only needs
// DATABASE_URL, so importing config would crash CI migration jobs that only
// have the DB URL in scope.
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required for drizzle-kit');
}

export default defineConfig({
  schema: './src/schema',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
