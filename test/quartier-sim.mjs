// « Le Quartier » : rythme d'une saison selon le nombre de zones et la part d'inactifs (robots + adjoint).
// Usage : node test/quartier-sim.mjs [graines] [tours]
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { QUARTIER, Q } from '../js/engine/quartier.js';

const SEEDS = Number(process.argv[2]) || 8;
const TOURS = Number(process.argv[3]) || 14;
const STYLES = ['equilibre', 'agressif', 'prudent', 'equilibre', 'distrait'];
QUARTIER.force = true;
if (process.argv[4]) for (const [k, v] of Object.entries(JSON.parse(process.argv[4]))) Object.assign(Q[k], v);

function partie(seed, n, inactifs) {
  let state = createGame({ seed });
  state.nonDroit.roles = true; state.nonDroit.v3 = true;
  const zs = Array.from({ length: n }, (_, i) => ({ uid: `z${i}`, code: String(5300 + i), nom: `Z${i}`, style: STYLES[i % STYLES.length] }));
  for (const z of zs) state.zones[z.uid] = newZone(z, 1);
  const absents = new Set(zs.slice(0, Math.round(n * inactifs)).map((z) => z.uid));
  for (const u of absents) state.zones[u].toursSansOrdres = 3; // déjà absents quand la règle arrive
  const st = { premiere: null, j7: 0, fin: 0, qg: null, rechutes: 0, repoussees: 0, barDepart: 0, barQG: 0 };
  for (let t = 1; t <= TOURS; t++) {
    const orders = {};
    for (const z of zs) { if (absents.has(z.uid)) continue; const o = botOrders(state.zones[z.uid], state, z.style); if (o) orders[z.uid] = o; }
    const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
    const g = r.gazette.nonDroit;
    if (t === 1) { st.barDepart = g.etat.filter((x) => x.statut === 'milieu').map((x) => x.bar).sort((a, b) => a - b).join('/'); }
    if (g.prises.length && st.premiere === null) st.premiere = t;
    if (g.prises.some((p) => p.coeur)) st.qg = t;
    st.rechutes += g.rechutes.length; st.repoussees += ((g.quartier && g.quartier.repoussees) || []).length;
    const tenus = g.etat.filter((x) => x.statut === 'repris' && !x.coeur).length;
    st.coups = (st.coups || 0) + Object.values((g.quartier && g.quartier.cassees) || {}).reduce((a, b) => a + b, 0);
    if (t === 7) st.j7 = tenus;
    if (t === TOURS) st.fin = tenus;
    state = r.state;
  }
  return st;
}
const moy = (l, k) => Math.round((l.reduce((a, x) => a + (x[k] ?? 99), 0) / l.length) * 10) / 10;
const rows = [];
for (const [n, inact] of [[3, 0], [6, 0], [6, 0.5], [10, 0.3], [10, 0.6], [20, 0.5], [30, 0.6]]) {
  const l = Array.from({ length: SEEDS }, (_, s) => partie(`q-${s}`, n, inact));
  rows.push({ zones: n, inactifs: `${Math.round(inact * 100)} %`, 'barricades J1': l[0].barDepart, '1re prise (jour)': moy(l, 'premiere'), 'anneau tenu J7 (/7)': moy(l, 'j7'), [`anneau tenu J${TOURS}`]: moy(l, 'fin'), 'QG tombé (parties)': `${l.filter((x) => x.qg).length}/${l.length}`, 'jour du QG': l.some((x) => x.qg) ? moy(l.filter((x) => x.qg), 'qg') : '–', 'coups/nuit': Math.round(moy(l, 'coups') / TOURS), reperdus: moy(l, 'rechutes'), 'attaques repoussées': moy(l, 'repoussees') });
}
console.log(`\n« Le Quartier » · ${SEEDS} parties par ligne · ${TOURS} jours`); console.table(rows);
