# AI Architecture — Freelance OS

**Version:** 1.1  
**Date:** August 30, 2026  
**Status:** Foundation — Pre-Implementation  
**Audience:** Engineering, AI Team, Security  
**Changelog:** v1.1 — Runtime locked to Python/FastAPI/Cloud Run; Chroma Cloud; service-to-service auth pattern defined; streaming deferred; `scope_analyses` table ownership assigned.

---

## 1. Architecture Overview

Freelance OS AI is a **reasoning and retrieval layer** built on top of the existing production platform. It does not replace the domain services, database authority, or security infrastructure. It provides intelligent interpretation of authorized business data.

The AI runtime is a **separate, independently deployed Python service** hosted on Google Cloud Run. It is not embedded in the Cloudflare Workers API.

```
Browser (Next.js — apps/web)
              ↓
Cloudflare Workers API (apps/api — TypeScript/Express)
  [Clerk JWT verification]
  [Internal user resolution]
  [Workspace membership check]
  [RBAC policy check]
  [Build authorized AI request]
              ↓  (HTTPS + signed API key)
Google Cloud Run — AI Service (apps/ai — Python/FastAPI)
              ↓
LangGraph (Python) — Workflow Orchestration
              ↓
Query / Workflow Router
              ↓
Retrieval Layer
  ├── SQL Retrieval (Neon PostgreSQL — via HTTP connection)
  ├── Activity Retrieval (activity_events table)
  └── Semantic Retrieval (Chroma Cloud + Jina Embeddings)
              ↓
Jina Reranker (conditional — only when semantic retrieval used)
              ↓
Context Builder
              ↓
Groq LLM
              ↓
Structured Output
              ↓
Pydantic Validation (AI service)
              ↓
HTTP Response to Cloudflare API
              ↓
TypeScript Zod Validation (API boundary)
              ↓
Frontend UI
              ↓
LangSmith (tracing all AI service steps)
```

---

## 2. Runtime Decision — LOCKED

### 2.1 AI Service Runtime

| Attribute | Decision |
|-----------|---------|
| Language | Python |
| Framework | FastAPI |
| Orchestration | LangGraph (Python) |
| AI Primitives | LangChain (Python) |
| Hosting | Google Cloud Run |
| LLM | Groq |
| Embeddings | Jina |
| Reranking | Jina |
| Vector DB | Chroma Cloud |
| AI Observability | LangSmith |
| Validation (AI service) | Pydantic v2 |
| Validation (API boundary) | Zod (TypeScript) |

### 2.2 Why Python (Not LangGraph JS)

The original architecture spec (v1.0) considered TypeScript-native LangGraph JS. The v1.1 decision locks Python for the following reasons:

- LangGraph Python is more mature, better documented, and has broader community support than LangGraph JS.
- LangChain Python has significantly richer integrations for Jina, Chroma Cloud, and Groq.
- The Python AI ecosystem (LangSmith Python SDK, Pydantic, structured output tooling) provides a more reliable foundation for production AI systems.
- Cloud Run supports Python natively with no V8 isolate constraints.
- The 128MB Cloudflare Workers memory limit and CPU time limits are incompatible with LangGraph's workflow state management and multi-step retrieval pipelines.

**Deferred (not abandoned):** LangGraph JS / LangChain JS may be used for lightweight AI inference in future Cloudflare Worker edge features where full Python service overhead is unwarranted. This is not part of the initial architecture.

### 2.3 Why Google Cloud Run (Not Railway)

| Attribute | Cloud Run |
|-----------|----------|
| Scaling | Request-based autoscaling; scale to zero |
| Cold start | ~1–3 seconds for Python container (acceptable for AI workflows) |
| Auth | Native IAM; `--no-allow-unauthenticated` enforced |
| Networking | Private VPC possible for future hardening |
| Cost model | Per-request billing; no idle cost |
| CI/CD | GitHub Actions `google-github-actions/deploy-cloudrun` |

---

## 3. Component Responsibilities

### 3.1 LangGraph (Python) — Workflow Orchestration

LangGraph is the **primary orchestrator** of all AI workflows. It is responsible for:

- Defining stateful, directed graphs of AI processing steps (nodes + edges).
- Managing workflow state (`TypedDict` state schema per workflow).
- Controlling branching (conditional edges based on state).
- Implementing conditional execution (e.g., "if context is insufficient, request more input").
- Supporting human approval steps in multi-step workflows.
- Handling iteration and retry on invalid structured output.
- Persisting workflow state (LangGraph checkpointing) for human-gated workflows where necessary.

LangGraph does NOT own business logic. It orchestrates calls to retrieval, context assembly, and LLM inference.

**Example — Scope Analysis graph:**

```
START
  ↓
validate_request        (check input format, required fields)
  ↓
authorize_context       (verify workspaceId, actorId are present and trusted)
  ↓
load_project_context    (SQL tool: getProjectContext)
  ↓
load_client_context     (SQL tool: getClientContext, if project has a client)
  ↓
retrieve_activity       (activity tool: recent project/client events)
  ↓
retrieve_semantic       (Chroma: similar past scopes if available)
  ↓
rerank                  (Jina reranker, if semantic results exist)
  ↓
assemble_context        (Context Builder)
  ↓
groq_analysis           (LLM call with assembled context)
  ↓
validate_output         (Pydantic: ScopeAnalysisResult schema)
  ↓
grounding_check         (verify financial facts match SQL ground truth)
  ↓
return_draft            (return to Core API → Frontend → Human Review)
  ↓
END
```

### 3.2 LangChain (Python) — Component / Integration Layer

LangChain provides reusable AI building blocks that LangGraph nodes use internally. It is NOT the orchestration layer.

| LangChain Component | Role |
|--------------------|------|
| ChatGroq | Groq LLM wrapper |
| Prompt templates | Versioned, parameterized prompt strings |
| Chroma retriever | Workspace-scoped Chroma Cloud queries |
| Jina embeddings | Text → vector via Jina API |
| Structured output parsers | LLM output → Pydantic models |
| Tool definitions | Typed tools the LangGraph nodes invoke |

LangChain is a toolkit. LangGraph is the conductor.

### 3.3 Groq — LLM Inference

Groq provides fast LLM inference for scope analysis, drift detection, risk explanation, and general assistant queries. Wrapped behind `LLMProvider` interface.

**Model routing (future):** Groq offers multiple models. Simple queries can route to cheaper/faster models; complex reasoning to stronger models. Exact model assignments are configuration — determined by measured performance, not predetermined.

### 3.4 Jina Embeddings — Semantic Representation

Text → float vector via Jina API. Used for document ingestion and query embedding.

**Model selection:** Exact Jina embedding model is a named configuration constant (`JINA_EMBEDDING_MODEL`) validated against current availability, dimensions, context limit, cost, and licensing before implementation. Not hardcoded.

### 3.5 Jina Reranker — Retrieval Refinement

After Chroma returns top-K candidates, the Jina Reranker re-scores them against the specific query. Applied **conditionally** — only when semantic retrieval is used and quality improvement justifies latency/cost.

Configuration: `RERANK_CANDIDATE_COUNT (K)` and `RERANK_FINAL_COUNT (N)` are named constants, tuned experimentally.

### 3.6 Chroma Cloud — Vector Store

**Chroma Cloud** is the production vector store. It stores document chunks with embeddings and metadata for semantic retrieval.

- **Not** self-hosted. Uses Chroma's managed cloud offering.
- Connection via Chroma Python client with cloud API key.
- Collection strategy: shared collection + mandatory `workspace_id` metadata filter enforced at the retriever abstraction layer.
- Chroma Cloud is a retrieval index — NOT authoritative for financial facts, RBAC, or project state.

### 3.7 LangSmith — AI Observability and Evaluation

LangSmith traces all LangGraph executions, node inputs/outputs, retriever calls, LLM calls, token usage, and latency. Complements the existing Sprint 9 application observability.

| Sprint 9 Observability | LangSmith |
|-----------------------|-----------|
| HTTP request tracing (x-request-id) | LangGraph run ID |
| API latency (p95, p99) | LLM call latency, node latency |
| Structured JSON logging | Prompt versions, model inputs/outputs |
| Rate limit metrics | Token usage per call |

---

## 4. Service-to-Service Authentication — DECIDED

### 4.1 Pattern: Signed Internal API Key

The Cloudflare Workers API communicates with the Cloud Run AI service using a **long-lived internal API key**:

- Stored in Cloudflare Secrets (wrangler secret `AI_SERVICE_API_KEY`).
- Stored in Cloud Run environment variable (via Secret Manager or Cloud Run env).
- Passed in every request as `Authorization: Bearer <key>`.
- FastAPI middleware validates the key before any workflow executes.
- Cloud Run is deployed with `--no-allow-unauthenticated` — no public access.

### 4.2 Why Not Google OIDC (From Workers)

Full Cloud Run OIDC identity tokens require the Cloudflare Worker to sign a JWT with a Google service account private key (via `https://oauth2.googleapis.com/token`). This is feasible but:

- Adds latency per request (token fetch + caching logic in Workers KV).
- Adds operational complexity (service account key rotation).
- Not meaningfully more secure than a rotated, secret-stored API key for an internal service boundary.

**Upgrade path:** If the AI service expands to multiple Cloud Run services (future), evaluate Google IAM service-account-to-service-account OIDC at that point. Document this as a known upgrade path.

### 4.3 Authorized AI Request Payload

The Cloudflare API constructs and sends this payload to the AI service (not trusted from the browser):

```json
{
  "workspaceId": "<verified by RBAC>",
  "actorId": "<internal userId, from JWT resolution>",
  "actorRole": "<workspace role>",
  "requestId": "<x-request-id from incoming request>",
  "input": { ... }
}
```

The AI service trusts `workspaceId`, `actorId`, and `actorRole` from this payload — they are the result of the Core API's auth pipeline, not user-supplied.

---

## 5. AI Service Directory Structure

```
apps/ai/                          ← Python FastAPI AI service
├── app/
│   ├── main.py                   ← FastAPI app initialization
│   ├── api/
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   └── scope.py          ← /scope/analyze endpoint
│   │   └── dependencies.py       ← Auth middleware, request context
│   ├── core/
│   │   ├── config.py             ← Pydantic Settings (env validation)
│   │   └── logging.py            ← Structured JSON logging
│   ├── security/
│   │   └── service_auth.py       ← API key verification middleware
│   ├── workflows/
│   │   ├── scope_analysis/
│   │   │   ├── graph.py          ← LangGraph graph definition
│   │   │   ├── state.py          ← TypedDict workflow state
│   │   │   └── nodes.py          ← Individual graph node functions
│   │   └── base.py               ← Shared graph utilities
│   ├── retrieval/
│   │   ├── sql.py                ← Authorized SQL retrieval tools
│   │   ├── activity.py           ← Activity retrieval tools
│   │   └── vector.py             ← Chroma Cloud retrieval + reranking
│   ├── providers/
│   │   ├── llm.py                ← LLMProvider interface + GroqProvider
│   │   ├── embeddings.py         ← EmbeddingProvider + JinaProvider
│   │   ├── reranker.py           ← RerankerProvider + JinaRerankerProvider
│   │   └── vector_store.py       ← VectorStore interface + ChromaProvider
│   ├── prompts/
│   │   └── scope_analysis/
│   │       ├── v1/
│   │       │   ├── system.txt
│   │       │   └── user.txt
│   │       └── registry.py
│   ├── schemas/
│   │   └── scope_analysis.py     ← Pydantic ScopeAnalysisResult schema
│   ├── context/
│   │   └── builder.py            ← Context Builder
│   └── observability/
│       └── langsmith.py          ← LangSmith tracing config
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   └── evaluation/
├── prompts/                      ← Versioned prompt template files
│   └── scope_analysis/
│       └── v1/
│           ├── system.txt
│           └── user.txt
├── Dockerfile
├── pyproject.toml                ← Dependencies (uv / poetry)
├── .env.example
└── README.md
```

TypeScript API additions:

```
apps/api/src/
├── ai/
│   ├── client.ts                 ← HTTP client for Cloud Run AI service
│   └── schemas/
│       └── scope-analysis.ts     ← Zod mirror of ScopeAnalysisResult
└── domains/
    └── ... (unchanged)
```

---

## 6. Database: scope_analyses Table

Confirmed scope analysis results must be persisted. A new table in `packages/database/` (Drizzle migration) is required:

```
scope_analyses
  id              UUID PK
  workspace_id    UUID FK → workspaces.id
  project_id      UUID FK → projects.id (nullable — pre-project analysis allowed)
  actor_user_id   UUID FK → users.id
  input_text      TEXT              (raw requirements the user entered)
  result          JSONB             (ScopeAnalysisResult — confirmed output)
  confirmed_at    TIMESTAMP
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
```

**Ownership:** `packages/database/` via Drizzle migration. The `ProjectService` (or a new `ScopeAnalysisService`) in `apps/api` owns the mutation. The AI service never writes to PostgreSQL.

---

## 7. Streaming — DEFERRED

Streaming AI responses to the browser is explicitly **deferred to v2**.

**Reason:** The Cloudflare Workers API already has documented issues with HTTP body handling (`null-body`, buffer compliance — Sprint 12). Adding streaming through a Workers → Cloud Run → FastAPI chain introduces additional complexity. v1 is request-response only.

When streaming is implemented, it will use Server-Sent Events (SSE) or chunked Transfer-Encoding. The evaluation of Workers streaming compatibility will be documented before implementation.

---

## 8. Phase 8 Ingestion — First Content Source

The first content ingested into Chroma Cloud is the **confirmed scope analysis document** generated and confirmed by the user in Phase 14. This means:

- Phase 8 builds the ingestion pipeline infrastructure and tests it with synthetic documents.
- Phase 14 triggers the first real ingestion when a user confirms a scope analysis.
- Subsequent scope analyses benefit from prior scope documents in Chroma.

This avoids the "Phase 8 ingests what exactly?" gap: no separate document capture UI is required for Phase 1. The scope analysis flow itself generates the first vector knowledge.

---

## 9. Deferred Infrastructure

| Technology | Status | Re-evaluation Trigger |
|-----------|--------|----------------------|
| BullMQ + Upstash Redis | Deferred | When background document ingestion, periodic insight generation, or embedding batch jobs are needed |
| Streaming AI responses | Deferred | v2, after Workers streaming is validated |
| Google Cloud OIDC (service-to-service) | Deferred | When multiple Cloud Run services exist |
| LlamaIndex | Deferred | If RAG pipeline complexity exceeds LangChain capabilities |
| CrewAI | Deferred | If multi-agent orchestration requirement emerges |
| Multi-model routing (OpenAI, Anthropic) | Deferred | If Groq proves insufficient or cost routing becomes necessary |

---

## 10. What Must Remain Outside the AI Layer

```
User authentication      → Clerk + existing middleware
Workspace membership     → workspace_members table + WorkspaceService
RBAC enforcement         → existing policy layer (canCreate*, canView*, etc.)
Database authority       → Neon PostgreSQL (Drizzle)
Invoice calculations     → invoice domain service
Payment state            → invoice domain service
Core domain mutations    → domain services
Tenant isolation         → workspace-scoped repositories
scope_analyses writes    → ScopeAnalysisService in apps/api (not AI service)
```

---

## 11. Technology Decision Matrix (Final)

| Capability | Decision | Rationale |
|-----------|---------|-----------|
| AI service language | Python | Richer ecosystem; no Workers memory/CPU constraints |
| AI service framework | FastAPI | Production-grade async Python API; Pydantic native |
| AI service hosting | Google Cloud Run | Request-based scaling; native IAM; scale-to-zero |
| Workflow orchestration | LangGraph (Python) | Mature, stateful graph execution, human-in-the-loop |
| AI primitives | LangChain (Python) | Richer integrations vs. JS counterpart |
| LLM | Groq | Fast inference; locked for v1 |
| Embeddings | Jina | Single provider for embeddings + reranking |
| Reranking | Jina | Co-located with embedding provider |
| Vector DB | Chroma Cloud | Managed; no self-hosting ops burden |
| AI observability | LangSmith | Purpose-built for LangGraph/LangChain tracing |
| Output validation (AI) | Pydantic v2 | Native to Python FastAPI ecosystem |
| Output validation (API) | Zod | Mirrors Pydantic contract at TypeScript boundary |
| Service-to-service auth | Signed API key | Pragmatic for v1; OIDC upgrade path documented |
| Streaming | Deferred | Workers compatibility not validated |
| Background jobs | Deferred | BullMQ/Upstash for future ingestion pipeline |
| LLM gateway | Deferred | Single provider in v1 |
| Multi-agent | Deferred | No requirement in v1 |

---

*End of AI Architecture Document*
