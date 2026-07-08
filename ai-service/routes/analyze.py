"""
/analyze and /health endpoints for the CloudShield AI microservice.
"""

from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

analyze_bp = Blueprint("analyze", __name__)

# The detector instance is injected by app.py after the model is trained.
_detector = None


def init_detector(detector) -> None:
    """Store a reference to the trained :class:`ThreatDetector`."""
    global _detector
    _detector = detector


# ── POST /analyze ───────────────────────────────────────────────────────────
@analyze_bp.route("/analyze", methods=["POST"])
def analyze():
    """Analyze network traffic for anomalies.

    Accepts JSON with **either**:
    - ``features``: a dict with the 7 numeric feature values, **or**
    - ``logs``: a list of log objects from which features are extracted.
    """
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    # ── Mode 1: pre-computed features ───────────────────────────────────
    if "features" in body:
        features = body["features"]
        required = {
            "requests_per_minute",
            "failed_login_count",
            "unique_endpoints",
            "avg_request_interval_ms",
            "session_duration_s",
            "error_rate",
            "avg_payload_length",
        }
        missing = required - set(features.keys())
        if missing:
            return jsonify({
                "error": f"Missing feature(s): {', '.join(sorted(missing))}"
            }), 400

        try:
            # Ensure all values are numeric
            features = {k: float(features[k]) for k in required}
        except (TypeError, ValueError) as exc:
            return jsonify({"error": f"Non-numeric feature value: {exc}"}), 400

    # ── Mode 2: raw logs ────────────────────────────────────────────────
    elif "logs" in body:
        logs = body["logs"]
        if not isinstance(logs, list) or len(logs) == 0:
            return jsonify({"error": "'logs' must be a non-empty array"}), 400

        from model.feature_extractor import extract_features

        try:
            features = extract_features(logs)
        except Exception as exc:
            return jsonify({"error": f"Feature extraction failed: {exc}"}), 400
    else:
        return jsonify({
            "error": "Request must contain a 'features' or 'logs' key"
        }), 400

    # ── Run prediction ──────────────────────────────────────────────────
    if _detector is None:
        return jsonify({"error": "Model not loaded"}), 503

    result = _detector.predict(features)
    result["timestamp"] = datetime.now(timezone.utc).isoformat()
    return jsonify(result), 200


# ── GET /health ─────────────────────────────────────────────────────────────
@analyze_bp.route("/health", methods=["GET"])
def health():
    """Lightweight health-check endpoint."""
    return jsonify({
        "status": "ok",
        "model": "IsolationForest",
        "features": 7,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200
