import unittest
from pathlib import Path

from mourchid.assistant import Assistant

DATA = Path(__file__).resolve().parent.parent / "data"

# Questions d'évaluation (formulations libres, fautes de frappe et darija comprises)
CAS = [
    ("Quand déposer la déclaration mensuelle d'une SARL ?", "mens_pm"),
    ("Je suis avocat : la facture électronique est-elle obligatoire ?", "fe_scope"),
    ("Comment sont calculés les acomptes provisionnels ?", "acomptes"),
    ("J'ai déposé en retard, que risque-je ?", "penal"),
    ("وقتاش آخر أجل للتصريح الشهري لشركتي؟", "mens_pm"),
    ("أنا محامي، لازمني فاتورة إلكترونية؟", "fe_scope"),
    ("قداش الأقساط الاحتياطية؟", "acomptes"),
    ("فاتني الأجل، شنوة الخطية؟", "penal"),
    ("When is the monthly return due for an individual?", "mens_pp"),
    ("Is e-invoicing mandatory for doctors?", "fe_scope"),
    ("What are the VAT rates?", "tva"),
    ("How do I register on El Fatoora?", "fe_how"),
    ("Comment obtenir le certificat de signature électronique ?", "fe_how"),
    ("كيفاش نعمل الهوية الرقمية؟", "mid_comment"),
    ("شنوة هي e-houwiya", "mid_quoi"),
    ("Comment obtenir DigiGO ?", "digigo_comment"),
    ("ديجيغو شنوة؟", "digigo_quoi"),
    ("How do I get DigiGO?", "digigo_comment"),
    ("What is Mobile ID?", "mid_quoi"),
    ("quelle différence entre mobile id et digigo", "id_diff"),
    ("Qui doit s'immatriculer au RNE ?", "rne_qui"),
    ("لازمني نسجل في السجل الوطني للمؤسسات؟", "rne_qui"),
    ("J'ai changé de gérant, quel délai pour le RNE ?", "rne_modif"),
    ("بدّلت المسيّر، قدّاش عندي وقت باش نصرّح؟", "rne_modif"),
    ("وقتاش نودع القوائم المالية في السجل الوطني؟", "rne_ef"),
    ("C'est quoi le bénéficiaire effectif ?", "rne_be"),
    ("المستفيد الحقيقي شنوة", "rne_be"),
    ("amende si pas inscrit au RNE", "rne_sanc"),
    ("how to file RNE online", "rne_ligne"),
    ("Barème de l'impôt sur le revenu", "irpp_bareme"),
    ("قداش الضريبة على الدخل، الشرائح؟", "irpp_bareme"),
    ("What are the income tax brackets?", "irpp_bareme"),
    ("taux TCL", "tcl"),
    ("رقم الهاتف متاع الأداءات", "contact_dgi"),
    ("declaratoin mensuele societe", "mens_pm"),
    ("factur electronik obligatoir avocat", "fe_scope"),
    ("quand payer les acomtes", "acomptes"),
    ("A quoi sert le Mobile ID ?", "mid_usage"),
    ("Commerçant : date de la déclaration annuelle IR ?", "irpp"),
    ("Registre national des entreprises : dépôt du bilan", "rne_ef"),
    ("Je veux créer ma société, que faire ?", "creation"),
    ("Who must register with the RNE?", "rne_qui"),
    ("Je veux profiter de l'amnistie fiscale, jusqu'à quand ?", "amnistie_2026"),
    ("العفو الجبائي وقتاش يوفى؟", "amnistie_2026"),
    ("Is there a tax amnesty in 2026?", "amnistie_2026"),
    ("Combien paie un commerçant au régime forfaitaire ?", "forfait"),
    ("قداش الضريبة في النظام التقديري؟", "forfait"),
    ("How much is the flat-rate tax?", "forfait"),
    ("خرجت من التقديري، نجم نصرح كل ثلاثة أشهر؟", "forfait_reel"),
    ("La date limite tombe un jour férié, que faire ?", "report"),
    ("Quand déposer la déclaration de l'employeur ?", "employeur"),
    ("شنوة الخصم من المورد؟", "ras"),
    ("Quand déposer la déclaration de l'impôt sur les sociétés ?", "is"),
]
HORS_SUJET = ["Quel temps fait-il à Sousse ?", "Quel est le prix du timbre de voyage ?", "Who won the football match?", "وقتاش يبدا الماتش؟"]


class TestAssistant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.a = Assistant(DATA, journal_path=":memory:")

    def test_reponses_citees(self):
        for q, attendu in CAS:
            with self.subTest(q=q):
                r = self.a.repondre(q)
                self.assertEqual(r["type"], "reponse", r)
                self.assertEqual(r["fiche_id"], attendu)
                self.assertTrue(r["source"].get("reference"))

    def test_hors_sujet_transfere(self):
        for q in HORS_SUJET:
            with self.subTest(q=q):
                self.assertEqual(self.a.repondre(q)["type"], "inconnu")

    def test_refus(self):
        self.assertEqual(self.a.repondre("كيفاش نتهرب من الأداء؟")["type"], "refus")

    def test_langue_de_reponse(self):
        self.assertEqual(self.a.repondre("قداش الأقساط الاحتياطية؟")["langue"], "ar")

    def test_conversation(self):
        self.assertEqual(self.a.repondre("عسلامة")["type"], "conversation")


if __name__ == "__main__":
    unittest.main()
