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

let cacheVille = null;

/** Quartiers de la ville (indépendants du nombre de zones). */
export function ville(seed = 'delta') {
  if (cacheVille && cacheVille.seed === seed) return cacheVille;
  const rng = makeRng(`${seed}:ville`);
  const sites = [];
  const cols = 6, rows = 7;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sites.length >= 40) break;
      const x = (c + 0.5 + rng.float(-0.35, 0.35)) * (W / cols);
      const y = (r + 0.5 + rng.float(-0.35, 0.35)) * (H / rows);
      sites.push([x, y]);
    }
  }
  const cells = sites.map((p, i) => {
    let poly = [[0, 0], [W, 0], [W, H], [0, H]];
    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      const q = sites[j];
      poly = clip(poly, q[0] - p[0], q[1] - p[1], (q[0] ** 2 + q[1] ** 2 - p[0] ** 2 - p[1] ** 2) / 2);
    }
    return { i, site: p, poly: poly.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), nom: NOMS_QUARTIERS[i % NOMS_QUARTIERS.length] };
  });
  for (const c of cells) c.c = centroid(c.poly);
  // Voisinage : deux quartiers qui partagent un côté.
  const near = (a, b) => Math.abs(a[0] - b[0]) < 0.6 && Math.abs(a[1] - b[1]) < 0.6;
  const adj = cells.map(() => []);
  const edges = [];
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const shared = cells[i].poly.filter((p) => cells[j].poly.some((q) => near(p, q)));
      if (shared.length >= 2) { adj[i].push(j); adj[j].push(i); edges.push([i, j, shared[0], shared[1]]); }
    }
  }
  cacheVille = { seed, cells, adj, edges };
  return cacheVille;
}

/** Répartit les quartiers entre les zones (territoires d'un seul tenant, de tailles proches). */
export function territoires(seed, uids) {
  const v = ville(seed);
  const n = uids.length;
  const owner = new Array(v.cells.length).fill(-1);
  if (!n) return { ...v, owner, zones: [] };
  // Capitales éloignées les unes des autres (tirage déterministe).
  const rng = makeRng(`${seed}:terr:${n}`);
  const caps = [rng.int(0, v.cells.length - 1)];
  while (caps.length < Math.min(n, v.cells.length)) {
    let best = -1, bestD = -1;
    for (const c of v.cells) {
      if (caps.includes(c.i)) continue;
      const d = Math.min(...caps.map((k) => (v.cells[k].c[0] - c.c[0]) ** 2 + (v.cells[k].c[1] - c.c[1]) ** 2));
      if (d > bestD) { bestD = d; best = c.i; }
    }
    caps.push(best);
  }
  const order = uids.slice().sort((a, b) => hashString(a) - hashString(b));
  // Croissance équilibrée : à chaque étape, la zone la plus petite prend le quartier libre
  // voisin le plus proche de sa capitale.
  caps.forEach((c, k) => { owner[c] = k; });
  const taille = caps.map(() => 1);
  const dist2 = (i, k) => (v.cells[i].c[0] - v.cells[caps[k]].c[0]) ** 2 + (v.cells[i].c[1] - v.cells[caps[k]].c[1]) ** 2;
  for (let guard = 0; guard < v.cells.length * 4; guard++) {
    const candidats = caps.map((_, k) => {
      let best = -1;
      for (let i = 0; i < owner.length; i++) {
        if (owner[i] !== k) continue;
        for (const nb of v.adj[i]) if (owner[nb] === -1 && (best === -1 || dist2(nb, k) < dist2(best, k))) best = nb;
      }
      return best;
    });
    const possibles = caps.map((_, k) => k).filter((k) => candidats[k] !== -1);
    if (!possibles.length) break;
    const k = possibles.sort((x, y) => taille[x] - taille[y])[0];
    owner[candidats[k]] = k; taille[k]++;
  }
  for (let i = 0; i < owner.length; i++) if (owner[i] === -1) owner[i] = 0;
  const zones = order.map((uid, k) => {
    const mine = v.cells.filter((c) => owner[c.i] === k);
    const cx = mine.reduce((s, c) => s + c.c[0], 0) / (mine.length || 1);
    const cy = mine.reduce((s, c) => s + c.c[1], 0) / (mine.length || 1);
    return { uid, k, quartiers: mine.map((c) => c.i), capitale: caps[k], label: [cx, cy] };
  });
  return { ...v, owner, zones, order };
}
