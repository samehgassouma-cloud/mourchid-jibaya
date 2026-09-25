import asyncio, os
from playwright.async_api import async_playwright
DEMO=os.environ.get("DEMO_URL","https://COMPTE-mourchid-jibaya.hf.space"); GH=os.environ.get("GITHUB_URL","https://github.com/COMPTE/mourchid-jibaya")
h=open("note.html",encoding="utf-8").read().replace("{{DEMO}}",DEMO.replace("https://","")).replace("{{GH}}",GH.replace("https://",""))
open("/tmp/note_rendu.html","w",encoding="utf-8").write(h)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        await pg.goto("file:///tmp/note_rendu.html"); await pg.wait_for_timeout(500)
        of=await pg.evaluate("[...document.querySelectorAll('.page')].map(s=>s.scrollHeight-s.clientHeight)")
        print("débordement par page (px):",of)
        await pg.pdf(path="Note_de_synthese_Mourchid_Jibaya.pdf",format="A4",print_background=True,prefer_css_page_size=True)
        await b.close()
asyncio.run(main())
