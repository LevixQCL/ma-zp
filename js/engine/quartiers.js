// Quartiers : la criminalité de la zone est répartie sur ses quartiers.
// Chaque quartier a une « tension » (10 à 95). La criminalité de la zone est leur moyenne,
// si bien que le reste du moteur (incidents, IPZ, rapports) ne change pas.
//
// Le joueur peut envoyer des agents de Proximité en patrouille dans des quartiers précis ;
// ceux qui ne sont pas affectés patrouillent partout, comme avant.
// - Là où l'on concentre des agents, la tension baisse davantage (rendement décroissant).
// - Un « point chaud » est annoncé la veille : 2 agents sur place le désamorcent.
// - Trop d'agents au même endroit (4 et plus) : une partie de la délinquance se déplace
//   vers les quartiers voisins, y compris chez les zones voisines.

import { CONFIG } from '../config.js';
import { territoires } from '../ui/ville.js';
import { clamp, round1 } from './zone.js';

export const QUARTIERS = {
  derive: 1.6,            // hausse naturelle par tour (était 2.4 au niveau de la zone : une partie vient des points chauds)
  bruit: 1.5,
  diffusion: 0.07,        // la tension se diffuse vers les quartiers voisins
  pointChaudChance: 0.65, // probabilité d'un point chaud annoncé pour le lendemain
  pointChaudForce: [9, 14],
  agentsDesamorcer: 2,
  seuilDeplacement: 4,    // à partir de 4 agents au même endroit, la délinquance se déplace
  deplacementParAgent: 2, // tension poussée vers les voisins, par agent au-delà du seuil − 1
  seuilInquietude: 55,
};

export const POINTS_CHAUDS = [
  { titre: 'Rodéos urbains', texte: 'Des riverains signalent des rodéos en scooter tous les soirs.' },
  { titre: 'Deal de rue', texte: 'Un point de deal s’est installé près des commerces.' },
  { titre: 'Cambriolages en série', texte: 'Trois maisons visitées en deux jours, les habitants ont peur.' },
  { titre: 'Tapage et bagarres', texte: 'Un bar attire du monde jusqu’à l’aube, les bagarres se multiplient.' },
  { titre: 'Vols dans les voitures', texte: 'Vitres brisées et GPS volés sur le parking.' },
  { titre: 'Squat qui dégénère', texte: 'Un bâtiment abandonné sert de squat, le voisinage se plaint.' },
  { titre: 'Harcèlement à l’arrêt de bus', texte: 'Des jeunes filles se font importuner à la sortie des cours.' },
  { titre: 'Dépôts clandestins', texte: 'Des déchets s’amoncellent, le quartier se sent abandonné.' },
];

/** Niveau lisible d'une tension. */
export function niveauTension(t) {
  if (t >= 70) return { id: 'chaud', nom: 'chaud', couleur: '#E0625A' };
  if (t >= 55) return { id: 'tendu', nom: 'tendu', couleur: '#E8913A' };
  if (t >= 45) return { id: 'surveille', nom: 'à surveiller', couleur: '#E2C04A' };
  return { id: 'calme', nom: 'calme', couleur: '#4FBF8A' };
}

let cache = null;
/** Carte des quartiers : territoire de chaque zone et voisinages (y compris d'une zone à l'autre). */
export function carteQuartiers(state) {
  const zones = Object.values(state.zones || {});
  const cle = zones.map((z) => `${z.uid}:${z.arrivee || 0}`).sort().join('|');
  if (cache && cache.cle === cle) return cache;
  const T = territoires(CONFIG.seed, zones);
  const deZone = {};
  for (const tz of T.zones) deZone[tz.uid] = tz.quartiers.slice();
  const proprio = (i) => (T.owner[i] >= 0 ? T.order[T.owner[i]] : null);
  const nomDe = (i) => T.cells[i].nom;
  cache = { cle, deZone, adj: T.adj, proprio, nomDe, capitale: Object.fromEntries(T.zones.map((tz) => [tz.uid, tz.capitale])) };
  return cache;
}

/** Quartiers de la zone voisine qui touchent les miens (visibles sur ma carte). */
export function quartiersFrontaliers(state, uid) {
  const c = carteQuartiers(state);
  const mine = new Set(c.deZone[uid] || []);
  const out = new Set();
  for (const i of mine) for (const nb of c.adj[i]) { const p = c.proprio(nb); if (p && p !== uid && state.zones[p]) out.add(nb); }
  return [...out];
}

/** Tension des quartiers d'une zone, sans rien modifier (pour l'affichage). */
export function tensionsDe(state, z) {
  const cells = carteQuartiers(state).deZone[z.uid] || [];
  const q = z.quartiers && typeof z.quartiers === 'object' ? z.quartiers : {};
  const out = {};
  cells.forEach((i, k) => { const v = Number(q[i]); out[i] = Number.isFinite(v) ? v : clamp(round1(z.criminalite + [6, -4, 2, -6, 4, -2][k % 6]), 10, 95); });
  return out;
}

/** Crée ou complète la tension des quartiers d'une zone (au niveau de sa criminalité). */
export function assurerQuartiers(state, z) {
  const c = carteQuartiers(state);
  const cells = c.deZone[z.uid] || [];
  const q = z.quartiers && typeof z.quartiers === 'object' ? z.quartiers : {};
  const out = {};
  cells.forEach((i, k) => {
    const v = Number(q[i]);
    // Première fois : un peu de relief autour de la criminalité de la zone, déterministe.
    out[i] = Number.isFinite(v) ? v : clamp(round1(z.criminalite + [6, -4, 2, -6, 4, -2][k % 6]), 10, 95);
  });
  z.quartiers = out;
  // Point chaud sur un quartier qui n'est plus le sien : oublié.
  if (z.pointChaud && !(z.pointChaud.cell in out)) z.pointChaud = null;
  return out;
}

const moyenne = (q) => { const v = Object.values(q); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 50; };

/** Patrouilles valides d'après les ordres : quartiers de la zone, total plafonné aux agents de Proximité. */
export function lirePatrouilles(state, z, raw, maxAgents) {
  const cells = new Set((carteQuartiers(state).deZone[z.uid] || []).map(String));
  const out = {};
  let total = 0;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      if (!cells.has(String(k))) continue;
      const n = clamp(Math.floor(Number(v) || 0), 0, 12);
      if (n > 0) { out[k] = n; total += n; }
    }
  }
  // Trop d'agents demandés (Proximité réduite par une opération, par exemple) : on retire d'abord là où il y en a le plus.
  while (total > maxAgents && total > 0) {
    // … en protégeant le point chaud du jour, qu'on retire en dernier.
    const pc = z.pointChaud && String(z.pointChaud.cell);
    const k = Object.keys(out).sort((a, b) => ((a === pc) - (b === pc)) || out[b] - out[a])[0];
    out[k]--; total--; if (!out[k]) delete out[k];
  }
  return out;
}

/**
 * Tour de Proximité, quartier par quartier. Appelé à la place de l'ancienne ligne « criminalité ».
 * `critAvant` : criminalité de la zone au début du tour, pour répercuter sur les quartiers ce qui l'a
 * changée entre-temps (situation du jour, campagne de prévention…).
 * Renvoie le malus de satisfaction lié aux quartiers inquiets.
 */
export function tourQuartiers(state, z, { patrouilles, agentsProx, capProx, rng, zoneLabel }) {
  const c = carteQuartiers(state);
  const q = assurerQuartiers(state, z);
  const cells = Object.keys(q);
  const n = cells.length;
  if (!n) return 0;
  // 1. Ce qui a changé la criminalité ailleurs dans le moteur s'applique à tous les quartiers.
  const delta = z.criminalite - moyenne(q);
  if (Math.abs(delta) > 0.01) for (const k of cells) q[k] = clamp(q[k] + delta, 10, 95);

  // 2. Présence de la Proximité dans chaque quartier.
  const parAgent = agentsProx > 0 ? capProx / agentsProx : 0;
  const cibles = Object.values(patrouilles).reduce((s, x) => s + x, 0);
  const libre = Math.max(0, capProx - cibles * parAgent) / n;
  const egal = capProx / n;
  const eff = (p) => (p <= 2 * egal ? p : 2 * egal + (p - 2 * egal) * 0.5);
  const avant = { ...q };
  for (const k of cells) {
    const pres = libre + (patrouilles[k] || 0) * parAgent;
    q[k] += QUARTIERS.derive + rng.float(-QUARTIERS.bruit, QUARTIERS.bruit) - 0.6 * n * eff(pres);
  }

  // 3. Point chaud annoncé hier.
  const rapport = [];
  let satisf = 0;
  const pc = z.pointChaud;
  if (pc && pc.cell in q) {
    const nom = c.nomDe(Number(pc.cell));
    if ((patrouilles[pc.cell] || 0) >= QUARTIERS.agentsDesamorcer) {
      q[pc.cell] -= 3; satisf += 1;
      rapport.push(`Point chaud désamorcé à ${nom} (${pc.titre.toLowerCase()}) : patrouille sur place, +1 de satisfaction.`);
    } else {
      q[pc.cell] += pc.force;
      rapport.push(`Point chaud à ${nom} (${pc.titre.toLowerCase()}) : personne sur place, la tension monte (+${pc.force}).`);
    }
  }
  z.pointChaud = null;

  // 4. Déplacement de la délinquance : trop de monde au même endroit la pousse chez les voisins.
  for (const k of cells) {
    const a = patrouilles[k] || 0;
    if (a < QUARTIERS.seuilDeplacement) continue;
    const pousse = (a - QUARTIERS.seuilDeplacement + 1) * QUARTIERS.deplacementParAgent;
    const voisins = c.adj[Number(k)].filter((nb) => { const p = c.proprio(nb); return p && state.zones[p]; });
    if (!voisins.length) continue;
    const part = pousse / voisins.length;
    const chezAutres = new Set();
    for (const nb of voisins) {
      const p = c.proprio(nb);
      const zz = state.zones[p];
      const qq = p === z.uid ? q : assurerQuartiers(state, zz);
      qq[nb] = clamp((qq[nb] ?? 50) + part, 10, 95);
      if (p !== z.uid) {
        chezAutres.add(p);
        if (Array.isArray(zz.rapport)) zz.rapport.push(`${c.nomDe(nb)} : la délinquance chassée de ${c.nomDe(Number(k))} (${zoneLabel(z)}) déborde chez toi (+${round1(part)} de tension).`);
      }
    }
    rapport.push(`${a} agents à ${c.nomDe(Number(k))} : une partie de la délinquance se déplace vers les quartiers voisins${chezAutres.size ? ', jusque chez tes voisins' : ''}.`);
  }

  // 5. Diffusion : un quartier très tendu contamine ses voisins, un quartier calme les apaise.
  const lire = (i) => { const p = c.proprio(i); if (!p || !state.zones[p]) return null; return p === z.uid ? avant[i] : (state.zones[p].quartiers || {})[i]; };
  for (const k of cells) {
    const v = c.adj[Number(k)].map(lire).filter((x) => Number.isFinite(x));
    if (v.length) q[k] += QUARTIERS.diffusion * (v.reduce((s, x) => s + x, 0) / v.length - avant[k]);
  }
  for (const k of cells) q[k] = round1(clamp(q[k], 10, 95));
  z.criminalite = round1(moyenne(q));

  // 6. Quartiers inquiets : malus de satisfaction (au total, le même qu'avant pour une zone homogène).
  const malus = cells.reduce((s, k) => s + Math.max(0, q[k] - QUARTIERS.seuilInquietude) * 0.12, 0) / n;
  const chauds = cells.filter((k) => q[k] >= 70).sort((a, b) => q[b] - q[a]);
  if (chauds.length) rapport.push(`Quartier${chauds.length > 1 ? 's' : ''} sous tension : ${chauds.map((k) => `${c.nomDe(Number(k))} (${Math.round(q[k])})`).join(', ')}. Envoie des patrouilles depuis la Carte.`);
  const ciblesTxt = Object.entries(patrouilles).map(([k, a]) => `${c.nomDe(Number(k))} ${a}`).join(', ');
  if (ciblesTxt) rapport.push(`Patrouilles ciblées : ${ciblesTxt}.`);
  z.rapport.push(...rapport);
  return satisf - malus;
}

/** Point chaud annoncé pour le lendemain, dans un quartier plutôt tendu. */
export function annoncerPointChaud(state, z, rng) {
  const q = assurerQuartiers(state, z);
  const cells = Object.keys(q);
  if (!cells.length || !rng.chance(QUARTIERS.pointChaudChance)) { z.pointChaud = null; return; }
  const poids = cells.map((k) => Math.max(5, q[k] - 20));
  let r = rng.float(0, poids.reduce((s, x) => s + x, 0));
  let cell = cells[cells.length - 1];
  for (let i = 0; i < cells.length; i++) { r -= poids[i]; if (r <= 0) { cell = cells[i]; break; } }
  const p = rng.pick(POINTS_CHAUDS);
  z.pointChaud = { cell, titre: p.titre, texte: p.texte, force: rng.int(...QUARTIERS.pointChaudForce) };
}

/**
 * Prévision (sans hasard ni diffusion) de la tension de chaque quartier ce soir, pour l'affichage.
 * Même calcul que tourQuartiers, étapes 2 à 4.
 */
export function prevoirTensions(state, z, { patrouilles = {}, agentsProx = 0, capProx = 0 } = {}) {
  const c = carteQuartiers(state);
  const q = { ...tensionsDe(state, z) };
  const cells = Object.keys(q);
  const n = cells.length;
  if (!n) return q;
  const parAgent = agentsProx > 0 ? capProx / agentsProx : 0;
  const cibles = Object.entries(patrouilles).filter(([k]) => k in q).reduce((s, [, x]) => s + x, 0);
  const libre = Math.max(0, capProx - cibles * parAgent) / n;
  const egal = capProx / n;
  const eff = (p) => (p <= 2 * egal ? p : 2 * egal + (p - 2 * egal) * 0.5);
  for (const k of cells) q[k] += QUARTIERS.derive - 0.6 * n * eff(libre + (patrouilles[k] || 0) * parAgent);
  const pc = z.pointChaud;
  if (pc && pc.cell in q) q[pc.cell] += (patrouilles[pc.cell] || 0) >= QUARTIERS.agentsDesamorcer ? -3 : pc.force;
  for (const k of cells) {
    const a = patrouilles[k] || 0;
    if (a < QUARTIERS.seuilDeplacement) continue;
    const voisins = c.adj[Number(k)].filter((nb) => nb in q || (c.proprio(nb) && state.zones[c.proprio(nb)]));
    const part = ((a - QUARTIERS.seuilDeplacement + 1) * QUARTIERS.deplacementParAgent) / (voisins.length || 1);
    for (const nb of voisins) if (nb in q) q[nb] += part;
  }
  for (const k of cells) q[k] = round1(clamp(q[k], 10, 95));
  return q;
}
