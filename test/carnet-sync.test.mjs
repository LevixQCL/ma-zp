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
