# Freelance OS — Security Architecture Specification

## 1. Executive Summary

Freelance OS is a multi-tenant operating system for freelancers and agencies. The platform processes financial transactions, client communications, project metadata, and business activity logs.

This document defines the production security architecture, identity boundaries, access control policies, network security layers, and data protection mechanisms.

---

## 2. System Architecture & Trust Boundaries

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC INTERNET                                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / TLS 1.3
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EDGE & GATEWAY LAYER                               │
│  - Vercel Edge: Static Assets, SSR, Next.js 16 (Security Headers, CSP)      │
│  - Cloudflare Workers: Global API Edge Reverse Proxy (DDoS, Rate Limit)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / Bearer JWT
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION BOUNDARY                              │
│  - Clerk IdP: RSA Signed JWT Verification via @clerk/express                │
│  - userResolverMiddleware: Maps Clerk String ID -> Internal User UUID       │
│  - JIT (Just-In-Time) atomic user provisioning with conflict safety         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ req.user = { id: UUID }
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHORIZATION & RBAC                                │
│  - Multi-Tenant Workspace Guard: WorkspaceMemberRepository                  │
│  - Domain RBAC Pure Policies: canCreate*, canUpdate*, canDelete*            │
│  - Roles: Owner (3) > Editor (2) > Viewer (1)                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Authorized Domain Context
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DOMAIN LOGIC & IMMUTABILITY LAYER                       │
│  - Workspaces, Clients, Projects, Invoices, Dashboard                       │
│  - Synchronous Fail-Safe Activity Consumer (Immutable Audit Trail)          │
│  - Financial Validation: Non-negative, precision, idempotency               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Parameterized SQL
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                                 │
│  - Drizzle ORM: Strictly typed, query parameterization (zero SQL injection) │
│  - Neon PostgreSQL: Connection pooling, workspace-scoped foreign keys       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Defense-in-Depth Layers

### Layer 1: Edge & Network Security
- **Strict CORS Policy**: API strictly rejects unauthorized origins. Whitelisted origins are limited to the exact production frontend (`https://freelancy-omega.vercel.app`), approved preview deployments (`https://*.vercel.app`), and local development environments.
- **Security Headers**:
  - `Content-Security-Policy`: Restricts scripts, frames, and connect sources to verified origins (Clerk, Vercel, Google Fonts).
  - `Strict-Transport-Security`: HSTS enforced with `max-age=63072000; includeSubDomains; preload`.
  - `X-Content-Type-Options`: `nosniff` prevents MIME-type sniffing.
  - `X-Frame-Options`: `DENY` prevents clickjacking.
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
- **Payload Size Limiting**: Express API and Cloudflare Worker bridge enforce a strict 1MB payload ceiling to prevent memory exhaustion and DoS.

### Layer 2: Authentication & Identity Translation
- **Cryptographic JWT Verification**: Clerk RSA public keys verify token authenticity, expiration, and issuer.
- **Identity Isolation**: External Clerk identifiers (`user_2bX...`) are translated to internal PostgreSQL UUIDs (`users.id`).
- **Production Mock-Auth Protection**: Development mock authentication (`ENABLE_MOCK_AUTH`, `x-mock-user-id`) is completely disabled in `production` environments.

### Layer 3: Object-Level Authorization & Tenant Isolation
- **Workspace Scoping**: Every domain entity (client, project, invoice, activity) contains a `workspace_id` foreign key.
- **Relational Integrity**: Foreign key constraints enforce tenant ownership (e.g. `fk_invoices_workspace_client` ensures client belongs to same workspace as invoice).
- **IDOR Protection**: Database queries strictly filter by `WHERE id = :id AND workspace_id = :workspaceId`. Accessing a valid entity with another workspace's ID returns 404 or 403.

### Layer 4: Role-Based Access Control (RBAC)
- **Role Hierarchy**: `Owner` (full admin + member management + delete), `Editor` (content mutations), `Viewer` (read-only).
- **Pure Function Policies**: Domain policies (`canCreateInvoice`, `canDeleteWorkspace`, etc.) are deterministic pure functions evaluated before service operations.

### Layer 5: Financial Mutation & Audit Integrity
- **Financial Validation**: Invoice amounts, discounts, and taxes enforce non-negative values and decimal precision.
- **Payment Replay Protection**: Payment recording supports deduplication and validates that `amountPaid` does not exceed remaining `amountDue`.
- **Immutable Audit Trail**: Business actions emit domain events to `activity_events`, an append-only audit log with sanitized metadata.

---

## 4. Cryptographic & Secret Management
- **Zero Secrets in Frontend**: Client bundles contain only public publishable keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).
- **Backend Secrets**: `DATABASE_URL` and `CLERK_SECRET_KEY` are provisioned via encrypted Cloudflare Workers / Vercel environment variables.
- **CI/CD Isolation**: GitHub Actions workflows run with least-privilege token permissions (`permissions: contents: read`). Fork pull requests cannot access production deployment secrets.
