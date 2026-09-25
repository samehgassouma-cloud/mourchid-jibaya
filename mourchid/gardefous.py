"""Garde-fous face à l'évasion fiscale, à deux niveaux.

- « fraude »    : demande explicite d'aide à la fraude (cacher des revenus, fausses factures…) → refus
                  + orientation vers les dispositifs légaux et un agent.
- « vigilance » : question qui peut viser une pratique interdite (« payer moins d'impôt », « sans facture »,
                  « au noir »…) ou question d'information sur la fraude (« quelle sanction pour… ») →
                  rappel du cadre légal ; si une fiche officielle répond, la réponse est donnée avec ce rappel,
                  sinon le bot propose uniquement les pistes légales.
"""
from __future__ import annotations

from .langue import normaliser

FRAUDE = [normaliser(x) for x in [
    # français
    "frauder", "fraude fiscale", "echapper a l impot", "eviter de payer l impot", "ne pas declarer", "cacher mes ventes",
    "cacher mon chiffre", "cacher mes revenus", "dissimuler", "fausse facture", "fausses factures", "facture fictive",
    "factures fictives", "fausse declaration", "sous declarer", "minorer mon chiffre", "sans facture pour ne pas", "blanchir",
    # anglais
    "evade tax", "tax evasion", "avoid paying tax", "hide my income", "hide income", "fake invoice", "false invoice",
    "not declare", "underreport", "launder",
    # arabe / darija
    "تهرب", "نتهرب", "التهرب الجبائي", "نخبي", "نخبّي المداخيل", "نهرب من الاداء", "ما نصرحش", "فاتوره مزوره", "فواتير مزوره",
    "فاتوره وهميه", "فواتير وهميه", "تزوير", "نزور", "ما نخلصش الاداء", "نغش", "غش جبائي",
]]

VIGILANCE = [normaliser(x) for x in [
    # français
    "payer moins d impot", "payer moins d impots", "payer moins de taxe", "payer moins de tva", "reduire mes impots",
    "reduire mon impot", "sans facture", "sans facturer", "ne pas facturer", "au noir", "en espece sans", "eviter le controle",
    "echapper au controle", "sans que le fisc", "le fisc ne", "ne pas payer la tva",
    # anglais
    "pay less tax", "reduce my tax", "without invoice", "without an invoice", "off the books", "under the table",
    "avoid an audit", "avoid audit", "cash only",
    # arabe / darija
    "ننقص من الاداء", "ننقص الاداء", "نقص من الاداء", "نخلص اقل", "ندفع اقل", "بلاش فاتوره", "بلا فاتوره", "دون فاتوره",
    "بدون فاتوره", "ما نعملش فاتوره", "بالنوار", "في النوار", "نتفادى المراقبه", "نهرب من المراقبه", "ما يعرفوش",
]]

# question d'information (sanction, définition) : on informe au lieu de refuser
INFORMATION = [normaliser(x) for x in [
    "sanction", "sanctions", "penalite", "penalites", "amende", "qu est ce que", "definition", "risque", "risques",
    "penalty", "penalties", "what is", "punishment", "risk",
    "عقوبه", "عقوبات", "خطيه", "خطايا", "ما هو", "ما هي", "شنوه", "شنيه", "جزاء",
]]

# fiches présentant les voies légales (affichées en cas de refus ou de vigilance)
ALTERNATIVES = ["amnistie_2026", "forfait", "penal", "contact_dgi"]


def _contient(q: str, liste) -> bool:
    return any((f in q) if f[:1] >= "؀" else (" " + f + " ") in q for f in liste)


def niveau_risque(question: str) -> str | None:
    q = " " + normaliser(question) + " "
    if _contient(q, FRAUDE):
        return "vigilance" if _contient(q, INFORMATION) else "fraude"
    if _contient(q, VIGILANCE):
        return "vigilance"
    return None


def sans_expressions_sensibles(question: str) -> str:
    """Question normalisée, privée des expressions de fraude ou de vigilance : ce qui reste est le vrai sujet
    (ex. « الأقساط الاحتياطية بلا فاتورة » → « الاقساط الاحتياطيه »)."""
    q = " " + normaliser(question) + " "
    for f in sorted(FRAUDE + VIGILANCE, key=len, reverse=True):
        q = q.replace(f if f[:1] >= "؀" else " " + f + " ", " ")
    return " ".join(q.split())


def demande_frauduleuse(question: str) -> bool:
    return niveau_risque(question) == "fraude"
