// Prototype « mission d'interception » de la zone de non-droit. Rien n'est branché au jeu.
// Un module unique, utilisé par la simulation (simulation.mjs) et par la démo jouable (copié dans la page).
//
// Version 2 (après la première simulation, beaucoup trop facile) :
// - moins d'agents que d'itinéraires à couvrir : il faut choisir ;
// - un guetteur qui voit un agent donne l'alerte : le lieutenant change d'itinéraire pour le moins gardé ;
// - la Recherche ne voit plus que les cases voisines (rayon 1) ;
// - réussite partielle seulement si le lieutenant a bien croisé un agent sans alerte.

export const MODELES = [
  ['E..#.E', '.#....', '.#L.#.', '...##.', '#.....', 'E.#..E'],
  ['E.#..E', '..#.#.', '.L....', '.##.#.', '......', 'E#..#E'],
  ['E...#E', '.##...', '...L#.', '.#....', '.#.##.', 'E....E'],
];
export const DIFF = {
  // Prudent : 2 agents, terrain connu (+15), fiable mais plafonné. Ambitieux : 4 agents, pas de lot de consolation.
  prudent: { nom: 'Prudent', routes: 2, guetteurs: 1, succes: 1, partiel: 0, bonus: 15, arrestation: false, priors: [0.6, 0.4], pions: ['R', 'P'] },
  standard: { nom: 'Standard', routes: 3, guetteurs: 1, succes: 2, partiel: 1, bonus: 0, arrestation: true, priors: [0.45, 0.33, 0.22], pions: ['R', 'I', 'P'] },
  ambitieux: { nom: 'Ambitieux', routes: 4, guetteurs: 2, succes: 3, partiel: 0, bonus: 0, arrestation: true, priors: [0.35, 0.28, 0.22, 0.15], pions: ['R', 'I', 'P', 'P'] },
};
export const REGLE = { base: 40, formation: 5, bonService: 10, double: 15, repere: 10, min: 15, max: 85, vueRecherche: 1, vueGuetteur: 2 };

/** Les pions d'une difficulté : identifiants stables (r, i, p1, p2). */
export function pions(difficulte) {
  let np = 0;
  return DIFF[difficulte].pions.map((s) => ({ id: s === 'P' ? `p${++np}` : s.toLowerCase(), s }));
}

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
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (rue(nx, ny) && !prev.has(k(nx, ny))) { prev.set(k(nx, ny), [x, y]); file.push([nx, ny]); } }
    }
    if (!prev.has(k(...but))) return null;
    const c = []; let p = but; while (p) { c.unshift(p); p = prev.get(k(...p)); }
    return c;
  };
  let routes = sorties.map((s) => chemin(s)).filter(Boolean);
  routes = routes.map((r) => [rnd(), r]).sort((a, b) => a[0] - b[0]).map(([, r]) => r).slice(0, d.routes);
  const priors = d.priors.slice();
  let u = rnd(), vrai = priors.length - 1;
  for (let i = 0; i < priors.length; i++) { u -= priors[i]; if (u <= 0) { vrai = i; break; } }
  const surRoute = new Set(routes.flat().map((c) => k(...c)));
  const libres = [];
  lignes.forEach((l, y) => l.forEach((c, x) => { if (c === '.' && !surRoute.has(k(x, y))) libres.push([x, y]); }));
  const guetteurs = [];
  for (const g of libres.map((g) => [rnd(), g]).sort((a, b) => a[0] - b[0]).map(([, g]) => g)) {
    if (guetteurs.length >= d.guetteurs) break;
    if (guetteurs.some((h) => Math.abs(h[0] - g[0]) + Math.abs(h[1] - g[1]) < 3)) continue;
    if ([...vueGuetteur(g, rue)].some((c) => surRoute.has(c))) guetteurs.push(g);
  }
  return { lignes, L, sorties, routes, priors, vrai, guetteurs, difficulte, rue, pions: pions(difficulte) };
}

/** Cases vues par un guetteur : en ligne droite, jusqu'à 2 cases, arrêtées par les bâtiments. */
export function vueGuetteur(g, rue) {
  const v = new Set();
  for (const [dx, dy] of DIRS) for (let i = 1; i <= REGLE.vueGuetteur; i++) { const x = g[0] + dx * i, y = g[1] + dy * i; if (!rue(x, y)) break; v.add(k(x, y)); }
  return v;
}

const memo = new WeakMap();
function caches(P) {
  let m = memo.get(P);
  if (!m) { m = { routes: P.routes.map((r) => new Set(r.slice(1).map((c) => k(...c)))), vues: P.guetteurs.map((g) => vueGuetteur(g, P.rue)) }; memo.set(P, m); }
  return m;
}

/** Ce que voit un agent Recherche posé en `pos` : sur chaque case voisine d'itinéraire, traces fraîches ou non. */
export function revele(P, pos) {
  const vues = new Map();
  if (pos) {
    const vrai = new Set(P.routes[P.vrai].map((c) => k(...c)));
    for (const r of P.routes) for (const c of r) {
      if (Math.abs(c[0] - pos[0]) + Math.abs(c[1] - pos[1]) <= REGLE.vueRecherche && !(c[0] === P.L[0] && c[1] === P.L[1])) vues.set(k(...c), vrai.has(k(...c)));
    }
  }
  const compatibles = P.routes.map((r, i) => i).filter((i) => {
    const s = new Set(P.routes[i].map((c) => k(...c)));
    for (const [c, frais] of vues) if (s.has(c) !== frais) return false;
    return true;
  });
  return { vues, compatibles };
}

/** Probabilités des itinéraires, compte tenu de ce que la Recherche a vu. */
export function posterieur(P, rev) {
  const tot = rev.compatibles.reduce((s, i) => s + P.priors[i], 0);
  return P.routes.map((_, i) => (rev.compatibles.includes(i) ? P.priors[i] / tot : 0));
}

/** Guetteurs neutralisés : un Intervention sur une case voisine. */
export function neutralises(P, place) {
  const i = place.i;
  return P.guetteurs.map((g) => !!i && Math.abs(g[0] - i[0]) + Math.abs(g[1] - i[1]) === 1);
}

/** Agents vus par un guetteur encore actif (ils donnent l'alerte). */
export function reperes(P, place) {
  const C = caches(P), neut = neutralises(P, place), vus = new Set();
  C.vues.forEach((v, j) => { if (!neut[j]) v.forEach((c) => vus.add(c)); });
  return P.pions.filter((p) => place[p.id] && vus.has(k(...place[p.id]))).map((p) => p.id);
}

const surRoute = (P, place, r) => { const s = caches(P).routes[r]; return P.pions.filter((p) => place[p.id] && s.has(k(...place[p.id]))); };

/** En cas d'alerte, le lieutenant prend l'itinéraire le moins gardé (à égalité, le plus probable). */
export function routeAlerte(P, place) {
  return P.routes.map((_, r) => r).sort((a, b) => surRoute(P, place, a).length - surRoute(P, place, b).length || P.priors[b] - P.priors[a])[0];
}

/** Chance (0-100) d'intercepter si le lieutenant passe par l'itinéraire r, avec le détail. */
export function chanceRoute(P, place, r, rev) {
  const dessus = surRoute(P, place, r);
  if (!dessus.length) return { p: 0, detail: [], dessus };
  const detail = [['Base', REGLE.base], ['Formation de ta zone', REGLE.formation]];
  if (DIFF[P.difficulte].bonus) detail.push(['Terrain connu (prudent)', DIFF[P.difficulte].bonus]);
  if (dessus.some((p) => p.s === 'P')) detail.push(['Proximité sur l\'itinéraire', REGLE.bonService]);
  if (dessus.length >= 2) detail.push(['Deux agents sur l\'itinéraire', REGLE.double]);
  if (rev && rev.vues.size && dessus.some((p) => p.id !== 'r' && rev.vues.has(k(...place[p.id])))) detail.push(['Case vue par la Recherche', REGLE.repere]);
  const brut = detail.reduce((s, [, v]) => s + v, 0);
  return { p: Math.max(REGLE.min, Math.min(REGLE.max, brut)), detail, dessus };
}

/** Ce qu'on peut prévoir avant 20:00 : alerte, itinéraires possibles, chances, succès attendus. */
export function prevision(P, place) {
  const rev = revele(P, place.r), d = DIFF[P.difficulte];
  const alerte = reperes(P, place);
  const post = posterieur(P, rev);
  const parRoute = P.routes.map((_, r) => chanceRoute(P, place, r, rev));
  const valeur = (c, sansAlerte) => c.p / 100 * d.succes + (c.dessus.length && sansAlerte ? (1 - c.p / 100) * d.partiel : 0);
  let esperance, chance;
  if (alerte.length) { const r = routeAlerte(P, place); chance = parRoute[r].p; esperance = valeur(parRoute[r], false); }
  else { chance = parRoute.reduce((s, c, r) => s + post[r] * c.p, 0); esperance = parRoute.reduce((s, c, r) => s + post[r] * valeur(c, true), 0); }
  return { rev, alerte, post, parRoute, chance, esperance };
}
export function esperance(P, place) { return prevision(P, place).esperance; }

/** Résolution à « 20:00 » : un seul dé pour l'action d'interception. */
export function resoudre(P, place, de) {
  const pr = prevision(P, place), d = DIFF[P.difficulte];
  const route = pr.alerte.length ? routeAlerte(P, place) : P.vrai;
  const c = pr.parRoute[route];
  const reussi = c.dessus.length > 0 && de < c.p;
  const succes = reussi ? d.succes : c.dessus.length && !pr.alerte.length ? d.partiel : 0;
  return { chance: c.p, de: Math.floor(de), reussi, couvert: c.dessus.length > 0, succes, arrestation: reussi && d.arrestation, detail: c.detail, route, alerte: pr.alerte, prevu: P.vrai };
}

export const cles = { k };
