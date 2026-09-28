// Teste le mode démo de bout en bout : inscription, ordres, quête, résolution, Gazette.
import assert from 'node:assert/strict';
import { createLocalBackend } from '../js/data/local.js';
import { resolvePending } from '../js/data/resolver.js';

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };

const b = createLocalBackend({ seed: 'test', resolutionHour: 20 });
assert.equal(await b.init(), null);
const u = await b.signInDemo();
await b.savePlayer(u.uid, { code: '5324', nom: 'Horizon', couleur: '#5AB0F0' });
await b.joinGame(u.uid, { code: '5324', nom: 'Horizon', couleur: '#5AB0F0' });
let s = await b.getState();
assert.ok(s.zones.moi, 'zone créée immédiatement');
assert.equal(Object.keys(s.zones).length, 6);

for (let i = 0; i < 15; i++) {
  s = await b.getState();
  await b.saveOrders('moi', s.season, s.turn, { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal', decision: i === 1 ? { type: 'construire', infra: 'sport' } : null, engagements: s.affaires[0] ? { [s.affaires[0].id]: { agents: 3, partenaire: null } } : {}, evenement: s.evenement && s.evenement.tour === s.turn ? 3 : 0 });
  await b.saveQuest('moi', s.season, s.turn, 0, { statut: 'ok' }); await b.saveQuest('moi', s.season, s.turn, 1, { statut: 'ok', bonus: 'budget' }); await b.saveQuest('moi', s.season, s.turn, 2, { statut: 'rate' });
  await b.adminForceResolution();
  const n = await resolvePending(b, { hour: 20 });
  assert.equal(n, 1, 'un tour résolu');
  const g = await b.getGazette(s.season, s.turn);
  assert.ok(g && g.une && g.une.titre, 'gazette');
  if (i === 0) console.log('Une du tour 1 :', g.une.titre, '|', g.rapports.moi.join(' / '));
  if (g.finSaison) console.log('Fin de saison :', g.finSaison.titres.map((t) => t.titre).join(', '));
}
s = await b.getState();
console.log('État final : saison', s.season, 'tour', s.turn, '| PS de moi :', s.zones.moi.ps);
assert.equal(s.season, 2);
// Pas de résolution avant l'heure.
assert.equal(await resolvePending(b, { hour: 20 }), 0);
// Plusieurs parties : création, code, séparation des données.
const demoTurn = (await b.getState()).turn;
const id2 = await b.createParty('moi', 'Brigade de nuit');
assert.equal(b.gameId(), id2);
const s2 = await b.getState();
assert.ok(!s2.zones.moi, 'nouvelle partie : pas encore de zone');
await b.savePlayer('moi', { code: '7777', nom: 'Nuit', couleur: '#5AB0F0' });
await b.joinGame('moi', { code: '7777', nom: 'Nuit', couleur: '#5AB0F0' });
assert.equal((await b.getState()).zones.moi.nom, 'Nuit');
const code2 = b.gameMeta().code;
assert.equal(code2.length, 6);
await b.useGame('demo');
assert.equal((await b.getState()).zones.moi.nom, 'Horizon', 'la partie de démo est intacte');
assert.equal((await b.getState()).turn, demoTurn);
assert.equal(await b.joinByCode('moi', code2), id2);
assert.equal((await b.listMyParties('moi')).length, 2);
await assert.rejects(() => b.joinByCode('moi', 'XXXXXX'));
console.log('OK : mode démo vérifié (avec plusieurs parties).');
