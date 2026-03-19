"""Train XGBoost conversion prediction model."""

import os
import sys
import joblib
from datetime import datetime
from pathlib import Path

import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_score

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from features.feature_store import load_training_data


def train():
    """Train conversion predictor model."""
    print("Loading training data...")
    X, y = load_training_data()

    if len(X) < 50:
        print(f"Not enough training data ({len(X)} rows). Need at least 50.")
        return

    print(f"Training on {len(X)} rows, {y.sum()} positive examples")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        eval_metric="auc",
        early_stopping_rounds=20,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=True,
    )

    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_pred_proba)
    precision_at_10 = precision_score(
        y_test,
        (y_pred_proba >= sorted(y_pred_proba, reverse=True)[min(9, len(y_pred_proba) - 1)]).astype(int),
    )

    print(f"AUC: {auc:.4f}")
    print(f"Precision@10: {precision_at_10:.4f}")

    # Save model
    model_dir = Path(os.environ.get("MODEL_DIR", str(Path(__file__).parent.parent / "models")))
    model_dir.mkdir(exist_ok=True)
    version = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = model_dir / f"conversion_predictor_v{version}.joblib"
    joblib.dump(model, model_path)
    print(f"Model saved: {model_path}")

    # Save metrics
    metrics = {
        "auc": float(auc),
        "precision_at_10": float(precision_at_10),
        "training_rows": len(X_train),
        "test_rows": len(X_test),
        "positive_rate": float(y.mean()),
        "version": version,
    }
    metrics_path = model_dir / f"conversion_predictor_v{version}_metrics.json"
    import json
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    return metrics


if __name__ == "__main__":
    train()
