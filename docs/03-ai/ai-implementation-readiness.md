# AI Implementation Readiness Report — Phase 0

**Date:** August 30, 2026  
**Status:** Ready for Phase 1

This document summarizes the findings from Phase 0 (Architecture Reconnaissance) and confirms the codebase's readiness for the AI subsystem implementation.

---

## 1. Authentication Flow (Traced)

The existing authentication flow in `apps/api/src/middleware/auth.middleware.ts` is solid and correctly maps external identity to internal identity:

1. Request arrives at Cloudflare Workers API.
2. `clerkMiddleware` from `@clerk/express` verifies the JWT.
3. `userResolverMiddleware` extracts `clerkId` via `getAuth(req)`.
4. It queries the `users` table for matching `clerkId`. (JIT provisions if missing).
5. It attaches the internal user to `req.user = { id, clerkId, email }`.

**AI Integration Plan:** The `apps/api` will act as a trusted client to the AI service. The API controller will pass the resolved `req.user.id` to the AI service as the `actorId`. The AI service does NOT need to communicate with Clerk.

---

## 2. Workspace Context & Authorization (Traced)

The workspace authorization pattern resides in `apps/api/src/domains/workspace/`:

1. `workspace.controller.ts` extracts `workspaceId` from `req.params` and `userId` from `req.user`.
2. `WorkspaceService` queries `workspace_members` repository for the membership record.
3. `workspace.policies.ts` executes pure function checks (e.g., `hasAtLeastRole(membership.role, "editor")`).

**AI Integration Plan:** The AI service must receive both the `workspaceId` and the `actorRole` from the Cloudflare API request. The Python FastAPI service will trust this authorization envelope. Any SQL tools implemented in Python MUST strictly apply `WHERE workspace_id = :workspaceId`.

---

## 3. HTTP Client Structure (Traced)

The frontend uses an Axios-based client (`apps/web/src/api/client.ts`) with custom interceptors:

1. **Request:** Injects Clerk JWT `Authorization: Bearer <token>`.
2. **Response:** Parses `response.data.success`.
3. **Error Handling:** Maps errors to an `ApiError` class containing `error` (code), `message`, `details`, `status`, and `requestId`.
4. **Correlation:** Extracts `x-request-id` header for tracing.

**AI Integration Plan:** The Python FastAPI AI service MUST return responses in the exact same envelope structure:
```json
{
  "success": true,
  "data": { ... },
  "requestId": "..."
}
```
If the AI service fails, it must return standard error codes (e.g., `VALIDATION_ERROR`, `API_ERROR`) that `interceptors.ts` can parse gracefully.

---

## 4. Environment Conventions

- Frontend relies on `NEXT_PUBLIC_API_URL`.
- API uses `wrangler.jsonc` (Cloudflare Workers configuration).
- The AI Service will be deployed to Google Cloud Run, requiring its own configuration.

**Required New Environment Variables (Cloudflare API):**
- `AI_SERVICE_URL` (URL of the deployed Cloud Run instance)
- `AI_SERVICE_API_KEY` (Secret for service-to-service auth)

**Required Environment Variables (Cloud Run AI Service):**
- `GROQ_API_KEY`
- `JINA_API_KEY`
- `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`
- `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`
- `DATABASE_URL` (Direct Neon PostgreSQL connection string for tools)
- `AI_SERVICE_API_KEY` (Matches the API secret)

---

## 5. Scope Analysis Migration Plan

The AI RAG documentation requires persisting confirmed scope analysis results. This will require a new Drizzle migration in `packages/database`.

**Target Schema (`packages/database/src/schema/projects.ts` or new `scope_analyses.ts`):**
```typescript
export const scopeAnalysesTable = pgTable("scope_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspacesTable.id),
  projectId: uuid("project_id").references(() => projectsTable.id), // nullable for pre-project scopes
  actorUserId: uuid("actor_user_id").notNull().references(() => usersTable.id),
  inputText: text("input_text").notNull(),
  result: jsonb("result").notNull(),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```
This migration will be created and run before Phase 5 / 14.

---

## 6. Contradictions Found & Resolved

1. **AI Runtime Docs pathing:** Addressed prior to this report. Docs are correctly stored in `docs/03-ai/`.
2. **AI Runtime Choice:** Original specs implied LangGraph JS. This has been explicitly corrected and documented in `ai-runtime-decision.md` -> Python / FastAPI / Cloud Run is LOCKED.
3. **Chroma Hosting:** Changed from local self-hosted to Chroma Cloud, documented in updated `ai-rag-specification.md`.
4. **Service-to-Service Auth:** Set to API Keys over headers, explicitly locked in `ai-architecture.md`.

---

## 7. Open Risks

- **Cloud Run Latency:** The additional network hop from Cloudflare -> GCP adds latency. The exact P95 latency is unknown until the first real implementation is tested.
- **Neon DB Connection Limits:** The Python AI service will need its own connection to Neon PostgreSQL (for SQL tools). If Cloud Run scales out heavily, it could exhaust Neon connection pools. Need to ensure Python tools close connections promptly or use Neon's HTTP driver / connection pooler.

---

## Conclusion

The repository is structurally ready for the AI extension. The authentication, authorization, and error handling patterns in the core app are cleanly decoupled from the domain logic, making the insertion of the `AI Service Boundary` straightforward.

**Next Step:** Proceed to **Phase 1** (FastAPI AI Service Skeleton).
