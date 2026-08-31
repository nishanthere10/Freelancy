import logging
from typing import Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from app.core.config import get_settings
from app.core.errors import AppError
from app.schemas.scope import Deliverable, ScopeAnalysisResult
from app.services.rag_memory import rag_memory_pipeline

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Principal Technical Project Manager and Senior Systems Architect at a top-tier software consultancy.
Your task is to analyze a freelance client's project brief or specification and generate a comprehensive, realistic scope analysis.

Guidelines:
1. Deconstruct the project into discrete, verifiable deliverables with accurate hour estimates.
2. Provide an executive summary highlighting the architectural strategy and delivery vision.
3. Identify potential risks, external dependencies, and technical bottlenecks.
4. Recommend a modern, production-grade technology stack.
5. Provide a realistic overall timeline in weeks and a confidence score between 1 and 100 based on clarity and specificity of requirements.
6. When historical workspace projects are provided in the context, calibrate your estimates, deliverables, and tech stack recommendations to remain consistent with previous successful deliveries.
"""

SCOPE_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        (
            "human",
            "{historical_context}\n\nClient Project Brief:\n{brief}\n\nPlease generate the comprehensive structured scope analysis.",
        ),
    ]
)


def _get_mock_scope_analysis(brief: str, context_present: bool = False) -> ScopeAnalysisResult:
    """Deterministic fallback mock scope analysis for development and testing environments."""
    first_line = brief.strip().split("\n")[0][:80]
    return ScopeAnalysisResult(
        summary=f"Architecture & Delivery Plan for: {first_line}",
        deliverables=[
            Deliverable(
                title="Discovery, System Architecture & Data Modeling",
                description="Technical specifications, PostgreSQL database schema, and API contract design.",
                estimated_hours=16,
                complexity="medium",
                skills_required=["System Architecture", "PostgreSQL", "API Design"],
            ),
            Deliverable(
                title="Backend API & Business Logic Implementation",
                description="RESTful domain endpoints, authentication verification, and service integration.",
                estimated_hours=36,
                complexity="high",
                skills_required=["Node.js", "Express", "Python", "FastAPI"],
            ),
            Deliverable(
                title="Frontend Application & Component Engineering",
                description="Responsive UI implementation, form validation, state management, and real-time feedback.",
                estimated_hours=32,
                complexity="medium",
                skills_required=["Next.js", "React", "Tailwind CSS", "TypeScript"],
            ),
            Deliverable(
                title="Testing, QA & Production Deployment Verification",
                description="Automated unit/integration tests, edge runtime hardening, and CI/CD deployment pipeline.",
                estimated_hours=12,
                complexity="low",
                skills_required=["Vitest", "Pytest", "Cloudflare Workers", "CI/CD"],
            ),
        ],
        timeline_weeks=3,
        risks_and_dependencies=[
            "Third-party API rate limits and external service reliability",
            "Clear alignment on client feedback cycles and milestone approvals",
        ],
        recommended_tech_stack=[
            "Next.js 16 App Router",
            "FastAPI Python 3.13",
            "Cloudflare Workers",
            "Neon Serverless PostgreSQL",
            "Tailwind CSS",
        ],
        confidence_score=95 if context_present else 92,
    )


class LlmScopeEngine:
    async def generate_scope_from_brief(
        self,
        brief: str,
        workspace_id: Optional[str] = None,
    ) -> ScopeAnalysisResult:
        """
        Executes deep RAG benchmark retrieval + Groq LLM inference with structured output schema enforcement.
        Falls back to deterministic mock generator if running in test environment or with mock credentials.
        """
        if not brief or len(brief.strip()) < 10:
            raise AppError("Project brief must be at least 10 characters long", 422)

        settings = get_settings()

        # 1. Deep RAG Retrieval via RagMemoryPipeline
        rag_context = await rag_memory_pipeline.retrieve_benchmarks(
            workspace_id=workspace_id,
            query=brief,
            top_k=10,
            top_n=3,
        )

        # 2. Mock mode check for CI/tests and local offline dev
        is_mock_key = not settings.GROQ_API_KEY or settings.GROQ_API_KEY.startswith("gsk_dev_mock")
        if settings.ENVIRONMENT == "test" or is_mock_key:
            logger.info("Using deterministic mock LLM scope generator (mock key or test env detected)")
            return _get_mock_scope_analysis(brief, context_present=rag_context.has_benchmarks)

        # 3. Live LLM Generation with Groq
        try:
            llm = ChatGroq(
                groq_api_key=settings.GROQ_API_KEY,
                model_name=settings.GROQ_MODEL,
                temperature=0.2,
                request_timeout=25.0,
            )

            structured_llm = llm.with_structured_output(ScopeAnalysisResult)
            chain = SCOPE_PROMPT_TEMPLATE | structured_llm

            result = await chain.ainvoke(
                {
                    "brief": brief,
                    "historical_context": rag_context.formatted_prompt_block,
                }
            )
            if not isinstance(result, ScopeAnalysisResult):
                result = ScopeAnalysisResult.model_validate(result)

            return result
        except TimeoutError as exc:
            logger.error("Groq inference timed out: %s", exc)
            raise AppError("LLM inference timed out (exceeded 25s threshold)", 504) from exc
        except Exception as exc:
            err_str = str(exc).lower()
            logger.error("Failed to generate scope with Groq LLM: %s", exc, exc_info=True)
            if "rate limit" in err_str or "429" in err_str:
                raise AppError("Groq LLM rate limit reached. Please retry in a moment.", 429) from exc
            if "invalid_api_key" in err_str or "401" in err_str:
                raise AppError("Invalid Groq API Key configured in AI service.", 500) from exc

            raise AppError(f"LLM scope analysis failed: {exc}", 502) from exc


llm_scope_engine = LlmScopeEngine()
