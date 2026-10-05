// Simulation : que rapporte chaque pacte, et le pacte d'enquête accélère-t-il trop les affaires ?
// Dix zones de robots, sur plusieurs saisons ; des paires fixes signent (et reconduisent) un type de pacte.
// node test/pactes-sim.mjs   (SEEDS=… pour changer le nombre de parties)
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { moyenneIpz } from '../js/engine/zone.js';
import { pactesDe } from '../js/engine/pactes.js';

const SEEDS = Number(process.env.SEEDS || 16), SAISONS = 2;
const VARIANTES = [
  { nom: 'sans pacte', type: null, paires: 0 },
  { nom: 'enquête, 2 paires', type: 'enquete', paires: 2 },
  { nom: 'enquête, 5 paires', type: 'enquete', paires: 5 },
  { nom: 'jumelage, 2 paires', type: 'terrain', paires: 2 },
  { nom: 'centrale, 2 paires', type: 'achat', paires: 2 },
];
const rows = [];
for (const V of VARIANTES) {
  const acc = { jours: [], ipzP: 0, ipzA: 0, nP: 0, nA: 0, budP: 0, budA: 0, decP: 0, decA: 0, pieces: 0, nd: 0, ndA: 0 };
  for (let sd = 0; sd < SEEDS; sd++) {
    let st = createGame({ seed: `pactes-${sd}` });
    const players = {};
    for (let i = 0; i < 10; i++) { const b = BOT_PROFILES[i % BOT_PROFILES.length]; players[`z${i}`] = { ...b, uid: `z${i}`, code: String(5100 + i), nom: `${b.nom} ${i}` }; }
    st = resolveTurn(st, { players }).state;
    const uids = Object.keys(st.zones).sort();
    const styles = Object.fromEntries(uids.map((u) => [u, players[u].style === 'distrait' ? 'equilibre' : players[u].style]));
    const paires = [...Array(V.paires).keys()].map((k) => [uids[2 * k], uids[2 * k + 1]]);
    // Groupe suivi : les 4 premières zones (les mêmes profils de robots d'une variante à l'autre).
    const lie = new Set(uids.slice(0, 4));
    let n0 = null, resolue = false, saison = st.season;
    for (let t = 0; t < 14 * SAISONS + 2; t++) {
      const e = st.enquete;
      if (e && e.n !== n0) { if (n0 !== null && !resolue) acc.jours.push(8); n0 = e.n; resolue = false; }
      const orders = {};
      for (const u of uids) {
        const o = botOrders(st.zones[u], st, styles[u]);
        if (!o) continue;
        delete o.pacte; delete o.pacteReponse; delete o.defi; delete o.defiReponse;
        orders[u] = o;
      }
      // Les paires fixes : proposer quand rien ne les lie, accepter le lendemain.
      for (const [a, b] of paires) {
        const p = pactesDe(st, a).find((x) => x.a === b || x.b === b);
        if (!orders[a] || !orders[b]) continue;
        if (!p) orders[a].pacte = { cible: b, type: V.type };
        else if (p.etape === 'propose' && p.tourReponse === st.turn) orders[b].pacteReponse = { id: p.id, accepte: true };
      }
      const avant = Object.fromEntries(uids.map((u) => [u, st.zones[u].stats.decouvertes || 0]));
      const jour = e ? e.jour : null;
      const r = resolveTurn(st, { orders, players, nextWeekday: (t + 2) % 7 });
      // Fin de saison : moyennes d'IPZ (avant la remise à zéro).
      if (r.gazette.finSaison) {
        for (const c of r.gazette.classement) { const u = uids.find((x) => players[x].code === c.code); if (!u) continue; if (lie.has(u)) { acc.ipzP += c.moyenne; acc.nP++; } else { acc.ipzA += c.moyenne; acc.nA++; } }
      }
      st = r.state;
      for (const u of uids) {
        const z = st.zones[u];
        if (!z) continue;
        const dec = (z.stats.decouvertes || 0) > avant[u];
        if (lie.has(u)) acc.decP += dec ? 1 : 0; else acc.decA += dec ? 1 : 0;
        for (const l of r.gazette.rapports[u] || []) { if (l.startsWith('Jumelage : avec')) acc.nd++; if (l.includes('vous réunissez les deux moitiés')) acc.pieces++; }
      }
      if (uids.some((u) => (st.zones[u].stats.decouvertes || 0) > avant[u]) && !resolue) { resolue = true; acc.jours.push(jour); }
      if (st.season !== saison) { saison = st.season; }
    }
  }
  const j = acc.jours, moy = j.reduce((a, b) => a + b, 0) / (j.length || 1);
  const pct = (k) => `${Math.round(100 * j.filter((x) => x <= k).length / (j.length || 1))} %`;
  const nZ = 4, nO = 6;
  rows.push({
    variante: V.nom, 'jour moyen': moy.toFixed(2), '≤ j4': pct(4), '≤ j5': pct(5), '≤ j6': pct(6),
    'IPZ moy. 4 premières (liées)': acc.nP ? (acc.ipzP / acc.nP).toFixed(2) : '-', 'IPZ moy. 6 autres': acc.nA ? (acc.ipzA / acc.nA).toFixed(2) : '-',
    'identifications / zone (4 premières · autres)': `${(acc.decP / nZ / SEEDS).toFixed(2)} · ${(acc.decA / nO / SEEDS).toFixed(2)}`,
    'pièces réunies / zone / saison': V.type === 'enquete' ? (acc.pieces / nZ / SEEDS / SAISONS).toFixed(1) : '-',
    'soirs jumelés / zone / saison': V.type === 'terrain' ? (acc.nd / nZ / SEEDS / SAISONS).toFixed(1) : '-',
  });
}
console.table(rows);
