"""Vérifie que le moteur JavaScript (version hors ligne) donne les mêmes réponses que le moteur Python.
Nécessite Node.js. Lancement : python outils/verifier_parite.py"""
import json
import subprocess
import sys
from pathlib import Path

R = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R))
from mourchid.assistant import Assistant  # noqa: E402
from mourchid.verification import verifier  # noqa: E402
from tests.evaluation import HORS, JEU  # noqa: E402
from tests.test_assistant import CAS, HORS_SUJET  # noqa: E402

questions = [q for q, _ in CAS + JEU] + HORS + HORS_SUJET + ["كيفاش نتهرب من الأداء؟", "عسلامة", "merci"]
cas_verif = [{"profil": "pm", "periode": "2026-08", "ca_ht": "10000", "taux": "19", "tva_declaree": "1500", "tva_deductible": "200", "date_depot": "2026-10-05"},
             {"profil": "pp", "periode": "2026-09", "ca_ht": "20000", "taux": "7", "tva_declaree": "1400", "tva_deductible": "2000"}]

a = Assistant(R / "data", journal_path=":memory:")
py = {"questions": [[a.repondre(q).get("type"), a.repondre(q).get("fiche_id")] for q in questions],
      "echeances": {p: [(e["type"], e["date"]) for e in a.calendrier.echeances(p, 400)] for p in ("pp", "lib", "art", "pm")},
      "verif": [verifier(c, a.calendrier)["points"] for c in cas_verif]}

donnees = {"fiches": a.base.publiques(), "lexique": json.loads((R / "data/lexique.json").read_text(encoding="utf-8")),
           "jours_feries": json.loads((R / "data/jours_feries.json").read_text(encoding="utf-8"))}
script = ("const DONNEES=" + json.dumps(donnees, ensure_ascii=False) + ";\n" + (R / "web/moteur.js").read_text(encoding="utf-8") +
          "\nconst Q=" + json.dumps(questions, ensure_ascii=False) + ";const V=" + json.dumps(cas_verif) + ";\n"
          "console.log(JSON.stringify({questions:Q.map(q=>{const r=MJ.repondre(q);return [r.type,r.fiche_id??null]}),"
          "echeances:Object.fromEntries(['pp','lib','art','pm'].map(p=>[p,MJ.echeances(p,400).map(e=>[e.type,e.date])])),"
          "verif:V.map(c=>MJ.verifier(c).points)}));")
js = json.loads(subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout)

ecarts = [(q, p, j) for q, p, j in zip(questions, py["questions"], js["questions"]) if p != j]
for q, p, j in ecarts:
    print("  ≠", q, "| python :", p, "| js :", j)
ech_ok = all([list(x) for x in py["echeances"][p]] == js["echeances"][p] for p in py["echeances"])
verif_ok = json.loads(json.dumps(py["verif"])) == js["verif"]
print(f"Questions identiques : {len(questions) - len(ecarts)}/{len(questions)} · échéances identiques : {ech_ok} · vérification identique : {verif_ok}")
sys.exit(1 if ecarts or not ech_ok or not verif_ok else 0)
