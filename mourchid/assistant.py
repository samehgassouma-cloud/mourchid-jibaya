"""Assistant : garde-fous → recherche → seuil de confiance → réponse citée, ou transfert à un agent."""
from __future__ import annotations

from pathlib import Path

from .base import Base
from .echeances import Calendrier
from .gardefous import demande_frauduleuse
from .journal import Journal
from .langue import detect_lang, normaliser
from .lexique import Lexique
from .modele import Modele
from .recherche import Index

MESSAGES = {
    "bonjour": {"fr": "Bonjour ! Posez votre question fiscale : je réponds à partir des textes officiels et je cite la source.",
                "ar": "مرحباً! اطرح سؤالك الجبائي: أجيب انطلاقاً من النصوص الرسمية وأذكر المصدر.",
                "en": "Hello! Ask your tax question: I answer from official texts and cite the source."},
    "merci": {"fr": "Avec plaisir. Autre question ?", "ar": "بكل سرور. هل من سؤال آخر؟", "en": "You're welcome. Anything else?"},
    "inconnu": {"fr": "Je n'ai pas trouvé de source officielle suffisante pour répondre avec certitude. Je préfère ne pas deviner : vous pouvez transmettre la question à un agent.",
                "ar": "لم أجد مصدراً رسمياً كافياً للإجابة بيقين. أفضّل ألّا أخمّن: يمكنك إحالة السؤال على عون.",
                "en": "I could not find a sufficient official source to answer with certainty. I prefer not to guess: you can forward the question to an agent."},
    "refus": {"fr": "Je ne peux pas aider à éviter l'impôt de manière illégale. En revanche, je peux vous indiquer les dispositifs légaux : régularisation, échelonnement, régime adapté à votre activité.",
              "ar": "لا يمكنني المساعدة على التهرّب من الأداء. في المقابل، يمكنني توجيهك إلى الحلول القانونية: تسوية الوضعية، الدفع بالتقسيط، أو النظام الجبائي الملائم لنشاطك.",
              "en": "I cannot help avoid tax illegally. I can, however, point you to legal options: regularisation, payment plans, or the regime suited to your activity."},
}
SALUTATIONS = {"bonjour", "salut", "bonsoir", "hello", "hi", "مرحبا", "عسلامه", "السلام", "سلام", "اهلا", "صباح"}
REMERCIEMENTS = {"merci", "thanks", "thank", "شكرا", "يعيشك", "بارك"}


class Assistant:
    def __init__(self, dossier: Path, cfg: dict | None = None, journal_path: Path | str | None = None):
        dossier = Path(dossier)
        self.base = Base(dossier / "fiches.json")
        self.lexique = Lexique(dossier / "lexique.json")
        self.calendrier = Calendrier(dossier / "jours_feries.json")
        self.journal = Journal(journal_path or dossier / "journal.db")
        self.modele = Modele(cfg or {})
        self.reindexer()

    def reindexer(self):
        self.index = Index(self.base.publiques(), self.lexique)

    def _conversation(self, question: str):
        ms = normaliser(question).split()
        if 0 < len(ms) <= 4:
            if SALUTATIONS & set(ms):
                return "bonjour"
            if REMERCIEMENTS & set(ms):
                return "merci"
        return None

    def repondre(self, question: str, langue: str | None = None) -> dict:
        question = (question or "").strip()[:500]
        langue = langue if langue in ("ar", "fr", "en") else detect_lang(question)
        if not question:
            return {"type": "vide", "langue": langue}

        if demande_frauduleuse(question):
            qid = self.journal.question(langue, question, "refus")
            return {"type": "refus", "langue": langue, "texte": MESSAGES["refus"][langue], "qid": qid}

        conv = self._conversation(question)
        if conv:
            self.journal.question(langue, question, "conversation")
            return {"type": "conversation", "langue": langue, "texte": MESSAGES[conv][langue]}

        resultats = self.index.chercher(question)
        propositions = [{"id": r.fiche["id"], "titre": r.fiche["titre"].get(langue) or r.fiche["titre"]["fr"]} for r in resultats]
        if not resultats or not resultats[0].suffisant:
            qid = self.journal.question(langue, question, "inconnu", None, resultats[0].score if resultats else 0)
            return {"type": "inconnu", "langue": langue, "texte": MESSAGES["inconnu"][langue], "qid": qid,
                    "propositions": propositions}

        r = resultats[0]
        return self.reponse_fiche(r.fiche, langue, question, score=r.score, couverture=r.couverture,
                                  voir_aussi=propositions[1:])

    def reponse_fiche(self, f: dict, langue: str, question: str = "", score=None, couverture=None, voir_aussi=None) -> dict:
        texte = f["reponse"].get(langue) or f["reponse"]["fr"]
        reformule = self.modele.reformuler(question, texte, langue) if question else None
        qid = self.journal.question(langue, question or f["id"], "reponse", f["id"], score or 0)
        return {"type": "reponse", "langue": langue, "qid": qid, "fiche_id": f["id"],
                "titre": f["titre"].get(langue) or f["titre"]["fr"],
                "texte": reformule or texte, "mode": "modele" if reformule else "fiche",
                "source": f.get("source", {}), "statut": f.get("statut"), "verifie_le": f.get("verifie_le"),
                "validation_experte": f.get("validation_experte"), "action": f.get("action"),
                "score": score, "couverture": couverture, "voir_aussi": voir_aussi or []}
