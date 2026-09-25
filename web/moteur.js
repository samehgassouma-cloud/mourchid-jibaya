/* Moteur de Mourchid Jibaya en JavaScript — portage fidèle du moteur Python (mourchid/*.py)
   pour la version hors ligne : langue, lexique, BM25, seuils, garde-fous, échéances, vérification.
   Les données (fiches, lexique, jours fériés) sont fournies dans la constante DONNEES. */
"use strict";
const MJ = (() => {
  // ---------------- langue ----------------
  const HARAKAT = /[ً-ْٰٓ-ٕـ]/g;
  const AR_MAP = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ئ": "ي", "ؤ": "و", "ة": "ه",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "،": " ", "؛": " ", "؟": " " };
  const AR_RE = /[؀-ۿ]/;
  const AR_PREFIXES = ["وبال", "وال", "بال", "كال", "فال", "لل", "ال", "و", "ف", "ب", "ل"];
  const AR_SUFFIXES = ["هما", "كما", "ها", "هم", "كم", "نا", "ات", "ون", "ين", "يه", "ه", "ي"];
  const STOP = new Set(`le la les un une des du de d l et ou à a au aux en pour par sur dans avec sans est sont je j tu il elle nous vous ils
elles on ce cet cette ces mon ma mes ton ta tes son sa ses leur leurs que qui quoi quel quelle quels quelles dont
ne pas plus ai as avons avez ont suis es être avoir faire fait dois doit peux peut comment quand combien
the a an of to in on for and or is are be do does can how what when which who my your i we you it at by with
from as this that these those should must will
في من على الى عن مع هل ما ماذا كيف متى هو هي انا انت نحن هذا هذه ذلك التي الذي او ثم كل
شنوه شنو اشنوه اش كيفاش وقتاش قداش باش نحب لازم لازمني برشا ياسر هاذا هاذي متاع متاعي عندي`.split(/\s+/));
  const EN_HINTS = new Set("the what when how is are do does my for income tax return which who can should".split(" "));
  const FR_HINTS = new Set("le la les quand comment est des pour quel quelle mon ma impôt déclaration je dois".split(" "));

  const isArabic = (t) => AR_RE.test(t);
  function detectLang(text) {
    const letters = [...text].filter((c) => /\p{L}/u.test(c));
    if (letters.length && letters.filter((c) => AR_RE.test(c)).length / letters.length > 0.3) return "ar";
    const words = new Set(text.toLowerCase().match(/[a-zà-ÿ']+/g) || []);
    let en = 0, fr = 0;
    words.forEach((w) => { if (EN_HINTS.has(w)) en++; if (FR_HINTS.has(w)) fr++; });
    return en > fr ? "en" : "fr";
  }
  function normaliser(text) {
    let t = [...String(text)].map((c) => AR_MAP[c] ?? c).join("").replace(HARAKAT, "").toLowerCase();
    t = t.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    t = t.replace(/['’]/g, " ").replace(/[^\p{L}\p{N}_\s]/gu, " ");
    return t.replace(/\s+/g, " ").trim();
  }
  function racine(m) {
    if (isArabic(m)) {
      for (const p of AR_PREFIXES) if (m.startsWith(p) && m.length - p.length >= 3) { m = m.slice(p.length); break; }
      for (const s of AR_SUFFIXES) if (m.endsWith(s) && m.length - s.length >= 3) { m = m.slice(0, -s.length); break; }
      return m;
    }
    if (m.length > 4 && (m.endsWith("s") || m.endsWith("x"))) m = m.slice(0, -1);
    return m;
  }
  const mots = (text) => normaliser(text).split(" ").filter((m) => m && !STOP.has(m) && m.length > 1).map(racine);
  function distance(a, b, lim) {
    if (Math.abs(a.length - b.length) > lim) return lim + 1;
    let prec = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cour = [i];
      for (let j = 1; j <= b.length; j++) cour.push(Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)));
      if (Math.min(...cour) > lim) return lim + 1;
      prec = cour;
    }
    return prec[b.length];
  }

  // ---------------- lexique ----------------
  const CONCEPTS = Object.entries(DONNEES.lexique).filter(([k]) => !k.startsWith("_")).map(([k, v]) => [k, v.map(normaliser)]);
  function conceptsDe(texte) {
    const t = " " + normaliser(texte) + " ";
    const out = [];
    for (const [cle, formes] of CONCEPTS) {
      if (formes.some((f) => f && ((f[0] >= "؀" && t.includes(f)) || t.includes(" " + f + " ")))) out.push("§" + cle);
    }
    return out;
  }

  // ---------------- recherche BM25 ----------------
  const POIDS = { titre: 2, questions: 2, mots_cles: 2, reponse: 1, concepts: 3 };
  const K1 = 1.2, B = 0.75, SEUIL_SCORE = 4.0, SEUIL_COUVERTURE = 0.34;
  const r2 = (x) => Math.round(x * 100) / 100;
  const fiches = DONNEES.fiches.filter((f) => f.statut !== "brouillon");
  const docs = fiches.map((f) => {
    const c = new Map();
    const textes = {
      titre: Object.values(f.titre || {}).join(" "),
      questions: Object.values(f.questions || {}).flat().join(" "),
      mots_cles: (f.mots_cles || []).join(" "),
      reponse: Object.values(f.reponse || {}).join(" "),
    };
    for (const [champ, texte] of Object.entries(textes)) for (const m of mots(texte)) c.set(m, (c.get(m) || 0) + POIDS[champ]);
    for (const k of new Set(conceptsDe(Object.values(textes).join(" ")))) c.set(k, (c.get(k) || 0) + POIDS.concepts);
    return c;
  });
  const N = docs.length || 1;
  const longueur = (d) => [...d.values()].reduce((a, b) => a + b, 0);
  const moy = docs.reduce((a, d) => a + longueur(d), 0) / N;
  const df = new Map();
  docs.forEach((d) => d.forEach((_, m) => df.set(m, (df.get(m) || 0) + 1)));
  const idf = new Map([...df].map(([m, n]) => [m, Math.log(1 + (N - n + 0.5) / (n + 0.5))]));
  const vocabAr = [...idf.keys()].filter((m) => isArabic(m) && m.length >= 4);
  const vocabLat = [...idf.keys()].filter((m) => !isArabic(m) && !m.startsWith("§") && m.length >= 4);

  function corriger(m) {
    if (idf.has(m) || m.length < 5) return m;
    const lim = m.length < 8 ? 1 : 2;
    let meilleur = m, dist = lim + 1;
    for (const v of isArabic(m) ? vocabAr : vocabLat) { const d = distance(m, v, lim); if (d < dist) { meilleur = v; dist = d; } }
    return meilleur;
  }
  const termes = (q) => mots(q).map(corriger).concat(conceptsDe(q));
  function chercher(question, k = 3) {
    const q = termes(question);
    if (!q.length) return [];
    const uniques = [...new Set(q)];
    const res = [];
    fiches.forEach((f, i) => {
      const d = docs[i], L = longueur(d);
      let s = 0; const trouves = [];
      for (const t of uniques) {
        const tf = d.get(t) || 0;
        if (!tf) continue;
        trouves.push(t);
        s += idf.get(t) * tf * (K1 + 1) / (tf + K1 * (1 - B + B * L / moy));
      }
      if (s) res.push({ fiche: f, score: r2(s), couverture: r2(trouves.length / uniques.length), mots: trouves });
    });
    res.sort((a, b) => b.score - a.score || b.couverture - a.couverture);
    return res.slice(0, k);
  }
  const suffisant = (r) => r.score >= SEUIL_SCORE && r.couverture >= SEUIL_COUVERTURE && r.mots.length >= 2;

  // ---------------- garde-fous ----------------
  // deux niveaux : « fraude » (refus) et « vigilance » (rappel du cadre légal) — listes déjà normalisées
  const FRAUDE = ["frauder", "fraude fiscale", "echapper a l impot", "eviter de payer l impot", "ne pas declarer", "cacher mes ventes", "cacher mon chiffre", "cacher mes revenus", "dissimuler", "fausse facture", "fausses factures", "facture fictive", "factures fictives", "fausse declaration", "sous declarer", "minorer mon chiffre", "sans facture pour ne pas", "blanchir", "evade tax", "tax evasion", "avoid paying tax", "hide my income", "hide income", "fake invoice", "false invoice", "not declare", "underreport", "launder", "تهرب", "نتهرب", "التهرب الجبايي", "نخبي", "نخبي المداخيل", "نهرب من الاداء", "ما نصرحش", "فاتوره مزوره", "فواتير مزوره", "فاتوره وهميه", "فواتير وهميه", "تزوير", "نزور", "ما نخلصش الاداء", "نغش", "غش جبايي"];
  const VIGILANCE = ["payer moins d impot", "payer moins d impots", "payer moins de taxe", "payer moins de tva", "reduire mes impots", "reduire mon impot", "sans facture", "sans facturer", "ne pas facturer", "au noir", "en espece sans", "eviter le controle", "echapper au controle", "sans que le fisc", "le fisc ne", "ne pas payer la tva", "pay less tax", "reduce my tax", "without invoice", "without an invoice", "off the books", "under the table", "avoid an audit", "avoid audit", "cash only", "ننقص من الاداء", "ننقص الاداء", "نقص من الاداء", "نخلص اقل", "ندفع اقل", "بلاش فاتوره", "بلا فاتوره", "دون فاتوره", "بدون فاتوره", "ما نعملش فاتوره", "بالنوار", "في النوار", "نتفادي المراقبه", "نهرب من المراقبه", "ما يعرفوش"];
  const INFORMATION = ["sanction", "sanctions", "penalite", "penalites", "amende", "qu est ce que", "definition", "risque", "risques", "penalty", "penalties", "what is", "punishment", "risk", "عقوبه", "عقوبات", "خطيه", "خطايا", "ما هو", "ما هي", "شنوه", "شنيه", "جزاء"];
  const ALTERNATIVES = ["amnistie_2026", "forfait", "penal", "contact_dgi"];
  const contient = (t, liste) => liste.some((f) => (f[0] >= "؀" ? t.includes(f) : t.includes(" " + f + " ")));
  function niveauRisque(q) {
    const t = " " + normaliser(q) + " ";
    if (contient(t, FRAUDE)) return contient(t, INFORMATION) ? "vigilance" : "fraude";
    if (contient(t, VIGILANCE)) return "vigilance";
    return null;
  }
  const frauduleuse = (q) => niveauRisque(q) === "fraude";
  function sansExpressionsSensibles(q) {
    let t = " " + normaliser(q) + " ";
    for (const f of [...FRAUDE, ...VIGILANCE].sort((a, b) => b.length - a.length)) t = t.split(f[0] >= "؀" ? f : " " + f + " ").join(" ");
    return t.split(" ").filter(Boolean).join(" ");
  }

  // ---------------- assistant ----------------
  const MESSAGES = {
    bonjour: { fr: "Bonjour ! Posez votre question fiscale : je réponds à partir des textes officiels et je cite la source.", ar: "مرحباً! اطرح سؤالك الجبائي: أجيب انطلاقاً من النصوص الرسمية وأذكر المصدر.", en: "Hello! Ask your tax question: I answer from official texts and cite the source." },
    merci: { fr: "Avec plaisir. Autre question ?", ar: "بكل سرور. هل من سؤال آخر؟", en: "You're welcome. Anything else?" },
    inconnu: { fr: "Je n'ai pas trouvé de source officielle suffisante pour répondre avec certitude. Je préfère ne pas deviner : vous pouvez transmettre la question à un agent.", ar: "لم أجد مصدراً رسمياً كافياً للإجابة بيقين. أفضّل ألّا أخمّن: يمكنك إحالة السؤال على عون.", en: "I could not find a sufficient official source to answer with certainty. I prefer not to guess: you can forward the question to an agent." },
    refus: {"fr": "Je ne peux pas vous aider à dissimuler des revenus ou à éviter l'impôt de manière illégale : c'est une infraction fiscale, exposée à des pénalités et à des poursuites. En revanche, si vous êtes en difficulté, il existe des voies légales : régulariser votre situation, bénéficier de l'amnistie fiscale 2026 si vous êtes concerné, choisir le régime adapté à votre activité ou demander des facilités de paiement à la recette des finances. Choisissez une piste ci-dessous ou parlez à un agent.", "ar": "لا يمكنني مساعدتك على إخفاء المداخيل أو التهرّب من الأداء بطريقة غير قانونية: فذلك مخالفة جبائية تعرّض صاحبها للخطايا والتتبّعات. في المقابل، إن كنت تواجه صعوبة، توجد حلول قانونية: تسوية وضعيتك، الانتفاع بالعفو الجبائي لسنة 2026 إن كنت معنياً، اختيار النظام الجبائي الملائم لنشاطك، أو طلب تسهيلات في الدفع لدى القباضة المالية. اختر أحد المسالك أدناه أو تحدّث مع عون.", "en": "I cannot help you hide income or avoid tax illegally: it is a tax offence, exposed to penalties and prosecution. If you are in difficulty, there are legal options: regularise your situation, use the 2026 tax amnesty if it applies to you, choose the regime suited to your activity or ask the tax collection office for payment facilities. Pick an option below or talk to an agent."},
    vigilance: {"fr": "Rappel du cadre légal : toute vente doit être facturée et déclarée ; payer moins d'impôt n'est possible que par les dispositifs prévus par les textes (régime adapté, déductions, avantages et amnisties votés). Je réponds uniquement dans ce cadre.", "ar": "تذكير بالإطار القانوني: كل بيع يجب أن تصدر به فاتورة وأن يُصرَّح به؛ ولا يمكن التخفيف من الأداء إلا بالآليات التي تنصّ عليها النصوص (النظام الملائم، الطرح، الامتيازات والعفو المصادق عليه). أجيب في هذا الإطار فقط.", "en": "Legal reminder: every sale must be invoiced and declared; paying less tax is only possible through the schemes provided by law (suitable regime, deductions, voted incentives and amnesties). I answer only within this framework."},
    vigilance_seul: {"fr": "Voici les pistes légales qui pourraient vous concerner :", "ar": "إليك المسالك القانونية التي قد تهمّك:", "en": "Here are the legal options that may concern you:"},
  };
  const SALUT = new Set(["bonjour", "salut", "bonsoir", "hello", "hi", "مرحبا", "عسلامه", "السلام", "سلام", "اهلا", "صباح"]);
  const MERCI = new Set(["merci", "thanks", "thank", "شكرا", "يعيشك", "بارك"]);
  const titreDe = (f, l) => f.titre[l] || f.titre.fr;
  function ficheReponse(f, l, score, couverture, voir) {
    return { type: "reponse", langue: l, fiche_id: f.id, titre: titreDe(f, l), texte: f.reponse[l] || f.reponse.fr, mode: "fiche",
      source: f.source || {}, statut: f.statut, verifie_le: f.verifie_le, validation_experte: f.validation_experte,
      action: f.action, score, couverture, voir_aussi: voir || [] };
  }
  function repondre(question, langue) {
    question = String(question || "").trim().slice(0, 500);
    const l = ["ar", "fr", "en"].includes(langue) ? langue : detectLang(question);
    if (!question) return { type: "vide", langue: l };
    const risque = niveauRisque(question);
    if (risque === "fraude") return { type: "refus", langue: l, texte: MESSAGES.refus[l], alternatives: alternatives(l) };
    const ms = normaliser(question).split(" ").filter(Boolean);
    if (ms.length && ms.length <= 4) {
      if (ms.some((m) => SALUT.has(m))) return { type: "conversation", langue: l, texte: MESSAGES.bonjour[l] };
      if (ms.some((m) => MERCI.has(m))) return { type: "conversation", langue: l, texte: MESSAGES.merci[l] };
    }
    const rs = chercher(risque ? sansExpressionsSensibles(question) : question);
    if (risque === "vigilance" && !(rs.length && suffisant(rs[0])))
      return { type: "vigilance", langue: l, texte: MESSAGES.vigilance[l] + "\n" + MESSAGES.vigilance_seul[l], alternatives: alternatives(l) };
    const props = rs.map((r) => ({ id: r.fiche.id, titre: titreDe(r.fiche, l) }));
    if (!rs.length || !suffisant(rs[0])) return { type: "inconnu", langue: l, texte: MESSAGES.inconnu[l], propositions: props };
    const rep = ficheReponse(rs[0].fiche, l, rs[0].score, rs[0].couverture, props.slice(1));
    if (risque === "vigilance") rep.vigilance = MESSAGES.vigilance[l];
    return rep;
  }
  function alternatives(l) {
    return ALTERNATIVES.map((i) => fiches.find((f) => f.id === i)).filter(Boolean).map((f) => ({ id: f.id, titre: titreDe(f, l) }));
  }

  // ---------------- échéances ----------------
  const PROFILS = {
    pp: { fr: "Commerçant (personne physique)", ar: "تاجر (شخص طبيعي)", en: "Trader (individual)" },
    lib: { fr: "Profession libérale / prestataire", ar: "مهنة حرة / مسدي خدمات", en: "Liberal profession / service provider" },
    art: { fr: "Artisan", ar: "حرفي", en: "Craftsperson" },
    pm: { fr: "Société (personne morale)", ar: "شركة (شخص معنوي)", en: "Company (legal entity)" },
  };
  const LIBELLES = {
    mens: { fr: "Déclaration mensuelle", ar: "التصريح الشهري", en: "Monthly return" },
    acpt: { fr: "Acompte provisionnel", ar: "قسط احتياطي", en: "Provisional instalment" },
    ir: { fr: "Déclaration annuelle de l'impôt sur le revenu", ar: "التصريح السنوي بالضريبة على الدخل", en: "Annual income tax return" },
    is: { fr: "Déclaration annuelle de l'impôt sur les sociétés", ar: "التصريح السنوي بالضريبة على الشركات", en: "Annual corporate tax return" },
    emp: { fr: "Déclaration de l'employeur", ar: "تصريح المؤجر", en: "Employer's return" },
  };
  const J = DONNEES.jours_feries;
  const D = (a, m, j) => new Date(Date.UTC(a, m - 1, j));
  const iso = (d) => d.toISOString().slice(0, 10);
  const plus = (d, n) => new Date(d.getTime() + n * 86400000);
  const ferie = (d) => J.estimes[iso(d)] || J.fixes[iso(d).slice(5)] || null;
  function reporter(d) {
    const motifs = [];
    while (d.getUTCDay() === 0 || ferie(d)) {
      motifs.push({ date: iso(d), motif: ferie(d) || { fr: "Dimanche", ar: "يوم أحد", en: "Sunday" } });
      d = plus(d, 1);
    }
    return [d, motifs];
  }
  function aujourdhui() { const n = new Date(); return D(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
  function echeances(profil, jours) {
    profil = PROFILS[profil] ? profil : "pp";
    const auj = aujourdhui(), fin = plus(auj, Math.max(1, Math.min(jours || 120, 400)));
    const brut = [];
    for (const a of [auj.getUTCFullYear(), auj.getUTCFullYear() + 1]) {
      if (profil !== "art") {
        for (let m = 1; m <= 12; m++) brut.push(["mens", D(a + (m === 12 ? 1 : 0), (m % 12) + 1, profil === "pm" ? 28 : 15), `${a}-${String(m).padStart(2, "0")}`]);
        for (const m of [6, 9, 12]) brut.push(["acpt", D(a, m, profil === "pm" ? 28 : 25), null]);
      }
      if (profil === "pm") brut.push(["is", D(a, 3, 25), String(a - 1)]);
      else brut.push(["ir", D(a, { pp: 4, lib: 5, art: 7 }[profil], 25), String(a - 1)]);
      brut.push(["emp", D(a, 2, 28), String(a - 1)]);
    }
    const out = [];
    for (const [type, d, periode] of brut) {
      const [reelle, motifs] = reporter(d);
      if (reelle >= auj && reelle <= fin) out.push({ type, libelle: LIBELLES[type], date_legale: iso(d), date: iso(reelle), report: motifs, periode, jours_restants: Math.round((reelle - auj) / 86400000) });
    }
    return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  }

  // ---------------- vérification ----------------
  function verifier(d) {
    const nombre = (k) => { const v = parseFloat(String(d[k] ?? 0).replace(",", ".").replace(/\s/g, "")); return isNaN(v) ? 0 : Math.max(0, v); };
    const r3 = (x) => Math.round(x * 1000) / 1000;
    const profil = d.profil === "pm" ? "pm" : "pp";
    const ca = nombre("ca_ht"), declaree = nombre("tva_declaree"), deductible = nombre("tva_deductible");
    const taux = [19, 13, 7].includes(Math.trunc(nombre("taux"))) ? Math.trunc(nombre("taux")) : 19;
    const points = [];
    const attendue = r3(ca * taux / 100), ecart = r3(declaree - attendue);
    points.push(Math.abs(ecart) <= 1 ? { niveau: "ok", code: "tva_ok", attendue } : { niveau: "alerte", code: "tva_ecart", attendue, declaree, ecart });
    const net = r3(declaree - deductible);
    points.push({ niveau: "info", code: net >= 0 ? "a_payer" : "credit", montant: Math.abs(net) });
    const m = /^(\d{4})-(\d{2})/.exec(String(d.periode || ""));
    if (m) {
      const a = +m[1], mo = +m[2];
      const [limite, report] = reporter(D(a + (mo === 12 ? 1 : 0), (mo % 12) + 1, profil === "pm" ? 28 : 15));
      points.push({ niveau: "info", code: "date_limite", date: iso(limite), report });
      if (d.date_depot) {
        const dep = new Date(d.date_depot + "T00:00:00Z");
        points.push(dep > limite ? { niveau: "critique", code: "retard", jours: Math.round((dep - limite) / 86400000) } : { niveau: "ok", code: "dans_les_delais" });
      }
    } else points.push({ niveau: "alerte", code: "periode_invalide" });
    const ordre = { ok: 0, info: 0, alerte: 1, critique: 2 };
    const pire = Math.max(...points.map((p) => ordre[p.niveau]));
    return { statut: ["ok", "alerte", "critique"][pire], points, taux };
  }

  // ---------------- rappels (.ics) — portage de mourchid/rappels.py ----------------
  const ALERTES = { j7: "-P6DT15H", j2: "-P1DT15H", j0: "PT8H" };
  const TX = {
    nom: { fr: "Mourchid Jibaya — échéances fiscales", ar: "مرشد جباية — الآجال الجبائية", en: "Mourchid Jibaya — tax deadlines" },
    limite: { fr: "Dernier délai", ar: "آخر أجل", en: "Deadline" }, reporte: { fr: "reporté du", ar: "مؤجَّل من", en: "moved from" },
    source: { fr: "Source : agenda fiscal de la DGI (jibaya.tn/agenda)", ar: "المصدر: الرزنامة الجبائية للإدارة العامة للأداءات (jibaya.tn/agenda)", en: "Source: DGI tax calendar (jibaya.tn/agenda)" },
    alerte: { j7: { fr: "Échéance fiscale dans 7 jours", ar: "أجل جبائي بعد 7 أيام", en: "Tax deadline in 7 days" },
      j2: { fr: "Échéance fiscale dans 2 jours", ar: "أجل جبائي بعد يومين", en: "Tax deadline in 2 days" },
      j0: { fr: "Échéance fiscale aujourd'hui", ar: "آخر أجل جبائي اليوم", en: "Tax deadline today" } },
  };
  const echapper = (t) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  function plier(l) { const out = [l.slice(0, 60)]; l = l.slice(60); while (l) { out.push(" " + l.slice(0, 59)); l = l.slice(59); } return out; }
  function ics(ech, langue, alertes, horodatage) {
    langue = ["ar", "fr", "en"].includes(langue) ? langue : "fr";
    alertes = ["j7", "j2", "j0"].filter((a) => (alertes || ["j7", "j2", "j0"]).includes(a));
    const stamp = horodatage || new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mourchid Jibaya//Echeances fiscales//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + echapper(TX.nom[langue])];
    for (const e of ech) {
      const d = new Date(e.date + "T00:00:00Z"), f = (x) => x.toISOString().slice(0, 10).replace(/-/g, "");
      const titre = e.libelle[langue] + (e.periode ? " · " + e.periode : "");
      let desc = `${TX.limite[langue]} : ${e.date}`;
      if (e.report && e.report.length) desc += ` (${TX.reporte[langue]} ${e.date_legale} : ${e.report.map((m) => m.motif[langue]).join(", ")})`;
      desc += "\n" + TX.source[langue];
      L.push("BEGIN:VEVENT", `UID:mj-${e.type}-${e.date}@mourchid-jibaya`, "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + f(d),
        "DTEND;VALUE=DATE:" + f(plus(d, 1)), "SUMMARY:" + echapper(titre), "DESCRIPTION:" + echapper(desc), "TRANSP:TRANSPARENT");
      for (const a of alertes) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + echapper(TX.alerte[a][langue] + " — " + titre), "TRIGGER:" + ALERTES[a], "END:VALARM");
      L.push("END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return L.flatMap(plier).join("\r\n") + "\r\n";
  }

  // ---------------- « API » locale (mêmes routes que serveur.py) ----------------
  let numeroTicket = 0;
  // indicateurs de la session (hors ligne : uniquement des comptages, rien n'est envoyé)
  const S = { questions: 0, reponses: 0, inconnus: 0, refus: 0, vigilance: 0, posees: {}, apresReponse: new Set(), directs: new Set(), tickets: 0, tickets_par_service: {}, par_langue: {}, fiches: {}, cartes: [] };
  function api(url, corps) {
    const u = new URL(url, "http://local");
    const q = Object.fromEntries(u.searchParams);
    switch (u.pathname) {
      case "/api/question": {
        const r = repondre(corps.question, corps.langue);
        if (r.type !== "conversation" && r.type !== "vide") {
          S.questions++; S.par_langue[r.langue] = (S.par_langue[r.langue] || 0) + 1;
          if (r.type === "reponse") { S.reponses++; S.fiches[r.fiche_id] = (S.fiches[r.fiche_id] || 0) + 1; }
          if (r.type === "inconnu") S.inconnus++;
          if (r.type === "refus") S.refus++;
          if (r.type === "vigilance") S.vigilance++;
          const cle = String(corps.question || "").trim().slice(0, 500);
          if (S.posees[cle] !== "reponse") S.posees[cle] = r.type;
        }
        return r;
      }
      case "/api/ticket": {
        numeroTicket++; S.tickets++;
        const sv = corps.service || "fisc"; S.tickets_par_service[sv] = (S.tickets_par_service[sv] || 0) + 1;
        const question = String(corps.question || "").trim().slice(0, 500);
        const langue = detectLang(question);   // langue de la question (et non de l'interface)
        if (S.posees[question] === "reponse") S.apresReponse.add(question);   // réponse donnée mais agent demandé
        else if (!(question in S.posees)) S.directs.add(question);            // jamais posée au bot : nouvelle demande
        const risque = niveauRisque(question);
        const rs = chercher(risque ? sansExpressionsSensibles(question) : question);
        const carte = { id: "MJ-L" + String(numeroTicket).padStart(4, "0"), numero: numeroTicket, local: true,
          horodatage: (() => { const n = new Date(); return new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 19); })(), langue, question, contact: String(corps.contact || "").slice(0, 120),
          service: sv, statut: "ouvert",
          contexte: { resultat: risque === "fraude" ? "refus" : rs.length && suffisant(rs[0]) ? "reponse_donnee" : risque === "vigilance" ? "vigilance" : "sans_source",
            langue_detectee: detectLang(question),
            fiches_proches: rs.map((r) => ({ id: r.fiche.id, titre: r.fiche.titre, score: r.score, couverture: r.couverture, source: (r.fiche.source || {}).reference || "" })) } };
        S.cartes.unshift(carte);
        return carte;
      }
      case "/api/tableau": {
        const top = Object.entries(S.fiches).sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([id, n]) => ({ id, titre: (fiches.find((f) => f.id === id) || {}).titre || {}, n }));
        const bilan = { total: fiches.length, source_officielle: fiches.filter((f) => f.statut === "source_officielle").length,
          a_confirmer: fiches.filter((f) => f.statut === "a_confirmer").length };
        const demandes = S.questions + S.directs.size, resolues = Math.max(0, S.reponses - S.apresReponse.size);
        return { portee: "session", demandes, resolues, taux: demandes ? Math.round(resolues * 100 / demandes) : 0,
          tickets_apres_reponse: S.apresReponse.size, tickets_directs: S.directs.size, questions: S.questions, reponses: S.reponses, inconnus: S.inconnus, refus: S.refus, vigilance: S.vigilance, tickets: S.tickets,
          tickets_par_service: S.tickets_par_service, par_langue: S.par_langue, top, fiches: bilan, cartes: S.cartes };
      }
      case "/api/verification": return verifier(corps);
      case "/api/rappels": {
        const mois = Math.max(1, Math.min(+corps.mois || 6, 12));
        const ech = echeances(corps.profil || "pp", mois * 31);
        return { nombre: ech.length, ics: ics(ech, corps.langue || "fr", corps.alertes) };
      }
      case "/api/echeances": return { profils: PROFILS, echeances: echeances(q.profil || "pp", +q.jours || 120) };
      case "/api/fiche": { const f = fiches.find((x) => x.id === q.id); return f ? ficheReponse(f, q.langue || "fr") : { erreur: "introuvable" }; }
      case "/api/sources": {
        const vues = new Map();
        fiches.forEach((f) => { const s = f.source || {}; if (s.reference && !vues.has(s.reference)) vues.set(s.reference, s.url || ""); });
        return { sources: [...vues].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([reference, url]) => ({ reference, url })) };
      }
    }
    return { erreur: "introuvable" };
  }
  return { api, repondre, chercher, echeances, verifier, normaliser, mots, ics };
})();
if (typeof module !== "undefined") module.exports = MJ;
