// Équilibrage des experts de l'appui PJF : combien d'experts reçoivent les zones, et ce que ça change
// aux pièces trouvées, selon la part de zones qui demandent un appui chaque jour.
// Réussite supposée des mini-jeux : facile 80 %, normal 65 %, difficile 45 % (avant : toujours normal, 65 %).
// Usage : node test/appui-experts-sim.mjs
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { makeRng } from '../js/engine/rng.js';

const REUSSITE = { 1: 0.45, 2: 0.65, 3: 0.8 };
const SEEDS = 8, TOURS = 35;
function run(pDemande) {
  const cpt = { 1: 0, 2: 0, 3: 0 }; let pieces = 0, piecesAvant = 0, joues = 0;
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `experts-sim-${s}` });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    const uids = Object.keys(state.zones);
    const rng = makeRng(`exp-${s}-${pDemande}`);
    for (let t = 1; t <= TOURS; t++) {
      const orders = {}, players = {};
      for (const b of BOT_PROFILES) orders[b.uid] = botOrders(state.zones[b.uid], state, b.style) || {};
      for (const u of uids) {
        const z = state.zones[u];
        players[u] = { nom: z.nom, code: z.code };
        if (rng.chance(pDemande)) orders[u].appui = rng.chance(0.5) ? 'labo' : 'rccu';
        if (z.appui && z.appui.tour === state.turn) {
          const ex = z.appui.experts || 2; cpt[ex]++; joues++;
          const ok = rng.chance(REUSSITE[ex]); if (ok) pieces++;
          if (rng.chance(REUSSITE[2])) piecesAvant++;
          players[u].appui = { id: z.appui.id, statut: ok ? 'ok' : 'rate' };
        }
      }
      state = resolveTurn(state, { orders, players, nextWeekday: (t + 1) % 7 }).state;
    }
  }
  const pc = (x) => `${Math.round((x / joues) * 100)} %`;
  return { 'appuis joués': joues, '1 expert': pc(cpt[1]), '2 experts': pc(cpt[2]), '3 experts': pc(cpt[3]), 'réussite avant': pc(piecesAvant), 'réussite après': pc(pieces) };
}
console.log('Zones :', BOT_PROFILES.length);
for (const p of [0.2, 0.5, 1]) console.log(`Demandes ${p * 100} %`, run(p));
