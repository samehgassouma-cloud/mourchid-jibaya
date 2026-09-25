/* Mourchid Jibaya — espace administration (pilotage public ; tickets, fiches et test protégés par code). */
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nb = (x) => Number(x || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const ses = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch { /* privé */ } } };
let code = ses.get("mj-code") || "";
let courant = "pilotage", minuteur = null;

async function api(url, corps) {
  const r = await fetch(url, { method: corps ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-Code-Admin": code }, body: corps ? JSON.stringify(corps) : undefined });
  if (r.status === 401) { code = ""; ses.set("mj-code", ""); throw new Error("401"); }
  return r.json();
}

/* ---------- onglets ---------- */
const PROTEGES = ["tickets", "fiches", "tester"];
function onglet(t) {
  if (!["pilotage", ...PROTEGES].includes(t)) t = "pilotage";
  courant = t;
  $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
  $$("main > section").forEach((s) => (s.hidden = true));
  history.replaceState(null, "", t === "pilotage" ? location.pathname : "#" + t);
  if (PROTEGES.includes(t) && !code) { $("#t-verrou").hidden = false; $("#t-verrou").dataset.cible = t; $("#code").focus(); return; }
  $("#t-" + t).hidden = false;
  Promise.resolve().then(() => ({ pilotage, tickets, fiches, tester: () => $("#q-test").focus() })[t]()).catch(erreurProtegee);
}
function erreurProtegee(e) { if (String(e.message) === "401") onglet(courant); }

/* ---------- pilotage ---------- */
const SERVICES = { fisc: "Information fiscale", controle: "Bureau de contrôle", recouvrement: "Recette des finances", rne: "RNE", identite: "Identité numérique" };
const LANGUES = { ar: "Arabe / darija", fr: "Français", en: "Anglais" };
const C = { olive: "var(--olive)", encre: "var(--encre-3)", ambre: "var(--ambre)", rouge: "var(--rouge)", doux: "var(--doux)" };
const vide = '<p class="note" style="margin:0">Aucune donnée pour l\'instant : posez des questions dans l\'assistant.</p>';
let tauxMesure = 96;

async function pilotage() {
  const r = await (await fetch("/api/tableau")).json();
  if (r.demandes) tauxMesure = r.taux;
  const evasion = (r.refus || 0) + (r.vigilance || 0);
  const parts = [["Résolues sans agent", r.resolues, "#8FC45A"], ["Transférées", r.tickets, "#C7D3EA"], ["Sans source", r.inconnus, "#EBB660"], ["Évasion recadrée", evasion, "#F28D80"]];
  const tot = Math.max(1, r.demandes || 0, parts.reduce((a, p) => a + (p[1] || 0), 0));
  $("#heros").innerHTML = `<span class="lbl">Taux de résolution sans agent</span>
    <div class="grand">${nb(r.taux)}<small>%</small></div>
    <div class="decomp" role="img" aria-label="Répartition des ${nb(r.demandes)} demandes">${parts.map(([, n, c]) => (n ? `<i style="width:${(n / tot) * 100}%;background:${c}"></i>` : "")).join("")}</div>
    <ul class="legende">${parts.map(([l, n, c]) => `<li style="--c:${c}">${l} <b>${nb(n)}</b></li>`).join("")}</ul>
    <p class="formule">(${r.reponses} réponses sourcées − ${r.tickets_apres_reponse} transferts malgré une réponse) ÷ (${r.questions} questions + ${r.tickets_directs} transferts directs) = ${r.resolues} ÷ ${r.demandes} = ${r.taux} %</p>`;
  $("#secondaires").innerHTML = [
    ["", r.questions, "questions posées"],
    ["olive", r.reponses, "réponses sourcées"],
    ["", r.demandes, "demandes au total"],
    ["", r.tickets, "transferts à un agent"],
    ["alerte", r.inconnus, "questions sans source : textes à clarifier"],
    ["refus", evasion, "demandes d'évasion refusées ou recadrées"],
  ].map(([c, v, l]) => `<div class="sec ${c}"><b>${nb(v)}</b><span>${l}</span></div>`).join("");

  const top = r.top || [], maxT = Math.max(1, ...top.map((x) => x.n));
  $("#top").innerHTML = top.length ? top.map((x) => `<li><span class="l">${esc(x.titre.fr)}</span><b>${x.n}</b><span class="piste"><i style="width:${(x.n / maxT) * 100}%"></i></span></li>`).join("") : `<li style="display:block">${vide}</li>`;

  const lg = Object.entries(r.par_langue || {}), totL = lg.reduce((a, [, n]) => a + n, 0);
  const couleursL = { ar: "var(--encre)", fr: "var(--encre-3)", en: "var(--doux)" };
  $("#langues").innerHTML = totL ? `<div class="repartition">${lg.map(([k, n]) => `<span style="flex:${n};background:${couleursL[k] || C.doux}">${Math.round((n * 100) / totL)} %</span>`).join("")}</div>
    <ul class="rep-leg">${lg.map(([k, n]) => `<li style="--c:${couleursL[k] || C.doux}">${LANGUES[k] || k} <b class="num">${n}</b></li>`).join("")}</ul>` : vide;

  const sv = Object.entries(r.tickets_par_service || {}), maxS = Math.max(1, ...sv.map(([, n]) => n));
  $("#services").innerHTML = sv.length ? sv.sort((a, b) => b[1] - a[1]).map(([k, n]) => `<div class="barre-l"><span>${esc(SERVICES[k] || k)}</span><span class="piste"><i style="width:${(n / maxS) * 100}%"></i></span><b>${n}</b></div>`).join("") : vide;

  bilan("#bilan", r.fiches || {});
  $("#portee").textContent = r.portee === "session"
    ? "Version hors ligne : chiffres de cette session uniquement. Comptages seulement, aucune donnée personnelle."
    : "Indicateurs mesurés en direct sur toutes les conversations, sans aucune donnée personnelle : uniquement des comptages.";
  $("#maj").textContent = "Actualisé à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  simulateur();
}
function bilan(sel, f) {
  const ps = [["source_officielle", "source officielle", C.olive], ["a_confirmer", "à confirmer", C.ambre], ["interne", "interne", C.doux], ["brouillon", "brouillon", "var(--ligne)"]].filter(([k]) => f[k]);
  $(sel).innerHTML = `<div class="repartition">${ps.map(([k, , c]) => `<span style="flex:${f[k]};background:${c}"></span>`).join("")}</div>
    <div class="export"><span class="num" style="font-size:22px;font-weight:500">${nb(f.total)}</span><span class="note" style="font-size:14.5px">fiches</span>
    ${ps.map(([k, l]) => `<span class="etiq ${k}"><b class="num">${f[k]}</b> ${l}</span>`).join("")}
    <span class="note" style="font-size:14px">${nb(f.validees)} validées par l'experte</span>${sel === "#bilan-fiches" ? '<button type="button" class="btn" id="export" style="margin-inline-start:auto"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Télécharger fiches.json</button>' : ""}</div>`;
}

const H = [
  ["q", "Questions reçues par mois", "guichets + téléphone", 1000, 50000, 500, 10000, ""],
  ["taux", "Part résolue sans agent", "mesurée en direct au démarrage", 10, 100, 1, null, " %"],
  ["min", "Minutes d'agent par question", "temps moyen d'accueil et de réponse", 2, 30, 1, 8, " min"],
  ["cout", "Coût d'une heure d'agent", "salaire et charges", 5, 60, 1, 18, " DT"],
];
function simulateur() {
  if (!$("#curseurs").children.length) {
    $("#curseurs").innerHTML = H.map(([k, l, s, a, b, p, v, u]) => `<div class="curseur"><label for="s-${k}"><span>${l}<br><small>${s}</small></span><output id="o-${k}" for="s-${k}"></output></label><input type="range" id="s-${k}" min="${a}" max="${b}" step="${p}" value="${v ?? tauxMesure}" data-u="${u}"></div>`).join("");
    $$("#curseurs input").forEach((i) => i.addEventListener("input", calculer));
  }
  calculer();
}
function calculer() {
  const v = Object.fromEntries(H.map(([k]) => [k, +$("#s-" + k).value]));
  H.forEach(([k]) => ($("#o-" + k).textContent = nb(v[k]) + $("#s-" + k).dataset.u));
  const res = (v.q * v.taux) / 100, h = (res * v.min) / 60, cout = h * v.cout * 12;
  $("#gains").innerHTML = `<div class="gain-tete"><span>Coût évité par an</span><b>${nb(cout)}<small>DT</small></b><small class="note">heures libérées × coût horaire × 12 mois</small></div>` +
    [[nb(res), "questions traitées sans agent / mois", "questions reçues × part résolue"],
     [nb(h) + " h", "heures d'agent libérées / mois", "questions résolues × minutes ÷ 60"],
     [nb(h / 7), "jours de travail rendus au contrôle / mois", "heures ÷ 7 h par jour"]]
      .map(([n, l, f]) => `<div class="gain"><span>${l}</span><b>${n}</b><small>${f}</small></div>`).join("") +
    '<p class="note" style="margin:14px 0 0">Estimations fondées sur les hypothèses affichées, pas des résultats mesurés.</p>';
}

/* ---------- tickets ---------- */
const RES = { sans_source: ["Aucune source suffisante : l'assistant n'a pas répondu", "ouvert"], reponse_donnee: ["Réponse sourcée donnée ; l'usager a quand même demandé un agent", "traite"], refus: ["Demande de fraude refusée", "refus"], vigilance: ["Question évoquant l'évasion : cadre légal rappelé", "ouvert"] };
let filtreT = "ouvert", listeT = [];
async function tickets() {
  const { tickets: t } = await api("/api/admin/tickets");
  listeT = t || [];
  const ouverts = listeT.filter((x) => x.statut === "ouvert").length;
  $("#n-tickets").hidden = !ouverts; $("#n-tickets").textContent = ouverts;
  const f = [["ouvert", "Ouverts", ouverts], ["traite", "Traités", listeT.length - ouverts], ["tous", "Tous", listeT.length]];
  $("#filtre-tickets").innerHTML = f.map(([k, l, n]) => `<button type="button" data-ft="${k}" aria-pressed="${k === filtreT}">${l} <span class="num">${n}</span></button>`).join("");
  const vis = listeT.filter((x) => filtreT === "tous" || (filtreT === "ouvert" ? x.statut === "ouvert" : x.statut !== "ouvert"));
  const date = (s) => { const d = new Date(s); return isNaN(d) ? esc(s) : d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
  $("#liste-tickets").innerHTML = vis.length ? vis.map((x) => {
    const [txt, cls] = RES[x.contexte?.resultat] || [x.contexte?.resultat || "—", "interne"];
    const pr = x.contexte?.fiches_proches || [];
    return `<article class="ticket"><div class="g">
      <div class="ligne1"><strong>${esc(x.id_dossier)}</strong><span>${esc(SERVICES[x.service] || x.service)}</span><span>·</span><span>${date(x.horodatage)}</span><span>·</span><span>${esc(LANGUES[x.langue] || x.langue)}</span>
        <span class="etiq ${x.statut === "ouvert" ? "ouvert" : "traite"}" style="margin-inline-start:auto">${x.statut === "ouvert" ? "Ouvert" : "Traité"}</span></div>
      <p class="question" dir="auto">${esc(x.question)}</p>
      ${x.contact ? `<p class="note" style="margin:0">Contact : <span dir="ltr">${esc(x.contact)}</span></p>` : ""}
      ${x.statut === "ouvert" ? `<label class="sr" for="rep-${x.id}">Réponse de l'agent</label><textarea id="rep-${x.id}" rows="3" placeholder="Réponse de l'agent" data-rep="${x.id}" dir="auto"></textarea><div><button type="button" class="btn plein" data-clore="${x.id}">Répondre et clôturer</button></div>` : `<p style="margin:0;padding-top:10px;border-top:1px dashed var(--ligne)" dir="auto">${esc(x.reponse || "")}</p>`}
    </div><div class="d">
      <h3>Ce que l'assistant a tenté</h3><p class="tentative" style="margin:0"><span class="etiq ${cls}">${esc(txt)}</span></p>
      ${pr.length ? `<h3 style="margin-top:6px">Fiches les plus proches</h3><ul class="proches">${pr.map((f) => `<li><span>${esc(f.titre.fr)}</span>
        <div class="mesure" style="grid-template-columns:70px 1fr 48px"><span>Couverture</span><span class="piste${f.couverture >= 0.34 ? " ok" : ""}"><i style="width:${Math.round(f.couverture * 100)}%"></i><span class="seuil" style="inset-inline-start:34%"></span></span><span>${Math.round(f.couverture * 100)} %</span></div>
        ${f.source ? `<span class="src">${esc(f.source)}</span>` : ""}</li>`).join("")}</ul>` : ""}
    </div></article>`;
  }).join("") : '<p class="note">Aucun ticket dans cette vue.</p>';
}

/* ---------- fiches ---------- */
const ETATS = { source_officielle: "Source officielle", a_confirmer: "À confirmer", interne: "Interne", brouillon: "Brouillon" };
let filtreF = "tous", listeF = [], flash = null;
async function fiches() {
  const { fiches: f, bilan: b } = await api("/api/admin/fiches");
  listeF = f || [];
  $("#n-fiches").hidden = !b.a_confirmer; $("#n-fiches").textContent = b.a_confirmer;
  bilan("#bilan-fiches", b);
  $("#export").onclick = exporter;
  const opts = [["tous", "Toutes", listeF.length], ["a_confirmer", "À confirmer", b.a_confirmer], ["source_officielle", "Source officielle", b.source_officielle], ["interne", "Interne", b.interne || 0]];
  $("#filtre-fiches").innerHTML = opts.map(([k, l, n]) => `<button type="button" data-ff="${k}" aria-pressed="${k === filtreF}">${l} <span class="num">${n}</span></button>`).join("");
  rendreFiches();
}
function rendreFiches() {
  const q = ($("#cherche-fiche").value || "").trim().toLowerCase();
  const vis = listeF.filter((x) => (filtreF === "tous" || x.statut === filtreF) &&
    (!q || [x.id, x.titre.fr, x.titre.ar, x.source?.reference].join(" ").toLowerCase().includes(q)));
  $("#tab-fiches").innerHTML = vis.length ? vis.map((x) => `<tr${x.id === flash ? ' class="flash"' : ""}>
    <td><strong>${esc(x.titre.fr)}</strong><span class="ar" dir="rtl" lang="ar">${esc(x.titre.ar)}</span>${x.note && x.statut !== "source_officielle" ? `<p class="note-exp">${esc(x.note)}</p>` : ""}</td>
    <td class="note" style="max-width:320px">${esc(x.source?.reference || "")}${x.source?.url ? `<br><a href="${esc(x.source.url)}" target="_blank" rel="noopener">Ouvrir le texte</a>` : ""}${x.verifie_le ? `<br>Vérifié le ${esc(x.verifie_le)}` : ""}</td>
    <td><span class="etiq ${x.statut}">${ETATS[x.statut] || x.statut}</span>${x.validation_experte ? `<br><small class="note">${esc(x.validation_experte.par)}, ${esc(x.validation_experte.le)}</small>` : ""}</td>
    <td style="white-space:nowrap;text-align:end">${x.statut !== "source_officielle" ? `<button type="button" class="btn plein" data-valider="${esc(x.id)}">Valider</button>` : `<button type="button" class="btn" data-reconfirmer="${esc(x.id)}">Repasser à confirmer</button>`}</td></tr>`).join("")
    : '<tr><td colspan="4" class="note">Aucune fiche ne correspond.</td></tr>';
  flash = null;
}
async function exporter() {
  const r = await fetch("/api/admin/export", { headers: { "X-Code-Admin": code } });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(await r.blob()), download: "fiches.json" });
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- tester ---------- */
async function lancerTest(e) {
  e.preventDefault();
  const q = $("#q-test").value.trim(); if (!q) return;
  const r = await api("/api/admin/tester", { question: q });
  const res = r.resultats || [], maxS = Math.max(10, ...res.map((x) => x.score)), sS = 4, sC = 0.34;
  const pc = (x) => Math.max(0, Math.min(100, Math.round(x * 100)));
  const barre = (v, s, l, aff) => `<div class="mesure"><span>${l}</span><span class="piste${v >= s ? " ok" : ""}"><i style="width:${pc(v)}%"></i><span class="seuil" style="inset-inline-start:${pc(s)}%"></span></span><span>${aff}</span></div>`;
  $("#res-test").hidden = false;
  $("#res-test").innerHTML = `<section class="bloc" style="margin:0"><h2>Termes compris</h2><div class="jetons" dir="auto">${(r.termes || []).map((t) => `<span class="jeton${t.startsWith("§") ? " concept" : ""}">${esc(t.replace(/^§/, ""))}</span>`).join("") || '<span class="note">aucun</span>'}</div>
      <p class="note" style="margin:10px 0 0">En violet : concepts reconnus dans toutes les langues.</p></section>
    <section class="bloc" style="margin:0"><h2>Fiches candidates</h2><div class="candidats">${res.map((x, i) => `<div class="cand${i === 0 && x.suffisant ? " retenue" : ""}">
        <div class="t"><span>${esc(x.titre)}</span>${x.suffisant ? `<em>${i === 0 ? "retenue" : "suffisante"}</em>` : '<em style="color:var(--doux)">insuffisante</em>'}</div>
        ${barre(x.score / maxS, sS / maxS, "Score", x.score)}${barre(x.couverture, sC, "Couverture", pc(x.couverture) + " %")}
        <div class="jetons" dir="auto">${(x.mots || []).map((m) => `<span class="jeton${m.startsWith("§") ? " concept" : ""}">${esc(m.replace(/^§/, ""))}</span>`).join("")}</div></div>`).join("") || '<p class="note">Aucune fiche candidate.</p>'}</div>
      <p class="note" style="margin:10px 0 0">Seuil exigé : score ≥ ${sS}, couverture ≥ ${sC * 100} %, au moins 2 termes. Le trait vertical marque le seuil.</p></section>`;
}

/* ---------- démarrage ---------- */
function actualiser() {
  clearInterval(minuteur);
  minuteur = setInterval(() => { if (courant === "pilotage" && !document.hidden) pilotage().catch(() => {}); }, 10000);
}
document.addEventListener("DOMContentLoaded", () => {
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => onglet(b.dataset.tab)));
  $("#f-code").addEventListener("submit", async (e) => {
    e.preventDefault(); code = $("#code").value;
    try { await api("/api/admin/stats"); ses.set("mj-code", code); $("#code-err").textContent = ""; onglet($("#t-verrou").dataset.cible || "tickets"); }
    catch { $("#code-err").textContent = "Code incorrect."; }
  });
  $("#f-test").addEventListener("submit", lancerTest);
  $("#q-test").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); lancerTest(e); } });
  $("#cherche-fiche").addEventListener("input", rendreFiches);
  $("#salle").addEventListener("click", () => {
    const on = document.body.classList.toggle("salle");
    $("#salle").setAttribute("aria-pressed", on);
    try { if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.(); else if (!on && document.fullscreenElement) document.exitFullscreen?.(); } catch { /* facultatif */ }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-clore],[data-valider],[data-reconfirmer],[data-ft],[data-ff]"); if (!b) return;
    try {
      if (b.dataset.ft) { filtreT = b.dataset.ft; tickets(); }
      if (b.dataset.ff) { filtreF = b.dataset.ff; $$("[data-ff]").forEach((x) => x.setAttribute("aria-pressed", x === b)); rendreFiches(); }
      if (b.dataset.clore) { b.disabled = true; await api("/api/admin/ticket", { numero: +b.dataset.clore, reponse: $(`[data-rep="${b.dataset.clore}"]`).value }); tickets(); }
      if (b.dataset.valider) { b.disabled = true; flash = b.dataset.valider; await api("/api/admin/valider", { id: b.dataset.valider, statut: "source_officielle" }); fiches(); }
      if (b.dataset.reconfirmer) { b.disabled = true; flash = b.dataset.reconfirmer; await api("/api/admin/valider", { id: b.dataset.reconfirmer, statut: "a_confirmer" }); fiches(); }
    } catch (err) { erreurProtegee(err); }
  });
  onglet(location.hash.slice(1) || "pilotage");
  actualiser();
});
