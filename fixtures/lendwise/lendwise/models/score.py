"""Credit risk scoring."""

from dataclasses import dataclass

import structlog
import xgboost as xgb

from lendwise.models.features import build_features

log = structlog.get_logger()

MODEL_VERSION = "pd-v4.2.1"
REVIEW_BAND = (0.35, 0.65)


@dataclass
class CreditDecision:
    application_id: str
    probability_of_default: float
    decision: str
    model_version: str
    requires_human_review: bool


_booster = xgb.Booster()
_booster.load_model("artifacts/pd-v4.2.1.json")


def score_application(application) -> CreditDecision:
    """Evaluate creditworthiness for a consumer loan application."""
    features = build_features(application)
    probability_of_default = float(_booster.predict(features)[0])

    requires_human_review = REVIEW_BAND[0] <= probability_of_default <= REVIEW_BAND[1]
    if requires_human_review:
        decision = "pending_review"
    elif probability_of_default < REVIEW_BAND[0]:
        decision = "approve"
    else:
        decision = "decline"

    log.info(
        "credit_decision",
        application_id=application.id,
        decision=decision,
        model_version=MODEL_VERSION,
    )

    return CreditDecision(
        application_id=application.id,
        probability_of_default=probability_of_default,
        decision=decision,
        model_version=MODEL_VERSION,
        requires_human_review=requires_human_review,
    )
