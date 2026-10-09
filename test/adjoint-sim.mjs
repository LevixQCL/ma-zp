// L'adjoint (saison 2) : une zone absente du jour 4 au jour 10 inclus, contre les 5 robots, règles v2.
// Usage : node test/adjoint-sim.mjs [graines]
// Objectif : l'adjoint garde la zone en meilleur état que l'ancien pilote automatique, sans jamais faire mieux qu'un
// joueur présent (ni sur l'IPZ du jour, ni sur la moyenne du classement).
const R = new URL('../js/engine/', import.meta.url).href;
const { createGame, resolveTurn } = await import(R + 'resolve.js');
const { BOT_PROFILES, botOrders } = await import(R + 'bots.js');
const { newZone } = await import(R + 'zone.js');
const { creerChef, XP_CUMUL } = await import(R + 'chef.js');

const SEEDS = Number(process.argv[2] || 10);
const STRATS = {
  'Présent tous les jours': { present: true },
  'Absent, ancien pilote automatique': { ancien: true },
  'Absent, adjoint équilibré, Commandement 0': { consigne: 'equilibre', cdt: 0 },
  'Absent, adjoint prudent, Commandement 5': { consigne: 'prudent', cdt: 5 },
  'Absent, adjoint équilibré, Commandement 5': { consigne: 'equilibre', cdt: 5 },
  'Absent, adjoint offensif, Commandement 8': { consigne: 'offensif', cdt: 8 },
  'Absent, adjoint équilibré, Commandement 10': { consigne: 'equilibre', cdt: 10 },
};
const absent = (t) => t >= 4 && t <= 10;
const rows = [];
for (const [nom, opt] of Object.entries(STRATS)) {
  const acc = { ipzAbs: [], ipz14: [], moy: [], moral: [], sat: [], budget: [] };
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `adj-${s}`, regles: 2 });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    const c = creerChef({}); c.xp.commandement = XP_CUMUL[opt.cdt || 0]; state.zones.moi.chef = c;
    const players = { moi: { chef: { consigne: opt.consigne || 'equilibre' } } };
    let ipzAbs = 0, fin = null;
    for (let t = 1; t <= 14; t++) {
      const orders = {};
      for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
      if (opt.present || !absent(t)) orders.moi = botOrders(state.zones.moi, state, 'equilibre');
      if (opt.ancien) delete state.zones.moi.adjoint;
      const r = resolveTurn(state, { orders, quests: {}, players, nextWeekday: (t + 1) % 7 });
      const z = (t === 14 ? r.state : r.state).zones.moi;
      if (absent(t)) ipzAbs += z.ipz;
      if (t === 10) { acc.moral.push(z.moral); acc.sat.push(z.satisfaction); acc.budget.push(z.budget); }
      if (t === 13) acc.ipz14.push(z.ipz);
      if (t === 14) fin = r.gazette.classement;
      state = r.state;
    }
    acc.ipzAbs.push(ipzAbs / 7);
    acc.moy.push(fin.find((x) => x.uid === 'moi').moyenne);
  }
  const m = (l) => Math.round(l.reduce((a, b) => a + b, 0) / l.length * 10) / 10;
  rows.push({ strategie: nom, 'IPZ jours 4-10': m(acc.ipzAbs), 'moral j10': m(acc.moral), 'satisf. j10': m(acc.sat), 'budget j10': m(acc.budget), 'IPZ j13 (retour)': m(acc.ipz14), 'moyenne classement': m(acc.moy) });
}
console.log(`Adjoint, ${SEEDS} graines (absence du jour 4 au jour 10)`);
console.table(rows);
