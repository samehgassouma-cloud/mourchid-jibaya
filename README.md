# Mourchid Jibaya · مرشد جباية

Assistant fiscal IA 24h/24, en arabe, darija, français et anglais, qui répond **uniquement à partir des textes officiels** et cite chaque référence.

- Hackathon national IA & Finances publiques — 25-26 septembre 2026
- Défi principal : **T9** (chatbot / agent virtuel IA 24h/24) · défi complémentaire : **T4** (facilitation pour les contribuables)
- Équipe : Sameh Gassouma · Cyrine Gassouma

## Travaux préparatoires (déclaration, art. 6.1 du cahier des charges)

Avant le hackathon, l'équipe avait réalisé une recherche documentaire sur les sources fiscales officielles et une maquette
exploratoire. **Le code de ce dépôt a été entièrement réécrit pendant le hackathon** (à partir du 25/09/2026, 17h00) ;
l'historique Git en fait foi. Les faits et textes des fiches proviennent de la base documentaire préparatoire (déclarée),
convertie au nouveau format ; les questions types, le lexique et la validation experte sont réalisés pendant le hackathon.

## Démarrage

1. Installer Python 3.9 ou plus récent (aucune autre bibliothèque).
2. Windows : double-cliquer sur `lancer_windows.bat` · macOS / Linux : `./lancer_mac_linux.sh` (ou `python3 serveur.py`).
3. Le navigateur s'ouvre sur **http://localhost:8000**. Administration : **http://localhost:8000/admin** (code `2026`, modifiable dans `config.env`).

## Parcours usager et administration

- **Parler à un agent** : à tout moment (ou quand aucune source ne suffit), l'usager choisit le service compétent — information fiscale, bureau de contrôle, recette des finances, RNE, identité numérique — et transmet sa question ; le ticket arrive dans `/admin` avec le service.
- **Pour l'administration** : onglet public d'indicateurs en direct — questions posées, réponses sourcées sans agent, taux de résolution, transferts par service, questions sans source (textes à clarifier), refus, sujets les plus demandés, temps d'agent économisé (estimation, hypothèse modifiable).

## Version hors ligne (téléphone, sans Internet)

`dist/Mourchid_Jibaya_hors_ligne.html` s'ouvre d'un clic dans n'importe quel navigateur, y compris sur téléphone et sans connexion.
Elle reprend l'interface et embarque le moteur en JavaScript (`web/moteur.js`), portage fidèle du moteur Python.
Reconstruire : `python outils/construire_hors_ligne.py` · vérifier que les deux moteurs répondent pareil (Node.js requis) :
`python outils/verifier_parite.py` (89/89 questions identiques, échéances et vérification identiques).
Sans serveur, pas d'administration ni d'envoi de ticket : l'usager est orienté vers le Centre d'information fiscale à distance.

## Architecture

```
question ─► garde-fous (fraude → refus)
         ─► langue : détection, normalisation de l'arabe, racinisation légère, correction des fautes
         ─► lexique de concepts (AR / darija / FR / EN → jeton commun)
         ─► recherche BM25 sur les fiches (titre, questions types, mots-clés, réponse)
         ─► seuil de confiance (score, couverture, ≥ 2 termes)
              ├─ suffisant   → réponse de la fiche + source officielle + lien + état de validation
              │                (reformulation optionnelle par un modèle de langage, limitée à la fiche)
              └─ insuffisant → « je ne sais pas » + fiches proches + ticket pour un agent
                               → file d'attente dans /admin → l'expert répond → nouvelle fiche
```

| Dossier / fichier | Rôle |
|---|---|
| `mourchid/langue.py` | détection de langue, normalisation, racinisation, distance d'édition |
| `mourchid/lexique.py` + `data/lexique.json` | concepts multilingues (modifiable sans code) |
| `mourchid/recherche.py` | index BM25 pondéré par champ, seuils de confiance |
| `mourchid/gardefous.py` | refus des demandes d'aide à la fraude |
| `mourchid/echeances.py` + `data/jours_feries.json` | calendrier fiscal par profil, report des dimanches et jours fériés |
| `mourchid/verification.py` | vérification d'une déclaration mensuelle de TVA (montants saisis par l'usager) |
| `mourchid/base.py` + `data/fiches.json` | fiches officielles, sauvegardes horodatées, validation experte |
| `mourchid/journal.py` | journal SQLite des questions et tickets |
| `mourchid/modele.py` | reformulation optionnelle (API Claude ou Ollama local), désactivée par défaut |
| `serveur.py` | serveur web et API REST (dont `/api/tableau` : indicateurs agrégés pour l'administration, sans donnée personnelle) |
| `web/index.html`, `web/admin.html` | interface usager trilingue et page d'administration |
| `web/moteur.js`, `outils/construire_hors_ligne.py` | moteur JavaScript et construction de la version hors ligne |
| `outils/verifier_parite.py` | contrôle que les moteurs Python et JavaScript donnent les mêmes réponses |
| `tests/` | tests unitaires et évaluation indépendante |

## Résultats

- `python -m unittest discover -s tests` : 14 tests (dont 53 questions de non-régression en FR, AR/darija, EN).
- `python tests/evaluation.py` : jeu indépendant de 25 formulations nouvelles → **24/25** bonnes fiches ; 4/4 questions hors sujet correctement transférées.
- Temps de réponse moyen (sans modèle de langage) : < 1 ms par question.

## Données

- Textes officiels publics et licites : loi de finances 2026, codes fiscaux, notes communes DGI, loi n° 2018-52 (RNE), décret n° 2019-54 ; portails jibaya.tn, RNE et TunTrust. Chaque fiche indique sa référence, son lien et son état (source officielle / à confirmer / interne).
- Données simulées : montants saisis dans « Vérifier ma déclaration ». Aucune donnée personnelle ou confidentielle ; aucun accès aux systèmes de l'administration.

## Bibliothèques, modèles et outils tiers (déclaration)

- Python 3, bibliothèque standard uniquement (`http.server`, `sqlite3`, `json`, `unicodedata`, `re`, `math`, `unittest`).
- Interface HTML / CSS / JavaScript sans framework ni ressource externe.
- Modèle de langage optionnel, désactivé par défaut : API Claude (Anthropic) ou modèle local via Ollama.
- Aucun modèle entraîné par l'équipe.
- Développement assisté par IA : Claude (Anthropic).

## Limites

- 13 fiches restent « à confirmer » sur le texte officiel ; la base doit être validée par la DGI.
- Couverture limitée aux sujets des fiches ; les autres questions sont transférées à un agent.
- Dates des fêtes religieuses estimées ; montant exact des pénalités non calculé.

---
الأستاذة سماح قسومة — مدرّبة دولية
