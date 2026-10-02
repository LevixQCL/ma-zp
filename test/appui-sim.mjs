// Équilibrage de l'appui fédéral : pièces par zone et par jour, et vitesse de résolution des affaires,
// sans appui puis avec appui (toutes les zones demandent chaque jour, ~65 % de mini-jeux réussis).
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { makeRng } from '../js/engine/rng.js';

const SEEDS = 10, TOURS = 42, REUSSITE = Number(process.argv[2] || 0.65);
function run(avecAppui) {
  const acc = { pieces: {}, jours: 0, decouvertes: 0, classees: 0, demandes: 0, accordes: 0 };
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `appui-sim-${s}` });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    const uids = Object.keys(state.zones);
    const rng = makeRng(`succes-${s}`);
    let joursAff = 0;
    for (let t = 1; t <= TOURS; t++) {
      const orders = {}, players = {};
      for (const b of BOT_PROFILES) { const x = botOrders(state.zones[b.uid], state, b.style); orders[b.uid] = x || {}; }
      for (const u of uids) {
        const z = state.zones[u];
        players[u] = { nom: z.nom, code: z.code };
        if (!avecAppui) continue;
        orders[u].appui = (t + uids.indexOf(u)) % 2 ? 'labo' : 'rccu';
        acc.demandes++;
        if (z.appui && z.appui.tour === state.turn) players[u].appui = { id: z.appui.id, statut: rng.chance(REUSSITE) ? 'ok' : 'rate' };
      }
      const avant = Object.fromEntries(uids.map((u) => [u, (state.zones[u].enquete && state.zones[u].enquete.n === (state.enquete && state.enquete.n)) ? state.zones[u].enquete.pieces.length : 0]));
      const n0 = state.enquete && state.enquete.n;
      const r = resolveTurn(state, { orders, players, nextWeekday: (t + 1) % 7 });
      const g = JSON.stringify(r.gazette);
      state = r.state;
      joursAff++;
      if (avecAppui) acc.accordes += uids.filter((u) => state.zones[u].appui).length;
      for (const u of uids) {
        const d = state.zones[u].enquete;
        if (!d || d.n !== n0) continue;
        for (const p of d.pieces.slice(avant[u])) acc.pieces[p.src] = (acc.pieces[p.src] || 0) + 1;
      }
      if (state.enquete && state.enquete.n !== n0 && n0) {
        if (g.includes('classée sans suite')) acc.classees++; else { acc.decouvertes++; acc.jours += joursAff; }
        joursAff = 0;
      }
    }
  }
  const zj = SEEDS * TOURS * (BOT_PROFILES.length);
  const par = Object.fromEntries(Object.entries(acc.pieces).map(([k, v]) => [k, Math.round((v / zj) * 100) / 100]));
  return { 'pièces/zone/jour par source': par, total: Math.round(Object.values(acc.pieces).reduce((a, b) => a + b, 0) / zj * 100) / 100,
    'affaires trouvées': acc.decouvertes, classées: acc.classees, 'jours moyens pour trouver': acc.decouvertes ? Math.round(acc.jours / acc.decouvertes * 10) / 10 : '-',
    ...(avecAppui ? { 'taux d’appuis accordés': Math.round(acc.accordes / acc.demandes * 100) + ' %' } : {}) };
}
console.log('Zones :', BOT_PROFILES.length, '· réussite des mini-jeux :', REUSSITE);
console.log('SANS appui', run(false));
console.log('AVEC appui', run(true));
