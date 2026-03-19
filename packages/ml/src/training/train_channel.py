"""Train channel optimization model for Project Meridian."""

import os
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
from ..features.feature_store import load_channel_training_data


CHANNEL_LABELS = ["email", "linkedin", "voicemail", "handwritten", "sms"]


def train_channel_model(min_samples: int = 200) -> dict:
    """Train channel optimization model."""
    df = load_channel_training_data()

    if len(df) < min_samples:
        print(f"Insufficient data: {len(df)} samples (need {min_samples})")
        return {"status": "skipped", "reason": "insufficient_data", "samples": len(df)}

    le = LabelEncoder()
    le.fit(CHANNEL_LABELS)

    feature_cols = [
        "signal_type_encoded",
        "score",
        "has_email",
        "has_cell_phone",
        "has_home_address",
        "has_linkedin",
        "has_consent",
        "enrichment_completeness",
        "county_conversion_rate",
    ]

    X = df[feature_cols].values
    y = le.transform(df["best_channel"].values)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=len(CHANNEL_LABELS),
        eval_metric="mlogloss",
        early_stopping_rounds=10,
        random_state=42,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=CHANNEL_LABELS, output_dict=True)

    print(f"Channel Model Accuracy: {accuracy:.3f}")
    print(classification_report(y_test, y_pred, target_names=CHANNEL_LABELS))

    model_dir = os.environ.get("MODEL_DIR", "/tmp/models")
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, "channel_optimizer.joblib")
    encoder_path = os.path.join(model_dir, "channel_label_encoder.joblib")
    joblib.dump(model, model_path)
    joblib.dump(le, encoder_path)

    return {
        "status": "trained",
        "accuracy": accuracy,
        "report": report,
        "model_path": model_path,
        "samples": len(df),
    }


if __name__ == "__main__":
    result = train_channel_model()
    print(f"Result: {result['status']}")
