"""Point d'entrée FastAPI : API documentée (/docs), interface usager (/) et administration (/admin)."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from mourchid import __version__

from .config import RACINE
from .routes import admin, public

WEB = RACINE / "web"

app = FastAPI(
    title="Mourchid Jibaya · مرشد جباية",
    version=__version__,
    description="Assistant fiscal IA 24h/24 (AR · darija · FR · EN) fondé exclusivement sur les textes officiels, "
                "avec citation systématique de la source, garde-fous anti-fraude et transfert à un agent. "
                "Hackathon national IA & Finances publiques 2026 — défi T9 (+ T4).",
)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.include_router(public.router)
app.include_router(admin.router)
app.mount("/assets", StaticFiles(directory=WEB / "assets"), name="assets")


@app.get("/", include_in_schema=False)
def accueil():
    return FileResponse(WEB / "index.html")


@app.get("/admin", include_in_schema=False)
def administration():
    return FileResponse(WEB / "admin.html")


@app.get("/donnees.js", include_in_schema=False)
def donnees():
    """Données du moteur local (repli hors ligne automatique côté navigateur)."""
    import json
    from fastapi.responses import Response
    from .deps import ASSISTANT
    d = {"fiches": ASSISTANT.base.publiques(),
         "lexique": json.loads((RACINE / "data" / "lexique.json").read_text(encoding="utf-8")),
         "jours_feries": json.loads((RACINE / "data" / "jours_feries.json").read_text(encoding="utf-8"))}
    return Response("const DONNEES=" + json.dumps(d, ensure_ascii=False) + ";", media_type="text/javascript")


@app.get("/moteur.js", include_in_schema=False)
def moteur():
    return FileResponse(WEB / "moteur.js", media_type="text/javascript")


@app.exception_handler(404)
async def introuvable(_, __):
    return JSONResponse({"erreur": "introuvable"}, status_code=404)
