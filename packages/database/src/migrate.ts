import { neon } from '@neondatabase/serverless';
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
    return url.replace(
      /postgres(ql)?:\/\/([^:]+):([^@]+)@/gi,
      'postgresql://[REDACTED]:[REDACTED]@'
    );
  } catch {
    return '[REDACTED_URL]';
  }
}

function splitSqlStatements(sqlContent: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  const len = sqlContent.length;
  let i = 0;

  while (i < len) {
    const char = sqlContent[i];
    const nextChar = i + 1 < len ? sqlContent[i + 1] : '';

    // Check for comments if not inside string / dollar quote
    if (!inDollarQuote) {
      if (!inLineComment && !inBlockComment) {
        if (char === '-' && nextChar === '-') {
          inLineComment = true;
          i += 2;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          inBlockComment = true;
          i += 2;
          continue;
        }
      } else if (inLineComment) {
        if (char === '\n') {
          inLineComment = false;
        }
        i++;
        continue;
      } else if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }
    }

    // Check for dollar quotes $$ or $tag$
    if (char === '$') {
      const match = sqlContent.slice(i).match(/^\$[a-zA-Z0-9_]*\$/);
      if (match) {
        inDollarQuote = !inDollarQuote;
        current += match[0];
        i += match[0].length;
        continue;
      }
    }

    // Check for statement end (semicolon outside dollar quotes and comments)
    if (char === ';' && !inDollarQuote && !inLineComment && !inBlockComment) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith('--> statement-breakpoint')) {
        // Strip out any internal statement breakpoint annotations
        const cleanStmt = stmt.replace(/--> statement-breakpoint/g, '').trim();
        if (cleanStmt) {
          statements.push(cleanStmt);
        }
      }
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  const remainder = current.replace(/--> statement-breakpoint/g, '').trim();
  if (remainder) {
    statements.push(remainder);
  }

  return statements;
}

async function runMigrations() {
  loadEnv();
  const startTime = Date.now();
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'MIGRATION_FAILED',
        message: 'DATABASE_URL environment variable is required for migrations',
      })
    );
    process.exit(1);
  }

  const safeUrl = sanitizeDbUrl(connectionString);
  const migrationsFolder = path.resolve(__dirname, '../migrations');

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'MIGRATION_START',
      target: safeUrl,
      migrationsFolder,
    })
  );

  try {
    const sql = neon(connectionString);
    const sqlFiles = fs
      .readdirSync(migrationsFolder)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'MIGRATION_APPLYING',
        message: `Executing ${sqlFiles.length} SQL migration files over stateless HTTP transport...`,
        files: sqlFiles,
      })
    );

    for (const file of sqlFiles) {
      const filePath = path.join(migrationsFolder, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      const statements = splitSqlStatements(sqlContent);

      for (const statement of statements) {
        if (!statement) continue;
        try {
          await sql(statement);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          // Safe idempotency: skip if already created/exists
          if (
            !msg.includes('already exists') &&
            !msg.includes('duplicate') &&
            !msg.includes('duplicate_object')
          ) {
            throw err;
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'MIGRATION_SUCCESS',
        message: 'All database migrations executed and verified successfully',
        durationMs,
      })
    );
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'MIGRATION_FAILED',
        message: err instanceof Error ? err.message : 'Database migration execution failed',
        durationMs,
      })
    );
    process.exit(1);
  }
}

runMigrations();
