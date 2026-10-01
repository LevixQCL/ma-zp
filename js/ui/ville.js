// Plan de la ville du District Delta : quartiers (diagramme de Voronoï), fleuve,
// boulevard, voie ferrée et repères. Chaque zone reçoit un territoire de quartiers voisins.
import { makeRng, hashString } from '../engine/rng.js';

export const W = 360;
export const H = 440;

const NOMS_QUARTIERS = [
  'Les Glacis', 'Bas-Delta', 'L’Écluse', 'Vieux Port', 'Quartier Gare', 'Le Plateau', 'Rive Canal', 'Hauts-Prés',
  'Faubourg Saint-Roch', 'Cité Jardin', 'Zoning Nord', 'Bois-Delta', 'Les Tanneurs', 'Grand-Place', 'Les Filatures',
  'Champ de Foire', 'La Briqueterie', 'Mont-Rouge', 'Les Moulins', 'Quai des Brumes', 'Petit-Pont', 'Les Casernes',
  'Val-Fleuri', 'Porte Sud', 'Les Chartreux', 'Cité Nouvelle', 'Le Béguinage', 'Terrils', 'La Houillère',
  'Place des Martyrs', 'Les Aulnes', 'Pré-Fleuri', 'Le Marais', 'Quartier Stade', 'Cour des Halles', 'Les Charmilles',
  'Haut-Delta', 'Les Hayettes', 'Saint-Ghislain-Haut', 'Les Viviers',
];

function clip(poly, nx, ny, c) {
  // Garde la partie du polygone où nx*x + ny*y <= c.
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = nx * p[0] + ny * p[1] - c, dq = nx * q[0] + ny * q[1] - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

function centroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    const f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  a /= 2;
  return a ? [cx / (6 * a), cy / (6 * a)] : poly[0];
}

// Le monde est plus grand que le district : le district s'étend quand des zones arrivent,
// sans jamais redistribuer les territoires existants (la carte « dézoome »).
export const WW = W * 2;
export const HH = H * 2;
const TAILLE = 6; // quartiers par zone

const cacheVille = new Map();
const COLS = 12, ROWS = 14;
const MAX_ANNEAUX = 12;

/**
 * Quartiers du monde. `anneaux` : couronnes de quartiers ajoutées autour du monde de base
 * quand les zones sont trop nombreuses pour y tenir (au-delà d'environ 25 zones). Le monde de base
 * ne change pas : mêmes quartiers, mêmes numéros, mêmes noms ; les nouveaux quartiers viennent après.
 */
export function ville(seed = 'delta', anneaux = 0) {
  const cle = `${seed}:${anneaux}`;
  if (cacheVille.has(cle)) return cacheVille.get(cle);
  const rng = makeRng(`${seed}:monde`);
  const sites = [];
  const cols = COLS, rows = ROWS;
  const cw = WW / cols, ch = HH / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5 + rng.float(-0.35, 0.35)) * cw;
      const y = (r + 0.5 + rng.float(-0.35, 0.35)) * ch;
      sites.push([x, y]);
    }
  }
  const noms = rng.shuffle(NOMS_QUARTIERS);
  const nBase = sites.length;
  // Couronnes supplémentaires, l'une après l'autre (chaque quartier a son propre tirage : stable d'une taille à l'autre).
  for (let a = 1; a <= anneaux; a++) {
    for (let r = -a; r < rows + a; r++) {
      for (let c = -a; c < cols + a; c++) {
        if (Math.max(-r, -c, r - (rows - 1), c - (cols - 1)) !== a) continue;
        const rr = makeRng(`${seed}:monde:${r}:${c}`);
        sites.push([(c + 0.5 + rr.float(-0.35, 0.35)) * cw, (r + 0.5 + rr.float(-0.35, 0.35)) * ch]);
      }
    }
  }
  const box = [-anneaux * cw, -anneaux * ch, WW + anneaux * cw, HH + anneaux * ch];
  const cells = sites.map((p, i) => {
    let poly = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      const q = sites[j];
      if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 > (3 * WW / cols) ** 2) continue; // voisins lointains : sans effet
      poly = clip(poly, q[0] - p[0], q[1] - p[1], (q[0] ** 2 + q[1] ** 2 - p[0] ** 2 - p[1] ** 2) / 2);
    }
    return { i, site: p, poly: poly.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), nom: noms[i % noms.length] };
  });
  for (const c of cells) c.c = centroid(c.poly);
  // Voisinage : deux quartiers qui partagent un côté.
  const near = (a, b) => Math.abs(a[0] - b[0]) < 0.6 && Math.abs(a[1] - b[1]) < 0.6;
  const adj = cells.map(() => []);
  const edges = [];
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if ((cells[i].site[0] - cells[j].site[0]) ** 2 + (cells[i].site[1] - cells[j].site[1]) ** 2 > (2.5 * WW / cols) ** 2) continue;
      const shared = cells[i].poly.filter((p) => cells[j].poly.some((q) => near(p, q)));
      if (shared.length >= 2) { adj[i].push(j); adj[j].push(i); edges.push([i, j, shared[0], shared[1]]); }
    }
  }
  const suff = ['Nord', 'Sud', 'Est', 'Ouest', 'Haut'];
  const nommer = (r) => (r < noms.length ? noms[r] : `${noms[r % noms.length]} ${suff[Math.floor(r / noms.length) - 1] || 'Bas'}`.trim());
  let d0, centre;
  if (!anneaux) {
    // Ordre d'urbanisation : du centre vers la périphérie, avec un peu d'irrégularité.
    const bruit = makeRng(`${seed}:urbanisation`);
    d0 = cells.map((c) => Math.hypot(c.c[0] - WW / 2, c.c[1] - HH / 2) * (1 + bruit.float(-0.12, 0.12)));
    centre = cells.map((c) => c.i).sort((a, b) => d0[a] - d0[b]);
    // Noms : les plus connus au centre, puis « Nord », « Sud »… en périphérie.
    centre.forEach((i, r) => { cells[i].nom = nommer(r); });
  } else {
    // Monde agrandi : le monde de base garde son ordre et ses noms ; les couronnes viennent ensuite.
    const base = ville(seed, 0);
    d0 = cells.map((c, i) => (i < nBase ? base.d0[i] : Math.hypot(c.c[0] - WW / 2, c.c[1] - HH / 2)));
    for (let i = 0; i < nBase; i++) cells[i].nom = base.cells[i].nom;
    const extras = cells.slice(nBase).map((c) => c.i).sort((a, b) => d0[a] - d0[b]);
    extras.forEach((i, r) => { cells[i].nom = nommer(nBase + r); });
    centre = [...base.centre, ...extras];
  }
  const v = { seed, anneaux, cells, adj, edges, centre, d0, box, nBase };
  cacheVille.set(cle, v);
  return v;
}

/**
 * Zone de non-droit : le quartier le plus central (le Cœur) et l'anneau de ses voisins.
 * Personne ne les possède ; toutes les zones peuvent y envoyer des agents pour les reprendre.
 */
export function nonDroit(seed = 'delta') {
  const v = ville(seed);
  const coeur = v.centre[0];
  return { coeur, anneau: v.adj[coeur].slice().sort((a, b) => a - b), cells: [coeur, ...v.adj[coeur].slice().sort((a, b) => a - b)] };
}

/** Ordre d'arrivée des zones : il fixe leur place sur la carte, une fois pour toutes. */
export function ordreArrivee(zones) {
  return zones.slice().sort((a, b) => ((a.arrivee || 0) - (b.arrivee || 0)) || (hashString(a.uid) - hashString(b.uid))).map((z) => z.uid);
}

/**
 * Territoires : chaque zone, dans l'ordre d'arrivée, prend un bloc de quartiers libres
 * au plus près du centre (autour de la zone de non-droit, qui occupe le cœur de la ville). Une nouvelle zone s'ajoute en bordure sans rien déplacer.
 */
function territoiresDans(seed, zones, anneaux, fixes = {}) {
  const v = ville(seed, anneaux);
  const owner = new Array(v.cells.length).fill(-1);
  // Le centre est réservé à la zone de non-droit (−2) : les zones s'installent autour.
  const nd = nonDroit(seed);
  for (const i of nd.cells) owner[i] = -2;
  const order = ordreArrivee(zones);
  // Zones déjà installées dans le monde de base : elles gardent exactement leurs quartiers.
  order.forEach((uid, k) => { for (const i of (fixes[uid] && fixes[uid].quartiers) || []) owner[i] = k; });
  const libres = (i) => owner[i] === -1;
  const assez = (start) => { // au moins TAILLE quartiers libres d'un seul tenant autour de `start`
    const vu = new Set([start]), file = [start];
    while (file.length && vu.size < TAILLE) { const i = file.shift(); for (const nb of v.adj[i]) if (libres(nb) && !vu.has(nb)) { vu.add(nb); file.push(nb); } }
    return vu.size >= TAILLE;
  };
  const out = [];
  order.forEach((uid, k) => {
    if (fixes[uid]) {
      const mine = fixes[uid].quartiers;
      out.push({ uid, k, quartiers: mine, capitale: fixes[uid].capitale, label: [mine.reduce((s, i) => s + v.cells[i].c[0], 0) / mine.length, mine.reduce((s, i) => s + v.cells[i].c[1], 0) / mine.length] });
      return;
    }
    const cap = v.centre.find((i) => libres(i) && assez(i)) ?? v.centre.find(libres);
    if (cap === undefined) { out.push({ uid, k, quartiers: [], capitale: 0, label: [WW / 2, HH / 2] }); return; }
    owner[cap] = k;
    const mine = [cap];
    const cc = v.cells[cap].c;
    while (mine.length < TAILLE) {
      let best = -1, bestS = Infinity;
      for (const i of mine) for (const nb of v.adj[i]) {
        if (!libres(nb)) continue;
        const c = v.cells[nb].c;
        const sc = Math.hypot(c[0] - cc[0], c[1] - cc[1]) + 0.4 * v.d0[nb];
        if (sc < bestS) { bestS = sc; best = nb; }
      }
      if (best === -1) break;
      owner[best] = k; mine.push(best);
    }
    const cx = mine.reduce((s, i) => s + v.cells[i].c[0], 0) / mine.length;
    const cy = mine.reduce((s, i) => s + v.cells[i].c[1], 0) / mine.length;
    out.push({ uid, k, quartiers: mine, capitale: cap, label: [cx, cy] });
  });
  return { ...v, owner, zones: out, order, nd };
}

const cacheTerr = new Map();
/**
 * Territoires de toutes les zones. Tant que tout le monde tient dans le monde de base, rien ne change ;
 * au-delà, le monde s'agrandit d'une couronne à la fois, juste assez pour que chaque zone ait ses quartiers.
 */
export function territoires(seed, zones) {
  const cle = `${seed}|${ordreArrivee(zones).join(',')}`;
  if (cacheTerr.has(cle)) return cacheTerr.get(cle);
  let t = territoiresDans(seed, zones, 0);
  if (!t.zones.every((tz) => tz.quartiers.length >= TAILLE)) {
    // Les zones qui tiennent dans le monde de base n'en bougent pas ; les suivantes s'installent sur les couronnes.
    const fixes = {};
    for (const tz of t.zones) if (tz.quartiers.length >= TAILLE) fixes[tz.uid] = { quartiers: tz.quartiers, capitale: tz.capitale };
    for (let a = 1; a <= MAX_ANNEAUX; a++) {
      t = territoiresDans(seed, zones, a, fixes);
      if (t.zones.every((tz) => tz.quartiers.length >= TAILLE)) break;
    }
  }
  if (cacheTerr.size > 20) cacheTerr.clear();
  cacheTerr.set(cle, t);
  return t;
}
