import { workspacesTable, workspaceMembersTable } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { db } from "./client";

export const DEFAULT_WORKSPACE_ID = "550e8400-e29b-41d4-a716-446655440000";
export const DEFAULT_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

export async function ensureDefaultWorkspace() {
  try {
    const existingWs = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, DEFAULT_WORKSPACE_ID));

    if (existingWs.length === 0) {
      await db
        .insert(workspacesTable)
        .values({
          id: DEFAULT_WORKSPACE_ID,
          name: "Default Workspace",
          slug: "default-workspace",
          ownerId: DEFAULT_USER_ID,
          createdBy: DEFAULT_USER_ID,
          updatedBy: DEFAULT_USER_ID,
        })
        .onConflictDoNothing();
      console.log("Seeded default workspace:", DEFAULT_WORKSPACE_ID);
    }

    const existingMember = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, DEFAULT_WORKSPACE_ID),
          eq(workspaceMembersTable.userId, DEFAULT_USER_ID),
        ),
      );

    if (existingMember.length === 0) {
      await db
        .insert(workspaceMembersTable)
        .values({
          workspaceId: DEFAULT_WORKSPACE_ID,
          userId: DEFAULT_USER_ID,
          role: "owner",
        })
        .onConflictDoNothing();
      console.log("Seeded default workspace owner member:", DEFAULT_USER_ID);
    }
  } catch (error) {
    console.error("Warning: Failed to ensure default workspace in DB:", error);
  }
}
