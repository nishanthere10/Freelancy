import {
  type CreateDriftAnalysisInput,
  type DriftAnalysis,
  driftAnalysesTable,
} from "@repo/database";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";

export class DriftAnalysisRepository {
  /**
   * Insert a new scope drift analysis record
   */
  async create(input: CreateDriftAnalysisInput): Promise<DriftAnalysis> {
    const [record] = await db
      .insert(driftAnalysesTable)
      .values(input)
      .returning();
    return record;
  }

  /**
   * Find a drift analysis by ID with workspace isolation
   */
  async findById(
    id: string,
    workspaceId: string,
  ): Promise<DriftAnalysis | null> {
    const [record] = await db
      .select()
      .from(driftAnalysesTable)
      .where(
        and(
          eq(driftAnalysesTable.id, id),
          eq(driftAnalysesTable.workspaceId, workspaceId),
        ),
      );
    return record || null;
  }

  /**
   * List drift analyses for a specific confirmed scope analysis within a workspace
   */
  async listByScope(
    scopeAnalysisId: string,
    workspaceId: string,
  ): Promise<DriftAnalysis[]> {
    return db
      .select()
      .from(driftAnalysesTable)
      .where(
        and(
          eq(driftAnalysesTable.scopeAnalysisId, scopeAnalysisId),
          eq(driftAnalysesTable.workspaceId, workspaceId),
        ),
      )
      .orderBy(desc(driftAnalysesTable.createdAt));
  }
}
