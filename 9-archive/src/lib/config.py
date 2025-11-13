import os
from typing import Any, Dict


def get_config() -> Dict[str, Any]:
    """
    Minimal config loader for quick-start.
    - Reads environment variables with prefix NAVERSEO_
    - Provides safe defaults.
    """
    cfg: Dict[str, Any] = {
        "mock_mode": True,
        "default_top_n": 5,
    }

    # Environment overrides
    env_prefix = "NAVERSEO_"
    for key, value in os.environ.items():
        if key.startswith(env_prefix):
            cfg[key[len(env_prefix) :].lower()] = value

    # Normalize booleans
    if isinstance(cfg.get("mock_mode"), str):
        cfg["mock_mode"] = cfg["mock_mode"].lower() in {"1", "true", "yes", "y"}

    # Normalize integers
    try:
        cfg["default_top_n"] = int(cfg.get("default_top_n", 5))
    except ValueError:
        cfg["default_top_n"] = 5

    return cfg

