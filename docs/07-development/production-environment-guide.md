# Production Environment & Operations Guide

## 1. Developer Mental Model

Understanding the environment lifecycle is essential for every developer working on **Freelance-OS**:

```text
LOCAL ENVIRONMENT
  └─► Fast iteration on developer laptop
  └─► Next.js (web:5000) + Express Node.js (api:5001) + Dev Neon DB
  └─► Mock authentication fallback (ENABLE_MOCK_AUTH=true)

CI ENVIRONMENT (GitHub Actions)
  └─► Automated correctness & quality gate
  └─► Runs on isolated GitHub runners for every Pull Request
  └─► Enforces TypeScript compilation, linter rules, unit tests, and production build checks

PRODUCTION STACK (Live SaaS Application)
  ├─► Web: Next.js App Router (v16) deployed on Vercel
  ├─► API: Express API running on Cloudflare Workers (V8 Serverless Isolate)
  ├─► Database: Serverless PostgreSQL on Neon
  ├─► Auth: Clerk Production Tenant (zero mock pathways)
  └─► CI/CD: GitHub Actions automated deployment
```

---

## 2. Comprehensive Environment Comparison Matrix

| Operational Concern | Local Development | CI Environment | Production Web | Production API |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting Target** | Local Machine | GitHub Actions Runner | **Vercel** | **Cloudflare Workers** |
| **Runtime Engine** | Node.js v20 (tsx / next dev) | Node.js v20 | Next.js Serverless / Edge | Cloudflare V8 Isolate (`nodejs_compat`) |
| **URL Endpoint** | `http://localhost:5000` | N/A (Build validation) | `https://app.freelance-os.com` | `https://api.freelance-os.com/api/v1` |
| **Database Instance** | Neon Dev DB / Local Postgres | Ephemeral CI Test DB | N/A | Production Neon PostgreSQL |
| **Authentication** | Clerk Dev + Mock Auth Fallback | Mock Auth (`ENABLE_MOCK_AUTH=true`) | Clerk Production Tenant | Clerk Production Tenant (Strict JWT) |
| **Secret Storage** | `.env` / `.env.local` | GitHub Secrets | Vercel Environment Variables | Cloudflare Workers Secrets (`wrangler secret`) |
| **CORS Origin** | `http://localhost:5000` | `http://localhost:5000` | N/A | Allowed: `https://app.freelance-os.com` |
| **Schema Execution** | Direct push (`pnpm db:push`) | Migration check dry-run | N/A | Formal migration (`drizzle-kit migrate`) |

---

## 3. End-to-End Production Request Walkthrough

The following lifecycle details a user request traversing the production architecture:

```text
User opens Freelance-OS Browser
        ↓
Vercel serves Next.js App Router UI
        ↓
User authenticates with Clerk IdP
        ↓
Browser obtains active Clerk JWT Session Token
        ↓
Axios interceptor attaches `Authorization: Bearer <token>`
        ↓
Request sent over HTTPS to Cloudflare Workers API (api.freelance-os.com)
        ↓
Cloudflare Worker receives request in V8 Isolate
        ↓
Clerk middleware verifies RSA JWT signature
        ↓
Internal user resolved via usersTable (JIT provisioned if first login)
        ↓
Workspace membership & role verified in database
        ↓
RBAC policy evaluated (e.g. canViewInvoice)
        ↓
Domain service executes business logic
        ↓
Drizzle ORM executes query against Neon PostgreSQL
        ↓
Neon returns data over SSL
        ↓
Cloudflare Worker returns JSON response to browser
        ↓
Next.js UI renders data via TanStack Query
```

---

## 4. Operational Considerations by Target

### Cloudflare Workers Operational Considerations (API)

1. **Stateless Execution Model**: Workers execute as stateless V8 isolates. In-memory global variables must not be relied upon to preserve state across requests.
2. **Node Compatibility (`nodejs_compat`)**: The API requires Cloudflare's `nodejs_compat` flag in Wrangler configuration to enable Node standard library APIs (such as `buffer`, `crypto`, `events`, `stream`).
3. **Database Connectivity**: Database queries execute over HTTP/WebSocket serverless drivers (`@neondatabase/serverless`) to comply with Worker socket boundaries.
4. **Secret Injection**: Server secrets (`DATABASE_URL`, `CLERK_SECRET_KEY`) are set via Cloudflare Secrets (`wrangler secret put <KEY>`) and injected into the Worker environment bindings.
5. **Instantaneous Rollback**: Releases can be rolled back immediately via Wrangler CLI or Cloudflare Dashboard deployments.

### Vercel Operational Considerations (Web)

1. **Next.js App Router (v16)**: Built with `pnpm --filter=web build` and deployed to Vercel's edge network.
2. **Environment Variable Bundling**: Client-side environment variables prefixed with `NEXT_PUBLIC_` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) are baked into static JavaScript bundles during build time.
3. **Server-Side Secret Protection**: `CLERK_SECRET_KEY` on Vercel is restricted strictly to Next.js Server Components and API routes.

---

## 5. Environment Variables & Secrets Reference Guide

| Variable Name | Purpose | Value Shape | Secret? | Configured In | Consumed By |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime mode | `development` \| `test` \| `production` | No | Platform Environment | Web & API Runtimes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` | **YES** | Cloudflare Workers Secrets | Drizzle ORM |
| `CLERK_PUBLISHABLE_KEY` | Public authentication key | `pk_live_...` | No | Cloudflare API Settings | Clerk Middleware |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client-accessible Clerk key | `pk_live_...` | No | Vercel Environment Variables | `@clerk/nextjs` |
| `CLERK_SECRET_KEY` | Server-side authentication key | `sk_live_...` | **YES** | Cloudflare Workers Secrets | Clerk Backend Verification |
| `NEXT_PUBLIC_API_URL` | Base API URL for frontend | `https://api.freelance-os.com/api/v1` | No | Vercel Environment Variables | Axios Client (`apps/web`) |
| `FRONTEND_URL` | Allowed origin for API CORS | `https://app.freelance-os.com` | No | Cloudflare API Settings | Express CORS Middleware |

---

## 6. Database Migration Strategy: Development vs Production

- **Local Development**: Developers edit schema in `packages/database/src/schema/` and run `pnpm db:push` to sync local database.
- **Production Sequence**:
  1. Generate SQL migration: `pnpm --filter=@repo/database db:generate`.
  2. Commit timestamped SQL file in `packages/database/migrations/*.sql`.
  3. CI validates migration SQL during PR check.
  4. Migration runner executes `pnpm --filter=@repo/database db:migrate` against Neon Production DB prior to Cloudflare Worker deployment.

> [!CAUTION]
> Production schema changes must never rely on development-only `db:push` workflows.

---

## 7. Production Troubleshooting & Debugging Guide

| Symptom / Error | Root Cause Inspection | Action / Resolution |
| :--- | :--- | :--- |
| **CORS Error in Browser** | `FRONTEND_URL` on Cloudflare Worker does not match Vercel Web origin. | Update `FRONTEND_URL` in Cloudflare Worker environment to match `https://app.freelance-os.com` exactly. |
| **API Returns 401 Unauthorized** | Invalid/expired Clerk JWT token, or `CLERK_SECRET_KEY` mismatch. | Verify `CLERK_SECRET_KEY` set in Cloudflare Worker secret matches Production Clerk Tenant. |
| **Worker Database Connection Error** | Using Node TCP driver (`postgres.js`) instead of Neon serverless driver (`@neondatabase/serverless`). | Verify database driver uses `@neondatabase/serverless` HTTP/WebSocket driver compatible with Worker runtime. |
| **Next.js Build Failure** | `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` missing during Vercel build. | Ensure all `NEXT_PUBLIC_` variables are defined in Vercel Environment Settings for Production build scope. |

---

## 8. Observability, Logging & Health Probes

- **Structured JSON Logs**: All server logs are formatted as JSON lines containing `timestamp`, `level`, `requestId`, `method`, `path`, `status`, and `durationMs`.
- **Request Tracing**: Inbound requests receive or propagate an `x-request-id` header for cross-platform debugging.
- **Health Probes**:
  - `GET /health`: Liveness probe for edge routing.
  - `GET /health/ready`: Readiness probe executing `SELECT 1` against Neon PostgreSQL.
  - `GET /version`: Exposes active Git commit SHA and environment metadata.
- **Rate Limiting**: Sliding-window in-memory rate limiting applied to general reads (300 req/min) and mutations (60 req/min).

---

## 9. Operational Rollback Protocols

- **Web Deployment Rollback**: Navigate to Vercel Dashboard -> Deployments -> Select previous build -> Click **Promote to Production**. (< 10s execution).
- **Worker API Rollback**: Execute `wrangler rollback` via Wrangler CLI or select previous deployment version in Cloudflare Dashboard. (< 5s execution).
- **Database Schema Rollback**: Write forward-fix SQL migration file in `packages/database/migrations/` and apply via migration runner.
