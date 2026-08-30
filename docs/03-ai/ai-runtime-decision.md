# AI Runtime Decision — Freelance OS

**Version:** 1.0  
**Date:** August 30, 2026  
**Status:** LOCKED — No further evaluation needed for v1  
**Audience:** Engineering, AI Team, Architecture

---

## Decision

**The Freelance OS AI service is implemented in Python, deployed as a FastAPI application on Google Cloud Run.**

This decision is locked for the initial AI implementation (Scope Analysis through General Assistant roadmap).

---

## Options Evaluated

### Option A: LangGraph JS / LangChain JS embedded in Cloudflare Workers (TypeScript)

**Pros:**
- Single language across the monorepo (TypeScript throughout).
- No inter-service network call; lower latency for simple requests.
- Same deployment pipeline (Cloudflare Workers via Wrangler).

**Cons:**
- Cloudflare Workers V8 isolate imposes a 128MB memory limit and CPU time constraints. LangGraph stateful graph execution with multi-step retrieval (SQL + Activity + Chroma) exceeds these limits under load.
- LangGraph JS is less mature than LangGraph Python. Fewer examples, less community support, higher implementation risk.
- LangChain JS has fewer integrations for Jina, Chroma Cloud, and Groq compared to the Python SDK.
- Workers have no persistent process memory; LangGraph checkpointing (for human-in-the-loop workflows) requires external storage that would need to be designed from scratch.
- Workers `fetch`-only network model complicates streaming LangGraph state updates.

**Verdict: Rejected.** Infrastructure constraints make this approach unsuitable for production AI workflows.

---

### Option B: Python / FastAPI on Google Cloud Run (Selected)

**Pros:**
- LangGraph Python is the reference implementation — fully documented, mature, production-proven.
- LangChain Python has first-class integrations for all selected providers: Groq, Jina, Chroma Cloud, LangSmith.
- No Cloudflare Worker memory or CPU constraints. Cloud Run can be configured with up to 8GB RAM and 8 vCPUs per instance.
- Cloud Run request-based autoscaling with scale-to-zero matches AI's spiky, non-continuous usage pattern.
- Google Cloud Run's `--no-allow-unauthenticated` provides a clean private service boundary without additional proxies.
- Pydantic v2 is native to FastAPI — structured output validation is first-class.
- LangSmith Python SDK is the primary SDK; richer observability than the JS SDK.

**Cons:**
- Adds a second language (Python) to the codebase.
- Requires an inter-service HTTP call (Cloudflare API → Cloud Run), adding ~50–150ms network latency.
- Requires a separate CI/CD pipeline for the Python service.
- Cold starts on Cloud Run (~1–3 seconds for a Python container). Acceptable for interactive AI workflows; can be mitigated with minimum instance configuration.

**Verdict: Selected.**

---

### Option C: Python on Railway

**Pros:**
- Simpler initial setup than Cloud Run.

**Cons:**
- Less established than Cloud Run for production workloads.
- Fewer native integrations with the rest of the stack (GitHub Actions, GCP monitoring).
- Cloud Run's Google IAM ecosystem aligns better with future GCP service adoption (Cloud Logging, Cloud Monitoring, Secret Manager).

**Verdict: Rejected in favor of Cloud Run.**

---

## Consequences

### Changes Required

1. `apps/ai/` is a Python FastAPI project (not TypeScript).
2. A separate `Dockerfile` and `pyproject.toml` exist for the AI service.
3. GitHub Actions CI/CD adds a Python test pipeline and Cloud Run deployment step.
4. A `apps/api/src/ai/client.ts` HTTP client exists in the TypeScript API to call the Cloud Run service.
5. Environment variables for AI providers are managed in Cloud Run (via Secret Manager or env vars) — not in Cloudflare.

### Invariants That Do Not Change

- All authentication, authorization, and workspace membership checks remain in the Cloudflare Workers TypeScript API.
- The AI service receives pre-authorized context (`workspaceId`, `actorId`, `actorRole`) from the Core API — it does not run its own auth stack.
- The existing domain services, Drizzle schema, and Neon PostgreSQL remain unchanged.
- TypeScript is used for all non-AI code: frontend, API, database package.

### Future Re-evaluation Triggers

This decision should be re-evaluated if:

- Groq releases a TypeScript SDK with LangGraph JS compatibility that resolves the Workers constraints.
- A concrete Cloudflare Workers AI use case emerges that warrants a lightweight TypeScript AI path (e.g., edge-side caching of AI results, real-time streaming to browser).
- The inter-service latency proves unacceptable after measurement.

---

## Environment Variables (AI Service — Cloud Run)

```
GROQ_API_KEY            Groq API key
JINA_API_KEY            Jina AI API key
JINA_EMBEDDING_MODEL    Jina embedding model identifier (config constant)
JINA_RERANKER_MODEL     Jina reranker model identifier (config constant)
CHROMA_API_KEY          Chroma Cloud API key
CHROMA_TENANT           Chroma Cloud tenant identifier
CHROMA_DATABASE         Chroma Cloud database identifier
LANGSMITH_API_KEY       LangSmith API key
LANGSMITH_PROJECT       LangSmith project name
AI_SERVICE_API_KEY      Internal API key for service-to-service auth
DATABASE_URL            Neon PostgreSQL connection string (for SQL retrieval tools)
LOG_LEVEL               Logging level (INFO in production)
ENVIRONMENT             "development" | "staging" | "production"
```

## Environment Variables (Core API — Cloudflare)

```
AI_SERVICE_URL          Cloud Run AI service base URL
AI_SERVICE_API_KEY      Must match AI service (stored as Cloudflare Secret)
```

---

*End of AI Runtime Decision Document*
