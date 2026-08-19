import type { WorkspaceMemberRepository } from "../workspace/repository";
import { formatActivityMessage } from "./activity.formatter";
import type {
  ActivityEntityType,
  ActivityEventType,
  ActivityItemDTO,
  ActivityListResponseDTO,
  ActivityMetadata,
  ActivityQueryFilters,
} from "./activity.types";
import type { ActivityRepository } from "./repository/activity.repository";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

function err<T>(code: string, message: string): Result<T> {
  return { success: false, error: { code, message } };
}

export class ActivityService {
  constructor(
    private readonly activityRepo: ActivityRepository,
    private readonly memberRepo: WorkspaceMemberRepository,
  ) {}

  /**
   * Lists workspace-scoped activity with authorization checks, actor enrichment,
   * and cursor pagination.
   */
  async listWorkspaceActivity(
    workspaceId: string,
    actorId: string,
    filters: ActivityQueryFilters = {},
  ): Promise<Result<ActivityListResponseDTO>> {
    try {
      // 1. Authorization: Verify user is a member of the workspace
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );

      if (!membership || membership.deletedAt) {
        return err(
          "PERMISSION_DENIED",
          "You do not have permission to view activity in this workspace",
        );
      }

      const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);

      // 2. Fetch rows with joined actor info
      const rows = await this.activityRepo.listWithActors(workspaceId, filters);

      const hasMore = rows.length > limit;
      const itemsToReturn = hasMore ? rows.slice(0, limit) : rows;

      // 3. Map to DTOs with human-readable descriptions
      const items: ActivityItemDTO[] = itemsToReturn.map(({ event, actor }) => {
        const metadata = (event.metadata || {}) as ActivityMetadata;
        const message = formatActivityMessage(
          event.eventType as ActivityEventType,
          event.entityType as ActivityEntityType,
          metadata,
        );

        return {
          id: event.id,
          workspaceId: event.workspaceId,
          eventType: event.eventType as ActivityEventType,
          entityType: event.entityType as ActivityEntityType,
          entityId: event.entityId,
          message,
          metadata,
          actor: actor
            ? {
                id: actor.id,
                email: actor.email,
                name: actor.email ? actor.email.split("@")[0] : "User",
              }
            : null,
          createdAt: event.createdAt.toISOString(),
        };
      });

      const nextCursor =
        hasMore && items.length > 0 ? items[items.length - 1].createdAt : null;

      return ok({
        items,
        nextCursor,
        hasMore,
      });
    } catch (error) {
      return err(
        "INTERNAL_ERROR",
        error instanceof Error
          ? error.message
          : "Failed to load activity stream",
      );
    }
  }
}
