"""Traitement de la langue : détection, normalisation et découpage en mots.

Gère l'arabe standard, la darija tunisienne (en graphie arabe), le français et l'anglais.
"""
from __future__ import annotations

import re
import unicodedata

# --- Arabe -------------------------------------------------------------------
_HARAKAT = re.compile("[ً-ْٰٓ-ٕـ]")   # voyelles, shadda, tatweel
_AR_MAP = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
    "ى": "ي", "ئ": "ي", "ؤ": "و", "ة": "ه",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "،": " ", "؛": " ", "؟": " ",
})
_AR_CHARS = re.compile("[؀-ۿ]")
AR_PREFIXES = ("وبال", "وال", "بال", "كال", "فال", "لل", "ال", "و", "ف", "ب", "ل")
AR_SUFFIXES = ("هما", "كما", "ها", "هم", "كم", "نا", "ات", "ون", "ين", "يه", "ه", "ي")

# --- Mots vides (retirés de la recherche) -----------------------------------------
STOP = set("""
le la les un une des du de d l et ou à a au aux en pour par sur dans avec sans est sont je j tu il elle nous vous ils
elles on ce cet cette ces mon ma mes ton ta tes son sa ses leur leurs que qui quoi quel quelle quels quelles dont
ne pas plus ai as avons avez ont suis es être avoir faire fait dois doit peux peut comment quand combien
the a an of to in on for and or is are be do does can how what when which who my your i we you it at by with
from as this that these those should must will
في من على الى عن مع هل ما ماذا كيف متى هو هي انا انت نحن هذا هذه ذلك التي الذي او ثم كل
شنوه شنو اشنوه اش كيفاش وقتاش قداش باش نحب لازم لازمني برشا ياسر هاذا هاذي متاع متاعي عندي
""".split())

EN_HINTS = set("the what when how is are do does my for income tax return which who can should".split())
FR_HINTS = set("le la les quand comment est des pour quel quelle mon ma impôt déclaration je dois".split())


def is_arabic(text: str) -> bool:
    return bool(_AR_CHARS.search(text))


def detect_lang(text: str) -> str:
    """Renvoie 'ar', 'fr' ou 'en'."""
    letters = [c for c in text if c.isalpha()]
    if letters and sum(1 for c in letters if _AR_CHARS.match(c)) / len(letters) > 0.3:
        return "ar"
    words = set(re.findall(r"[a-zà-ÿ']+", text.lower()))
    return "en" if len(words & EN_HINTS) > len(words & FR_HINTS) else "fr"


def normaliser(text: str) -> str:
    """Minuscules, arabe unifié, accents retirés, ponctuation remplacée par des espaces."""
    t = _HARAKAT.sub("", text.translate(_AR_MAP)).lower()
    t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c) or is_arabic(c))
    t = re.sub(r"[^\w\s]", " ", t.replace("'", " ").replace("’", " "))
    return re.sub(r"\s+", " ", t).strip()


def racine(mot: str) -> str:
    """Racinisation légère : préfixes et suffixes arabes, pluriels français/anglais."""
    if is_arabic(mot):
        for p in AR_PREFIXES:
            if mot.startswith(p) and len(mot) - len(p) >= 3:
                mot = mot[len(p):]
                break
        for s in AR_SUFFIXES:
            if mot.endswith(s) and len(mot) - len(s) >= 3:
                mot = mot[: -len(s)]
                break
        return mot
    if len(mot) > 4 and mot.endswith(("s", "x")):
        mot = mot[:-1]
    return mot


def mots(text: str) -> list[str]:
    """Liste des racines utiles d'un texte (mots vides retirés)."""
    return [racine(m) for m in normaliser(text).split() if m not in STOP and len(m) > 1]


def distance(a: str, b: str, limite: int) -> int:
    """Distance d'édition bornée (arrêt dès que la limite est dépassée)."""
    if abs(len(a) - len(b)) > limite:
        return limite + 1
    prec = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cour = [i]
        for j, cb in enumerate(b, 1):
            cour.append(min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (ca != cb)))
        if min(cour) > limite:
            return limite + 1
        prec = cour
    return prec[-1]
