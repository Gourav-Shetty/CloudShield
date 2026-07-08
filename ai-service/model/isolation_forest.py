"""
ThreatDetector — Isolation Forest anomaly detector for network traffic.

Trains on synthetic data at import time and exposes a ``predict()`` method
that maps scikit-learn decision-function scores to a 0–100 *threatScore*
with human-readable labels.
"""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import IsolationForest

from data.synthetic_data import FEATURE_COLUMNS, generate_training_data


class ThreatDetector:
    """Wraps an IsolationForest model with domain-specific scoring."""

    # ── Threat-score bands ──────────────────────────────────────────────
    # Each tuple: (decision_function_lower, decision_function_upper,
    #              threat_score_lower, threat_score_upper)
    _BANDS: list[tuple[float, float, int, int]] = [
        (0.05, float("inf"),  0,  20),   # Safe
        (-0.05, 0.05,        21,  40),   # Normal
        (-0.15, -0.05,       41,  60),   # Suspicious
        (-0.25, -0.15,       61,  80),   # Warning
        (float("-inf"), -0.25, 81, 100), # Malicious
    ]

    _LABELS: list[tuple[int, int, str]] = [
        (0,  20, "Safe"),
        (21, 40, "Normal"),
        (41, 60, "Suspicious"),
        (61, 80, "Warning"),
        (81, 100, "Malicious"),
    ]

    def __init__(self) -> None:
        self.model = IsolationForest(
            contamination=0.15,
            n_estimators=200,
            random_state=42,
        )
        self.feature_columns = list(FEATURE_COLUMNS)
        self.train()

    # ── Training ────────────────────────────────────────────────────────
    def train(self) -> None:
        """Generate synthetic data, fit the Isolation Forest, and print a summary."""
        df = generate_training_data()
        X = df[self.feature_columns].values

        self.model.fit(X)

        # Quick summary
        predictions = self.model.predict(X)
        n_inliers = int((predictions == 1).sum())
        n_outliers = int((predictions == -1).sum())
        print("=" * 55)
        print("  CloudShield AI - Isolation Forest Training Summary")
        print("=" * 55)
        print(f"  Samples        : {len(X)}")
        print(f"  Features       : {len(self.feature_columns)}")
        print(f"  Estimators     : {self.model.n_estimators}")
        print(f"  Contamination  : {self.model.contamination}")
        print(f"  Inliers found  : {n_inliers}")
        print(f"  Outliers found : {n_outliers}")
        print("=" * 55)

    # ── Prediction ──────────────────────────────────────────────────────
    def predict(self, features_dict: dict) -> dict:
        """Score a single observation.

        Parameters
        ----------
        features_dict : dict
            Keys must match ``FEATURE_COLUMNS``.

        Returns
        -------
        dict
            prediction   – 1 (normal) or -1 (anomaly)
            anomalyScore – raw decision_function value
            threatScore  – int 0-100
            label        – human-readable category
            features     – the input features echoed back
        """
        values = np.array(
            [[features_dict[col] for col in self.feature_columns]]
        )

        anomaly_score = float(self.model.decision_function(values)[0])
        prediction = int(self.model.predict(values)[0])
        threat_score = self._map_threat_score(anomaly_score)
        label = self.get_label(threat_score)

        return {
            "prediction": prediction,
            "anomalyScore": round(anomaly_score, 6),
            "threatScore": threat_score,
            "label": label,
            "features": features_dict,
        }

    # ── Score mapping ───────────────────────────────────────────────────
    @classmethod
    def _map_threat_score(cls, decision_score: float) -> int:
        """Linearly interpolate within the matching threat-score band."""
        for lower, upper, ts_low, ts_high in cls._BANDS:
            if lower <= decision_score < upper or (
                lower == float("-inf") and decision_score < upper
            ) or (
                upper == float("inf") and decision_score >= lower
            ):
                # Clamp for the infinite-boundary bands
                clamped_lower = max(lower, -0.5)
                clamped_upper = min(upper, 0.5)
                span = clamped_upper - clamped_lower
                if span == 0:
                    return ts_low

                # Within each band a *lower* decision score ⇒ *higher* threat
                ratio = 1.0 - (decision_score - clamped_lower) / span
                ratio = max(0.0, min(1.0, ratio))
                return int(round(ts_low + ratio * (ts_high - ts_low)))

        # Fallback (should not happen)
        return 50  # pragma: no cover

    @classmethod
    def get_label(cls, threat_score: int) -> str:
        """Map a 0-100 threat score to a human-readable label."""
        for low, high, label in cls._LABELS:
            if low <= threat_score <= high:
                return label
        return "Unknown"  # pragma: no cover
