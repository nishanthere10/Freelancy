# Activity Database Architecture & Schema Reference

## 1. Table Schema: `activity_events`

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `workspace_id` | `uuid` | NO | - | Foreign key to `workspaces(id)` (`ON DELETE CASCADE`) |
| `actor_user_id` | `uuid` | YES | `null` | Foreign key to `users(id)` (`ON DELETE SET NULL`) |
| `event_type` | `varchar(100)` | NO | - | Typed discriminator (e.g. `client.created`, `invoice.paid`) |
| `entity_type` | `varchar(50)` | NO | - | Domain entity type (`workspace`, `client`, `project`, `invoice`, `member`) |
| `entity_id` | `uuid` | YES | `null` | Primary key of referenced domain entity |
| `metadata` | `jsonb` | NO | `'{}'::jsonb` | Structured event metadata (names, amounts, currency, status) |
| `created_at` | `timestamp with time zone` | NO | `now()` | Immutable timestamp of event occurrence |

---

## 2. Indexes

1. **`idx_activity_events_workspace_created_at`**:
   - Columns: `(workspace_id, created_at DESC)`
   - Purpose: Primary index supporting cursor-paginated timeline queries for workspace dashboard and activity streams.

2. **`idx_activity_events_workspace_entity`**:
   - Columns: `(workspace_id, entity_type, entity_id, created_at DESC)`
   - Purpose: Accelerates entity-scoped activity lookups (e.g., activity on a specific project or client detail view).

3. **`idx_activity_events_workspace_actor`**:
   - Columns: `(workspace_id, actor_user_id, created_at DESC)`
   - Purpose: Enables user-specific audit trail lookups within a workspace.

---

## 3. Retention & Deletion Policy

- **Append-Only Immutability**: Activity events are never updated or overwritten.
- **Cascade Deletion**: When an entire workspace is permanently deleted, its associated `activity_events` are cascade deleted via foreign key constraint.
- **Actor Deletion**: When an individual user account is removed, `actor_user_id` is set to `NULL` (`ON DELETE SET NULL`) while the historical business event remains intact.
- **Entity Archival / Soft Deletion**: When a client, project, or invoice is archived/deleted, historical activity rows remain preserved for auditing.
