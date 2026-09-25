"""Serveur web de Mourchid Jibaya (bibliothèque standard Python uniquement).

Lancement :  python serveur.py            → http://localhost:8000   (administration : /admin)
Options   :  --port 8080  --hote 0.0.0.0  --sans-navigateur
"""
from __future__ import annotations

import argparse
import json
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from mourchid import __version__
from mourchid.assistant import Assistant
from mourchid.echeances import PROFILS
from mourchid.langue import detect_lang
from mourchid.rappels import ics
from mourchid.verification import verifier

RACINE = Path(__file__).resolve().parent
SERVICES = ("fisc", "controle", "recouvrement", "rne", "identite")
WEB = RACINE / "web"


def lire_config() -> dict:
    cfg = {"CODE_ADMIN": "2026", "EXPERT": "Expert DGI", "MODELE": "aucun"}
    for nom in ("config.env.exemple", "config.env"):
        p = RACINE / nom
        if p.exists():
            for ligne in p.read_text(encoding="utf-8").splitlines():
                if "=" in ligne and not ligne.strip().startswith("#"):
                    k, v = ligne.split("=", 1)
                    if v.strip() or nom == "config.env":
                        cfg[k.strip()] = v.strip()
    return cfg


CFG = lire_config()
ASSISTANT = Assistant(RACINE / "data", CFG)
VERROU = threading.Lock()


class Gestionnaire(BaseHTTPRequestHandler):
    server_version = "MourchidJibaya/" + __version__

    def log_message(self, *args):
        pass

    # ---------- utilitaires ----------
    def _json(self, obj, code=200):
        corps = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def _fichier(self, p: Path, type_="text/html; charset=utf-8"):
        if not p.is_file():
            return self._json({"erreur": "introuvable"}, 404)
        corps = p.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", type_)
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def _corps(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n > 200_000:
            return {}
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except json.JSONDecodeError:
            return {}

    def _admin(self) -> bool:
        if self.headers.get("X-Code-Admin") == CFG.get("CODE_ADMIN"):
            return True
        self._json({"erreur": "code administrateur incorrect"}, 401)
        return False

    # ---------- GET ----------
    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path in ("/", "/index.html"):
            return self._fichier(WEB / "index.html")
        if u.path == "/admin":
            return self._fichier(WEB / "admin.html")
        if u.path == "/api/sante":
            return self._json({"etat": "ok", "version": __version__, "fiches": ASSISTANT.base.bilan(),
                               "modele": ASSISTANT.modele.fournisseur if ASSISTANT.modele.actif else "aucun"})
        if u.path == "/api/echeances":
            return self._json({"profils": PROFILS, "echeances": ASSISTANT.calendrier.echeances(q.get("profil", "pp"), int(q.get("jours", 120)))})
        if u.path == "/api/fiche":
            f = ASSISTANT.base.get(q.get("id", ""))
            if not f or f.get("statut") == "brouillon":
                return self._json({"erreur": "introuvable"}, 404)
            return self._json(ASSISTANT.reponse_fiche(f, q.get("langue", "fr")))
        if u.path == "/api/tableau":
            # indicateurs agrégés pour l'administration (aucune donnée personnelle : uniquement des comptages)
            st = ASSISTANT.journal.stats()
            par = st["par_resultat"]
            top = []
            for x in st["fiches_les_plus_demandees"]:
                f = ASSISTANT.base.get(x["fiche_id"])
                if f:
                    top.append({"id": f["id"], "titre": f["titre"], "n": x["n"]})
            return self._json({"portee": "serveur", "questions": st["questions"] - par.get("conversation", 0),
                               "reponses": par.get("reponse", 0), "inconnus": par.get("inconnu", 0), "refus": par.get("refus", 0),
                               "tickets": st["tickets"], "tickets_par_service": st["tickets_par_service"],
                               "par_langue": st["par_langue"], "top": top, "fiches": ASSISTANT.base.bilan()})
        if u.path == "/api/sources":
            vues = {}
            for f in ASSISTANT.base.publiques():
                s = f.get("source", {})
                if s.get("reference"):
                    vues.setdefault(s["reference"], s.get("url", ""))
            return self._json({"sources": [{"reference": k, "url": v} for k, v in sorted(vues.items())]})
        # administration
        if u.path.startswith("/api/admin/"):
            if not self._admin():
                return
            if u.path == "/api/admin/fiches":
                return self._json({"fiches": ASSISTANT.base.fiches, "bilan": ASSISTANT.base.bilan()})
            if u.path == "/api/admin/tickets":
                return self._json({"tickets": ASSISTANT.journal.tickets(q.get("statut"))})
            if u.path == "/api/admin/stats":
                return self._json(ASSISTANT.journal.stats())
        return self._json({"erreur": "introuvable"}, 404)

    # ---------- POST ----------
    def do_POST(self):
        u = urlparse(self.path)
        d = self._corps()
        if u.path == "/api/question":
            return self._json(ASSISTANT.repondre(d.get("question", ""), d.get("langue")))
        if u.path == "/api/ticket":
            question = (d.get("question") or "").strip()[:500]
            if not question:
                return self._json({"erreur": "question vide"}, 400)
            service = d.get("service") if d.get("service") in SERVICES else "fisc"
            langue = detect_lang(question)   # langue de la question (et non de l'interface)
            carte = ASSISTANT.journal.ticket(langue, question, (d.get("contact") or "")[:120], service,
                                             ASSISTANT.contexte_transfert(question, langue))
            return self._json(carte)
        if u.path == "/api/rappels":
            mois = max(1, min(int(d.get("mois") or 6), 12))
            ech = ASSISTANT.calendrier.echeances(d.get("profil", "pp"), mois * 31)
            return self._json({"nombre": len(ech), "ics": ics(ech, d.get("langue", "fr"), d.get("alertes") or ("j7", "j2", "j0"))})
        if u.path == "/api/verification":
            return self._json(verifier(d, ASSISTANT.calendrier))
        if u.path.startswith("/api/admin/"):
            if not self._admin():
                return
            try:
                with VERROU:
                    if u.path == "/api/admin/fiche":
                        f = ASSISTANT.base.enregistrer_fiche(d)
                        ASSISTANT.reindexer()
                        return self._json({"fiche": f})
                    if u.path == "/api/admin/valider":
                        f = ASSISTANT.base.valider(d["id"], d.get("expert") or CFG.get("EXPERT"), d.get("statut", "source_officielle"))
                        ASSISTANT.reindexer()
                        return self._json({"fiche": f})
                    if u.path == "/api/admin/supprimer":
                        ok = ASSISTANT.base.supprimer(d.get("id", ""))
                        ASSISTANT.reindexer()
                        return self._json({"supprimee": ok})
                    if u.path == "/api/admin/ticket":
                        ASSISTANT.journal.fermer_ticket(int(d["numero"]), d.get("reponse", ""), d.get("fiche_id"))
                        return self._json({"ok": True})
                    if u.path == "/api/admin/tester":
                        rs = ASSISTANT.index.chercher(d.get("question", ""), 5)
                        return self._json({"termes": ASSISTANT.index.termes(d.get("question", "")),
                                           "resultats": [{"id": r.fiche["id"], "titre": r.fiche["titre"].get("fr"), "score": r.score,
                                                          "couverture": r.couverture, "suffisant": r.suffisant, "mots": r.mots_trouves} for r in rs]})
            except (KeyError, ValueError) as e:
                return self._json({"erreur": str(e)}, 400)
        return self._json({"erreur": "introuvable"}, 404)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--hote", default="127.0.0.1")
    ap.add_argument("--sans-navigateur", action="store_true")
    a = ap.parse_args()
    srv = ThreadingHTTPServer((a.hote, a.port), Gestionnaire)
    url = f"http://localhost:{a.port}"
    b = ASSISTANT.base.bilan()
    print(f"Mourchid Jibaya {__version__} — {b['total']} fiches ({b['source_officielle']} officielles, {b['a_confirmer']} à confirmer)")
    print(f"  Assistant      : {url}\n  Administration : {url}/admin  (code : CODE_ADMIN, 2026 par défaut)\n  Arrêter        : Ctrl+C")
    if not a.sans_navigateur:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
