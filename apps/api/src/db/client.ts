/**
 * Database client
 * Stateless database access using Drizzle ORM and Neon HTTP driver.
 * Uses HTTP querying to prevent Cross-Request WebSocket I/O leaks in Cloudflare Workers.
 */

import { neon } from "@neondatabase/serverless";
import * as schema from "@repo/database";
import { drizzle } from "drizzle-orm/neon-http";

let _db: ReturnType<typeof drizzle> | null = null;

const initDb = () => {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Neon HTTP client performs stateless HTTP queries — zero WebSocket connection leaks across requests
  const sql = neon(connectionString);
  _db = drizzle(sql, { schema });
  return _db;
};

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (_target, prop) => {
    return initDb()[prop as keyof typeof _db];
  },
});
