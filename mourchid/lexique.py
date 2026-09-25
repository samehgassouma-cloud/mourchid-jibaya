"""Lexique de concepts : relie les formulations arabes, darija, françaises et anglaises d'une même notion.

Chaque concept devient un jeton commun « §concept » ajouté à la question ET aux fiches :
« الأداء على القيمة المضافة », « TVA » et « VAT » se retrouvent ainsi sur le même terrain.
Le fichier data/lexique.json est modifiable sans toucher au code.
"""
from __future__ import annotations

import json
from pathlib import Path

from .langue import normaliser


class Lexique:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.concepts: dict[str, list[str]] = {}
        if self.path.exists():
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            self.concepts = {k: [normaliser(v) for v in vals] for k, vals in raw.items() if not k.startswith("_")}

    def concepts_de(self, texte: str) -> list[str]:
        t = " " + normaliser(texte) + " "
        trouves = []
        for cle, formes in self.concepts.items():
            for f in formes:
                # une forme arabe peut être précédée d'un préfixe (و، ب، ال…) : recherche en sous-chaîne
                if (f and f[0] >= "؀" and f in t) or (" " + f + " ") in t:
                    trouves.append("§" + cle)
                    break
        return trouves
