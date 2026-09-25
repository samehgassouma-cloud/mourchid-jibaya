/* Mourchid Jibaya — espace administration (pilotage public ; tickets, fiches et test protégés par code). */
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nb = (x) => Number(x).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
let code = sessionStorage.getItem("mj-code") || "";

async function api(url, corps) {
  const r = await fetch(url, { method: corps ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-Code-Admin": code }, body: corps ? JSON.stringify(corps) : undefined });
  if (r.status === 401) { code = ""; sessionStorage.removeItem("mj-code"); throw new Error("401"); }
  return r.json();
}

/* ---------- onglets ---------- */
const PROTEGES = ["tickets", "fiches", "tester"];
function onglet(t) {
  $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
  $$("main > section").forEach((s) => (s.hidden = true));
  if (PROTEGES.includes(t) && !code) { $("#t-verrou").hidden = false; $("#t-verrou").dataset.cible = t; return; }
  $("#t-" + t).hidden = false;
  ({ pilotage, tickets, fiches, tester: () => $("#q-test").focus() })[t]();
}

/* ---------- pilotage ---------- */
const barres = (el, items) => {
  const max = Math.max(1, ...items.map((x) => x[1]));
  $(el).innerHTML = items.length ? items.map(([l, n]) => `<div class="barre-l"><span dir="auto">${esc(l)}</span><span class="piste"><i style="width:${(n / max) * 100}%"></i></span><b>${n}</b></div>`).join("")
    : '<p class="note">Aucune donnée pour l\'instant : posez des questions dans l\'assistant.</p>';
};
const SERVICES = { fisc: "Information fiscale", controle: "Bureau de contrôle", recouvrement: "Recette des finances", rne: "RNE", identite: "Identité numérique" };
const LANGUES = { ar: "Arabe / darija", fr: "Français", en: "Anglais" };
let tauxMesure = 96;
async function pilotage() {
  const r = await (await fetch("/api/tableau")).json();
  if (r.demandes) tauxMesure = r.taux;
  $("#kpis").innerHTML = [
    ["fort", r.taux + " %", "résolues sans agent"],
    ["", nb(r.questions), "questions posées"],
    ["", nb(r.reponses), "réponses sourcées"],
    ["", nb(r.tickets), "transferts à un agent"],
    ["", nb(r.inconnus), "questions sans source : textes à clarifier"],
    ["", nb(r.refus + r.vigilance), "demandes d'évasion refusées ou recadrées"],
  ].map(([c, v, l]) => `<div class="kpi ${c}"><b>${v}</b><span>${l}</span></div>`).join("");
  $("#formule").textContent = `Taux de résolution sans agent = (réponses sourcées ${r.reponses} − transferts malgré une réponse ${r.tickets_apres_reponse}) ÷ (questions ${r.questions} + transferts directs ${r.tickets_directs}) = ${r.resolues} ÷ ${r.demandes} = ${r.taux} %`;
  barres("#top", r.top.map((x) => [x.titre.fr, x.n]));
  barres("#langues", Object.entries(r.par_langue).map(([k, n]) => [LANGUES[k] || k, n]));
  barres("#services", Object.entries(r.tickets_par_service).map(([k, n]) => [SERVICES[k] || k, n]));
  const f = r.fiches;
  $("#bilan").innerHTML = `<span class="etiq source_officielle">${f.source_officielle} source officielle</span> <span class="etiq a_confirmer">${f.a_confirmer} à confirmer</span> <span class="etiq interne">${f.interne} interne</span> <span class="note">· ${f.total} fiches · ${f.validees} validées par l'experte</span>`;
  simulateur();
}

const H = [
  ["q", "Questions reçues par mois (guichets + téléphone)", 1000, 50000, 500, 10000, ""],
  ["taux", "Part résolue sans agent", 10, 100, 1, null, " %"],
  ["min", "Minutes d'agent par question", 2, 30, 1, 8, " min"],
  ["cout", "Coût d'une heure d'agent", 5, 60, 1, 18, " DT"],
];
function simulateur() {
  if (!$("#curseurs").children.length) {
    $("#curseurs").innerHTML = H.map(([k, l, a, b, p, v, u]) => `<div class="curseur"><label for="s-${k}">${l}<output id="o-${k}"></output></label><input type="range" id="s-${k}" min="${a}" max="${b}" step="${p}" value="${v ?? tauxMesure}" data-u="${u}"></div>`).join("");
    $$("#curseurs input").forEach((i) => i.addEventListener("input", calculer));
  }
  calculer();
}
function calculer() {
  const v = Object.fromEntries(H.map(([k]) => [k, +$("#s-" + k).value]));
  H.forEach(([k]) => ($("#o-" + k).textContent = nb(v[k]) + $("#s-" + k).dataset.u));
  const res = v.q * v.taux / 100, h = res * v.min / 60, cout = h * v.cout * 12;
  $("#gains").innerHTML = [
    [nb(res), "questions traitées sans agent / mois", "questions × part résolue"],
    [nb(h) + " h", "heures d'agent libérées / mois", "questions résolues × minutes ÷ 60"],
    [nb(h / 7), "jours de travail rendus au contrôle / mois", "heures ÷ 7"],
    [nb(cout) + " DT", "coût évité / an", "heures × coût horaire × 12"],
  ].map(([n, l, f]) => `<div class="gain"><span>${l}<br><small class="note">${f}</small></span><b>${n}</b></div>`).join("") +
    '<p class="note">Estimations fondées sur les hypothèses affichées, pas des résultats mesurés.</p>';
}

/* ---------- tickets ---------- */
const RES = { sans_source: "Aucune source suffisante : l'assistant n'a pas répondu", reponse_donnee: "Réponse sourcée donnée, l'usager a quand même demandé un agent", refus: "Demande de fraude refusée", vigilance: "Question évoquant l'évasion : cadre légal rappelé" };
async function tickets() {
  const { tickets: t } = await api("/api/admin/tickets");
  $("#liste-tickets").innerHTML = t.length ? t.map((x) => `<article class="ticket">
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>${esc(x.id_dossier)} · ${esc(SERVICES[x.service] || x.service)}</strong><span class="etiq ${x.statut === "ouvert" ? "a_confirmer" : "source_officielle"}">${x.statut === "ouvert" ? "Ouvert" : "Traité"}</span></div>
    <p dir="auto" style="font-size:17px;margin:8px 0">${esc(x.question)}</p>
    <p class="note" style="margin:0">${esc(x.horodatage)} · ${esc(LANGUES[x.langue] || x.langue)}${x.contact ? " · " + esc(x.contact) : ""}</p>
    <p class="note" style="margin:6px 0 0">Tentative de l'assistant : ${esc(RES[x.contexte.resultat] || x.contexte.resultat || "—")}${x.contexte.fiches_proches?.length ? " · fiches proches : " + x.contexte.fiches_proches.map((f) => esc(f.titre.fr)).join(", ") : ""}</p>
    ${x.statut === "ouvert" ? `<textarea rows="3" placeholder="Réponse de l'agent" data-rep="${x.id}"></textarea><div style="margin-top:8px"><button class="btn plein" data-clore="${x.id}">Répondre et clôturer</button></div>` : `<p style="margin:8px 0 0">${esc(x.reponse || "")}</p>`}
  </article>`).join("") : '<p class="note">Aucun ticket pour l\'instant.</p>';
}

/* ---------- fiches ---------- */
const ETATS = { source_officielle: "Source officielle", a_confirmer: "À confirmer", interne: "Interne", brouillon: "Brouillon" };
async function fiches() {
  const { fiches: f, bilan: b } = await api("/api/admin/fiches");
  $("#bilan-fiches").innerHTML = `${b.source_officielle} source officielle · ${b.a_confirmer} à confirmer · ${b.validees} validées · <a href="#" id="export">Télécharger fiches.json</a> (à versionner dans Git après validation)`;
  $("#export").onclick = async (e) => {
    e.preventDefault();
    const r = await fetch("/api/admin/export", { headers: { "X-Code-Admin": code } });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(await r.blob()), download: "fiches.json" }); a.click();
  };
  $("#tab-fiches").innerHTML = f.map((x) => `<tr>
    <td><strong>${esc(x.titre.fr)}</strong><br><span class="note" dir="rtl">${esc(x.titre.ar)}</span></td>
    <td class="note">${esc(x.source?.reference || "")}${x.source?.url ? `<br><a href="${esc(x.source.url)}" target="_blank" rel="noopener">lien</a>` : ""}</td>
    <td><span class="etiq ${x.statut}">${ETATS[x.statut] || x.statut}</span>${x.validation_experte ? `<br><small class="note">${esc(x.validation_experte.par)}, ${esc(x.validation_experte.le)}</small>` : ""}</td>
    <td style="white-space:nowrap">${x.statut !== "source_officielle" ? `<button class="btn" data-valider="${esc(x.id)}">Valider</button>` : `<button class="btn" data-reconfirmer="${esc(x.id)}">Repasser à confirmer</button>`}</td></tr>`).join("");
}

/* ---------- tester ---------- */
async function lancerTest(e) {
  e.preventDefault();
  const q = $("#q-test").value.trim(); if (!q) return;
  const r = await api("/api/admin/tester", { question: q });
  $("#res-test").hidden = false;
  $("#res-test").innerHTML = `<h3>Termes compris</h3><div class="jetons" dir="auto">${r.termes.map((t) => `<span class="jeton${t.startsWith("§") ? " concept" : ""}">${esc(t)}</span>`).join("")}</div>
    <h3 style="margin-top:16px">Fiches candidates</h3><table><thead><tr><th>Fiche</th><th>Score</th><th>Couverture</th><th>Mots trouvés</th><th>Suffisant</th></tr></thead><tbody>
    ${r.resultats.map((x) => `<tr><td>${esc(x.titre)}</td><td>${x.score}</td><td>${Math.round(x.couverture * 100)} %</td><td dir="auto">${x.mots.map(esc).join(", ")}</td><td>${x.suffisant ? "✓" : "—"}</td></tr>`).join("")}</tbody></table>`;
}

/* ---------- démarrage ---------- */
document.addEventListener("DOMContentLoaded", () => {
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => onglet(b.dataset.tab)));
  $("#f-code").addEventListener("submit", async (e) => {
    e.preventDefault(); code = $("#code").value;
    try { await api("/api/admin/stats"); sessionStorage.setItem("mj-code", code); $("#code-err").textContent = ""; onglet($("#t-verrou").dataset.cible || "tickets"); }
    catch { $("#code-err").textContent = "Code incorrect."; }
  });
  $("#f-test").addEventListener("submit", lancerTest);
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-clore],[data-valider],[data-reconfirmer]"); if (!b) return;
    if (b.dataset.clore) { await api("/api/admin/ticket", { numero: +b.dataset.clore, reponse: $(`[data-rep="${b.dataset.clore}"]`).value }); tickets(); }
    if (b.dataset.valider) { await api("/api/admin/valider", { id: b.dataset.valider, statut: "source_officielle" }); fiches(); }
    if (b.dataset.reconfirmer) { await api("/api/admin/valider", { id: b.dataset.reconfirmer, statut: "a_confirmer" }); fiches(); }
  });
  onglet(location.hash.slice(1) || "pilotage");
});
