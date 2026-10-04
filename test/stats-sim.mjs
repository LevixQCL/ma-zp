// Vitesse de montée du moral, de la satisfaction et de la réputation (retours de Luc).
// Bots sur une saison complète : moyenne et meilleure zone au fil des tours, part des soirs au-dessus de 80 et 90.
// Usage : node test/stats-sim.mjs [variante]   variante : actuel | luc
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { SEASON_LENGTH, DERIVE, DOSSIER } from '../js/engine/constants.js';

const variante = process.argv[2] || 'actuel';
if (variante === 'luc') { DERIVE.satisfaction.paliers = [[60, 0.10], [70, 0.15], [80, 0.20], [90, 0.25]]; DERIVE.satisfaction.base = 0.05; DERIVE.reputation.paliers = [[60, 0.10], [70, 0.15], [80, 0.20], [90, 0.25]]; DERIVE.reputation.base = 0.05; }
if (variante === 'sansderive') { DERIVE.satisfaction.base = 0; DERIVE.reputation.base = 0; }
if (variante === 'milieu') { DERIVE.satisfaction.paliers = [[60, 0.06], [70, 0.09], [80, 0.12], [90, 0.15]]; DERIVE.reputation.paliers = [[60, 0.05], [70, 0.075], [80, 0.10], [90, 0.125]]; }
if (process.env.TAILLE) { const [a, b] = process.env.TAILLE.split('-').map(Number); DOSSIER.tailleMin = a; DOSSIER.tailleMax = b; }
const S = 30, stats = ['moral', 'satisfaction', 'reputation'];
const parTour = Array.from({ length: SEASON_LENGTH }, () => Object.fromEntries(stats.map((k) => [k, { moy: 0, max: 0 }])));
const hauts = Object.fromEntries(stats.map((k) => [k, { s80: 0, s90: 0 }])); let n = 0;
for (let s = 0; s < S; s++) {
  let state = createGame({ seed: `stats-${s}` });
  for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
  const players = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, { nom: b.nom, code: b.code }]));
  for (let t = 1; t < SEASON_LENGTH; t++) {
    const orders = {}; for (const b of BOT_PROFILES) orders[b.uid] = botOrders(state.zones[b.uid], state, b.style) || {};
    state = resolveTurn(state, { orders, players, nextWeekday: (t + 1) % 7 }).state;
    const zs = Object.values(state.zones);
    for (const k of stats) {
      const v = zs.map((z) => z[k]); parTour[t][k].moy += v.reduce((a, b) => a + b, 0) / v.length / S; parTour[t][k].max += Math.max(...v) / S;
      for (const x of v) { if (x >= 80) hauts[k].s80++; if (x >= 90) hauts[k].s90++; }
    }
    n += zs.length;
  }
}
console.log(`Variante ${variante} — moyenne / meilleure zone`);
for (const t of [3, 6, 9, 13]) console.log(`tour ${String(t).padStart(2)} : ` + stats.map((k) => `${k} ${parTour[t][k].moy.toFixed(0)} / ${parTour[t][k].max.toFixed(0)}`).join(' · '));
console.log('soirs ≥ 80 / ≥ 90 : ' + stats.map((k) => `${k} ${Math.round(hauts[k].s80 / n * 100)} % / ${Math.round(hauts[k].s90 / n * 100)} %`).join(' · '));
