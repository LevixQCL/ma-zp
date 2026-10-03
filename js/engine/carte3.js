// Plan routier du district (affaires « dossier complet ») : de vraies rues, des ponts, des passerelles
// réservées aux vélos et aux piétons, une zone piétonne autour de la Grand-Place, et parfois des travaux.
// Le plan fait 880 × 900 unités ; une unité = 6 m (le district fait un peu plus de 5 km de large).
// Les temps de trajet suivent l'itinéraire le plus court par la route, selon le moyen de transport.
// Tout est déterministe : le même plan sert au moteur (alibis) et à l'écran (outil de mesure).

export const ECHELLE = 6; // mètres par unité du plan
/** Minutes par kilomètre, selon le moyen de transport (en ville). */
export const MODES = {
  moteur: { nom: 'Voiture ou deux-roues', court: 'voiture / 2-roues', minKm: 2, icone: '🚗' },
  velo: { nom: 'Vélo', court: 'vélo', minKm: 4, icone: '🚲' },
  pied: { nom: 'À pied', court: 'à pied', minKm: 12, icone: '🚶' },
};
export const CANAL_Y = 590; // au nord : rive nord ; au sud : rive sud

// Carrefours : 8 rangées × 7 colonnes, légèrement de travers comme dans une vraie ville.
const R = [
  [[30, 62], [172, 55], [300, 72], [422, 58], [560, 68], [700, 52], [850, 78]],
  [[30, 185], [165, 178], [292, 192], [415, 182], [552, 186], [690, 172], [850, 192]],
  [[30, 302], [170, 296], [288, 306], [430, 318], [562, 300], [702, 292], [850, 310]],
  [[30, 420], [160, 414], [300, 430], [420, 440], [556, 426], [706, 418], [850, 430]],
  [[30, 528], [170, 536], [300, 532], [420, 540], [546, 530], [690, 522], [850, 524]],
  [[30, 652], [175, 656], [305, 652], [420, 664], [546, 650], [680, 660], [850, 646]],
  [[30, 762], [160, 760], [298, 770], [430, 760], [560, 772], [692, 756], [850, 766]],
  [[30, 870], [170, 876], [290, 866], [420, 876], [556, 870], [700, 880], [850, 870]],
];
const id = (r, c) => `n${r}${c}`;
export const NOEUDS = {};
R.forEach((row, r) => row.forEach(([x, y], c) => { NOEUDS[id(r, c)] = { x, y }; }));
// Hors plan, à l'est : la route vers Haut-Delta (6 km de nationale).
NOEUDS.hd = { x: 1450, y: 646, horsPlan: true };

// Noms des rues : par rangée (est-ouest) et par colonne (nord-sud), avec la colonne ou la rangée où le nom change.
const NOMS_H = [
  [[0, 'Rue des Hauts-Prés'], [3, 'Chaussée du Zoning']],
  [[0, 'Boulevard du Nord']],
  [[0, 'Rue du Béguinage'], [2, 'Grand-Place'], [4, 'Rue des Tanneurs']],
  [[0, 'Rue des Martyrs'], [3, 'Rue de la Vente']],
  [[0, 'Boulevard du Canal']],
  [[0, 'Quai Sud']],
  [[0, 'Rue de la Gare'], [2, 'Rue des Moulins'], [4, 'Rue des Filatures']],
  [[0, 'Rue du Val-Fleuri'], [3, 'Rue de la Porte Sud']],
];
const NOMS_V = [
  [[0, 'Rue des Terrils'], [5, 'Rue de la Cité Jardin']],
  [[0, 'Avenue des Tilleuls'], [5, 'Rue du Quartier Gare']],
  [[0, 'Rue de la Station'], [4, 'Rue du Petit-Pont']],
  [[0, 'Rue de la Halle'], [5, 'Rue du Lavoir']],
  [[0, 'Rue Neuve'], [4, 'Pont Neuf'], [5, 'Avenue de la Porte Sud']],
  [[0, 'Rue du Zoning'], [4, 'Rue des Filatures']],
  [[0, 'Rue de l’Usine'], [5, 'Chaussée de Haut-Delta']],
];
const nomDe = (table, k, pos) => { let n = ''; for (const [d, x] of table[k]) if (pos >= d) n = x; return n; };

// Ponts sur le canal (rangée 4 → 5) : trois ponts routiers, deux passerelles (vélos et piétons).
export const PONTS = {
  1: { nom: 'Pont de la Gare', type: 'pont' },
  2: { nom: 'Passerelle du Petit-Pont', type: 'passerelle' },
  4: { nom: 'Pont Neuf', type: 'pont' },
  5: { nom: 'Passerelle des Filatures', type: 'passerelle' },
  6: { nom: 'Pont du Zoning', type: 'pont' },
};
// Zone piétonne de la Grand-Place (on y entre en voiture seulement par la rue de la Halle, au sud).
const PIETONS = new Set(['n22-n23', 'n23-n24', 'n13-n23']);
// Tronçons qui n'existent pas (terrils, gare de triage, grands îlots) : la ville n'est pas un damier.
const ABSENTS = new Set(['n10-n20', 'n04-n14', 'n15-n16', 'n25-n35', 'n50-n60', 'n61-n62', 'n62-n72', 'n73-n74', 'n35-n36']);
const BOULEVARDS = new Set([1, 4]); // rangées

export const TRONCONS = [];
const ajoute = (a, b, t) => {
  const k = `${a}-${b}`;
  if (ABSENTS.has(k)) return;
  TRONCONS.push({ k, a, b, ...t });
};
for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) {
  const k = `${id(r, c)}-${id(r, c + 1)}`;
  ajoute(id(r, c), id(r, c + 1), { type: PIETONS.has(k) ? 'pieton' : BOULEVARDS.has(r) ? 'bd' : 'rue', nom: nomDe(NOMS_H, r, c) });
}
for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
  const k = `${id(r, c)}-${id(r + 1, c)}`;
  if (r === 4) { const p = PONTS[c]; if (p) ajoute(id(r, c), id(r + 1, c), { type: p.type, nom: p.nom, pont: c }); continue; }
  ajoute(id(r, c), id(r + 1, c), { type: PIETONS.has(k) ? 'pieton' : 'rue', nom: nomDe(NOMS_V, c, r) });
}
// Diagonales.
for (const [a, b, nom] of [
  ['n00', 'n11', 'Chaussée de Bruxelles'], ['n11', 'n22', 'Chaussée de Bruxelles'],
  ['n24', 'n15', 'Avenue du Zoning'], ['n15', 'n06', 'Avenue du Zoning'],
  ['n54', 'n65', 'Route de la Porte Sud'], ['n65', 'n76', 'Route de la Porte Sud'],
  ['n20', 'n31', 'Chemin des Terrils'],
]) ajoute(a, b, { type: 'rue', nom });
ajoute('n56', 'hd', { type: 'nationale', nom: 'N90 vers Haut-Delta' });

const longueur = (t) => Math.hypot(NOEUDS[t.a].x - NOEUDS[t.b].x, NOEUDS[t.a].y - NOEUDS[t.b].y);
for (const t of TRONCONS) t.m = t.type === 'nationale' ? 6000 : Math.round(longueur(t) * ECHELLE);

/** Ponts routiers qui peuvent être fermés pour travaux (voitures et deux-roues seulement). */
export const TRAVAUX_POSSIBLES = ['n41-n51', 'n44-n54', 'n46-n56'];
export const nomTroncon = (k) => (TRONCONS.find((t) => t.k === k) || {}).nom || '';

/** Le moyen de transport peut-il emprunter ce tronçon ? */
function passe(t, mode, ferme) {
  if (mode === 'moteur') return t.type !== 'pieton' && t.type !== 'passerelle' && t.k !== ferme && t.demi !== ferme;
  return true;
}

// Lieux du plan (affaires, alibis). Chacun se raccroche au carrefour le plus proche de sa rive accessible en voiture.
export const LIEUX = {
  tanneurs: { nom: 'Dépôt des Tanneurs', x: 765, y: 238 },
  bijouterie: { nom: 'Bijouterie, Grand-Place', x: 462, y: 350 },
  portesud: { nom: 'Entrepôt de la Porte Sud', x: 628, y: 836 },
  beguinage: { nom: 'Restaurant du Béguinage', x: 98, y: 352 },
  filatures: { nom: 'Atelier des Filatures', x: 768, y: 708 },
  moulins: { nom: 'Musée des Moulins', x: 492, y: 716 },
  petitpont: { nom: 'Pharmacie du Petit-Pont', x: 352, y: 492 },
  hautspres: { nom: 'Chantier des Hauts-Prés', x: 112, y: 118 },
  ventes: { nom: 'Salle des ventes', x: 632, y: 360 },
  gare: { nom: 'Boutique de la gare', x: 226, y: 712 },
  palace: { nom: 'Cinéma Le Palace', x: 236, y: 246 },
  relais: { nom: 'Restaurant Le Relais', x: 628, y: 474 },
  minifoot: { nom: 'Salle de mini-foot', x: 96, y: 816 },
  usine: { nom: 'Usine du Zoning Nord', x: 788, y: 112 },
  parents: { nom: 'Chez ses parents, à Haut-Delta', x: 1450, y: 646, horsPlan: true },
  bowling: { nom: 'Bowling du Zoning', x: 790, y: 826 },
  anniversaire: { nom: 'Anniversaire chez un collègue', x: 364, y: 818 },
};
// Chaque lieu donne sur la rue la plus proche (de sa rive, ouverte aux voitures) : on y entre par le point de la rue en face.
const dansRive = (t, nord) => [t.a, t.b].every((n) => !NOEUDS[n].horsPlan && (NOEUDS[n].y < CANAL_Y) === nord);
for (const [k, l] of Object.entries(LIEUX)) {
  l.cle = k;
  if (l.horsPlan) { l.noeud = 'hd'; l.acces = 0; continue; }
  const nord = l.y < CANAL_Y;
  let best = null;
  for (const t of TRONCONS) {
    if (!passe(t, 'moteur', null) || !dansRive(t, nord)) continue;
    const A = NOEUDS[t.a], B = NOEUDS[t.b];
    const dx = B.x - A.x, dy = B.y - A.y, l2 = dx * dx + dy * dy;
    const u = Math.max(0.08, Math.min(0.92, ((l.x - A.x) * dx + (l.y - A.y) * dy) / l2));
    const px = A.x + u * dx, py = A.y + u * dy, d = Math.hypot(l.x - px, l.y - py);
    if (!best || d < best.d) best = { d, t, u, px, py };
  }
  // Le bâtiment est dessiné au bord de sa rue (à 14 unités, du côté où on l'avait mis).
  const ox = best.d ? (l.x - best.px) / best.d : 0, oy = best.d ? (l.y - best.py) / best.d : -1;
  l.x = Math.round(best.px + ox * 14); l.y = Math.round(best.py + oy * 14);
  l.noeud = `L:${k}`; l.acces = 14 * ECHELLE; l.rue = best.t.nom; l.porte = [best.px, best.py];
  NOEUDS[l.noeud] = { x: best.px, y: best.py, lieu: true };
  // Deux demi-tronçons relient le point de la rue aux deux carrefours (mêmes règles que la rue).
  for (const [n, f] of [[best.t.a, best.u], [best.t.b, 1 - best.u]]) {
    TRONCONS.push({ k: `${l.noeud}-${n}`, a: l.noeud, b: n, type: best.t.type, nom: best.t.nom, m: Math.round(best.t.m * f), demi: best.t.k });
  }
}

const voisins = {};
for (const t of TRONCONS) { (voisins[t.a] ||= []).push([t.b, t]); (voisins[t.b] ||= []).push([t.a, t]); }

const cacheIti = new Map();
/**
 * Itinéraire le plus court entre deux lieux (clés de LIEUX ou nœuds « n.. »), pour un moyen de transport.
 * `ferme` : tronçon fermé aux voitures (travaux). Renvoie { m, min, chemin: [[x, y], …], troncons: [k…] }.
 */
export function itineraire(a, b, mode = 'moteur', ferme = null) {
  const key = `${a}|${b}|${mode}|${ferme}`;
  if (cacheIti.has(key)) return cacheIti.get(key);
  const A = LIEUX[a] || (NOEUDS[a] && { noeud: a, acces: 0, x: NOEUDS[a].x, y: NOEUDS[a].y });
  const B = LIEUX[b] || (NOEUDS[b] && { noeud: b, acces: 0, x: NOEUDS[b].x, y: NOEUDS[b].y });
  if (!A || !B) return null;
  const dist = { [A.noeud]: 0 }, prec = {}, vu = new Set();
  for (;;) {
    let u = null, du = Infinity;
    for (const [n, d] of Object.entries(dist)) if (!vu.has(n) && d < du) { du = d; u = n; }
    if (u === null || u === B.noeud) break;
    vu.add(u);
    for (const [v, t] of voisins[u] || []) {
      if (!passe(t, mode, ferme)) continue;
      const nd = du + t.m;
      if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prec[v] = [u, t.k]; }
    }
  }
  if (dist[B.noeud] === undefined) { cacheIti.set(key, null); return null; }
  const noeuds = [B.noeud], troncons = [];
  while (noeuds[0] !== A.noeud) { const [p, k] = prec[noeuds[0]]; troncons.unshift(k); noeuds.unshift(p); }
  const m = dist[B.noeud] + A.acces + B.acces;
  const chemin = [[A.x, A.y], ...noeuds.map((n) => [NOEUDS[n].x, NOEUDS[n].y]), [B.x, B.y]];
  const res = { m, min: Math.max(1, Math.ceil((m / 1000) * MODES[mode].minKm)), chemin, troncons };
  cacheIti.set(key, res);
  return res;
}
/** Minutes de trajet (au plus court) entre deux lieux, pour un moyen de transport. */
export const minutes = (a, b, mode, ferme) => { const r = itineraire(a, b, mode, ferme); return r ? r.min : null; };
/** « 2,4 km » ou « 850 m ». */
export const fmtDist = (m) => (m >= 1000 ? `${(Math.round(m / 100) / 10).toString().replace('.', ',')} km` : `${Math.round(m / 10) * 10} m`);
