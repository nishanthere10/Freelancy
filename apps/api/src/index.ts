/**
 * Freelance OS API
 * Main entry point for local Node.js development server
 */

import "dotenv/config";
import {
  usersTable,
  workspaceMembersTable,
  workspacesTable,
} from "@repo/database";
import { and, eq } from "drizzle-orm";
import app from "./app";
import { config } from "./config";
import { db } from "./db/client";

async function ensureDefaultWorkspace() {
  // Only auto-seed mock workspace if explicitly enabled for local unit tests
  if (config.isProduction || !config.enableMockAuth) {
    return;
  }

  const mockId = "550e8400-e29b-41d4-a716-446655440000";
  try {
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, mockId));

    if (!existingUser) {
      await db
        .insert(usersTable)
        .values({
          id: mockId,
          clerkId: `mock_clerk_${mockId}`,
          email: "dev@freelance-os.local",
          firstName: "Development",
          lastName: "User",
          status: "active",
        })
        .onConflictDoNothing();
    }

    const [existingWs] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, mockId));
    if (!existingWs) {
      await db
        .insert(workspacesTable)
        .values({
          id: mockId,
          name: "Default Workspace",
          slug: "default-workspace",
          ownerId: mockId,
          createdBy: mockId,
          updatedBy: mockId,
        })
        .onConflictDoNothing();
    }

    const [existingMember] = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, mockId),
          eq(workspaceMembersTable.userId, mockId),
        ),
      );
    if (!existingMember) {
      await db
        .insert(workspaceMembersTable)
        .values({
          workspaceId: mockId,
          userId: mockId,
          role: "owner",
        })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.error(
      "Auto-seed default workspace notice:",
      err instanceof Error ? err.message : err,
    );
  }
}

// Start server listener for local Node.js environment
app.listen(config.port, async () => {
  console.log(`Server running on port ${config.port}`);
  await ensureDefaultWorkspace();
});

export default app;
