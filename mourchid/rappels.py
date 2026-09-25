"""Rappels d'échéances (défi T4) : fichier de calendrier iCalendar (.ics) avec alertes.

Le fichier s’ouvre dans le calendrier du téléphone (iPhone, Android), Outlook ou Google Agenda : les alertes
arrivent ensuite même quand l'assistant est fermé. Rien n'est envoyé à un serveur.
Alertes proposées : 7 jours avant (9 h), 2 jours avant (9 h), le jour même (8 h).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

ALERTES = {"j7": "-P6DT15H", "j2": "-P1DT15H", "j0": "PT8H"}
TEXTES = {
    "nom": {"fr": "Mourchid Jibaya — échéances fiscales", "ar": "مرشد جباية — الآجال الجبائية", "en": "Mourchid Jibaya — tax deadlines"},
    "limite": {"fr": "Dernier délai", "ar": "آخر أجل", "en": "Deadline"},
    "reporte": {"fr": "reporté du", "ar": "مؤجَّل من", "en": "moved from"},
    "source": {"fr": "Source : agenda fiscal de la DGI (jibaya.tn/agenda)", "ar": "المصدر: الرزنامة الجبائية للإدارة العامة للأداءات (jibaya.tn/agenda)",
               "en": "Source: DGI tax calendar (jibaya.tn/agenda)"},
    "alerte": {"j7": {"fr": "Échéance fiscale dans 7 jours", "ar": "أجل جبائي بعد 7 أيام", "en": "Tax deadline in 7 days"},
               "j2": {"fr": "Échéance fiscale dans 2 jours", "ar": "أجل جبائي بعد يومين", "en": "Tax deadline in 2 days"},
               "j0": {"fr": "Échéance fiscale aujourd'hui", "ar": "آخر أجل جبائي اليوم", "en": "Tax deadline today"}},
}


def _echapper(t: str) -> str:
    return t.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _plier(ligne: str) -> list[str]:
    """Pliage des lignes à 60 caractères au plus (norme iCalendar : 75 octets)."""
    out = [ligne[:60]]
    ligne = ligne[60:]
    while ligne:
        out.append(" " + ligne[:59])
        ligne = ligne[59:]
    return out


def ics(echeances: list[dict], langue: str = "fr", alertes=("j7", "j2", "j0"), horodatage: str | None = None) -> str:
    langue = langue if langue in ("ar", "fr", "en") else "fr"
    alertes = [a for a in ("j7", "j2", "j0") if a in alertes]
    stamp = horodatage or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mourchid Jibaya//Echeances fiscales//FR", "CALSCALE:GREGORIAN",
         "METHOD:PUBLISH", "X-WR-CALNAME:" + _echapper(TEXTES["nom"][langue])]
    for e in echeances:
        d = date.fromisoformat(e["date"])
        titre = e["libelle"][langue] + (f" · {e['periode']}" if e.get("periode") else "")
        desc = f"{TEXTES['limite'][langue]} : {e['date']}"
        if e.get("report"):
            motifs = ", ".join(m["motif"][langue] for m in e["report"])
            desc += f" ({TEXTES['reporte'][langue]} {e['date_legale']} : {motifs})"
        desc += "\n" + TEXTES["source"][langue]
        L += ["BEGIN:VEVENT", f"UID:mj-{e['type']}-{e['date']}@mourchid-jibaya", "DTSTAMP:" + stamp,
              "DTSTART;VALUE=DATE:" + d.strftime("%Y%m%d"), "DTEND;VALUE=DATE:" + (d + timedelta(days=1)).strftime("%Y%m%d"),
              "SUMMARY:" + _echapper(titre), "DESCRIPTION:" + _echapper(desc), "TRANSP:TRANSPARENT"]
        for a in alertes:
            L += ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + _echapper(TEXTES["alerte"][a][langue] + " — " + titre),
                  "TRIGGER:" + ALERTES[a], "END:VALARM"]
        L.append("END:VEVENT")
    L.append("END:VCALENDAR")
    return "\r\n".join(x for ligne in L for x in _plier(ligne)) + "\r\n"
