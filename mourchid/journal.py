"""Journal SQLite : questions posées, tickets transmis aux agents, file d'apprentissage."""
from __future__ import annotations

import sqlite3
import threading
from datetime import datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, horodatage TEXT, langue TEXT, question TEXT,
  resultat TEXT, fiche_id TEXT, score REAL);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT, horodatage TEXT, langue TEXT, question TEXT,
  contact TEXT, statut TEXT DEFAULT 'ouvert', reponse TEXT, fiche_id TEXT, service TEXT);
"""


class Journal:
    def __init__(self, path: Path | str):
        self.cx = sqlite3.connect(str(path), check_same_thread=False)
        self.cx.row_factory = sqlite3.Row
        self.lock = threading.Lock()
        with self.lock:
            self.cx.executescript(SCHEMA)
            colonnes = [r[1] for r in self.cx.execute("PRAGMA table_info(tickets)")]
            if "service" not in colonnes:   # base créée par une version antérieure
                self.cx.execute("ALTER TABLE tickets ADD COLUMN service TEXT")

    @staticmethod
    def _now():
        return datetime.now().isoformat(timespec="seconds")

    def question(self, langue, question, resultat, fiche_id=None, score=0.0) -> int:
        with self.lock, self.cx:
            c = self.cx.execute("INSERT INTO questions(horodatage,langue,question,resultat,fiche_id,score) VALUES(?,?,?,?,?,?)",
                                (self._now(), langue, question, resultat, fiche_id, score))
            return c.lastrowid

    def ticket(self, langue, question, contact="", service="fisc") -> dict:
        with self.lock, self.cx:
            c = self.cx.execute("INSERT INTO tickets(horodatage,langue,question,contact,service) VALUES(?,?,?,?,?)",
                                (self._now(), langue, question, contact, service))
        return {"id": f"MJ-{c.lastrowid:05d}", "numero": c.lastrowid}

    def tickets(self, statut: str | None = None) -> list[dict]:
        sql, args = "SELECT * FROM tickets", ()
        if statut:
            sql, args = sql + " WHERE statut=?", (statut,)
        with self.lock:
            return [dict(r) for r in self.cx.execute(sql + " ORDER BY id DESC", args)]

    def fermer_ticket(self, numero: int, reponse: str, fiche_id: str | None):
        with self.lock, self.cx:
            self.cx.execute("UPDATE tickets SET statut='traite', reponse=?, fiche_id=? WHERE id=?", (reponse, fiche_id, numero))

    def stats(self) -> dict:
        with self.lock:
            total = self.cx.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
            par = {r[0]: r[1] for r in self.cx.execute("SELECT resultat, COUNT(*) FROM questions GROUP BY resultat")}
            langues = {r[0]: r[1] for r in self.cx.execute("SELECT langue, COUNT(*) FROM questions GROUP BY langue")}
            top = [dict(r) for r in self.cx.execute(
                "SELECT fiche_id, COUNT(*) AS n FROM questions WHERE fiche_id IS NOT NULL GROUP BY fiche_id ORDER BY n DESC LIMIT 5")]
            ouverts = self.cx.execute("SELECT COUNT(*) FROM tickets WHERE statut='ouvert'").fetchone()[0]
            tickets = self.cx.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
            services = {r[0] or "fisc": r[1] for r in self.cx.execute("SELECT service, COUNT(*) FROM tickets GROUP BY service")}
        return {"questions": total, "par_resultat": par, "par_langue": langues, "fiches_les_plus_demandees": top,
                "tickets_ouverts": ouverts, "tickets": tickets, "tickets_par_service": services}
