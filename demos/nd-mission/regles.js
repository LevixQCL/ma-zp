// Prototype « mission d'interception » de la zone de non-droit. Rien n'est branché au jeu.
// Un module unique, utilisé par la simulation (simulation.mjs) et par la démo jouable (copié dans la page).
//
// Version 3 (après l'analyse du 12/10) : plus de dé caché. Le seul hasard est l'itinéraire de Mo Vélo, affiché en %.
// - Un itinéraire est BLOQUÉ si la force des policiers posés dessus atteint la résistance de Mo Vélo (2, il est en scooter).
//   Force d'un policier : 1, +1 pour la Proximité (spécialiste du barrage), +1 si la formation de ta zone est bonne.
// - Chance d'arrestation = somme des % des itinéraires bloqués. Rien d'autre.
// - Un policier sur une case vue par un guetteur est REPÉRÉ : Mo Vélo le contourne, il ne compte pas.
//   Un Intervention posé à côté d'un guetteur le neutralise (plus de cases vues).
// - La Recherche fait UN repérage : posée sur une case, elle dit si Mo Vélo passera par là. Ensuite elle ne bouge plus.
//   Si elle est sur une case vue par un guetteur, elle n'apprend rien.
// - v3b : six sorties, des guetteurs postés aux carrefours (après la 1re simulation v3, trop facile).

// 6 × 6 : '#' immeuble, 'E' sortie, 'L' Mo Vélo. Six sorties par plan (quatre coins et deux au milieu d'un bord).
export const MODELES = [
  ['E..#.E', '.#....', 'E#L.#.', '...##E', '#.....', 'E.#..E'],
  ['E.#..E', '..#.#.', '.L...E', '.##.#.', 'E.....', '.#.E#E'],
  ['E...#E', '.##...', '...L#E', '.#....', 'E#.##.', '.E...E'],
];
export const DIFF = {
  prudent: { nom: 'Prudent', resistance: 2, routes: 3, guetteurs: 1, succes: 1, partiel: 0, arrestation: false, pions: ['R', 'P'] },
  standard: { nom: 'Standard', resistance: 3, routes: 4, guetteurs: 1, succes: 2, partiel: 1, arrestation: true, pions: ['R', 'I', 'P'] },
  ambitieux: { nom: 'Ambitieux', resistance: 3, routes: 5, guetteurs: 2, succes: 3, partiel: 1, arrestation: true, pions: ['R', 'I', 'P', 'P'] },
};
const PRIORS = [0.32, 0.24, 0.18, 0.14, 0.12];
export const RESISTANCE = 2;

/** Les pions d'une difficulté : identifiants stables (r, i, p1, p2). */
export function pions(difficulte) {
  let np = 0;
  return DIFF[difficulte].pions.map((s) => ({ id: s === 'P' ? `p${++np}` : s.toLowerCase(), s }));
}
/** Force d'un policier au barrage (la Recherche ne barre pas). */
export function force(s, formationBonne) { return s === 'R' ? 0 : 1 + (s === 'P' ? 1 : 0) + (formationBonne ? 1 : 0); }

// Hasard reproductible
export function graine(n) { let s = n >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const k = (x, y) => `${x},${y}`;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Fabrique un plateau : modèle, miroirs, itinéraires (plus court chemin vers chaque sortie), guetteurs, itinéraire réel. */
export function plateau(difficulte, rnd) {
  const d = DIFF[difficulte];
  let lignes = MODELES[Math.floor(rnd() * MODELES.length)].map((l) => l.split(''));
  if (rnd() < 0.5) lignes = lignes.map((l) => l.slice().reverse());
  if (rnd() < 0.5) lignes = lignes.slice().reverse();
  const N = 6, rue = (x, y) => x >= 0 && y >= 0 && x < N && y < N && lignes[y][x] !== '#';
  let L = null; const sorties = [];
  lignes.forEach((l, y) => l.forEach((c, x) => { if (c === 'L') L = [x, y]; if (c === 'E') sorties.push([x, y]); }));
  const chemin = (but) => {
    const prev = new Map([[k(...L), null]]), file = [L];
    while (file.length) {
      const [x, y] = file.shift();
      if (x === but[0] && y === but[1]) break;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!rue(nx, ny) || prev.has(k(nx, ny))) continue;
        if (lignes[ny][nx] === 'E' && (nx !== but[0] || ny !== but[1])) continue; // on ne traverse pas une autre sortie
        prev.set(k(nx, ny), [x, y]); file.push([nx, ny]);
      }
    }
    if (!prev.has(k(...but))) return null;
    const c = []; let p = but; while (p) { c.unshift(p); p = prev.get(k(...p)); }
    return c;
  };
  let routes = sorties.map((s) => chemin(s)).filter(Boolean);
  routes = routes.map((r) => [rnd(), r]).sort((a, b) => a[0] - b[0]).map(([, r]) => r).slice(0, d.routes);
  const priors = PRIORS.slice(0, routes.length);
  const tot = priors.reduce((a, b) => a + b, 0); for (let i = 0; i < priors.length; i++) priors[i] /= tot;
  let u = rnd(), vrai = priors.length - 1;
  for (let i = 0; i < priors.length; i++) { u -= priors[i]; if (u <= 0) { vrai = i; break; } }
  const surRoute = new Set(routes.flat().map((c) => k(...c)));
  const libres = [];
  lignes.forEach((l, y) => l.forEach((c, x) => { if (c === '.' && !surRoute.has(k(x, y))) libres.push([x, y]); }));
  // Les guetteurs surveillent les carrefours : on prend les postes qui voient le plus de cases d'itinéraires.
  const guetteurs = [], comptes = new Map();
  routes.forEach((r) => r.slice(1, -1).forEach((c) => comptes.set(k(...c), (comptes.get(k(...c)) || 0) + 1)));
  const postes = libres.map((g) => ({ g, v: [...vueGuetteur(g, rue)].reduce((s, c) => s + (comptes.get(c) || 0), 0) + rnd() * 0.9 })).sort((a, b) => b.v - a.v);
  for (const { g, v } of postes) {
    if (guetteurs.length >= d.guetteurs) break;
    if (v < 1 || guetteurs.some((h) => Math.abs(h[0] - g[0]) + Math.abs(h[1] - g[1]) < 3)) continue;
    guetteurs.push(g);
  }
  return { lignes, L, sorties, routes, priors, vrai, guetteurs, difficulte, rue, pions: pions(difficulte) };
}

/** Cases interdites aux policiers : la planque de Mo Vélo et les cases qui la touchent (ses hommes y veillent). */
export function interdite(P, c) { return Math.abs(c[0] - P.L[0]) + Math.abs(c[1] - P.L[1]) <= DIST_PLANQUE; }
export const DIST_PLANQUE = 1;

/** Cases vues par un guetteur : en ligne droite, jusqu'à 2 cases, arrêtées par les bâtiments. */
export function vueGuetteur(g, rue) {
  const v = new Set();
  for (const [dx, dy] of DIRS) for (let i = 1; i <= 2; i++) { const x = g[0] + dx * i, y = g[1] + dy * i; if (!rue(x, y)) break; v.add(k(x, y)); }
  return v;
}

/** Repérage : la Recherche posée sur `pos` dit si Mo Vélo passera par cette case. Les itinéraires qui ne collent pas tombent. */
export function revele(P, pos, vue) {
  if (!pos) return { pos: null, passe: null, restants: P.routes.map((_, i) => i), utile: false };
  if (vue && vue.has(k(...pos))) return { pos, passe: null, restants: P.routes.map((_, i) => i), utile: false, repere: true };
  const passePar = P.routes.map((r) => r.some((c) => c[0] === pos[0] && c[1] === pos[1]));
  const passe = passePar[P.vrai];
  const restants = P.routes.map((_, i) => i).filter((i) => passePar[i] === passe);
  return { pos, passe, restants, utile: restants.length < P.routes.length };
}
/** Ce qu'un repérage sur `pos` apprendrait, quel que soit le vrai itinéraire (pour l'aide « bonne case »). */
export function partage(P, pos) {
  const n = P.routes.filter((r) => r.some((c) => c[0] === pos[0] && c[1] === pos[1])).length;
  return n > 0 && n < P.routes.length;
}

/** Probabilités des itinéraires, compte tenu du repérage. */
export function posterieur(P, rev) {
  const tot = rev.restants.reduce((s, i) => s + P.priors[i], 0);
  return P.routes.map((_, i) => (rev.restants.includes(i) ? P.priors[i] / tot : 0));
}

/** Guetteurs neutralisés : un Intervention sur une case voisine. */
export function neutralises(P, place) {
  const i = place.i;
  return P.guetteurs.map((g) => !!i && Math.abs(g[0] - i[0]) + Math.abs(g[1] - i[1]) === 1);
}
/** Cases encore vues par un guetteur actif. */
export function casesVues(P, place) {
  const neut = neutralises(P, place), vus = new Set();
  P.guetteurs.forEach((g, j) => { if (!neut[j]) vueGuetteur(g, P.rue).forEach((c) => vus.add(c)); });
  return vus;
}

/** État de chaque itinéraire : force posée dessus (policiers non repérés), bloqué / freiné / ouvert. */
export function etat(P, place, formationBonne) {
  const vus = casesVues(P, place);
  const reperes = P.pions.filter((p) => p.s !== 'R' && place[p.id] && vus.has(k(...place[p.id]))).map((p) => p.id);
  const rev = revele(P, place.r, vus), post = posterieur(P, rev), d = DIFF[P.difficulte];
  const routes = P.routes.map((r, i) => {
    const cases = new Set(r.slice(1).map((c) => k(...c)));
    const dessus = P.pions.filter((p) => p.s !== 'R' && place[p.id] && cases.has(k(...place[p.id])) && !reperes.includes(p.id));
    const f = dessus.reduce((s, p) => s + force(p.s, formationBonne), 0);
    const statut = f >= d.resistance ? 'bloque' : f > 0 ? 'freine' : 'ouvert';
    return { i, force: f, dessus: dessus.map((p) => p.id), statut, proba: post[i], elimine: post[i] === 0 };
  });
  const chance = routes.reduce((s, r) => s + (r.statut === 'bloque' ? r.proba : 0), 0);
  const esperance = routes.reduce((s, r) => s + r.proba * (r.statut === 'bloque' ? d.succes : r.statut === 'freine' ? d.partiel : 0), 0);
  return { rev, post, routes, reperes, chance, esperance, vus };
}

/** Résolution à « 20:00 » : Mo Vélo prend son itinéraire (tiré au début, selon les % affichés). Aucun dé. */
export function resoudre(P, place, formationBonne) {
  const e = etat(P, place, formationBonne), d = DIFF[P.difficulte], r = e.routes[P.vrai];
  const succes = r.statut === 'bloque' ? d.succes : r.statut === 'freine' ? d.partiel : 0;
  return { route: P.vrai, statut: r.statut, force: r.force, chance: e.chance, succes, arrestation: r.statut === 'bloque' && d.arrestation, reperes: e.reperes, probaRoute: e.post[P.vrai] };
}

export const cles = { k };
