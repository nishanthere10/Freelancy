# Observability Architecture & Telemetry Specification

## 1. Executive Summary & Philosophy

This document defines the production observability, logging, request correlation, error tracking, and health monitoring architecture for **Freelance OS**.

### Core Operational Principles

1. **Lightweight & Platform-Aligned**: Leverages the native serverless runtime capabilities of **Vercel**, **Cloudflare Workers (V8 Isolates)**, **Neon Serverless PostgreSQL**, and **GitHub Actions** without introducing heavy self-hosted clusters (e.g., Kafka, Kubernetes, Elasticsearch, Prometheus, Grafana).
2. **End-to-End Request Correlation**: Every inbound browser request is assigned a unique `requestId` (`x-request-id`) that propagates from Next.js UI -> Cloudflare Worker -> Express Domain Controllers -> Neon Database queries -> Error responses.
3. **Structured & Secret-Safe Logging**: Production logs are emitted as level-gated JSON lines (`debug`, `info`, `warn`, `error`) with automated recursive credential sanitization.
4. **Resilience & Safe Recovery**: Fast, non-destructive health and readiness probes enable automated deployment gating, instant rollback verification, and transparent incident triage.

---

## 2. End-to-End Request & Observability Trace Flow

```text
                                USER (Browser)
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │     Vercel Next.js 16     │
                        │    (App Router UI Layer)  │
                        └─────────────┬─────────────┘
                                      │
                                      │  Axios HTTP Request
                                      │  (Header: x-request-id)
                                      │  (Auth: Bearer <Clerk JWT>)
                                      ▼
                        ┌───────────────────────────┐
                        │   Cloudflare Workers API  │
                        │      (api.freelance-os)   │
                        └─────────────┬─────────────┘
                                      │
                         [requestIdMiddleware]
                         • Validates or generates x-request-id
                         • Injects into req.id & response header
                                      │
                         [requestLoggerMiddleware]
                         • Tracks start time & request duration (durationMs)
                         • Emits structured JSON completion logs
                                      │
                         [clerkAuth + userResolver]
                         • Verifies JWT & resolves internal user UUID
                         • Logs authentication failures with correlation ID
                                      │
                         [Domain Services & Controllers]
                         • Workspace / Client / Project / Invoice / Dashboard
                         • Strict mutation rate limiter (60 req/min)
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   Neon PostgreSQL (Drizzle)│
                        │  Serverless WebSocket Pool│
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    Response / Error Flow  │
                        │  • 2xx: JSON Data envelope│
                        │  • 4xx/5xx: Safe Error    │
                        │    envelope + requestId   │
                        └───────────────────────────┘
```

---

## 3. Platform Observability Matrix: Which Tool Answers Which Question?

| Operational Question | Primary Observability Source | Secondary Source | Investigation Command / Dashboard |
| :--- | :--- | :--- | :--- |
| *Is the web application rendering or experiencing client crashes?* | **Vercel Runtime & Build Logs** | Browser Console / Error Boundaries | Vercel Project Dashboard -> Logs / Deployments |
| *Is the API available and receiving incoming HTTP requests?* | **Cloudflare Workers Tail Logs** | Application Structured Logs | `wrangler tail` or Cloudflare Worker Dashboard -> Observability |
| *Why did a specific user request fail with HTTP 500?* | **Application JSON Logs (`requestId`)** | Global Express Error Handler | Filter logs by `requestId: "req_..."` |
| *Are database queries slow, locked, or timing out?* | **Neon Monitoring & Telemetry** | API Request Latency Logs (`durationMs`) | Neon Console -> Monitoring -> Operations & Queries |
| *Why did a production deployment fail?* | **GitHub Actions Workflow Output** | CI Quality Gate & Smoke Step Logs | GitHub Repo -> Actions -> CI/CD Pipeline Job Run |
| *Is the database accessible before traffic routes to the Worker?* | **`/health/ready` Readiness Probe** | `pnpm --filter=@repo/database db:migrate` logs | `curl https://api.freelance-os.com/health/ready` |

---

## 4. Structured Logging Architecture

### Log Schema Specification

All backend log entries conform to the following JSON schema:

```json
{
  "timestamp": "2026-08-15T15:00:00.000Z",
  "level": "info",
  "message": "HTTP GET /api/v1/workspaces/ws-123/invoices 200 (24ms)",
  "requestId": "req_8f1d2c4e9b7a",
  "method": "GET",
  "path": "/api/v1/workspaces/ws-123/invoices",
  "status": 200,
  "durationMs": 24,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "workspaceId": "ws-123",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Levels & Rules

- **`DEBUG`**: Internal diagnostic logs, high-frequency `/health` pings, dev tracing. Muted in production unless `LOG_LEVEL=debug`.
- **`INFO`**: Normal request completion, application bootstrap, version identification, successful migration runs.
- **`WARN`**: Handled business anomalies, client 4xx responses, unauthenticated requests (401), forbidden actions (403), rate-limit hits (429).
- **`ERROR`**: Unhandled exceptions (500), database connectivity failures, migration execution failures, configuration mismatches.

### Automated Secret Redaction

The logger enforces strict automated sanitization on all data before formatting:
- **Redacted Header Keys**: `authorization`, `cookie`, `set-cookie`, `session`.
- **Redacted Secret Identifiers**: `password`, `token`, `secret`, `key`, `clerk_secret_key`, `database_url`, `api_token`, `apikey`.
- **Pattern Redaction**: Embedded `Bearer <token>` strings and PostgreSQL connection strings (`postgresql://user:pass@host/db`) are automatically masked as `Bearer [REDACTED]` and `postgresql://[REDACTED]:[REDACTED]@host/db`.

---

## 5. Request Correlation & ID Lifecycle

1. **Origin Generation**: When an incoming request arrives at the API, `requestIdMiddleware` checks for an existing valid `x-request-id` header. If missing, it generates a cryptographically safe identifier `req_<uuid>`.
2. **Express Context**: The ID is attached to `req.id` and assigned to the response header `res.setHeader('x-request-id', requestId)`.
3. **Log Attachment**: All log events emitted during request execution include `requestId`.
4. **Client-Side Propagation**: In the event of an API error, `apps/web/src/api/interceptors.ts` extracts `x-request-id` from the HTTP response headers or body and assigns it to the `ApiError.requestId` instance property.
5. **UI Error Boundaries**: User-facing error dialogs and boundary fallbacks display the error ID, allowing customers to provide the exact correlation key to support engineers.

---

## 6. Health & Readiness Probes

### 1. Liveness Probe (`GET /health`)
- **Purpose**: Verifies that the Cloudflare Worker V8 Isolate runtime is healthy and accepting traffic.
- **Overhead**: Zero database calls; instant in-memory response.
- **Response**: `HTTP 200 OK`
  ```json
  {
    "status": "ok",
    "timestamp": "2026-08-15T15:00:00.000Z"
  }
  ```

### 2. Readiness Probe (`GET /health/ready`)
- **Purpose**: Verifies that the database pool is active and able to execute queries (`SELECT 1`).
- **Response (Success)**: `HTTP 200 OK`
  ```json
  {
    "status": "ready",
    "database": "connected",
    "latencyMs": 14,
    "timestamp": "2026-08-15T15:00:00.000Z"
  }
  ```
- **Response (Failure)**: `HTTP 503 Service Unavailable`
  ```json
  {
    "status": "unhealthy",
    "database": "disconnected",
    "latencyMs": 52,
    "timestamp": "2026-08-15T15:00:00.000Z"
  }
  ```

### 3. Version Probe (`GET /version`)
- **Purpose**: Provides operators and deployment verification jobs with running deployment metadata.
- **Response**: `HTTP 200 OK`
  ```json
  {
    "version": "0.1.0",
    "environment": "production",
    "commitSha": "a1b2c3d4e5f6...",
    "timestamp": "2026-08-15T15:00:00.000Z"
  }
  ```

---

## 7. Rate Limiting Architecture

- **Engine**: In-memory sliding-window limiter compatible with serverless isolates.
- **Global Rate Limiter**: 300 requests / minute per client IP for general reads (`GET /api/v1/*`).
- **Strict Mutation Rate Limiter**: 60 requests / minute per client IP for write routes (`POST`, `PATCH`, `DELETE` across workspaces, clients, projects, invoices).
- **Headers Exposed**:
  - `X-RateLimit-Limit`: Maximum allowable requests in window.
  - `X-RateLimit-Remaining`: Remaining request quota.
  - `X-RateLimit-Reset`: Unix timestamp when quota resets.
- **Exceeded Behavior**: Emits `HTTP 429 Too Many Requests` with `{ success: false, error: "RATE_LIMIT_EXCEEDED", message: "..." }`.

---

## 8. Frontend Error Observability & Boundaries

- **Route Error Boundary (`apps/web/app/error.tsx`)**: Catches runtime rendering errors in sub-routes, displays safe UX with retry buttons and error IDs, and prevents white-screen crashes.
- **Global Error Boundary (`apps/web/app/global-error.tsx`)**: Replaces the root document in the event of a catastrophic layout failure.
- **Not Found Page (`apps/web/app/not-found.tsx`)**: Handles 404 navigation gracefully with breadcrumb CTAs.
- **Mutation Retry Protection**: In `QueryProvider.tsx`, `mutations: { retry: 0 }` guarantees that financial operations (such as creating invoices or recording payments) are never retried automatically on client timeout, avoiding duplicate transaction submissions.
