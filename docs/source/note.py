"""Rend les notes de synthèse FR et AR en PDF (A4, 2 pages) avec les URL finales."""
import asyncio, os
from playwright.async_api import async_playwright
DEMO = os.environ.get("DEMO_URL", "https://cyrineg-mourchid-jibaya.hf.space")
GH = os.environ.get("GITHUB_URL", "")
ICI = os.path.dirname(os.path.abspath(__file__))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for src, out in (("note.html", "Note_de_synthese_Mourchid_Jibaya.pdf"), ("note_ar.html", "Note_de_synthese_Mourchid_Jibaya_AR.pdf")):
            h = open(os.path.join(ICI, src), encoding="utf-8").read().replace("{{DEMO}}", DEMO.replace("https://", ""))
            if GH: h = h.replace("{{GH}}", GH.replace("https://", ""))
            else: h = h.replace(" · Code : <span class=\"lien\">{{GH}}</span>", "").replace(" · الشفرة: <span class=\"lat\">{{GH}}</span>", "")
            tmp = os.path.join(ICI, "_rendu_" + src); open(tmp, "w", encoding="utf-8").write(h)
            pg = await b.new_page(); await pg.goto("file://" + tmp); await pg.wait_for_timeout(500)
            deb = await pg.evaluate("[...document.querySelectorAll('.page')].map(s=>s.scrollHeight-s.clientHeight)")
            await pg.pdf(path=os.path.join(ICI, out), format="A4", print_background=True, prefer_css_page_size=True)
            os.remove(tmp); print(out, "débordement :", deb)
        await b.close()
asyncio.run(main())
