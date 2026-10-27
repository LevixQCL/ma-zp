// Quartiers : la criminalité de la zone est répartie sur ses quartiers.
// Chaque quartier a une « tension » (10 à 95). La criminalité de la zone est leur moyenne,
// si bien que le reste du moteur (incidents, IPZ, rapports) ne change pas.
//
// Saison 4 : plus de patrouilles à placer à la main. La Proximité patrouille partout ; chaque soir la tension
// monte un peu, la Proximité la fait baisser, et un quartier très tendu contamine ses voisins.

import { CONFIG } from '../config.js';
import { territoires } from '../ui/ville.js';
import { clamp, round1 } from './zone.js';

export const QUARTIERS = {
  derive: 1.6,            // hausse naturelle par tour (était 2.4 au niveau de la zone : une partie vient des points chauds)
  bruit: 1.5,
  diffusion: 0.07,        // la tension se diffuse vers les quartiers voisins
  seuilInquietude: 55,
};

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
  return out;
}

const moyenne = (q) => { const v = Object.values(q); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 50; };

/**
 * Tour de Proximité, quartier par quartier : la criminalité de la zone reste la moyenne de ses quartiers.
 * Renvoie le malus de satisfaction lié aux quartiers inquiets.
 */
export function tourQuartiers(state, z, { capProx, rng }) {
  const c = carteQuartiers(state);
  const q = assurerQuartiers(state, z);
  const cells = Object.keys(q);
  const n = cells.length;
  if (!n) return 0;
  // 1. Ce qui a changé la criminalité ailleurs dans le moteur s'applique à tous les quartiers.
  const delta = z.criminalite - moyenne(q);
  if (Math.abs(delta) > 0.01) for (const k of cells) q[k] = clamp(q[k] + delta, 10, 95);
  // 2. La Proximité patrouille partout.
  const pres = (Number(capProx) || 0) / n;
  const avant = { ...q };
  for (const k of cells) q[k] += QUARTIERS.derive + rng.float(-QUARTIERS.bruit, QUARTIERS.bruit) - 0.6 * n * pres;
  // 3. Diffusion : un quartier très tendu contamine ses voisins, un quartier calme les apaise.
  const lire = (i) => { const p = c.proprio(i); if (!p || !state.zones[p]) return null; return p === z.uid ? avant[i] : (state.zones[p].quartiers || {})[i]; };
  for (const k of cells) {
    const v = c.adj[Number(k)].map(lire).filter((x) => Number.isFinite(x));
    if (v.length) q[k] += QUARTIERS.diffusion * (v.reduce((s, x) => s + x, 0) / v.length - avant[k]);
  }
  for (const k of cells) q[k] = round1(clamp(q[k], 10, 95));
  z.criminalite = round1(moyenne(q));
  // 4. Quartiers inquiets : malus de satisfaction.
  const malus = cells.reduce((s, k) => s + Math.max(0, q[k] - QUARTIERS.seuilInquietude) * 0.12, 0) / n;
  const chauds = cells.filter((k) => q[k] >= 70).sort((a, b) => q[b] - q[a]);
  if (chauds.length) z.rapport.push(`Quartier${chauds.length > 1 ? 's' : ''} sous tension : ${chauds.map((k) => `${c.nomDe(Number(k))} (${Math.round(q[k])})`).join(', ')}. Plus de Proximité les apaisera.`);
  return -malus;
}
