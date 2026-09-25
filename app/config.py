"""Configuration : variables d'environnement (prioritaires, ex. secrets Hugging Face) puis config.env local."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
CLES = ("CODE_ADMIN", "EXPERT", "MODELE", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "MODELE_TIMEOUT",
        "OLLAMA_URL", "OLLAMA_MODEL", "JOURNAL_PATH")
DEFAUTS = {"CODE_ADMIN": "2026", "EXPERT": "Expert DGI", "MODELE": "auto"}


@lru_cache
def config() -> dict:
    cfg = dict(DEFAUTS)
    fichier = RACINE / "config.env"
    if fichier.exists():
        for ligne in fichier.read_text(encoding="utf-8").splitlines():
            if "=" in ligne and not ligne.strip().startswith("#"):
                k, v = ligne.split("=", 1)
                if v.strip():
                    cfg[k.strip()] = v.strip()
    for k in CLES:
        if os.environ.get(k):
            cfg[k] = os.environ[k]
    return cfg
