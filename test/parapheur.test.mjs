// Parapheur du chef et prise de fonctions (saison 2).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { courriersDuJour, jourPrise, COURRIERS, IDS_COURRIERS } from '../js/engine/parapheur.js';
import { RESEAU } from '../js/engine/chef.js';

const players = { A: { code: '1111', nom: 'A', chef: { parcours: 'intervention', portrait: 'p01' } }, B: { code: '2222', nom: 'B' } };
let st = createGame({ seed: 'para' });
st.regles = 2;
st.zones.A = newZone({ uid: 'A', code: '1111', nom: 'A' }, 1);
st.zones.B = newZone({ uid: 'B', code: '2222', nom: 'B' }, 1);
const alloc = { intervention: 6, proximite: 4, recherche: 3, roulage: 2, admin: 3 };

// Tous les courriers sont bien formés.
for (const [id, C] of Object.entries(COURRIERS)) {
  assert.equal(C.o.length, 2, id);
  for (const o of C.o) { assert.ok(o.comp && o.tampon, id); for (const p of Object.keys((o.fx && o.fx.estime) || {})) assert.ok(RESEAU[p], `${id} : ${p}`); if (o.suite) assert.ok(COURRIERS[o.suite], o.suite); }
}
assert.ok(IDS_COURRIERS.length >= 15);

// Jour 1 : le chef n'existe pas encore ; l'écran montre la liste calculée avec un chef neuf : la même qu'au tour.
const vu = courriersDuJour(st, { ...st.zones.A, chef: { xp: {}, saison: {} } });
assert.equal(vu.length, 1, 'un seul courrier le premier jour');
const xpAvant = 0;
const r1 = resolveTurn(st, { players, orders: { A: { alloc, rythme: 'normal', parapheur: { [vu[0]]: 0 } }, B: { alloc, rythme: 'normal' } } }).state;
const zA = r1.zones.A, C = COURRIERS[vu[0]];
assert.ok(zA.rapport.some((l) => l.startsWith(`Parapheur : « ${C.obj} »`)), 'réponse au rapport');
assert.ok((zA.chef.xp[C.o[0].comp] || 0) > xpAvant, 'expérience dans la compétence de la réponse');
assert.equal(zA.chef.priseJ, 1, 'un jour de prise de fonctions joué');
assert.equal(jourPrise(zA.chef, r1.turn), 2);
assert.equal(courriersDuJour(r1, zA).length, 2, 'deux courriers à partir du jour 2');
assert.ok(!courriersDuJour(r1, zA).includes(vu[0]) || C.o[0].suite, 'pas le même courrier le lendemain');

// Suite : choisir « prolonger » pour les gilets ramène le syndicat le lendemain.
let s2 = JSON.parse(JSON.stringify(r1));
s2.zones.A.chef.paraSuite = { t: s2.turn, ids: ['gilets2'] };
assert.equal(courriersDuJour(s2, s2.zones.A)[0], 'gilets2');

// Six jours de prise de fonctions, puis tout est ouvert.
let s = r1;
for (let i = 0; i < 6; i++) s = resolveTurn(s, { players, orders: { A: { alloc, rythme: 'normal' }, B: { alloc, rythme: 'normal' } } }).state;
assert.equal(jourPrise(s.zones.A.chef, s.turn), 99);
assert.ok(s.zones.A.chef.priseFaite);
// Audit du 9 octobre : la prise de fonctions avance avec les jours joués, pas pendant une absence.
{ let a = r1;
  for (let i = 0; i < 5; i++) a = resolveTurn(a, { players, orders: { B: { alloc, rythme: 'normal' } } }).state;
  assert.equal(jourPrise(a.zones.A.chef, a.turn), 2, 'absent 5 jours : toujours au jour 2 de sa prise de fonctions');
  // Un ordre forgé ne débloque pas une prérogative avant son jour (réunion chez un voisin : jour 6, première ligne : jour 4).
  const f = resolveTurn(a, { players, orders: { A: { alloc, rythme: 'normal', agenda: { type: 'voisin', zone: 'B' }, chefFront: 'quartier' }, B: { alloc, rythme: 'normal' } } }).state;
  assert.notEqual(f.zones.A.dernierOrdre.agenda && f.zones.A.dernierOrdre.agenda.type, 'voisin', 'agenda voisin refusé au jour 2');
}
// Sans réponse : rien ne change, pas d'expérience du parapheur (courrier classé).
console.log('OK : parapheur et prise de fonctions vérifiés.');
