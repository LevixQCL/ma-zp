// Le central en une ligne, pour l'HP : ce qui attend maintenant, sinon les points du jour.
// Lecture seule (n'enregistre rien) et mise en cache à la minute : l'HP peut l'appeler à chaque affichage.
import { S, myZone } from './common.js';
import { carteQuartiers } from '../engine/quartiers.js';
import { vehiculesDisponibles } from '../engine/zone.js';
import { CENTRAL, equipesCentral, genererJournee, simuler, distancesCentral } from '../engine/central.js';

let cache = { cle: null, val: null };

/** Minute de la journée de tour (0 = 20:00 la veille), comme l'écran du central (y compris l'horloge avancée de la démo). */
function minuteCentral(st) {
  const debut = st.nextDeadline - CENTRAL.jour * 60000;
  return Math.max(0, Math.min(CENTRAL.jour - 1, Math.floor((Date.now() + (S.cxDecalage || 0) * 60000 - debut) / 60000)));
}

/** Clé de cache : change à chaque minute du central et à chaque action du joueur. */
export function cleCentral() {
  const st = S.state;
  if (!st || !S.user) return null;
  const mem = (S.player && S.player.central) || {};
  return `${st.season}-${st.turn}-${minuteCentral(st)}-${mem.cle || ''}-${(mem.actions || []).length}-${S.user.uid}`;
}

/**
 * { attente, delai, pts, gain, m } : appels sans équipe, minutes avant que l'adjoint ne dispatche le plus ancien,
 * points du jour et points de classement (0 à +25) gagnés sur l'adjoint seul. null si le central n'est pas jouable.
 */
export function resumeCentral() {
  try {
    const cle = cleCentral();
    if (!cle) return null;
    if (cache.cle === cle) return cache.val;
    const st = S.state, me = myZone();
    let val = null;
    if (me && st.nextDeadline) {
      const carte = carteQuartiers(st), cells = (carte.deZone[me.uid] || []).slice();
      if (cells.length) {
        const capitale = carte.capitale[me.uid] ?? cells[0];
        const opt = { dist: distancesCentral(cells, carte.adj), capitale };
        const cleJour = `${st.season}-${st.turn}`;
        const mem = (S.player && S.player.central) || {};
        const dujour = mem.cle === cleJour;
        const equipes = (dujour && mem.equipes) || equipesCentral(me, { capitale, autre: cells.find((c) => c !== capitale), vehicules: vehiculesDisponibles(me, st.turn) });
        const jour = genererJournee(`${S.config.seed}-central-${cleJour}-${me.uid}`, cells);
        const m = minuteCentral(st);
        const s = simuler(jour, equipes, dujour ? mem.actions || [] : [], m, opt);
        const adj = simuler(jour, equipes, [], m, opt);
        const att = s.appels.filter((a) => !a.statut && !a.eq && a.t <= m);
        const delai = att.length ? Math.max(0, CENTRAL.delaiAdjoint - Math.max(...att.map((a) => m - a.t))) : null;
        const libres = s.equipes.some((e) => e.etat === 'libre' || e.etat === 'poste');
        val = { attente: att.length, delai, libres, pts: s.pts, gain: Math.max(0, Math.min(CENTRAL.plafondJour, s.pts - adj.pts)), m };
      }
    }
    cache = { cle, val };
    return val;
  } catch (e) {
    console.warn('Résumé du central indisponible :', e && e.message);
    return null;
  }
}
