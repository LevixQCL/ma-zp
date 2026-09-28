// Déclenche la résolution des tours échus. Appelé par l'application à l'ouverture
// et chaque minute : le premier joueur connecté après 20:00 calcule le tour pour tous.
import { resolveTurn, isOutdated } from '../engine/resolve.js';
import { nextResolutionAfter, weekdayBe } from '../engine/time.js';

let running = false;

export async function resolvePending(backend, { hour = 20, now = () => Date.now(), maxTurns = 10 } = {}) {
  if (running) return 0;
  running = true;
  let count = 0;
  try {
    for (let i = 0; i < maxTurns; i++) {
      const state = await backend.getState();
      if (!state || now() < state.nextDeadline) break;
      if (isOutdated(state)) break; // ancienne version : on laisse les appareils à jour calculer
      let orders, quests, players;
      try {
        [orders, quests, players] = await Promise.all([
        backend.getAllOrders(state.season, state.turn),
        backend.getAllQuests(state.season, state.turn),
        backend.getPlayers(),
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
      if (ok) count++;
    }
  } finally {
    running = false;
  }
  return count;
}
