/**
 * Database client
 * Singleton instance for database access using Drizzle ORM and Neon Serverless driver
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "@repo/database";
import { drizzle } from "drizzle-orm/neon-serverless";

// Configure Neon to use the native WebSocket available in Cloudflare Workers
if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

let _db: ReturnType<typeof drizzle> | null = null;

const initDb = () => {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Create Neon serverless pool compatible with Node.js and Cloudflare Workers
  const pool = new Pool({ connectionString });

  // Create drizzle instance with schema
  _db = drizzle(pool, { schema });
  return _db;
};

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (_target, prop) => {
    return initDb()[prop as keyof typeof _db];
  },
});
