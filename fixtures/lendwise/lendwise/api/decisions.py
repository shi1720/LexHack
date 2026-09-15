"""Underwriter-facing decision API."""

from fastapi import APIRouter, Depends, HTTPException

from lendwise.api.auth import current_underwriter
from lendwise.models.score import score_application

router = APIRouter(prefix="/decisions")


@router.post("/{application_id}/override")
def override_decision(application_id: str, outcome: str, reason: str, user=Depends(current_underwriter)):
    """Human review: an underwriter can override the model outcome."""
    if outcome not in {"approve", "decline"}:
        raise HTTPException(400, "invalid outcome")
    return {
        "application_id": application_id,
        "outcome": outcome,
        "overridden_by": user.id,
        "reason": reason,
    }


@router.post("/{application_id}/score")
def score_decision(application_id: str, application: dict, user=Depends(current_underwriter)):
    decision = score_application(application)
    return {
        "application_id": application_id,
        "outcome": decision.decision,
        "probability_of_default": decision.probability_of_default,
    }


@router.get("/{application_id}")
def get_decision(application_id: str, user=Depends(current_underwriter)):
    return {"application_id": application_id}
