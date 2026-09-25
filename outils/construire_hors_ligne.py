"""Construit la version hors ligne : un seul fichier HTML, sans serveur ni Internet (utile sur téléphone).

Elle reprend l'interface web/index.html et remplace les appels au serveur par le moteur JavaScript
web/moteur.js, alimenté par les données du dossier data/. Les fiches en brouillon sont exclues.
Lancement : python outils/construire_hors_ligne.py   →   dist/Mourchid_Jibaya_hors_ligne.html
"""
import json
from pathlib import Path

R = Path(__file__).resolve().parent.parent


def construire() -> Path:
    page = (R / "web" / "index.html").read_text(encoding="utf-8")
    moteur = (R / "web" / "moteur.js").read_text(encoding="utf-8")
    fiches = json.loads((R / "data" / "fiches.json").read_text(encoding="utf-8"))["fiches"]
    donnees = {
        "fiches": [f for f in fiches if f.get("statut") != "brouillon"],
        "lexique": json.loads((R / "data" / "lexique.json").read_text(encoding="utf-8")),
        "jours_feries": json.loads((R / "data" / "jours_feries.json").read_text(encoding="utf-8")),
    }
    ancien = "async function api(url,corps){"
    assert ancien in page, "fonction api introuvable dans index.html"
    page = page.replace(ancien, "async function api(url,corps){return MJ.api(url,corps||{});", 1)
    bloc = ("<script>const DONNEES=" + json.dumps(donnees, ensure_ascii=False).replace("</", "<\\/") + ";</script>\n"
            "<script>\n" + moteur + "\n</script>\n")
    page = page.replace("<script>\nconst T={", bloc + "<script>\nconst T={", 1)
    page = page.replace("<title>Mourchid Jibaya · مرشد جباية</title>", "<title>Mourchid Jibaya · مرشد جباية (hors ligne)</title>", 1)
    sortie = R / "dist" / "Mourchid_Jibaya_hors_ligne.html"
    sortie.parent.mkdir(exist_ok=True)
    sortie.write_text(page, encoding="utf-8")
    return sortie


if __name__ == "__main__":
    p = construire()
    print(p, round(p.stat().st_size / 1024), "Ko")
