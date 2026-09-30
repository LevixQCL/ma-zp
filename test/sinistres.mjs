// Sinistralité du parc : fréquence des accidents, gravité, coût pour les zones (robots, une saison, plusieurs tirages).
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';

const SEEDS = 20, TOURS = 14;
const acc = { zonesTours: 0, accidents: 0, accrochages: 0, sinistres: 0, graves: 0, viraux: 0, risque: 0, n: 0, image: 0, sansVehicule: 0 };
const parStyle = {};
for (let s = 0; s < SEEDS; s++) {
  let state = createGame({ seed: `sin-${s}` });
  for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
  for (let t = 1; t <= TOURS; t++) {
    const orders = {};
    for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
    const r = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 });
    if (t === TOURS) break;
    state = r.state;
    for (const b of BOT_PROFILES) {
      const z = state.zones[b.uid], rap = r.gazette.rapports[b.uid] || [];
      acc.zonesTours++;
      if (z.stats.risqueAccident != null) { acc.risque += z.stats.risqueAccident; acc.n++; }
      const st = (parStyle[b.style] ||= { accidents: 0, vehiculesFin: 0, zones: 0 });
      for (const l of rap) {
        if (l.startsWith('Accident de véhicule')) { acc.accidents++; acc.accrochages++; st.accidents++; }
        if (l.startsWith('Véhicule sinistré')) { acc.accidents++; acc.sinistres++; st.accidents++; }
        if (l.startsWith('Accident grave : ')) { acc.accidents++; acc.graves++; st.accidents++; }
        if (l.startsWith('Réseaux sociaux')) acc.viraux++;
        if (l.startsWith('Image :')) acc.image++;
      }
      if (t === TOURS - 1) { st.vehiculesFin += z.vehicules; st.zones++; }
    }
  }
}
const pc = (v) => `${Math.round(v * 1000) / 10} %`;
console.log(`Risque moyen par tour : ${Math.round(acc.risque / acc.n * 10) / 10} %`);
console.log(`Accidents : ${acc.accidents} sur ${acc.zonesTours} tours-zones (${pc(acc.accidents / acc.zonesTours)}), soit ${Math.round(acc.accidents / (acc.zonesTours / (TOURS - 1)) * 100) / 100} par zone et par saison`);
console.log(`  accrochages ${acc.accrochages} · sinistres ${acc.sinistres} · graves ${acc.graves} · tours avec malus d'image ${acc.image} · photos virales ${acc.viraux}`);
console.table(Object.entries(parStyle).map(([k, v]) => ({ style: k, 'accidents / saison': Math.round(v.accidents / v.zones * 100) / 100, 'véhicules en fin de saison': Math.round(v.vehiculesFin / v.zones * 10) / 10 })));
