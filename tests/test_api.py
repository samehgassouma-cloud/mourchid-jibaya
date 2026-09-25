"""Tests de l'API FastAPI (contrat HTTP, validation, sécurité de l'administration). Nécessite httpx."""
import os
import unittest

os.environ.setdefault("JOURNAL_PATH", ":memory:")
os.environ["CODE_ADMIN"] = "code-de-test"
os.environ.pop("ANTHROPIC_API_KEY", None)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

C = TestClient(app)
ADMIN = {"X-Code-Admin": "code-de-test"}


class TestApi(unittest.TestCase):
    def test_pages(self):
        for url in ("/", "/admin", "/assets/app.js", "/moteur.js", "/donnees.js", "/docs"):
            self.assertEqual(C.get(url).status_code, 200, url)

    def test_question_darija_citee_et_expliquee(self):
        r = C.post("/api/question", json={"question": "أنا محامي، لازمني فاتورة إلكترونية؟"}).json()
        self.assertEqual((r["type"], r["fiche_id"], r["langue"]), ("reponse", "fe_scope", "ar"))
        self.assertTrue(r["source"]["reference"])
        self.assertIn("factelec", r["explication"]["concepts"])
        self.assertEqual(r["mode"], "fiche")  # sans clé : jamais d'appel au modèle, texte officiel tel quel

    def test_hors_sujet_et_fraude(self):
        self.assertEqual(C.post("/api/question", json={"question": "Quel temps fait-il à Tunis ?"}).json()["type"], "inconnu")
        self.assertEqual(C.post("/api/question", json={"question": "comment cacher mes revenus au fisc"}).json()["type"], "refus")

    def test_validation_des_entrees(self):
        self.assertEqual(C.post("/api/question", json={"question": "x" * 501}).status_code, 422)
        self.assertEqual(C.post("/api/ticket", json={"question": "", "service": "fisc"}).status_code, 422)
        self.assertEqual(C.post("/api/verification", json={"periode": "août"}).status_code, 422)

    def test_ticket_et_tableau(self):
        t = C.post("/api/ticket", json={"question": "Question sans réponse", "service": "rne"}).json()
        self.assertTrue(t["id"].startswith("MJ-"))
        self.assertEqual(t["service"], "rne")
        self.assertGreaterEqual(C.get("/api/tableau").json()["tickets"], 1)

    def test_verification_tva(self):
        r = C.post("/api/verification", json={"profil": "pm", "periode": "2026-08", "ca_ht": 10000, "taux": 19,
                                              "tva_declaree": 1900, "tva_deductible": 200}).json()
        self.assertEqual(r["points"][0]["code"], "tva_ok")

    def test_administration_protegee(self):
        self.assertEqual(C.get("/api/admin/fiches").status_code, 401)
        self.assertEqual(C.get("/api/admin/fiches", headers={"X-Code-Admin": "mauvais"}).status_code, 401)
        self.assertEqual(C.get("/api/admin/fiches", headers=ADMIN).status_code, 200)
        self.assertEqual(C.post("/api/admin/tester", headers=ADMIN, json={"question": "taux de TVA"}).status_code, 200)


if __name__ == "__main__":
    unittest.main()
