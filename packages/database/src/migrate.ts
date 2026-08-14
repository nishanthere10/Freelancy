import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing');
  }

  console.log('Connecting to database for migrations...');
  // Max 1 connection for migration tasks is recommended
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log('Applying pending Drizzle migrations...');
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../migrations'),
  });

  console.log('Migrations completed successfully.');
  await sql.end();
}

runMigrations().catch((err) => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
