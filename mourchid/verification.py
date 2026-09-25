"""Vérification d'une déclaration mensuelle de TVA avant dépôt (défi T4) — sur les montants saisis par l'usager.

Aucune donnée n'est lue dans un système de l'administration ; rien n'est transmis.
"""
from __future__ import annotations

from datetime import date

from .echeances import Calendrier

TAUX = (19, 13, 7)
TOLERANCE = 1.0   # dinar


def verifier(d: dict, cal: Calendrier) -> dict:
    def nombre(k):
        try:
            return max(0.0, float(str(d.get(k, 0)).replace(",", ".").replace(" ", "")))
        except ValueError:
            return 0.0

    profil = "pm" if d.get("profil") == "pm" else "pp"
    ca, declaree, deductible = nombre("ca_ht"), nombre("tva_declaree"), nombre("tva_deductible")
    taux = int(nombre("taux")) if int(nombre("taux")) in TAUX else 19
    points = []

    attendue = round(ca * taux / 100, 3)
    ecart = round(declaree - attendue, 3)
    if abs(ecart) <= TOLERANCE:
        points.append({"niveau": "ok", "code": "tva_ok", "attendue": attendue})
    else:
        points.append({"niveau": "alerte", "code": "tva_ecart", "attendue": attendue, "declaree": declaree, "ecart": ecart})

    net = round(declaree - deductible, 3)
    points.append({"niveau": "info", "code": "a_payer" if net >= 0 else "credit", "montant": abs(net)})

    try:
        a, m = (int(x) for x in str(d.get("periode", "")).split("-")[:2])
        legale = date(a + (m == 12), m % 12 + 1, 28 if profil == "pm" else 15)
        limite, report = cal.reporter(legale)
        points.append({"niveau": "info", "code": "date_limite", "date": limite.isoformat(), "report": report})
        if d.get("date_depot"):
            depot = date.fromisoformat(d["date_depot"])
            if depot > limite:
                points.append({"niveau": "critique", "code": "retard", "jours": (depot - limite).days})
            else:
                points.append({"niveau": "ok", "code": "dans_les_delais"})
    except (ValueError, TypeError):
        points.append({"niveau": "alerte", "code": "periode_invalide"})

    ordre = {"ok": 0, "info": 0, "alerte": 1, "critique": 2}
    pire = max(ordre[p["niveau"]] for p in points)
    return {"statut": ["ok", "alerte", "critique"][pire], "points": points, "taux": taux}
