// Simulation : une zone qui arrive en cours d’affaire (jour 3, 5, 6), avec et sans dossier de rattrapage, face aux zones présentes depuis le début.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { dossierDe, RATTRAPAGE } from '../js/engine/enquete.js';
const SEEDS = 24, rows = [];
for (const actif of [false, true]) for (const J of [3, 5, 6]) {
  RATTRAPAGE.max = actif ? 12 : 0;
  const acc = { nPieces: 0, vPieces: 0, nBud0: 0, vBud0: 0, nBud: 0, vBud: 0, nDec: 0, vDec: 0, nLim: 0, vLim: 0, nIpz: 0, vIpz: 0, k: 0 };
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `ratt-${s}` });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    const styles = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, b.style]));
    let joint = false, n0 = null, fin = false;
    for (let t = 1; t <= 20 && !fin; t++) {
      if (!joint && state.enquete && state.enquete.jour === J) {
        n0 = state.enquete.n; state.zones.nv = newZone({ uid: 'nv', code: '7777', nom: 'Nouveau' }, state.turn); styles.nv = 'equilibre'; joint = true;
        state.zones.nv.enquete = dossierDe(state, state.zones.nv);
        const v = BOT_PROFILES.map((b) => state.zones[b.uid]);
        acc.nPieces += state.zones.nv.enquete.pieces.length; acc.vPieces += v.reduce((a, z) => a + z.enquete.pieces.length, 0) / v.length;
        acc.nBud0 += state.zones.nv.budget; acc.vBud0 += v.reduce((a, z) => a + z.budget, 0) / v.length;
        for (const z of [...v, state.zones.nv]) { z._lim0 = z.stats.limier; z._dec0 = z.stats.decouvertes; }
      }
      const orders = {};
      for (const u of Object.keys(state.zones)) { const o = botOrders(state.zones[u], state, styles[u]); if (o) orders[u] = o; }
      state = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 }).state;
      if (joint && (!state.enquete || state.enquete.n !== n0)) {
        fin = true;
        const v = BOT_PROFILES.map((b) => state.zones[b.uid]), nv = state.zones.nv;
        acc.nBud += nv.budget; acc.vBud += v.reduce((a, z) => a + z.budget, 0) / v.length;
        acc.nDec += nv.stats.decouvertes; acc.vDec += v.reduce((a, z) => a + z.stats.decouvertes, 0) / v.length;
        acc.nLim += nv.stats.limier; acc.vLim += v.reduce((a, z) => a + z.stats.limier, 0) / v.length;
        acc.nIpz += nv.ipz; acc.vIpz += v.reduce((a, z) => a + z.ipz, 0) / v.length; acc.k++;
      }
    }
  }
  const f = (x, d = SEEDS) => Math.round((x / d) * 10) / 10;
  rows.push({ rattrapage: actif ? 'oui' : 'non', 'arrivée jour': J, 'pièces nouveau': f(acc.nPieces), 'pièces anciens': f(acc.vPieces), 'budget à l’arrivée (nouveau/anciens)': `${f(acc.nBud0)} / ${f(acc.vBud0)}`, 'bonnes accusations (nouveau/anciens)': `${f(acc.nDec, acc.k)} / ${f(acc.vDec, acc.k)}`, 'points enquête (nouveau/anciens)': `${f(acc.nLim, acc.k)} / ${f(acc.vLim, acc.k)}`, 'budget fin (nouveau/anciens)': `${f(acc.nBud, acc.k)} / ${f(acc.vBud, acc.k)}`, 'IPZ fin (nouveau/anciens)': `${f(acc.nIpz, acc.k)} / ${f(acc.vIpz, acc.k)}` });
}
console.table(rows);
