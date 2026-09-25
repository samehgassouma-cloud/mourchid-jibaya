"""Assistant : garde-fous → recherche → seuil de confiance → réponse citée, ou transfert à un agent."""
from __future__ import annotations

from pathlib import Path

from .base import Base
from .echeances import Calendrier
from .gardefous import ALTERNATIVES, niveau_risque, sans_expressions_sensibles
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
    "refus": {"fr": "Je ne peux pas vous aider à dissimuler des revenus ou à éviter l'impôt de manière illégale : c'est une infraction fiscale, exposée à des pénalités et à des poursuites. "
                    "En revanche, si vous êtes en difficulté, il existe des voies légales : régulariser votre situation, bénéficier de l'amnistie fiscale 2026 si vous êtes concerné, "
                    "choisir le régime adapté à votre activité ou demander des facilités de paiement à la recette des finances. Choisissez une piste ci-dessous ou parlez à un agent.",
              "ar": "لا يمكنني مساعدتك على إخفاء المداخيل أو التهرّب من الأداء بطريقة غير قانونية: فذلك مخالفة جبائية تعرّض صاحبها للخطايا والتتبّعات. "
                    "في المقابل، إن كنت تواجه صعوبة، توجد حلول قانونية: تسوية وضعيتك، الانتفاع بالعفو الجبائي لسنة 2026 إن كنت معنياً، "
                    "اختيار النظام الجبائي الملائم لنشاطك، أو طلب تسهيلات في الدفع لدى القباضة المالية. اختر أحد المسالك أدناه أو تحدّث مع عون.",
              "en": "I cannot help you hide income or avoid tax illegally: it is a tax offence, exposed to penalties and prosecution. "
                    "If you are in difficulty, there are legal options: regularise your situation, use the 2026 tax amnesty if it applies to you, "
                    "choose the regime suited to your activity or ask the tax collection office for payment facilities. Pick an option below or talk to an agent."},
    "vigilance": {"fr": "Rappel du cadre légal : toute vente doit être facturée et déclarée ; payer moins d'impôt n'est possible que par les dispositifs prévus par les textes "
                        "(régime adapté, déductions, avantages et amnisties votés). Je réponds uniquement dans ce cadre.",
                  "ar": "تذكير بالإطار القانوني: كل بيع يجب أن تصدر به فاتورة وأن يُصرَّح به؛ ولا يمكن التخفيف من الأداء إلا بالآليات التي تنصّ عليها النصوص "
                        "(النظام الملائم، الطرح، الامتيازات والعفو المصادق عليه). أجيب في هذا الإطار فقط.",
                  "en": "Legal reminder: every sale must be invoiced and declared; paying less tax is only possible through the schemes provided by law "
                        "(suitable regime, deductions, voted incentives and amnesties). I answer only within this framework."},
    "vigilance_seul": {"fr": "Voici les pistes légales qui pourraient vous concerner :", "ar": "إليك المسالك القانونية التي قد تهمّك:",
                       "en": "Here are the legal options that may concern you:"},
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

        risque = niveau_risque(question)
        if risque == "fraude":
            qid = self.journal.question(langue, question, "refus")
            return {"type": "refus", "langue": langue, "texte": MESSAGES["refus"][langue], "qid": qid,
                    "alternatives": self.alternatives(langue)}

        conv = self._conversation(question)
        if conv:
            self.journal.question(langue, question, "conversation")
            return {"type": "conversation", "langue": langue, "texte": MESSAGES[conv][langue]}

        # question sensible : on ne cherche que sur le vrai sujet, sans les mots « payer moins », « sans facture »…
        resultats = self.index.chercher(sans_expressions_sensibles(question) if risque else question)
        if risque == "vigilance" and not (resultats and resultats[0].suffisant):
            qid = self.journal.question(langue, question, "vigilance")
            return {"type": "vigilance", "langue": langue, "qid": qid,
                    "texte": MESSAGES["vigilance"][langue] + "\n" + MESSAGES["vigilance_seul"][langue],
                    "alternatives": self.alternatives(langue)}
        propositions = [{"id": r.fiche["id"], "titre": r.fiche["titre"].get(langue) or r.fiche["titre"]["fr"]} for r in resultats]
        if not resultats or not resultats[0].suffisant:
            qid = self.journal.question(langue, question, "inconnu", None, resultats[0].score if resultats else 0)
            return {"type": "inconnu", "langue": langue, "texte": MESSAGES["inconnu"][langue], "qid": qid,
                    "propositions": propositions}

        r = resultats[0]
        rep = self.reponse_fiche(r.fiche, langue, question, score=r.score, couverture=r.couverture,
                                 voir_aussi=propositions[1:])
        if risque == "vigilance":
            rep["vigilance"] = MESSAGES["vigilance"][langue]
        return rep

    def alternatives(self, langue: str) -> list:
        """Fiches présentant les voies légales (amnistie, régime adapté, pénalités, contact)."""
        out = []
        for i in ALTERNATIVES:
            f = self.base.get(i)
            if f and f.get("statut") != "brouillon":
                out.append({"id": f["id"], "titre": f["titre"].get(langue) or f["titre"]["fr"]})
        return out

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

    def contexte_transfert(self, question: str, langue: str) -> dict:
        """Ce que le bot a tenté avant le transfert : résultat et fiches les plus proches (pour l'agent)."""
        risque = niveau_risque(question)
        rs = self.index.chercher(sans_expressions_sensibles(question) if risque else question)
        if risque == "fraude":
            resultat = "refus"
        elif risque == "vigilance" and not (rs and rs[0].suffisant):
            resultat = "vigilance"
        elif rs and rs[0].suffisant:
            resultat = "reponse_donnee"
        else:
            resultat = "sans_source"
        return {"resultat": resultat, "langue_detectee": detect_lang(question),
                "fiches_proches": [{"id": r.fiche["id"], "titre": r.fiche["titre"], "score": r.score,
                                    "couverture": r.couverture, "source": r.fiche.get("source", {}).get("reference", "")} for r in rs]}
