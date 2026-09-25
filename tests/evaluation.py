"""Évaluation sur des formulations NOUVELLES, absentes des questions types des fiches (jeu de test indépendant).

Lancer : python tests/evaluation.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from mourchid.assistant import Assistant  # noqa: E402

JEU = [
    ("Ma SARL doit déclarer la TVA avant quel jour du mois ?", "mens_pm"),
    ("Je suis commerçant, dernier jour pour la déclaration du mois ?", "mens_pp"),
    ("شركة، التصريح الشهري قبل قداش في الشهر؟", "mens_pm"),
    ("Médecin : suis-je concerné par El Fatoora ?", "fe_scope"),
    ("Do lawyers have to issue e-invoices now?", "fe_scope"),
    ("شنوة الخطوات باش نبدا نعمل فواتير إلكترونية؟", "fe_how"),
    ("Le taux normal de la TVA en Tunisie ?", "tva"),
    ("قداش النسبة العادية متاع الأداء على القيمة المضافة؟", "tva"),
    ("Penalty if I pay my taxes late?", "penal"),
    ("خلصت متأخر، قداش نخلص خطية؟", "penal"),
    ("Payer mes impôts sur internet", "jibayti"),
    ("Les acomptes, c'est combien de fois par an ?", "acomptes"),
    ("Barème IRPP 2025 : tranche à 40 % ?", "irpp_bareme"),
    ("Is registration in the national business register compulsory?", "rne_qui"),
    ("Changement d'adresse du siège : délai de déclaration au registre ?", "rne_modif"),
    ("Qui est considéré comme bénéficiaire effectif d'une société ?", "rne_be"),
    ("شنوة الهوية الرقمية على التليفون؟", "mid_quoi"),
    ("Signature électronique à distance DigiGO : c'est quoi ?", "digigo_quoi"),
    ("Régime forfaitaire : montant à payer si chiffre d'affaires sous 10 000 dinars ?", "forfait"),
    ("Amnistie : faut-il payer tout le principal avant le 30 septembre ?", "amnistie_2026"),
    ("نحب نعرف رقم مركز الإرشاد الجبائي", "contact_dgi"),
    ("When do companies file the corporate tax return?", "is"),
    ("Taxe municipale sur le chiffre d'affaires des établissements", "tcl"),
    ("Retenue à la source sur les honoraires", "ras"),
    ("Deadline falls on a Sunday — can I file on Monday?", "report"),
]
HORS = ["Donne-moi une recette de couscous", "Quel est le meilleur téléphone ?", "chkoun rbe7 el match", "Horaires du train Tunis-Sousse"]

if __name__ == "__main__":
    a = Assistant(Path(__file__).resolve().parent.parent / "data", journal_path=":memory:")
    ok = 0
    for q, attendu in JEU:
        r = a.repondre(q)
        bon = r["type"] == "reponse" and r["fiche_id"] == attendu
        ok += bon
        if not bon:
            print("  ✗", q, "→", r.get("fiche_id") or r["type"], "| attendu :", attendu)
    hs = sum(a.repondre(q)["type"] == "inconnu" for q in HORS)
    print(f"Bonnes réponses : {ok}/{len(JEU)}  ·  hors sujet correctement refusés : {hs}/{len(HORS)}")
