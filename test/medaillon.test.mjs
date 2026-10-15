// Quatrième affaire écrite (« Quatre-vingt-quatorze secondes », sans meurtre) : cohérence, mandat jamais avant le jour 3,
// recoupements, déclic, hypothèse au juge, confrontation (la perquisition compte double), variante b, photos.
import assert from 'node:assert/strict';
import { affaire, candidats, confrontationOk, mandatOk, pieceDemarche, texteFait, titrePiece, pieceRecoupement, recoupementDe, pieceReaudition, MEDAILLON, VARIANTES_ECRITES } from '../js/engine/enquete.js';
import { LIEUX_MEDAILLON, RECOUPEMENTS, RELECTURES, COUPS_DE_POUCE, CRENEAUX, EVENEMENTS } from '../js/engine/medaillon-mayeur.js';
import { dossierAffaire3 } from '../js/engine/dossier.js';
import { photoIndice } from '../js/ui/indices-photo.js';
import { POINTS_SCENE_MEDAILLON } from '../js/ui/medaillon-visuels.js';
import { existsSync } from 'node:fs';

assert.equal(MEDAILLON.actif, false, 'inactive tant que le maître du jeu ne l’a pas validée');
assert.deepEqual(VARIANTES_ECRITES.medaillon, ['a', 'b']);
const st0 = { seed: 'm', meurtreDes: 2, meurtre2Des: 4, corbeauDes: 5, medaillonDes: 6 };

for (const v of ['a', 'b']) {
  const a = affaire({ ...st0, variantes: { 6: v } }, 6);
  assert.equal(a.cas, 'medaillon');
  assert.equal(a.variante, v === 'b' ? 'b' : undefined);
  const REB = Object.values(a.rebonds).map((r) => r.f);
  for (const f of [...a.faits, ...REB]) { assert.ok(texteFait(a, f).length > 40, `${v} ${f}`); assert.ok(titrePiece(a, f) && !/undefined/.test(titrePiece(a, f)), `${v} titre ${f}`); }
  for (const s of a.suspects) { assert.ok(LIEUX_MEDAILLON[s.alibi.pos], s.nom); assert.ok(existsSync(s.photo), s.photo); }
  for (const l of Object.values(LIEUX_MEDAILLON)) assert.ok(l.adresse);
  const publics = new Set(['doc:journal', 'doc:pvc', ...a.suspects.map((_, i) => `A:${i}`), ...REB]);
  const existe = (f) => a.faits.includes(f) || publics.has(f);
  for (const r of a.recoupements) for (const p of r.paires) for (const f of p) assert.ok(existe(f), `${v} recoupement ${r.f} : ${f}`);
  for (const [f, l] of Object.entries(a.relectures)) { assert.ok(existe(f), f); for (const x of l) assert.ok(existe(x.si), x.si); }
  for (const e of a.evenements) assert.ok(existe(e.f), e.id);
  for (const [i, l] of Object.entries(a.charges)) for (const f of l) assert.ok(existe(f), `${v} mandat ${i} ${f}`);
  for (const f of [...a.confront.decisives, ...a.confront.accablantes]) assert.ok(existe(f), `${v} confrontation ${f}`);
  for (const f of a.confront.decisives) assert.ok(a.confront.accablantes.includes(f), `${v} décisive mais pas accablante : ${f}`);
  for (const [i, l] of Object.entries(a.innocente)) for (const x of l) for (const f of [].concat(x)) assert.ok(existe(f), `${v} innocente ${i} ${f}`);
  for (const d of a.declics) for (const f of [...d.si, d.f]) assert.ok(existe(f), `${v} déclic ${f}`);
  // Avec tout le dossier, un seul suspect reste ; avec la scène seule, personne n'est écarté.
  const tout = [...a.faits, ...REB];
  assert.deepEqual(candidats(a, tout).suspects, [a.coupable], `${v} : un seul suspect au bout`);
  assert.equal(candidats(a, [...Object.values(a.sceneSeq).flat(), ...REB]).suspects.length, 5, `${v} : la scène seule n’écarte personne`);
  // Aucune décisive n'est publique ; mandat refusé sans pièce.
  for (const f of a.confront.decisives) assert.ok(!publics.has(f) && !f.startsWith('c:'), `${v} : ${f} décisive mais publique`);
  assert.equal(mandatOk(a, { pieces: [] }, a.coupable), false);
  // Confrontation : deux décisives ; la perquisition compte double ; jamais l'autre.
  const [d1, d2] = a.confront.decisives.filter((f) => !f.startsWith('moy:'));
  const autre = a.confront.accablantes.find((f) => !a.confront.decisives.includes(f));
  assert.ok(confrontationOk(a, a.coupable, [d1, d2, autre]), `${v} : deux décisives`);
  assert.ok(!confrontationOk(a, a.coupable, [d1, autre, 'doc:pvc']), `${v} : une seule décisive`);
  assert.ok(confrontationOk(a, a.coupable, [`moy:${a.coupable}`, autre, 'doc:pvc']), `${v} : la perquisition compte double`);
  assert.ok(!confrontationOk(a, v === 'b' ? 4 : 2, [d1, d2, autre]), `${v} : l’autre n’avoue pas`);
  assert.ok(!confrontationOk(a, a.coupable, ['doc:journal', 'doc:pvc', `A:${a.coupable}`]), `${v} : les documents publics ne suffisent pas`);
  // Hypothèse : la vérité (coupable, 18:32-19:06) n'est contredite par rien ; les autres créneaux le sont.
  const K = new Set(tout);
  assert.deepEqual(a.evaluer(K, a.coupable, 1).contre, [], `${v} : vérité contredite`);
  for (const s of [0, 2, 3, 4]) assert.ok(a.evaluer(K, a.coupable, s).contre.length > 0, `${v} : mauvais créneau ${s}`);
  for (const i of [0, 1, 3]) for (let s = 0; s < CRENEAUX.length; s++) assert.ok(a.evaluer(K, i, s).contre.length > 0, `${v} : innocent ${i} créneau ${s}`);
  // Le récit du premier jour est bien formé et identique dans les deux variantes.
  const d3 = dossierAffaire3('m', a);
  assert.ok(!/undefined|NaN/.test(JSON.stringify(d3)));
  assert.ok(d3.pvc.lignes.some((l) => /deux mètres/.test(l)), 'le détail sous les yeux est dans le PV');
  // Photos : toutes rendues sans erreur, et les images existent.
  for (const f of [...a.faits, ...REB]) { const p = photoIndice(a, f); for (const m of p.matchAll(/href="(img\/[^"]+)"/g)) assert.ok(existsSync(m[1]), m[1]); }
}
// Documents du premier jour identiques dans les deux variantes (on ne reconnaît la variante qu'en enquêtant).
{
  const A = affaire({ ...st0, variantes: { 6: 'a' } }, 6), B = affaire({ ...st0, variantes: { 6: 'b' } }, 6);
  assert.equal(JSON.stringify(dossierAffaire3('m', A)), JSON.stringify(dossierAffaire3('m', B)));
  for (const f of [...Object.values(A.sceneSeq).flat(), ...Object.values(A.rebonds).map((r) => r.f)]) assert.equal(texteFait(A, f), texteFait(B, f), `scène/rebond identique : ${f}`);
  assert.deepEqual(A.suspects.map((s) => s.fiche), B.suspects.map((s) => s.fiche));
}

// Variante a : le détail clé, les chemins des décisives, le mandat jamais avant le jour 3.
const a = affaire(st0, 6);
assert.equal(a.coupable, 4);
assert.equal(pieceRecoupement(a, { pieces: [] }, 'c:expert', 'doc:pvc'), 'x:savait');
assert.equal(pieceRecoupement(a, { pieces: [] }, 'occ:4', 'c:convoyeur'), 'x:garde');
assert.equal(pieceRecoupement(a, { pieces: [] }, 'r:anvers', 'mob:4'), 'x:anvers');
assert.equal(pieceRecoupement(a, { pieces: [] }, 'c:copie', 'moy:0'), 'x:modele');
assert.equal(recoupementDe(a, 'c:vitrine', 'occ:3'), null);
assert.equal(pieceReaudition(a, { pieces: [{ f: 'c:expert' }] }, 4, 'c:expert'), 'Rb:4');
assert.equal(pieceDemarche(a, { pieces: [] }, 'temoin'), 'c:convoyeur');
assert.equal(pieceDemarche(a, { pieces: [{ f: 'c:convoyeur' }] }, 'temoin'), 'c:expert');
// La restauratrice est écartée par la copie elle-même ; Mireille a une vraie faute (sa perquisition l'accable).
assert.ok(candidats(a, ['c:copie', 'moy:0', 'x:modele']).suspects.every((i) => i !== 0));
assert.equal(POINTS_SCENE_MEDAILLON.length, 10);
assert.equal(COUPS_DE_POUCE.length, 6);
for (const c of COUPS_DE_POUCE) assert.deepEqual(c.niveaux.map(([j]) => j), [2, 4, 6]);
assert.ok(EVENEMENTS.length > 10 && RECOUPEMENTS.length === 8 && Object.keys(RELECTURES).length > 4);
console.log('medaillon : OK');
