/**
 * Database client
 * Singleton instance for database access using Drizzle ORM
 *
 * Connection pooling is handled by the postgres client.
 * In production, configure connection limits and timeouts via DATABASE_URL.
 */

import * as schema from "@repo/database";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create postgres connection with security and performance settings
const client = postgres(connectionString, {
  // SSL is required for production databases
  ssl: "require",
  // Connection timeout: 30 seconds
  connect_timeout: 30,
  // Idle connection timeout: 60 seconds
  idle_timeout: 60,
  // Max connection lifetime: 30 minutes
  max_lifetime: 30 * 60,
  // Enable error logging
  debug: process.env.DEBUG_DB === "true",
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });
