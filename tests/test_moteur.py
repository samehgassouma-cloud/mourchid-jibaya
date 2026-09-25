import unittest
from datetime import date
from pathlib import Path

from mourchid.echeances import Calendrier
from mourchid.gardefous import demande_frauduleuse
from mourchid.langue import detect_lang, distance, mots, normaliser

DATA = Path(__file__).resolve().parent.parent / "data"


class TestLangue(unittest.TestCase):
    def test_normalisation_arabe(self):
        self.assertEqual(normaliser("الأقساطُ الاحتياطيّة"), "الاقساط الاحتياطيه")

    def test_racines(self):
        self.assertIn("فاتور", " ".join(mots("والفاتورة")))

    def test_detection(self):
        self.assertEqual(detect_lang("وقتاش نخلص؟"), "ar")
        self.assertEqual(detect_lang("What are the VAT rates?"), "en")
        self.assertEqual(detect_lang("Quels sont les taux de TVA ?"), "fr")

    def test_distance(self):
        self.assertEqual(distance("declaration", "declaratoin", 2), 2)


class TestGardeFous(unittest.TestCase):
    def test_fraude(self):
        self.assertTrue(demande_frauduleuse("كيفاش نتهرب من الأداء؟"))
        self.assertTrue(demande_frauduleuse("Comment ne pas déclarer mes ventes ?"))
        self.assertFalse(demande_frauduleuse("Quand déclarer la TVA ?"))


class TestCalendrier(unittest.TestCase):
    def setUp(self):
        self.cal = Calendrier(DATA / "jours_feries.json")

    def test_dimanche(self):   # 15 novembre 2026 : dimanche -> lundi 16
        d, motifs = self.cal.reporter(date(2026, 11, 15))
        self.assertEqual(d, date(2026, 11, 16))
        self.assertEqual(len(motifs), 1)

    def test_jour_ferie(self):  # 15 octobre (fête de l'évacuation) -> 16 octobre
        d, _ = self.cal.reporter(date(2026, 10, 15))
        self.assertEqual(d, date(2026, 10, 16))

    def test_echeances_societe(self):
        e = self.cal.echeances("pm", 60, date(2026, 9, 25))
        self.assertEqual(e[0]["type"], "mens")
        self.assertEqual(e[0]["date"], "2026-09-28")


if __name__ == "__main__":
    unittest.main()
