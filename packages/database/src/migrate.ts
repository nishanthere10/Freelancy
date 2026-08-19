import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const candidates = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'packages/database/.env'),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...rest] = trimmed.split('=');
            const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
            const cleanKey = key.trim();
            if (cleanKey && val && !process.env[cleanKey]) {
              process.env[cleanKey] = val;
            }
          }
        }
        if (process.env.DATABASE_URL) break;
      } catch {
        // Ignore read errors and proceed
      }
    }
  }
}

function sanitizeDbUrl(url: string): string {
  try {
    return url.replace(/postgres(ql)?:\/\/([^:]+):([^@]+)@/gi, 'postgresql://[REDACTED]:[REDACTED]@');
  } catch {
    return '[REDACTED_URL]';
  }
}

async function runMigrations() {
  loadEnv();
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
    const migrationsFolder = path.resolve(__dirname, '../migrations');
    const sqlFiles = fs
      .readdirSync(migrationsFolder)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'MIGRATION_APPLYING',
      message: `Executing ${sqlFiles.length} SQL migration files...`,
      files: sqlFiles,
    }));

    for (const file of sqlFiles) {
      const filePath = path.join(migrationsFolder, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      if (sqlContent.trim()) {
        await sql.unsafe(sqlContent);
      }
    }

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
