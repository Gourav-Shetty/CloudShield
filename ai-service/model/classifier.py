"""
ThreatClassifier — Supervised Random Forest Classifier for network traffic threats.

Fits on startup alongside Isolation Forest, classifying observations into:
- 0: Normal
- 1: BruteForce
- 2: SQLInjection
- 3: XSS
- 4: DDoS
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from data.synthetic_data import FEATURE_COLUMNS, generate_training_data


class ThreatClassifier:
    """Supervised Random Forest Classifier to categorize threat vectors."""

    _CLASSES = {
        0: "Normal",
        1: "BruteForce",
        2: "SQLInjection",
        3: "XSS",
        4: "DDoS",
    }

    def __init__(self) -> None:
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight="balanced",
        )
        self.feature_columns = list(FEATURE_COLUMNS)
        self.train()

    def train(self) -> None:
        """Fit Random Forest on synthetic multiclass threat data."""
        df = generate_training_data()
        X = df[self.feature_columns].values
        y = df["class_label"].values

        self.model.fit(X, y)

        # Quick validation summary
        predictions = self.model.predict(X)
        print("=" * 55)
        print("  CloudShield AI - Threat Classifier Training Summary")
        print("=" * 55)
        for class_id, class_name in self._CLASSES.items():
            count = int((predictions == class_id).sum())
            actual = int((y == class_id).sum())
            print(f"  Class {class_id} ({class_name.ljust(12)}) : Predicted {count} / Actual {actual}")
        print("=" * 55)

    def predict_class(self, features_dict: dict) -> dict:
        """Classify a single traffic sample.

        Returns
        -------
        dict
            predictedClass - string name of class
            classId        - int identifier
            confidence     - float representing prediction probability (0.0 to 1.0)
        """
        values = np.array(
            [[features_dict[col] for col in self.feature_columns]]
        )

        probabilities = self.model.predict_proba(values)[0]
        class_id = int(np.argmax(probabilities))
        confidence = float(probabilities[class_id])
        class_name = self._CLASSES.get(class_id, "Unknown")

        return {
            "predictedClass": class_name,
            "classId": class_id,
            "confidence": round(confidence, 4),
        }
