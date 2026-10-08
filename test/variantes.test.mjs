// Variantes des affaires écrites : une affaire ouverte avant les variantes ne change pas d'un octet ; la variante est
// tirée à l'ouverture et gardée dans l'état ; chaque variante b est cohérente, résoluble et fair-play, et ses documents
// du premier jour sont ceux de l'histoire d'origine (on ne la reconnaît qu'en enquêtant).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { affaire, candidats, confrontationOk, mandatOk, pieceDemarche, pieceReaudition, pieceRecoupement, texteFait, titrePiece, opposables, nouvelleAffaire, tirerVariante, varianteDe, VARIANTES, ouvrirAffaireMaintenant } from '../js/engine/enquete.js';
import { affaireMeurtre } from '../js/engine/meurtre-mons.js';
import { affaireMeurtreRampe, evaluerHypothese } from '../js/engine/meurtre-rampe.js';
import { affaireCorbeau } from '../js/engine/corbeau-havre.js';
import { dossierAffaire3 } from '../js/engine/dossier.js';
import { construireDebrief, piecesDisculpantes } from '../js/engine/debrief.js';
import { photoIndice } from '../js/ui/indices-photo.js';
import { makeRng } from '../js/engine/rng.js';
import { empreinte, empreinteAffaire, empreintePhotos } from './empreinte-affaire.mjs';

// ── 1. Une affaire ouverte avant les variantes (pas de state.variantes) : strictement l'objet d'avant. ──
// Empreintes relevées sur le code d'avant les variantes (objet complet, fonctions comprises, et photos des pièces).
const AVANT = {
  2: ['Meurtre rue de la Clef', 'f1c0d162ad8d04317d15', 'db0fe0f78ac044e21cdd'],
  4: ['Le notaire de la Rampe', 'e32ec2cfdcc57117fd1d', '4824b334e47ef32a0cbc'],
  5: ['Le corbeau de la rue d’Havré', 'ba003a3f57a674ff454f', '642dd7aa8c9232e8fc9a'],
};
const st0 = { seed: 'empreinte', meurtreDes: 2, meurtre2Des: 4, corbeauDes: 5 };
for (const [n, [titre, e, p]] of Object.entries(AVANT)) {
  for (const st of [st0, { ...st0, variantes: { [n]: 'a' } }]) {
    const a = affaire(st, Number(n));
    assert.equal(a.titre, titre);
    assert.equal(a.variante, undefined, 'l’histoire d’origine ne porte pas de champ variante');
    assert.equal(empreinteAffaire(a), e, `${titre} : l’objet a changé`);
    assert.equal(empreintePhotos(a), p, `${titre} : les photos ont changé`);
  }
}
// Le juge lit l'hypothèse comme avant (Rampe : evaluerHypothese ; corbeau : aff.evaluer).
const AVANT_JUGE = { 4: '996b2fd0835f0cdfda5a', 5: '9fc7ad15c0581b01b84e' };
for (const [n, e] of Object.entries(AVANT_JUGE)) {
  const a = affaire(st0, Number(n));
  const ev = a.evaluer || evaluerHypothese;
  const tout = [...a.faits, ...Object.values(a.rebonds).map((r) => r.f)];
  const rng = makeRng(`hyp:${n}`);
  const out = [];
  for (let k = 0; k < 60; k++) {
    const K = new Set([...opposables(a, { pieces: [] }), ...rng.shuffle(tout.slice()).slice(0, rng.int(0, tout.length))]);
    for (let i = 0; i < 5; i++) for (let s = 0; s < 5; s++) out.push(JSON.stringify(ev(K, i, s)));
  }
  assert.equal(empreinte(out.join('|')), e, `${a.titre} : le juge ne lit plus l’hypothèse pareil`);
}
assert.equal(varianteDe(st0, 4), 'a');

// ── 2. Tirage à l'ouverture, gardé dans l'état. ──
for (const cas of ['clef', 'rampe', 'corbeau']) {
  const vus = new Set(Array.from({ length: 40 }, (_, k) => tirerVariante(`graine${k}`, 3, cas)));
  assert.deepEqual([...vus].sort(), VARIANTES[cas], `${cas} : les deux variantes sortent`);
  assert.equal(tirerVariante('x', 3, cas), tirerVariante('x', 3, cas), 'tirage déterministe');
}
{
  const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
  for (const cas of ['clef', 'rampe', 'corbeau']) {
    let s = createGame({ seed: `tirage-${cas}` });
    s = resolveTurn(s, { players }).state;
    s.meurtreDes = undefined; s.meurtre2Des = undefined;
    assert.ok(ouvrirAffaireMaintenant(s, cas) != null);
    const n = s.enquete.n;
    assert.equal(s.variantes[n], tirerVariante(s.seed, n, cas), `${cas} : tirée à l’ouverture (graine + n° de l’affaire)`);
    assert.equal(affaire(s, n).variante, s.variantes[n] === 'b' ? 'b' : undefined);
    // Le tour suivant ne la retire pas.
    s = resolveTurn(s, { players }).state;
    assert.equal(varianteDe(s, n), tirerVariante(s.seed, n, cas));
  }
  // Une variante déjà posée (la démo) n'est pas retirée ; un vol n'a pas de variante.
  const t = { seed: 'tirage2', zones: {}, enqueteSeq: 0, variantes: { 1: 'b' }, meurtreDes: 1 };
  nouvelleAffaire(t);
  assert.equal(t.variantes[1], 'b');
  nouvelleAffaire(t);
  assert.equal(t.variantes[2], undefined, 'un vol n’a pas de variante');
  // Le débrief d'une affaire close relit sa variante (elle n'est pas dans state.enquete).
  assert.equal(affaire({ ...t, enquete: { n: 2 } }, 1).variante, 'b');
}

// ── 3. Chaque variante b : cohérente, résoluble, fair-play, et pareille à l'origine au premier jour. ──
const publicSuspect = (s) => ({ ...s, coupable: undefined, statut: undefined });
const CAS = [
  { nom: 'clef', A: affaireMeurtre(6, 'a'), B: affaireMeurtre(6, 'b'), reb: ['r:statue', 'r:temoin'] },
  { nom: 'rampe', A: affaireMeurtreRampe(6, 'a'), B: affaireMeurtreRampe(6, 'b'), reb: ['r:tel', 'r:mireille'] },
  { nom: 'corbeau', A: affaireCorbeau(6, 'a'), B: affaireCorbeau(6, 'b'), reb: ['r:odile', 'r:relais'] },
];
for (const { nom, A, B, reb } of CAS) {
  assert.equal(B.variante, 'b');
  assert.notEqual(B.coupable, A.coupable, `${nom} : le coupable change`);
  assert.equal(B.suspects.filter((s) => s.coupable).length, 1);
  assert.ok(B.suspects[B.coupable].coupable);
  // Premier jour : récit, journal, PV, auditions, fiches, rebondissements et pièces de la scène identiques.
  for (const k of ['titre', 'texte', 'recit', 'accroche', 'mobiles', 'mobileVrai', 'creneaux', 'sceneSeq', 'rebonds', 'heure', 'fin', 'lieux']) assert.deepEqual(B[k], A[k], `${nom} : ${k}`);
  assert.deepEqual(B.recit3, A.recit3, `${nom} : journal, PV et auditions`);
  assert.deepEqual(B.suspects.map(publicSuspect), A.suspects.map(publicSuspect), `${nom} : fiches des suspects`);
  for (const f of [...Object.values(A.sceneSeq).flat(), ...reb]) assert.equal(texteFait(B, f), texteFait(A, f), `${nom} : ${f}`);
  assert.deepEqual(dossierAffaire3('v', B), dossierAffaire3('v', A), `${nom} : le dossier papier du premier jour`);

  // Toutes les pièces ont un texte et un titre ; les pièces citées existent.
  const tout = [...B.faits, ...reb];
  for (const f of tout) { assert.ok(texteFait(B, f).length > 40, `${nom} ${f}`); assert.ok(titrePiece(B, f) && !/undefined/.test(titrePiece(B, f)), `${nom} ${f}`); }
  const publics = new Set(['doc:journal', 'doc:pvc', ...B.suspects.map((_, i) => `A:${i}`), ...reb]);
  const existe = (f) => B.faits.includes(f) || publics.has(f);
  for (const [i, t] of Object.entries(B.reactions)) for (const [f, [code]] of Object.entries(t)) { assert.ok(existe(f), `${nom} réaction ${i} ${f}`); assert.ok(B.faits.includes(`${code}:${i}`)); }
  for (const r of B.recoupements || []) for (const p of r.paires) for (const f of p) assert.ok(existe(f), `${nom} recoupement ${r.f} : ${f}`);
  for (const [f, l] of Object.entries(B.relectures || {})) { assert.ok(existe(f), f); for (const x of l) assert.ok(existe(x.si), x.si); }
  for (const e of B.evenements) assert.ok(existe(e.f), `${nom} événement ${e.id}`);
  for (const [i, l] of Object.entries(B.charges)) for (const f of l) assert.ok(existe(f), `${nom} mandat ${i} ${f}`);
  for (const f of [...B.confront.decisives, ...B.confront.accablantes]) assert.ok(existe(f), `${nom} confrontation ${f}`);
  for (const f of B.confront.decisives) assert.ok(B.confront.accablantes.includes(f), `${nom} décisive mais pas accablante : ${f}`);
  for (const [i, l] of Object.entries(B.innocente)) { assert.notEqual(Number(i), B.coupable); for (const x of l) for (const f of [].concat(x)) assert.ok(existe(f), `${nom} innocente ${i} ${f}`); }
  for (const c of B.coupsDePouce || []) assert.deepEqual(c.niveaux.map(([j]) => j), [2, 4, 6]);

  // Avec tout le dossier, seul le coupable reste ; sans pièce qui blanchit, personne n'est écarté.
  assert.deepEqual(candidats(B, tout).suspects, [B.coupable], `${nom} : un seul suspect au bout`);
  assert.equal(candidats(B, [...Object.values(B.sceneSeq).flat(), ...reb]).suspects.length, 5, `${nom} : la scène seule n'écarte personne`);
  // Aucune pièce ne blanchit le coupable ; chaque innocent a sa pièce disculpante (débrief).
  for (const p of piecesDisculpantes(B)) assert.ok(p.fs.length >= 1, `${nom} : innocent ${p.i} sans pièce disculpante`);

  // Confrontation : deux décisives sur le bon suspect ; jamais sur l'ancien coupable ; jamais avec les seuls documents publics.
  const [d1, d2] = B.confront.decisives;
  const [autre, autre2] = B.confront.accablantes.filter((f) => !B.confront.decisives.includes(f));
  assert.ok(confrontationOk(B, B.coupable, [d1, d2, autre]), `${nom} : deux décisives suffisent`);
  assert.ok(!confrontationOk(B, B.coupable, [d1, autre, autre2]), `${nom} : une seule décisive`);
  for (const [i, l] of Object.entries(B.innocente)) for (const x of l) for (const f of [].concat(x)) if (!B.confront.accablantes.includes(f)) assert.ok(!confrontationOk(B, B.coupable, [d1, d2, f]), `${nom} : ${f} (qui blanchit ${i}) n’accable pas`);
  assert.ok(!confrontationOk(B, A.coupable, [d1, d2, autre]), `${nom} : l’ancien coupable n’avoue pas`);
  assert.ok(!confrontationOk(B, B.coupable, ['doc:journal', 'doc:pvc', `A:${B.coupable}`]), `${nom} : les documents publics ne suffisent pas`);
  // Toute décisive s'obtient par l'enquête : jamais un document public, jamais une pièce de la scène.
  for (const f of B.confront.decisives) assert.ok(!publics.has(f) && !f.startsWith('c:'), `${nom} : ${f} décisive mais publique`);
  // Mandat : refusé sans pièce, accordé avec une charge.
  assert.equal(mandatOk(B, { pieces: [] }, B.coupable), false);
  assert.ok(mandatOk(B, { pieces: [{ f: B.charges[B.coupable][0] }] }, B.coupable));

  // Hypothèse au juge : avec tout le dossier, seule la vérité n'est contredite par rien.
  if (B.hypothese) {
    // Mêmes créneaux tenables que dans l'histoire d'origine, mais pour le nouveau coupable seulement.
    const tenables = (X) => {
      const K = new Set([...X.faits, ...reb]), ev = X.evaluer || evaluerHypothese, l = [];
      for (let i = 0; i < 5; i++) for (let s = 0; s < X.creneaux.length; s++) if (!ev(K, i, s).contre.length) l.push([i, s]);
      return l;
    };
    const bons = tenables(B), bonsA = tenables(A);
    assert.ok(bons.length >= 1 && bons.every(([i]) => i === B.coupable), `${nom} : seul le coupable tient, ${JSON.stringify(bons)}`);
    assert.deepEqual(bons.map(([, s]) => s), bonsA.map(([, s]) => s), `${nom} : les mêmes créneaux que l’origine`);
    assert.ok(bonsA.every(([i]) => i === A.coupable));
  }
  // Récit final, débrief et photos : rien de mal formé ; le récit nomme le coupable en premier.
  assert.ok(B.recitFinal.split('\n')[0].startsWith(B.suspects[B.coupable].nom), `${nom} : récit final`);
  assert.notEqual(B.recitFinal, A.recitFinal);
  const db = construireDebrief({ zones: {} }, B, 'aveux', { jour: 4 });
  assert.equal(db.coupable.i, B.coupable);
  assert.ok(!/undefined|NaN/.test(JSON.stringify(db)));
  for (const f of tout) assert.ok(!/undefined|NaN/.test(photoIndice(B, f)), `${nom} : photo ${f}`);
}

// Ce qui fait le sel de chaque variante b.
{
  const [clef, rampe, corbeau] = CAS.map((c) => c.B);
  // Clef : Julien parle encore de la statuette (il la tient de Thierry) ; le buffet de la gare le blanchit.
  assert.equal(pieceReaudition(clef, { pieces: [] }, 2, 'A:2'), 'Rg:2');
  assert.ok(/Thierry/.test(texteFait(clef, 'Rg:2')));
  assert.ok(!candidats(clef, ['occ:2']).suspects.includes(2));
  assert.ok(candidats(clef, ['occ:4', 'moy:4', 'Rg:2']).suspects.includes(4));
  // Rampe : le n° 7 est Thibault ; les badges blanchissent Grégoire ; Grégoire tient le SMS de Thibault.
  assert.ok(/n° 7 : Thibault Lempereur/.test(texteFait(rampe, 'x:liste')));
  assert.ok(!candidats(rampe, ['occ:4']).suspects.includes(1));
  assert.equal(pieceReaudition(rampe, { pieces: [{ f: 'mob:0' }] }, 1, 'mob:0'), 'Ra:1');
  assert.ok(/Thibault/.test(texteFait(rampe, 'Ra:1')));
  assert.equal(pieceRecoupement(rampe, { pieces: [] }, 'r:tel', 'mob:0'), 'x:wifi');
  // Corbeau : la plaignante parle toujours de « sept affiches » (Jordan le lui a dit) ; le relais mène à Jordan.
  assert.equal(pieceRecoupement(corbeau, { pieces: [] }, 'c:septieme', 'doc:pvc'), 'x:sept');
  assert.equal(pieceReaudition(corbeau, { pieces: [{ f: 'x:sept' }] }, 4, 'x:sept'), 'Rh:4');
  assert.equal(pieceRecoupement(corbeau, { pieces: [] }, 'r:relais', 'occ:3'), 'x:relais');
  assert.ok(!candidats(corbeau, ['occ:4', 'c:sonnette']).suspects.includes(4));
  assert.ok(candidats(corbeau, ['occ:4']).suspects.includes(4), 'l’imprimante seule ne la blanchit pas');
  // Les fausses pistes du juge, comme dans l'histoire d'origine : avant les recoupements, la vérité bute.
  const naif = new Set(['c:legiste2', 'c:cam', 'c:tel1', 'occ:4', 'mob:2']);
  const h = rampe.evaluer(naif, 4, 1);
  assert.ok(h.contre.includes('c:cam') && h.contre.includes('c:tel1'));
  assert.ok(!rampe.evaluer(new Set([...naif, 'x:heure', 'x:wifi']), 4, 1).contre.length);
  // Corbeau : lus seuls, la plainte et le faux secret désignent Hélène ; ce qui les explique désigne Jordan.
  assert.ok(corbeau.evaluer(new Set(['x:sept', 'x:secrets']), 4, 1).pour.length === 2);
  assert.ok(corbeau.evaluer(new Set(['x:sept', 'x:secrets', 'Rh:4', 'moy:3']), 3, 1).pour.length >= 3);
  assert.ok(corbeau.evaluer(new Set(['Ra:3']), 3, 1).contre.includes('Ra:3'), '« sans m’arrêter », tant que le GPS n’est pas là');
}

// ── 4. Partie : la Rampe en variante b, résolue par une zone ; Grégoire confondu à tort. ──
{
  const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
  const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
  let w = createGame({ seed: 'variante-partie' });
  w = resolveTurn(w, { players }).state;
  w.meurtreDes = undefined; w.meurtre2Des = undefined;
  w.variantes = { [w.enquete.n + 1]: 'b' };
  assert.ok(ouvrirAffaireMaintenant(w, 'rampe') != null);
  const n = w.enquete.n;
  assert.equal(w.variantes[n], 'b');
  let r = affaire(w, n);
  assert.equal(r.coupable, 4);
  for (const u of 'AB') w.zones[u].budget = 80;
  // Jour 1 : A vérifie l'alibi de Thibault (les badges) ; B confond Grégoire.
  w = resolveTurn(w, { players, orders: { A: { ...base, demarches: ['alibi:4'] }, B: { ...base, accusation: 1, confront: ['doc:journal', 'doc:pvc', 'A:1'] } } }).state;
  assert.ok(w.zones.A.enquete.pieces.some((p) => p.f === 'occ:4'));
  assert.equal(w.zones.B.enquete.exclu, true, 'Grégoire : mauvaise personne');
  // Jour 2 : A perquisitionne chez Thibault et réentend Grégoire face aux badges.
  w = resolveTurn(w, { players, orders: { A: { ...base, demarches: ['moyens:4'], reaud: { i: 1, f: 'occ:4' } }, B: base } }).state;
  assert.ok(w.zones.A.enquete.pieces.some((p) => p.f === 'moy:4'));
  assert.ok(w.zones.A.enquete.pieces.some((p) => p.f === 'Rb:1'));
  // Jour 3 : confrontation avec le mobile.
  w = resolveTurn(w, { players, orders: { A: { ...base, accusation: 4, confront: ['moy:4', 'Rb:1', 'occ:4'], mobile: 2 }, B: base } }).state;
  assert.ok(w.zones.A.rapport.some((x) => /tu avais aussi compris pourquoi/.test(x)));
  assert.notEqual(w.enquete.n, n, 'affaire close');
  assert.equal(affaire(w, n).variante, 'b', 'relue dans sa variante après la clôture');
}
console.log('OK : variantes des affaires écrites vérifiées.');
