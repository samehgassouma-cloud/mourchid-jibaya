"""Moteur de recherche BM25 sur les fiches officielles (étape « retrieval »).

- Chaque fiche est indexée à partir de son titre, de ses questions types, de ses mots-clés et de sa réponse,
  dans les trois langues, avec des poids par champ.
- Les concepts du lexique (§tva, §rne…) relient les langues entre elles.
- Les fautes de frappe sont corrigées vers le mot connu le plus proche (distance d'édition).
- Une réponse n'est proposée que si le score ET la couverture de la question dépassent les seuils.
"""
from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field

from .langue import distance, is_arabic, mots
from .lexique import Lexique

POIDS = {"titre": 2, "questions": 2, "mots_cles": 2, "reponse": 1, "concepts": 3}
K1, B = 1.2, 0.75
SEUIL_SCORE = 4.0        # score BM25 minimal
SEUIL_COUVERTURE = 0.34  # part minimale des mots de la question retrouvés dans la fiche


@dataclass
class Resultat:
    fiche: dict
    score: float
    couverture: float
    mots_trouves: list = field(default_factory=list)

    @property
    def suffisant(self) -> bool:
        return self.score >= SEUIL_SCORE and self.couverture >= SEUIL_COUVERTURE


class Index:
    def __init__(self, fiches: list[dict], lexique: Lexique):
        self.lexique = lexique
        self.fiches = [f for f in fiches if f.get("statut") != "brouillon"]
        self.docs: list[Counter] = []
        for f in self.fiches:
            c = Counter()
            textes = {
                "titre": " ".join(f.get("titre", {}).values()),
                "questions": " ".join(q for qs in f.get("questions", {}).values() for q in qs),
                "mots_cles": " ".join(f.get("mots_cles", [])),
                "reponse": " ".join(f.get("reponse", {}).values()),
            }
            for champ, texte in textes.items():
                for m in mots(texte):
                    c[m] += POIDS[champ]
            for concept in set(lexique.concepts_de(" ".join(textes.values()))):
                c[concept] += POIDS["concepts"]
            self.docs.append(c)
        self.N = len(self.docs) or 1
        self.longueur_moy = sum(sum(d.values()) for d in self.docs) / self.N
        df = Counter(m for d in self.docs for m in d)
        self.idf = {m: math.log(1 + (self.N - n + 0.5) / (n + 0.5)) for m, n in df.items()}
        self.vocab_ar = [m for m in self.idf if is_arabic(m) and len(m) >= 4]
        self.vocab_lat = [m for m in self.idf if not is_arabic(m) and not m.startswith("§") and len(m) >= 4]

    # ------------------------------------------------------------------
    def _corriger(self, m: str) -> str:
        """Remplace un mot inconnu par le mot connu le plus proche (fautes de frappe)."""
        if m in self.idf or len(m) < 5:
            return m
        limite = 1 if len(m) < 8 else 2
        meilleur, dist = m, limite + 1
        for v in (self.vocab_ar if is_arabic(m) else self.vocab_lat):
            d = distance(m, v, limite)
            if d < dist:
                meilleur, dist = v, d
        return meilleur

    def termes(self, question: str) -> list[str]:
        base = [self._corriger(m) for m in mots(question)]
        return base + self.lexique.concepts_de(question)

    def chercher(self, question: str, k: int = 3) -> list[Resultat]:
        q = self.termes(question)
        if not q:
            return []
        uniques = set(q)
        resultats = []
        for f, d in zip(self.fiches, self.docs):
            L = sum(d.values())
            s, trouves = 0.0, []
            for t in uniques:
                tf = d.get(t, 0)
                if not tf:
                    continue
                trouves.append(t)
                s += self.idf[t] * tf * (K1 + 1) / (tf + K1 * (1 - B + B * L / self.longueur_moy))
            if s:
                resultats.append(Resultat(f, round(s, 2), round(len(trouves) / len(uniques), 2), trouves))
        resultats.sort(key=lambda r: (r.score, r.couverture), reverse=True)
        return resultats[:k]
