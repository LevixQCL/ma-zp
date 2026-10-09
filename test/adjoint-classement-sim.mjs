// Simulation : les soirs tenus par l'adjoint comptent au classement avec une décote (CLASSEMENT.decoteAbsent).
// Usage : node test/adjoint-classement-sim.mjs [graines=8] [décote=valeur du jeu]. Objectif : jouer un jour sur deux, même avec
// un adjoint fort, ne doit pas battre la moyenne d'une zone présente tous les jours (décote 4 : 58,9 contre 59,5 ; à 8, un joueur occasionnel perdait 4 points, trop dur).
const R = new URL('../js/engine/', import.meta.url).href;
const { createGame, resolveTurn } = await import(R + 'resolve.js');
const { BOT_PROFILES, botOrders } = await import(R + 'bots.js');
const { newZone } = await import(R + 'zone.js');
const { creerChef, XP_CUMUL } = await import(R + 'chef.js');

const { adaptatif } = await import('./strat-adaptatif.mjs');
const SEEDS = Number(process.argv[2] || 10);
const { CLASSEMENT } = await import(R + 'constants.js'); if (process.argv[3] != null) CLASSEMENT.decoteAbsent = Number(process.argv[3]);
const S = {
  'Présent 14/14 (adaptatif)': { p: () => true },
  'Présent 14/14 (bot équilibré)': { p: () => true, bot: true },
  'Joue j1-5 puis absent, pilote auto (ancien)': { p: (t) => t <= 5, ancien: true },
  'Joue j1-5 puis absent, adjoint Cdt 0': { p: (t) => t <= 5, cdt: 0 },
  'Joue j1-5 puis absent, adjoint Cdt 10 offensif': { p: (t) => t <= 5, cdt: 10, c: 'offensif' },
  'Joue j1-5 puis absent, adjoint Cdt 10 équilibré': { p: (t) => t <= 5, cdt: 10 },
  'Joue 1 jour sur 2, adjoint Cdt 10': { p: (t) => t % 2 === 1, cdt: 10 },
  'Joue 1 jour sur 2, adjoint Cdt 0': { p: (t) => t % 2 === 1, cdt: 0 },
};
const rows = [];
for (const [nom, o] of Object.entries(S)) {
  const moy = [], rang = [], vsBot = [], classe = [];
  for (let s = 0; s < SEEDS; s++) {
    let st = createGame({ seed: `adj2-${s}`, regles: 2 });
    for (const b of BOT_PROFILES) st.zones[b.uid] = newZone(b, 1);
    st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    const c = creerChef({}); c.xp.commandement = XP_CUMUL[o.cdt || 0]; st.zones.moi.chef = c;
    const players = { moi: { chef: { consigne: o.c || 'equilibre' } } };
    for (let t = 1; t <= 14; t++) {
      const orders = {};
      for (const b of BOT_PROFILES) { const x = botOrders(st.zones[b.uid], st, b.style); if (x) orders[b.uid] = x; }
      if (o.p(t)) orders.moi = o.bot ? botOrders(st.zones.moi, st, 'equilibre') : adaptatif(st.zones.moi, st);
      if (o.ancien) delete st.zones.moi.adjoint;
      const r = resolveTurn(st, { orders, quests: {}, players, nextWeekday: (t + 1) % 7 });
      if (t === 14) { const cl = r.gazette.classement; const me = cl.find((x) => x.uid === 'moi'); moy.push(me.moyenne); classe.push(me.classe ? 1 : 0);
        const bots = cl.filter((x) => x.uid !== 'moi').map((x) => x.moyenne); vsBot.push(me.moyenne - bots.reduce((a, b) => a + b, 0) / bots.length);
        rang.push(cl.findIndex((x) => x.uid === 'moi') + 1); }
      st = r.state;
    }
  }
  const m = (l) => Math.round(l.reduce((a, b) => a + b, 0) / l.length * 100) / 100;
  rows.push({ nom, 'moyenne classement': m(moy), 'écart vs robots': m(vsBot), rang: m(rang), classé: m(classe) });
}
console.table(rows);
