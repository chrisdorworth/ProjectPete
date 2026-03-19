"""FastAPI ML serving endpoint for Project Meridian."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from .model_registry import ModelRegistry

app = FastAPI(title="Meridian ML Service", version="1.0.0")
registry = ModelRegistry()


class ScoreRequest(BaseModel):
    signal_count: int = 0
    signal_type_primary: Optional[str] = None
    signal_value_cents: int = 0
    signal_recency_days: Optional[int] = None
    multi_signal_flag: bool = False
    enrichment_completeness: float = 0.0
    email_confidence: float = 0.0
    has_cell_phone: bool = False
    has_home_address: bool = False
    network_proximity: Optional[int] = None
    has_warm_path: bool = False
    intent_score: int = 0
    intent_keyword_match: bool = False
    household_size: int = 1
    household_value_cents: int = 0
    age_estimate: Optional[int] = None
    is_professional: bool = False
    alma_mater_tier: Optional[int] = None
    rapport_hook_count: int = 0
    county_conversion_rate: Optional[float] = None
    signal_source_conversion_rate: Optional[float] = None


class ScoreResponse(BaseModel):
    score: float
    model_version: str
    features_used: int


class ChannelRequest(BaseModel):
    signal_type: str
    score: float
    has_email: bool = False
    has_cell_phone: bool = False
    has_home_address: bool = False
    has_linkedin: bool = False
    has_consent: bool = False


class ChannelResponse(BaseModel):
    recommended_channel: str
    confidence: float
    model_version: str


class LookalikeRequest(BaseModel):
    lead_id: str
    top_k: int = 10


class LookalikeResponse(BaseModel):
    similar_leads: list[dict]
    model_version: str


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models_loaded": registry.get_loaded_models(),
    }


@app.post("/predict/score", response_model=ScoreResponse)
async def predict_score(request: ScoreRequest):
    model = registry.get_model("conversion_predictor")
    if model is None:
        # Cold start: return rule-based score
        return ScoreResponse(
            score=_rule_based_score(request),
            model_version="rule-v1",
            features_used=len(request.model_dump(exclude_none=True)),
        )

    features = _extract_features(request)
    prediction = model.predict_proba([features])[0][1]

    return ScoreResponse(
        score=round(float(prediction) * 100, 1),
        model_version=registry.get_version("conversion_predictor"),
        features_used=len(features),
    )


@app.post("/predict/channel", response_model=ChannelResponse)
async def predict_channel(request: ChannelRequest):
    model = registry.get_model("channel_optimizer")

    # Default channel priority
    if model is None:
        channel = "email" if request.has_email else "linkedin" if request.has_linkedin else "voicemail"
        return ChannelResponse(
            recommended_channel=channel,
            confidence=0.5,
            model_version="rule-v1",
        )

    return ChannelResponse(
        recommended_channel="email",
        confidence=0.75,
        model_version=registry.get_version("channel_optimizer"),
    )


@app.post("/predict/lookalike", response_model=LookalikeResponse)
async def predict_lookalike(request: LookalikeRequest):
    model = registry.get_model("lookalike_finder")
    if model is None:
        raise HTTPException(status_code=503, detail="Lookalike model not trained yet")

    return LookalikeResponse(
        similar_leads=[],
        model_version=registry.get_version("lookalike_finder"),
    )


def _rule_based_score(request: ScoreRequest) -> float:
    """Cold-start rule-based scoring."""
    score = 0.0

    # Signal strength (0-30)
    score += min(30, request.signal_count * 10)
    if request.multi_signal_flag:
        score += 5

    # Value (0-25)
    dollars = request.signal_value_cents / 100
    if dollars >= 5_000_000:
        score += 25
    elif dollars >= 1_000_000:
        score += 20
    elif dollars >= 500_000:
        score += 15
    elif dollars >= 100_000:
        score += 10
    else:
        score += 5

    # Timing (0-20)
    if request.signal_recency_days is not None:
        if request.signal_recency_days <= 7:
            score += 20
        elif request.signal_recency_days <= 30:
            score += 15
        elif request.signal_recency_days <= 90:
            score += 8
        else:
            score += 3

    # Access (0-15)
    if request.enrichment_completeness >= 0.8:
        score += 5
    if request.has_cell_phone:
        score += 5
    if request.has_warm_path:
        score += 5

    # Complexity (0-10)
    if request.is_professional:
        score += 5
    if request.household_size >= 2:
        score += 5

    return min(50, score)


def _extract_features(request: ScoreRequest) -> list[float]:
    """Extract feature vector from request."""
    return [
        float(request.signal_count),
        float(request.signal_value_cents),
        float(request.signal_recency_days or 0),
        float(request.multi_signal_flag),
        request.enrichment_completeness,
        request.email_confidence,
        float(request.has_cell_phone),
        float(request.has_home_address),
        float(request.network_proximity or 99),
        float(request.has_warm_path),
        float(request.intent_score),
        float(request.intent_keyword_match),
        float(request.household_size),
        float(request.household_value_cents),
        float(request.age_estimate or 0),
        float(request.is_professional),
        float(request.alma_mater_tier or 0),
        float(request.rapport_hook_count),
        float(request.county_conversion_rate or 0),
        float(request.signal_source_conversion_rate or 0),
    ]
