"""Feature engineering for ML training pipeline."""

import pandas as pd
import numpy as np


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Apply feature engineering transformations."""
    result = df.copy()

    # Value buckets
    result["value_bucket"] = pd.cut(
        result["signal_value_cents"] / 100,
        bins=[0, 100_000, 250_000, 500_000, 1_000_000, 5_000_000, float("inf")],
        labels=[1, 2, 3, 4, 5, 6],
    ).astype(float)

    # Recency buckets
    result["recency_bucket"] = pd.cut(
        result["signal_recency_days"].fillna(999),
        bins=[0, 7, 14, 30, 60, 90, 180, float("inf")],
        labels=[7, 6, 5, 4, 3, 2, 1],
    ).astype(float)

    # Contact quality score
    result["contact_quality"] = (
        result["email_confidence"] * 0.4
        + result["has_cell_phone"].astype(float) * 0.3
        + result["has_home_address"].astype(float) * 0.2
        + result["enrichment_completeness"] * 0.1
    )

    # Network score
    result["network_score"] = np.where(
        result["network_proximity"].isna(),
        0,
        np.clip(100 - result["network_proximity"], 0, 100) / 100,
    )

    # Household wealth per member
    result["wealth_per_member"] = np.where(
        result["household_size"] > 0,
        result["household_value_cents"] / result["household_size"],
        0,
    )

    # Age-based score
    result["age_score"] = np.where(
        result["age_estimate"].between(55, 75),
        1.0,
        np.where(result["age_estimate"].between(45, 54), 0.7, 0.3),
    )

    return result
