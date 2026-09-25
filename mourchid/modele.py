"""Reformulation optionnelle par un modèle de langage, strictement limitée à la fiche retrouvée.

Désactivé par défaut (MODELE=aucun). Fournisseurs possibles : API Claude d'Anthropic ou modèle local via Ollama.
Si le modèle ne trouve pas l'information dans la fiche, il doit répondre « NO_SOURCE » : le bot renvoie alors
la réponse officielle de la fiche, telle quelle. En cas d'erreur réseau, même repli.
"""
from __future__ import annotations

import json
import urllib.request

CONSIGNE = (
    "Tu es un assistant fiscal tunisien. Réponds à la question UNIQUEMENT à partir de la FICHE ci-dessous, "
    "dans la langue {langue}, en 4 phrases au plus, sans rien ajouter qui ne soit pas dans la fiche. "
    "Si la fiche ne permet pas de répondre, écris exactement NO_SOURCE."
)
NOMS = {"ar": "arabe", "fr": "français", "en": "anglais"}


class Modele:
    def __init__(self, cfg: dict):
        self.fournisseur = cfg.get("MODELE", "aucun").lower()
        self.cfg = cfg

    @property
    def actif(self) -> bool:
        if self.fournisseur == "anthropic":
            return bool(self.cfg.get("ANTHROPIC_API_KEY"))
        return self.fournisseur == "ollama"

    def reformuler(self, question: str, fiche_texte: str, langue: str) -> str | None:
        if not self.actif:
            return None
        systeme = CONSIGNE.format(langue=NOMS.get(langue, "français"))
        message = f"FICHE :\n{fiche_texte}\n\nQUESTION : {question}"
        try:
            if self.fournisseur == "anthropic":
                corps = {"model": self.cfg.get("ANTHROPIC_MODEL", "claude-sonnet-4-5"), "max_tokens": 400,
                         "system": systeme, "messages": [{"role": "user", "content": message}]}
                req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(corps).encode(),
                                             headers={"content-type": "application/json", "anthropic-version": "2023-06-01",
                                                      "x-api-key": self.cfg["ANTHROPIC_API_KEY"]})
                with urllib.request.urlopen(req, timeout=20) as r:
                    texte = json.load(r)["content"][0]["text"].strip()
            else:
                corps = {"model": self.cfg.get("OLLAMA_MODEL", "qwen2.5:7b"), "stream": False,
                         "messages": [{"role": "system", "content": systeme}, {"role": "user", "content": message}]}
                req = urllib.request.Request(self.cfg.get("OLLAMA_URL", "http://localhost:11434") + "/api/chat",
                                             data=json.dumps(corps).encode(), headers={"content-type": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    texte = json.load(r)["message"]["content"].strip()
        except Exception:
            return None
        return None if "NO_SOURCE" in texte else texte
