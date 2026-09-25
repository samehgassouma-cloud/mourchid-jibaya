"""Calendrier fiscal personnalisé (défi T4), avec report des dimanches et jours fériés.

Échéances (sources : agenda fiscal DGI sur jibaya.tn ; Code IRPP/IS) :
  - déclaration mensuelle : le 15 du mois suivant (personnes physiques) ou le 28 (sociétés) ;
  - acomptes provisionnels : juin, septembre, décembre — le 25 (personnes physiques) ou le 28 (sociétés) ;
  - déclaration annuelle de l'impôt sur le revenu : 25 avril (commerçants), 25 mai (prestataires et professions
    libérales), 25 juillet (artisans) ; impôt sur les sociétés : 25 mars ;
  - déclaration de l'employeur : 28 février.
Si le dernier jour tombe un dimanche ou un jour férié, le dépôt reste possible le premier jour ouvrable suivant.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

PROFILS = {
    "pp": {"fr": "Commerçant (personne physique)", "ar": "تاجر (شخص طبيعي)", "en": "Trader (individual)"},
    "lib": {"fr": "Profession libérale / prestataire", "ar": "مهنة حرة / مسدي خدمات", "en": "Liberal profession / service provider"},
    "art": {"fr": "Artisan", "ar": "حرفي", "en": "Craftsperson"},
    "pm": {"fr": "Société (personne morale)", "ar": "شركة (شخص معنوي)", "en": "Company (legal entity)"},
}
LIBELLES = {
    "mens": {"fr": "Déclaration mensuelle", "ar": "التصريح الشهري", "en": "Monthly return"},
    "acpt": {"fr": "Acompte provisionnel", "ar": "قسط احتياطي", "en": "Provisional instalment"},
    "ir": {"fr": "Déclaration annuelle de l'impôt sur le revenu", "ar": "التصريح السنوي بالضريبة على الدخل", "en": "Annual income tax return"},
    "is": {"fr": "Déclaration annuelle de l'impôt sur les sociétés", "ar": "التصريح السنوي بالضريبة على الشركات", "en": "Annual corporate tax return"},
    "emp": {"fr": "Déclaration de l'employeur", "ar": "تصريح المؤجر", "en": "Employer's return"},
}


class Calendrier:
    def __init__(self, path: Path):
        raw = json.loads(Path(path).read_text(encoding="utf-8")) if Path(path).exists() else {}
        self.fixes = raw.get("fixes", {})
        self.estimes = raw.get("estimes", {})

    def ferie(self, d: date):
        """Renvoie le libellé du jour férié (dict trilingue) ou None."""
        return self.estimes.get(d.isoformat()) or self.fixes.get(d.strftime("%m-%d"))

    def reporter(self, d: date) -> tuple[date, list]:
        """Reporte au premier jour ouvrable ; renvoie la date et les motifs du report."""
        motifs = []
        while d.weekday() == 6 or self.ferie(d):
            f = self.ferie(d)
            motifs.append({"date": d.isoformat(), "motif": f or {"fr": "Dimanche", "ar": "يوم أحد", "en": "Sunday"}})
            d += timedelta(days=1)
        return d, motifs

    def echeances(self, profil: str, jours: int = 120, aujourdhui: date | None = None) -> list[dict]:
        profil = profil if profil in PROFILS else "pp"
        auj = aujourdhui or date.today()
        fin = auj + timedelta(days=max(1, min(jours, 400)))
        brut = []
        for a in (auj.year, auj.year + 1):
            if profil != "art":   # artisans : régime sans déclaration mensuelle dans ce prototype
                for m in range(1, 13):
                    jour = 28 if profil == "pm" else 15
                    brut.append(("mens", date(a + (m == 12), m % 12 + 1, jour), f"{a}-{m:02d}"))
                for m in (6, 9, 12):
                    brut.append(("acpt", date(a, m, 28 if profil == "pm" else 25), None))
            if profil == "pm":
                brut.append(("is", date(a, 3, 25), str(a - 1)))
            else:
                mois_ir = {"pp": 4, "lib": 5, "art": 7}[profil]
                brut.append(("ir", date(a, mois_ir, 25), str(a - 1)))
            brut.append(("emp", date(a, 2, 28), str(a - 1)))
        out = []
        for type_, d, periode in brut:
            reelle, motifs = self.reporter(d)
            if auj <= reelle <= fin:
                out.append({"type": type_, "libelle": LIBELLES[type_], "date_legale": d.isoformat(),
                            "date": reelle.isoformat(), "report": motifs, "periode": periode,
                            "jours_restants": (reelle - auj).days})
        out.sort(key=lambda x: x["date"])
        return out
