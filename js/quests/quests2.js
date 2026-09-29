// Nouveaux types d'énigmes : la plaque, les deux photos, la filature, le butin,
// les horaires (vérification d'alibi) et l'expertise d'écriture.
// Même principe que les autres : chaque énigme est générée à partir d'une graine,
// vérifiée (une seule bonne réponse) et demande de croiser plusieurs éléments.

const PERSONNES = ['Karim', 'Léa', 'Marc', 'Sofia', 'Julien', 'Nadia', 'Thomas', 'Emma', 'Hugo', 'Inès', 'Lucas', 'Chloé', 'Mehdi', 'Sarah', 'Kevin', 'Laura', 'Yannick', 'Fatima', 'Olivier', 'Manon'];
const hm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const euros = (v) => `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;

/** Nombre minimal d'indices à croiser pour isoler la bonne réponse. */
function minIndices(indices, mondes, vraie) {
  const n = indices.length;
  for (let k = 1; k <= n; k++) {
    const idx = [...Array(k).keys()];
    for (;;) {
      const restes = mondes.filter((w) => idx.every((i) => indices[i].f(w)));
      if (restes.length === 1 && restes[0] === vraie) return k;
      let p = k - 1;
      while (p >= 0 && idx[p] === n - k + p) p--;
      if (p < 0) break;
      idx[p]++;
      for (let q = p + 1; q < k; q++) idx[q] = idx[q - 1] + 1;
    }
  }
  return n + 1;
}

// ─────────────────────────────── La plaque ───────────────────────────────
// Format belge 1-ABC-234. Les témoins ne se souviennent que de détails ;
// la DIV propose des plaques proches : il faut croiser les témoignages.

const LETTRES = 'ABCDEFGHJKLMNPRSTVWXYZ';
const VOYELLES = new Set(['A', 'E', 'Y']);
const TEMOINS_PLAQUE = ['Le pompiste', 'Une passante', 'Le chauffeur de bus', 'La caméra du carrefour', 'Un cycliste', 'La commerçante d’en face', 'Le gardien du parking', 'Un livreur'];

function plaque(rng, diff) {
  const nCand = diff <= 1 ? 5 : diff <= 3 ? 7 : 9;
  const besoin = diff <= 1 ? 2 : diff <= 3 ? 2 : 3;
  for (let essai = 0; essai < 400; essai++) {
    const fab = () => ({ d: rng.int(1, 2), l: [rng.pick(LETTRES), rng.pick(LETTRES), rng.pick(LETTRES)], c: [rng.int(0, 9), rng.int(0, 9), rng.int(0, 9)] });
    const txt = (p) => `${p.d}-${p.l.join('')}-${p.c.join('')}`;
    const secret = fab();
    // Distracteurs proches : une ou deux différences avec la vraie plaque.
    const cands = [secret];
    const vus = new Set([txt(secret)]);
    for (let g = 0; cands.length < nCand && g < 200; g++) {
      const p = JSON.parse(JSON.stringify(secret));
      const nMut = rng.int(1, 2);
      for (let m = 0; m < nMut; m++) {
        const k = rng.int(0, 6);
        if (k === 0) p.d = p.d === 1 ? 2 : 1;
        else if (k <= 3) p.l[k - 1] = rng.pick(LETTRES);
        else p.c[k - 4] = rng.int(0, 9);
      }
      if (!vus.has(txt(p))) { vus.add(txt(p)); cands.push(p); }
    }
    if (cands.length < nCand) continue;
    const s = secret, somme = (p) => p.c[0] + p.c[1] + p.c[2];
    const pool = [
      { t: `« Elle commençait par un ${s.d}. »`, f: (p) => p.d === s.d },
      { t: `« Il y avait un ${s.l[1]} au milieu des lettres. »`, f: (p) => p.l[1] === s.l[1] },
      { t: `« Les lettres commençaient par ${s.l[0]}. »`, f: (p) => p.l[0] === s.l[0] },
      { t: `« Il y avait un ${s.l[2]} dans les lettres, j’en suis sûr. »`, f: (p) => p.l.includes(s.l[2]) },
      { t: `« Elle finissait par un chiffre ${s.c[2] % 2 ? 'impair' : 'pair'}. »`, f: (p) => p.c[2] % 2 === s.c[2] % 2 },
      { t: `« Les trois derniers chiffres faisaient ${somme(s)} en les additionnant. »`, f: (p) => somme(p) === somme(s) },
      { t: `« Le premier des trois chiffres était un ${s.c[0]}. »`, f: (p) => p.c[0] === s.c[0] },
      { t: `« Il n’y avait ${s.l.some((x) => VOYELLES.has(x)) ? 'qu’une' : 'aucune'} voyelle dans les lettres. »`, f: (p) => (s.l.filter((x) => VOYELLES.has(x)).length === 1 ? p.l.filter((x) => VOYELLES.has(x)).length === 1 : p.l.every((x) => !VOYELLES.has(x))), ok: s.l.filter((x) => VOYELLES.has(x)).length <= 1 },
      { t: `« Les chiffres montaient : chacun plus grand que le précédent. »`, f: (p) => p.c[0] < p.c[1] && p.c[1] < p.c[2], ok: s.c[0] < s.c[1] && s.c[1] < s.c[2] },
      { t: `« Un chiffre revenait deux fois. »`, f: (p) => new Set(p.c).size < 3, ok: new Set(s.c).size < 3 },
      { t: `« Tous les chiffres étaient différents. »`, f: (p) => new Set(p.c).size === 3, ok: new Set(s.c).size === 3 },
    ].filter((c) => c.ok !== false);
    // On ajoute des témoignages jusqu'à isoler la vraie plaque, puis on retire les superflus.
    const choisis = [];
    let restes = cands;
    for (const c of rng.shuffle(pool)) {
      const r2 = restes.filter(c.f);
      if (r2.length < restes.length) { choisis.push(c); restes = r2; }
      if (restes.length === 1) break;
    }
    if (restes.length !== 1) continue;
    for (const c of rng.shuffle(choisis.slice())) {
      const sans = choisis.filter((x) => x !== c);
      if (cands.filter((p) => sans.every((x) => x.f(p))).length === 1) choisis.splice(choisis.indexOf(c), 1);
    }
    const pas = minIndices(choisis, cands, secret);
    if (pas < besoin) continue;
    // Chaque plaque candidate doit être éliminée par au moins un témoignage (sinon réponse ambiguë).
    const temoins = rng.shuffle(TEMOINS_PLAQUE).slice(0, choisis.length);
    const ordre = rng.shuffle(cands);
    return {
      titre: 'La plaque', mode: 'choix',
      contexte: rng.pick([
        'Délit de fuite rue des Tanneurs : une voiture grise a percuté un scooter et a filé. La DIV sort les plaques des voitures grises de la région qui ressemblent aux souvenirs des témoins.',
        'Un vol à l’arraché a été commis depuis une voiture en marche. Les témoins n’ont retenu que des détails de la plaque ; la DIV propose une liste de plaques proches.',
        'Une camionnette a déposé des déchets en pleine rue. Plusieurs témoins ont aperçu la plaque, chacun un morceau. Voici les plaques compatibles avec le modèle.',
      ]),
      elements: choisis.map((c, i) => ({ label: temoins[i], texte: c.t })),
      question: 'Quelle est la bonne plaque ?',
      choix: ordre.map((p) => ({ id: txt(p), label: txt(p) })),
      mono: true,
      answer: txt(secret),
      astuce: 'Prends les plaques une par une et raye celles qu’un témoignage contredit.',
      explication: `C’est ${txt(secret)} : c’est la seule plaque qui respecte tous les témoignages.`,
      _pas: pas,
    };
  }
  throw new Error('plaque : génération impossible');
}

// ─────────────────────────────── Les deux photos ───────────────────────────────
// Deux photos du même parking, prises à quelques minutes d'intervalle.
// Une seule place a changé. Aux niveaux élevés, la 2e photo est prise depuis l'autre côté.

const COULEURS_AUTO = [['rouge', '#C8453B'], ['bleue', '#3F6FC4'], ['blanche', '#E8ECEF'], ['grise', '#8A949E'], ['noire', '#23272C'], ['verte', '#3E8A5B'], ['jaune', '#E2B53C']];
const TYPES_AUTO = { citadine: { w: 20, h: 34 }, berline: { w: 22, h: 42 }, suv: { w: 26, h: 44 }, camionnette: { w: 26, h: 52 } };

function dessinerAuto(x, y, a) {
  if (!a) return '';
  const t = TYPES_AUTO[a.type];
  const c = COULEURS_AUTO[a.col][1];
  const ox = x - t.w / 2, oy = y - t.h / 2;
  const toit = a.type === 'camionnette'
    ? `<rect x="${ox + 3}" y="${oy + 14}" width="${t.w - 6}" height="${t.h - 18}" rx="2" fill="#000" fill-opacity=".12"/>`
    : `<rect x="${ox + 3}" y="${oy + t.h * 0.38}" width="${t.w - 6}" height="${t.h * 0.34}" rx="3" fill="#000" fill-opacity=".14"/>`;
  return `<g><rect x="${ox}" y="${oy}" width="${t.w}" height="${t.h}" rx="${a.type === 'camionnette' ? 3 : 6}" fill="${c}" stroke="#0B1119" stroke-width="1.2"/>
    <rect x="${ox + 3}" y="${oy + 5}" width="${t.w - 6}" height="${a.type === 'camionnette' ? 7 : t.h * 0.2}" rx="2" fill="#1B2A3A"/>${toit}
    ${a.barres ? `<path d="M${ox + 4} ${oy + t.h * 0.42}h${t.w - 8}M${ox + 4} ${oy + t.h * 0.6}h${t.w - 8}" stroke="#0B1119" stroke-width="1.4"/>` : ''}</g>`;
}

function photoSvg(places, cols, miroir, heure) {
  const cw = 44, rh = 70, W = cols * cw + 20, rows = Math.ceil(places.length / cols), H = rows * rh + 30;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Photo du parking à ${heure}" style="display:block;border-radius:8px;background:#3B4148">`;
  s += `<rect width="${W}" height="${H}" fill="#3B4148"/>`;
  for (let i = 0; i < places.length; i++) {
    const r = Math.floor(i / cols), c0 = i % cols, c = miroir ? cols - 1 - c0 : c0;
    const rr = miroir ? rows - 1 - r : r;
    const x = 10 + c * cw + cw / 2, y = 10 + rr * rh + rh / 2;
    s += `<rect x="${x - cw / 2 + 1}" y="${y - rh / 2 + 2}" width="${cw - 2}" height="${rh - 6}" fill="none" stroke="#E8ECEF" stroke-opacity=".55" stroke-width="1"/>`;
    s += `<text x="${x}" y="${y + rh / 2 - 7}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="8" fill="#E8ECEF" fill-opacity=".8">P${i + 1}</text>`;
    s += dessinerAuto(x, y - 5, places[i]);
  }
  s += `<text x="${W - 6}" y="${H - 6}" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="9" fill="#F2B544">${heure}</text></svg>`;
  return s;
}

function photos(rng, diff) {
  const cols = diff <= 2 ? 3 : 4;
  const n = diff <= 1 ? 6 : diff <= 3 ? 8 : 12;
  const miroir = diff >= 4;
  const types = Object.keys(TYPES_AUTO);
  const places = Array.from({ length: n }, () => (rng.chance(0.15) ? null : { type: rng.pick(types), col: rng.int(0, COULEURS_AUTO.length - 1), barres: rng.chance(0.25) }));
  const apres = places.map((p) => (p ? { ...p } : null));
  const i = rng.int(0, n - 1);
  let quoi;
  const modes = diff <= 1 ? ['part', 'arrive'] : diff <= 3 ? ['part', 'arrive', 'couleur'] : ['couleur', 'type', 'barres'];
  let mode = rng.pick(modes);
  if (!places[i] && mode !== 'arrive') mode = 'arrive';
  if (places[i] && mode === 'arrive') mode = 'part';
  if (mode === 'part') { apres[i] = null; quoi = 'la voiture qui y était est partie'; }
  else if (mode === 'arrive') { apres[i] = { type: rng.pick(types), col: rng.int(0, COULEURS_AUTO.length - 1), barres: false }; quoi = 'une voiture est arrivée'; }
  else if (mode === 'couleur') { let c; do c = rng.int(0, COULEURS_AUTO.length - 1); while (c === places[i].col); apres[i].col = c; quoi = `la voiture ${COULEURS_AUTO[places[i].col][0]} a été remplacée par une ${COULEURS_AUTO[c][0]} du même modèle`; }
  else if (mode === 'type') { let t; do t = rng.pick(types); while (t === places[i].type); apres[i].type = t; quoi = 'le modèle a changé, pas la couleur'; }
  else { apres[i].barres = !places[i].barres; quoi = apres[i].barres ? 'des barres de toit sont apparues' : 'les barres de toit ont disparu'; }
  const h0 = rng.int(20 * 60 + 30, 22 * 60), h1 = h0 + rng.int(12, 40);
  return {
    titre: 'Les deux photos', mode: 'choix',
    contexte: `Une caméra de surveillance a photographié le parking du quai des Moulins à ${hm(h0)} puis à ${hm(h1)}. Le suspect prétend qu’il n’a pas bougé de la soirée. Une seule place a changé entre les deux photos.${miroir ? ' Attention : la seconde photo est prise par la caméra d’en face, l’image est donc retournée ; les numéros des places sont peints au sol.' : ''}`,
    figures: [{ titre: `Photo 1 · ${hm(h0)}`, svg: photoSvg(places, cols, false, hm(h0)) }, { titre: `Photo 2 · ${hm(h1)}`, svg: photoSvg(apres, cols, miroir, hm(h1)) }],
    question: 'Sur quelle place quelque chose a-t-il changé ?',
    choix: places.map((_, k) => ({ id: `P${k + 1}`, label: `P${k + 1}` })),
    answer: `P${i + 1}`,
    astuce: miroir ? 'Repère-toi avec les numéros au sol, pas avec la position dans l’image.' : 'Compare les places une par une : couleur, forme, toit.',
    explication: `C’est la place P${i + 1} : ${quoi}.`,
    _pas: 2,
  };
}

// ─────────────────────────────── La filature ───────────────────────────────
// Le suspect est suivi à pied. Le compte rendu de filature ne donne que des
// directions relatives (à gauche, à droite) : où est-il arrivé ?

const REPERES = ['la Gare', 'l’Église', 'la Pharmacie', 'le Parc', 'l’École', 'la Banque', 'le Marché', 'la Poste', 'le Stade', 'la Piscine', 'le Cinéma', 'la Mairie'];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // nord, est, sud, ouest (y vers le bas)
const NOM_DIR = ['le nord', 'l’est', 'le sud', 'l’ouest'];

function filature(rng, diff) {
  const N = 5;
  const nMoves = diff <= 1 ? 3 : diff <= 2 ? 4 : diff <= 3 ? 5 : diff <= 4 ? 6 : 7;
  for (let essai = 0; essai < 500; essai++) {
    let x = rng.int(0, N - 1), y = rng.int(0, N - 1), d = rng.int(0, 3);
    const start = { x, y, d };
    const etapes = [];
    const pos = (xx, yy) => xx >= 0 && yy >= 0 && xx < N && yy < N;
    let ok = true;
    // Chemin réel.
    for (let m = 0; m < nMoves; m++) {
      const tourne = m === 0 ? 'droit' : rng.pick(diff >= 4 ? ['gauche', 'droite', 'gauche', 'droite', 'demi'] : ['gauche', 'droite']);
      const nd = tourne === 'gauche' ? (d + 3) % 4 : tourne === 'droite' ? (d + 1) % 4 : tourne === 'demi' ? (d + 2) % 4 : d;
      const pas = rng.int(1, 2);
      const nx = x + DIRS[nd][0] * pas, ny = y + DIRS[nd][1] * pas;
      if (!pos(nx, ny)) { ok = false; break; }
      etapes.push({ tourne, pas }); x = nx; y = ny; d = nd;
    }
    if (!ok || (x === start.x && y === start.y)) continue;
    // Où arriverait-on en confondant gauche et droite ?
    const suivre = (inverse) => {
      let xx = start.x, yy = start.y, dd = start.d;
      for (const e of etapes) {
        const t = inverse && e.tourne === 'gauche' ? 'droite' : inverse && e.tourne === 'droite' ? 'gauche' : e.tourne;
        dd = t === 'gauche' ? (dd + 3) % 4 : t === 'droite' ? (dd + 1) % 4 : t === 'demi' ? (dd + 2) % 4 : dd;
        xx += DIRS[dd][0] * e.pas; yy += DIRS[dd][1] * e.pas;
      }
      return { x: xx, y: yy };
    };
    const faux = suivre(true);
    const cles = new Set([`${x},${y}`, `${start.x},${start.y}`]);
    const lieux = [{ x, y }];
    if (pos(faux.x, faux.y) && !cles.has(`${faux.x},${faux.y}`)) { lieux.push(faux); cles.add(`${faux.x},${faux.y}`); }
    const nLieux = diff <= 2 ? 5 : 7;
    for (let g = 0; lieux.length < nLieux && g < 100; g++) {
      const p = { x: rng.int(0, N - 1), y: rng.int(0, N - 1) };
      if (!cles.has(`${p.x},${p.y}`)) { cles.add(`${p.x},${p.y}`); lieux.push(p); }
    }
    const noms = rng.shuffle(REPERES).slice(0, lieux.length);
    lieux.forEach((l, k) => { l.nom = noms[k]; });
    const S = 46, M = 26, W = (N - 1) * S + 2 * M;
    const cx = (v) => M + v * S;
    let svg = `<svg viewBox="0 0 ${W} ${W}" width="100%" role="img" aria-label="Plan du quartier" style="display:block;border-radius:8px;background:#172131">`;
    for (let k = 0; k < N; k++) svg += `<line x1="${cx(0)}" y1="${cx(k)}" x2="${cx(N - 1)}" y2="${cx(k)}" stroke="#3B4E6E" stroke-width="7" stroke-linecap="round"/><line x1="${cx(k)}" y1="${cx(0)}" x2="${cx(k)}" y2="${cx(N - 1)}" stroke="#3B4E6E" stroke-width="7" stroke-linecap="round"/>`;
    for (const l of rng.shuffle(lieux)) svg += `<circle cx="${cx(l.x)}" cy="${cx(l.y)}" r="6" fill="#F2B544" stroke="#0B1119" stroke-width="1.5"/><text x="${cx(l.x)}" y="${cx(l.y) - 10}" text-anchor="middle" font-family="IBM Plex Sans,sans-serif" font-weight="600" font-size="9.5" fill="#EEF3F8" paint-order="stroke" stroke="#172131" stroke-width="3">${l.nom.replace(/^l’|^la |^le /, '').replace(/^./, (c) => c.toUpperCase())}</text>`;
    const ang = [0, 90, 180, 270][start.d];
    svg += `<g transform="translate(${cx(start.x)} ${cx(start.y)}) rotate(${ang})"><circle r="9" fill="#5AB0F0" stroke="#0B1119" stroke-width="1.5"/><path d="M0 -6L4.5 3H-4.5Z" fill="#0B1119"/></g>`;
    svg += `<text x="${W - 8}" y="14" text-anchor="end" font-family="IBM Plex Sans,sans-serif" font-size="9" fill="#9FB0C0">N ↑</text></svg>`;
    const phrase = (e, k) => {
      const n = e.pas === 1 ? 'jusqu’au carrefour suivant' : 'deux carrefours plus loin';
      if (k === 0) return `Il part tout droit, ${n}.`;
      if (e.tourne === 'demi') return `Il fait demi-tour et marche ${n}.`;
      return `Il tourne à ${e.tourne}, puis continue ${n}.`;
    };
    return {
      titre: 'La filature', mode: 'choix',
      contexte: `Compte rendu de filature : le suspect sort du café (point bleu), en regardant vers ${NOM_DIR[start.d]} (la flèche). Les enquêteurs n’ont noté que ses changements de direction, de son point de vue à lui.`,
      figures: [{ titre: 'Plan du quartier', svg }],
      indices: etapes.map(phrase),
      question: 'Où le suspect est-il arrivé ?',
      choix: rng.shuffle(lieux).map((l) => ({ id: l.nom, label: l.nom.replace(/^./, (c) => c.toUpperCase()) })),
      answer: noms[0],
      astuce: 'Après chaque virage, redessine sa flèche : « à gauche » dépend de la direction dans laquelle il marche.',
      explication: `Il est arrivé à ${noms[0]}. ${pos(faux.x, faux.y) && faux.x !== x ? 'Piège classique : en inversant gauche et droite, on se retrouve ailleurs.' : ''}`.trim(),
      _pas: nMoves,
    };
  }
  throw new Error('filature : génération impossible');
}

// ─────────────────────────────── Le butin ───────────────────────────────
// Un receleur a lâché quelques informations sur la valeur des objets volés.
// Des équations simples, mais il faut toutes les combiner.

const OBJETS = ['la montre', 'le collier', 'la bague', 'le tableau', 'l’ordinateur', 'la statuette', 'le vélo électrique', 'les boucles d’oreilles'];

function butin(rng, diff) {
  const n = diff <= 2 ? 3 : 4;
  for (let essai = 0; essai < 500; essai++) {
    const objs = rng.shuffle(OBJETS).slice(0, n);
    const v = objs.map(() => 50 * rng.int(2, 40));
    if (new Set(v).size < n) continue;
    const total = v.reduce((a, b) => a + b, 0);
    const pool = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (a === b) continue;
      if (v[a] % v[b] === 0 && v[a] / v[b] >= 2 && v[a] / v[b] <= 4) pool.push({ eq: Object.assign(Array(n).fill(0), { [a]: 1, [b]: -v[a] / v[b] }), c: 0, t: `${cap(objs[a])} vaut ${['', '', 'deux', 'trois', 'quatre'][v[a] / v[b]]} fois ${objs[b]}.` });
      if (a < b) pool.push({ eq: Object.assign(Array(n).fill(0), { [a]: 1, [b]: 1 }), c: v[a] + v[b], t: `${cap(objs[a])} et ${objs[b]} valent ensemble ${euros(v[a] + v[b])}.` });
      if (v[a] > v[b]) pool.push({ eq: Object.assign(Array(n).fill(0), { [a]: 1, [b]: -1 }), c: v[a] - v[b], t: `${cap(objs[a])} vaut ${euros(v[a] - v[b])} de plus que ${objs[b]}.` });
    }
    pool.push({ eq: Array(n).fill(1), c: total, t: `Le receleur en proposait ${euros(total)} pour le lot complet.` });
    // On choisit n équations indépendantes (système à solution unique).
    const choisis = [];
    for (const e of rng.shuffle(pool)) {
      if (rang([...choisis, e].map((x) => x.eq)) === choisis.length + 1) choisis.push(e);
      if (choisis.length === n) break;
    }
    if (choisis.length !== n) continue;
    // Pas d'indice qui donne directement une valeur seule.
    const cible = rng.int(0, n - 1);
    if (diff >= 3 && choisis.some((e) => e.eq.filter((x) => x !== 0).length === 1)) continue;
    return {
      titre: 'Le butin', mode: 'exact',
      contexte: `Un receleur vient d’être interpellé avec ${n} objets volés lors d’un cambriolage. L’assureur a besoin de la valeur de chacun. Voici ce que le receleur a lâché pendant son audition.`,
      indices: rng.shuffle(choisis).map((e) => e.t),
      question: `Combien vaut ${objs[cible]}, en euros ?`,
      placeholder: 'montant', inputmode: 'numeric',
      answer: String(v[cible]),
      astuce: 'Donne une lettre à chaque objet et écris chaque phrase comme une petite équation.',
      explication: `${cap(objs[cible])} vaut ${euros(v[cible])}. Les valeurs : ${objs.map((o, k) => `${o} ${euros(v[k])}`).join(', ')}.`,
      _pas: n,
    };
  }
  throw new Error('butin : génération impossible');
}

/** Rang d'une matrice (élimination de Gauss). */
function rang(m) {
  const a = m.map((r) => r.slice());
  let r = 0;
  for (let c = 0; c < (a[0] || []).length && r < a.length; c++) {
    let p = r;
    while (p < a.length && Math.abs(a[p][c]) < 1e-9) p++;
    if (p === a.length) continue;
    [a[r], a[p]] = [a[p], a[r]];
    for (let i = 0; i < a.length; i++) if (i !== r) { const f = a[i][c] / a[r][c]; for (let j = c; j < a[i].length; j++) a[i][j] -= f * a[r][j]; }
    r++;
  }
  return r;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ─────────────────────────────── Les horaires ───────────────────────────────
// Vérification d'alibis avec la fiche horaire d'une ligne de bus :
// une seule déclaration est impossible.

const ARRETS = ['Gare du Delta', 'Place des Martyrs', 'Les Casernes', 'Champ de Foire', 'Écluse', 'Quartier Stade', 'Les Viviers', 'Porte Sud'];

function horaires(rng, diff) {
  const nArrets = diff <= 2 ? 4 : 5;
  const nGens = diff <= 1 ? 3 : diff <= 3 ? 4 : 5;
  for (let essai = 0; essai < 300; essai++) {
    const arrets = rng.shuffle(ARRETS).slice(0, nArrets);
    const trajets = arrets.slice(1).map(() => rng.int(3, 9)); // minutes entre deux arrêts
    const cumul = [0]; for (const t of trajets) cumul.push(cumul[cumul.length - 1] + t);
    const premier = rng.int(20 * 60 + 2, 20 * 60 + 14), freq = rng.pick([12, 15, 20]);
    const departs = Array.from({ length: 6 }, (_, k) => premier + k * freq);
    const gens = rng.shuffle(PERSONNES).slice(0, nGens);
    const menteur = rng.int(0, nGens - 1);
    const decl = [];
    let bon = true, raison = '';
    for (let g = 0; g < nGens; g++) {
      const a = rng.int(0, nArrets - 2), b = rng.int(a + 1, nArrets - 1);
      const dep = rng.int(0, departs.length - 2);
      const monte = departs[dep] + cumul[a], descend = departs[dep] + cumul[b];
      const marche = diff >= 3 ? rng.int(4, 12) : 0;
      let arrivee = descend + marche + (diff >= 3 ? rng.int(0, 4) : 0);
      let texteMonte = hm(monte);
      if (g === menteur) {
        // Deux façons de mentir : un bus qui ne passe pas à cette heure-là, ou une arrivée trop tôt.
        if (rng.chance(0.5)) {
          let faux = monte + rng.pick([-4, -3, 3, 4]);
          // Il ne faut pas tomber par hasard sur un autre passage réel.
          if (departs.some((d0) => d0 + cumul[a] === faux)) { bon = false; break; }
          texteMonte = hm(faux);
          raison = `aucun bus ne passe à ${arrets[a]} à ${hm(faux)} (passages à ${departs.map((d0) => hm(d0 + cumul[a])).slice(0, 4).join(', ')}…)`;
        } else {
          arrivee = descend + marche - rng.int(3, 6);
          raison = `le bus de ${hm(monte)} n’arrive à ${arrets[b]} qu’à ${hm(descend)}${marche ? `, plus ${marche} minutes à pied : au plus tôt ${hm(descend + marche)}` : ''}, pas à ${hm(arrivee)}`;
        }
      }
      decl.push({ nom: gens[g], texte: `« J’ai pris le bus de ${texteMonte} à l’arrêt ${arrets[a]}, je suis descendu${['Léa', 'Sofia', 'Nadia', 'Emma', 'Inès', 'Chloé', 'Sarah', 'Laura', 'Fatima', 'Manon'].includes(gens[g]) ? 'e' : ''} à ${arrets[b]}${marche ? `, puis ${marche} minutes à pied jusqu’au bar` : ''}. J’y étais à ${hm(arrivee)}. »` });
    }
    if (!bon) continue;
    const fiche = `<table class="horaire"><tr><th>Arrêt</th><th>Temps depuis ${arrets[0]}</th></tr>${arrets.map((s, k) => `<tr><td>${s}</td><td class="mono">+${cumul[k]} min</td></tr>`).join('')}</table>`;
    return {
      titre: 'Les horaires', mode: 'choix',
      contexte: `Une bagarre a éclaté devant le bar « Le Relais » dans la soirée. Pour situer chacun, ${nGens} habitués racontent comment ils sont venus en bus, par la ligne 7. La fiche horaire permet de vérifier leurs dires : un seul raconte quelque chose d’impossible.`,
      tableau: `<p class="small" style="margin:0 0 6px">Départs de ${arrets[0]} : ${departs.map(hm).join(' · ')}</p>${fiche}<p class="tiny muted" style="margin:6px 0 0">Les bus sont à l’heure ce soir-là. Personne ne court, mais on peut arriver en retard ou traîner en route.</p>`,
      elements: decl.map((d) => ({ label: d.nom, texte: d.texte })),
      question: 'Qui ment ?',
      choix: gens.map((n) => ({ id: n, label: n })),
      answer: gens[menteur],
      astuce: 'Pour chaque déclaration : le bus passe-t-il vraiment à cet arrêt à cette heure ? Et peut-on être au bar aussi tôt ?',
      explication: `C’est ${gens[menteur]} : ${raison}. Les autres trajets sont possibles.`,
      _pas: 2,
    };
  }
  throw new Error('horaires : génération impossible');
}

// ─────────────────────────────── Expertise d'écriture ───────────────────────────────
// Une lettre anonyme et des échantillons d'écriture des suspects.
// On compare l'inclinaison, la taille, l'espacement, le soulignement et l'encre.

const MOTS_LETTRE = ['Je sais tout', 'Paye ou tu le regretteras', 'L’argent sous le banc', 'Tu vas le payer'];
const MOTS_ECHANT = ['Bon pour accord', 'Lu et approuvé', 'À rappeler', 'Pain, lait, café', 'Réunion à 14 h', 'Merci pour tout', 'Clés au voisin', 'Rendez-vous samedi'];
const ENCRES = [['bleue', '#2E4FA3'], ['noire', '#1E1E1E']];

function ecritureSvg(texte, f, signature) {
  const size = f.taille ? 25 : 18;
  const skew = [-12, 0, 12][f.pente];
  return `<svg viewBox="0 0 340 70" width="100%" role="img" aria-label="Échantillon d’écriture" style="display:block;border-radius:6px;background:#F4EFE3">
    <path d="M0 52H340" stroke="#9EB7D6" stroke-width=".8"/><path d="M0 26H340" stroke="#9EB7D6" stroke-width=".5" stroke-opacity=".6"/>
    <g transform="translate(14 48) skewX(${skew})"><text font-family="Caveat, 'Segoe Print', 'Comic Sans MS', cursive" font-size="${size}" letter-spacing="${f.espace ? 3.2 : 0}" fill="${ENCRES[f.encre][1]}">${texte}</text>
    ${f.souligne ? `<path d="M0 6H${Math.min(305, texte.length * size * (f.espace ? 0.55 : 0.43))}" stroke="${ENCRES[f.encre][1]}" stroke-width="1.6" stroke-linecap="round"/>` : ''}</g>
    ${signature ? `<text x="332" y="14" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="8" fill="#6B6152">${signature}</text>` : ''}</svg>`;
}

function ecriture(rng, diff) {
  const n = diff <= 1 ? 3 : diff <= 3 ? 4 : 5;
  const stylo = diff >= 4; // l'auteur a changé de stylo : l'encre ne compte pas
  const traits = ['pente', 'taille', 'espace', 'souligne', 'encre'];
  const valeurs = { pente: 3, taille: 2, espace: 2, souligne: 2, encre: 2 };
  const alea = () => Object.fromEntries(traits.map((t) => [t, rng.int(0, valeurs[t] - 1)]));
  const lettre = alea();
  const gens = rng.shuffle(PERSONNES).slice(0, n);
  const coupable = rng.int(0, n - 1);
  const ech = gens.map((_, k) => {
    if (k === coupable) {
      const f = { ...lettre };
      if (stylo) f.encre = 1 - lettre.encre; // piège : l'encre diffère, mais elle ne compte pas
      return f;
    }
    // Innocents : 1 différence (niveaux élevés) ou 2 (niveaux faibles) sur les traits qui comptent.
    const f = { ...lettre };
    const utiles = traits.filter((t) => !(stylo && t === 'encre'));
    const nDiff = diff <= 2 ? 2 : 1;
    for (const t of rng.shuffle(utiles).slice(0, nDiff)) { let v; do v = rng.int(0, valeurs[t] - 1); while (v === lettre[t]); f[t] = v; }
    if (stylo) f.encre = lettre.encre; // les innocents ont souvent la même encre : c'est le leurre
    return f;
  });
  const motsLettre = rng.pick(MOTS_LETTRE);
  const motsEch = rng.shuffle(MOTS_ECHANT);
  return {
    titre: 'Expertise d’écriture', mode: 'choix',
    contexte: `Une lettre anonyme de menaces est arrivée chez un commerçant. ${n} suspects ont donné un échantillon de leur écriture. Compare l’inclinaison, la taille, l’espacement des lettres${stylo ? ' et le soulignement. Le labo précise que l’auteur a utilisé un autre stylo : la couleur de l’encre ne prouve rien.' : ', le soulignement et la couleur de l’encre.'}`,
    figures: [{ titre: 'La lettre anonyme', svg: ecritureSvg(motsLettre, lettre, 'pièce à conviction') },
      ...gens.map((g, k) => ({ titre: `Échantillon de ${g}`, svg: ecritureSvg(motsEch[k], ech[k], g) }))],
    question: 'Qui a écrit la lettre ?',
    choix: gens.map((g) => ({ id: g, label: g })),
    answer: gens[coupable],
    astuce: 'Vérifie un trait à la fois pour tous les échantillons : d’abord l’inclinaison, puis la taille, puis l’espacement…',
    explication: `C’est ${gens[coupable]} : même inclinaison, même taille, même espacement et même soulignement que la lettre${stylo ? ' (seule l’encre change, et elle ne compte pas)' : ' et même encre'}. Chaque autre échantillon diffère sur au moins un trait.`,
    _pas: 2,
  };
}

export const GENERATORS2 = { plaque, photos, filature, butin, horaires, ecriture };
export const LABELS2 = { plaque: 'La plaque', photos: 'Les deux photos', filature: 'La filature', butin: 'Le butin', horaires: 'Les horaires', ecriture: 'Expertise d’écriture' };
