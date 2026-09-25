#!/bin/sh
# Régénère QR code, pitchs FR/AR (pptx + pdf) et notes FR/AR avec les URL finales.
# Usage : DEMO_URL=https://xxx.hf.space GITHUB_URL=https://github.com/xxx/mourchid-jibaya ./generer.sh
set -e
cd "$(dirname "$0")"
python3 qr.py
LANGUE=fr node pitch.js && LANGUE=ar node pitch.js
python3 note.py
for f in Pitch_Mourchid_Jibaya.pptx Pitch_Mourchid_Jibaya_AR.pptx; do soffice --headless --convert-to pdf "$f" >/dev/null; done
mv -f Pitch_Mourchid_Jibaya*.p* Note_de_synthese_Mourchid_Jibaya*.pdf ..
