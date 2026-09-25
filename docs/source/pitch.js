// Pitch deck Mourchid Jibaya V2 — identité alignée sur l'application (encre bleue, tampon de source).
// Usage : DEMO_URL=https://... GITHUB_URL=https://... node pitch.js
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const DEMO = process.env.DEMO_URL || "https://COMPTE-mourchid-jibaya.hf.space";
const GH = process.env.GITHUB_URL || "https://github.com/COMPTE/mourchid-jibaya";
const IMG = __dirname + "/img/";

const C = { encre: "13233F", encre2: "1E3560", glace: "C9D6EE", papier: "F3F5F4", blanc: "FFFFFF", texte: "16202E", doux: "5D6878",
  ligne: "DCE2E6", olive: "3F6B1E", oliveF: "E8F0DF", ambre: "9A6212", ambreF: "FBF0DC", rouge: "A3261B", rougeF: "FBE7E4", ia: "4B45B8", iaF: "ECEBFB" };
const TITRE = "Cambria", CORPS = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.title = "Mourchid Jibaya — pitch";
pres.author = "Sameh Gassouma, Cyrine Gassouma";
const W = 13.333, H = 7.5, M = 0.6;
let n = 0;

function pied(s, sombre) {
  n++;
  s.addText([{ text: "Mourchid Jibaya · Hackathon national IA & Finances publiques 2026" }], { x: M, y: H - 0.42, w: 9, h: 0.3, fontFace: CORPS, fontSize: 10, color: sombre ? "AFC0DE" : C.doux, margin: 0, isTextBox: true });
  s.addText(String(n).padStart(2, "0"), { x: W - M - 1, y: H - 0.42, w: 1, h: 0.3, fontFace: CORPS, fontSize: 10, color: sombre ? "AFC0DE" : C.doux, align: "right", margin: 0, isTextBox: true });
}
function titre(s, t, sous) {
  s.addText(t, { x: M, y: 0.42, w: W - 2 * M, h: 0.85, fontFace: TITRE, fontSize: 32, bold: true, color: C.encre, margin: 0, valign: "top", isTextBox: true });
  if (sous) s.addText(sous, { x: M, y: 1.22, w: W - 2 * M, h: 0.45, fontFace: CORPS, fontSize: 16, color: C.doux, margin: 0, isTextBox: true });
}
function tampon(s, x, y, d, lignes, couleur, rot = -9) { // le motif : un tampon administratif à double cercle
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, line: { color: couleur, width: 2.25 }, fill: { type: "none" }, rotate: rot });
  const e = d * 0.07;
  s.addShape(pres.shapes.OVAL, { x: x + e, y: y + e, w: d - 2 * e, h: d - 2 * e, line: { color: couleur, width: 1 }, fill: { type: "none" } });
  s.addText(lignes, { x: x + e, y: y + e, w: d - 2 * e, h: d - 2 * e, align: "center", valign: "middle", fontFace: TITRE, bold: true, color: couleur, rotate: rot, margin: 0, isTextBox: true });
}
function carte(s, x, y, w, h, fond = C.blanc) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fond }, line: { color: C.ligne, width: 0.75 } });
}
function pastille(s, x, y, txt, fond, coul, w) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.42, rectRadius: 0.21, fill: { color: fond }, line: { type: "none" } });
  s.addText(txt, { x, y, w, h: 0.42, align: "center", valign: "middle", fontFace: CORPS, fontSize: 13, color: coul, bold: true, margin: 0, isTextBox: true });
}
function image(s, fichier, x, y, w, pxW, pxH, bord = true) {
  const h = w * pxH / pxW;
  s.addImage({ path: IMG + fichier, x, y, w, h, shadow: bord ? { type: "outer", color: "13233F", opacity: 0.18, blur: 12, offset: 3, angle: 90 } : undefined });
  return h;
}
function blocTexte(s, x, y, w, t, corps, opt = {}) {
  s.addText([{ text: t, options: { bold: true, fontSize: opt.ft || 17, color: opt.ct || C.encre, breakLine: true } },
    { text: corps, options: { fontSize: opt.fc || 14, color: opt.cc || C.texte } }],
  { x, y, w, h: opt.h || 1.2, fontFace: CORPS, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true });
}
function qr(s, x, y, d) { s.addImage({ path: IMG + "qr_demo.png", x, y, w: d, h: d }); }

/* 1. Titre */
{
  const s = pres.addSlide(); s.background = { color: C.encre };
  tampon(s, 8.75, 1.35, 3.6, [{ text: "مرشد جباية", options: { fontSize: 34, breakLine: true } }, { text: "Source officielle", options: { fontSize: 15, fontFace: CORPS } }], C.glace);
  s.addText("Mourchid Jibaya", { x: M, y: 1.5, w: 8, h: 1.1, fontFace: TITRE, fontSize: 54, bold: true, color: C.blanc, margin: 0, isTextBox: true });
  s.addText("L'assistant fiscal IA qui répond 24h/24, en arabe, en darija, en français et en anglais, et qui cite toujours sa source officielle.",
    { x: M, y: 2.75, w: 7.6, h: 1.2, fontFace: CORPS, fontSize: 21, color: "E6ECF7", margin: 0, isTextBox: true });
  pastille(s, M, 4.25, "Défi principal · T9 Agent virtuel 24h/24", C.blanc, C.encre, 4.1);
  pastille(s, M + 4.3, 4.25, "Complémentaire · T4 Facilitation", C.encre2, C.glace, 3.4);
  s.addText([{ text: "Sameh Gassouma", options: { bold: true } }, { text: "  conseillère fiscale depuis 2007, profil métier", options: { breakLine: true } },
    { text: "Cyrine Gassouma", options: { bold: true } }, { text: "  ingénieure logiciel, profil technique" }],
  { x: M, y: 5.2, w: 8, h: 0.8, fontFace: CORPS, fontSize: 15, color: C.glace, margin: 0, isTextBox: true });
  pied(s, true);
  s.addNotes("Bonjour. Mourchid Jibaya, c'est le guide fiscal : un assistant qui répond à toute heure, dans la langue du contribuable, darija comprise, et qui ne répond jamais sans citer le texte officiel. Défi T9, avec T4 en complément.");
}

/* 2. Problème */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Le contribuable se perd, les guichets saturent, les recettes arrivent en retard");
  const cols = [["Des textes éclatés", "Codes, lois de finances, notes communes, calendrier fiscal : l'information existe, mais elle est dispersée et technique."],
    ["Des plateformes multiples", "Jibayti, El Fatoora (TTN), RNE : chaque démarche a son portail, ses prérequis et son vocabulaire."],
    ["Des guichets saturés", "Les mêmes questions reviennent chaque mois. Les agents répondent au lieu de contrôler."]];
  cols.forEach(([t, c], i) => {
    const x = M + i * 4.1;
    carte(s, x, 1.75, 3.85, 2.75);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 2.05, w: 0.6, h: 0.6, fill: { color: C.encre }, line: { type: "none" } });
    s.addText(String(i + 1), { x: x + 0.3, y: 2.05, w: 0.6, h: 0.6, align: "center", valign: "middle", fontFace: TITRE, bold: true, fontSize: 18, color: C.blanc, margin: 0, isTextBox: true });
    blocTexte(s, x + 0.3, 2.9, 3.3, t, c, { h: 1.5 });
  });
  carte(s, M, 4.85, W - 2 * M, 1.55, C.encre);
  s.addText([{ text: "Depuis le 1er janvier 2026", options: { bold: true, color: C.blanc } },
    { text: ", la loi de finances (art. 53) étend la facture électronique à toutes les prestations de services : une vague de nouvelles questions, souvent posées en darija, à laquelle les guichets ne peuvent pas répondre seuls.", options: { color: "E6ECF7" } }],
  { x: M + 0.4, y: 4.95, w: W - 2 * M - 0.8, h: 1.35, fontFace: CORPS, fontSize: 18, valign: "middle", margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("Trois constats du terrain, que je vis depuis 2007 comme conseillère fiscale. Et une actualité : l'article 53 de la LF 2026 fait exploser les questions sur la facture électronique.");
}

/* 3. Pour qui */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Deux utilisateurs, un même outil");
  const liste = (x, y, t, items, fond) => {
    carte(s, x, y, 7.4, 2.35, fond);
    s.addText(t, { x: x + 0.35, y: y + 0.25, w: 6.8, h: 0.45, fontFace: TITRE, bold: true, fontSize: 20, color: C.encre, margin: 0, isTextBox: true });
    s.addText(items.map((it, i) => ({ text: it, options: { bullet: true, breakLine: i < items.length - 1 } })),
      { x: x + 0.35, y: y + 0.8, w: 6.8, h: 1.45, fontFace: CORPS, fontSize: 15, color: C.texte, paraSpaceAfter: 5, margin: 0, valign: "top", isTextBox: true });
  };
  liste(M, 1.6, "Le contribuable", ["TPE, professions libérales, personnes physiques", "Pose sa question quand il veut, dans sa langue, darija comprise", "Connaît ses échéances et vérifie sa TVA avant de déposer", "Parle à un agent quand la réponse ne suffit pas"]);
  liste(M, 4.2, "L'agent de la DGI", ["Ne reçoit que les cas complexes, déjà résumés", "Voit les points de blocage récurrents en direct", "Sait quels textes clarifier en priorité", "Consacre plus de temps au contrôle"]);
  image(s, "mob_accueil_ar.png", 9.1, 1.35, 2.55, 1170, 2532);
  s.addText("Accueil en arabe, sur téléphone", { x: 8.6, y: 6.9, w: 3.6, h: 0.3, align: "center", fontFace: CORPS, fontSize: 11, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("Deux bénéficiaires : le contribuable qui obtient une réponse fiable à 23h en darija, et l'agent qui ne reçoit plus que les vrais cas.");
}

/* 4. Existant vs Mourchid */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Ce qui existe aujourd'hui, et ce que Mourchid ajoute");
  const O = { text: "Oui", options: { color: C.olive, bold: true } }, N = { text: "Non", options: { color: C.rouge } }, P = { text: "Partiel", options: { color: C.ambre } };
  const cel = (v, fond) => ({ text: typeof v === "string" ? v : v.text, options: { ...(v.options || {}), fill: { color: fond }, align: "center" } });
  const lignes = [
    ["Disponible 24h/24", O, N, O, O],
    ["Comprend la darija", N, O, P, O],
    ["Cite le texte officiel à chaque réponse", P, P, N, O],
    ["Refuse d'inventer quand la source manque", O, P, N, O],
    ["Refuse d'aider à contourner l'impôt", O, O, P, O],
    ["Transmet à l'agent avec le contexte", N, N, N, O],
    ["Mesure les points de blocage", N, N, N, O],
  ];
  const tete = ["", "Portail et FAQ", "Guichet et téléphone", "Chatbot IA généraliste", "Mourchid Jibaya"].map((t, i) => ({ text: t, options: { bold: true, color: i === 4 ? C.blanc : C.encre, fill: { color: i === 4 ? C.encre : "E4E9EE" }, align: i ? "center" : "left" } }));
  const rows = [tete, ...lignes.map((l) => [{ text: l[0], options: { fill: { color: C.blanc }, color: C.texte } }, ...l.slice(1).map((v, i) => cel(v, i === 3 ? C.oliveF : C.blanc))])];
  s.addTable(rows, { x: M, y: 1.6, w: W - 2 * M, colW: [4.3, 1.95, 1.95, 1.95, 1.98], rowH: 0.56, fontFace: CORPS, fontSize: 14, valign: "middle", border: { type: "solid", pt: 0.75, color: C.ligne } });
  s.addText("La différence ne tient pas au modèle d'IA, mais à la contrainte : une source officielle ou rien, et un humain dans la boucle.", { x: M, y: 6.25, w: W - 2 * M, h: 0.5, fontFace: CORPS, italic: true, fontSize: 16, color: C.encre, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("Critère innovation : un chatbot généraliste invente des taux et des dates. Nous, jamais : chaque phrase vient d'un texte officiel cité, et si la source manque, un agent reprend la main.");
}

/* 5. Données */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Textes officiels publics et données simulées");
  const cartes = [["Corpus officiel public", "34 fiches tirées de la loi de finances 2026, des codes fiscaux (IRPP/IS, TVA, CDPF, fiscalité locale), des notes communes DGI, de la loi n° 2018-52 (RNE) et du décret n° 2019-54.", C.olive],
    ["Données simulées", "Montants saisis par l'usager dans « Vérifier ma déclaration » ; rien n'est transmis à l'administration.", C.encre],
    ["Aucune donnée sensible", "Aucune donnée personnelle ou confidentielle, aucun accès aux systèmes de l'administration. Loi organique n° 2004-63 respectée.", C.rouge]];
  cartes.forEach(([t, c, col], i) => {
    const x = M + i * 4.1; carte(s, x, 1.65, 3.85, 2.9);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 1.95, w: 0.32, h: 0.32, fill: { color: col }, line: { type: "none" } });
    blocTexte(s, x + 0.3, 2.45, 3.3, t, c, { h: 2 });
  });
  [["34", "fiches trilingues"], ["20", "source officielle"], ["13", "à confirmer par la DGI"], ["4", "langues comprises"]].forEach(([v, l], i) => {
    const x = M + i * 3.07;
    s.addText(v, { x, y: 4.85, w: 2.9, h: 0.8, fontFace: TITRE, bold: true, fontSize: 40, color: C.encre, margin: 0, isTextBox: true });
    s.addText(l, { x, y: 5.6, w: 2.9, h: 0.4, fontFace: CORPS, fontSize: 14, color: C.doux, margin: 0, isTextBox: true });
  });
  s.addText("Travaux préparatoires déclarés (art. 6.1) : recherche documentaire et maquette avant le hackathon ; tout le code écrit pendant le hackathon, historique Git horodaté.",
    { x: M, y: 6.2, w: W - 2 * M, h: 0.45, fontFace: CORPS, fontSize: 12, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("Uniquement des textes publics. Chaque fiche porte sa référence, son lien, sa date de vérification et son état de validation.");
}

/* 6. Approche IA */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Rechercher d'abord, rédiger sous contrainte", "Une IA hybride : la recherche choisit le texte officiel, le modèle de langage ne fait que le reformuler.");
  const et = [["Comprendre", "Normalisation de l'arabe, racinisation, darija, fautes de frappe"], ["Relier", "Lexique de concepts AR · darija · FR · EN"],
    ["Retrouver", "Recherche BM25 pondérée sur les 34 fiches"], ["Décider", "Seuil : score, couverture, au moins 2 termes"], ["Rédiger", "Claude Haiku 4.5, limité à la fiche ; NO_SOURCE sinon"]];
  const bw = 2.2, gap = 0.26;
  et.forEach(([t, c], i) => {
    const x = M + i * (bw + gap), fond = i === 4 ? C.iaF : C.blanc;
    carte(s, x, 2.0, bw, 2.15, fond);
    s.addText(t, { x: x + 0.2, y: 2.15, w: bw - 0.4, h: 0.45, fontFace: TITRE, bold: true, fontSize: 17, color: i === 4 ? C.ia : C.encre, margin: 0, isTextBox: true });
    s.addText(c, { x: x + 0.2, y: 2.65, w: bw - 0.4, h: 1.4, fontFace: CORPS, fontSize: 13, color: C.texte, margin: 0, valign: "top", isTextBox: true });
    if (i < 4) s.addText("›", { x: x + bw - 0.02, y: 2.75, w: gap + 0.04, h: 0.5, align: "center", fontFace: CORPS, fontSize: 26, color: C.doux, margin: 0, isTextBox: true });
  });
  const bas = [["Sous le seuil", "« Je ne sais pas », fiches proches et ticket vers l'agent du service compétent.", C.ambreF, C.ambre],
    ["Réponse citée et expliquée", "Référence, lien, date de vérification, et le raisonnement visible par l'usager.", C.oliveF, C.olive],
    ["Validation experte", "L'expert répond aux questions sans source dans /admin ; la base apprend sans redéploiement.", C.blanc, C.encre]];
  bas.forEach(([t, c, f, col], i) => { const x = M + i * 4.1; carte(s, x, 4.5, 3.85, 1.75, f); blocTexte(s, x + 0.3, 4.7, 3.3, t, c, { ct: col, h: 1.4 }); });
  s.addText("Sans clé API ou en cas de panne réseau, la fiche officielle s'affiche telle quelle : la démonstration ne casse jamais.", { x: M, y: 6.45, w: W - 2 * M, h: 0.4, fontFace: CORPS, fontSize: 13, italic: true, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("Le coeur technique : un RAG strict. La recherche trouve la fiche officielle, le modèle ne fait que rédiger, et il a l'ordre d'écrire NO_SOURCE si la fiche ne suffit pas.");
}

/* 7. Confiance */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Zéro invention : quatre garde-fous");
  const g = [["Une source ou rien", "Réponse uniquement à partir des fiches officielles, référence affichée."], ["« Je ne sais pas »", "Sans source suffisante, il le dit et transfère à un agent."],
    ["Refus du contournement", "Demande de fraude : refus motivé et pistes légales. Question ambiguë : rappel du cadre légal."], ["Données protégées", "Rien n'est transmis sans l'accord du contribuable ; tableau de bord en comptages seulement."]];
  g.forEach(([t, c], i) => { const x = M + (i % 2) * 3.55, y = 1.6 + Math.floor(i / 2) * 2.45; carte(s, x, y, 3.35, 2.25); blocTexte(s, x + 0.28, y + 0.28, 2.8, t, c, { h: 1.8 }); });
  const h1 = image(s, "carte_refus.png", 8.05, 1.6, 4.7, 1544, 702);
  image(s, "carte_inconnu.png", 8.05, 1.6 + h1 + 0.35, 4.7, 1544, 436);
  pied(s);
  s.addNotes("Deux cas réels du prototype à droite : une demande de fraude refusée avec des pistes légales, et une question hors sujet où l'assistant avoue ne pas savoir.");
}

/* 8. Prototype */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Un prototype en ligne, prêt à tester");
  image(s, "desk_reponse.png", M, 1.45, 7.9, 2880, 1720);
  image(s, "mob_echeances_ar.png", 8.85, 1.45, 2.05, 1170, 2532);
  const mods = [["Assistant cité", "T9"], ["Mes échéances + rappels", "T4"], ["Vérifier ma TVA", "T4"], ["Parler à un agent", "T9"]];
  mods.forEach(([t, d], i) => {
    const y = 1.55 + i * 1.05;
    s.addText([{ text: d + "  ", options: { color: C.ambre, bold: true, fontSize: 12 } }, { text: t, options: { color: C.encre, bold: true, fontSize: 14 } }],
      { x: 11.1, y, w: 1.9, h: 0.9, fontFace: CORPS, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText("Question en darija, réponse en arabe avec la LF 2026 art. 53 et son lien", { x: M, y: 6.3, w: 7.9, h: 0.35, fontFace: CORPS, fontSize: 12, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("Web et mobile, responsive, en arabe et en français. À gauche la réponse citée, à droite le calendrier fiscal personnalisé avec les reports des jours fériés.");
}

/* 9. IA explicable */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Une IA qui montre son raisonnement");
  image(s, "carte_trace.png", M, 1.4, 4.9, 1544, 1660);
  const pts = [["Langue comprise", "Arabe, darija, français ou anglais, détectés automatiquement."], ["Mots et concepts", "« فاتورة إلكترونية » et « facture électronique » mènent au même concept."],
    ["Fiches candidates", "Score et couverture de chaque fiche, et le seuil exigé pour répondre."], ["Texte officiel d'origine", "Quand l'IA reformule, l'usager peut toujours afficher la fiche brute."]];
  pts.forEach(([t, c], i) => blocTexte(s, 6.1, 1.55 + i * 1.2, 6.6, t, c, { h: 1.1, fc: 15 }));
  carte(s, 6.1, 6.2, 6.6, 0.62, C.encre);
  s.addText("L'agent et le contribuable voient pourquoi la réponse est donnée.", { x: 6.3, y: 6.2, w: 6.3, h: 0.62, fontFace: CORPS, fontSize: 15, bold: true, color: C.blanc, valign: "middle", margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("Transparence : on ouvre « comment j'ai trouvé cette réponse ». C'est ce qui rend l'outil acceptable pour une administration.");
}

/* 10. Administration */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Pour l'administration : piloter et améliorer");
  image(s, "admin_pilotage.png", M, 1.4, 7.4, 2560, 1800);
  const pts = [["Indicateurs en direct", "Taux de résolution sans agent, avec sa formule affichée."], ["Textes à clarifier", "Les questions sans source révèlent les notes communes à écrire."],
    ["Tickets avec contexte", "L'agent voit la question, la langue et ce que l'assistant a tenté."], ["Validation experte", "Une fiche validée est utilisée aussitôt, sans redéploiement."]];
  pts.forEach(([t, c], i) => blocTexte(s, 8.35, 1.5 + i * 1.28, 4.4, t, c, { h: 1.15, fc: 14 }));
  pied(s);
  s.addNotes("L'espace /admin : ce que l'assistant apporte en direct, la file des tickets, et la validation des fiches par l'expert DGI.");
}

/* 11. Résultats */
{
  const s = pres.addSlide(); s.background = { color: C.encre };
  s.addText("Mesuré sur le prototype", { x: M, y: 0.45, w: 10, h: 0.85, fontFace: TITRE, fontSize: 32, bold: true, color: C.blanc, margin: 0, isTextBox: true });
  const st = [["25/25", "formulations nouvelles d'un jeu indépendant (FR, AR, darija, EN) : bonne fiche, source citée"], ["4/4", "questions hors sujet transférées à un agent, aucune invention"],
    ["24/24", "tests automatisés : moteur, API, garde-fous, échéances, TVA, sécurité"], ["101/101", "réponses identiques entre le moteur serveur et le moteur hors ligne"]];
  st.forEach(([v, l], i) => {
    const x = M + (i % 2) * 6.1, y = 1.6 + Math.floor(i / 2) * 2.3;
    s.addText(v, { x, y, w: 5.8, h: 1.05, fontFace: TITRE, bold: true, fontSize: 54, color: C.blanc, margin: 0, isTextBox: true });
    s.addText(l, { x, y: y + 1.05, w: 5.6, h: 0.8, fontFace: CORPS, fontSize: 15, color: C.glace, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText("< 1 ms de recherche par question · intégration continue à chaque modification du code", { x: M, y: 6.3, w: W - 2 * M, h: 0.4, fontFace: CORPS, fontSize: 14, color: "AFC0DE", margin: 0, isTextBox: true });
  pied(s, true);
  s.addNotes("Des résultats mesurés, pas annoncés. Le jeu d'évaluation n'a pas servi à construire les fiches. Tout est rejouable depuis le dépôt GitHub.");
}

/* 12. Impact et pilote */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Plus de recettes à temps, moins de coûts");
  const imp = [["Recettes encaissées à temps", "Guidage et rappels réduisent les retards de dépôt et de paiement."], ["Civisme fiscal volontaire", "Un contribuable qui comprend ses obligations déclare mieux, sans contrôle."],
    ["Moins d'erreurs et de contentieux", "Le pré-contrôle corrige avant le dépôt."], ["Agents réaffectés au contrôle", "Les questions répétitives quittent le guichet."]];
  imp.forEach(([t, c], i) => blocTexte(s, M, 1.5 + i * 1.12, 5.4, t, c, { h: 1.05, fc: 14, ft: 16 }));
  carte(s, 6.35, 1.5, 6.4, 5.05);
  s.addText("Pilote de 3 mois : six indicateurs", { x: 6.65, y: 1.7, w: 5.9, h: 0.45, fontFace: TITRE, bold: true, fontSize: 18, color: C.encre, margin: 0, isTextBox: true });
  const ind = [["Déclarations déposées dans les délais", "↑"], ["Passages et appels au guichet", "↓"], ["Déclarations à corriger", "↓"], ["Pénalités de retard (DT / mois)", "↓"], ["Questions résolues sans agent", "↑"], ["Satisfaction des usagers (/5)", "↑"]];
  s.addTable(ind.map(([a, b]) => [{ text: a, options: { color: C.texte } }, { text: b, options: { color: b === "↑" ? C.olive : C.encre, bold: true, align: "center" } }]),
    { x: 6.65, y: 2.3, w: 5.8, colW: [5.0, 0.8], rowH: 0.5, fontFace: CORPS, fontSize: 14, border: { type: "solid", pt: 0.5, color: C.ligne } });
  s.addText("Exemple du simulateur (hypothèses affichées, à calibrer) : 10 000 questions/mois, 69 % résolues, 8 min par question ≈ 920 heures d'agent libérées chaque mois.",
    { x: 6.65, y: 5.45, w: 5.8, h: 0.95, fontFace: CORPS, fontSize: 12, italic: true, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("L'impact se mesure. Le simulateur de /admin montre la méthode ; les vrais chiffres viendront du pilote avec un groupe témoin.");
}

/* 13. Architecture */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Une architecture simple, prête pour un pilote");
  const bx = (x, y, w, h, t, sous, f = C.blanc, c = C.encre) => { carte(s, x, y, w, h, f); s.addText([{ text: t, options: { bold: true, fontSize: 15, color: c, breakLine: true } }, { text: sous, options: { fontSize: 12, color: f === C.encre ? C.glace : C.doux } }], { x: x + 0.15, y, w: w - 0.3, h, align: "center", valign: "middle", fontFace: CORPS, margin: 0, isTextBox: true }); };
  bx(M, 1.7, 2.4, 1.3, "Usager", "web · mobile · hors ligne");
  bx(M, 3.55, 2.4, 1.3, "Agent DGI", "/admin");
  bx(3.55, 2.6, 2.6, 1.3, "API FastAPI", "documentée sur /docs", C.encre, C.blanc);
  bx(6.75, 1.7, 2.6, 1.3, "Moteur", "langue · lexique · BM25 · seuils");
  bx(6.75, 3.55, 2.6, 1.3, "Fiches officielles", "JSON versionné · SQLite");
  bx(6.75, 5.1, 2.6, 1.1, "Modèle de langage", "Claude Haiku ou Ollama local", C.iaF, C.ia);
  [[3.0, 2.35, 3.55, 3.1], [3.0, 4.2, 3.55, 3.4], [6.15, 3.1, 6.75, 2.35], [6.15, 3.4, 6.75, 4.2], [8.05, 3.0, 8.05, 3.55], [4.85, 3.9, 6.75, 5.65]].forEach(([x1, y1, x2, y2]) =>
    s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipV: (y2 < y1) !== (x2 < x1), line: { color: C.doux, width: 1.25 } }));
  const pts = ["Python, FastAPI, JavaScript sans framework", "Docker, hébergé sur Hugging Face Spaces", "Intégration continue : tests, évaluation, parité", "Repli automatique hors ligne dans le navigateur", "Souveraineté : modèle local possible, hébergement en Tunisie"];
  s.addText(pts.map((p, i) => ({ text: p, options: { bullet: true, breakLine: i < pts.length - 1 } })), { x: 9.8, y: 1.7, w: 3.0, h: 4.5, fontFace: CORPS, fontSize: 14, color: C.texte, paraSpaceAfter: 10, margin: 0, valign: "top", isTextBox: true });
  pied(s);
  s.addNotes("Faisabilité : une architecture volontairement simple, conteneurisée et testée. Pour la production, le modèle peut tourner en local pour la souveraineté des données.");
}

/* 14. Limites, perspectives, démo */
{
  const s = pres.addSlide(); s.background = { color: C.papier };
  titre(s, "Ce qui reste à faire, et comment");
  carte(s, M, 1.5, 4.0, 4.95);
  s.addText("Limites identifiées", { x: M + 0.3, y: 1.7, w: 3.5, h: 0.4, fontFace: TITRE, bold: true, fontSize: 18, color: C.encre, margin: 0, isTextBox: true });
  const lim = ["13 fiches à relire sur le texte officiel ; validation DGI nécessaire", "Couverture limitée aux 34 fiches ; le reste va à un agent", "Fêtes religieuses estimées ; pénalités non calculées", "TVA mensuelle seulement, sur montants saisis"];
  s.addText(lim.map((p, i) => ({ text: p, options: { bullet: true, breakLine: i < lim.length - 1 } })), { x: M + 0.3, y: 2.25, w: 3.45, h: 4, fontFace: CORPS, fontSize: 14, color: C.texte, paraSpaceAfter: 8, margin: 0, valign: "top", isTextBox: true });
  const etapes = [["Septembre 2026", "Prototype : assistant cité, échéances, TVA, administration"], ["3 mois", "Pilote dans un centre des impôts, corpus validé par la DGI, groupe témoin"], ["2027", "Déploiement national ; WhatsApp et voix ; Jibayti, El Fatoora, douane"]];
  etapes.forEach(([d, t], i) => {
    const y = 1.6 + i * 1.6;
    s.addShape(pres.shapes.OVAL, { x: 4.95, y: y + 0.08, w: 0.3, h: 0.3, fill: { color: i ? C.blanc : C.encre }, line: { color: C.encre, width: 1.5 } });
    if (i < 2) s.addShape(pres.shapes.LINE, { x: 5.1, y: y + 0.4, w: 0, h: 1.3, line: { color: C.glace, width: 1.5 } });
    blocTexte(s, 5.45, y, 3.6, d, t, { h: 1.3, fc: 14 });
  });
  carte(s, 9.4, 1.5, 3.35, 4.95, C.encre);
  qr(s, 10.05, 1.8, 2.05);
  s.addText([{ text: "Testez-le maintenant", options: { bold: true, fontSize: 16, color: C.blanc, breakLine: true } }, { text: DEMO.replace(/^https?:\/\//, ""), options: { fontSize: 11, color: C.glace, breakLine: true } },
    { text: " ", options: { fontSize: 6, breakLine: true } }, { text: "Code source", options: { bold: true, fontSize: 13, color: C.blanc, breakLine: true } }, { text: GH.replace(/^https?:\/\//, ""), options: { fontSize: 11, color: C.glace } }],
  { x: 9.6, y: 4.0, w: 2.95, h: 2.3, align: "center", valign: "top", fontFace: CORPS, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes("Nous connaissons nos limites et le chemin : validation DGI, pilote de trois mois, puis déploiement national. Scannez le QR code pour tester vous-mêmes. Merci.");
}

pres.writeFile({ fileName: __dirname + "/Pitch_Mourchid_Jibaya.pptx" }).then((f) => console.log("écrit :", f));
