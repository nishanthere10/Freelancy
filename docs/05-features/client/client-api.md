# Client API Specification

**Version:** 1.0
**Last Updated:** August 8, 2026
**Status:** Pre-Implementation Specification
**Owner:** Backend Engineering
**Sprint:** Sprint 2

---

## Document Purpose

This document is **Part 3 of 3** in the Client Domain Specification. It defines the REST API endpoints, request payloads, response payloads, and expected error states for the Client domain.

| Document | Contents |
|----------|----------|
| `client.md` | Product spec: features, UX flows, personas, acceptance criteria |
| `client-design.md` | Engineering design: architecture, domain model, file structure |
| `client-api.md` (this file) | API specification: endpoints, request/response schemas, error codes |

---

## Base Path

All Client endpoints are nested under the Workspace context because clients belong to a specific workspace.

**Base Path:** `/api/v1/workspaces/:workspaceId/clients`

---

## Authentication & Authorization

All endpoints require the user to be authenticated. The backend extracts `req.user.id` via middleware.

The controller must pass `req.user.id` and `req.params.workspaceId` to the `ClientService`, which validates workspace membership and enforces role-based policies (Viewer, Editor, Owner).

---

## 1. Create a Client

**Endpoint:** `POST /api/v1/workspaces/:workspaceId/clients`

**Description:** Creates a new client within the specified workspace.

**Authorization:** Workspace Owner or Editor required.

### Request Body

```json
{
  "name": "Acme Corp",
  "email": "contact@acmecorp.in",
  "phone": "+919876543210",
  "website": "https://acmecorp.in",
  "companyName": "Acme Corporation Pvt Ltd",
  "gstNumber": "29AABCM1234D1ZX",
  "contactPerson": "Rahul Sharma",
  "department": "Engineering",
  "address": "123 Innovation Drive",
  "city": "Bangalore",
  "state": "Karnataka",
  "postalCode": "560001",
  "country": "IN"
}
```

**Validation Rules:**
- `name`: String, required, 1-255 characters.
- `email`: String, required, valid email format. Unique per workspace.
- `gstNumber`: String, optional. Must match `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` if provided.
- Other fields: String, optional.

### Successful Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "c1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
    "workspaceId": "w1a2b3c4-...",
    "name": "Acme Corp",
    "email": "contact@acmecorp.in",
    "phone": "+919876543210",
    "website": "https://acmecorp.in",
    "companyName": "Acme Corporation Pvt Ltd",
    "gstNumber": "29AABCM1234D1ZX",
    "contactPerson": "Rahul Sharma",
    "department": "Engineering",
    "address": "123 Innovation Drive",
    "city": "Bangalore",
    "state": "Karnataka",
    "postalCode": "560001",
    "country": "IN",
    "status": "active",
    "createdAt": "2026-08-08T10:00:00.000Z",
    "updatedAt": "2026-08-08T10:00:00.000Z"
  }
}
```

### Error Responses

- **400 Bad Request:** Validation failed.
  ```json
  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid GST format", "issues": [{ "path": "gstNumber", "message": "Must be valid GST" }] } }
  ```
- **403 Forbidden:** User is not a member or lacks Editor/Owner role.
- **404 Not Found:** Workspace does not exist.
- **409 Conflict:** Client with this email already exists in the workspace.

---

## 2. List Workspace Clients

**Endpoint:** `GET /api/v1/workspaces/:workspaceId/clients`

**Description:** Retrieves a list of clients in the workspace. Excludes soft-deleted clients by default.

**Authorization:** Workspace Viewer, Editor, or Owner required.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `active` | Filter by `active`, `inactive`, `archived`, or `all`. |
| `excludeDeleted` | boolean | `true` | If true, omits soft-deleted clients regardless of status. |
| `search` | string | | Fuzzy search on name, email, or companyName. |

### Successful Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "c1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
      "workspaceId": "w1a2b3c4-...",
      "name": "Acme Corp",
      "email": "contact@acmecorp.in",
      "status": "active",
      "createdAt": "2026-08-08T10:00:00.000Z"
      // ... other fields
    }
  ]
}
```

---

## 3. Get Client Details

**Endpoint:** `GET /api/v1/workspaces/:workspaceId/clients/:clientId`

**Description:** Retrieves full details for a single client.

**Authorization:** Workspace Viewer, Editor, or Owner required.

### Successful Response (200 OK)

Same payload structure as the Create response object.

### Error Responses

- **403 Forbidden:** User is not a member.
- **404 Not Found:** Client ID does not exist in the workspace.

---

## 4. Update a Client

**Endpoint:** `PATCH /api/v1/workspaces/:workspaceId/clients/:clientId`

**Description:** Partially updates an existing client.

**Authorization:** Workspace Editor or Owner required.

### Request Body

Only provide fields that are changing. Cannot update `workspaceId` or `id`.

```json
{
  "phone": "+919999988888",
  "status": "inactive"
}
```

### Successful Response (200 OK)

Returns the fully updated client object (same as Create response).

### Error Responses

- **400 Bad Request:** Validation failure.
- **403 Forbidden:** User lacks Editor/Owner role.
- **404 Not Found:** Client not found.
- **409 Conflict:** Email update conflicts with another client.
- **410 Gone:** Cannot update a deleted client.

---

## 5. Soft-Delete (Archive) a Client

**Endpoint:** `DELETE /api/v1/workspaces/:workspaceId/clients/:clientId`

**Description:** Soft-deletes a client. The client's `deletedAt` field is populated, and status becomes `archived`.

**Authorization:** Workspace Owner required.

### Successful Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "c1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
    "name": "Acme Corp",
    "status": "archived",
    "deletedAt": "2026-08-08T10:15:00.000Z"
    // ... remaining fields
  }
}
```

### Error Responses

- **403 Forbidden:** User lacks Owner role.
- **404 Not Found:** Client not found.
- **410 Gone:** Client already deleted.

---

## 6. Restore a Deleted Client

**Endpoint:** `POST /api/v1/workspaces/:workspaceId/clients/:clientId/restore`

**Description:** Restores a soft-deleted client by clearing `deletedAt` and setting status back to `active`.

**Authorization:** Workspace Owner required.

### Successful Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "c1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
    "status": "active",
    "deletedAt": null
    // ... remaining fields
  }
}
```

### Error Responses

- **400 Bad Request:** Client is not currently deleted.
- **403 Forbidden:** User lacks Owner role.
- **404 Not Found:** Client not found.

---

**End of Client API Specification (Part 3 of 3)**
