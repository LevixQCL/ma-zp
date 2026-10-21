// « Main courante de nuit » (calque Ma zone de la Carte, phase de test) : l'adjoint répartit les équipes sur les appels
// de la nuit (20 h → 2 h, 12 créneaux d'une demi-heure) ; le joueur corrige avec quelques ordres.
// Aucun hasard dans la résolution : les appels sont tirés d'une graine (zone, saison, tour) ; seule la gravité d'un
// appel « flou » est cachée au joueur jusqu'à la nuit. Phase de test : rien ici ne touche encore à la zone.
import { makeRng } from './rng.js';

export const MC = {
  creneaux: 12,
  // Vagues de la journée (heures avant l'échéance de 20 h) : appels révélés et ordres donnés.
  vagues: [{ avant: 12, h: 8, ordres: 2 }, { avant: 9, h: 11, ordres: 3 }, { avant: 6, h: 14, ordres: 4 }],
  fatigue: 2, // à partir de la 3e intervention, le résultat baisse d'un cran
  pts: { maitrise: 3, moyen: 1, deborde: -1, incident: -3, arretee: 4, reporte: -1 },
};
export const STATUTS = { maitrise: 'Maîtrisé', moyen: 'Moyen', deborde: 'Débordé', incident: 'Incident', arretee: 'Bande arrêtée', reporte: 'Reporté à demain' };
const PIRE = { maitrise: 'moyen', moyen: 'deborde', deborde: 'incident', incident: 'incident', arretee: 'moyen', reporte: 'reporte' };
const RATE = new Set(['moyen', 'deborde', 'incident']);

export const TYPES_APPELS = [
  { titre: 'Rixe à la sortie d’un café', tags: ['violence', 'ivresse'], g: 2, suite: true },
  { titre: 'Tapage nocturne', tags: ['médiation'], g: 1, suite: true },
  { titre: 'Accident avec blessé', tags: ['véhicule'], g: 2 },
  { titre: 'Différend de voisinage', tags: ['médiation'], g: 2, suite: true },
  { titre: 'Violences intrafamiliales', tags: ['violence', 'médiation'], g: 3, suite: true },
  { titre: 'Ivresse sur la voie publique', tags: ['ivresse'], g: 1 },
  { titre: 'Bande de cambrioleurs signalée', tags: ['bande'], g: 3 },
  { titre: 'Rodéo en scooter', tags: ['véhicule'], g: 1 },
  { titre: 'Bagarre devant un bar', tags: ['violence', 'ivresse'], g: 3, suite: true },
];

/** Vague en cours d'après l'heure (0 : matin, 1 : à partir de 11 h, 2 : à partir de 14 h). */
export function vagueEnCours(now, deadline) {
  const h = (deadline - now) / 3600000;
  return h > 9 ? 0 : h > 6 ? 1 : 2;
}
export const vagueDuCreneau = (s) => (s < 4 ? 0 : s < 8 ? 1 : 2);

/** Équipes de la nuit, tirées de la gestion : véhicules d'intervention, formations, garage. */
export function equipesDe(zone, { capitale, autre, vehicules = 4 } = {}) {
  const niv = zone.niveaux || {};
  const nCombis = Math.max(1, Math.min(3, Math.floor(vehicules / 2)));
  const out = [];
  for (let i = 0; i < nCombis; i++) out.push({ id: `C${i + 1}`, nom: `Combi ${i + 1}`, serv: 'Intervention', comp: (niv.intervention || 1) >= 2 || i === 0 ? ['violence', 'ivresse'] : ['violence'], base: capitale });
  out.push({ id: 'PA', nom: 'Patrouille A', serv: 'Proximité', comp: (niv.proximite || 1) >= 2 ? ['médiation', 'ivresse'] : ['médiation'], base: autre ?? capitale });
  out.push({ id: 'PB', nom: 'Patrouille B', serv: 'Proximité', comp: ['médiation'], base: capitale, moto: vehicules >= 3 });
  out.push({ id: 'K1', nom: 'Contrôle', serv: 'Roulage', comp: ['véhicule', 'bande'], base: capitale });
  if ((niv.roulage || 1) >= 3) out.push({ id: 'K2', nom: 'Contrôle 2', serv: 'Roulage', comp: ['véhicule', 'bande'], base: capitale });
  return out;
}
/** Équipe rappelée en heures supplémentaires (un ordre). */
export const rappelDe = (capitale) => ({ id: 'R1', nom: 'Rappel (heures sup.)', serv: 'Intervention', comp: ['violence', 'ivresse'], base: capitale, rappel: true });

/** Les appels de la nuit : 8 à 9, en grappes, révélés en trois vagues. Un sur trois est flou (gravité 1 ou 3). */
export function genererNuit(graine, cells) {
  const r = makeRng(graine).next, out = [];
  const pics = [1 + Math.floor(r() * 3), 5 + Math.floor(r() * 3), 9 + Math.floor(r() * 2)];
  const n = 8 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const pic = pics[i % 3], s = Math.max(0, Math.min(11, pic + Math.floor(r() * 3) - 1));
    const T = TYPES_APPELS[Math.floor(r() * TYPES_APPELS.length)];
    const flou = !T.tags.includes('bande') && r() < 0.35, gReel = flou ? (r() < 0.5 ? 1 : 3) : T.g;
    out.push({ id: `a${i}`, s, cell: cells[Math.floor(r() * cells.length)], titre: T.titre, tags: T.tags, g: T.g, flou, gReel, suite: !!T.suite, vague: vagueDuCreneau(s) });
  }
  out.sort((a, b) => a.s - b.s || a.id.localeCompare(b.id));
  return out;
}

/** Distances (en quartiers traversés) dans la zone, par les quartiers voisins. */
export function distancesZone(cells, adj) {
  const set = new Set(cells), d = {};
  for (const a of cells) {
    const m = { [a]: 0 }, f = [a];
    while (f.length) { const u = f.shift(); for (const v of adj[u] || []) if (set.has(v) && m[v] == null) { m[v] = m[u] + 1; f.push(v); } }
    d[a] = m;
  }
  return (a, b) => (a === b ? 0 : (d[a] && d[a][b] != null ? d[a][b] : 2));
}

/** Résultat d'une équipe sur un appel de gravité g0, arrivée avec `retard` créneaux. */
export function resultat(eq, appel, retard, g0) {
  const couvre = appel.tags.some((t) => eq.comp.includes(t));
  const g = g0 + Math.floor(retard / 2); // chaque heure d'attente aggrave d'un cran
  if (g > 3) return 'incident';
  if (appel.tags.includes('bande')) return eq.comp.includes('bande') && retard <= 1 ? 'arretee' : retard <= 1 ? 'deborde' : 'incident';
  if (couvre && retard <= 1) return 'maitrise';
  if (!couvre && g >= 3) return 'deborde';
  return 'moyen';
}
const duree = (g) => 2 + (g - 1);

/**
 * Joue la nuit avec un plan : `fixe` = { idAppel: idEquipe | 'attente', __rappel: true }, le reste par l'adjoint
 * (l'équipe qui arrive le plus tôt ; à une demi-heure près, une équipe formée et reposée).
 * `prevu` : les appels flous comptent comme gravité 2 (ce que le joueur peut prévoir). Mal réglé, un appel peut reprendre.
 */
export function jouerNuit(appels, equipes, { fixe = {}, connus = null, prevu = false, dist, capitale } = {}) {
  const E = [...equipes, rappelDe(capitale)].filter((e) => !e.rappel || fixe.__rappel).map((e) => ({ ...e, libre: 0, ou: e.base, occ: [], n: 0 }));
  const res = {}, file = appels.filter((a) => !connus || connus.has(a.id)).slice(), suites = [];
  for (let i = 0; i < file.length; i++) {
    const a = file[i], g0 = a.flou ? (prevu ? 2 : a.gReel) : a.g;
    const arrivee = (e) => Math.max(a.s, e.libre) + (e.moto ? Math.floor(dist(e.ou, a.cell) / 2) : dist(e.ou, a.cell));
    const ordre = fixe[a.id];
    let eq = null;
    if (ordre === 'attente') eq = null;
    else if (ordre) eq = E.find((e) => e.id === ordre) || null;
    else {
      const t0 = Math.min(...E.map(arrivee)), forme = (e) => a.tags.some((t) => e.comp.includes(t));
      eq = E.filter((e) => arrivee(e) <= t0 + 1).sort((x, y) => (forme(y) - forme(x)) || ((x.n >= MC.fatigue) - (y.n >= MC.fatigue)) || arrivee(x) - arrivee(y) || x.id.localeCompare(y.id))[0];
    }
    let st, r;
    if (!eq) { st = g0 >= 3 || a.tags.includes('bande') ? 'incident' : 'reporte'; r = { eq: null, statut: st, pts: MC.pts[st], g: g0 }; }
    else {
      const arr = arrivee(eq), retard = arr - a.s;
      st = resultat(eq, a, retard, g0);
      const fatigue = eq.n >= MC.fatigue;
      if (fatigue) st = PIRE[st];
      eq.n++;
      r = { eq: eq.id, arr, retard, statut: st, pts: MC.pts[st], fatigue, g: g0 };
      eq.occ.push([Math.max(a.s, eq.libre), arr + duree(g0), a.id]);
      eq.libre = arr + duree(g0); eq.ou = a.cell;
    }
    res[a.id] = r;
    if (a.suite && !a.parent && RATE.has(st) && a.s + 4 <= 11) {
      const s2 = { id: `${a.id}s`, s: a.s + 4, cell: a.cell, titre: `${a.titre} : ça reprend`, tags: a.tags, g: Math.min(3, g0 + 1), flou: false, suite: false, parent: a.id, vague: vagueDuCreneau(a.s + 4) };
      suites.push(s2);
      let j = i + 1; while (j < file.length && file[j].s <= s2.s) j++;
      file.splice(j, 0, s2);
    }
  }
  const pts = Object.values(res).reduce((s, x) => s + x.pts, 0);
  return { res, pts, suites, occ: Object.fromEntries(E.map((e) => [e.id, e.occ])) };
}
