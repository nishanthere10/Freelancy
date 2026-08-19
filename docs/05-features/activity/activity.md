# Activity & Audit Trail Feature Specification

## 1. Executive Summary & Purpose

The Activity & Audit Trail system in Freelance OS provides a workspace-scoped, immutable chronological history of all business actions across clients, projects, invoices, and memberships. It answers the fundamental question:

> *"What happened in my workspace?"*

---

## 2. Distinction: Business Activity vs. Application Observability

| Dimension | Application Observability (Sprint 9) | Business Activity & Audit (Sprint 10) |
| :--- | :--- | :--- |
| **Audience** | Engineers, SREs, Devs | Workspace Members, Owners, Clients |
| **Data Scope** | Request IDs, memory, latency, exceptions, traces | Clients created, status changes, payments recorded |
| **Persistence** | Volatile runtime logs, telemetry sinks | Persistent `activity_events` PostgreSQL table |
| **Security** | Redacts PII and secrets | User-facing display metadata with strict RBAC |
| **Mutability** | Ephemeral, rotated | Immutable, append-only business record |

---

## 3. Supported Event Registry

The Activity system accepts strongly-typed domain events across four core domains:

```text
Workspace Events:
  - workspace.created
  - workspace.updated
  - workspace.deleted
  - workspace.restored
  - workspace.ownership_transferred
  - workspace.member_added
  - workspace.member_removed
  - workspace.member_role_changed

Client Events:
  - client.created
  - client.updated
  - client.deleted
  - client.restored

Project Events:
  - project.created
  - project.updated
  - project.status_changed
  - project.deleted
  - project.restored

Invoice Events:
  - invoice.created
  - invoice.updated
  - invoice.sent
  - invoice.paid
  - invoice.cancelled
  - invoice.deleted
```

---

## 4. Multi-Tenant Security & Isolation

- **Workspace Scoping**: Every activity event is tied to `workspace_id`.
- **RBAC Authorization**: Queries to `GET /api/v1/workspaces/:workspaceId/activity` strictly check membership via `WorkspaceMemberRepository`. Non-members receive `403 Forbidden`.
- **Trusted Actor Identity**: Authorship is derived exclusively from the authenticated Clerk session (`req.user.id`), never from request bodies or query strings.

---

## 5. API Specification

### Endpoint: `GET /api/v1/workspaces/:workspaceId/activity`

#### Query Parameters:
- `limit` (optional): Number of records (1–100, default `20`).
- `cursor` (optional): ISO date string for pagination cursor.
- `entityType` (optional): `workspace | client | project | invoice | member`.
- `entityId` (optional): UUID of target entity.
- `actorUserId` (optional): UUID of actor.

#### Response DTO:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "a1b2c3d4-0000-0000-0000-000000000001",
        "workspaceId": "w1w2w3w4-0000-0000-0000-000000000001",
        "eventType": "invoice.paid",
        "entityType": "invoice",
        "entityId": "i1i2i3i4-0000-0000-0000-000000000001",
        "message": "Recorded payment of INR 25,000 for invoice #INV-2026-0012",
        "metadata": {
          "invoiceNumber": "INV-2026-0012",
          "amount": "25000.00",
          "currency": "INR",
          "status": "paid"
        },
        "actor": {
          "id": "u1u2u3u4-0000-0000-0000-000000000001",
          "name": "alex",
          "email": "alex@example.com"
        },
        "createdAt": "2026-08-19T10:00:00.000Z"
      }
    ],
    "nextCursor": "2026-08-19T10:00:00.000Z",
    "hasMore": false
  }
}
```
