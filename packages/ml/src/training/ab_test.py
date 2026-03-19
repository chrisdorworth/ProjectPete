"""A/B testing framework for ML model deployment."""

import os
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
from scipy import stats


class ABTest:
    """Manages A/B tests between model versions."""

    def __init__(self, experiment_id: str, control_version: str, treatment_version: str, traffic_split: float = 0.5):
        self.experiment_id = experiment_id
        self.control_version = control_version
        self.treatment_version = treatment_version
        self.traffic_split = traffic_split
        self.control_outcomes: list[float] = []
        self.treatment_outcomes: list[float] = []
        self.started_at = datetime.utcnow()
        self.min_samples = 100
        self.significance_level = 0.05

    def assign_variant(self, lead_id: str) -> str:
        """Deterministic assignment based on lead_id hash."""
        hash_val = hash(f"{self.experiment_id}:{lead_id}") % 1000
        if hash_val < self.traffic_split * 1000:
            return self.treatment_version
        return self.control_version

    def record_outcome(self, variant: str, outcome: float) -> None:
        """Record a conversion/score outcome for a variant."""
        if variant == self.treatment_version:
            self.treatment_outcomes.append(outcome)
        else:
            self.control_outcomes.append(outcome)

    def get_results(self) -> dict:
        """Calculate current A/B test results."""
        n_control = len(self.control_outcomes)
        n_treatment = len(self.treatment_outcomes)

        if n_control == 0 or n_treatment == 0:
            return {
                "status": "insufficient_data",
                "n_control": n_control,
                "n_treatment": n_treatment,
            }

        control_mean = np.mean(self.control_outcomes)
        treatment_mean = np.mean(self.treatment_outcomes)
        lift = (treatment_mean - control_mean) / control_mean if control_mean > 0 else 0

        result = {
            "experiment_id": self.experiment_id,
            "n_control": n_control,
            "n_treatment": n_treatment,
            "control_mean": float(control_mean),
            "treatment_mean": float(treatment_mean),
            "lift": float(lift),
            "started_at": self.started_at.isoformat(),
        }

        if n_control >= self.min_samples and n_treatment >= self.min_samples:
            t_stat, p_value = stats.ttest_ind(
                self.control_outcomes,
                self.treatment_outcomes,
                equal_var=False,
            )
            significant = p_value < self.significance_level

            result.update({
                "status": "conclusive" if significant else "inconclusive",
                "p_value": float(p_value),
                "t_statistic": float(t_stat),
                "significant": significant,
                "winner": self.treatment_version if (significant and lift > 0) else self.control_version if (significant and lift < 0) else None,
                "recommendation": self._get_recommendation(significant, lift),
            })
        else:
            result["status"] = "collecting"

        return result

    def _get_recommendation(self, significant: bool, lift: float) -> str:
        if not significant:
            return "Continue collecting data or end experiment with no winner"
        if lift > 0.05:
            return f"Deploy {self.treatment_version} — {lift:.1%} improvement"
        if lift < -0.05:
            return f"Keep {self.control_version} — treatment is {abs(lift):.1%} worse"
        return "Difference is statistically significant but practically negligible"

    def should_conclude(self) -> bool:
        """Check if enough data to conclude."""
        return (
            len(self.control_outcomes) >= self.min_samples
            and len(self.treatment_outcomes) >= self.min_samples
        )

    def to_dict(self) -> dict:
        results = self.get_results()
        results["control_version"] = self.control_version
        results["treatment_version"] = self.treatment_version
        results["traffic_split"] = self.traffic_split
        return results


class ExperimentRegistry:
    """Manages active A/B test experiments."""

    def __init__(self):
        self.experiments: dict[str, ABTest] = {}

    def create_experiment(
        self,
        experiment_id: str,
        control_version: str,
        treatment_version: str,
        traffic_split: float = 0.5,
    ) -> ABTest:
        test = ABTest(experiment_id, control_version, treatment_version, traffic_split)
        self.experiments[experiment_id] = test
        return test

    def get_experiment(self, experiment_id: str) -> Optional[ABTest]:
        return self.experiments.get(experiment_id)

    def get_active_experiments(self) -> list[dict]:
        return [exp.to_dict() for exp in self.experiments.values()]

    def conclude_experiment(self, experiment_id: str) -> Optional[dict]:
        exp = self.experiments.pop(experiment_id, None)
        if exp is None:
            return None
        return exp.get_results()
