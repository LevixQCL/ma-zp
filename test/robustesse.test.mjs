// Ordres ou profils malformés : la résolution ne doit jamais planter ni produire de NaN.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';

function partie() {
  const st = createGame({ seed: 'robuste', turnDeadline: Date.UTC(2026, 9, 23, 18) });
  for (const b of BOT_PROFILES) st.zones[b.uid] = newZone(b, 1);
  st.zones.moi = newZone({ uid: 'moi', code: '5324', nom: 'Horizon' }, 1);
  return st;
}
const ordresBots = (st) => Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, botOrders(st.zones[b.uid], st, b.style)]).filter(([, o]) => o));
const finis = (z) => ['budget', 'moral', 'satisfaction', 'reputation', 'criminalite', 'paperasse', 'ipz', 'ipzSomme', 'agents'].every((k) => Number.isFinite(z[k]));

const MECHANTS = ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'];
const variantes = [];
for (const k of MECHANTS) {
  variantes.push({ rythme: k }, { aide: { cible: k, budget: 5 } }, { manoeuvre: { type: 'signalement', cible: k } }, { duel: { cible: k, ind: 'satisfaction' } },
    { fipa: { id: 'x', invite: k, moi: 2, lui: 2 } }, { renfort: { cible: k, agents: 2 } }, { decision: { type: 'agrandir', batiment: k } },
    { decision: { type: 'construire', infra: k } }, { secteurs: { [k]: 3 } }, { patrouilles: { [k]: 2 } });
}
variantes.push({ alloc: { intervention: Infinity, proximite: 1e308, recherche: NaN, roulage: -5, admin: '3' } }, { depenses: { reserve: Infinity, reserveService: 'constructor' } }, { evenement: Infinity });

for (const v of variantes) {
  const st = partie();
  const orders = { ...ordresBots(st), moi: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, ...v } };
  let r;
  assert.doesNotThrow(() => { r = resolveTurn(st, { orders, nextWeekday: 2 }); }, `ordres ${JSON.stringify(v)}`);
  for (const z of Object.values(r.state.zones)) assert.ok(finis(z), `valeurs finies après ${JSON.stringify(v)}`);
  assert.equal(Object.prototype.budget, undefined, 'Object.prototype intact');
}

// Profils : couleur et décor farfelus ignorés.
{
  const st = partie();
  const players = { moi: { couleur: { gros: 'x'.repeat(1000) }, decor: { facade: 'constructor' }, earlyBird: { skin: 'toString:x' } }, 'bot-canal': { couleur: '#12AB9f' } };
  const r = resolveTurn(st, { orders: ordresBots(st), players, nextWeekday: 2 });
  assert.notEqual(typeof r.state.zones.moi.couleur, 'object');
  assert.equal(r.state.zones['bot-canal'].couleur, '#12AB9f');
  assert.notEqual(r.state.zones.moi.decor.facade, 'constructor');
}

// Entraide entre deux zones qui vont bien : la réputation ne tombe qu'une fois par semaine pour la paire.
{
  let st = partie();
  let gains = 0;
  for (let t = 1; t <= 6; t++) {
    const orders = { ...ordresBots(st), moi: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, aide: { cible: 'bot-canal', budget: 10 } } };
    orders['bot-canal'] = { ...(orders['bot-canal'] || { alloc: {} }), aide: { cible: 'moi', budget: 10 } };
    const r = resolveTurn(st, { orders, nextWeekday: (t + 1) % 7 });
    for (const u of ['moi', 'bot-canal']) gains += r.gazette.rapports[u].filter((l) => l.startsWith('Entraide : tu envoies') && /\+\d+ de réputation/.test(l)).length;
    st = r.state;
  }
  assert.equal(gains, 1, 'une seule entraide récompensée sur 6 tours pour la même paire');
}

// Résolution déterministe : même entrée, même sortie (y compris les inscriptions par le filet de sécurité).
{
  const st = partie();
  const players = { nouveau: { code: '5999', nom: 'Neuf', couleur: '#5AB0F0' } };
  const a = JSON.stringify(resolveTurn(st, { orders: ordresBots(st), players, nextWeekday: 2 }).state);
  const b = JSON.stringify(resolveTurn(st, { orders: ordresBots(st), players, nextWeekday: 2 }).state);
  assert.equal(a, b);
}

console.log(`OK : robustesse (${variantes.length} ordres malformés, profils, entraide en boucle, déterminisme).`);

// Document d'état allégé : rapports, journaux et relevés partent dans la Gazette, et l'appareil les y relit.
{
  const { allegerEtat, completerDepuisGazette } = await import('../js/data/resolver.js');
  const st = partie();
  const r = resolveTurn(st, { orders: ordresBots(st), nextWeekday: 2 });
  const lignes = r.state.zones.moi.rapport.slice(), compta = r.state.zones.moi.compta;
  const avant = JSON.stringify(r.state).length;
  const leger = JSON.parse(JSON.stringify(allegerEtat(r.state, r.gazette)));
  const gaz = JSON.parse(JSON.stringify({ ...r.gazette, date: 123 }));
  leger.lastResolvedAt = 123;
  assert.ok(JSON.stringify(leger).length < avant * 0.75, 'au moins un quart de place gagnée');
  assert.equal(leger.zones.moi.rapport, undefined);
  completerDepuisGazette(leger, [gaz]);
  completerDepuisGazette(leger, [gaz]); // deux fois : pas de doublon
  assert.deepEqual(leger.zones.moi.rapport, lignes);
  assert.deepEqual(leger.zones.moi.compta, JSON.parse(JSON.stringify(compta)));
  assert.ok(leger.zones.moi.journal && leger.zones.moi.journal.lignes);
  // Le tour suivant se résout normalement à partir de l'état allégé.
  const r2 = resolveTurn(leger, { orders: ordresBots(leger), nextWeekday: 3 });
  assert.ok(r2.gazette.rapports.moi.length > 3);
}
console.log('OK : état allégé (rapports relus depuis la Gazette).');
