"""API publique (usager) : questions, transfert à un agent, échéances, rappels, vérification TVA, indicateurs."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from mourchid import __version__
from mourchid.echeances import PROFILS
from mourchid.langue import detect_lang
from mourchid.rappels import ics
from mourchid.verification import verifier

from ..deps import ASSISTANT
from ..schemas import Profil, Question, Rappels, Ticket, Verification

router = APIRouter(prefix="/api", tags=["Usager"])


@router.get("/sante", summary="État du service")
def sante():
    return {"etat": "ok", "version": __version__, "fiches": ASSISTANT.base.bilan(),
            "modele": ASSISTANT.modele.nom or "aucun"}


@router.post("/question", summary="Poser une question (AR / darija / FR / EN)")
def question(q: Question):
    return ASSISTANT.repondre(q.question, q.langue)


@router.post("/ticket", summary="Transférer la question à un agent du service compétent")
def ticket(t: Ticket):
    question = t.question.strip()
    langue = detect_lang(question)
    return ASSISTANT.journal.ticket(langue, question, t.contact, t.service, ASSISTANT.contexte_transfert(question, langue))


@router.get("/echeances", summary="Calendrier fiscal personnalisé (reports dimanches et jours fériés)")
def echeances(profil: Profil = "pp", jours: int = Query(120, ge=1, le=400)):
    return {"profils": PROFILS, "echeances": ASSISTANT.calendrier.echeances(profil, jours)}


@router.post("/rappels", summary="Fichier calendrier .ics avec alertes J-7, J-2, jour J")
def rappels(r: Rappels):
    ech = ASSISTANT.calendrier.echeances(r.profil, r.mois * 31)
    return {"nombre": len(ech), "ics": ics(ech, r.langue, tuple(r.alertes))}


@router.post("/verification", summary="Pré-contrôle d'une déclaration mensuelle de TVA")
def verification(v: Verification):
    return verifier(v.model_dump(exclude_none=True), ASSISTANT.calendrier)


@router.get("/fiche", summary="Fiche officielle par identifiant")
def fiche(id: str, langue: str = "fr"):
    f = ASSISTANT.base.get(id)
    if not f or f.get("statut") == "brouillon":
        raise HTTPException(404, "introuvable")
    return ASSISTANT.reponse_fiche(f, langue if langue in ("ar", "fr", "en") else "fr")


@router.get("/sources", summary="Textes officiels cités par la base")
def sources():
    vues: dict[str, str] = {}
    for f in ASSISTANT.base.publiques():
        s = f.get("source", {})
        if s.get("reference"):
            vues.setdefault(s["reference"], s.get("url", ""))
    return {"sources": [{"reference": k, "url": v} for k, v in sorted(vues.items())]}


@router.get("/tableau", tags=["Pilotage"], summary="Indicateurs agrégés pour l'administration (aucune donnée personnelle)")
def tableau():
    st = ASSISTANT.journal.stats()
    par = st["par_resultat"]
    top = [{"id": f["id"], "titre": f["titre"], "n": x["n"]}
           for x in st["fiches_les_plus_demandees"] if (f := ASSISTANT.base.get(x["fiche_id"]))]
    questions = st["questions"] - par.get("conversation", 0)
    demandes = questions + st["tickets_directs"]
    resolues = max(0, par.get("reponse", 0) - st["tickets_apres_reponse"])
    return {"portee": "serveur", "questions": questions, "demandes": demandes, "resolues": resolues,
            "taux": round(resolues * 100 / demandes) if demandes else 0,
            "tickets_apres_reponse": st["tickets_apres_reponse"], "tickets_directs": st["tickets_directs"],
            "reponses": par.get("reponse", 0), "inconnus": par.get("inconnu", 0), "refus": par.get("refus", 0),
            "vigilance": par.get("vigilance", 0), "tickets": st["tickets"], "tickets_par_service": st["tickets_par_service"],
            "par_langue": st["par_langue"], "top": top, "fiches": ASSISTANT.base.bilan()}
