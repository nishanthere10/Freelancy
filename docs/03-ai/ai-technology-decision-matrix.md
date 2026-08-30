# AI Technology Decision Matrix — Freelance OS

**Version:** 1.0  
**Date:** August 30, 2026  
**Status:** LOCKED for v1  
**Audience:** Engineering, AI Team, Architecture

All decisions below are locked for the initial AI implementation. Re-evaluation triggers are documented per decision.

---

## Core Runtime

| Capability | Decision | Alternatives Evaluated | Rationale |
|-----------|---------|----------------------|-----------|
| **AI service language** | Python | TypeScript (LangGraph JS) | Richer ecosystem; Workers memory/CPU constraints make TypeScript unsuitable for multi-step workflows |
| **AI service framework** | FastAPI | Flask, Django, Express (JS) | Async-first, Pydantic-native, production-grade, minimal overhead |
| **AI service hosting** | Google Cloud Run | Railway, Render, Fly.io | Request-based scaling; scale-to-zero; native IAM; GCP ecosystem alignment |
| **Workflow orchestration** | LangGraph (Python) | CrewAI, custom state machine, Airflow | Stateful directed graph with human-in-the-loop support; most mature Python AI orchestrator |
| **AI primitives / integrations** | LangChain (Python) | LlamaIndex, raw SDK calls | Broadest integrations for all selected providers; avoids per-provider custom integration code |

---

## LLM

| Capability | Decision | Alternatives Evaluated | Rationale |
|-----------|---------|----------------------|-----------|
| **LLM provider** | Groq | OpenAI, Anthropic, Gemini, Mistral | Fast inference; good TypedDict structured output support; locked for v1 |
| **LLM model** | Configuration constant (TBD) | — | Evaluate llama-3.3-70b vs. llama-3.1-8b based on quality/cost tradeoff before Phase 11 |
| **Model routing** | Deferred | — | Single model in v1; fast vs. powerful routing evaluated when multiple use cases exist |
| **LLM gateway** | None (direct Groq) | Mesh API, LiteLLM | No multi-provider requirement in v1; add gateway when provider fallback or cost routing is needed |

---

## Embeddings and Reranking

| Capability | Decision | Alternatives Evaluated | Rationale |
|-----------|---------|----------------------|-----------|
| **Embedding provider** | Jina | OpenAI text-embedding-3, Cohere, Voyage | Single vendor for embeddings + reranking reduces integration overhead |
| **Embedding model** | Configuration constant (TBD) | — | Evaluate `jina-embeddings-v3` vs. alternatives: verify dimensions, context limit, cost, licensing before Phase 8 |
| **Reranking provider** | Jina | Cohere Rerank, cross-encoder (local) | Co-located with embedding provider; single API key |
| **Reranking model** | Configuration constant (TBD) | — | Evaluate `jina-reranker-v2-base-multilingual` before Phase 9 |
| **Reranking policy** | Conditional (only with semantic retrieval) | Always-on | Adds latency/cost; not warranted for SQL-only or activity-only queries |

---

## Vector Store

| Capability | Decision | Alternatives Evaluated | Rationale |
|-----------|---------|----------------------|-----------|
| **Vector database** | Chroma Cloud (managed) | Qdrant Cloud, Pinecone, Weaviate, pgvector | Open-source Chroma with managed hosting; lower ops burden; Python SDK is first-class |
| **Collection strategy** | Shared collection + `workspace_id` filter | Per-workspace collections | Operationally simpler; security enforced at abstraction layer; upgrade path documented |
| **Local dev vector DB** | Chroma (local, in-memory) | Same as production | No cloud credentials needed for development |

---

## Observability

| Capability | Decision | Alternatives Evaluated | Rationale |
|-----------|---------|----------------------|-----------|
| **AI tracing / evaluation** | LangSmith | Custom logging only, W&B Weave, Arize | Purpose-built for LangGraph/LangChain; evaluation dataset support; prompt versioning |
| **Application observability** | Existing Sprint 9 (structured JSON logger, x-request-id) | — | Unchanged; AI metrics integrate with existing observability via requestId correlation |

---

## Security

| Capability | Decision | Alternatives Evaluated | Rationale |
|-----------|---------|----------------------|-----------|
| **Service-to-service auth** | Signed API key (Cloudflare Secret → Cloud Run env) | Google OIDC, mTLS | Pragmatic for v1; Google OIDC from Workers requires service account key signing complexity; upgrade documented |
| **Cloud Run access control** | `--no-allow-unauthenticated` | Public endpoint | AI service is internal-only; no public Internet exposure |
| **AI output validation (AI service)** | Pydantic v2 | Manual validation | Native to FastAPI; strict schema enforcement |
| **AI output validation (API boundary)** | Zod | — | Mirrors Pydantic contract at TypeScript boundary |
| **Tenant isolation** | Mandatory `workspace_id` filter at retriever abstraction layer | LLM-enforced isolation | LLM must never be the enforcement point for tenant data boundaries |

---

## Data

| Capability | Decision | Alternatives Evaluated | Rationale |
|-----------|---------|----------------------|-----------|
| **Structured data source of truth** | Neon PostgreSQL | — | Unchanged; AI reads, never writes |
| **Historical context source** | `activity_events` table (existing Sprint 10) | Separate event log | Existing infrastructure; no new table needed |
| **Semantic knowledge store** | Chroma Cloud | — | See vector store decision above |
| **AI mutation ownership** | `ScopeAnalysisService` in `apps/api` (TypeScript) | AI service direct write | AI service must not write to PostgreSQL; humans confirm, Core API persists |
| **scope_analyses schema** | New Drizzle migration in `packages/database/` | JSON column in projects | Separate table for queryability and clean domain separation |
| **Streaming** | Deferred to v2 | SSE, chunked responses | Cloudflare Workers buffering issues (Sprint 12) make streaming non-trivial in v1 |

---

## Background Processing

| Capability | Decision | Alternatives Evaluated | Rationale |
|-----------|---------|----------------------|-----------|
| **Background jobs** | Deferred | BullMQ + Upstash Redis | No background ingestion pipeline in v1; Chroma ingestion is triggered synchronously after scope confirmation |
| **Message queue** | Deferred | Kafka, RabbitMQ, BullMQ | Not required for v1 interactive AI workflows |

---

## Deferred Technology Register

Technologies evaluated and deferred — with the specific trigger that would warrant re-evaluation:

| Technology | Re-evaluation Trigger |
|-----------|----------------------|
| LangGraph JS / LangChain JS | Workers memory constraints resolved, or edge-only AI use case identified |
| CrewAI | Multi-agent orchestration requirement with > 2 specialized agents |
| LlamaIndex | RAG pipeline complexity exceeds LangChain's built-in capabilities |
| Mesh API / LLM gateway | Multiple simultaneous LLM providers required, or cost routing optimization needed |
| BullMQ + Upstash Redis | Background document ingestion, periodic insight generation, or batch embedding jobs |
| Streaming AI responses | Workers streaming validated, user research confirms streaming improves UX |
| Google Cloud OIDC (service-to-service) | Multiple Cloud Run services require programmatic identity federation |
| pgvector | Chroma Cloud proves insufficient (cost, performance, or feature gaps) |
| Neo4j | Knowledge graph requirement for relationship-based AI reasoning |
| Kubernetes | Cloud Run autoscaling proves insufficient; dedicated GPU inference needed |
| Per-workspace Chroma collections | Regulatory isolation requirement or workspace count justifies operational complexity |

---

*End of AI Technology Decision Matrix*
