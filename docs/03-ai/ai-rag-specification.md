# AI RAG Specification — Freelance OS

**Version:** 1.1  
**Date:** August 30, 2026  
**Status:** Foundation — Pre-Implementation  
**Audience:** AI Engineering, Backend Engineering  
**Changelog:** v1.1 — Chroma Cloud (managed) selected; collection strategy finalized; Python SDK specified.

---

## 1. RAG Architecture Overview

Freelance OS uses **Hybrid Retrieval-Augmented Generation (RAG)** — a combination of three distinct retrieval modes that feed into a context builder before the LLM call. No single retrieval mode is universally correct for all query types.

```
User Question
      ↓
LangGraph Workflow
      ↓
Query / Workflow Router (determines retrieval strategy)
      ↓
  ┌───────────────────────────────────┐
  ↓           ↓                      ↓
SQL         Activity              Chroma
  │           │                      │
Structured  Temporal/           Unstructured
facts       history             documents
  │           │                      │
  └─────────── ┴──────────────────────┘
                     ↓
              Jina Reranker (when semantic retrieval used)
                     ↓
              Context Builder
                     ↓
              Groq LLM
                     ↓
              Structured Output
                     ↓
              Zod Validation
```

---

## 2. Retrieval Mode A — SQL Retrieval

### When to Use

SQL retrieval is the correct mode for **exact, deterministic, structured business facts**. Questions that require authoritative numerical or relational answers must use SQL.

Examples:

```
"What is the outstanding balance for Acme Corp?"
"How much revenue did I generate in July 2026?"
"How many projects are currently active?"
"What is the deadline for the Acme Website project?"
"Which invoices are overdue?"
"What is the total collected amount this quarter?"
```

These questions have a single correct answer in Neon PostgreSQL. They must not be answered with vector search or LLM inference.

### Flow

```
User Question
      ↓
Intent Detection (LangGraph node)
      ↓
SQL Query Construction
      ↓
Neon PostgreSQL (via Drizzle — workspace-scoped)
      ↓
Authoritative Result
      ↓
Context Builder
```

### Rules

- SQL retrieval is always workspace-scoped. The `workspaceId` from the auth context is injected into every query.
- SQL results are labeled as `FACT` in the context — highest priority, never overridden by vector search or LLM inference.
- The LLM does not write or modify SQL. It may use predefined tool functions that return query results.

### AI Tools for SQL Retrieval

The LangGraph workflow can invoke predefined, typed, read-only tools:

```typescript
getProject(workspaceId: string, projectId: string): Promise<Project>
getClient(workspaceId: string, clientId: string): Promise<Client>
getInvoice(workspaceId: string, invoiceId: string): Promise<Invoice>
getPaymentHistory(workspaceId: string, clientId: string): Promise<Payment[]>
getHistoricalProjects(workspaceId: string, filters: ProjectFilter): Promise<Project[]>
getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics>
```

All tools are:

- Typed with TypeScript.
- Workspace-scoped (workspaceId is always required).
- Authorized against RBAC before execution.
- Read-only — no mutation tools in initial implementation.

---

## 3. Retrieval Mode B — Activity Retrieval

### When to Use

Activity retrieval uses the existing `activity_events` table (built in Sprint 10) for **temporal and historical business event queries**.

Examples:

```
"What happened with the Acme Website project recently?"
"When was the invoice INV-2026-0023 sent?"
"Who changed the project status to completed?"
"What scope changes were recorded last month?"
"What was the sequence of events that led to this overdue invoice?"
```

### Flow

```
User Question
      ↓
Intent Detection
      ↓
Activity query (workspace_id + entity filters + time range)
      ↓
activity_events table (Neon PostgreSQL)
      ↓
Relevant historical events
      ↓
Context Builder
```

### Existing Activity Infrastructure

The Activity domain (`apps/api/src/domains/activity/`) already captures events for:

```
workspace.created, workspace.deleted, workspace.restored
client.created, client.updated, client.deleted, client.restored
project.created, project.updated, project.deleted, project.status_changed
invoice.created, invoice.sent, invoice.paid, invoice.cancelled, invoice.payment_recorded
```

Activity events include metadata (actor, entity, timestamp, payload). This rich temporal record is a significant RAG advantage — it provides real business history without requiring additional data capture.

### Activity Tool

```typescript
getActivity(workspaceId: string, filters: ActivityFilter): Promise<ActivityEvent[]>
```

Filters include: `entityType`, `entityId`, `actorUserId`, `eventType`, `fromDate`, `toDate`, `limit`.

---

## 4. Retrieval Mode C — Semantic / Vector Retrieval

### When to Use

Semantic retrieval uses Chroma for **unstructured or semantically rich content** that cannot be expressed as a precise SQL query.

Examples:

```
"What was the original scope of the Acme Website project?"
"Are there past projects similar to this one?"
"What did we agree to in the last proposal revision?"
"What did the retrospective say about Acme's communication style?"
"Are there any notes about this client's quality expectations?"
```

### Potential Document Types

| Document Type | Content |
|---------------|---------|
| Project scope documents | Original requirements, deliverables, milestones |
| Proposals | Pricing, timeline, terms |
| Meeting notes | Discussion records, decisions |
| Retrospectives | Lessons learned, patterns, feedback |
| Client notes | Preferences, communication style, risk notes |
| Contracts / briefs | Formal agreements, client briefs |

Note: These document types represent future content. The Scope Analysis feature will be the first to generate structured scope documents for the vector index.

### Flow

```
User Question
      ↓
Jina Embedding (query → vector)
      ↓
Chroma retrieval (top-K candidates, workspace-filtered)
      ↓
Jina Reranker (top-K → top-N ranked by relevance)
      ↓
Top-N relevant chunks
      ↓
Context Builder
```

---

## 5. Hybrid Retrieval — Canonical Example

> **"Should I accept Acme's new requirement to add a mobile app to the existing web project?"**

This question cannot be answered by any single retrieval mode. It requires:

```
User Question
      ↓
LangGraph / Query Router
      ↓
  ┌─────────────────────────────────────────────────┐
  ↓                    ↓                            ↓
SQL Retrieval      Activity Retrieval          Chroma Retrieval
  │                    │                            │
Project budget      Scope change history        Original scope doc
Project deadline    Prior client requests       Initial proposal
Client info         Activity timeline           Meeting notes
Invoice status      Decisions recorded          Similar past projects
  │                    │                            │
  └────────────────────┴────────────────────────────┘
                        ↓
                 Jina Reranker
                 (reranks all retrieved chunks)
                        ↓
                 Context Builder
                 (assembles final LLM context)
                        ↓
                    Groq LLM
                        ↓
            Structured Recommendation
            {
              "recommendation": "decline" | "accept" | "alternative",
              "reasoning": "...",
              "budgetImpact": { "amount": ..., "percentage": ... },
              "timelineImpact": { "days": ..., "risk": "high" },
              "evidence": [...]
            }
```

This is the canonical example for the hybrid RAG architecture.

---

## 6. Query / Workflow Router

The Query Router is a LangGraph node that classifies the incoming request and determines the retrieval strategy.

Routing decisions:

| Query Type | Strategy |
|-----------|---------|
| Exact financial fact | SQL only |
| Entity status query | SQL only |
| Historical event sequence | Activity retrieval |
| Open-ended scope comparison | SQL + Activity + Semantic |
| Document similarity | Semantic retrieval |
| Impact analysis | All three modes |
| Conversational clarification | Conversation history only |

The router does not rerank unless semantic retrieval is activated. This preserves latency for simple queries.

---

## 7. Jina Embeddings

### Embedding Pipeline

```
Document / Query text
      ↓
Text cleaning and preprocessing
      ↓
Jina Embedding Model (API call)
      ↓
Float vector [dimensions]
      ↓
Chroma (store with metadata) / Query (find similar vectors)
```

### Model Selection (Deferred Configuration)

The exact Jina embedding model must be selected based on measured evaluation against:

- Current model availability in Jina's API catalog.
- Embedding dimensions (affects Chroma collection setup).
- Maximum context length (important for long project documents).
- Latency per call (affects ingestion and query speed).
- Cost per token/document.
- Commercial licensing for business use.
- Quality on domain-specific text (project scopes, requirements, proposals).

The architecture specifies Jina as the provider. The model identifier is a named configuration constant (`JINA_EMBEDDING_MODEL`) that can be updated independently of the workflow code.

---

## 8. Jina Reranker

### Purpose

Vector similarity retrieves candidates. Reranking scores them for relevance to the actual query.

Chroma returns top-K results based on cosine distance. These are approximate — semantically similar, but not necessarily the most relevant to the specific question. The Jina Reranker uses a cross-attention model that evaluates the query and each candidate together, producing a more accurate relevance ranking.

### Flow

```
Query
  ↓
Chroma top-K (e.g., K=20 candidates)
  ↓
Jina Reranker (scores each candidate against query)
  ↓
Sorted by relevance score
  ↓
Top-N selected (e.g., N=5 final context chunks)
  ↓
Context Builder
```

### Reranking Policy

Reranking is NOT applied to every request. It is only used when:

1. Semantic retrieval is warranted (determined by Query Router).
2. The expected retrieval quality improvement justifies the latency/cost overhead.

Reranking introduces:

- Additional API latency (Jina reranker call).
- Additional API cost (Jina pricing).
- An additional external dependency.

**Configuration parameters:**

```
RERANK_CANDIDATE_COUNT = K   (retrieved from Chroma, evaluated experimentally)
RERANK_FINAL_COUNT = N       (selected after reranking, N < K, evaluated experimentally)
```

These values must be tuned against retrieval quality benchmarks. They are not arbitrary.

---

## 9. Chroma Cloud Vector Store

### Hosting Decision — FINAL

**Chroma Cloud** (managed service) is used for production. There is no self-hosted Chroma instance.

- Connection via the Chroma Python client with a Chroma Cloud API key (`CHROMA_API_KEY`) and tenant/database identifiers (`CHROMA_TENANT`, `CHROMA_DATABASE`).
- Chroma Cloud handles persistence, scaling, and infrastructure operations.
- Local development uses a local Chroma instance (`chromadb` package, in-memory or file-backed) to avoid requiring cloud credentials for development.

### What Chroma Stores

Each record in Chroma contains:

```
chunk_text      : The actual text content
embedding       : Float vector from Jina
metadata        : Filtering and provenance fields (see Section 10)
```

### What Chroma Does NOT Store

Chroma must not be the authoritative source for:

- Invoice totals or payment amounts.
- Workspace membership or user roles.
- Project status or deadlines.
- Client contact information.

These facts live in Neon PostgreSQL.

### Collection Strategy — FINAL DECISION

**Decision: Single shared collection with mandatory `workspace_id` metadata filter.**

Rationale:
- Operationally simpler — one collection to manage, backup, and monitor.
- Chroma Cloud billing is not per-collection; no cost penalty.
- Security enforcement is structural at the retriever abstraction layer, not at the LangGraph node level. The `ChromaVectorStore` class always injects the `workspace_id` filter; no LangGraph node ever calls Chroma directly without a workspace context.
- Collection proliferation (one per workspace) introduces management complexity that is not warranted at current scale.

**Upgrade path:** If regulatory requirements or scale demand stronger structural isolation, per-workspace collections can be adopted as a migration. The `VectorStore` interface abstraction means collection strategy changes without rewriting LangGraph workflows.

**Security invariant:** No query ever reaches Chroma without a `workspace_id` filter. This is enforced in `app/providers/vector_store.py`, not in individual graph nodes.

---

## 10. Vector Metadata Model

Every chunk stored in Chroma carries the following metadata:

| Field | Type | Purpose |
|-------|------|---------|
| `workspaceId` | string (UUID) | Tenant isolation — mandatory filter |
| `entityType` | string | Type of entity the document relates to (`project`, `client`, `invoice`, `general`) |
| `entityId` | string (UUID) | Specific entity the document belongs to |
| `documentId` | string (UUID) | Unique identifier for the source document |
| `documentVersion` | number | Version of the document (supports updates) |
| `chunkId` | string | Unique identifier for this specific chunk |
| `chunkIndex` | number | Position of chunk within the document (for context ordering) |
| `sourceType` | string | Type of source (`scope_document`, `proposal`, `meeting_note`, `retrospective`, `client_note`, `contract`) |
| `createdAt` | ISO 8601 string | When the chunk was indexed |
| `updatedAt` | ISO 8601 string | When the chunk was last updated |

Only include fields that are actually used for filtering, tracing, or deduplication. Do not add speculative metadata fields.

---

## 11. Context Builder

The Context Builder is a LangGraph node that transforms all retrieved results into a controlled, structured LLM context.

### Inputs

```
user_question        : The original question
sql_results          : Facts from PostgreSQL
activity_results     : Events from activity_events
ranked_chunks        : Reranked semantic evidence
workflow_state       : Current graph state
business_constraints : Workspace context, actor role
```

### Responsibilities

| Responsibility | Why |
|---------------|-----|
| Deduplicate information | SQL and semantic retrieval may return overlapping facts |
| Enforce token/context limit | LLM has a maximum context window; exceeding it truncates or errors |
| Preserve source references | Every fact must be traceable to its source |
| Distinguish facts from inferences | SQL facts and LLM inferences must not be conflated |
| Prioritize authoritative sources | PostgreSQL > Activity > Semantic > LLM inference |
| Minimize PII in context | Only include client/financial details necessary for the question |

### Source Priority Ordering

When the same information is available from multiple sources, the Context Builder applies this priority:

```
PostgreSQL (SQL fact)
  >
Activity event
  >
Semantic document chunk
  >
LLM inference
```

**Example:** If PostgreSQL says `outstanding = ₹32,000`, the context builder surfaces this as a FACT and does not allow a document chunk stating a different amount to override it.

---

## 12. Document Ingestion Pipeline

```
Document (scope, proposal, notes, retrospective)
      ↓
Parser (format-aware: plain text, markdown, PDF*)
      ↓
Text extraction
      ↓
Cleaning (normalize whitespace, remove irrelevant formatting)
      ↓
Chunking (see Section 13)
      ↓
Metadata enrichment (workspaceId, entityType, entityId, sourceType, version)
      ↓
Jina Embedding (chunk → vector)
      ↓
Chroma upsert (with metadata)
```

*PDF parsing is a future capability. Initial focus is structured text and markdown content.

### Document Update Flow

When a document is updated:

```
Document updated
      ↓
New version assigned (documentVersion + 1)
      ↓
Old chunks for this documentId removed from Chroma
      ↓
New chunks generated and embedded
      ↓
New chunks upserted to Chroma
```

Stale vectors from old document versions must not remain in the index. Chunk identity (`chunkId`) is deterministic based on `documentId + documentVersion + chunkIndex` to support idempotent upserts.

---

## 13. Chunking Strategy

Chunking is a **configurable subsystem**, not a fixed implementation choice.

### Parameters to Configure

| Parameter | Consideration |
|-----------|--------------|
| `chunkSize` | Larger chunks preserve context; smaller chunks improve precision. Must be evaluated against retrieval quality. |
| `chunkOverlap` | Overlap prevents loss of context at chunk boundaries. Overlap should be meaningful, not arbitrary. |
| Semantic boundaries | Prefer splitting at paragraph, section, or sentence boundaries rather than at arbitrary token counts. |
| Document structure | Scope documents, meeting notes, and retrospectives have different natural boundaries. |
| Metadata preservation | Each chunk must carry sufficient context to be understood without the surrounding chunks. |

### What NOT to Do

Do not set an arbitrary `chunkSize = 500` without measuring retrieval quality on real Freelance OS content. The optimal chunk size depends on:

- The vocabulary and verbosity of scope documents.
- The average document length.
- The typical question specificity.
- The embedding model's context length.

The chunking implementation must be configurable (via constants, not hardcoded) so that values can be adjusted based on evaluation.

---

## 14. Document Versioning and Traceability

Every indexed document must be traceable to:

```
source document (documentId)
  ↓
version (documentVersion)
  ↓
entity (entityType + entityId)
  ↓
workspace (workspaceId)
  ↓
source type (sourceType)
```

A retrieved chunk must be presentable to the user as evidence. The citation must reference the actual document and version, not just a vague "project document."

---

## 15. Evidence and Citations

The architecture supports evidence references in AI responses.

Each AI response can include an `evidence` array:

```json
{
  "result": { ... },
  "evidence": [
    {
      "type": "sql_fact",
      "source": "invoices table",
      "content": "Invoice INV-2026-0042: outstanding ₹32,000"
    },
    {
      "type": "activity_event",
      "source": "activity_events",
      "content": "Scope change requested by client on 2026-08-15"
    },
    {
      "type": "document_chunk",
      "source": "Acme Website — Scope Document v2",
      "documentId": "doc_abc123",
      "chunkId": "chunk_xyz456",
      "content": "Original scope: 5-page marketing website with CMS..."
    }
  ]
}
```

**Rules:**
- Only cite evidence actually used in the LLM context.
- Do not fabricate citations.
- Citations must be traceable to the source document or database record.

---

## 16. Retrieval Quality Metrics

The following metrics guide retrieval evaluation. Not all metrics can be measured without a labeled dataset.

| Metric | Definition | When Measurable |
|--------|-----------|----------------|
| Recall | % of relevant documents retrieved | With golden dataset |
| Precision | % of retrieved documents that are relevant | With golden dataset |
| Hit Rate | % of questions where the correct document appears in top-K | With golden dataset |
| MRR (Mean Reciprocal Rank) | Average position of first correct result | With golden dataset |
| NDCG | Normalized quality of ranking | With golden dataset |
| Context accuracy | SQL facts match PostgreSQL ground truth | Always verifiable |

Start with Hit Rate and Context Accuracy for the initial evaluation phase (simpler to measure). Invest in labeled datasets to enable MRR and NDCG later.

---

## 17. Caching Considerations

Caching is appropriate in specific scenarios but must not be introduced prematurely.

| Cache Target | Justification | Risk |
|-------------|--------------|------|
| Embedding cache (document) | Documents change infrequently; re-embedding is expensive | Stale embedding if document updates are not invalidated |
| Embedding cache (query) | Repeated identical queries | Queries are often unique; benefit may be low |
| LLM response cache | Very high cost savings if identical structured queries repeat | Never cache across workspaces; cache invalidation complexity |
| Retrieval result cache | Reduces Chroma + reranker latency on repeated questions | Question phrasing variations reduce hit rate |

**Rules:**
- Never cache data across workspace boundaries.
- Introduce caching only when repeated request patterns, latency, or cost justify it.
- Cache invalidation must be designed before the cache is introduced.

---

## 18. Latency and Cost Considerations

### Latency Budget (Conceptual)

| Workflow Type | Expected Latency | Acceptable? |
|--------------|-----------------|------------|
| SQL-only query | <500ms (existing DB latency) | Yes |
| Activity retrieval | <500ms | Yes |
| Simple LLM query (no retrieval) | 1–3 seconds | Yes |
| Hybrid retrieval + LLM | 5–10 seconds | Yes (analysis task) |
| Scope analysis (full graph) | 10–20 seconds | Acceptable for deep analysis |

These are estimates. Actual values must be measured in the Cloudflare Workers environment.

### Cost Dimensions to Track

```
LLM tokens (input + output) — per Groq request
Embedding tokens — per Jina embedding call
Reranker calls — per Jina reranker invocation
Chroma queries — volume and size
```

Cost tracking should be integrated into LangSmith traces and surfaced in the observability layer, not managed as a separate billing system.

---

*End of AI RAG Specification*
