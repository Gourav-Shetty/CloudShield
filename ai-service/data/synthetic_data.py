"""
Synthetic training data generator for CloudShield AI Isolation Forest model.

Produces a mix of normal network traffic patterns and anomalous attack-like
patterns so the model learns to distinguish benign behaviour from threats.
"""

import numpy as np
import pandas as pd


# ── Feature columns (canonical order) ────────────────────────────────────────
FEATURE_COLUMNS = [
    "requests_per_minute",
    "failed_login_count",
    "unique_endpoints",
    "avg_request_interval_ms",
    "session_duration_s",
    "error_rate",
    "avg_payload_length",
]


def _generate_normal_samples(n: int = 1000, rng: np.random.Generator | None = None) -> pd.DataFrame:
    """Generate *n* samples that mimic ordinary user traffic."""
    if rng is None:
        rng = np.random.default_rng(42)

    data = {
        "requests_per_minute": np.clip(rng.normal(10, 5, n), 1, 50),
        "failed_login_count": rng.binomial(2, 0.1, n).astype(float),
        "unique_endpoints": np.clip(rng.normal(5, 2, n), 1, 15).round(),
        "avg_request_interval_ms": np.clip(rng.normal(5000, 2000, n), 500, 30000),
        "session_duration_s": np.clip(rng.normal(300, 150, n), 30, 1800),
        "error_rate": rng.beta(2, 20, n),
        "avg_payload_length": np.clip(rng.normal(200, 100, n), 10, 1000),
    }
    return pd.DataFrame(data)


def _generate_anomalous_samples(n: int = 200, rng: np.random.Generator | None = None) -> pd.DataFrame:
    """Generate *n* samples with attack-like signatures."""
    if rng is None:
        rng = np.random.default_rng(99)

    # unique_endpoints — half look like endpoint-enumeration attacks,
    # the other half look like brute-force against a single endpoint.
    half = n // 2
    unique_endpoints = np.concatenate([
        rng.uniform(20, 100, half),   # enumeration
        rng.uniform(1, 2, n - half),  # brute-force
    ])
    rng.shuffle(unique_endpoints)

    # avg_payload_length — larger payloads typical of injection attacks
    avg_payload_length = rng.uniform(500, 5000, n)

    data = {
        "requests_per_minute": rng.uniform(80, 500, n),
        "failed_login_count": rng.uniform(5, 50, n),
        "unique_endpoints": unique_endpoints,
        "avg_request_interval_ms": rng.uniform(10, 200, n),
        "session_duration_s": rng.uniform(5, 60, n),
        "error_rate": rng.uniform(0.3, 0.9, n),
        "avg_payload_length": avg_payload_length,
    }
    return pd.DataFrame(data)


def generate_training_data(
    n_normal: int = 1000,
    n_anomalous: int = 200,
    seed: int = 42,
) -> pd.DataFrame:
    """Return a DataFrame with *n_normal* + *n_anomalous* rows (default 1200).

    Parameters
    ----------
    n_normal : int
        Number of benign-traffic samples.
    n_anomalous : int
        Number of attack-like samples.
    seed : int
        Base random seed for reproducibility.

    Returns
    -------
    pd.DataFrame
        Columns match ``FEATURE_COLUMNS`` plus a ``label`` column
        (0 = normal, 1 = anomalous).
    """
    rng_normal = np.random.default_rng(seed)
    rng_anomalous = np.random.default_rng(seed + 57)

    normal_df = _generate_normal_samples(n_normal, rng_normal)
    normal_df["label"] = 0

    anomalous_df = _generate_anomalous_samples(n_anomalous, rng_anomalous)
    anomalous_df["label"] = 1

    combined = pd.concat([normal_df, anomalous_df], ignore_index=True)

    # Shuffle so the model doesn't see blocks of one class
    combined = combined.sample(frac=1, random_state=seed).reset_index(drop=True)

    return combined
