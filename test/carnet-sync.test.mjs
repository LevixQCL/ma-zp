// Un appareil dont le tableau est vide (première ouverture, vue déplacée) ne doit jamais écraser un carnet rempli.
import assert from 'node:assert/strict';
import { carnetVide, contenuChange } from '../js/ui/carnet-sync.js';

assert.ok(carnetVide({ g: {}, p: {}, notes: '' }));
assert.ok(carnetVide({ g: {}, notes: '', tab: { v: 3, pos: {}, liens: [], places: [], fiches: [], neuf: [], vue: { s: 0.5, tx: 0, ty: 0 } }, maj: Date.now() }), 'tableau seulement regardé = vide');
assert.ok(!carnetVide({ g: { '1:mob': 1 } }), 'une coche compte');
assert.ok(!carnetVide({ p: { 2: 1 } }), 'une marque de planque compte');
assert.ok(!carnetVide({ notes: 'piste A' }), 'une note compte');
assert.ok(!carnetVide({ tab: { places: [{ f: 'occ:1' }] } }), 'une pièce posée compte');
// Ouvrir le tableau (vue enregistrée, listes vides) n'est pas un changement de contenu.
assert.ok(!contenuChange({ g: {}, notes: '' }, { g: {}, notes: '', tab: { v: 3, pos: {}, liens: [], places: [], fiches: [], neuf: [], vue: { s: 1 } } }));
console.log('OK : synchro du carnet protégée contre les tableaux vides.');
// Fusion : le GSM a posé des pièces, le PC en a posé d'autres plus tard : tout se retrouve des deux côtés.
{
  const { fusionner } = await import('../js/ui/carnet-sync.js');
  const gsm = { maj: 100, g: { '1:mob': 1 }, notes: 'piste A', tab: { v: 3, places: ['occ:1', 'moy:2'], liens: [['occ:1', 'S:1']], fiches: [], pos: { 'occ:1': [10, 10] }, neuf: [] } };
  const pc = { maj: 200, g: { '2:occ': 2 }, notes: '', tab: { v: 3, places: ['mob:3'], liens: [], fiches: [], pos: { 'mob:3': [50, 50] }, neuf: [], vue: { s: 0.5 } } };
  const f = fusionner(pc, gsm);
  assert.deepEqual([...f.tab.places].sort(), ['mob:3', 'moy:2', 'occ:1']);
  assert.equal(f.tab.liens.length, 1);
  assert.deepEqual(f.g, { '1:mob': 1, '2:occ': 2 });
  assert.equal(f.notes, 'piste A', 'note non vide gardée');
  assert.deepEqual(f.tab.vue, { s: 0.5 }, 'vue de cet appareil');
  // PC vierge : il prend tout le GSM.
  const vierge = fusionner({ g: {}, notes: '', maj: 999, tab: { v: 3, places: [], liens: [], fiches: [], pos: {}, neuf: [], vue: { s: 1 } } }, gsm);
  assert.deepEqual(vierge.tab.places, gsm.tab.places);
}
console.log('OK : fusion des carnets.');
