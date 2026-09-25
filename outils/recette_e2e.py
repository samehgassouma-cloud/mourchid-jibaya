"""Recette navigateur de bout en bout (usager desktop + mobile arabe, hors ligne, repli automatique, administration).

Prérequis : pip install playwright && playwright install chromium ; serveur lancé (python serveur.py).
Lancement : python outils/recette_e2e.py [URL]  (défaut http://localhost:8000 ; code admin : variable CODE_ADMIN, défaut 2026)
Attention : valide puis repasse une fiche « à confirmer » et clôture un ticket (à lancer sur une instance de test).
"""
import asyncio, os, sys, tempfile
from pathlib import Path
from playwright.async_api import async_playwright
U = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"
OFF = (Path(__file__).resolve().parent.parent / "dist" / "Mourchid_Jibaya_hors_ligne.html").as_uri()
CODE = os.environ.get("CODE_ADMIN", "2026")
os.chdir(tempfile.mkdtemp(prefix="recette_"))  # captures d'écran écrites ici
R=[]
def ok(n,c): R.append(("✅" if c else "❌")+" "+n)
async def poser(pg,q,t=900):
    await pg.fill("#q",q); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(t)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        errs=[]
        def watch(pg,tag): pg.on("pageerror",lambda e: errs.append(f"{tag}: {e}"))
        # --- usager desktop FR
        pg=await b.new_page(viewport={"width":1440,"height":900}); watch(pg,"desk")
        await pg.goto(U+"/?lang=fr"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path="v3-d0.png")
        ok("accueil rendu", await pg.locator("#accueil").count()==1 and len(await pg.inner_text("#accueil"))>50)
        await poser(pg,"أنا محامي، لازمني فاتورة إلكترونية؟")
        ok("réponse darija citée", "53" in await pg.inner_text("#fil-cadre"))
        ok("tampon présent", await pg.locator(".tampon").count()>=1)
        tr=pg.locator("details.analyse summary").first
        ok("trace présente", await tr.count()==1)
        if await tr.count(): await tr.click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path="v3-d1.png")
        await poser(pg,"comment cacher mes revenus au fisc",700)
        ok("refus fraude", await pg.locator(".s-refus").count()>=1)
        await poser(pg,"Quel temps fait-il à Tunis ?",700)
        ok("inconnu", await pg.locator(".inconnu").count()>=1)
        await pg.screenshot(path="v3-d2.png")
        # voir aussi / fiche
        puce=pg.locator("[data-fiche]").first
        if await puce.count(): 
            n0=await pg.locator(".extrait").count(); await puce.click(); await pg.wait_for_timeout(700); ok("clic fiche proposée", await pg.locator(".extrait").count()>n0)
        # agent
        await pg.click("#parler"); await pg.wait_for_timeout(300)
        ok("dialog agent ouvert", await pg.locator("#agent[open]").count()==1)
        await pg.select_option("#a-service","rne"); await pg.fill("#a-contact","t@t.tn"); await pg.click("#f-agent button[type=submit]"); await pg.wait_for_timeout(700)
        ok("ticket MJ-", "MJ-" in await pg.inner_text("#fil-cadre"))
        # nouvelle conversation
        nv=pg.locator("#nouvelle")
        if await nv.is_visible(): await nv.click(); await pg.wait_for_timeout(400); ok("nouvelle conversation", await pg.locator("#accueil").count()==1)
        # échéances + ics
        await pg.click(".barre [data-vue=ech]"); await pg.wait_for_timeout(900)
        ok("échéances listées", await pg.locator(".echeance").count()>=3)
        await pg.screenshot(path="v3-d3.png")
        btn=pg.locator("#r-ics")
        if await btn.count():
            async with pg.expect_download(timeout=5000) as d: await btn.click()
            dl=await d.value; ok("téléchargement .ics", dl.suggested_filename.endswith(".ics"))
        else: ok("bouton .ics", False)
        # profil
        pr=pg.locator("[data-profil=pm]")
        if await pr.count(): await pr.click(); await pg.wait_for_timeout(600); ok("changement profil", True)
        # vérif TVA
        await pg.click(".barre [data-vue=verif]"); await pg.wait_for_timeout(500)
        await pg.click("#f-verif button[type=submit]"); await pg.wait_for_timeout(700)
        ok("vérif TVA résultat", await pg.locator("#v-res .point").count()>=2)
        await pg.screenshot(path="v3-d4.png")
        # sources
        await pg.click(".barre [data-vue=src]"); await pg.wait_for_timeout(700)
        ok("sources listées", await pg.locator(".registre li").count()>=5)
        # langue AR
        await pg.click(".barre [data-l=ar]"); await pg.wait_for_timeout(500)
        ok("bascule RTL", await pg.evaluate("document.documentElement.dir")=="rtl")
        await pg.click(".barre [data-vue=chat]"); await pg.wait_for_timeout(400); await pg.screenshot(path="v3-d5.png")
        # repli auto
        await pg.wait_for_timeout(2500)
        await pg.route("**/api/**", lambda r: r.abort())
        await poser(pg,"What are the VAT rates?",1500)
        ok("repli hors ligne automatique", "VAT" in await pg.inner_text("#fil-cadre") or "TVA" in await pg.inner_text("#fil-cadre"))
        await pg.close()
        # --- mobile AR
        pg=await b.new_page(viewport={"width":390,"height":844},device_scale_factor=2); watch(pg,"mob")
        await pg.goto(U+"/?lang=ar"); await pg.wait_for_timeout(1000); await pg.screenshot(path="v3-m0.png")
        ok("onglets mobile visibles", await pg.locator("#onglets").is_visible())
        await poser(pg,"وقتاش آخر أجل للتصريح الشهري لشركتي؟"); await pg.screenshot(path="v3-m1.png")
        ok("réponse mobile", await pg.locator(".extrait").count()>=1)
        sw=await pg.evaluate("document.documentElement.scrollWidth"); ok(f"pas de débordement horizontal mobile ({sw}px)", sw<=392)
        await pg.click("#onglets [data-vue=ech]"); await pg.wait_for_timeout(700); await pg.screenshot(path="v3-m2.png")
        await pg.close()
        # --- hors ligne fichier
        pg=await b.new_page(viewport={"width":390,"height":844}); watch(pg,"off")
        await pg.goto(OFF+"?lang=fr"); await pg.wait_for_timeout(900)
        await poser(pg,"Comment obtenir DigiGO ?",800)
        ok("hors ligne : réponse", await pg.locator(".extrait").count()>=1)
        ok("hors ligne : lien admin masqué", not await pg.locator(".lien-admin").first.is_visible())
        await pg.close()
        # --- admin
        pg=await b.new_page(viewport={"width":1440,"height":900}); watch(pg,"admin")
        await pg.goto(U+"/admin"); await pg.wait_for_timeout(1200); await pg.screenshot(path="v3-a0.png",full_page=True)
        txt=await pg.inner_text("body")
        ok("pilotage KPI", "%" in txt)
        tabs=await pg.evaluate("[...document.querySelectorAll('[data-tab]')].map(x=>x.dataset.tab)")
        R.append("   onglets admin: "+str(tabs))
        await pg.click("[data-tab=tickets]"); await pg.wait_for_timeout(400)
        await pg.fill("#code","mauvais"); await pg.click("#f-code button[type=submit]"); await pg.wait_for_timeout(500)
        ok("code faux refusé", await pg.locator("#f-code").is_visible())
        await pg.fill("#code",CODE); await pg.click("#f-code button[type=submit]"); await pg.wait_for_timeout(800)
        await pg.screenshot(path="v3-a1.png")
        ok("tickets affichés", "MJ-" in await pg.inner_text("body"))
        cl=pg.locator("[data-clore]").first
        if await cl.count():
            n0=await pg.locator("[data-clore]").count()
            rep=pg.locator("[data-rep]").first; await rep.fill("Réponse test agent"); await cl.click(); await pg.wait_for_timeout(900)
            ok("clôture ticket", await pg.locator("[data-clore]").count()==n0-1)
        await pg.click("[data-tab=fiches]"); await pg.wait_for_timeout(800); await pg.screenshot(path="v3-a2.png")
        v=pg.locator("[data-valider]").first
        nv=await pg.locator("[data-valider]").count()
        if nv:
            await v.click(); await pg.wait_for_timeout(700); ok("validation fiche", await pg.locator("[data-valider]").count()==nv-1)
            await pg.locator("[data-reconfirmer]").first.click(); await pg.wait_for_timeout(600)
        await pg.click("[data-tab=tester]"); await pg.wait_for_timeout(300)
        await pg.fill("#q-test","taux de TVA"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(700)
        ok("test moteur", "Taux" in await pg.inner_text("body") or "TVA" in await pg.inner_text("#res-test"))
        await pg.screenshot(path="v3-a3.png")
        await pg.close()
        await b.close()
        print("\n".join(R)); print("Erreurs JavaScript :", errs or "aucune"); print("Captures :", os.getcwd())
        sys.exit(1 if errs or any(r.startswith("❌") for r in R) else 0)
asyncio.run(main())
