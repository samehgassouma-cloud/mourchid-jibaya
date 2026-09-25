"""API d'administration (code requis dans l'en-tête X-Code-Admin) : fiches, validation experte, tickets, test du moteur."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..config import config
from ..deps import ASSISTANT, VERROU, admin
from ..schemas import Cloture, Identifiant, Test, Validation

router = APIRouter(prefix="/api/admin", tags=["Administration"], dependencies=[Depends(admin)])


@router.get("/fiches")
def fiches():
    return {"fiches": ASSISTANT.base.fiches, "bilan": ASSISTANT.base.bilan()}


@router.get("/tickets")
def tickets(statut: str | None = None):
    return {"tickets": ASSISTANT.journal.tickets(statut)}


@router.get("/stats")
def stats():
    return ASSISTANT.journal.stats()


@router.post("/fiche", summary="Créer ou modifier une fiche (utilisée immédiatement)")
def enregistrer(d: dict):
    try:
        with VERROU:
            f = ASSISTANT.base.enregistrer_fiche(d)
            ASSISTANT.reindexer()
    except (KeyError, ValueError) as e:
        raise HTTPException(400, str(e))
    return {"fiche": f}


@router.post("/valider", summary="Validation experte d'une fiche")
def valider(v: Validation):
    try:
        with VERROU:
            f = ASSISTANT.base.valider(v.id, v.expert or config().get("EXPERT"), v.statut)
            ASSISTANT.reindexer()
    except (KeyError, ValueError) as e:
        raise HTTPException(400, str(e))
    return {"fiche": f}


@router.post("/supprimer")
def supprimer(i: Identifiant):
    with VERROU:
        ok = ASSISTANT.base.supprimer(i.id)
        ASSISTANT.reindexer()
    return {"supprimee": ok}


@router.post("/ticket", summary="Répondre à un ticket et le clôturer")
def cloturer(c: Cloture):
    ASSISTANT.journal.fermer_ticket(c.numero, c.reponse, c.fiche_id)
    return {"ok": True}


@router.post("/tester", summary="Voir comment le moteur comprend une question")
def tester(t: Test):
    rs = ASSISTANT.index.chercher(t.question, 5)
    return {"termes": ASSISTANT.index.termes(t.question),
            "resultats": [{"id": r.fiche["id"], "titre": r.fiche["titre"].get("fr"), "score": r.score,
                           "couverture": r.couverture, "suffisant": r.suffisant, "mots": r.mots_trouves} for r in rs]}


@router.get("/export", summary="Télécharger la base de fiches (pour la versionner dans Git après validation)")
def exporter():
    from fastapi.responses import FileResponse
    return FileResponse(ASSISTANT.base.path, media_type="application/json", filename="fiches.json")
