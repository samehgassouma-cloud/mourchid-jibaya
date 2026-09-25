/* Mourchid Jibaya — interface usager (V3).
   - Mode serveur : appels à l'API FastAPI (/api/*).
   - Mode hors ligne : le même moteur tourne dans le navigateur (moteur.js). Si le serveur ne répond plus,
     l'interface bascule seule sur le moteur local (chargé via /donnees.js puis /moteur.js). */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
const stock = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } } };
const calme = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- icônes ---------- */
const P = {
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  verif: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-11A2.5 2.5 0 0 1 6.5 5H15"/>',
  livre: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lien: '<path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  agent: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  ia: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  sceau: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6.5"/><path d="M9.2 12.2l1.9 1.9 3.8-4"/>',
  alerte: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  stop: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  question: '<path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01"/>',
  cloche: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
};
const ico = (n, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;

/* ---------- état ---------- */
const HORS_LIGNE_FORCE = typeof DONNEES !== "undefined" && typeof MJ !== "undefined" && window.MJ_HORS_LIGNE === true;
let L = new URLSearchParams(location.search).get("lang") || stock.get("mj-langue") || "fr";
if (!T[L]) L = "fr";
let mode = HORS_LIGNE_FORCE ? "local" : "serveur";
let sante = null, vueCourante = "chat", derniereQuestion = "", profil = stock.get("mj-profil") || "pp", numTampon = 0;
const moteur = () => (typeof MJ !== "undefined" ? MJ : window.MJ);

/* ---------- accès aux données : serveur, sinon moteur local ---------- */
let moteurLocal = HORS_LIGNE_FORCE ? Promise.resolve(MJ) : null;
function chargerScript(src) {
  return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
}
function preparerLocal() {
  if (!moteurLocal) moteurLocal = chargerScript("/donnees.js").then(() => chargerScript("/moteur.js")).then(() => moteur()).catch(() => (moteurLocal = null));
  return moteurLocal;
}
async function api(url, corps) {
  if (mode === "serveur") {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(url, { method: corps ? "POST" : "GET", headers: corps ? { "Content-Type": "application/json" } : {}, body: corps ? JSON.stringify(corps) : undefined, signal: ctl.signal });
      clearTimeout(t);
      if (r.status >= 500) throw new Error("serveur");
      return await r.json();
    } catch (e) {
      const m = await preparerLocal();
      if (!m) throw e;
      mode = "local"; majEtat();
    }
  }
  const m = await (moteurLocal || preparerLocal());
  return m.api(url, corps || {});
}

/* ---------- langue ---------- */
function appliquerLangue(l) {
  L = l; stock.set("mj-langue", l);
  const S = T[l];
  document.documentElement.lang = l; document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  document.title = `${S.nom} · ${l === "ar" ? "Mourchid Jibaya" : "مرشد جباية"}`;
  $$("[data-t]").forEach((e) => (e.textContent = S[e.dataset.t]));
  $$("[data-t-label]").forEach((e) => e.setAttribute("aria-label", S[e.dataset.tLabel]));
  $$(".langues button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.l === l));
  $("#q").placeholder = S.ph;
  majEtat();
  if ($("#accueil")) rendreAccueil();
  if (vueCourante === "ech") rendreEcheances();
  if (vueCourante === "verif") rendreVerif();
  if (vueCourante === "src") rendreSources();
  prochaineEcheance();
  remplirServices();
}
function majEtat() {
  const S = T[L];
  const ia = mode === "serveur" && sante && sante.modele && sante.modele !== "aucun";
  $$(".etat").forEach((e) => {
    e.classList.toggle("local", mode === "local");
    e.classList.toggle("ia", !!ia);
    e.innerHTML = `<i></i>${esc(mode === "local" ? S.etatLocal : ia ? S.etatIA : S.etatServeur)}`;
    e.title = ia ? sante.modele : "";
  });
}

/* ---------- navigation ---------- */
const VUES = { chat: ["ongChat", "chat"], ech: ["ongEch", "cal"], verif: ["ongVerif", "verif"], src: ["ongSrc", "livre"] };
function construireNav() {
  const b = (k) => `<button type="button" data-vue="${k}">${ico(VUES[k][1])}<span data-t="${VUES[k][0]}"></span></button>`;
  $("#nav").innerHTML = Object.keys(VUES).map(b).join("");
  $("#onglets").innerHTML = Object.keys(VUES).map(b).join("");
  $$("[data-vue]").forEach((x) => x.addEventListener("click", () => ouvrir(x.dataset.vue)));
}
function ouvrir(v) {
  vueCourante = v;
  $$("[data-vue]").forEach((x) => (x.dataset.vue === v ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current")));
  $$(".vue").forEach((x) => (x.hidden = x.id !== "v-" + v));
  if (v === "ech") rendreEcheances();
  if (v === "verif") rendreVerif();
  if (v === "src") rendreSources();
  if (v === "chat") setTimeout(() => $("#q").focus({ preventScroll: true }), 50);
  history.replaceState(null, "", v === "chat" ? location.pathname + location.search : "#" + v);
}

/* ---------- accueil ---------- */
const fil = () => $("#fil-cadre");
function defiler(el) {
  const f = $("#fil");
  requestAnimationFrame(() => {
    if (el && el.offsetHeight > f.clientHeight * .7) f.scrollTop = el.offsetTop - 12;
    else f.scrollTop = f.scrollHeight;
  });
}
function ajouter(html, cls) { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; fil().appendChild(d); $("#nouvelle").hidden = false; defiler(); return d; }

function rendreAccueil() {
  const S = T[L], n = sante?.fiches?.total ?? 34;
  const ex = S.ex.map((q) => [q, L]);
  if (L !== "ar") ex.splice(1, 0, [T.ar.ex[0], "darija"]);   // la darija, toujours
  else { ex[0] = [ex[0][0], "darija"]; ex.splice(2, 0, [T.fr.ex[1], "fr"]); }
  const etiquette = (l) => (l === "darija" ? `<span class="lg darija" lang="ar">${esc(S.lgDarija)}</span>` : `<span class="lg">${l === "ar" ? "عربي" : l.toUpperCase()}</span>`);
  $("#accueil").innerHTML = `
    <h1 class="promesse">${S.promesse.map((p, i) => `<span>${esc(p)}${i === 2 ? ico("sceau", "i marque-tampon") : ""}</span>`).join("")}</h1>
    <p class="chapo">${esc(S.accueilChapo)}</p>
    <ul class="preuves">${S.preuves.map((p) => `<li>${ico("check")}${esc(fmt(p, { n }))}</li>`).join("")}</ul>
    <div id="rappel-accueil"></div>
    <div class="faq"><h2>${esc(S.faqTitre)}</h2><ol>${ex.slice(0, 5).map(([q, l]) =>
      `<li><button type="button" data-q="${esc(q)}">${etiquette(l)}<span class="q" dir="auto">${esc(q)}</span>${ico("fleche", "i fleche")}</button></li>`).join("")}</ol></div>`;
  majRappelAccueil();
}
function nouvelleConversation() {
  fil().innerHTML = '<section class="accueil" id="accueil"></section>';
  derniereQuestion = ""; $("#nouvelle").hidden = true;
  rendreAccueil(); $("#fil").scrollTop = 0; $("#q").focus();
}

/* ---------- le tampon ---------- */
function tampon(statut, S, date) {
  const n = ++numTampon;
  const mot = (S.tampon && S.tampon[statut]) || S.tampon.a_confirmer;
  const ar = S === T.ar;
  const lignes = !ar && mot.length > 10 && mot.includes(" ") ? [mot.slice(0, mot.indexOf(" ")), mot.slice(mot.indexOf(" ") + 1)] : [mot];
  const y0 = lignes.length === 2 ? 62 : 67;
  const signe = statut === "refus" ? '<path d="M53 37l14 14M67 37L53 51"/>' : statut === "source_officielle" ? '<path d="M51.5 44.5l6 6 11-12"/>' : '<path d="M60 36v9M60 50.5v.5"/>';
  return `<div class="tampon" aria-hidden="true"><svg viewBox="0 0 120 120">
    <defs><path id="mj-ta${n}" d="M20 60a40 40 0 0 1 80 0"/><path id="mj-tb${n}" d="M14 60a46 46 0 0 0 92 0"/></defs>
    <g class="encre" filter="url(#mj-encre)">
      <circle cx="60" cy="60" r="56.5" fill="none" stroke="currentColor" stroke-width="2.8"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width=".9"/>
      <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <text class="anneau"><textPath href="#mj-ta${n}" startOffset="50%" text-anchor="middle">Mourchid Jibaya</textPath></text>
      <text class="anneau-ar"><textPath href="#mj-tb${n}" startOffset="50%" text-anchor="middle">مرشد جباية</textPath></text>
      <circle cx="17.5" cy="60" r="1.8" fill="currentColor"/><circle cx="102.5" cy="60" r="1.8" fill="currentColor"/>
      <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${signe}</g>
      <path d="M36 55.5h48M36 ${lignes.length === 2 ? 81 : 76}h48" stroke="currentColor" stroke-width=".9"/>
      ${lignes.map((t, i) => `<text class="etat-t${ar ? " ar" : ""}" x="60" y="${y0 + i * 11}" text-anchor="middle">${esc(t)}</text>`).join("")}
      <text class="date-t" x="60" y="${lignes.length === 2 ? 89 : 85}" text-anchor="middle">${esc(date || "")}</text>
    </g></svg></div>`;
}
const aujourdhuiISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

/* ---------- analyse IA (champ explication) ---------- */
function explicationLocale(q, r) {
  const M = moteur();
  if (!M || !M.chercher || !M.mots) return null;
  const cands = M.chercher(q, 3);
  return {
    langue_detectee: r.langue, termes: M.mots(q),
    concepts: [...new Set(cands.flatMap((c) => c.mots.filter((m) => m.startsWith("§"))))],
    candidats: cands.map((c) => ({ id: c.fiche.id, titre: c.fiche.titre[r.langue] || c.fiche.titre.fr, score: c.score, couverture: c.couverture })),
    seuils: { score: 4, couverture: 0.34 },
  };
}
function analyse(ex, S, titre, repondu) {
  if (!ex) return "";
  const sS = ex.seuils?.score ?? 4, sC = ex.seuils?.couverture ?? 0.34;
  const cands = ex.candidats || [];
  const m = cands[0];
  const conf = m ? Math.min(100, Math.round((m.score / (sS * 3)) * 100)) : 0;
  const maxS = Math.max(sS * 2.5, ...cands.map((c) => c.score));
  const pc = (x) => Math.max(0, Math.min(100, Math.round(x * 100)));
  const barre = (v, seuil, lbl, aff) => `<div class="mesure"><span>${esc(lbl)}</span><span class="piste${v >= seuil ? " ok" : ""}"><i style="width:${pc(v)}%"></i><span class="seuil" style="inset-inline-start:${pc(seuil)}%"></span></span><span>${aff}</span></div>`;
  const concepts = (ex.concepts || []).map((c) => String(c).replace(/^§/, "").replace(/_/g, " "));
  return `<details class="analyse"><summary>${ico("ia")}<span>${esc(titre || S.trace)}</span>
      ${m ? `<span class="conf-mini" title="${esc(S.tConfiance)}"><span class="piste${repondu ? " ok" : ""}"><i style="width:${conf}%"></i></span>${conf} %</span>` : ""}${ico("chevron", "i chev")}</summary>
    <ol class="etapes">
      <li><div><b>${esc(S.tLangue)}</b>${esc(S.langueNoms[ex.langue_detectee] || ex.langue_detectee || "—")}</div></li>
      <li><div><b>${esc(S.tTermes)}</b><div class="jetons" dir="auto">${(ex.termes || []).map((t) => `<span class="jeton">${esc(t)}</span>`).join("") || esc(S.tAucun)}</div></div></li>
      <li><div><b>${esc(S.tConcepts)}</b><div class="jetons">${concepts.map((t) => `<span class="jeton concept">${esc(t)}</span>`).join("") || esc(S.tAucun)}</div></div></li>
      <li><div><b>${esc(S.tCandidats)}</b><div class="candidats">${cands.map((c, i) => `<div class="cand${i === 0 && repondu ? " retenue" : ""}">
          <div class="t"><span dir="auto">${esc(c.titre)}</span>${i === 0 && repondu ? `<em>${ico("check")} ${esc(S.tRetenue)}</em>` : ""}</div>
          ${barre(c.score / maxS, sS / maxS, S.tScore, c.score)}${barre(c.couverture, sC, S.tCouv, pc(c.couverture) + " %")}</div>`).join("") || esc(S.tAucun)}</div>
        <div class="note" style="margin-top:6px">${esc(fmt(S.tSeuil, { s: sS, c: Math.round(sC * 100) }))}</div></div></li>
      <li><div><b>${esc(S.tDecision)}</b><div class="decision ${repondu ? "ok" : "ko"}">${ico(repondu ? "check" : "agent")}<span>${esc(repondu ? S.tDecOk : S.tDecKo)}</span></div></div></li>
    </ol></details>`;
}

/* ---------- cartes de réponse ---------- */
const labelStatut = (s, S) => (s === "source_officielle" ? S.officiel : s === "interne" ? S.interne : S.confirmer);
const puces = (liste) => liste.map((v) => `<button type="button" class="puce" data-fiche="${esc(v.id)}" dir="auto">${esc(v.titre)}</button>`).join("");

function carteReponse(r, anime = true) {
  const S = T[r.langue] || T[L];
  const src = r.source || {}, ia = r.mode === "modele";
  const statut = ["source_officielle", "a_confirmer", "interne"].includes(r.statut) ? r.statut : "a_confirmer";
  return `<article class="extrait s-${statut}${anime ? " anime" : ""}" dir="${r.langue === "ar" ? "rtl" : "ltr"}" lang="${esc(r.langue)}">
    <div class="ex-tete"><span class="emb" aria-hidden="true">م</span><span>${esc(S.extrait)}</span><span class="ref">${esc(S.fiche)} ${esc(r.fiche_id || "")}</span></div>
    <div class="ex-corps">
      ${r.vigilance ? `<div class="avis vigilance" style="margin-bottom:14px"><div class="tete">${ico("alerte")}${esc(S.vigTitre)}</div><div>${esc(r.vigilance)}</div></div>` : ""}
      <span class="mode ${ia ? "ia" : "fiche"}">${ico(ia ? "ia" : "doc")}${esc(ia ? S.iaRedige : S.ficheBrute)}</span>
      <h3>${esc(r.titre)}</h3>
      <p class="texte">${esc(r.texte)}</p>
      ${ia && r.texte_officiel ? `<button type="button" class="lien" data-brut aria-expanded="false" style="margin-top:6px">${ico("doc")}<span>${esc(S.voirTexte)}</span></button><div class="officiel-brut" hidden>${esc(r.texte_officiel)}</div>` : ""}
    </div>
    <footer class="ex-source">
      <div class="qui"><span>${esc(S.source)} · ${esc(labelStatut(statut, S))}</span><strong>${esc(src.reference || "—")}</strong>
        <div class="meta">${r.verifie_le ? `<span>${esc(S.verifie)} ${esc(r.verifie_le)}</span>` : ""}${r.validation_experte ? `<span>${esc(S.valide)} ${esc(r.validation_experte.par)}</span>` : ""}</div>
        ${src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${ico("lien")}${esc(src.url.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : ""}</div>
      ${tampon(statut, S, r.verifie_le || aujourdhuiISO())}
    </footer>
    <div class="ex-suite">
      ${analyse(r.explication, S, S.trace, true)}
      ${r.voir_aussi?.length ? `<div class="voir">${esc(S.voir)} : ${puces(r.voir_aussi)}</div>` : ""}
      <div class="actions">
        <button type="button" class="btn" data-agent>${ico("agent")}${esc(S.parler)}</button>
        ${/mens|acompte|acpt|declar|echeance|delai|ir_|is_/.test(r.fiche_id || "") ? `<button type="button" class="btn" data-vue-lien="ech">${ico("cloche")}${esc(S.voirEch)}</button>` : ""}
      </div>
    </div>
  </article>`;
}

function carteAutre(r) {
  const S = T[r.langue] || T[L];
  const d = `dir="${r.langue === "ar" ? "rtl" : "ltr"}" lang="${esc(r.langue)}"`;
  const pistes = r.alternatives?.length ? `<div class="voir">${esc(S.pistes)} : ${puces(r.alternatives)}</div>` : "";
  const agent = `<div class="actions"><button type="button" class="btn plein" data-agent>${ico("agent")}${esc(S.agent)}</button></div>`;
  if (r.type === "refus") return `<article class="extrait s-refus anime" ${d}>
      <div class="ex-tete"><span class="emb" aria-hidden="true">م</span><span>${esc(S.extrait)}</span></div>
      <div class="ex-corps"><h3 style="margin-top:0">${esc(S.refusTitre)}</h3><p class="texte">${esc(r.texte)}</p></div>
      <footer class="ex-source"><div class="qui"></div>${tampon("refus", S, aujourdhuiISO())}</footer>
      <div class="ex-suite">${pistes}${agent}</div></article>`;
  if (r.type === "vigilance") return `<div class="avis vigilance" ${d}><div class="tete">${ico("alerte")}${esc(S.vigTitre)}</div><div class="corps-avis">${esc(r.texte)}</div>${pistes}${agent}</div>`;
  if (r.type === "inconnu") return `<div class="inconnu" ${d}><div class="tete"><span class="vide" aria-hidden="true">${ico("question")}</span>${esc(S.inconnuTitre)}</div><div>${esc(r.texte)}</div>
      ${r.propositions?.length ? `<div class="voir">${esc(S.vouliez)} ${puces(r.propositions)}</div>` : ""}
      ${analyse(r.explication, S, S.tracePourquoi, false)}${agent}</div>`;
  return `<div class="simple" ${d}>${esc(r.texte || "")}</div>`;
}

function orchestrer(el) {   // fin de la frappe : léger choc de la feuille
  const t = el.querySelector(".extrait.anime .tampon");
  if (!t || calme()) return;
  t.addEventListener("animationend", () => t.closest(".extrait").classList.add("frappe"), { once: true });
}

async function poser(q) {
  q = (q || "").trim();
  if (!q) return;
  $("#accueil")?.remove();
  derniereQuestion = q;
  ajouter(esc(q), "msg-moi").dir = "auto";
  $("#q").value = ""; ajuster();
  const attente = ajouter(`<div class="recherche" role="status"><i></i><i></i><i></i><span>${esc(T[L].cherche)}</span></div>`, "msg-bot");
  try {
    const r = await api("/api/question", { question: q });
    if ((r.type === "reponse" || r.type === "inconnu") && !r.explication && mode === "local") r.explication = explicationLocale(q, r);
    attente.innerHTML = r.type === "reponse" ? carteReponse(r) : carteAutre(r);
    orchestrer(attente);
  } catch {
    attente.innerHTML = `<div class="inconnu">${esc(T[L].erreur)}</div>`;
  }
  defiler(attente);
}
async function afficherFiche(id) {
  const r = await api(`/api/fiche?id=${encodeURIComponent(id)}&langue=${L}`);
  if (r && !r.erreur) { $("#accueil")?.remove(); const d = ajouter(carteReponse(r), "msg-bot"); orchestrer(d); defiler(d); }
}

/* ---------- transfert à un agent ---------- */
function remplirServices() {
  const S = T[L];
  $("#a-service").innerHTML = Object.entries(S.services).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
}
function ouvrirAgent(question) {
  $("#a-question").value = question || derniereQuestion || "";
  $("#agent").showModal();
}
async function envoyerAgent(e) {
  e.preventDefault();
  const S = T[L], q = $("#a-question").value.trim();
  if (!q) return;
  const c = await api("/api/ticket", { question: q, service: $("#a-service").value, contact: $("#a-contact").value.trim() });
  $("#agent").close();
  ouvrir("chat"); $("#accueil")?.remove();
  const res = c.contexte?.resultat;
  const d = ajouter(`<div class="accuse"><header><p>${ico("check")}<span>${esc(c.local ? S.ticketLocal : S.ticket)}</span></p><strong>${esc(c.id)}</strong></header>
    <dl><dt>${esc(S.cService)}</dt><dd>${esc(S.services[c.service] || c.service)}</dd>
    <dt>${esc(S.cLangue)}</dt><dd>${esc(S.langues[c.langue] || c.langue)}</dd>
    <dt>${esc(S.cQuestion)}</dt><dd dir="auto">${esc(c.question)}</dd>
    <dt>${esc(S.cEssai)}</dt><dd>${esc(S.res[res] || res || "—")}</dd>
    ${c.contexte?.fiches_proches?.length ? `<dt>${esc(S.cProches)}</dt><dd>${c.contexte.fiches_proches.map((f) => esc(f.titre[L] || f.titre.fr)).join(" · ")}</dd>` : ""}</dl></div>`, "msg-bot");
  defiler(d);
}

/* ---------- échéances ---------- */
let prochaine = null;
function joursAvant(iso) { const a = new Date(); a.setHours(0, 0, 0, 0); return Math.round((new Date(iso + "T00:00:00") - a) / 864e5); }
const locale = () => (L === "ar" ? "ar-TN" : L === "en" ? "en-GB" : "fr-FR");
function dateCourte(iso) { const d = new Date(iso + "T00:00:00"); return { j: d.getDate(), m: d.toLocaleDateString(locale(), { month: "short" }) }; }
const dateLongue = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
async function prochaineEcheance() {
  try {
    const r = await api(`/api/echeances?profil=${profil}&jours=60`);
    const e = r.echeances?.[0]; const S = T[L];
    prochaine = e || null;
    if (!e) return;
    const j = joursAvant(e.date);
    $("#prochaine").hidden = false;
    $("#prochaine").innerHTML = `<span class="l">${ico("cloche")}${esc(S.prochaine)}</span><b>${esc(e.libelle[L])}${e.periode ? ` · ${esc(e.periode)}` : ""}</b>
      <span class="quand"><strong>${j <= 0 ? esc(S.auj) : esc(fmt(S.dansJ, { j }))}</strong><span>${esc(dateLongue(e.date))}</span></span>`;
    majRappelAccueil();
  } catch { /* facultatif */ }
}
function majRappelAccueil() {
  const z = $("#rappel-accueil"), e = prochaine, S = T[L];
  if (!z) return;
  if (!e || joursAvant(e.date) > 7) { z.innerHTML = ""; return; }
  const j = joursAvant(e.date);
  z.innerHTML = `<div class="rappel" role="note">${ico("cloche")}<span>${esc(fmt(S.bandeau, { l: e.libelle[L], d: dateLongue(e.date) }))}${esc(j <= 0 ? S.bandeauAuj : fmt(S.bandeauJ, { j: fmt(S.dansJ, { j }).replace(/^(dans|in|بعد) /, "") }))}</span><button type="button" class="lien" data-vue-lien="ech">${esc(S.voirTout)}</button></div>`;
}
async function rendreEcheances() {
  const S = T[L];
  const r = await api(`/api/echeances?profil=${profil}&jours=150`);
  const profils = r.profils || {};
  $("#v-ech .cadre").innerHTML = `<div class="entete-page"><h1>${esc(S.echTitre)}</h1><p class="chapo">${esc(S.echChapo)}</p></div>
    <div class="segment" role="group" aria-label="${esc(S.profil)}">${Object.entries(profils).map(([k, v]) => `<button type="button" data-profil="${k}" aria-pressed="${k === profil}">${esc(v[L])}</button>`).join("")}</div>
    <ol class="echeances">${(r.echeances || []).map((e, i) => {
      const j = joursAvant(e.date), d = dateCourte(e.date);
      return `<li class="echeance${j <= 7 ? " proche" : ""}${i === 0 ? " premiere" : ""}"><div class="date"><b>${d.j}</b><small>${esc(d.m)}</small></div>
        <div class="txt"><strong>${esc(e.libelle[L])}</strong>${e.periode ? ` <span class="note">· ${esc(e.periode)}</span>` : ""}
        ${e.report?.length ? `<div class="report">${esc(S.reporte)} ${esc(e.date_legale)} : ${e.report.map((m) => esc(m.motif[L])).join(", ")}</div>` : ""}
        <div><span class="dans">${j <= 0 ? esc(S.auj) : esc(fmt(S.dansJ, { j }))}</span></div></div></li>`;
    }).join("")}</ol>
    <p class="note">${esc(S.noteEch)}</p>
    <section class="bloc"><h2>${ico("cloche")}${esc(S.rapTitre)}</h2><p class="note" style="font-size:15px">${esc(S.rapIntro)}</p>
      <div class="cases">${["j7", "j2", "j0"].map((a) => `<label><input type="checkbox" name="al" value="${a}" checked> ${esc(S["rap" + a.toUpperCase()])}</label>`).join("")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><label class="sr" for="r-mois">${esc(S.rapHorizon)}</label><select id="r-mois" class="champ-s" style="width:auto">${[3, 6, 12].map((m) => `<option value="${m}"${m === 6 ? " selected" : ""}>${esc(S.mois[m])}</option>`).join("")}</select>
      <button type="button" class="btn plein grand" id="r-ics">${ico("cal")}${esc(S.rapBouton)}</button></div>
      <p class="note" id="r-msg" aria-live="polite"></p><p class="note">${esc(S.rapNote)}</p></section>`;
  $$("[data-profil]").forEach((b) => b.addEventListener("click", () => { profil = b.dataset.profil; stock.set("mj-profil", profil); rendreEcheances(); prochaineEcheance(); }));
  $("#r-ics").addEventListener("click", telechargerIcs);
}
async function telechargerIcs() {
  const S = T[L];
  const alertes = $$('input[name="al"]:checked').map((x) => x.value);
  const r = await api("/api/rappels", { profil, mois: +$("#r-mois").value, langue: L, alertes });
  const url = URL.createObjectURL(new Blob([r.ics], { type: "text/calendar" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "mourchid-jibaya-echeances.ics" });
  document.body.appendChild(a); a.click(); a.remove();
  $("#r-msg").innerHTML = `${esc(fmt(S.rapPret, { n: r.nombre }))} <a href="${url}" download="mourchid-jibaya-echeances.ics">${esc(S.rapFichier)}</a>`;
}

/* ---------- vérification TVA ---------- */
function rendreVerif() {
  const S = T[L];
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  const mois = d.toISOString().slice(0, 7);
  $("#v-verif .cadre").innerHTML = `<div class="entete-page"><h1>${esc(S.verifTitre)}</h1><p class="chapo">${esc(S.introVerif)}</p></div>
    <form class="bloc" id="f-verif"><div class="grille">
      <label class="champ">${esc(S.vProfil)}<select name="profil"><option value="pp">${esc(S.pp)}</option><option value="pm">${esc(S.pm)}</option></select></label>
      <label class="champ">${esc(S.vPeriode)}<input type="month" name="periode" value="${mois}" required></label>
      <label class="champ">${esc(S.vCa)}<input type="number" name="ca_ht" min="0" step="0.001" value="10000" inputmode="decimal"></label>
      <label class="champ">${esc(S.vTaux)}<select name="taux"><option>19</option><option>13</option><option>7</option></select></label>
      <label class="champ">${esc(S.vTva)}<input type="number" name="tva_declaree" min="0" step="0.001" value="1500" inputmode="decimal"></label>
      <label class="champ">${esc(S.vDed)}<input type="number" name="tva_deductible" min="0" step="0.001" value="200" inputmode="decimal"></label>
      <label class="champ">${esc(S.vDepot)}<input type="date" name="date_depot"></label>
    </div><div style="margin-top:18px"><button class="btn plein grand" type="submit">${ico("verif")}${esc(S.verifier)}</button></div>
    <div id="v-res" aria-live="polite"></div></form><p class="note">${esc(S.noteVerif)}</p>`;
  $("#f-verif").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const corps = { profil: f.profil, periode: f.periode, ca_ht: +f.ca_ht || 0, taux: +f.taux, tva_declaree: +f.tva_declaree || 0, tva_deductible: +f.tva_deductible || 0 };
    if (f.date_depot) corps.date_depot = f.date_depot;
    const r = await api("/api/verification", corps);
    const n = (x) => Number(x).toLocaleString(L === "ar" ? "ar-TN" : "fr-FR", { maximumFractionDigits: 3 });
    const icone = { ok: "check", alerte: "alerte", critique: "stop", info: "info" };
    const st = r.statut || "ok";
    $("#v-res").innerHTML = `<div class="bordereau"><div class="verdict ${st}">${ico(icone[st])}${esc(S.verdict[st])}</div><div class="resultat">${(r.points || []).map((p) =>
      `<div class="point ${p.niveau}">${ico(icone[p.niveau])}<span>${esc(fmt(S[p.code] || p.code, { a: n(p.attendue ?? 0), d: p.declaree != null ? n(p.declaree) : p.date || "", e: n(p.ecart ?? 0), m: n(p.montant ?? 0), j: p.jours ?? "" }))}</span></div>`).join("")}</div></div>`;
  });
}

/* ---------- sources ---------- */
async function rendreSources() {
  const S = T[L];
  const r = await api("/api/sources");
  $("#v-src .cadre").innerHTML = `<div class="entete-page"><h1>${esc(S.srcTitre)}</h1><p class="chapo">${esc(S.introSrc)}</p></div>
    <ol class="registre">${(r.sources || []).map((s) => `<li><div><strong dir="auto">${esc(s.reference)}</strong>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : ""}</div></li>`).join("")}</ol>
    <p class="note" style="margin-top:18px">${esc(S.avert)}</p>`;
}

/* ---------- saisie ---------- */
function ajuster() { const t = $("#q"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; $("#envoyer").disabled = !t.value.trim(); }

/* ---------- démarrage ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  construireNav();
  if (HORS_LIGNE_FORCE) $$(".lien-admin").forEach((a) => (a.hidden = true));
  $$(".langues button").forEach((b) => b.addEventListener("click", () => appliquerLangue(b.dataset.l)));
  $("#f-q").addEventListener("submit", (e) => { e.preventDefault(); poser($("#q").value); });
  $("#q").addEventListener("input", ajuster);
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); poser($("#q").value); } });
  $("#parler").addEventListener("click", () => ouvrirAgent(""));
  $("#nouvelle").addEventListener("click", nouvelleConversation);
  $("#f-agent").addEventListener("submit", envoyerAgent);
  $("#a-annuler").addEventListener("click", () => $("#agent").close());
  document.addEventListener("click", (e) => {
    const x = e.target.closest("[data-q],[data-fiche],[data-agent],[data-brut],[data-vue-lien]");
    if (!x) return;
    if (x.dataset.q) poser(x.dataset.q);
    else if (x.dataset.fiche) afficherFiche(x.dataset.fiche);
    else if (x.hasAttribute("data-agent")) ouvrirAgent(derniereQuestion);
    else if (x.dataset.vueLien) ouvrir(x.dataset.vueLien);
    else if (x.hasAttribute("data-brut")) {
      const b = x.nextElementSibling; b.hidden = !b.hidden; x.setAttribute("aria-expanded", !b.hidden);
      const S = T[x.closest("[lang]")?.lang] || T[L]; x.querySelector("span").textContent = b.hidden ? S.voirTexte : S.masquerTexte;
    }
  });
  if (mode === "serveur") {
    try { sante = await (await fetch("/api/sante")).json(); } catch { await preparerLocal(); mode = moteurLocal ? "local" : mode; }
    setTimeout(preparerLocal, 2500);
  }
  appliquerLangue(L);
  ajuster();
  const h = location.hash.slice(1);
  ouvrir(VUES[h] ? h : "chat");
  const q0 = new URLSearchParams(location.search).get("q");
  if (q0) poser(q0);
});
