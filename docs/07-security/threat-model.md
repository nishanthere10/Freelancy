# Freelance OS — Threat Model & Attack Surface Analysis

## 1. Overview & Objectives

This threat model outlines the adversarial boundaries, attacker personas, attack surfaces, and STRIDE risk categorizations for Freelance OS as part of Sprint 11 Security Hardening.

---

## 2. Attacker Models

| Attacker Persona | Capabilities & Vector | Primary Targets | Defenses & Mitigations |
| :--- | :--- | :--- | :--- |
| **A. Unauthenticated Attacker** | Public HTTP requests, malformed payloads, token fuzzing, path scanning, brute force. | API endpoints, Auth bypass, Information disclosure, DoS via oversized payload. | 401 on unauthenticated routes, Cloudflare edge DDoS mitigation, 1MB body limit, strict CORS rejection. |
| **B. Authenticated Malicious User** | Valid Clerk account, ability to craft arbitrary HTTP requests, modify headers/params. | IDOR, Cross-tenant access, Actor spoofing, Financial payment manipulation. | Server-enforced `req.user.id`, relational `workspace_id` checks, payment amount & status guards. |
| **C. Malicious Workspace Member** | Member of a workspace with `viewer` or `editor` role. | Privilege escalation, unauthorized resource deletion, workspace ownership hijacking. | Pure RBAC policy evaluation (`hasAtLeastRole`), owner-only guards on destruction/invitation. |
| **D. Compromised Frontend Client** | Full control over JavaScript runtime, DOM, HTTP client requests, stored state. | XSS execution, token exfiltration, CSRF. | React default HTML escaping, strict Content-Security-Policy (CSP), Bearer token transport (no ambient cookie reliance). |
| **E. Malicious PR Contributor** | Submits malicious pull requests, modifies dependencies or workflows. | CI/CD secret exfiltration, supply chain poisoning. | GitHub Actions fork PR secret isolation, `permissions: contents: read`, frozen lockfiles (`--frozen-lockfile`). |

---

## 3. STRIDE Threat Analysis

### Spoofing Identity
- **Threat**: Attacker sends `x-mock-user-id` or injects `actorId` in JSON body to forge actions as another user or workspace owner.
- **Mitigation**: Production runtime ignores `x-mock-user-id` (gated strictly to `NODE_ENV !== "production"`). Controllers derive actor identity exclusively from verified Clerk JWT session (`req.user.id`).

### Tampering with Data
- **Threat**: Attacker mutates invoice payment amounts to negative numbers, overpays, or replays identical payment requests.
- **Mitigation**: Zod schema validation requires positive numbers with max 2 decimal places. Invoice service verifies `amountPaid <= amountDue` and supports idempotency deduplication.

### Repudiation
- **Threat**: User performs a destructive or financial action and denies it occurred.
- **Mitigation**: Immutable `activity_events` audit trail records every domain event with timestamp, actor UUID, workspace UUID, and before/after metadata.

### Information Disclosure
- **Threat**: Attacker queries another workspace's clients, invoices, or activity by guessing UUIDs (IDOR).
- **Mitigation**: All database queries strictly join/filter on `workspace_id = :workspaceId`. Error handlers in production redact internal stack traces and SQL schema.

### Denial of Service (DoS)
- **Threat**: Attacker streams 100MB JSON payload to overwhelm Cloudflare Worker memory limits or floods API.
- **Mitigation**: 1MB payload limits enforced in Worker bridge and Express `express.json({ limit: "1mb" })`. Rate limiting enforces 300 req/min general and 60 req/min mutation limits.

### Elevation of Privilege
- **Threat**: Workspace `viewer` attempts `DELETE /api/v1/workspaces/:id/invoices/:id`.
- **Mitigation**: Service-level policy `canDeleteInvoice(membership)` checks `hasAtLeastRole(membership.role, 'editor')` and rejects with HTTP 403 Forbidden.

---

## 4. Trust Boundaries & Data Flow

```text
Trust Boundary 1: Internet <-> Cloudflare Worker Edge
- Enforces CORS origin check, TLS termination, payload size limits.

Trust Boundary 2: Cloudflare Worker <-> Express Application
- Validates Clerk JWT cryptographic signature, extracts claims.

Trust Boundary 3: Express Pipeline <-> PostgreSQL Database
- Resolves internal User UUID, checks Workspace membership, executes parameterized queries.
```
