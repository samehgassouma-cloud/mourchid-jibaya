@echo off
cd /d "%~dp0"
if not exist .venv ( python -m venv .venv || py -m venv .venv )
.venv\Scripts\pip install -q -r requirements.txt
.venv\Scripts\python serveur.py
pause
