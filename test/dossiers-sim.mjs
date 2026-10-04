// Combien d'agents en Recherche pour suivre le rythme d'un dossier par jour ? Zone fixe, moral réel, 13 tours.
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { DOSSIER } from '../js/engine/constants.js';
const [a, b] = (process.argv[2] || '4-8').split('-').map(Number); DOSSIER.tailleMin = a; DOSSIER.tailleMax = b;
for (const rech of [4, 5, 6, 8, 11]) {
  let fin = 0, elu = 0, ipz = 0, moral = 0; const S = 30;
  for (let s = 0; s < S; s++) {
    let st = createGame({ seed: `dos-${s}` }); for (const p of BOT_PROFILES) st.zones[p.uid] = newZone(p, 1);
    const c = BOT_PROFILES[0].uid, players = Object.fromEntries(BOT_PROFILES.map((p) => [p.uid, { nom: p.nom, code: p.code }]));
    for (let t = 1; t <= 13; t++) {
      const orders = {}; for (const p of BOT_PROFILES) { const o = botOrders(st.zones[p.uid], st, p.style) || {}; delete o.decision; orders[p.uid] = o; }
      const autres = 20 - rech; orders[c].alloc = { intervention: Math.min(7, autres), proximite: Math.max(0, Math.min(4, autres - 7)), recherche: rech, roulage: Math.max(0, Math.min(2, autres - 11)), admin: Math.max(0, autres - 13) }; orders[c].rythme = 'normal';
      const r0 = st.zones[c].stats.dossiersResolus || 0;
      st = resolveTurn(st, { orders, players, nextWeekday: (t + 1) % 7 }).state;
      elu += ((st.zones[c].stats.dossiersResolus || 0) - r0) / S; ipz += st.zones[c].ipz / 13 / S; moral += st.zones[c].moral / 13 / S;
    }
    fin += st.zones[c].dossiers.length / S;
  }
  console.log(`taille ${a}-${b} · Recherche ${String(rech).padStart(2)} : ${elu.toFixed(1)} dossiers bouclés en 13 jours (13 arrivés), ${fin.toFixed(1)} en attente à la fin · moral moyen ${moral.toFixed(0)}`);
}
