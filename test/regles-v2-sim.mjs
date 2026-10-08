// Révision d'oct. 2026 (lots 1 à 3) : stratégies extrêmes sous les règles v1 et v2, contre les 5 zones robots.
// Usage : node test/regles-v2-sim.mjs [graines] [v1|v2|doctrines]
const R = new URL('../js/engine/', import.meta.url).href;
const { createGame, resolveTurn, buildJoinZone } = await import(R + 'resolve.js');
const { BOT_PROFILES, botOrders } = await import(R + 'bots.js');
const { newZone, operationActive, agentsDisponibles, decisionImpossible, coutDecision } = await import(R + 'zone.js');
const { SERVICES } = await import(R + 'constants.js');

function adaptatif(z, state, opt = {}) {
  const T = state.turn;
  const a = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
  const bump = (s, n) => { a[s] += n; };
  for (const p of z.pressions || []) {
    if (p.effet.incidents || p.effet.bourgmestre) bump('intervention', 2);
    if (p.effet.paperasse) bump('admin', 2);
    if (p.effet.criminalite) bump('proximite', 2);
    if (p.effet.roulageMin) a.roulage = Math.max(a.roulage, 3);
    if (p.effet.parquet) bump('recherche', 2);
  }
  if (z.criminalite > 58) bump('proximite', 2);
  if (z.paperasse > 11) bump('admin', 2);
  if (z.dossiers.length > 3) bump('recherche', 1);
  const op = operationActive(z, T);
  if (op) for (const [s, n] of Object.entries(op.besoins)) bump(s, n);
  const dispo = agentsDisponibles(z, T);
  const ordre = ['roulage', 'recherche', 'proximite', 'admin', 'intervention'];
  let total = SERVICES.reduce((s, k) => s + a[k], 0), i = 0;
  while (total > dispo && i < 500) { const k = ordre[i % ordre.length]; const min = op && op.besoins[k] ? op.besoins[k] : 1; if (a[k] > min) { a[k]--; total--; } i++; }
  while (total < dispo) { a[opt.surplus || 'intervention']++; total++; }
  let decision = null;
  if (opt.builder) {
    const essais = [
      { type: 'construire', infra: 'antenne' }, { type: 'construire', infra: 'sport' }, { type: 'construire', infra: 'audition' }, { type: 'construire', infra: 'tir' }, { type: 'construire', infra: 'logiciel' }, { type: 'construire', infra: 'anpr' },
      { type: 'former', service: 'proximite' }, { type: 'former', service: 'intervention' }, { type: 'former', service: 'recherche' },
      { type: 'equiper', cible: 'proximite' }, { type: 'equiper', cible: 'intervention' },
    ];
    const filtre = opt.builder === true ? essais : essais.filter((d) => d.type === opt.builder);
    decision = (opt.tot && T > opt.tot) ? null : filtre.find((d) => !decisionImpossible(z, d, T) && z.budget - coutDecision(z, d) >= 5) || null;
  }
  const depenses = {};
  let budget = z.budget - (opt.garde ?? 10) - (decision ? coutDecision(z, decision) : 0);
  const achat = (k, cout, v = true) => { if (budget >= cout) { depenses[k] = v; budget -= cout; } };
  if (opt.primeTous) achat('prime', 3);
  if (z.criminalite > 55) achat('prevention', 4);
  if (z.paperasse > 12) achat('soustraitance', 3);
  if (z.moral < 55) achat('prime', 3);
  if (opt.toutDepenser) { achat('prime', 3); achat('prevention', 4); achat('enqueteurs', 3); achat('revision', 2); }
  if (!opt.sansReserve) { const n = Math.min(4, Math.floor(budget / 1.5)); if (n > 0) { depenses.reserve = n; depenses.reserveService = op ? Object.keys(op.besoins)[0] : (opt.reserveService || 'intervention'); } }
  const rythme = opt.rythme || (op && z.moral > 60 ? 'renforce' : z.moral < 45 ? 'allege' : 'normal');
  return { alloc: a, rythme, operation: 'complet', depenses, decision };
}

const ENIG = [{ statut: 'ok', bonus: 'budget' }, { statut: 'ok' }, { statut: 'ok' }];

const MODE = process.argv[3] || 'v2';
const V = MODE === 'v1' ? 1 : 2;
const STRATS = MODE === 'builder' ? { 'Adaptatif (réf.)': {}, 'Builder tout': { builder: true }, 'Builder annexes': { builder: 'construire' }, 'Builder formations': { builder: 'former' }, 'Builder matériel': { builder: 'equiper' }, 'Builder tout, J1-J6': { builder: true, tot: 6 } } : MODE === 'doctrines' ? {
  'Adaptatif sans doctrine': {},
  'Routière (surplus Roulage)': { doctrine: 'routiere', surplus: 'roulage' },
  'De quartier (surplus Proximité)': { doctrine: 'quartier', surplus: 'proximite', reserveService: 'proximite' },
  'Judiciaire (surplus Recherche)': { doctrine: 'judiciaire', surplus: 'recherche' },
  'D’intervention': { doctrine: 'intervention' },
  'Partenaire': { doctrine: 'partenaire' },
} : MODE==='b' ? {
  'Adaptatif (réf.)': {},
  'Allégé + tout dépenser + énigmes': { rythme: 'allege', toutDepenser: true, garde: 0, enig: true },
  'Normal + tout dépenser + énigmes': { toutDepenser: true, garde: 0, enig: true },
  'Allégé, sans réserve ni dépense': { rythme: 'allege', sansReserve: true, garde: 999 },
  'Normal, sans réserve ni dépense': { rythme: 'normal', sansReserve: true, garde: 999 },
  'Renforcé, sans réserve ni dépense': { rythme: 'renforce', sansReserve: true, garde: 999 },
  'Allégé + prime tous les jours': { rythme: 'allege', primeTous: true },
} : {
  'Adaptatif (réf.)': {},
  'Adaptatif + énigmes 3/3 chaque jour': { enig: true },
  'Adaptatif + builder (1 grande décision/jour)': { builder: true },
  'Adaptatif + prime chaque jour': { primeTous: true },
  'Adaptatif + tout dépenser': { toutDepenser: true, garde: 0 },
  'Adaptatif rythme renforcé tjrs': { rythme: 'renforce' },
  'Adaptatif rythme allégé tjrs': { rythme: 'allege' },
  'Adaptatif sans réserve (garde l’argent)': { sansReserve: true },
  'Surplus en Proximité': { surplus: 'proximite', reserveService: 'proximite' },
  'Joue J1-J5 puis abandonne': { stop: 5 },
  'Arrive J9, joue J9-J14': { arrive: 9 },
  'Joue 1 jour sur 2': { unSurDeux: true },
  'Jamais joué (pilote auto)': { jamais: true },
};

const SEEDS = Number(process.argv[2] || 12);
const rows = [];
for (const [nom, opt] of Object.entries(STRATS)) {
  const ipz = [], rang = [], budg = [];
  for (let s = 0; s < SEEDS; s++) {
    let state = createGame({ seed: `ext-${s}`, regles: V });
    for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
    if (!opt.arrive) state.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
    let fin = null;
    for (let t = 1; t <= 14; t++) {
      if (opt.arrive && t === opt.arrive) state.zones.moi = buildJoinZone(state, 'moi', { code: '5324', nom: 'Horizon' }, t, 0);
      const orders = {};
      for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
      const z = state.zones.moi;
      const joue = z && !opt.jamais && !(opt.stop && t > opt.stop) && !(opt.unSurDeux && t % 2 === 0);
      if (joue) orders.moi = { ...adaptatif(z, state, opt), ...(opt.doctrine ? { doctrine: opt.doctrine } : {}) };
      const quests = joue && opt.enig ? { moi: ENIG } : {};
      const r = resolveTurn(state, { orders, quests, nextWeekday: (t + 1) % 7 });
      if (t === 14) fin = r.gazette.classement; else state = r.state;
      if (t === 13 && state.zones.moi) budg.push(state.zones.moi.budget);
    }
    const c = fin.find((x) => x.uid === 'moi');
    ipz.push(c.moyenne);
    const cl = fin.filter((x) => x.classe);
    rang.push(c.classe ? cl.findIndex((x) => x.uid === 'moi') + 1 : NaN);
  }
  const m = (l) => Math.round(l.reduce((a, b) => a + b, 0) / l.length * 10) / 10;
  const sd = (l) => { const mu = l.reduce((a, b) => a + b, 0) / l.length; return Math.round(Math.sqrt(l.reduce((a, b) => a + (b - mu) ** 2, 0) / l.length) * 10) / 10; };
  rows.push({ strategie: nom, 'IPZ classement': m(ipz), 'σ entre graines': sd(ipz), 'rang /6': m(rang.filter(Number.isFinite)), 'non classé': rang.filter((x) => !Number.isFinite(x)).length, 'budget J13': m(budg) });
}
console.log(`Règles v${V}, ${SEEDS} graines`);
console.table(rows);
