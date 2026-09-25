#!/bin/sh
# Premier lancement : crée un environnement virtuel et installe FastAPI (une seule fois).
cd "$(dirname "$0")"
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt; }
.venv/bin/python serveur.py
