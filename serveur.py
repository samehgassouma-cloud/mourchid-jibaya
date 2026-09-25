"""Lancement local de Mourchid Jibaya.

    python serveur.py               → http://localhost:8000   (administration : /admin · API : /docs)
    python serveur.py --port 8080 --hote 0.0.0.0 --sans-navigateur
"""
from __future__ import annotations

import argparse
import threading
import webbrowser

import uvicorn


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--hote", default="127.0.0.1")
    ap.add_argument("--sans-navigateur", action="store_true")
    a = ap.parse_args()
    url = f"http://localhost:{a.port}"
    print(f"Mourchid Jibaya → {url}   ·   administration : {url}/admin   ·   API : {url}/docs")
    if not a.sans_navigateur:
        threading.Timer(1.5, webbrowser.open, (url,)).start()
    uvicorn.run("app.main:app", host=a.hote, port=a.port, log_level="warning")


if __name__ == "__main__":
    main()
