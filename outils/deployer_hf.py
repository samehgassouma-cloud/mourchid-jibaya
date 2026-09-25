"""Déploie Mourchid Jibaya sur Hugging Face Spaces (Docker), en une commande.

Prérequis (une fois) :  pip install huggingface_hub
                         jeton HF « write » : https://huggingface.co/settings/tokens
Lancement :
    HF_TOKEN=hf_xxx ANTHROPIC_API_KEY=sk-ant-xxx CODE_ADMIN=xxxx python outils/deployer_hf.py <compte_hf>/mourchid-jibaya

- Envoie les fichiers par l'API (pas de git push : Hugging Face refuse les PDF de l'historique hors LFS).
- Enregistre la clé Claude et le code administrateur comme SECRETS du Space (jamais dans le code).
"""
import os
import sys
from pathlib import Path

from huggingface_hub import HfApi

R = Path(__file__).resolve().parent.parent
IGNORER = [".git/*", ".github/*", "docs/*", "dist/*", "tests/*", "outils/*", "**/__pycache__/*", "*.pyc",
           "data/journal.db", "data/sauvegardes/*", "config.env", ".venv/*"]


def main():
    if len(sys.argv) != 2 or "/" not in sys.argv[1]:
        sys.exit("Usage : python outils/deployer_hf.py <compte_hf>/<nom_du_space>")
    depot = sys.argv[1]
    api = HfApi(token=os.environ.get("HF_TOKEN"))
    api.create_repo(depot, repo_type="space", space_sdk="docker", exist_ok=True)
    for cle in ("ANTHROPIC_API_KEY", "CODE_ADMIN", "ANTHROPIC_MODEL", "EXPERT"):
        if os.environ.get(cle):
            api.add_space_secret(depot, cle, os.environ[cle])
            print("secret enregistré :", cle)
    api.upload_folder(folder_path=str(R), repo_id=depot, repo_type="space", ignore_patterns=IGNORER,
                      commit_message="Déploiement Mourchid Jibaya")
    nom = depot.replace("/", "-").replace("_", "-").lower()
    print(f"\nEspace : https://huggingface.co/spaces/{depot}\nApplication : https://{nom}.hf.space   (construction : 2 à 4 min)")


if __name__ == "__main__":
    main()
