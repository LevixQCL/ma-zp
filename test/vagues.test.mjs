// Vagues de délinquance : règles de base (la relève a été retirée en saison 4).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { zonesVoisines } from '../js/engine/vagues.js';

const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
const SPE = { intervention: 5, proximite: 11, recherche: 2, roulage: 1, admin: 1 };
let st = createGame({ seed: 'vt' });
for (let i = 0; i < 6; i++) st.zones[`z${i}`] = newZone({ uid: `z${i}`, code: String(5300 + i), nom: `Z${i}` }, 1);
let vue = 0, versNouveau = 0;
for (let t = 1; t <= 8; t++) {
  if (t === 5) st.zones.neuf = newZone({ uid: 'neuf', code: '5399', nom: 'Neuve' }, 5);
  const orders = {};
  for (const u of Object.keys(st.zones)) orders[u] = { alloc: u === 'z0' ? SPE : BASE, rythme: 'normal' };
  st = resolveTurn(st, { orders }).state;
  for (const v of st.vagues.liste) { vue++; assert.notEqual(v.de, v.vers); if (v.vers === 'neuf') versNouveau++; assert.ok(zonesVoisines(st, v.de)[v.vers], 'vague vers une voisine'); }
  // une seule vague reçue par zone
  const recues = st.vagues.liste.map((v) => v.vers); assert.equal(new Set(recues).size, recues.length);
}
assert.ok(vue > 0, 'la zone spécialisée envoie des vagues');
assert.equal(versNouveau, 0, 'les nouvelles zones sont protégées');

console.log('vagues : ok', { vagues: vue });
