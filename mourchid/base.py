"""Base de fiches officielles : chargement, sauvegarde horodatée, ajout, modification, validation experte."""
from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

STATUTS = ("source_officielle", "a_confirmer", "interne", "brouillon")
CHAMPS = ("id", "domaine", "titre", "questions", "mots_cles", "reponse", "source", "statut",
          "verifie_le", "validation_experte", "note", "action")


class Base:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.charger()

    def charger(self):
        data = json.loads(self.path.read_text(encoding="utf-8"))
        self.meta = {k: v for k, v in data.items() if k != "fiches"}
        self.fiches: list[dict] = data["fiches"]

    def enregistrer(self):
        sauv = self.path.parent / "sauvegardes"
        sauv.mkdir(exist_ok=True)
        shutil.copy2(self.path, sauv / f"fiches_{datetime.now():%Y%m%d_%H%M%S}.json")
        data = dict(self.meta)
        data["mise_a_jour"] = datetime.now().isoformat(timespec="minutes")
        data["fiches"] = self.fiches
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self.path)

    def get(self, fid: str):
        return next((f for f in self.fiches if f["id"] == fid), None)

    def publiques(self) -> list[dict]:
        return [f for f in self.fiches if f.get("statut") != "brouillon"]

    def enregistrer_fiche(self, d: dict) -> dict:
        if not d.get("id") or not d.get("reponse"):
            raise ValueError("id et reponse obligatoires")
        if d.get("statut", "a_confirmer") not in STATUTS:
            raise ValueError("statut inconnu")
        fiche = {k: d[k] for k in CHAMPS if k in d}
        fiche.setdefault("statut", "a_confirmer")
        for i, f in enumerate(self.fiches):
            if f["id"] == fiche["id"]:
                self.fiches[i] = {**f, **fiche}
                break
        else:
            self.fiches.append(fiche)
        self.enregistrer()
        return self.get(fiche["id"])

    def valider(self, fid: str, expert: str, statut: str = "source_officielle") -> dict:
        f = self.get(fid)
        if not f:
            raise KeyError(fid)
        f["statut"] = statut
        f["validation_experte"] = {"par": expert, "le": datetime.now().isoformat(timespec="minutes")}
        self.enregistrer()
        return f

    def supprimer(self, fid: str) -> bool:
        avant = len(self.fiches)
        self.fiches = [f for f in self.fiches if f["id"] != fid]
        if len(self.fiches) != avant:
            self.enregistrer()
            return True
        return False

    def bilan(self) -> dict:
        b = {s: 0 for s in STATUTS}
        for f in self.fiches:
            b[f.get("statut", "a_confirmer")] = b.get(f.get("statut", "a_confirmer"), 0) + 1
        b["total"] = len(self.fiches)
        b["validees"] = sum(1 for f in self.fiches if f.get("validation_experte"))
        return b
