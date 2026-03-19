"""Feature store reader — pulls from PostgreSQL feature_store table."""

import os
import pandas as pd
from sqlalchemy import create_engine, text


def get_engine():
    url = os.environ.get("DATABASE_URL", "postgresql://meridian:meridian_dev@localhost:5432/meridian")
    return create_engine(url)


def load_features(min_signals: int = 1, with_outcome: bool = False) -> pd.DataFrame:
    """Load feature rows from the feature store."""
    engine = get_engine()

    query = """
    SELECT
        lead_id,
        signal_count,
        signal_type_primary,
        signal_value_cents,
        signal_recency_days,
        multi_signal_flag,
        enrichment_completeness,
        email_confidence,
        has_cell_phone,
        has_home_address,
        network_proximity,
        has_warm_path,
        intent_score,
        intent_keyword_match,
        household_size,
        household_value_cents,
        age_estimate,
        is_professional,
        alma_mater_tier,
        rapport_hook_count,
        county_conversion_rate,
        signal_source_conversion_rate,
        outcome,
        outcome_captured_at
    FROM feature_store
    WHERE signal_count >= :min_signals
    """

    if with_outcome:
        query += " AND outcome IS NOT NULL"

    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn, params={"min_signals": min_signals})

    return df


def load_training_data() -> tuple[pd.DataFrame, pd.Series]:
    """Load features with outcomes for model training."""
    df = load_features(with_outcome=True)

    feature_cols = [
        "signal_count", "signal_value_cents", "signal_recency_days",
        "multi_signal_flag", "enrichment_completeness", "email_confidence",
        "has_cell_phone", "has_home_address", "network_proximity",
        "has_warm_path", "intent_score", "intent_keyword_match",
        "household_size", "household_value_cents", "age_estimate",
        "is_professional", "alma_mater_tier", "rapport_hook_count",
        "county_conversion_rate", "signal_source_conversion_rate",
    ]

    X = df[feature_cols].fillna(0)
    y = (df["outcome"] == "converted").astype(int)

    return X, y
