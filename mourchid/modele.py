"""Génération contrainte (RAG) : un modèle de langage rédige la réponse à partir de la SEULE fiche retrouvée.

- La recherche (BM25 + lexique) choisit la fiche ; le modèle ne fait que reformuler dans la langue de l'usager.
- Si la fiche ne permet pas de répondre, le modèle doit écrire « NO_SOURCE » : on renvoie alors la fiche officielle.
- Toute erreur (pas de clé, réseau, délai) → repli silencieux sur la fiche officielle : la démo ne casse jamais.
Fournisseurs : API Claude (Anthropic) ou modèle local via Ollama (souveraineté). Désactivé si aucune clé.
"""
from __future__ import annotations

import json
import urllib.request

CONSIGNE = (
    "Tu es Mourchid Jibaya, assistant fiscal de l'administration tunisienne. "
    "Réponds à la QUESTION uniquement à partir de la FICHE officielle fournie. "
    "Règles : (1) rédige en {langue}{darija}, clairement, en 4 phrases au plus ; "
    "(2) n'ajoute aucun chiffre, date, taux ni condition absents de la fiche ; "
    "(3) adresse-toi directement à l'usager et applique la fiche à sa situation si elle le permet ; "
    "(4) pas de titre, pas de liste, pas de formule de politesse, ne cite pas la référence (elle est affichée à part) ; "
    "(5) si la fiche ne permet pas de répondre à la question, écris exactement NO_SOURCE."
)
NOMS = {"ar": "arabe", "fr": "français", "en": "anglais"}


class Modele:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        f = (cfg.get("MODELE") or "").lower()
        # « auto » (défaut) : Claude si une clé est fournie, sinon aucun modèle
        self.fournisseur = ("anthropic" if cfg.get("ANTHROPIC_API_KEY") else "aucun") if f in ("", "auto") else f

    @property
    def actif(self) -> bool:
        if self.fournisseur == "anthropic":
            return bool(self.cfg.get("ANTHROPIC_API_KEY"))
        return self.fournisseur == "ollama"

    @property
    def nom(self) -> str | None:
        if not self.actif:
            return None
        if self.fournisseur == "anthropic":
            return self.cfg.get("ANTHROPIC_MODEL") or "claude-haiku-4-5"
        return self.cfg.get("OLLAMA_MODEL") or "qwen2.5:7b"

    def reformuler(self, question: str, fiche_texte: str, langue: str, fiche: dict | None = None) -> str | None:
        if not self.actif:
            return None
        darija = " (l'usager écrit en darija tunisienne : réponds en arabe simple et accessible)" if langue == "ar" else ""
        systeme = CONSIGNE.format(langue=NOMS.get(langue, "français"), darija=darija)
        titre = ((fiche or {}).get("titre") or {}).get(langue, "")
        message = f"FICHE — {titre}\n{fiche_texte}\n\nQUESTION : {question}"
        try:
            if self.fournisseur == "anthropic":
                corps = {"model": self.nom, "max_tokens": 400, "temperature": 0,
                         "system": systeme, "messages": [{"role": "user", "content": message}]}
                req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(corps).encode(),
                                             headers={"content-type": "application/json", "anthropic-version": "2023-06-01",
                                                      "x-api-key": self.cfg["ANTHROPIC_API_KEY"]})
                with urllib.request.urlopen(req, timeout=float(self.cfg.get("MODELE_TIMEOUT", 12))) as r:
                    texte = json.load(r)["content"][0]["text"].strip()
            else:
                corps = {"model": self.nom, "stream": False, "options": {"temperature": 0},
                         "messages": [{"role": "system", "content": systeme}, {"role": "user", "content": message}]}
                req = urllib.request.Request(self.cfg.get("OLLAMA_URL", "http://localhost:11434") + "/api/chat",
                                             data=json.dumps(corps).encode(), headers={"content-type": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    texte = json.load(r)["message"]["content"].strip()
        except Exception:
            return None
        return None if (not texte or "NO_SOURCE" in texte) else texte
