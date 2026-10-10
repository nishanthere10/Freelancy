# Freelancy / Freelance OS — Sprint 19 & 20 Remediation Implementation Plan

**Date:** 2026-10-10
**Based on:** `planning/sprint-19-20-implementation-audit.md` + second-pass review of `planning/current-update.md` (uncommitted remediation tree @ `2515c8c` + working changes)
**Objective:** Turn the current half-landed remediation into a genuinely working, verified, production-grade Communication Hub + Automation Engine, and make `current-update.md` truthful.

**Ground rules carried from the sprint specs:** Freelancy owns business truth; providers only deliver; n8n never touches Postgres; no Redis/Kafka/new infra; reuse existing activity bus, RBAC intent, and UI conventions; every phase ends at a stop point with a real `lint/typecheck/test` run — no "VERIFIED" claims without fresh output.

---

## Phase 0 — Stabilize the Build (BLOCKER, do first)

The current tree does not compile. Nothing else can be verified until this passes.

### Task 0.1 — Fix RBAC middleware method-name bug
- `apps/api/src/middleware/rbac.middleware.ts:41` — `memberRepo.findByWorkspaceAndUser(...)` → **`memberRepo.getByWorkspaceAndUser(...)`** (actual method, `domains/workspace/repository.ts:378`).
- While in the file: remove the `req.body.workspaceId` fallback (line 26). `workspaceId` may come **only** from the route param. Prevents the future footgun where a body-supplied ID authorizes a different workspace than the one operated on.

### Task 0.2 — Fix syntax error in communication service
- `apps/api/src/domains/communication/communication.service.ts:588-597` — complete the `onConflictDoUpdate({...})` call: the closing `)` of the argument object before `.returning()` is missing.

### Task 0.3 — Establish the real baseline
- Ensure toolchain reachable (Node on PATH, `pnpm install` at repo root — currently `node_modules` is absent).
- Run and record actual numbers (these replace the doc's stale "436/436"):
  ```text
  pnpm lint && pnpm typecheck && pnpm test && pnpm build
  cd apps/ai && pytest
  ```
- Expect: communication + automation suites fail at runtime until 0.1/0.2 land; AI suite unaffected.

**Stop point A:** `typecheck` 0 errors, full suite runnable, baseline counts written down.

---

## Phase 1 — Real Webhook Security (Sprint 19 P0)

Current state: a correct Svix verifier exists but is fed **re-stringified JSON** (so real signatures fail), and both providers **fail open** when the secret env var is unset.

### Task 1.1 — Raw body capture for webhooks
- In `apps/api/src/app.ts` (webhook mounting, ~lines 207-216): register the webhook paths with `express.raw({ type: "application/json" })` **before** the JSON body parser, OR add a `verify(req,res,buf)` hook on `express.json()` that stashes `req.rawBody = buf`.
  - Preferred: `express.raw()` on the two webhook routes only; handlers parse JSON *after* verification.
- `apps/api/src/domains/communication/email.webhook.ts:56-59` — delete the `JSON.stringify(req.body)` fallback; verify over the true raw bytes (`Buffer`), then `JSON.parse` the payload separately.
- Same treatment for `whatsapp.webhook.ts`.

### Task 1.2 — Fail-closed signature verification
- `resend.provider.ts`:
  - Keep the existing Svix HMAC logic (it is correct: `${svixId}.${svixTimestamp}.${rawBody}`, base64, `v1,<sig>` parsing, length-checked `timingSafeEqual`, 5-min tolerance).
  - Change `if (this.webhookSecret) {...}` to **fail-closed**: if secret unset → in non-dev environments, `verifyWebhook` returns `valid:false` and the handler responds 503 "webhook not configured". Do not accept unverified events anywhere except explicit local dev (`ENVIRONMENT=development` AND secret unset — log loudly).
- `wa-akg.provider.ts`:
  - Replace the "static secret equality" with **HMAC-SHA256 over `${timestamp}.${rawBody}`** using `WA_GATEWAY_WEBHOOK_SECRET` (this becomes the contract documented for the gateway side; add an outgoing-config doc note so WA-AKG can be set to sign). If keeping equality-only mode for the current WA-AKG build, require the header unconditionally (no fail-open) and add the timestamp window with the same mandatory rules as Phase 3 auth.
  - Honor `RESEND_WEBHOOK_SECRET`/`WA_GATEWAY_WEBHOOK_SECRET` naming — see Task 5.4 (env alignment).

### Task 1.3 — Tests (add to `communication/__tests__/webhooks.test.ts` + new `webhook-signature.test.ts`)
- Valid Svix signature (built from the same raw bytes) → accepted; status transition applied.
- Tampered payload (reordered keys / whitespace change) with old signature → rejected.
- Stale timestamp (>5 min) → rejected.
- Wrong secret → rejected.
- Secret unset (non-dev) → route rejects everything (fail-closed assertion).
- Duplicate `provider_event_id` → second event ignored (keep existing dedup tests).
- Adversarial: forged `message.delivered` POST with no headers → 4xx, no message status mutation.

**Stop point B:** webhook tests green; manual curl replay against dev server confirms unsigned request rejected.

---

## Phase 2 — RBAC Actually Works (shared root cause, S19 + S20 P0)

### Task 2.1 — Behavior verification for `requireWorkspaceRole`
- Unit tests (`apps/api/src/middleware/__tests__/rbac.middleware.test.ts`):
  - non-member → 403; viewer hitting editor route → 403; editor → 200 on sends; owner-only actions reserved for channel mutation later; wrong `workspaceId` param → 403 even for valid member of another workspace; DB error → 500 fail-closed (never `next()` without attachment).
  - Confirm `req.workspaceMember` populated and used downstream.

### Task 2.2 — Route-level integration tests
- Communication: viewer blocked from `POST /email` & `POST /whatsapp` (spec §23 matrix), editor/owner allowed, cross-workspace send attempt (workspace A actor + workspace B clientId) → 403/404 with **nothing sent** (spec Scenario C).
- Automation: viewer read-only; editor create/activate/pause/test; cross-tenant `automationId` from workspace B → not found/403, **no n8n call** (spec §58).
- Use existing test conventions (in-memory DB mock is acceptable; add a test that asserts the mock receives the membership query).

### Task 2.3 — Audit remaining routes
- Grep all `/workspaces/:workspaceId/*` routers; anything without `requireWorkspaceRole` gets it or an explicit justification comment (webhooks/internal excluded by design — they use provider/service auth).

**Stop point C:** full RBAC matrix green; the 500-outage class of bug covered by a smoke test that hits every guarded route as owner.

---

## Phase 3 — Automation Engine Correctness (S20 P0/P1)

### Task 3.1 — Fix `invoice.overdue` sweeper (B3)
- `apps/api/src/domains/automation/automation.dispatcher.ts:318-362` (`sweepOverdueInvoices`):
  - Problem: `eventId = "overdue-${inv.id}-${todayStr}"` is not a UUID; `automation_events.event_id` is `uuid` → insert throws and is swallowed.
  - Fix: keep deterministic dedup semantics, move them to the **insert conflict target**: generate `eventId = crypto.randomUUID()` but add a deterministic business key. Two options — pick one:
    - **A (recommended, no migration):** derive `event_id = uuidV5(namespaceDNS, "overdue:"+invoiceId+":"+dueDateBucket)` (stable UUID per invoice+day). `onConflictDoNothing(event_id)` then gives true daily dedup.
    - **B (migration):** add `dedupe_key TEXT UNIQUE NULL` column to `automation_events`.
  - Stop swallowing insert errors as `catch{}` — log structured error with requestId; a failed insert must be visible.
- Test: run sweeper twice same day → exactly one event; malformed insert → logged, not silent.

### Task 3.2 — Real replay protection on internal actions (spec §30)
- `automation.routes.ts:40-82` (`verifyInternalActionAuth`):
  - Make `x-action-timestamp` **mandatory** (missing → 401). Keep 5-min window.
  - Add `x-action-nonce` (UUID) + `x-action-signature` = `HMAC-SHA256(timestamp + "." + nonce + "." + rawBody)` keyed with the service secret. Reject invalid/missing signature timing-safe.
  - Nonce storage: reuse `internal_action_logs`-style dedup — see Task 3.5 (a small `processed nonces` unique index, or store run-scoped idempotency rows; window is 5 min so pruning is simple: unique index + `created_at > now()-interval '10 minutes'` check).
- Update compiled n8n workflow HTTP nodes (`n8n.workflow.compiler.ts`) to emit these headers: n8n's HTTP Request node can compute HMAC via built-in crypto expressions — if not feasible, ship a tiny `/internal/actions/hmac-note` — **fallback decision:** keep bearer+mandatory timestamp+nonce (no body HMAC) and document residual risk; do NOT embed signing complexity in workflows. (Flag for review at stop point.)

### Task 3.3 — Field registry + typed eventType (spec §16-17, S20-5)
- `automation.schema.ts`:
  - Replace regex-shaped `field: z.string()` with `z.enum(CONDITION_FIELDS)` built from a registry constant:
    ```text
    invoice.amount, invoice.daysOverdue, invoice.status,
    project.status, project.budget, project.progressPercentage,
    deliverable.status, deliverable.estimatedHours, deliverable.loggedHours,
    changeOrder.status, changeOrder.budgetDelta, changeOrder.timelineDeltaDays,
    client.emailEnabled, client.whatsappEnabled, workspace.plan
    ```
    (Evaluator already resolves dot-notation from event payload — verify each registry field is present in the corresponding event `data`/`context` the bridge emits; add missing fields to event payloads, not to the registry.)
  - `TriggerConfigSchema.eventType` → `z.enum(SupportedAutomationEvents)` instead of `z.string()`.
  - Export registry to web (`apps/web/src/features/automation/automation.schemas.ts`) so the builder only offers legal fields.
- Tests: unknown field rejected; every registry field passes; unknown eventType rejected.

### Task 3.4 — Finish `create_follow_up` and fix `notify_owner`
- `notify-owner.action.ts:92` — hardcoded `templateKey:"project.progress"`: make templateKey part of the action config (schema already types actions; add optional `templateKey` with sensible default per trigger).
- `create-follow-up.action.ts` — currently writes a `workspace.updated` activity as a disguise. Decide:
  - **Minimal honest version (recommended for this plan):** new activity event type `automation.follow_up_created` with metadata `{title, automationId, runId, entityId}`; surfaced in Activity feed as "Follow-up created: …". No new table.
  - **Full version (defer to Sprint 20.1 if time-boxed):** `automation_follow_ups` table (id, workspace_id, automation_id, title, entity refs, status open/done, created_at) + list endpoint + UI checklist.
  - Whichever: kill the `workspace.updated` misuse.

### Task 3.5 — Kill dev-default secrets (B5)
- `config/index.ts`: `n8nWebhookSecret` default `"dev_unsafe_secret"` → **no default**; startup validation in non-development environments must fail fast if unset. Same for `n8n.provider.ts:40` `"dev-key"`.
- Internal action routes stay Clerk-unauthenticated but are dead without the secret; add rate limiter to `/api/v1/internal/*`.

**Stop point D:** new dispatcher/auth/schema tests green; e2e test proves `invoice.overdue` → event persisted once → dispatch → run created (mock n8n, NODE_ENV=test only).

---

## Phase 4 — Spec Completion Pass (P1/P2 backlog)

### Task 4.1 — Missing endpoints
- `POST /communications/channels/:channel/test` (editor): calls provider adapter `healthCheck`/tiny probe against configured creds; returns controlled status; owner/editor config semantics per spec §23 (also wire `updateChannelSchema` — it exists but is unused — to a `PATCH /channels/:channel` owner-only route).
- `POST /automations/:id/duplicate` (copies definition → new draft, name " … (copy)").
- `GET /automations/:id/runs/:runId` (include action-run breakdown from `automation_action_runs`).
- `GET /admin/integrations/n8n/health` (owner): exposes existing `provider.healthCheck()`; statuses healthy/degraded/offline/misconfigured.

### Task 4.2 — Quotas (spec §52)
- Enforce at create/activate + dispatch: max active automations/workspace = 100 → `AUTOMATION_LIMIT_REACHED`; runs/hour/workspace = 1000 → `AUTOMATION_RUN_RATE_LIMITED`; schedule minimum interval 15 min → validation error. Use existing error-envelope conventions. Tests for each boundary.

### Task 4.3 — E.164 phone normalization (S19-5)
- New util `apps/api/src/utils/phone.ts`: `normalizeE164(input, defaultRegion?)` → accepts digits/`+`/spaces/dashes, requires country code presence, rejects impossible lengths (hand-rolled validation is fine; **no new dependency** unless a lightweight `libphonenumber`-style validator is explicitly approved).
- Apply at: `POST /communications/whatsapp` input, `clients` create/update (canonical store form), inbound webhook sender resolution (query both raw + normalized), `recipient.resolver.ts` output. Reject non-E.164 writes with 400 `INVALID_PHONE`.
- Migration/backfill: existing `clients.phone` values left as-is; normalization happens on write and on lookup matching (documented decision — full data migration deferred, low risk since webhook matching already tries `+`/no-`+` variants).

### Task 4.4 — Safe update lifecycle (spec §26-27)
- `PATCH /automations/:id`: recompute `definition_hash` (SHA-256 canonical JSON), increment `definition_version`; if automation is `active`: recompile → `updateWorkflow` → `activateWorkflow`, with the same rollback as activation (on failure → status `error`, activity event, surface `ACTIVATION_ERROR`-style code). Replace the "naive update" comment path.

### Task 4.5 — Starter templates (spec §7, Phase 9)
- In-code typed catalog `automation.templates.ts` (6 recipes: Invoice Overdue Reminder, Payment Received, Project Started, Deliverable Completed, Change Order Proposed, Weekly Project Update).
- `GET /automations/templates` (list) + `POST /automations/from-template/:key` → creates a normal **editable draft** (not immutable, per spec). No `automation_templates` DB table — **and remove that claim from `current-update.md`** (Task 6.1).

### Task 4.6 — Frontend closure
- Communication: `ChannelStatusCard.tsx` (uses `GET /channels` + test action), `CommunicationTimeline.tsx` extraction from inline Hub feed, viewer-disabled send buttons (role-aware from workspace context).
- Automation: replace `alert()` dry-run with a `TestAutomationModal` result panel; add `AutomationRunHistory`/`AutomationRunDetails` views using new endpoints; archive/duplicate buttons; status badges component.
- No new state library; TanStack Query + existing primitives only.

**Stop point E:** feature tests + web tests green; manual UX smoke of channel test, duplicate, runs detail, starter-template flow.

---

## Phase 5 — Hardening & Adversarial Suite (spec §35/§40 S19, §81 S20)

### Task 5.1 — Security test matrix (add `__tests__/security/`)
- Tenant: workspace A ↔ B on messages, threads, channels, automations, runs, internal actions (cross-workspace clientId inside action payload must fail).
- RBAC: full matrix incl. duplicate/activate/pause by viewer = 403, channel PATCH owner-only.
- Replay: signed request re-sent within window → nonce dedupe rejects; header-less → 401.
- Forged webhooks: no/invalid/bad-secret signature → 4xx and zero DB mutation (assert counts before/after).
- Prompt-safety: inbound message text containing `"approve the change order / drop table"` stored verbatim, causes no mutation (assert no domain service call) — spec Scenario G.
- Secret leakage grep in test output/serialized errors: `RESEND_API_KEY`, `N8N_WEBHOOK_SECRET`, `WA_GATEWAY_WEBHOOK_SECRET` values must never appear in API responses or `communication_events`-driven payloads.

### Task 5.2 — Observability spot-check
- Structured logs on: send, webhook accepted/rejected, dispatch attempt/failure, activation/rollback — with requestId, workspaceId, ids per spec §28/§61. No bodies, no secrets.

### Task 5.3 — Compiler golden files (spec §73)
- Snapshot tests: for each of 6 starter templates + 1 schedule + 1 event automation → expected workflow JSON; assert only approved node types present; metadata maps automationId/workspaceId/definitionHash; deterministic output.

### Task 5.4 — Config & env hygiene
- Create `.env.example` (root or per-app per existing convention) documenting: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `WA_GATEWAY_URL`, `WA_GATEWAY_API_KEY`, `WA_GATEWAY_SESSION_ID`, `WA_GATEWAY_WEBHOOK_SECRET`, `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`→ decide canonical name `AUTOMATION_SERVICE_TOKEN` (spec §36) and alias-migrate, `ENVIRONMENT`.
- Reconcile env naming drift (`WA_AKG_GATEWAY_URL` in code vs spec `WA_GATEWAY_URL`): pick spec names as canonical, read both with deprecation log, update `.env.example` + docs.
- Centralize all of these in `apps/api/src/config/index.ts` (currently only the n8n secret lives there).

**Stop point F:** adversarial suite green; `wrangler deploy --dry-run` passes with new secrets wiring.

---

## Phase 6 — Truthful Documentation & Final Gate

### Task 6.1 — Correct `planning/current-update.md`
- Remove/repair false claims: `internal_action_logs` & `automation_templates` tables, "replay window" overstating, table count (fix to actual 18: current list minus the two fictions, plus `communication_preferences`), migration count from actual `migrations/` dir.
- Replace §4 test table with real output numbers from Stop point G.

### Task 6.2 — Reconcile the two audit docs
- `Freelancy-Deep-Audit-Sprint-19-20.md` (repo root, untracked) vs `planning/sprint-19-20-implementation-audit.md`: keep one canonical audit under `planning/`, delete/redirect the root copy (ask owner before deleting someone else's file).

### Task 6.3 — Final quality gate (spec §90 format)
```text
pnpm lint / typecheck / test / build
cd apps/ai && pytest
pnpm --filter @repo/database db:migrate  (against clean local DB if supported)
```
Then manual E2E checklist: overdue invoice → automation event → mock n8n → real recipient email; pause → workflow deactivated (verify provider call recorded); duplicate webhook → no double status; viewer send → 403.

Produce the §90 final report with **only claims backed by fresh output**, and commit in reviewable chunks (suggested: `fix(api): rbac + webhook raw-body hardening` / `feat(api): automation field registry + replay protection` / `feat(web): automation run history + channel status` / `docs: correct current-update`).

---

## Effort & Sequencing Summary

| Phase | Contents | Est. | Depends on |
|---|---|---|---|
| 0 | Compile blockers + real baseline | XS | — |
| 1 | Webhook security (raw body + fail-closed) | S-M | 0 |
| 2 | RBAC live + route audit | S | 0 |
| 3 | Automation correctness (overdue UUID, replay, registry, secrets) | M | 0 |
| 4 | Feature completion (endpoints, quotas, E.164, updates, templates, UI) | L | 1-3 |
| 5 | Adversarial + golden tests + env hygiene | M | 1-4 |
| 6 | Documentation truth + final gate + commit plan | S | all |

## Open Decisions (need owner input before Phase 3/4)

1. **Sweeper dedup:** uuid-v5 deterministic eventId (no migration) **vs** new `dedupe_key` column (migration). Recommendation: v5, zero schema churn.
2. **`create_follow_up`:** honest activity-event version now **vs** real follow-ups table now. Recommendation: activity-event version; table deferred.
3. **Internal-action signing:** full body-HMAC in compiled n8n workflows (complexity in n8n expressions) **vs** bearer + mandatory timestamp + nonce only. Recommendation: latter, documented residual risk.
4. **Env naming:** adopt spec `WA_GATEWAY_*`/`AUTOMATION_SERVICE_TOKEN` canon with alias reads, or keep code's `WA_AKG_*`/`N8N_WEBHOOK_SECRET` and amend the spec. Recommendation: spec names, alias reads.
5. Whether to commit the current uncommitted remediation tree **as-is first** (broken compile — NOT recommended) or after Phase 0. Recommendation: Phase 0 immediately, commit once green.
