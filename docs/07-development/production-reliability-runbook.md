# Production Reliability & Incident Response Runbook

## 1. Quick Diagnostic Cheat Sheet

| Incident Symptom | Step 1 Check | Step 2 Action | Resolution Protocol |
| :--- | :--- | :--- | :--- |
| **API Returns 500 / 502 / 503** | Query `GET /health` & `GET /health/ready` | Inspect Cloudflare Worker tail logs (`wrangler tail`) | Check DB pool / env secrets |
| **Frontend White Screen** | Inspect Browser Console & Network tab | Check Vercel Deployment status & build logs | Revert bad commit / promote prior build |
| **Users cannot Sign In / 401s** | Verify Clerk Dashboard status & key config | Check Clerk publishable & secret keys | Sync Clerk live keys in Cloudflare secrets |
| **Database Queries Timing Out** | Check Neon Console dashboard & compute metrics | Check active connection count & migration status | Scale Neon compute / restart pool |
| **Deployment Failed in CI** | Inspect GitHub Actions workflow job logs | Identify failing quality gate (lint, test, build, migrate) | Fix code / migration error and re-push |

---

## 2. Incident Response Scenarios

### Scenario A: API Down / 5xx Spike

#### Symptoms
- Customers report API failures or spinning loaders.
- Cloudflare Workers emit elevated HTTP 5xx errors.

#### Step-by-Step Investigation
1. **Probe Liveness & Readiness**:
   ```bash
   # Check worker runtime
   curl -I https://api.freelance-os.com/health
   # Check database connectivity & latency
   curl -s https://api.freelance-os.com/health/ready
   ```
2. **Stream Live Worker Logs**:
   ```bash
   pnpm --filter @repo/api exec wrangler tail
   ```
3. **Trace Specific Error by Request ID**:
   - Locate the `requestId` (e.g. `req_abc123`) from user report or response payload.
   - Filter logs for `"requestId": "req_abc123"`.
   - Inspect the `errorCode`, `error.message`, and server-side stack trace.
4. **Resolution Actions**:
   - If `/health` fails: Cloudflare Worker configuration or secret mismatch. Run `wrangler deploy` or verify secrets.
   - If `/health/ready` fails: Neon PostgreSQL unreachable or connection string invalid.

---

### Scenario B: Frontend Broken / White Screen

#### Symptoms
- Users encounter application crash or blank page.

#### Step-by-Step Investigation
1. **Inspect Route Error Boundary**:
   - The user will see the styled Error Boundary fallback with a unique `Digest / Error ID`.
2. **Check Vercel Deployment Logs**:
   - Log in to Vercel Console -> Select `Freelance-OS` -> Deployments -> View runtime logs.
3. **Verify Environment Variables**:
   - Confirm `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are present and valid.
4. **Resolution Action**:
   - Perform instantaneous Vercel Rollback (< 10 seconds):
     - Vercel Dashboard -> Deployments -> Find last known good release -> Click **Promote to Production**.

---

### Scenario C: Database Failure / Neon Connectivity Loss

#### Symptoms
- API returns `HTTP 503` with `{ status: "unhealthy", database: "disconnected" }`.
- Logs show PostgreSQL timeout or pool connection errors.

#### Step-by-Step Investigation
1. **Verify Neon Console**:
   - Open [Neon Console](https://console.neon.tech) -> Check compute status for `freelance-os-production`.
2. **Test Direct Connection**:
   ```bash
   pnpm --filter @repo/database db:migrate
   ```
3. **Check Pool Limits**:
   - Ensure WebSocket connections from `@neondatabase/serverless` are not exceeding Neon compute connection limits.
4. **Resolution Action**:
   - If Neon project is suspended or paused, trigger compute wakeup via console or fresh API request.
   - If credentials rotated, update `DATABASE_URL` in Cloudflare Secrets:
     ```bash
     wrangler secret put DATABASE_URL
     ```

---

### Scenario D: Clerk Authentication Failures

#### Symptoms
- API returns `HTTP 401 Unauthorized` with `{ code: "UNAUTHORIZED" }` on authenticated routes.
- Frontend loops on redirect to `/sign-in`.

#### Step-by-Step Investigation
1. **Check Clerk Status**:
   - Open [Clerk Status Page](https://status.clerk.com) and Clerk Dashboard.
2. **Verify Key Matching**:
   - Verify that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (frontend) and `CLERK_SECRET_KEY` (API) belong to the same production tenant.
3. **Inspect JWT Expiration**:
   - Verify client device system clock is synchronized.
4. **Resolution Action**:
   - Re-inject Clerk credentials into Cloudflare Workers and Vercel if keys were rotated.

---

### Scenario E: Database Migration Failure in CI/CD

#### Symptoms
- GitHub Actions deployment job fails at `Run database migrations` step.
- Application deployment is blocked (safe gate).

#### Step-by-Step Investigation
1. **Review CI Migration Output**:
   - Open GitHub Actions run log -> Inspect `Run database migrations` job step.
   - Look for `[MIGRATION_FAILED]` JSON log with specific SQL error.
2. **Identify Failing Migration File**:
   - Review recent files added to `packages/database/migrations/*.sql`.
3. **Resolution Action**:
   - Create a forward-fix migration using `pnpm --filter=@repo/database db:generate`.
   - Never manually alter production schema tables outside migration tracking.

---

## 3. Rollback Protocols

### 1. Cloudflare Workers API Rollback (< 5 seconds)
```bash
# Roll back to the previous active worker deployment version
pnpm --filter @repo/api exec wrangler rollback
```
Or via Cloudflare Dashboard:
- Cloudflare Dashboard -> Workers & Pages -> `freelance-os-api` -> Deployments -> Select previous version -> **Rollback**.

### 2. Vercel Web Frontend Rollback (< 10 seconds)
- Navigate to Vercel Dashboard -> `Freelance-OS` -> Deployments.
- Click the three dots `...` on the previous working deployment -> Click **Promote to Production**.

### 3. Database Schema Rollback Protocol
> [!CAUTION]
> Database schema rollbacks must be handled through **forward-fixing SQL migrations** (`packages/database/migrations/*.sql`). Do not execute destructive schema drops directly on live production tables without verifying data integrity.
