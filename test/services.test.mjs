// Deuxième effet de chaque service : voisinage (Recherche), flagrant délit (Intervention), assurance (Accueil).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { chanceVoisinage, VOISINAGE } from '../js/engine/enquete.js';

const players = { a: { code: '1111', nom: 'A', couleur: '#f00' } };
let st = resolveTurn(createGame({ seed: 'svc' }), { players }).state;
// Voisinage : rien sous 2 unités, plus fort avec une piste, plafonné.
assert.equal(chanceVoisinage(st, 'a', 2, null), 0);
assert.ok(chanceVoisinage(st, 'a', 6, 0) > chanceVoisinage(st, 'a', 6, null) || !st.enquete, 'la piste concentre les recherches');
assert.ok(chanceVoisinage(st, 'a', 50, null) <= VOISINAGE.max);

const compte = { vois: 0, flag: 0, evite: 0, retard: 0 };
for (let t = 0; t < 40; t++) {
  const alloc = { intervention: 9, proximite: 3, recherche: 4, roulage: 1, admin: 3 };
  const o = { alloc, piste: st.enquete ? 0 : null };
  st = resolveTurn(st, { orders: { a: o }, players }).state;
  const r = st.zones.a.rapport;
  compte.vois += r.filter((l) => l.startsWith('Enquête de voisinage') && l.includes('rapportent')).length;
  compte.flag += r.filter((l) => l.startsWith('Flagrant délit')).length;
  compte.evite += r.filter((l) => l.startsWith('Évité')).length;
  compte.retard += r.filter((l) => l.includes('retardée')).length;
  assert.ok(st.zones.a.agents >= 0);
}
assert.ok(compte.vois > 0, 'la Recherche rapporte des pièces');
assert.ok(compte.flag > 0, 'des flagrants délits arrivent avec une Intervention en marge');
console.log('OK : services', JSON.stringify(compte));
