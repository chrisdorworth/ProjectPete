"""Evaluate model performance and decide on deployment."""

import json
import sys
from pathlib import Path


def evaluate():
    """Compare latest model metrics against threshold."""
    model_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent.parent / "models"

    metric_files = sorted(model_dir.glob("*_metrics.json"), reverse=True)
    if not metric_files:
        print("No metrics files found")
        return

    latest = metric_files[0]
    with open(latest) as f:
        metrics = json.load(f)

    print(f"Model version: {metrics['version']}")
    print(f"AUC: {metrics['auc']:.4f}")
    print(f"Precision@10: {metrics['precision_at_10']:.4f}")
    print(f"Training rows: {metrics['training_rows']}")
    print(f"Positive rate: {metrics['positive_rate']:.4f}")

    # Compare with previous
    if len(metric_files) > 1:
        with open(metric_files[1]) as f:
            prev = json.load(f)
        auc_delta = metrics["auc"] - prev["auc"]
        print(f"\nDelta vs previous: AUC {auc_delta:+.4f}")

        if auc_delta < -0.02:
            print("WARNING: AUC degraded by >2%. Keeping current model.")
            return False
        else:
            print("Model improved or stable. Safe to deploy.")
            return True
    else:
        min_auc = 0.55
        if metrics["auc"] >= min_auc:
            print(f"First model meets minimum AUC threshold ({min_auc}). Deploy.")
            return True
        else:
            print(f"First model below minimum AUC ({min_auc}). Keep rule-based.")
            return False


if __name__ == "__main__":
    result = evaluate()
    sys.exit(0 if result else 1)
