/**
 * Database client
 * Singleton instance for database access using Drizzle ORM
 * 
 * Connection pooling is handled by the postgres client.
 * In production, configure connection limits and timeouts via DATABASE_URL.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@repo/database';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres connection with security and performance settings
const client = postgres(connectionString, {
  // SSL is required for production databases
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  // Connection timeout: 30 seconds
  connect_timeout: 30,
  // Idle connection timeout: 60 seconds
  idle_timeout: 60,
  // Max connection lifetime: 30 minutes
  max_lifetime: 30 * 60,
  // Enable error logging
  debug: process.env.DEBUG_DB === 'true',
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

export type Database = typeof db;

/**
 * Cleanup function for graceful shutdown
 * Should be called during application shutdown
 */
export async function closeDatabase(): Promise<void> {
  await client.end();
}
