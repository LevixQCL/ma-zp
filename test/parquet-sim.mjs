// Simulation : à partir de quand le parquet réagit-il ? Joueurs normaux, groupe qui partage tout, « parasite » qui ne fait rien.
// node test/parquet-sim.mjs
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { travailEnquete } from '../js/engine/directeur.js';

const SEEDS = 20;
const PROFILS = {
  normal: (o) => o,
  pool: (o, z) => ({ ...o, partages: (z.enquete ? z.enquete.pieces : []).filter((p) => !['ouverture', 'rebond', 'partage'].includes(p.src)).slice(-3).map((p) => ({ f: p.f, a: '*' })) }),
  partage1: (o, z) => ({ ...o, partages: (z.enquete ? z.enquete.pieces : []).filter((p) => !['ouverture', 'rebond', 'partage'].includes(p.src)).slice(-1).map((p) => ({ f: p.f, a: '*' })) }),
  poolLeger: (o, z) => ({ ...PROFILS.pool(o, z), demarches: (o.demarches || []).slice(0, 1) }),
  parasite: (o) => ({ ...o, demarches: [], partages: [], appui: null }),
};
// Dix zones : deux normales, une qui partage un peu, cinq en groupe qui partage tout (dont deux qui en profitent pour travailler moins), une « parasite ».
const roles = ['normal', 'normal', 'partage1', 'pool', 'pool', 'pool', 'poolLeger', 'poolLeger', 'parasite', 'pool'];
const acc = Object.fromEntries(Object.keys(PROFILS).map((k) => [k, { n: 0, stade1: 0, stade2: 0, budget: 0, part: 0, parts: 0 }]));
for (let s = 0; s < SEEDS; s++) {
  let st = createGame({ seed: `pq-${s}` });
  const players = {};
  for (let i = 0; i < 10; i++) { const b = BOT_PROFILES[i % BOT_PROFILES.length]; players[`z${i}`] = { ...b, uid: `z${i}`, code: String(5100 + i), nom: `${b.nom} ${i}` }; }
  st = resolveTurn(st, { players }).state;
  const uids = Object.keys(st.zones).sort();
  const role = Object.fromEntries(uids.map((u, i) => [u, roles[i % roles.length]]));
  const styles = Object.fromEntries(uids.map((u) => [u, players[u].style === 'distrait' ? 'equilibre' : players[u].style]));
  for (let t = 0; t < 14; t++) {
    const orders = {};
    for (const u of uids) { const o = botOrders(st.zones[u], st, styles[u]) || botOrders(st.zones[u], { ...st, seed: st.seed + 'x' }, styles[u]); if (o) orders[u] = PROFILS[role[u]](o, st.zones[u]); }
    const r = resolveTurn(st, { orders, players });
    for (const u of uids) {
      const z = r.state.zones[u], a = acc[role[u]];
      if (!z) continue;
      const pq = z.dir && z.dir.parquet;
      a.n++;
      if (pq && pq.stade >= 1) a.stade1++;
      if (pq && pq.stade >= 2) a.stade2++;
      if (pq) { a.part += pq.part; a.parts++; }
      a.budget += ((z.compta && z.compta.lignes) || []).filter((l) => l.k === 'parquet').reduce((x, l) => x + l.v, 0);
    }
    if (r.gazette.finSaison) break;
    st = r.state;
  }
}
console.log('profil      soirs  avertis  malus   part moyenne  k€ perdus/saison');
for (const [k, a] of Object.entries(acc)) {
  const nZ = a.n / 14 || 1;
  console.log(`${k.padEnd(10)} ${String(a.n).padStart(5)}  ${(100 * a.stade1 / a.n).toFixed(0).padStart(6)} %  ${(100 * a.stade2 / a.n).toFixed(0).padStart(4)} %  ${(100 * a.part / (a.parts || 1)).toFixed(0).padStart(8)} %  ${(a.budget / nZ).toFixed(1).padStart(10)}`);
}
