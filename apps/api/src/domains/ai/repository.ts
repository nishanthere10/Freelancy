import {
  type CreateScopeAnalysisInput,
  type ScopeAnalysis,
  scopeAnalysesTable,
} from "@repo/database";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";

export class ScopeAnalysisRepository {
  /**
   * Insert a new scope analysis record
   */
  async create(input: CreateScopeAnalysisInput): Promise<ScopeAnalysis> {
    const [record] = await db
      .insert(scopeAnalysesTable)
      .values(input)
      .returning();
    return record;
  }

  /**
   * Find a scope analysis by ID with strict workspace tenant isolation
   */
  async findById(
    id: string,
    workspaceId: string,
  ): Promise<ScopeAnalysis | null> {
    const [record] = await db
      .select()
      .from(scopeAnalysesTable)
      .where(
        and(
          eq(scopeAnalysesTable.id, id),
          eq(scopeAnalysesTable.workspaceId, workspaceId),
        ),
      );
    return record || null;
  }

  /**
   * Mark a scope analysis as confirmed
   */
  async confirm(
    id: string,
    workspaceId: string,
  ): Promise<ScopeAnalysis | null> {
    const [record] = await db
      .update(scopeAnalysesTable)
      .set({
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scopeAnalysesTable.id, id),
          eq(scopeAnalysesTable.workspaceId, workspaceId),
        ),
      )
      .returning();
    return record || null;
  }

  /**
   * List scope analyses for a workspace
   */
  async listByWorkspace(
    workspaceId: string,
    options?: { projectId?: string; limit?: number; offset?: number },
  ): Promise<ScopeAnalysis[]> {
    const conditions = [eq(scopeAnalysesTable.workspaceId, workspaceId)];
    if (options?.projectId) {
      conditions.push(eq(scopeAnalysesTable.projectId, options.projectId));
    }

    const query = db
      .select()
      .from(scopeAnalysesTable)
      .where(and(...conditions))
      .orderBy(desc(scopeAnalysesTable.createdAt));

    if (options?.limit && options?.offset) {
      return query.limit(options.limit).offset(options.offset);
    }
    if (options?.limit) {
      return query.limit(options.limit);
    }
    if (options?.offset) {
      return query.offset(options.offset);
    }
    return query;
  }
}
