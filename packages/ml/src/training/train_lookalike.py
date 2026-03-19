"""Train lookalike model for Project Meridian."""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
from ..features.feature_store import load_converted_lead_features


def train_lookalike_model(min_converted: int = 50) -> dict:
    """Train lookalike finder using converted leads as the reference set."""
    df = load_converted_lead_features()

    if len(df) < min_converted:
        print(f"Insufficient converted leads: {len(df)} (need {min_converted})")
        return {"status": "skipped", "reason": "insufficient_data", "samples": len(df)}

    feature_cols = [
        "signal_count",
        "signal_value_cents_log",
        "enrichment_completeness",
        "email_confidence",
        "has_cell_phone",
        "has_home_address",
        "network_proximity",
        "has_warm_path",
        "household_size",
        "household_value_cents_log",
        "is_professional",
        "rapport_hook_count",
        "county_conversion_rate",
    ]

    X = df[feature_cols].fillna(0).values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = NearestNeighbors(
        n_neighbors=min(20, len(X)),
        metric="cosine",
        algorithm="brute",
    )
    model.fit(X_scaled)

    model_dir = os.environ.get("MODEL_DIR", "/tmp/models")
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, "lookalike_finder.joblib")
    scaler_path = os.path.join(model_dir, "lookalike_scaler.joblib")
    meta_path = os.path.join(model_dir, "lookalike_meta.joblib")

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump({
        "feature_cols": feature_cols,
        "lead_ids": df["lead_id"].tolist(),
        "n_reference": len(df),
    }, meta_path)

    print(f"Lookalike model trained on {len(df)} converted leads")
    print(f"Feature dimensions: {X_scaled.shape[1]}")

    return {
        "status": "trained",
        "n_reference_leads": len(df),
        "model_path": model_path,
        "features": len(feature_cols),
    }


if __name__ == "__main__":
    result = train_lookalike_model()
    print(f"Result: {result['status']}")
