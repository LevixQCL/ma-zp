// Déclenche la résolution des tours échus. Appelé par l'application à l'ouverture
// et chaque minute : le premier joueur connecté après 20:00 calcule le tour pour tous.
import { resolveTurn, isOutdated } from '../engine/resolve.js';
import { APP_VERSION } from '../engine/constants.js';
import { nextResolutionAfter, weekdayBe } from '../engine/time.js';

let running = false;

/**
 * Le rapport du soir, le journal des jauges et le relevé du budget de chaque zone sont déjà dans la Gazette du tour :
 * on les retire du document d'état (limité à 1 Mo) et l'appareil les y relit (`completerDepuisGazette`).
 * Seulement quand c'est exactement le même contenu (une zone repartie à zéro garde son message de nouvelle saison).
 */
export function allegerEtat(next, gazette) {
  const j = gazette.journaux || {};
  for (const [u, z] of Object.entries(next.zones || {})) {
    if (gazette.rapports && z.rapport === gazette.rapports[u]) delete z.rapport;
    if (j[u] && z.journal === j[u].journal) delete z.journal;
    if (j[u] && z.compta === j[u].compta) delete z.compta;
  }
  next.rapportsDansGazette = true;
  return next;
}

/** Remet dans les zones (sur l'appareil seulement) le rapport, le journal et le relevé lus dans la Gazette du dernier tour. */
export function completerDepuisGazette(state, gazettes) {
  if (!state || !state.rapportsDansGazette || !state.zones) return state;
  const g = (gazettes || []).find((x) => x && x.date === state.lastResolvedAt);
  if (!g) return state;
  const j = g.journaux || {};
  for (const [u, z] of Object.entries(state.zones)) {
    const lignes = g.rapports && g.rapports[u];
    if (lignes && !z._complete) z.rapport = [...(z.rapport || []), ...lignes];
    if (j[u] && !z.journal) z.journal = j[u].journal;
    if (j[u] && !z.compta) z.compta = j[u].compta;
    Object.defineProperty(z, '_complete', { value: true, enumerable: false, configurable: true });
  }
  return state;
}

/**
 * Juste avant de calculer le tour : une version plus récente du jeu est-elle en ligne ?
 * Un appareil qui a gardé l'ancien code en mémoire (appli restée ouverte, cache) ne doit pas calculer le tour
 * avec les anciennes règles : il se recharge, et un appareil à jour s'en charge.
 * Sans réseau ou hors navigateur, on laisse faire (le calcul ne pourrait de toute façon pas être enregistré).
 */
async function versionEnLigneOk() {
  if (typeof location === 'undefined' || typeof fetch !== 'function' || location.search.includes('demo')) return true;
  try {
    const r = await fetch(`test/version-moteur.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return true;
    const v = (await r.json()).version || 0;
    if (v <= APP_VERSION) return true;
    console.warn(`Version ${v} en ligne, cet appareil a la ${APP_VERSION} : rechargement avant de calculer le tour.`);
    try {
      if (sessionStorage.getItem('mazp-recharge-version') !== String(v)) { sessionStorage.setItem('mazp-recharge-version', String(v)); location.reload(); }
    } catch (e) { /* pas de stockage : on ne recharge pas en boucle */ }
    return false;
  } catch (e) { return true; }
}

export async function resolvePending(backend, { hour = 20, now = () => Date.now(), maxTurns = 10, state: connu = null } = {}) {
  if (running) return 0;
  running = true;
  let count = 0;
  try {
    for (let i = 0; i < maxTurns; i++) {
      // L'état déjà reçu par l'abonnement évite de retélécharger tout le document pour rien.
      if (i === 0 && connu && now() < connu.nextDeadline) break;
      const state = await backend.getState();
      if (!state || now() < state.nextDeadline) break;
      if (isOutdated(state)) break; // ancienne version : on laisse les appareils à jour calculer
      if (!(await versionEnLigneOk())) break; // une version plus récente est en ligne : on recharge d'abord
      let orders, quests, players;
      try {
        [orders, quests, players] = await Promise.all([
        backend.getAllOrders(state.season, state.turn),
        backend.getAllQuests(state.season, state.turn),
        backend.getPlayers({ strict: true }), // sans les profils, les résultats d'incidents du soir seraient perdus
        ]);
      } catch (e) {
        // Un autre joueur a sans doute déjà résolu ce tour : on relira l'état au prochain passage.
        console.warn('Lecture des ordres impossible :', e.message);
        break;
      }
      const nextDeadline = nextResolutionAfter(state.nextDeadline, hour);
      const { state: next, gazette } = resolveTurn(state, { orders, quests, players, nextWeekday: weekdayBe(nextDeadline) });
      gazette.date = state.nextDeadline;
      next.nextDeadline = nextDeadline;
      next.lastResolvedAt = state.nextDeadline;
      const ok = await backend.commitResolution(state, allegerEtat(next, gazette), gazette);
      if (!ok) break; // déjà résolu par un autre appareil, ou refusé : on attend le prochain passage
      count++;
    }
  } finally {
    running = false;
  }
  return count;
}
