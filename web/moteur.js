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
  const FRAUDE = ["frauder", "fraude fiscale", "echapper a l impot", "eviter de payer l impot", "ne pas declarer", "cacher mes ventes",
    "cacher mon chiffre", "dissimuler", "fausse facture", "fausses factures", "sans facture pour ne pas", "blanchir",
    "evade tax", "tax evasion", "avoid paying tax", "hide my income", "hide income", "fake invoice", "not declare",
    "تهرب", "نتهرب", "التهرب الجبائي", "نخبي", "نخبّي المداخيل", "نهرب من الاداء", "ما نصرحش", "فاتوره مزوره", "فواتير مزوره",
    "ما نخلصش الاداء", "نغش"].map(normaliser);
  function frauduleuse(q) {
    const t = " " + normaliser(q) + " ";
    return FRAUDE.some((f) => (f[0] >= "؀" ? t.includes(f) : t.includes(" " + f + " ")));
  }

  // ---------------- assistant ----------------
  const MESSAGES = {
    bonjour: { fr: "Bonjour ! Posez votre question fiscale : je réponds à partir des textes officiels et je cite la source.", ar: "مرحباً! اطرح سؤالك الجبائي: أجيب انطلاقاً من النصوص الرسمية وأذكر المصدر.", en: "Hello! Ask your tax question: I answer from official texts and cite the source." },
    merci: { fr: "Avec plaisir. Autre question ?", ar: "بكل سرور. هل من سؤال آخر؟", en: "You're welcome. Anything else?" },
    inconnu: { fr: "Je n'ai pas trouvé de source officielle suffisante pour répondre avec certitude. Je préfère ne pas deviner : vous pouvez transmettre la question à un agent.", ar: "لم أجد مصدراً رسمياً كافياً للإجابة بيقين. أفضّل ألّا أخمّن: يمكنك إحالة السؤال على عون.", en: "I could not find a sufficient official source to answer with certainty. I prefer not to guess: you can forward the question to an agent." },
    refus: { fr: "Je ne peux pas aider à éviter l'impôt de manière illégale. En revanche, je peux vous indiquer les dispositifs légaux : régularisation, échelonnement, régime adapté à votre activité.", ar: "لا يمكنني المساعدة على التهرّب من الأداء. في المقابل، يمكنني توجيهك إلى الحلول القانونية: تسوية الوضعية، الدفع بالتقسيط، أو النظام الجبائي الملائم لنشاطك.", en: "I cannot help avoid tax illegally. I can, however, point you to legal options: regularisation, payment plans, or the regime suited to your activity." },
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
    if (frauduleuse(question)) return { type: "refus", langue: l, texte: MESSAGES.refus[l] };
    const ms = normaliser(question).split(" ").filter(Boolean);
    if (ms.length && ms.length <= 4) {
      if (ms.some((m) => SALUT.has(m))) return { type: "conversation", langue: l, texte: MESSAGES.bonjour[l] };
      if (ms.some((m) => MERCI.has(m))) return { type: "conversation", langue: l, texte: MESSAGES.merci[l] };
    }
    const rs = chercher(question);
    const props = rs.map((r) => ({ id: r.fiche.id, titre: titreDe(r.fiche, l) }));
    if (!rs.length || !suffisant(rs[0])) return { type: "inconnu", langue: l, texte: MESSAGES.inconnu[l], propositions: props };
    return ficheReponse(rs[0].fiche, l, rs[0].score, rs[0].couverture, props.slice(1));
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

  // ---------------- « API » locale (mêmes routes que serveur.py) ----------------
  let numeroTicket = 0;
  function api(url, corps) {
    const u = new URL(url, "http://local");
    const q = Object.fromEntries(u.searchParams);
    switch (u.pathname) {
      case "/api/question": return repondre(corps.question, corps.langue);
      case "/api/ticket": numeroTicket++; return { id: "MJ-L" + String(numeroTicket).padStart(4, "0"), numero: numeroTicket, local: true };
      case "/api/verification": return verifier(corps);
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
  return { api, repondre, chercher, echeances, verifier, normaliser, mots };
})();
if (typeof module !== "undefined") module.exports = MJ;
