#!/bin/sh
# Régénère QR code, pitch (pptx + pdf) et note de synthèse avec les URL finales.
# Usage : DEMO_URL=https://xxx.hf.space GITHUB_URL=https://github.com/xxx/mourchid-jibaya ./generer.sh
set -e
cd "$(dirname "$0")"
python3 qr.py
node pitch.js
python3 note.py
soffice --headless --convert-to pdf Pitch_Mourchid_Jibaya.pptx >/dev/null
cp Pitch_Mourchid_Jibaya.pdf Pitch_Mourchid_Jibaya.pptx Note_de_synthese_Mourchid_Jibaya.pdf ..
