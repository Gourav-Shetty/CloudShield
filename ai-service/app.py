"""
CloudShield AI — Flask microservice entry point.

Trains an Isolation Forest anomaly-detection model on startup and exposes
REST endpoints for real-time network-traffic threat scoring.
"""

from __future__ import annotations

from datetime import datetime, timezone

from flask import Flask, jsonify
from flask_cors import CORS

from model.isolation_forest import ThreatDetector
from model.classifier import ThreatClassifier
from routes.analyze import analyze_bp, init_models


def create_app() -> Flask:
    """Application factory."""
    app = Flask(__name__)
    CORS(app)  # allow all origins

    # ── Train model ─────────────────────────────────────────────────────
    print("\n[AI] Initializing CloudShield AI threat-detection models...\n")
    detector = ThreatDetector()
    classifier = ThreatClassifier()
    init_models(detector, classifier)

    # ── Register blueprints ─────────────────────────────────────────────
    app.register_blueprint(analyze_bp)

    # ── Root info route ─────────────────────────────────────────────────
    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "service": "CloudShield AI Threat Detection",
            "version": "1.0.0",
            "model": "IsolationForest",
            "features": detector.feature_columns,
            "endpoints": {
                "POST /analyze": "Analyze traffic features or raw logs",
                "GET /health": "Service health check",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 200

    return app


# ── Main entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = create_app()

    print("\n" + "═" * 55)
    print("  CloudShield AI Microservice")
    print("  Listening on http://0.0.0.0:8000")
    print("═" * 55 + "\n")

    app.run(host="0.0.0.0", port=8000, debug=False)
