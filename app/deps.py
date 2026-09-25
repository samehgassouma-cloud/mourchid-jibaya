"""Dépendances partagées : instance unique de l'assistant, verrou d'écriture, contrôle du code administrateur."""
from __future__ import annotations

import hmac
import threading

from fastapi import Header, HTTPException

from mourchid.assistant import Assistant

from .config import RACINE, config

ASSISTANT = Assistant(RACINE / "data", config(), config().get("JOURNAL_PATH"))
VERROU = threading.Lock()


def admin(x_code_admin: str = Header(default="", alias="X-Code-Admin")) -> None:
    if not hmac.compare_digest(x_code_admin.encode(), config()["CODE_ADMIN"].encode()):
        raise HTTPException(status_code=401, detail="code administrateur incorrect")
