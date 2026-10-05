// Retour de Luc (oct. 2026) : « 100 en terrain, je gagne trop sur les dossiers ». Distribution de la composante terrain des bots sur 28 tours.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
const S = Number(process.argv[2] || 20), T = 28;
const vals = [], src = {}, pts = []; let n = 0, max = 0;
for (let s = 0; s < S; s++) {
  let st = createGame({ seed: `luc-${s}` }); for (const p of BOT_PROFILES) st.zones[p.uid] = newZone(p, 1);
  for (let t = 1; t <= T; t++) {
    const orders = {}; for (const p of BOT_PROFILES) { const o = botOrders(st.zones[p.uid], st, p.style); if (o) orders[p.uid] = o; }
    st = resolveTurn(st, { orders, nextWeekday: (t + 1) % 7 }).state;
    if (t < 5) continue;
    for (const p of BOT_PROFILES) { const z = st.zones[p.uid]; if (!z || !z.ipzComp) continue; vals.push(z.ipzComp.affaires); pts.push(z.ipzDetail.points); n++;
      for (const l of (z.journal && z.journal.lignes.points) || []) { const k = l.l.replace(/«.*»/, '').replace(/ (de|à) .*/, ''); src[k] = (src[k] || 0) + l.v; } }
  }
}
vals.sort((a, b) => a - b); pts.sort((a, b) => a - b);
const q = (a, f) => a[Math.floor(f * (a.length - 1))].toFixed(1);
console.log(`terrain : médiane ${q(vals, .5)} · p90 ${q(vals, .9)} · jours à 100 : ${(100 * vals.filter((v) => v >= 99.9).length / n).toFixed(1)} %`);
console.log(`pts/jour : médiane ${q(pts, .5)} · p90 ${q(pts, .9)} · max ${pts[pts.length - 1].toFixed(1)}`);
console.log(Object.fromEntries(Object.entries(src).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / n).toFixed(2)])));
