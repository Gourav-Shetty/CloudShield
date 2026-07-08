"""
Feature extraction from raw log windows.

Converts a list of monitoring-platform log dicts into the seven numeric
features expected by :class:`model.isolation_forest.ThreatDetector`.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


def _parse_timestamp(ts: str | float | int) -> datetime:
    """Best-effort timestamp parser.

    Accepts ISO-8601 strings or numeric Unix-epoch seconds/milliseconds.
    """
    if isinstance(ts, (int, float)):
        # If the value looks like milliseconds (> year-2100 in seconds)
        if ts > 4_102_444_800:
            ts = ts / 1000.0
        return datetime.fromtimestamp(ts, tz=timezone.utc)

    # Try common ISO formats
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            return datetime.strptime(ts, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    raise ValueError(f"Unable to parse timestamp: {ts!r}")


def extract_features(logs_window: list[dict[str, Any]]) -> dict[str, float]:
    """Derive the seven model features from a window of raw log entries.

    Parameters
    ----------
    logs_window : list[dict]
        Each dict should contain at least ``timestamp``.  Optional keys used:
        ``eventType``, ``status``, ``endpoint`` / ``path``, ``payload``.

    Returns
    -------
    dict[str, float]
        Keys: requests_per_minute, failed_login_count, unique_endpoints,
        avg_request_interval_ms, session_duration_s, error_rate,
        avg_payload_length.
    """
    # ── Edge case: empty list ───────────────────────────────────────────
    if not logs_window:
        return {
            "requests_per_minute": 0.0,
            "failed_login_count": 0.0,
            "unique_endpoints": 0.0,
            "avg_request_interval_ms": 0.0,
            "session_duration_s": 0.0,
            "error_rate": 0.0,
            "avg_payload_length": 0.0,
        }

    n = len(logs_window)

    # ── Parse & sort timestamps ─────────────────────────────────────────
    timestamps: list[datetime] = sorted(
        _parse_timestamp(log["timestamp"]) for log in logs_window
    )

    time_span_s = (timestamps[-1] - timestamps[0]).total_seconds()
    time_span_min = max(time_span_s / 60.0, 1.0)  # at least 1 minute

    # ── requests_per_minute ─────────────────────────────────────────────
    requests_per_minute = n / time_span_min

    # ── failed_login_count ──────────────────────────────────────────────
    failed_login_count = sum(
        1
        for log in logs_window
        if str(log.get("eventType", "")).lower() == "login"
        and int(log.get("status", 200)) >= 400
    )

    # ── unique_endpoints ────────────────────────────────────────────────
    endpoints = {
        log.get("endpoint") or log.get("path") or "/"
        for log in logs_window
    }
    unique_endpoints = len(endpoints)

    # ── avg_request_interval_ms ─────────────────────────────────────────
    if n >= 2:
        intervals_ms = [
            (timestamps[i] - timestamps[i - 1]).total_seconds() * 1000.0
            for i in range(1, len(timestamps))
        ]
        avg_request_interval_ms = sum(intervals_ms) / len(intervals_ms)
    else:
        avg_request_interval_ms = 0.0

    # ── session_duration_s ──────────────────────────────────────────────
    session_duration_s = time_span_s

    # ── error_rate ──────────────────────────────────────────────────────
    error_count = sum(
        1 for log in logs_window if int(log.get("status", 200)) >= 400
    )
    error_rate = error_count / n

    # ── avg_payload_length ──────────────────────────────────────────────
    payload_lengths = [
        len(json.dumps(log.get("payload", {}))) for log in logs_window
    ]
    avg_payload_length = sum(payload_lengths) / n

    return {
        "requests_per_minute": round(requests_per_minute, 4),
        "failed_login_count": float(failed_login_count),
        "unique_endpoints": float(unique_endpoints),
        "avg_request_interval_ms": round(avg_request_interval_ms, 4),
        "session_duration_s": round(session_duration_s, 4),
        "error_rate": round(error_rate, 6),
        "avg_payload_length": round(avg_payload_length, 4),
    }
