// Déclenche la résolution des tours échus. Appelé par l'application à l'ouverture
// et chaque minute : le premier joueur connecté après 20:00 calcule le tour pour tous.
import { resolveTurn, isOutdated } from '../engine/resolve.js';
import { nextResolutionAfter, weekdayBe } from '../engine/time.js';

let running = false;

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
      const ok = await backend.commitResolution(state, next, gazette);
      if (!ok) break; // déjà résolu par un autre appareil, ou refusé : on attend le prochain passage
      count++;
    }
  } finally {
    running = false;
  }
  return count;
}
