# Workspace Feature Documentation

**Version:** 1.0  
**Last Updated:** August 2, 2026  
**Status:** MVP Feature Definition  
**Owner:** Product Team

---

## Overview

Workspace is the foundational organizational layer of Freelance OS. It enables multi-tenancy, team collaboration, and isolates user data while maintaining a clean, simple experience for solo freelancers.

**Key Purpose:**
- Organize projects, clients, and invoices under a named workspace
- Enable team collaboration (V2)
- Isolate data between different business entities (V3+)
- Provide a home base for all user activities

---

## Workspace Hierarchy

```
┌─────────────────────────────┐
│  Freelance OS Account       │
│  (User ID, Auth)            │
└──────────────┬──────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼──────┐   ┌──────▼──────┐
│ Workspace 1│   │ Workspace 2  │
│ "My Agency"│   │ "Client Work"│
└─────┬──────┘   └──────┬───────┘
      │                 │
  ┌───┴────┐       ┌────┴─────┐
  │Clients  │       │Projects   │
  │Invoices │       │Milestones │
  │Projects │       │Invoices   │
  └─────────┘       └───────────┘
```

---

## MVP Workspace Design (Solo Freelancer)

### MVP Principles

For MVP, we **keep workspaces hidden** from solo freelancers:

- ✅ Each user gets **one default workspace** automatically
- ✅ Workspace is **invisible in the UI** (user never sees the concept)
- ✅ All projects, clients, invoices live in this workspace
- ✅ Architecture supports future multi-workspace but not exposed

**Why?**
Solo freelancers don't think in "workspaces." They think in projects and clients. Adding workspace concept adds cognitive load for no immediate benefit. We hide it and surface it only when needed (V2+).

### Default Workspace Creation

**When:** Immediately after user signs up  
**How:** Automatic, no user action required

```typescript
// On successful signup
async function createDefaultWorkspace(userId: string) {
  const workspace = await db.insert(workspacesTable).values({
    ownerId: userId,
    name: `${userData.name}'s Workspace`,
    slug: generateSlug(userData.email),  // rohan-freelancer-os
    description: "My projects and clients",
  }).returning();

  // Add user as workspace owner
  await db.insert(workspaceMembersTable).values({
    workspaceId: workspace.id,
    userId: userId,
    role: "owner",
  });

  return workspace;
}
```

### Workspace Naming Convention (MVP)

Default name: `[User Name]'s Workspace`

Examples:
- "Rohan's Workspace"
- "Priya's Workspace"
- "Arjun's Workspace"

**User can rename later** (in Settings).

---

## User Interactions with Workspace (MVP)

### Where Workspace Appears

**Visible in UI:**
1. ⚙️ **Settings → Workspace Settings**
   - View workspace name and slug
   - Edit workspace name and description
   - View workspace members (V2+)
   - Manage workspace logo (V2+)

2. 📊 **Dashboard (hidden element)**
   - Workspace context stored but not displayed
   - User doesn't think about "workspaces"

**Not visible in UI:**
- No workspace selector/switcher
- No workspace indicator in navigation
- All data assumes single workspace

### Workspace Settings UI (MVP)

```
┌─────────────────────────────────────────┐
│ Settings > Workspace Settings           │
├─────────────────────────────────────────┤
│                                          │
│ Workspace Name                           │
│ [Your Name's Workspace]   [Edit]        │
│                                          │
│ Workspace Slug                           │
│ freelance-os.com/[slug]                 │
│ rohan-freelancer-os      [Edit]        │
│                                          │
│ Description (optional)                  │
│ My projects and clients  [Edit]        │
│                                          │
│ Members (V2+)                           │
│ Owner: You               [Manage]       │
│                                          │
│ Created: Aug 2, 2026                    │
│                                          │
└─────────────────────────────────────────┘
```

---

## Workspace Data Isolation

### What's Workspace-Scoped

✅ **Projects** - Scoped to workspace  
✅ **Clients** - Scoped to workspace  
✅ **Invoices** - Scoped to workspace  
✅ **Milestones** - Scoped to workspace  
✅ **Requirements** - Scoped to workspace  
✅ **Scope Analyses** - Scoped to workspace  
✅ **Change Requests** - Scoped to workspace  
✅ **Settings** - Workspace-level settings  

### What's Not Workspace-Scoped

❌ **User Account** - One per user, not workspace-specific  
❌ **Authentication** - One login per user  
❌ **Billing** - One subscription per user (V2)  
❌ **AI Conversations** - Scoped to project, not workspace  
❌ **Payments** - Scoped to invoice, not workspace  

### Query Pattern: Enforcing Workspace Isolation

```typescript
// Always include workspace check
async function getProject(projectId: string, userId: string) {
  // Get user's workspace
  const workspace = await getUserWorkspace(userId);

  // Query only projects in user's workspace
  return db.query.projectsTable.findFirst({
    where: and(
      eq(projectsTable.id, projectId),
      eq(projectsTable.workspaceId, workspace.id),  // CRITICAL
    ),
  });
}

// Wrong - doesn't check workspace
async function unsafeGetProject(projectId: string) {
  return db.query.projectsTable.findFirst({
    where: eq(projectsTable.id, projectId),  // ❌ Missing workspace check!
  });
}
```

---

## Workspace Slug

### Purpose
Human-readable workspace identifier for sharing, URLs, and future client portals.

### Format
- Lowercase alphanumeric with hyphens
- 3-50 characters
- Must be unique across Freelance OS
- Auto-generated from user info, user can customize

### Examples
```
rohan-freelancer-os
priya-ux-design
arjun-consulting
acme-corp-agency  (for agencies, V2+)
```

### Generation Logic (MVP)

```typescript
function generateSlug(userEmail: string, userName: string): string {
  // Take username part of email or user name
  let base = userEmail.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Check uniqueness
  let slug = base;
  let counter = 1;
  
  while (await slugExists(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}

// Examples:
generateSlug("rohan@example.com") → "rohan"  → "rohan-freelancer-os"
generateSlug("rohan+dev@example.com") → "rohan-dev" → "rohan-dev"
```

---

## Workspace Features by Version

### MVP (Current)

✅ **Single workspace per user** (hidden from UI)  
✅ **Automatic workspace creation on signup**  
✅ **Workspace settings (name, description)**  
✅ **Data isolation and scoping**  
✅ **Workspace slug for future sharing**

### V2: Team Collaboration

🔵 **Multiple workspaces per user**  
🔵 **Workspace switcher in navigation**  
🔵 **Invite team members to workspace**  
🔵 **Role-based access (owner, editor, viewer)**  
🔵 **Workspace branding (logo, colors)**  
🔵 **Member activity audit log**

#### Example V2 UI:
```
┌─────────────────────┐
│ Freelance OS        │
│ Workspace: [⬇ My Agency] │
│                     │
│ Switch Workspace:   │
│ • My Agency         │
│ • Client Work       │
│ • Side Project      │
│ [+ New Workspace]   │
└─────────────────────┘
```

### V3: Advanced Workspace Management

⚪ **Workspace-level analytics**  
⚪ **Custom workspace permissions**  
⚪ **Workspace templates**  
⚪ **Workspace transfer/merge**  
⚪ **Workspace integrations (Slack, Zapier)**  
⚪ **Client-facing workspace portal**

### V4: Agency-Specific Features

⚪ **Revenue sharing across workspace members**  
⚪ **Workspace financial reporting**  
⚪ **Sub-workspace/projects per team member**  
⚪ **Workspace-level resource allocation**  
⚪ **Agency branding in client portal**

---

## Workspace & Authentication

### Session Management

```typescript
// User logs in once
// System automatically loads their default workspace
// Every API request includes workspace context

async function handleLogin(email: string, password: string) {
  const user = await authenticateUser(email, password);
  const workspace = await getUserDefaultWorkspace(user.id);
  
  // Create session with workspace context
  const session = {
    userId: user.id,
    workspaceId: workspace.id,  // Implicit
    token: generateJWT(user.id),
  };

  return session;
}
```

### Multi-Workspace Transition (V2)

```typescript
// When user adds workspace (V2):
async function switchWorkspace(userId: string, workspaceId: string) {
  // Verify user is member of workspace
  const isMember = await db.query.workspaceMembersTable.findFirst({
    where: and(
      eq(workspaceMembersTable.userId, userId),
      eq(workspaceMembersTable.workspaceId, workspaceId),
    ),
  });

  if (!isMember) throw new Error("Not a workspace member");

  // Update session/context
  return {
    workspaceId,
    // Frontend switches to this workspace's data
  };
}
```

---

## Workspace Permissions (V2+)

### Role Definitions

| Role | Create | Edit | Delete | Invite | Manage |
|------|--------|------|--------|--------|--------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ |

**Owner:**
- Full access to workspace
- Can invite/remove members
- Can manage workspace settings
- Can delete workspace
- Can transfer ownership (future)

**Editor:**
- Create and edit projects, clients, invoices
- Cannot manage workspace or members
- Can only be added by owner

**Viewer:**
- Read-only access to all workspace data
- Cannot edit or delete anything
- Useful for stakeholders, accountants

### Permission Checks in Code

```typescript
async function requireWorkspacePermission(
  userId: string,
  workspaceId: string,
  requiredRole: 'owner' | 'editor' | 'viewer'
) {
  const member = await db.query.workspaceMembersTable.findFirst({
    where: and(
      eq(workspaceMembersTable.userId, userId),
      eq(workspaceMembersTable.workspaceId, workspaceId),
    ),
  });

  if (!member) throw new Error("Not a workspace member");

  const roleHierarchy = { viewer: 1, editor: 2, owner: 3 };
  if (roleHierarchy[member.role] < roleHierarchy[requiredRole]) {
    throw new Error("Insufficient permissions");
  }
}

// Usage:
async function deleteProject(userId: string, projectId: string) {
  const project = await getProject(projectId, userId);
  
  // Owner required for deletion
  await requireWorkspacePermission(
    userId,
    project.workspaceId,
    'owner'
  );

  await db.delete(projectsTable)
    .where(eq(projectsTable.id, projectId));
}
```

---

## Workspace API Endpoints (MVP)

### Get Workspace

```
GET /api/workspaces/:workspaceId
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Rohan's Workspace",
  "slug": "rohan-freelancer-os",
  "description": "My projects and clients",
  "ownerId": "uuid",
  "createdAt": "2026-08-02T10:00:00Z",
  "updatedAt": "2026-08-02T10:00:00Z"
}
```

### Update Workspace

```
PATCH /api/workspaces/:workspaceId
Content-Type: application/json

{
  "name": "New Workspace Name",
  "description": "Updated description"
}
```

### Get Current Workspace (MVP)

```
GET /api/me/workspace
```

**Response:** User's default/current workspace

### List Workspace Members (V2)

```
GET /api/workspaces/:workspaceId/members
```

**Response:**
```json
{
  "members": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Rohan Kumar",
      "email": "rohan@example.com",
      "role": "owner",
      "joinedAt": "2026-08-02T10:00:00Z"
    },
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Priya Singh",
      "email": "priya@example.com",
      "role": "editor",
      "joinedAt": "2026-08-10T15:30:00Z"
    }
  ]
}
```

### Invite Member (V2)

```
POST /api/workspaces/:workspaceId/members/invite
Content-Type: application/json

{
  "email": "team@example.com",
  "role": "editor"
}
```

---

## Database Schema

### Workspaces Table (Already defined in drizzle-schema.md)

```typescript
export const workspacesTable = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  logo: text('logo'),
  ownerId: uuid('owner_id').notNull(),
  settings: text('settings').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});
```

### Workspace Members Table (Already defined)

```typescript
export const workspaceMembersTable = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: workspaceRoleEnum('role').notNull().default('viewer'),
  joinedAt: timestamp('joined_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  invitedBy: uuid('invited_by'),
  leftAt: timestamp('left_at', { withTimezone: true }),
});
```

---

## Implementation Checklist

### MVP Implementation

- [ ] **Database:** Create workspaces and workspace_members tables
- [ ] **Auth:** Create default workspace on signup
- [ ] **API:** Implement workspace CRUD endpoints
- [ ] **Data Isolation:** Add workspace checks to all queries
- [ ] **UI:** Add workspace settings page
- [ ] **Testing:** Test workspace isolation and permission checks

### V2 Implementation

- [ ] **UI:** Workspace switcher in sidebar
- [ ] **API:** Implement invite/member management
- [ ] **Permissions:** Add role-based access control
- [ ] **UI:** Member management interface
- [ ] **Emails:** Invitation emails with onboarding
- [ ] **Testing:** Test multi-workspace workflows

---

## Workspace Best Practices

### For Developers

1. **Always include workspace check in queries** - Never assume workspace context
2. **Use consistent query patterns** - Reference workspace scoping examples
3. **Test with multiple workspaces** - Verify isolation works (V2+)
4. **Audit permission checks** - Security depends on proper checks
5. **Document workspace-specific logic** - Make implicit explicit

### For Product Decisions

1. **Workspace is foundational** - Design for it even if hidden MVP
2. **Plan for multi-workspace early** - Architecture supports it now
3. **Permissions matter** - Define clearly from start
4. **Slug is permanent** - Don't allow changes (or plan carefully)
5. **Scope to workspace** - When in doubt, scope to workspace

---

## FAQ

### Q: Why do we need workspaces if MVP users are solo?
A: Architecture supports future multi-team/agency use without redesign. Building in isolation from day one prevents expensive refactors.

### Q: Can a user have multiple workspaces in MVP?
A: Technically the database supports it, but the UI doesn't expose it. One default workspace per user, hidden.

### Q: What happens to workspace when user deletes account?
A: User cascade deletion in database will delete workspace and all associated data. Implement backup first.

### Q: Can workspaces have multiple owners?
A: MVP: No, only one owner. V2: Consider supporting co-owners for agencies.

### Q: How do we handle workspace billing (V2+)?
A: Billing ties to workspace, not user. Each workspace has one subscription. One user can have multiple subscriptions (multiple workspaces).

### Q: Can we migrate projects between workspaces?
A: Not MVP. V2+: Consider supporting project transfer for complex workflows.

---

## Related Documentation

- `drizzle-schema.md` - Complete database schema
- `api-design.md` - API design patterns
- `project-rules.md` - Development standards
- `v2-roadmap.md` - Team collaboration features (future)

---

**End of Workspace Feature Documentation**

For questions, contact the product team.
