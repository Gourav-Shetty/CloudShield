"""
Synthetic training data generator for CloudShield AI models.

Produces a mix of normal network traffic patterns and anomalous attack-like
patterns so the models learn to distinguish benign behaviour from specific threat types.
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

def _generate_bruteforce_samples(n: int = 50, rng: np.random.Generator | None = None) -> pd.DataFrame:
    """Generate *n* samples representing brute force attacks."""
    if rng is None:
        rng = np.random.default_rng(43)

    data = {
        "requests_per_minute": rng.uniform(40, 150, n),
        "failed_login_count": rng.uniform(6, 40, n),
        "unique_endpoints": rng.uniform(1, 2, n).round(),
        "avg_request_interval_ms": rng.uniform(100, 1000, n),
        "session_duration_s": rng.uniform(10, 100, n),
        "error_rate": rng.uniform(0.7, 1.0, n),
        "avg_payload_length": rng.uniform(20, 150, n),
    }
    return pd.DataFrame(data)

def _generate_sqli_samples(n: int = 50, rng: np.random.Generator | None = None) -> pd.DataFrame:
    """Generate *n* samples representing SQL injection attempts."""
    if rng is None:
        rng = np.random.default_rng(44)

    data = {
        "requests_per_minute": rng.uniform(5, 35, n),
        "failed_login_count": rng.uniform(0, 2, n),
        "unique_endpoints": rng.uniform(1, 4, n).round(),
        "avg_request_interval_ms": rng.uniform(1000, 8000, n),
        "session_duration_s": rng.uniform(60, 600, n),
        "error_rate": rng.uniform(0.0, 0.3, n),
        "avg_payload_length": rng.uniform(1500, 4000, n),
    }
    return pd.DataFrame(data)

def _generate_xss_samples(n: int = 50, rng: np.random.Generator | None = None) -> pd.DataFrame:
    """Generate *n* samples representing XSS script uploads."""
    if rng is None:
        rng = np.random.default_rng(45)

    data = {
        "requests_per_minute": rng.uniform(5, 35, n),
        "failed_login_count": rng.uniform(0, 2, n),
        "unique_endpoints": rng.uniform(1, 4, n).round(),
        "avg_request_interval_ms": rng.uniform(1000, 8000, n),
        "session_duration_s": rng.uniform(60, 600, n),
        "error_rate": rng.uniform(0.0, 0.3, n),
        "avg_payload_length": rng.uniform(2000, 5000, n),
    }
    return pd.DataFrame(data)

def _generate_ddos_samples(n: int = 50, rng: np.random.Generator | None = None) -> pd.DataFrame:
    """Generate *n* samples representing high-velocity DDoS flooding."""
    if rng is None:
        rng = np.random.default_rng(46)

    data = {
        "requests_per_minute": rng.uniform(250, 600, n),
        "failed_login_count": rng.uniform(0, 2, n),
        "unique_endpoints": rng.uniform(1, 3, n).round(),
        "avg_request_interval_ms": rng.uniform(2, 50, n),
        "session_duration_s": rng.uniform(5, 30, n),
        "error_rate": rng.uniform(0.0, 0.2, n),
        "avg_payload_length": rng.uniform(40, 200, n),
    }
    return pd.DataFrame(data)

def generate_training_data(
    n_normal: int = 1000,
    n_anomalous: int = 200,
    seed: int = 42,
) -> pd.DataFrame:
    """Return a DataFrame with normal + multi-class anomalous rows.

    Returns
    -------
    pd.DataFrame
        Columns match ``FEATURE_COLUMNS`` plus:
        - ``label`` column (0 = normal, 1 = anomalous)
        - ``class_label`` column (0 = normal, 1 = brute-force, 2 = sqli, 3 = xss, 4 = ddos)
    """
    rng = np.random.default_rng(seed)

    # 1. Normal
    normal_df = _generate_normal_samples(n_normal, rng)
    normal_df["label"] = 0
    normal_df["class_label"] = 0

    # Split anomalous count equally into 4 types
    per_class = n_anomalous // 4

    # 2. BruteForce (Class 1)
    bf_df = _generate_bruteforce_samples(per_class, rng)
    bf_df["label"] = 1
    bf_df["class_label"] = 1

    # 3. SQLi (Class 2)
    sqli_df = _generate_sqli_samples(per_class, rng)
    sqli_df["label"] = 1
    sqli_df["class_label"] = 2

    # 4. XSS (Class 3)
    xss_df = _generate_xss_samples(per_class, rng)
    xss_df["label"] = 1
    xss_df["class_label"] = 3

    # 5. DDoS (Class 4)
    ddos_df = _generate_ddos_samples(per_class, rng)
    ddos_df["label"] = 1
    ddos_df["class_label"] = 4

    combined = pd.concat([normal_df, bf_df, sqli_df, xss_df, ddos_df], ignore_index=True)

    # Shuffle
    combined = combined.sample(frac=1, random_state=seed).reset_index(drop=True)

    return combined
