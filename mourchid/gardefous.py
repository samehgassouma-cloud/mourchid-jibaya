"""Garde-fous : refus des demandes d'aide à la fraude fiscale."""
from __future__ import annotations

from .langue import normaliser

FRAUDE = [normaliser(x) for x in [
    # français
    "frauder", "fraude fiscale", "echapper a l impot", "eviter de payer l impot", "ne pas declarer", "cacher mes ventes",
    "cacher mon chiffre", "dissimuler", "fausse facture", "fausses factures", "sans facture pour ne pas", "blanchir",
    # anglais
    "evade tax", "tax evasion", "avoid paying tax", "hide my income", "hide income", "fake invoice", "not declare",
    # arabe / darija
    "تهرب", "نتهرب", "التهرب الجبائي", "نخبي", "نخبّي المداخيل", "نهرب من الاداء", "ما نصرحش", "فاتوره مزوره", "فواتير مزوره",
    "ما نخلصش الاداء", "نغش",
]]


def demande_frauduleuse(question: str) -> bool:
    q = " " + normaliser(question) + " "
    return any((f in q) if f[:1] >= "؀" else (" " + f + " ") in q for f in FRAUDE)
