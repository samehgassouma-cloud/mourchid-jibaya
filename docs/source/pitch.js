// Pitch deck Mourchid Jibaya — bilingue (FR / AR), une seule source.
// En arabe, la mise en page est mise en miroir automatiquement (droite à gauche).
// Usage : LANGUE=fr|ar DEMO_URL=https://... GITHUB_URL=https://... node pitch.js
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const AR = (process.env.LANGUE || "fr") === "ar";
const t = (fr, ar) => (AR ? ar : fr);
const DEMO = process.env.DEMO_URL || "https://cyrineg-mourchid-jibaya.hf.space";
const GH = process.env.GITHUB_URL || ""; // vide : la ligne « code source » est omise
const IMG = __dirname + "/img/";
const TAILLES = JSON.parse(fs.readFileSync(IMG + "tailles.json", "utf8"));
const img = (fr, ar) => (AR && ar && TAILLES[ar] ? ar : fr);

const C = { encre: "13233F", encre2: "1E3560", glace: "C9D6EE", papier: "F3F5F4", blanc: "FFFFFF", texte: "16202E", doux: "5D6878",
  ligne: "DCE2E6", olive: "3F6B1E", oliveF: "E8F0DF", ambre: "9A6212", ambreF: "FBF0DC", rouge: "A3261B", rougeF: "FBE7E4", ia: "4B45B8", iaF: "ECEBFB" };
const TITRE = AR ? "Arial" : "Cambria", CORPS = AR ? "Arial" : "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
if (AR) pres.rtlMode = true;
pres.title = t("Mourchid Jibaya — pitch", "مرشد جباية — العرض");
pres.author = "Sameh Gassouma, Cyrine Gassouma";
const W = 13.333, H = 7.5, M = 0.6;
let n = 0;

/* ---------- miroir RTL : chaque élément est replacé symétriquement ---------- */
function miroir(o) { if (AR && o && o.x !== undefined && o.w !== undefined) o.x = W - o.x - o.w; return o; }
function diapo() {
  const s = pres.addSlide();
  if (!AR) return s;
  return new Proxy(s, {
    get(cible, prop) {
      if (prop === "addText") return (txt, o = {}) => {
        miroir(o); o.rtlMode = true; o.lang = "ar-TN";
        if (!o.align || o.align === "left") o.align = "right";
        if (Array.isArray(txt)) txt = txt.map((r) => ({ ...r, options: { ...(r.options || {}), rtlMode: true, align: (r.options && r.options.align) || o.align } }));
        return cible.addText(txt, o);
      };
      if (prop === "addShape") return (type, o = {}) => {
        miroir(o);
        if (type === pres.shapes.LINE && o.w > 0.01 && o.h > 0.01) o.flipV = !o.flipV;
        return cible.addShape(type, o);
      };
      if (prop === "addImage") return (o = {}) => cible.addImage(miroir(o));
      if (prop === "addTable") return (rows, o = {}) => {
        miroir(o);
        if (o.colW) o.colW = [...o.colW].reverse();
        const r = rows.map((l) => [...l].reverse().map((c) => {
          const cc = typeof c === "string" ? { text: c, options: {} } : { ...c, options: { ...(c.options || {}) } };
          if (!cc.options.align || cc.options.align === "left") cc.options.align = "right";
          cc.options.rtlMode = true;
          return cc;
        }));
        return cible.addTable(r, o);
      };
      const v = cible[prop];
      return typeof v === "function" ? v.bind(cible) : v;
    },
    set(cible, prop, val) { cible[prop] = val; return true; },
  });
}

/* ---------- composants ---------- */
function pied(s, sombre) {
  n++;
  s.addText(t("Mourchid Jibaya · Hackathon national IA & Finances publiques 2026", "مرشد جباية · الهاكاثون الوطني للذكاء الاصطناعي والمالية العمومية 2026"),
    { x: M, y: H - 0.42, w: 9, h: 0.3, fontFace: CORPS, fontSize: 10, color: sombre ? "AFC0DE" : C.doux, margin: 0, isTextBox: true });
  s.addText(String(n).padStart(2, "0"), { x: W - M - 1, y: H - 0.42, w: 1, h: 0.3, fontFace: CORPS, fontSize: 10, color: sombre ? "AFC0DE" : C.doux, align: AR ? "left" : "right", margin: 0, isTextBox: true });
}
function titre(s, txt, sous) {
  s.addText(txt, { x: M, y: 0.42, w: W - 2 * M, h: 0.85, fontFace: TITRE, fontSize: AR ? 30 : 32, bold: true, color: C.encre, margin: 0, valign: "top", isTextBox: true });
  if (sous) s.addText(sous, { x: M, y: 1.22, w: W - 2 * M, h: 0.45, fontFace: CORPS, fontSize: 16, color: C.doux, margin: 0, isTextBox: true });
}
function tampon(s, x, y, d, lignes, couleur, rot = -9) {
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
function image(s, fichier, x, y, w, hMax = 99) {
  const [pxW, pxH] = TAILLES[fichier];
  let h = w * pxH / pxW;
  if (h > hMax) { h = hMax; w = h * pxW / pxH; }
  s.addImage({ path: IMG + fichier, x, y, w, h, shadow: { type: "outer", color: "13233F", opacity: 0.18, blur: 12, offset: 3, angle: 90 } });
  return h;
}
function bloc(s, x, y, w, tt, corps, opt = {}) {
  s.addText([{ text: tt, options: { bold: true, fontSize: opt.ft || 17, color: opt.ct || C.encre, breakLine: true } },
    { text: corps, options: { fontSize: opt.fc || 14, color: opt.cc || C.texte } }],
  { x, y, w, h: opt.h || 1.2, fontFace: CORPS, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true });
}
function puces(s, items, o) {
  s.addText(items.map((p, i) => ({ text: p, options: { bullet: true, breakLine: i < items.length - 1 } })),
    { fontFace: CORPS, color: C.texte, margin: 0, valign: "top", isTextBox: true, ...o });
}

/* 1. Titre */
{
  const s = diapo(); s.background = { color: C.encre };
  tampon(s, 8.75, 1.35, 3.6, [{ text: "مرشد جباية", options: { fontSize: 34, breakLine: true } }, { text: t("Source officielle", "مصدر رسمي"), options: { fontSize: 15, fontFace: CORPS } }], C.glace);
  s.addText(t("Mourchid Jibaya", "مرشد جباية"), { x: M, y: 1.45, w: 8, h: 1.15, fontFace: TITRE, fontSize: 54, bold: true, color: C.blanc, margin: 0, isTextBox: true });
  s.addText(t("L'assistant fiscal IA qui répond 24h/24, en arabe, en darija, en français et en anglais, et qui cite toujours sa source officielle.",
    "المساعد الجبائي الذكي الذي يجيب على مدار الساعة، بالعربية والدارجة والفرنسية والإنجليزية، ويذكر دائماً مصدره الرسمي."),
  { x: M, y: 2.75, w: 7.6, h: 1.2, fontFace: CORPS, fontSize: 21, color: "E6ECF7", margin: 0, isTextBox: true });
  pastille(s, M, 4.25, t("Défi principal · T9 Agent virtuel 24h/24", "التحدي الرئيسي · T9 وكيل افتراضي 24/24"), C.blanc, C.encre, 4.1);
  pastille(s, M + 4.3, 4.25, t("Complémentaire · T4 Facilitation", "تحدٍّ مكمّل · T4 التيسير"), C.encre2, C.glace, 3.4);
  s.addText([{ text: t("Sameh Gassouma", "سماح قسومة"), options: { bold: true } }, { text: t("  conseillère fiscale depuis 2007, profil métier", "  مستشارة جبائية منذ 2007، الخبرة المهنية"), options: { breakLine: true } },
    { text: t("Cyrine Gassouma", "سيرين قسومة"), options: { bold: true } }, { text: t("  ingénieure logiciel, profil technique", "  مهندسة برمجيات، الخبرة التقنية") }],
  { x: M, y: 5.2, w: 8, h: 0.8, fontFace: CORPS, fontSize: 15, color: C.glace, margin: 0, isTextBox: true });
  pied(s, true);
  s.addNotes(t("Bonjour. Mourchid Jibaya, c'est le guide fiscal : un assistant qui répond à toute heure, dans la langue du contribuable, darija comprise, et qui ne répond jamais sans citer le texte officiel. Défi T9, avec T4 en complément.",
    "صباح الخير. مرشد جباية هو دليل جبائي: مساعد يجيب في أي وقت وبلغة المطالب بالأداء، بما فيها الدارجة، ولا يجيب أبداً دون ذكر النص الرسمي. التحدي T9 مع T4 كتحدٍّ مكمّل."));
}

/* 2. Problème */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Le contribuable se perd, les guichets saturent, les recettes arrivent en retard", "المطالب بالأداء يتيه، والشبابيك مكتظة، والموارد تُستخلص متأخرة"));
  const cols = [[t("Des textes éclatés", "نصوص متفرقة"), t("Codes, lois de finances, notes communes, calendrier fiscal : l'information existe, mais elle est dispersée et technique.", "مجلات، قوانين مالية، مذكرات عامة، رزنامة جبائية: المعلومة موجودة لكنها مشتتة وتقنية.")],
    [t("Des plateformes multiples", "منصات متعددة"), t("Jibayti, El Fatoora (TTN), RNE : chaque démarche a son portail, ses prérequis et son vocabulaire.", "جبايتي، الفاتورة (TTN)، السجل الوطني للمؤسسات: لكل إجراء بوابته وشروطه ومصطلحاته.")],
    [t("Des guichets saturés", "شبابيك مكتظة"), t("Les mêmes questions reviennent chaque mois. Les agents répondent au lieu de contrôler.", "الأسئلة نفسها تتكرر كل شهر، والأعوان يجيبون بدل أن يراقبوا.")]];
  cols.forEach(([tt, c], i) => {
    const x = M + i * 4.1;
    carte(s, x, 1.75, 3.85, 2.75);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 2.05, w: 0.6, h: 0.6, fill: { color: C.encre }, line: { type: "none" } });
    s.addText(String(i + 1), { x: x + 0.3, y: 2.05, w: 0.6, h: 0.6, align: "center", valign: "middle", fontFace: TITRE, bold: true, fontSize: 18, color: C.blanc, margin: 0, isTextBox: true });
    bloc(s, x + 0.3, 2.9, 3.3, tt, c, { h: 1.5 });
  });
  carte(s, M, 4.85, W - 2 * M, 1.55, C.encre);
  s.addText([{ text: t("Depuis le 1er janvier 2026", "منذ 1 جانفي 2026"), options: { bold: true, color: C.blanc } },
    { text: t(", la loi de finances (art. 53) étend la facture électronique à toutes les prestations de services : une vague de nouvelles questions, souvent posées en darija, à laquelle les guichets ne peuvent pas répondre seuls.",
      "، وسّع قانون المالية (الفصل 53) الفوترة الإلكترونية لتشمل كل إسداء الخدمات: موجة من الأسئلة الجديدة، كثيراً ما تُطرح بالدارجة، لا تستطيع الشبابيك وحدها الإجابة عنها."), options: { color: "E6ECF7" } }],
  { x: M + 0.4, y: 4.95, w: W - 2 * M - 0.8, h: 1.35, fontFace: CORPS, fontSize: 18, valign: "middle", margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("Trois constats du terrain, que je vis depuis 2007 comme conseillère fiscale. Et une actualité : l'article 53 de la LF 2026 fait exploser les questions sur la facture électronique.",
    "ثلاث ملاحظات من الميدان أعيشها منذ 2007 كمستشارة جبائية. ومستجدّ: الفصل 53 من قانون المالية 2026 ضاعف الأسئلة حول الفاتورة الإلكترونية."));
}

/* 3. Pour qui */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Deux utilisateurs, un même outil", "مستعملان، وأداة واحدة"));
  const liste = (x, y, tt, items) => {
    carte(s, x, y, 7.4, 2.35);
    s.addText(tt, { x: x + 0.35, y: y + 0.25, w: 6.8, h: 0.45, fontFace: TITRE, bold: true, fontSize: 20, color: C.encre, margin: 0, isTextBox: true });
    puces(s, items, { x: x + 0.35, y: y + 0.8, w: 6.8, h: 1.45, fontSize: 15, paraSpaceAfter: 5 });
  };
  liste(M, 1.6, t("Le contribuable", "المطالب بالأداء"), t(["TPE, professions libérales, personnes physiques", "Pose sa question quand il veut, dans sa langue, darija comprise", "Connaît ses échéances et vérifie sa TVA avant de déposer", "Parle à un agent quand la réponse ne suffit pas"],
    ["المؤسسات الصغيرة جداً، المهن الحرة، الأشخاص الطبيعيون", "يطرح سؤاله متى شاء وبلغته، بما فيها الدارجة", "يعرف آجاله ويتثبّت من الأداء على القيمة المضافة قبل الإيداع", "يتحدث مع عون حين لا يكفي الجواب"]));
  liste(M, 4.2, t("L'agent de la DGI", "عون الإدارة العامة للأداءات"), t(["Ne reçoit que les cas complexes, déjà résumés", "Voit les points de blocage récurrents en direct", "Sait quels textes clarifier en priorité", "Consacre plus de temps au contrôle"],
    ["لا تصله إلا الملفات المعقدة، ملخّصة مسبقاً", "يرى نقاط التعثّر المتكررة مباشرة", "يعرف النصوص التي تحتاج توضيحاً بالأولوية", "يخصّص وقتاً أكبر للمراقبة"]));
  image(s, "mob_accueil_ar.png", 9.1, 1.35, 2.55);
  s.addText(t("Accueil en arabe, sur téléphone", "واجهة الاستقبال بالعربية على الهاتف"), { x: 8.6, y: 6.9, w: 3.6, h: 0.3, align: "center", fontFace: CORPS, fontSize: 11, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("Deux bénéficiaires : le contribuable qui obtient une réponse fiable à 23h en darija, et l'agent qui ne reçoit plus que les vrais cas.",
    "مستفيدان: المطالب بالأداء الذي يحصل على جواب موثوق في الحادية عشرة ليلاً بالدارجة، والعون الذي لا تصله إلا الحالات الحقيقية."));
}

/* 4. Existant vs Mourchid */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Ce qui existe aujourd'hui, et ce que Mourchid ajoute", "ما هو موجود اليوم، وما يضيفه مرشد جباية"));
  const O = { text: t("Oui", "نعم"), options: { color: C.olive, bold: true } }, N = { text: t("Non", "لا"), options: { color: C.rouge } }, P = { text: t("Partiel", "جزئياً"), options: { color: C.ambre } };
  const cel = (v, fond) => ({ text: v.text, options: { ...v.options, fill: { color: fond }, align: "center" } });
  const lignes = [
    [t("Disponible 24h/24", "متاح على مدار الساعة"), O, N, O, O],
    [t("Comprend la darija", "يفهم الدارجة"), N, O, P, O],
    [t("Cite le texte officiel à chaque réponse", "يذكر النص الرسمي في كل جواب"), P, P, N, O],
    [t("Refuse d'inventer quand la source manque", "يرفض الاختلاق حين يغيب المصدر"), O, P, N, O],
    [t("Refuse d'aider à contourner l'impôt", "يرفض المساعدة على التهرّب من الأداء"), O, O, P, O],
    [t("Transmet à l'agent avec le contexte", "يحيل على العون مع السياق"), N, N, N, O],
    [t("Mesure les points de blocage", "يقيس نقاط التعثّر"), N, N, N, O],
  ];
  const tete = ["", t("Portail et FAQ", "البوابة والأسئلة المتداولة"), t("Guichet et téléphone", "الشباك والهاتف"), t("Chatbot IA généraliste", "روبوت محادثة عام"), t("Mourchid Jibaya", "مرشد جباية")]
    .map((x, i) => ({ text: x, options: { bold: true, color: i === 4 ? C.blanc : C.encre, fill: { color: i === 4 ? C.encre : "E4E9EE" }, align: i ? "center" : "left" } }));
  const rows = [tete, ...lignes.map((l) => [{ text: l[0], options: { fill: { color: C.blanc }, color: C.texte } }, ...l.slice(1).map((v, i) => cel(v, i === 3 ? C.oliveF : C.blanc))])];
  s.addTable(rows, { x: M, y: 1.6, w: W - 2 * M, colW: [4.3, 1.95, 1.95, 1.95, 1.98], rowH: 0.56, fontFace: CORPS, fontSize: 14, valign: "middle", border: { type: "solid", pt: 0.75, color: C.ligne } });
  s.addText(t("La différence ne tient pas au modèle d'IA, mais à la contrainte : une source officielle ou rien, et un humain dans la boucle.",
    "الفرق ليس في نموذج الذكاء الاصطناعي، بل في القيد: مصدر رسمي أو لا شيء، وإنسان في الحلقة."), { x: M, y: 6.25, w: W - 2 * M, h: 0.5, fontFace: CORPS, italic: !AR, fontSize: 16, color: C.encre, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("Critère innovation : un chatbot généraliste invente des taux et des dates. Nous, jamais : chaque phrase vient d'un texte officiel cité, et si la source manque, un agent reprend la main.",
    "معيار الابتكار: روبوت المحادثة العام يختلق النسب والتواريخ. نحن لا نفعل ذلك أبداً: كل جملة مأخوذة من نص رسمي مذكور، وإن غاب المصدر يتولّى عون الملف."));
}

/* 5. Données */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Textes officiels publics et données simulées", "نصوص رسمية عمومية ومعطيات تجريبية"));
  const cartes = [[t("Corpus officiel public", "مدوّنة رسمية عمومية"), t("34 fiches tirées de la loi de finances 2026, des codes fiscaux (IRPP/IS, TVA, CDPF, fiscalité locale), des notes communes DGI, de la loi n° 2018-52 (RNE) et du décret n° 2019-54.",
      "34 بطاقة مستخرجة من قانون المالية 2026، والمجلات الجبائية (الضريبة على الدخل والشركات، الأداء على القيمة المضافة، مجلة الحقوق والإجراءات الجبائية، الجباية المحلية)، والمذكرات العامة، والقانون عدد 52 لسنة 2018 والأمر عدد 54 لسنة 2019."), C.olive],
    [t("Données simulées", "معطيات تجريبية"), t("Montants saisis par l'usager dans « Vérifier ma déclaration » ; rien n'est transmis à l'administration.", "مبالغ يُدخلها المستعمل في «التثبّت من تصريحي»؛ لا يُحال أي شيء على الإدارة."), C.encre],
    [t("Aucune donnée sensible", "لا معطيات حساسة"), t("Aucune donnée personnelle ou confidentielle, aucun accès aux systèmes de l'administration. Loi organique n° 2004-63 respectée.", "لا معطيات شخصية أو سرية، ولا نفاذ إلى منظومات الإدارة. احترام القانون الأساسي عدد 63 لسنة 2004."), C.rouge]];
  cartes.forEach(([tt, c, col], i) => {
    const x = M + i * 4.1; carte(s, x, 1.65, 3.85, 2.9);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 1.95, w: 0.32, h: 0.32, fill: { color: col }, line: { type: "none" } });
    bloc(s, x + 0.3, 2.45, 3.3, tt, c, { h: 2, fc: AR ? 13 : 14 });
  });
  [["34", t("fiches trilingues", "بطاقة بثلاث لغات")], ["20", t("source officielle", "مصدر رسمي")], ["13", t("à confirmer par la DGI", "في انتظار تأكيد الإدارة")], ["4", t("langues comprises", "لغات مفهومة")]].forEach(([v, l], i) => {
    const x = M + i * 3.07;
    s.addText(v, { x, y: 4.85, w: 2.9, h: 0.8, fontFace: TITRE, bold: true, fontSize: 40, color: C.encre, margin: 0, isTextBox: true });
    s.addText(l, { x, y: 5.6, w: 2.9, h: 0.4, fontFace: CORPS, fontSize: 14, color: C.doux, margin: 0, isTextBox: true });
  });
  s.addText(t("Travaux préparatoires déclarés (art. 6.1) : recherche documentaire et maquette avant le hackathon ; tout le code écrit pendant le hackathon, historique Git horodaté.",
    "أعمال تحضيرية مصرّح بها (الفصل 6.1): بحث وثائقي ونموذج أولي قبل الهاكاثون؛ وكل البرمجة أُنجزت خلال الهاكاثون، والتاريخ المؤرَّخ في Git شاهد على ذلك."),
  { x: M, y: 6.2, w: W - 2 * M, h: 0.45, fontFace: CORPS, fontSize: 12, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("Uniquement des textes publics. Chaque fiche porte sa référence, son lien, sa date de vérification et son état de validation.",
    "نصوص عمومية فقط. كل بطاقة تحمل مرجعها ورابطها وتاريخ التحقق منها وحالة المصادقة عليها."));
}

/* 6. Approche IA */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Rechercher d'abord, rédiger sous contrainte", "البحث أولاً، ثم الصياغة تحت قيد"), t("Une IA hybride : la recherche choisit le texte officiel, le modèle de langage ne fait que le reformuler.", "ذكاء اصطناعي هجين: البحث يختار النص الرسمي، والنموذج اللغوي يكتفي بإعادة صياغته."));
  const et = t([["Comprendre", "Normalisation de l'arabe, racinisation, darija, fautes de frappe"], ["Relier", "Lexique de concepts AR · darija · FR · EN"], ["Retrouver", "Recherche BM25 pondérée sur les 34 fiches"], ["Décider", "Seuil : score, couverture, au moins 2 termes"], ["Rédiger", "Claude Haiku 4.5, limité à la fiche ; NO_SOURCE sinon"]],
    [["الفهم", "توحيد الكتابة العربية، التجذير، الدارجة، الأخطاء المطبعية"], ["الربط", "معجم مفاهيم: عربية · دارجة · فرنسية · إنجليزية"], ["الاسترجاع", "بحث BM25 مرجّح في البطاقات الـ34"], ["القرار", "عتبة: النقاط، التغطية، كلمتان على الأقل"], ["الصياغة", "Claude Haiku 4.5 مقيّد بالبطاقة؛ وإلا NO_SOURCE"]]);
  const bw = 2.2, gap = 0.26;
  et.forEach(([tt, c], i) => {
    const x = M + i * (bw + gap), fond = i === 4 ? C.iaF : C.blanc;
    carte(s, x, 2.0, bw, 2.15, fond);
    s.addText(tt, { x: x + 0.2, y: 2.15, w: bw - 0.4, h: 0.45, fontFace: TITRE, bold: true, fontSize: 17, color: i === 4 ? C.ia : C.encre, margin: 0, isTextBox: true });
    s.addText(c, { x: x + 0.2, y: 2.65, w: bw - 0.4, h: 1.4, fontFace: CORPS, fontSize: 13, color: C.texte, margin: 0, valign: "top", isTextBox: true });
    if (i < 4) s.addText(AR ? "‹" : "›", { x: x + bw - 0.02, y: 2.75, w: gap + 0.04, h: 0.5, align: "center", fontFace: CORPS, fontSize: 26, color: C.doux, margin: 0, isTextBox: true });
  });
  const bas = [[t("Sous le seuil", "تحت العتبة"), t("« Je ne sais pas », fiches proches et ticket vers l'agent du service compétent.", "«لا أعرف»، بطاقات قريبة، وإحالة على عون المصلحة المختصة."), C.ambreF, C.ambre],
    [t("Réponse citée et expliquée", "جواب موثّق ومفسَّر"), t("Référence, lien, date de vérification, et le raisonnement visible par l'usager.", "المرجع والرابط وتاريخ التحقق، مع استدلال ظاهر للمستعمل."), C.oliveF, C.olive],
    [t("Validation experte", "مصادقة الخبير"), t("L'expert répond aux questions sans source dans /admin ; la base apprend sans redéploiement.", "يجيب الخبير عن الأسئلة دون مصدر في فضاء الإدارة؛ فتتعلّم القاعدة دون إعادة نشر."), C.blanc, C.encre]];
  bas.forEach(([tt, c, f, col], i) => { const x = M + i * 4.1; carte(s, x, 4.5, 3.85, 1.75, f); bloc(s, x + 0.3, 4.7, 3.3, tt, c, { ct: col, h: 1.4 }); });
  s.addText(t("Sans clé API ou en cas de panne réseau, la fiche officielle s'affiche telle quelle : la démonstration ne casse jamais.", "دون مفتاح API أو عند انقطاع الشبكة، تُعرض البطاقة الرسمية كما هي: العرض لا يتعطّل أبداً."),
    { x: M, y: 6.45, w: W - 2 * M, h: 0.4, fontFace: CORPS, fontSize: 13, italic: !AR, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("Le coeur technique : un RAG strict. La recherche trouve la fiche officielle, le modèle ne fait que rédiger, et il a l'ordre d'écrire NO_SOURCE si la fiche ne suffit pas.",
    "القلب التقني: استرجاع معزّز صارم. البحث يجد البطاقة الرسمية، والنموذج يكتفي بالصياغة، ومأمور بكتابة NO_SOURCE إذا لم تكفِ البطاقة."));
}

/* 7. Confiance */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Zéro invention : quatre garde-fous", "صفر اختلاق: أربعة ضوابط"));
  const g = t([["Une source ou rien", "Réponse uniquement à partir des fiches officielles, référence affichée."], ["« Je ne sais pas »", "Sans source suffisante, il le dit et transfère à un agent."], ["Refus du contournement", "Demande de fraude : refus motivé et pistes légales. Question ambiguë : rappel du cadre légal."], ["Données protégées", "Rien n'est transmis sans l'accord du contribuable ; tableau de bord en comptages seulement."]],
    [["مصدر أو لا شيء", "إجابة من البطاقات الرسمية فقط، مع عرض المرجع."], ["«لا أعرف»", "إن لم يجد مصدراً كافياً يقول ذلك ويحيل على عون."], ["رفض التحايل", "طلب تهرّب: رفض معلّل ومسالك قانونية. سؤال ملتبس: تذكير بالإطار القانوني."], ["معطيات محمية", "لا يُحال شيء دون موافقة المطالب بالأداء؛ لوحة القيادة بالأعداد فقط."]]);
  g.forEach(([tt, c], i) => { const x = M + (i % 2) * 3.55, y = 1.6 + Math.floor(i / 2) * 2.45; carte(s, x, y, 3.35, 2.25); bloc(s, x + 0.28, y + 0.28, 2.8, tt, c, { h: 1.8 }); });
  const h1 = image(s, img("carte_refus.png", "ar_carte_refus.png"), 8.05, 1.5, 4.7, 3.45);
  image(s, img("carte_inconnu.png", "ar_carte_inconnu.png"), 8.05, 1.5 + h1 + 0.3, 4.7, 1.9);
  pied(s);
  s.addNotes(t("Deux cas réels du prototype à droite : une demande de fraude refusée avec des pistes légales, et une question hors sujet où l'assistant avoue ne pas savoir.",
    "حالتان حقيقيتان من النموذج: طلب تهرّب رُفض مع اقتراح مسالك قانونية، وسؤال خارج الموضوع اعترف فيه المساعد بأنه لا يعرف."));
}

/* 8. Prototype */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Un prototype en ligne, prêt à tester", "نموذج أولي على الخط، جاهز للتجربة"));
  image(s, img("desk_reponse.png", "ar_desk_reponse.png"), M, 1.45, 7.9);
  image(s, "mob_echeances_ar.png", 8.85, 1.45, 2.05);
  const mods = t([["Assistant cité", "T9"], ["Mes échéances + rappels", "T4"], ["Vérifier ma TVA", "T4"], ["Parler à un agent", "T9"]], [["مساعد موثّق", "T9"], ["آجالي والتذكير", "T4"], ["التثبّت من الأداء", "T4"], ["التحدث مع عون", "T9"]]);
  mods.forEach(([tt, d], i) => {
    s.addText([{ text: d + "  ", options: { color: C.ambre, bold: true, fontSize: 12 } }, { text: tt, options: { color: C.encre, bold: true, fontSize: 14 } }],
      { x: 11.1, y: 1.55 + i * 1.05, w: 1.9, h: 0.9, fontFace: CORPS, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText(t("Question en darija, réponse en arabe avec la LF 2026 art. 53 et son lien", "سؤال بالدارجة، وجواب بالعربية مع الفصل 53 من قانون المالية 2026 ورابطه"), { x: M, y: 6.3, w: 7.9, h: 0.35, fontFace: CORPS, fontSize: 12, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("Web et mobile, responsive, en arabe et en français. À gauche la réponse citée, à droite le calendrier fiscal personnalisé avec les reports des jours fériés.",
    "على الحاسوب والهاتف، بالعربية والفرنسية. الجواب الموثّق، والرزنامة الجبائية الشخصية مع التأجيل الآلي في أيام العطل."));
}

/* 9. IA explicable */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Une IA qui montre son raisonnement", "ذكاء اصطناعي يُظهر استدلاله"));
  image(s, img("carte_trace.png", "ar_carte_trace.png"), M, 1.35, 4.9, 5.45);
  const pts = t([["Langue comprise", "Arabe, darija, français ou anglais, détectés automatiquement."], ["Mots et concepts", "« فاتورة إلكترونية » et « facture électronique » mènent au même concept."], ["Fiches candidates", "Score et couverture de chaque fiche, et le seuil exigé pour répondre."], ["Texte officiel d'origine", "Quand l'IA reformule, l'usager peut toujours afficher la fiche brute."]],
    [["اللغة المفهومة", "العربية أو الدارجة أو الفرنسية أو الإنجليزية، تُكتشف آلياً."], ["الكلمات والمفاهيم", "«فاتورة إلكترونية» و«facture électronique» تقودان إلى المفهوم نفسه."], ["البطاقات المرشّحة", "نقاط كل بطاقة وتغطيتها، والعتبة المطلوبة للإجابة."], ["النص الرسمي الأصلي", "حين يعيد الذكاء الاصطناعي الصياغة، يمكن للمستعمل دائماً عرض البطاقة الأصلية."]]);
  pts.forEach(([tt, c], i) => bloc(s, 5.0, 1.55 + i * 1.2, 7.7, tt, c, { h: 1.1, fc: 15 }));
  carte(s, 5.0, 6.2, 7.7, 0.62, C.encre);
  s.addText(t("L'agent et le contribuable voient pourquoi la réponse est donnée.", "العون والمطالب بالأداء يريان لماذا أُعطي الجواب."), { x: 5.2, y: 6.2, w: 7.3, h: 0.62, fontFace: CORPS, fontSize: 15, bold: true, color: C.blanc, valign: "middle", margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("Transparence : on ouvre « comment j'ai trouvé cette réponse ». C'est ce qui rend l'outil acceptable pour une administration.",
    "الشفافية: نفتح «كيف وجدت هذا الجواب». هذا ما يجعل الأداة مقبولة لدى الإدارة."));
}

/* 10. Administration */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Pour l'administration : piloter et améliorer", "للإدارة: القيادة والتحسين"));
  image(s, "admin_pilotage.png", M, 1.4, 7.4);
  const pts = t([["Indicateurs en direct", "Taux de résolution sans agent, avec sa formule affichée."], ["Textes à clarifier", "Les questions sans source révèlent les notes communes à écrire."], ["Tickets avec contexte", "L'agent voit la question, la langue et ce que l'assistant a tenté."], ["Validation experte", "Une fiche validée est utilisée aussitôt, sans redéploiement."]],
    [["مؤشرات مباشرة", "نسبة الحلّ دون عون، مع عرض طريقة الحساب."], ["نصوص تحتاج توضيحاً", "الأسئلة دون مصدر تكشف المذكرات العامة الواجب كتابتها."], ["إحالات مع السياق", "يرى العون السؤال واللغة وما حاوله المساعد."], ["مصادقة الخبير", "البطاقة المصادق عليها تُستعمل فوراً دون إعادة نشر."]]);
  pts.forEach(([tt, c], i) => bloc(s, 8.35, 1.5 + i * 1.28, 4.4, tt, c, { h: 1.15, fc: 14 }));
  pied(s);
  s.addNotes(t("L'espace /admin : ce que l'assistant apporte en direct, la file des tickets, et la validation des fiches par l'expert DGI.",
    "فضاء الإدارة: ما يقدّمه المساعد مباشرة، وقائمة الإحالات، ومصادقة خبير الإدارة على البطاقات."));
}

/* 11. Résultats */
{
  const s = diapo(); s.background = { color: C.encre };
  s.addText(t("Mesuré sur le prototype", "نتائج مقاسة على النموذج"), { x: M, y: 0.45, w: 10, h: 0.85, fontFace: TITRE, fontSize: 32, bold: true, color: C.blanc, margin: 0, isTextBox: true });
  const st = [["25/25", t("formulations nouvelles d'un jeu indépendant (FR, AR, darija, EN) : bonne fiche, source citée", "صيغة جديدة من اختبار مستقل (فرنسية، عربية، دارجة، إنجليزية): البطاقة الصحيحة مع ذكر المصدر")],
    ["4/4", t("questions hors sujet transférées à un agent, aucune invention", "أسئلة خارج الموضوع أُحيلت على عون، دون أي اختلاق")],
    ["24/24", t("tests automatisés : moteur, API, garde-fous, échéances, TVA, sécurité", "اختبارات آلية: المحرّك، الواجهة البرمجية، الضوابط، الآجال، الأداء، الأمان")],
    ["101/101", t("réponses identiques entre le moteur serveur et le moteur hors ligne", "أجوبة متطابقة بين محرّك الخادم والمحرّك دون إنترنت")]];
  st.forEach(([v, l], i) => {
    const x = M + (i % 2) * 6.1, y = 1.6 + Math.floor(i / 2) * 2.3;
    s.addText(v, { x, y, w: 5.8, h: 1.05, fontFace: TITRE, bold: true, fontSize: 54, color: C.blanc, margin: 0, isTextBox: true });
    s.addText(l, { x, y: y + 1.05, w: 5.6, h: 0.8, fontFace: CORPS, fontSize: 15, color: C.glace, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText(t("< 1 ms de recherche par question · recette navigateur 28/28 · intégration continue à chaque modification", "أقل من 1 ميلي ثانية للبحث في كل سؤال · اختبار المتصفح 28/28 · تكامل مستمر عند كل تعديل"),
    { x: M, y: 6.3, w: W - 2 * M, h: 0.4, fontFace: CORPS, fontSize: 14, color: "AFC0DE", margin: 0, isTextBox: true });
  pied(s, true);
  s.addNotes(t("Des résultats mesurés, pas annoncés. Le jeu d'évaluation n'a pas servi à construire les fiches. Tout est rejouable depuis le dépôt GitHub.",
    "نتائج مقاسة وليست مُعلنة. اختبار التقييم لم يُستعمل في بناء البطاقات. ويمكن إعادة كل شيء من مستودع GitHub."));
}

/* 12. Impact et pilote */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Plus de recettes à temps, moins de coûts", "موارد في آجالها، وكلفة أقل"));
  const imp = t([["Recettes encaissées à temps", "Guidage et rappels réduisent les retards de dépôt et de paiement."], ["Civisme fiscal volontaire", "Un contribuable qui comprend ses obligations déclare mieux, sans contrôle."], ["Moins d'erreurs et de contentieux", "Le pré-contrôle corrige avant le dépôt."], ["Agents réaffectés au contrôle", "Les questions répétitives quittent le guichet."]],
    [["موارد مستخلصة في آجالها", "الإرشاد والتذكير يقلّصان التأخير في الإيداع والدفع."], ["امتثال جبائي طوعي", "المطالب بالأداء الذي يفهم واجباته يصرّح بشكل أفضل دون مراقبة."], ["أخطاء ونزاعات أقل", "التثبّت المسبق يصحّح قبل الإيداع."], ["أعوان متفرّغون للمراقبة", "الأسئلة المتكررة تغادر الشباك."]]);
  imp.forEach(([tt, c], i) => bloc(s, M, 1.5 + i * 1.12, 5.4, tt, c, { h: 1.05, fc: 14, ft: 16 }));
  carte(s, 6.35, 1.5, 6.4, 5.05);
  s.addText(t("Pilote de 3 mois : six indicateurs", "تجربة نموذجية لـ3 أشهر: ستة مؤشرات"), { x: 6.65, y: 1.7, w: 5.9, h: 0.45, fontFace: TITRE, bold: true, fontSize: 18, color: C.encre, margin: 0, isTextBox: true });
  const ind = t([["Déclarations déposées dans les délais", "↑"], ["Passages et appels au guichet", "↓"], ["Déclarations à corriger", "↓"], ["Pénalités de retard (DT / mois)", "↓"], ["Questions résolues sans agent", "↑"], ["Satisfaction des usagers (/5)", "↑"]],
    [["تصاريح مودعة في الآجال", "↑"], ["زيارات الشباك والمكالمات", "↓"], ["تصاريح تستوجب التصحيح", "↓"], ["خطايا التأخير (د / شهر)", "↓"], ["أسئلة محلولة دون عون", "↑"], ["رضا المستعملين (/5)", "↑"]]);
  s.addTable(ind.map(([a, b]) => [{ text: a, options: { color: C.texte } }, { text: b, options: { color: b === "↑" ? C.olive : C.encre, bold: true, align: "center" } }]),
    { x: 6.65, y: 2.3, w: 5.8, colW: [5.0, 0.8], rowH: 0.5, fontFace: CORPS, fontSize: 14, border: { type: "solid", pt: 0.5, color: C.ligne } });
  s.addText(t("Exemple du simulateur (hypothèses affichées, à calibrer) : 10 000 questions/mois, 69 % résolues, 8 min par question ≈ 920 heures d'agent libérées chaque mois.",
    "مثال من المحاكي (فرضيات معلنة تُعايَر لاحقاً): 10.000 سؤال شهرياً، 69 % محلولة، 8 دقائق لكل سؤال ≈ 920 ساعة عمل أعوان محرَّرة كل شهر."),
  { x: 6.65, y: 5.45, w: 5.8, h: 0.95, fontFace: CORPS, fontSize: 12, italic: !AR, color: C.doux, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("L'impact se mesure. Le simulateur de /admin montre la méthode ; les vrais chiffres viendront du pilote avec un groupe témoin.",
    "الأثر يُقاس. محاكي فضاء الإدارة يبيّن الطريقة؛ والأرقام الحقيقية ستأتي من التجربة النموذجية مع مجموعة مرجعية."));
}

/* 13. Architecture */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Une architecture simple, prête pour un pilote", "بنية بسيطة، جاهزة لتجربة نموذجية"));
  const bx = (x, y, w, h, tt, sous, f = C.blanc, c = C.encre) => { carte(s, x, y, w, h, f); s.addText([{ text: tt, options: { bold: true, fontSize: 15, color: c, breakLine: true } }, { text: sous, options: { fontSize: 12, color: f === C.encre ? C.glace : C.doux } }], { x: x + 0.15, y, w: w - 0.3, h, align: "center", valign: "middle", fontFace: CORPS, margin: 0, isTextBox: true }); };
  bx(M, 1.7, 2.4, 1.3, t("Usager", "المستعمل"), t("web · mobile · hors ligne", "ويب · هاتف · دون إنترنت"));
  bx(M, 3.55, 2.4, 1.3, t("Agent DGI", "عون الإدارة"), "/admin");
  bx(3.55, 2.6, 2.6, 1.3, t("API FastAPI", "واجهة FastAPI"), t("documentée sur /docs", "موثّقة في /docs"), C.encre, C.blanc);
  bx(6.75, 1.7, 2.6, 1.3, t("Moteur", "المحرّك"), t("langue · lexique · BM25 · seuils", "اللغة · المعجم · BM25 · العتبات"));
  bx(6.75, 3.55, 2.6, 1.3, t("Fiches officielles", "البطاقات الرسمية"), t("JSON versionné · SQLite", "JSON مؤرشف · SQLite"));
  bx(6.75, 5.1, 2.6, 1.1, t("Modèle de langage", "النموذج اللغوي"), t("Claude Haiku ou Ollama local", "Claude Haiku أو Ollama محلياً"), C.iaF, C.ia);
  [[3.0, 2.35, 3.55, 3.1], [3.0, 4.2, 3.55, 3.4], [6.15, 3.1, 6.75, 2.35], [6.15, 3.4, 6.75, 4.2], [8.05, 3.0, 8.05, 3.55], [4.85, 3.9, 6.75, 5.65]].forEach(([x1, y1, x2, y2]) =>
    s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipV: (y2 < y1) !== (x2 < x1), line: { color: C.doux, width: 1.25 } }));
  puces(s, t(["Python, FastAPI, JavaScript sans framework", "Docker, hébergé sur Hugging Face Spaces", "Intégration continue : tests, évaluation, parité", "Repli automatique hors ligne dans le navigateur", "Souveraineté : modèle local possible, hébergement en Tunisie"],
    ["Python وFastAPI وJavaScript دون إطار عمل", "Docker، مستضاف على Hugging Face Spaces", "تكامل مستمر: اختبارات، تقييم، تطابق", "تحوّل آلي إلى وضع دون إنترنت في المتصفح", "السيادة: نموذج محلي ممكن واستضافة في تونس"]),
  { x: 9.8, y: 1.7, w: 3.0, h: 4.5, fontSize: 14, paraSpaceAfter: 10 });
  pied(s);
  s.addNotes(t("Faisabilité : une architecture volontairement simple, conteneurisée et testée. Pour la production, le modèle peut tourner en local pour la souveraineté des données.",
    "قابلية الإنجاز: بنية بسيطة عن قصد، في حاوية ومختبرة. وفي مرحلة الإنتاج يمكن تشغيل النموذج محلياً حفاظاً على سيادة المعطيات."));
}

/* 14. Limites, perspectives, démo */
{
  const s = diapo(); s.background = { color: C.papier };
  titre(s, t("Ce qui reste à faire, et comment", "ما بقي إنجازه، وكيف"));
  carte(s, M, 1.5, 4.0, 4.95);
  s.addText(t("Limites identifiées", "الحدود المرصودة"), { x: M + 0.3, y: 1.7, w: 3.5, h: 0.4, fontFace: TITRE, bold: true, fontSize: 18, color: C.encre, margin: 0, isTextBox: true });
  puces(s, t(["13 fiches à relire sur le texte officiel ; validation DGI nécessaire", "Couverture limitée aux 34 fiches ; le reste va à un agent", "Fêtes religieuses estimées ; pénalités non calculées", "TVA mensuelle seulement, sur montants saisis"],
    ["13 بطاقة تحتاج مراجعة على النص الرسمي؛ مصادقة الإدارة ضرورية", "تغطية محدودة بـ34 بطاقة؛ والباقي يُحال على عون", "تواريخ الأعياد الدينية تقديرية؛ الخطايا غير محتسبة", "الأداء الشهري فقط، على مبالغ مُدخلة"]),
  { x: M + 0.3, y: 2.25, w: 3.45, h: 4, fontSize: 14, paraSpaceAfter: 8 });
  const etapes = t([["Septembre 2026", "Prototype : assistant cité, échéances, TVA, administration"], ["3 mois", "Pilote dans un centre des impôts, corpus validé par la DGI, groupe témoin"], ["2027", "Déploiement national ; WhatsApp et voix ; Jibayti, El Fatoora, douane"]],
    [["سبتمبر 2026", "نموذج أولي: مساعد موثّق، آجال، أداء، فضاء إدارة"], ["3 أشهر", "تجربة في مركز جبائي، مدوّنة مصادق عليها، مجموعة مرجعية"], ["2027", "تعميم وطني؛ واتساب والصوت؛ جبايتي، الفاتورة، الديوانة"]]);
  etapes.forEach(([d, tt], i) => {
    const y = 1.6 + i * 1.6;
    s.addShape(pres.shapes.OVAL, { x: 4.95, y: y + 0.08, w: 0.3, h: 0.3, fill: { color: i ? C.blanc : C.encre }, line: { color: C.encre, width: 1.5 } });
    if (i < 2) s.addShape(pres.shapes.LINE, { x: 5.1, y: y + 0.4, w: 0, h: 1.3, line: { color: C.glace, width: 1.5 } });
    bloc(s, 5.45, y, 3.6, d, tt, { h: 1.3, fc: 14 });
  });
  carte(s, 9.4, 1.5, 3.35, 4.95, C.encre);
  s.addImage({ path: IMG + "qr_demo.png", x: 10.05, y: 1.8, w: 2.05, h: 2.05 });
  s.addText([{ text: t("Testez-le maintenant", "جرّبوه الآن"), options: { bold: true, fontSize: 16, color: C.blanc, breakLine: true } }, { text: DEMO.replace(/^https?:\/\//, ""), options: { fontSize: 11, color: C.glace, breakLine: true } },
    ...(GH ? [{ text: " ", options: { fontSize: 6, breakLine: true } }, { text: t("Code source", "الشفرة المصدرية"), options: { bold: true, fontSize: 13, color: C.blanc, breakLine: true } }, { text: GH.replace(/^https?:\/\//, ""), options: { fontSize: 11, color: C.glace } }] : [])],
  { x: 9.6, y: 4.0, w: 2.95, h: 2.3, align: "center", valign: "top", fontFace: CORPS, margin: 0, isTextBox: true });
  pied(s);
  s.addNotes(t("Nous connaissons nos limites et le chemin : validation DGI, pilote de trois mois, puis déploiement national. Scannez le QR code pour tester vous-mêmes. Merci.",
    "نعرف حدودنا والطريق: مصادقة الإدارة، تجربة لثلاثة أشهر، ثم تعميم وطني. امسحوا رمز QR لتجربته بأنفسكم. شكراً."));
}

const sortie = __dirname + (AR ? "/Pitch_Mourchid_Jibaya_AR.pptx" : "/Pitch_Mourchid_Jibaya.pptx");
pres.writeFile({ fileName: sortie }).then((f) => console.log("écrit :", f));
