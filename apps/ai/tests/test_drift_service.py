import pytest
from pydantic import ValidationError

from app.core.errors import AppError
from app.schemas.drift import AffectedDeliverable, DriftAnalysisResult
from app.services.drift_service import (
    DriftDetectionEngine,
    _format_scope_for_prompt,
    drift_detection_engine,
)


def test_affected_deliverable_schema_validation():
    deliverable = AffectedDeliverable(
        title="Payment Gateway Integration",
        impact_description="Stripe webhook handler must support recurring subscriptions",
        additional_hours=6,
    )
    dumped = deliverable.model_dump()
    assert dumped["title"] == "Payment Gateway Integration"
    assert dumped["impact_description"] == "Stripe webhook handler must support recurring subscriptions"
    assert dumped["additional_hours"] == 6


def test_drift_analysis_result_schema_validation():
    result = DriftAnalysisResult(
        summary="Client wants cryptocurrency payments added mid-sprint.",
        recommendation="negotiate",
        recommendation_rationale="Requires new custody integration and wallet verification.",
        affected_deliverables=[
            AffectedDeliverable(
                title="Checkout API",
                impact_description="Needs Web3 wallet adapter",
                additional_hours=12,
            )
        ],
        timeline_delta_days=7,
        budget_delta_percentage=20.0,
        new_deliverables_required=["Crypto custody smart contract review"],
        confidence_score=90,
    )
    dumped = result.model_dump()
    assert dumped["recommendation"] == "negotiate"
    assert dumped["timeline_delta_days"] == 7
    assert dumped["budget_delta_percentage"] == 20.0
    assert len(dumped["affected_deliverables"]) == 1
    assert len(dumped["new_deliverables_required"]) == 1
    assert dumped["confidence_score"] == 90


def test_drift_recommendation_literal_validation():
    with pytest.raises(ValidationError):
        DriftAnalysisResult(
            summary="Invalid recommendation test",
            recommendation="maybe",  # type: ignore - only accept, decline, negotiate allowed
            recommendation_rationale="Testing literal constraint",
            affected_deliverables=[],
            timeline_delta_days=0,
            budget_delta_percentage=0.0,
            new_deliverables_required=[],
            confidence_score=50,
        )


@pytest.mark.asyncio
async def test_drift_detection_engine_mock_analysis():
    change_request = "Can we also add a multi-currency payment switcher and automated invoice generation?"
    mock_scope_json = {
        "summary": "Basic invoicing application",
        "timeline_weeks": 4,
        "deliverables": [
            {
                "title": "Stripe Integration",
                "description": "Standard USD checkout flow",
                "estimated_hours": 16,
                "complexity": "medium",
            }
        ],
        "risks_and_dependencies": ["Stripe API limits"],
        "recommended_tech_stack": ["Node.js", "Express"],
        "confidence_score": 85,
    }

    result = await drift_detection_engine.analyze_drift(
        change_request=change_request,
        original_scope_json=mock_scope_json,
    )

    assert isinstance(result, DriftAnalysisResult)
    assert result.recommendation in ["accept", "decline", "negotiate"]
    assert result.timeline_delta_days >= 0
    assert result.budget_delta_percentage >= 0.0
    assert 1 <= result.confidence_score <= 100
    assert len(result.summary) > 0
    assert len(result.recommendation_rationale) > 0


@pytest.mark.asyncio
async def test_drift_detection_engine_with_workspace_id():
    engine = DriftDetectionEngine()
    change_request = "Please add dark mode toggle to the client portal interface"
    mock_scope_json = {
        "summary": "Client portal frontend",
        "timeline_weeks": 2,
        "deliverables": [
            {
                "title": "Portal UI",
                "description": "Tailwind dashboard",
                "estimated_hours": 20,
                "complexity": "low",
            }
        ],
    }

    result = await engine.analyze_drift(
        change_request=change_request,
        original_scope_json=mock_scope_json,
        workspace_id="test-workspace-uuid",
    )

    assert isinstance(result, DriftAnalysisResult)
    assert result.recommendation in ["accept", "decline", "negotiate"]


@pytest.mark.asyncio
async def test_drift_detection_engine_rejects_short_change_request():
    with pytest.raises(AppError) as exc_info:
        await drift_detection_engine.analyze_drift(
            change_request="too short",
            original_scope_json={"summary": "scope"},
        )
    assert exc_info.value.status_code == 422


def test_format_scope_for_prompt():
    scope_json = {
        "summary": "E-commerce platform",
        "timeline_weeks": 6,
        "deliverables": [
            {
                "title": "Cart & Checkout",
                "estimated_hours": 30,
                "complexity": "high",
                "description": "Handle cart state and Stripe checkout session",
            }
        ],
        "risks_and_dependencies": ["PCI compliance", "Inventory sync latency"],
        "recommended_tech_stack": ["Next.js", "PostgreSQL"],
    }

    formatted = _format_scope_for_prompt(scope_json)
    assert "Summary: E-commerce platform" in formatted
    assert "Timeline: 6 weeks" in formatted
    assert "Cart & Checkout (30h, high)" in formatted
    assert "Handle cart state and Stripe checkout session" in formatted
    assert "PCI compliance" in formatted
    assert "Next.js, PostgreSQL" in formatted
