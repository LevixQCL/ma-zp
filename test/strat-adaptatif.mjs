const R = new URL('../js/engine/', import.meta.url).href;const { operationActive, agentsDisponibles, decisionImpossible, coutDecision } = await import(R + 'zone.js');const { SERVICES } = await import(R + 'constants.js');
export function adaptatif(z, state) {
  const T = state.turn;
  const a = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
  for (const p of z.pressions || []) {
    if (p.effet.incidents || p.effet.bourgmestre) a.intervention += 2;
    if (p.effet.paperasse) a.admin += 2;
    if (p.effet.criminalite) a.proximite += 2;
    if (p.effet.roulageMin) a.roulage = Math.max(a.roulage, 3);
    if (p.effet.parquet) a.recherche += 2;
  }
  if (z.criminalite > 58) a.proximite += 2;
  if (z.paperasse > 11) a.admin += 2;
  if (z.dossiers.length > 3) a.recherche += 1;
  const op = operationActive(z, T);
  if (op) for (const [s, n] of Object.entries(op.besoins)) a[s] += n;
  const dispo = agentsDisponibles(z, T);
  const ordre = ['roulage', 'recherche', 'proximite', 'admin', 'intervention'];
  let total = SERVICES.reduce((s, k) => s + a[k], 0), i = 0;
  while (total > dispo && i < 500) { const k = ordre[i % ordre.length]; const min = op && op.besoins[k] ? op.besoins[k] : 1; if (a[k] > min) { a[k]--; total--; } i++; }
  while (total < dispo) { a.intervention++; total++; }
  const essais = [{ type: 'former', service: 'proximite' }, { type: 'former', service: 'intervention' }, { type: 'equiper', cible: 'intervention' }];
  const decision = essais.find((d) => !decisionImpossible(z, d, T) && z.budget - coutDecision(z, d) >= 5) || null;
  const depenses = {};
  let budget = z.budget - 10 - (decision ? coutDecision(z, decision) : 0);
  const achat = (k, cout, v = true) => { if (budget >= cout) { depenses[k] = v; budget -= cout; } };
  if (z.criminalite > 55) achat('prevention', 4);
  if (z.paperasse > 12) achat('soustraitance', 3);
  if (z.moral < 55) achat('prime', 3);
  { const n = Math.min(4, Math.floor(budget / 1.5)); if (n > 0) { depenses.reserve = n; depenses.reserveService = op ? Object.keys(op.besoins)[0] : 'intervention'; } }
  const rythme = op && z.moral > 60 ? 'renforce' : z.moral < 45 ? 'allege' : 'normal';
  return { alloc: a, rythme, operation: 'complet', depenses, decision, doctrine: 'quartier' };
}
