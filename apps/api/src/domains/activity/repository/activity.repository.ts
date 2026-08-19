import {
  type ActivityEvent,
  activityEventsTable,
  usersTable,
} from "@repo/database";
import { and, count, desc, eq, lt } from "drizzle-orm";
import { db } from "../../../db/client";
import type {
  ActivityQueryFilters,
  CreateActivityInput,
} from "../activity.types";

export interface ActivityEventWithActor {
  event: ActivityEvent;
  actor: {
    id: string;
    email: string;
  } | null;
}

export class ActivityRepository {
  /**
   * Appends an immutable activity event record
   */
  async create(data: CreateActivityInput): Promise<ActivityEvent> {
    const [event] = await db
      .insert(activityEventsTable)
      .values({
        workspaceId: data.workspaceId,
        actorUserId: data.actorUserId || null,
        eventType: data.eventType,
        entityType: data.entityType,
        entityId: data.entityId || null,
        metadata: data.metadata || {},
        createdAt: data.createdAt || new Date(),
      })
      .returning();

    if (!event) {
      throw new Error("Failed to insert activity event");
    }

    return event;
  }

  /**
   * Lists activity events for a workspace with actor joins and cursor pagination
   */
  async listWithActors(
    workspaceId: string,
    filters: ActivityQueryFilters = {},
  ): Promise<ActivityEventWithActor[]> {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const conditions = [eq(activityEventsTable.workspaceId, workspaceId)];

    if (filters.entityType) {
      conditions.push(eq(activityEventsTable.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(activityEventsTable.entityId, filters.entityId));
    }
    if (filters.actorUserId) {
      conditions.push(eq(activityEventsTable.actorUserId, filters.actorUserId));
    }
    if (filters.cursor) {
      const cursorDate = new Date(filters.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        conditions.push(lt(activityEventsTable.createdAt, cursorDate));
      }
    }

    const rows = await db
      .select({
        event: activityEventsTable,
        actor: {
          id: usersTable.id,
          email: usersTable.email,
        },
      })
      .from(activityEventsTable)
      .leftJoin(usersTable, eq(activityEventsTable.actorUserId, usersTable.id))
      .where(and(...conditions))
      .orderBy(desc(activityEventsTable.createdAt))
      .limit(limit + 1); // fetch one extra to determine hasMore

    return rows.map((row) => ({
      event: row.event,
      actor: row.actor?.id ? row.actor : null,
    }));
  }

  /**
   * Count total activity events in a workspace
   */
  async countByWorkspace(
    workspaceId: string,
    filters: ActivityQueryFilters = {},
  ): Promise<number> {
    const conditions = [eq(activityEventsTable.workspaceId, workspaceId)];

    if (filters.entityType) {
      conditions.push(eq(activityEventsTable.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(activityEventsTable.entityId, filters.entityId));
    }
    if (filters.actorUserId) {
      conditions.push(eq(activityEventsTable.actorUserId, filters.actorUserId));
    }

    const [result] = await db
      .select({ count: count() })
      .from(activityEventsTable)
      .where(and(...conditions));

    return Number(result?.count ?? 0);
  }
}
