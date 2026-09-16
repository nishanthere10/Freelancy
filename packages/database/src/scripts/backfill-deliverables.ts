import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import * as schema from "../schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const candidates = [
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../../../.env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "packages/database/.env"),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        const lines = fs.readFileSync(envPath, "utf8").split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const [key, ...rest] = trimmed.split("=");
            const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
            const cleanKey = key.trim();
            if (cleanKey && val && !process.env[cleanKey]) {
              process.env[cleanKey] = val;
            }
          }
        }
        if (process.env.DATABASE_URL) break;
      } catch {
        // Ignore read errors
      }
    }
  }
}

async function runBackfill() {
  loadEnv();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("[Backfill] DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const sql = neon(dbUrl);
  const db = drizzle(sql, { schema });

  console.log("[Backfill] Starting idempotent project deliverables backfill...");

  const projects = await db
    .select({
      id: schema.projectsTable.id,
      workspaceId: schema.projectsTable.workspaceId,
      name: schema.projectsTable.name,
    })
    .from(schema.projectsTable)
    .where(isNull(schema.projectsTable.deletedAt));

  console.log(`[Backfill] Scanned ${projects.length} active projects.`);

  let materializedProjects = 0;
  let totalDeliverablesInserted = 0;
  let skippedProjects = 0;

  for (const project of projects) {
    // 1. Check if deliverables already exist
    const existing = await db
      .select({ id: schema.projectDeliverablesTable.id })
      .from(schema.projectDeliverablesTable)
      .where(
        and(
          eq(schema.projectDeliverablesTable.projectId, project.id),
          eq(schema.projectDeliverablesTable.workspaceId, project.workspaceId),
        ),
      );

    if (existing.length > 0) {
      skippedProjects++;
      continue;
    }

    // 2. Find linked confirmed scope
    const [linkedScope] = await db
      .select()
      .from(schema.scopeAnalysesTable)
      .where(
        and(
          eq(schema.scopeAnalysesTable.projectId, project.id),
          eq(schema.scopeAnalysesTable.workspaceId, project.workspaceId),
          isNotNull(schema.scopeAnalysesTable.confirmedAt),
        ),
      );

    if (!linkedScope) {
      skippedProjects++;
      continue;
    }

    const scopeResult = (linkedScope.result || {}) as {
      deliverables?: Array<{
        title: string;
        description?: string;
        estimated_hours?: number;
        complexity?: string;
      }>;
    };

    const sourceDeliverables = scopeResult.deliverables || [];
    if (sourceDeliverables.length === 0) {
      skippedProjects++;
      continue;
    }

    const rows = sourceDeliverables.map((d, idx) => ({
      workspaceId: project.workspaceId,
      projectId: project.id,
      title: d.title.trim(),
      description: d.description?.trim() || null,
      estimatedHours: Number(d.estimated_hours || 0).toFixed(2),
      loggedHours: "0.00",
      complexity: (d.complexity?.toLowerCase() as any) || "medium",
      status: "pending" as const,
      position: idx + 1,
      sourceScopeId: linkedScope.id,
    }));

    await db.insert(schema.projectDeliverablesTable).values(rows);
    materializedProjects++;
    totalDeliverablesInserted += rows.length;

    console.log(
      `[Backfill] Materialized ${rows.length} deliverables for Project "${project.name}" (${project.id})`,
    );
  }

  console.log("\n=========================================");
  console.log(`[Backfill Complete]`);
  console.log(`Projects updated:      ${materializedProjects}`);
  console.log(`Deliverables created:  ${totalDeliverablesInserted}`);
  console.log(`Projects skipped:      ${skippedProjects}`);
  console.log("=========================================\n");
}

runBackfill().catch((err) => {
  console.error("[Backfill Error]", err);
  process.exit(1);
});
