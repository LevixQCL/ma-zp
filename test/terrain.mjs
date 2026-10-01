// Mesure de la composante « Résultats terrain » : niveau moyen, écart d'un jour à l'autre, d'où viennent les points.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';

const SEEDS = Number(process.argv[2] || 20);
const STRATS = {
  'Équilibrée 7/4/4/2/3': { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 },
  'Recherche 7/3/6/1/3': { intervention: 7, proximite: 3, recherche: 6, roulage: 1, admin: 3 },
  'Intervention 11/3/2/1/3': { intervention: 11, proximite: 3, recherche: 2, roulage: 1, admin: 3 },
};
const sd = (a) => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
const r1 = (v) => Math.round(v * 10) / 10;
const rows = [];
for (const [nom, alloc] of Object.entries(STRATS)) {
  const terr = [], pts = [], sauts = [], ipzs = [], src = {}, zeros = [];
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `terrain-${s}` });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    let prev = null;
    for (let t = 1; t <= 13; t++) {
      const orders = { moi: { alloc, rythme: 'normal' } };
      for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
      const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
      state = r.state;
      const z = state.zones.moi;
      if (t < 3) continue;
      terr.push(z.ipzComp.affaires); pts.push(z.ipzDetail.points); ipzs.push(z.ipz);
      zeros.push(z.ipzDetail.points < 0.1 ? 1 : 0);
      if (prev !== null) sauts.push(Math.abs(z.ipzComp.affaires - prev));
      prev = z.ipzComp.affaires;
      for (const l of (z.journal && z.journal.lignes.points) || []) { const k = l.l.replace(/«.*»/, '«…»').replace(/ (de|à) .*/, ''); src[k] = (src[k] || 0) + l.v; }
    }
  }
  const n = terr.length;
  rows.push({ strat: nom, 'terrain moy': r1(terr.reduce((a, b) => a + b, 0) / n), 'terrain écart-type': r1(sd(terr)), 'saut moyen j→j': r1(sauts.reduce((a, b) => a + b, 0) / sauts.length), 'pts/jour': r1(pts.reduce((a, b) => a + b, 0) / n), '% jours à 0 pt': Math.round(100 * zeros.reduce((a, b) => a + b, 0) / n), 'IPZ écart-type': r1(sd(ipzs)), 'IPZ moy': r1(ipzs.reduce((a, b) => a + b, 0) / n) });
  console.log(nom, Object.fromEntries(Object.entries(src).map(([k, v]) => [k, r1(v / n)])));
}
console.table(rows);
