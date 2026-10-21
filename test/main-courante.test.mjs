// Main courante de nuit : moteur déterministe, adjoint, suites, verrou des vagues.
import assert from 'node:assert/strict';
import { genererNuit, jouerNuit, equipesDe, distancesZone, vagueEnCours, resultat, MC } from '../js/engine/main-courante.js';

const cells = [1, 2, 3, 4, 5, 6];
const adj = { 1: [2, 3, 4, 5, 6], 2: [1, 3], 3: [1, 2, 4], 4: [1, 3, 5], 5: [1, 4, 6], 6: [1, 5] };
const dist = distancesZone(cells, adj);
const zone = { niveaux: { intervention: 1, proximite: 1, roulage: 1 } };
const equipes = equipesDe(zone, { capitale: 1, autre: 2, vehicules: 4 });
let ok = 0;

// 1. Même graine, même nuit ; graine différente, autre nuit.
const a1 = genererNuit('t-1', cells), a2 = genererNuit('t-1', cells), a3 = genererNuit('t-2', cells);
assert.deepEqual(a1, a2); assert.notDeepEqual(a1, a3); ok++;
// 2. 8 ou 9 appels, triés, créneaux 0 à 11, gravité réelle 1 ou 3 pour les flous.
for (let g = 0; g < 200; g++) {
  const ap = genererNuit(`g${g}`, cells);
  assert.ok(ap.length >= 8 && ap.length <= 9);
  for (let i = 1; i < ap.length; i++) assert.ok(ap[i].s >= ap[i - 1].s);
  for (const a of ap) { assert.ok(a.s >= 0 && a.s <= 11); if (a.flou) assert.ok([1, 3].includes(a.gReel)); assert.ok(cells.includes(a.cell)); }
}
ok++;
// 3. Résolution déterministe et points = somme des résultats.
for (let g = 0; g < 200; g++) {
  const ap = genererNuit(`r${g}`, cells);
  const p1 = jouerNuit(ap, equipes, { dist, capitale: 1 }), p2 = jouerNuit(ap, equipes, { dist, capitale: 1 });
  assert.deepEqual(p1, p2);
  assert.equal(p1.pts, Object.values(p1.res).reduce((s, r) => s + r.pts, 0));
}
ok++;
// 4. Une bande n'est arrêtée que par le contrôle arrivé dans la demi-heure.
const bande = { tags: ['bande'], g: 3 };
assert.equal(resultat({ comp: ['véhicule', 'bande'] }, bande, 0, 3), 'arretee');
assert.equal(resultat({ comp: ['violence'] }, bande, 0, 3), 'deborde');
assert.equal(resultat({ comp: ['véhicule', 'bande'] }, bande, 2, 3), 'incident');
ok++;
// 5. Un appel mal réglé qui peut reprendre crée une reprise deux heures plus tard, plus grave.
const rixe = [{ id: 'a0', s: 1, cell: 6, titre: 'Rixe', tags: ['violence', 'ivresse'], g: 2, flou: false, suite: true, vague: 0 }];
const pr = jouerNuit(rixe, equipes, { fixe: { a0: 'PA' }, dist, capitale: 1 });
assert.ok(['moyen', 'deborde', 'incident'].includes(pr.res.a0.statut)); assert.equal(pr.suites.length, 1); assert.equal(pr.suites[0].s, 5); assert.equal(pr.suites[0].g, 3);
const pb = jouerNuit(rixe, equipes, { dist, capitale: 1 });
assert.equal(pb.res.a0.statut, 'maitrise'); assert.equal(pb.suites.length, 0);
ok++;
// 6. Ordres : imposer une équipe, reporter ; le rappel n'existe que s'il est demandé.
const ap6 = genererNuit('o6', cells);
const p6 = jouerNuit(ap6, equipes, { fixe: { [ap6[0].id]: 'attente' }, dist, capitale: 1 });
assert.equal(p6.res[ap6[0].id].eq, null);
assert.ok(!('R1' in jouerNuit(ap6, equipes, { dist, capitale: 1 }).occ));
assert.ok('R1' in jouerNuit(ap6, equipes, { fixe: { __rappel: true }, dist, capitale: 1 }).occ);
ok++;
// 7. Vagues : matin, 11 h, 14 h (échéance à 20 h).
const D = Date.UTC(2026, 9, 21, 18); // 20 h à Bruxelles
assert.equal(vagueEnCours(D - 12.5 * 3600e3, D), 0); assert.equal(vagueEnCours(D - 8.5 * 3600e3, D), 1); assert.equal(vagueEnCours(D - 5 * 3600e3, D), 2);
assert.equal(MC.vagues.map((v) => v.ordres).join(), '2,3,4');
ok++;
// 8. La prévision compte un flou à 2, la vraie nuit avec sa gravité réelle.
const flou = [{ id: 'f', s: 2, cell: 1, titre: 'Tapage', tags: ['médiation'], g: 1, flou: true, gReel: 3, suite: false, vague: 0 }];
assert.equal(jouerNuit(flou, equipes, { prevu: true, dist, capitale: 1 }).res.f.g, 2);
assert.equal(jouerNuit(flou, equipes, { dist, capitale: 1 }).res.f.g, 3);
ok++;
console.log(`main-courante : ${ok} vérifications passées`);
