"""Construit la version hors ligne : un seul fichier HTML, sans serveur ni Internet (téléphone, salle sans Wi-Fi).

Elle reprend l'interface web/index.html (CSS et JS intégrés) et branche le moteur JavaScript web/moteur.js,
alimenté par les données du dossier data/. Les fiches en brouillon sont exclues.
Lancement : python outils/construire_hors_ligne.py   →   dist/Mourchid_Jibaya_hors_ligne.html
"""
import json
from pathlib import Path

R = Path(__file__).resolve().parent.parent
W = R / "web"


def construire() -> Path:
    page = (W / "index.html").read_text(encoding="utf-8")
    lire = lambda p: (W / p).read_text(encoding="utf-8")  # noqa: E731
    fiches = json.loads((R / "data" / "fiches.json").read_text(encoding="utf-8"))["fiches"]
    donnees = {
        "fiches": [f for f in fiches if f.get("statut") != "brouillon"],
        "lexique": json.loads((R / "data" / "lexique.json").read_text(encoding="utf-8")),
        "jours_feries": json.loads((R / "data" / "jours_feries.json").read_text(encoding="utf-8")),
    }
    remplacements = {
        '<link rel="stylesheet" href="/assets/app.css">': "<style>\n" + lire("assets/app.css") + "\n</style>",
        "<!--MOTEUR-->": ("<script>window.MJ_HORS_LIGNE=true;const DONNEES=" + json.dumps(donnees, ensure_ascii=False).replace("</", "<\\/")
                          + ";</script>\n<script>\n" + lire("moteur.js") + "\n</script>"),
        '<script src="/assets/i18n.js"></script>': "<script>\n" + lire("assets/i18n.js") + "\n</script>",
        '<script src="/assets/app.js"></script>': "<script>\n" + lire("assets/app.js") + "\n</script>",
        "<title>Mourchid Jibaya · مرشد جباية</title>": "<title>Mourchid Jibaya · مرشد جباية (hors ligne)</title>",
    }
    for avant, apres in remplacements.items():
        assert avant in page, f"repère introuvable dans index.html : {avant[:40]}"
        page = page.replace(avant, apres, 1)
    sortie = R / "dist" / "Mourchid_Jibaya_hors_ligne.html"
    sortie.parent.mkdir(exist_ok=True)
    sortie.write_text(page, encoding="utf-8")
    return sortie


if __name__ == "__main__":
    p = construire()
    print(p, round(p.stat().st_size / 1024), "Ko")
