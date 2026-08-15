import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sanitizeDbUrl(url: string): string {
  try {
    return url.replace(/postgres(ql)?:\/\/([^:]+):([^@]+)@/gi, 'postgresql://[REDACTED]:[REDACTED]@');
  } catch {
    return '[REDACTED_URL]';
  }
}

async function runMigrations() {
  const startTime = Date.now();
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'MIGRATION_FAILED',
      message: 'DATABASE_URL environment variable is required for migrations',
    }));
    process.exit(1);
  }

  const safeUrl = sanitizeDbUrl(connectionString);
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'MIGRATION_START',
    target: safeUrl,
    migrationsFolder: path.resolve(__dirname, '../migrations'),
  }));

  // Max 1 connection for migration tasks is recommended to prevent locks
  const sql = postgres(connectionString, { max: 1, ssl: 'require' });
  const db = drizzle(sql);

  try {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'MIGRATION_APPLYING',
      message: 'Executing pending SQL migrations via Drizzle...',
    }));

    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, '../migrations'),
    });

    const durationMs = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'MIGRATION_SUCCESS',
      message: 'All database migrations executed and verified successfully',
      durationMs,
    }));

    await sql.end();
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'MIGRATION_FAILED',
      message: err instanceof Error ? err.message : 'Database migration execution failed',
      durationMs,
    }));
    await sql.end();
    process.exit(1);
  }
}

runMigrations();
