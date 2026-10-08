// Variantes des affaires de vol : deux complices, faux témoin, fraude à l'assurance.
// Les affaires d'avant (et le moule classique) ne changent pas ; chaque variante se résout par déduction avec les pièces.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import {
  genererAffaire, affaire, candidats, accusesPrets, accusationRecevable, recitFinal, varianteTiree, auteurs, VARIANTES, ENQ,
  nouvelleAffaire, declaration, ficheSuspect, pieceCoupDePouce, hm,
} from '../js/engine/enquete.js';
import { dossierAffaire3 } from '../js/engine/dossier.js';
import { recitAffaire } from '../js/engine/recit.js';
import { construireDebrief } from '../js/engine/debrief.js';
import { sanitizeOrders } from '../js/engine/zone.js';
import { botOrders } from '../js/engine/bots.js';
import { makeRng } from '../js/engine/rng.js';

const propre = (t) => !/undefined|NaN|\{e\}|\bnull\b/.test(t);

// 1. Le moule classique est tiré exactement comme avant : même empreinte qu'avant les variantes (moteur d'octobre 2026).
{
  const h = createHash('sha256');
  for (const seed of ['ga', 'gb', 'gc']) for (let n = 1; n <= 40; n++) {
    for (const [c, p, dd] of [[false, false, null], [true, false, null], [true, true, 3]]) {
      const a = genererAffaire(seed, n, c, p, dd);
      h.update(JSON.stringify(a)); h.update(recitFinal(a));
      if (p) h.update(JSON.stringify(dossierAffaire3(seed, a)));
    }
  }
  assert.equal(h.digest('hex').slice(0, 16), 'b6519e886f538fdd', 'les affaires classiques n’ont pas bougé');
}
// … et, avec les variantes actives, une affaire sans variante est identique (recalculée dans un moteur neuf, sans cache commun).
{
  const neuf = await import('../js/engine/enquete.js?moteur-neuf');
  for (const seed of ['ga', 'gb']) for (let n = 1; n <= 40; n++) {
    if (varianteTiree(seed, n, 2)) continue;
    assert.equal(JSON.stringify(neuf.genererAffaire(seed, n, true, true, 1, 2)), JSON.stringify(genererAffaire(seed, n, true, true, 1)), `affaire ${n} sans variante identique`);
  }
}

// 2. Partie en cours : l'affaire ouverte ne change pas ; les variantes ne commencent qu'à l'affaire suivante.
{
  const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
  let st = createGame({ seed: 'en-cours' });
  st = resolveTurn(st, { players }).state;
  // Simule une partie d'avant la mise à jour : affaire n° 5 ouverte, aucune trace de varianteDes.
  delete st.varianteDes; st.enqueteSeq = 4; st.meurtreDes = -9; st.meurtre2Des = -9; st.corbeauDes = -9;
  nouvelleAffaire(st);
  delete st.varianteDes;
  const n = st.enquete.n;
  const avant = JSON.stringify(affaire(st, n));
  assert.equal(affaire(st, n).variante, undefined);
  st = resolveTurn(st, { players, orders: { A: {}, B: {} } }).state;
  assert.equal(st.varianteDes, undefined, 'pas encore de nouvelle affaire : rien ne bascule');
  assert.equal(JSON.stringify(affaire(st, n)), avant, 'l’affaire en cours est la même');
  nouvelleAffaire(st);
  assert.equal(st.varianteDes, n + 1, 'les variantes commencent à l’affaire suivante');
  assert.equal(JSON.stringify(affaire(st, n)), avant, 'l’affaire précédente (et sa traque) ne change pas');
  // Nouvelle partie : la première affaire est toujours classique.
  for (let k = 0; k < 30; k++) assert.equal(affaire(createGame({ seed: `neuve-${k}` }), 1).variante, undefined);
}

// 3. Fréquence : environ une affaire sur trois, jamais deux de suite, le classique reste majoritaire.
{
  const compte = {}; let tot = 0;
  for (let s = 0; s < 60; s++) {
    let prec = null;
    for (let n = 2; n <= 40; n++) {
      const v = varianteTiree(`f${s}`, n, 2);
      assert.ok(!(v && prec), 'jamais deux variantes de suite');
      prec = v; compte[v || 'classique'] = (compte[v || 'classique'] || 0) + 1; tot++;
    }
  }
  const part = 1 - compte.classique / tot;
  assert.ok(part > 0.28 && part < 0.45, `part des variantes : ${part}`);
  for (const v of VARIANTES.liste) assert.ok(compte[v] / tot > 0.07, `${v} tirée assez souvent`);
}

// 4. Chaque variante : solution unique par déduction, pièces cohérentes, rien qui ne se lise mal.
for (const v of VARIANTES.liste) {
  VARIANTES.force = v;
  let vus = 0, formes = new Set();
  for (let k = 0; k < 240; k++) {
    const seed = `v${k % 23}`, n = 2 + k;
    const prof = k % 3 !== 0;
    const a = genererAffaire(seed, n, true, prof, 1, 1);
    if (v === 'fraude' && a.variante !== 'fraude') { assert.ok(['moulins', 'hautspres'].includes(a.pos)); continue; }
    assert.equal(a.variante, v); vus++;
    const aut = auteurs(a).slice().sort();
    assert.deepEqual(candidats(a, a.faits).suspects, aut, 'les pièces désignent les auteurs, et eux seuls');
    assert.deepEqual(accusesPrets(a, { pieces: a.faits.map((f) => ({ f })) }), aut);
    for (const i of aut) assert.ok(accusationRecevable(a, { pieces: a.faits.map((f) => ({ f })) }, i));
    assert.equal(candidats(a, a.faits.filter((f) => !f.startsWith('c:'))).suspects.length, 5, 'sans constatation, rien ne prouve rien');
    // Jamais un auteur écarté, quelles que soient les pièces au dossier (le parquet ne se trompe pas).
    const r = makeRng(`sous:${k}`);
    for (let t = 0; t < 40; t++) { const sous = a.faits.filter(() => r.chance(0.5)); for (const i of aut) assert.ok(candidats(a, sous).suspects.includes(i), 'auteur jamais écarté'); }
    // Au moins quatre pièces pour conclure (pas de raccourci).
    assert.ok(a.faits.length > 0);
    const textes = [...Object.values(a.textes), recitFinal(a), recitFinal(a, false), a.recit, ...a.suspects.map((s) => declaration(s)), ...a.suspects.map((s) => JSON.stringify(ficheSuspect(a, s)))];
    for (const t of textes) assert.ok(t && propre(t), `texte mal formé (${v}, ${n}) : ${t}`);
    if (prof) { const d = dossierAffaire3(seed, a); assert.ok(propre(JSON.stringify([d.journal, d.pvc, d.auditions])), `dossier complet mal formé (${v})`); assert.ok(d.pvc.lignes.some((l) => l.includes(a.regle))); }
    assert.ok(a.regle && a.accroche);
    if (v === 'complices') {
      const B = a.suspects[a.coupable], A = a.suspects[a.complice];
      assert.ok(a.complice !== a.coupable);
      assert.deepEqual(B.statut, { mob: true, moy: false, occ: true }, 'l’exécutant n’avait pas le moyen');
      assert.deepEqual(A.statut, { mob: true, moy: true, occ: false }, 'le complice n’était pas sur place');
      for (const [i, s] of a.suspects.entries()) if (!aut.includes(i)) assert.ok(!s.statut.mob || (!s.statut.moy && !s.statut.occ), 'chaque innocent est écartable');
      // Le coup de pouce du Directeur ne donne jamais la dernière exclusion.
      const zone = { enquete: { pieces: a.faits.filter((f) => !f.startsWith('p:')).map((f) => ({ f })) } };
      assert.equal(pieceCoupDePouce({}, zone, a, makeRng('x')), null);
    }
    if (v === 'fauxTemoin') {
      const C = a.suspects[a.coupable], m = a.mensonge;
      formes.add(m.forme);
      assert.equal(C.alibi.type, 'temoin'); assert.ok(a.faits.includes(m.piece));
      assert.ok(/c’est sa parole/.test(a.textes[`occ:${a.coupable}`]));
      if (m.forme === 'complaisant') {
        const X = a.suspects[m.menteur];
        assert.ok(m.menteur !== a.coupable, 'le menteur n’est pas le coupable');
        assert.ok(X.alibi.ditA > a.fin && X.alibi.a < a.heure, 'il dit être resté, ses traces s’arrêtent avant les faits');
        assert.ok(declaration(X).includes(C.nom) && declaration(C).includes(X.nom));
        assert.ok(a.textes[m.piece].includes(hm(X.alibi.a)) && /seul/.test(a.textes[m.piece]));
      } else {
        assert.equal(m.menteur, null);
        assert.ok(m.borne < a.heure && m.borne >= a.heure - 15 && a.textes[m.piece].includes(`a borné à ${hm(m.borne)}`));
      }
    }
    if (v === 'fraude') {
      const V = a.suspects[a.coupable];
      assert.ok(V.victime && V.statut.mob && V.statut.moy && V.statut.occ);
      assert.equal(a.req.mob, 'argent');
      assert.equal(!!V.f, /^la /.test(a.vic), 'la victime a le genre du décor');
      assert.equal(recitAffaire(seed, a).victime, V.nom, 'la plaignante est bien la suspecte');
      assert.equal(a.suspects.filter((s) => s.victime).length, 1);
    }
  }
  assert.ok(vus > 150, `${v} : assez d’affaires vérifiées`);
  if (v === 'fauxTemoin') assert.deepEqual([...formes].sort(), ['complaisant', 'proche']);
}
VARIANTES.force = null;

// 5. De bout en bout : deux complices, accusation à deux, traque, débrief, robots.
{
  const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
  let st = createGame({ seed: 'complices' });
  st.meurtreDes = -9; st.meurtre2Des = -9; st.corbeauDes = -9;
  st = resolveTurn(st, { players }).state;
  VARIANTES.force = 'complices';
  st.enquete = null; nouvelleAffaire(st);
  // (la variante reste forcée pendant tout le bloc : l’affaire se recalcule à partir de la graine)
  const aff = affaire(st, st.enquete.n);
  assert.equal(aff.variante, 'complices');
  const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
  const remplir = (u) => { const d = st.zones[u].enquete; for (const f of aff.faits) if (!d.pieces.some((p) => p.f === f)) d.pieces.push({ f, src: 'test', j: 1 }); };
  for (const u of ['A', 'B', 'C']) st.zones[u].enquete = st.zones[u].enquete || { n: aff.n, v: 2, pieces: [], accuse: null, exclu: false };
  remplir('B'); remplir('C');
  // L'ordre garde le second nom ; un seul nom ne suffit pas.
  const o = sanitizeOrders(st.zones.C, { ...base, accusation: aff.coupable, accusation2: aff.complice }, st);
  assert.equal(o.accusation2, aff.complice);
  assert.equal(sanitizeOrders(st.zones.C, { ...base, accusation: 1, accusation2: 1 }, st).accusation2, null);
  // Robot au dossier complet : il accuse la paire.
  const bo = botOrders(st.zones.C, st, 'prudent');
  if (bo && bo.accusation !== null) assert.deepEqual([bo.accusation, bo.accusation2].sort(), auteurs(aff).slice().sort(), 'le robot accuse les deux complices');
  const r = resolveTurn(st, { players, orders: { A: base, B: { ...base, accusation: aff.coupable }, C: { ...base, accusation: aff.complice, accusation2: aff.coupable } } });
  assert.ok(r.state.zones.B.rapport.some((l) => /attend les deux complices/.test(l)), 'un seul nom : refus expliqué, sans pénalité');
  assert.ok(!r.state.zones.B.enquete || r.state.zones.B.enquete.n !== aff.n || !r.state.zones.B.enquete.exclu);
  const dec = r.gazette.enquete.decouverte;
  assert.ok(dec && dec.complice === aff.suspects[aff.complice].nom && dec.suspect === aff.suspects[aff.coupable].nom, 'les deux complices démasqués');
  assert.ok(r.state.zones.C.rapport.some((l) => l.includes('ont fait le coup ensemble')));
  st = r.state;
  const tr = st.traques.find((t) => t.n === aff.n);
  assert.ok(tr, 'l’exécutant est en fuite : traque');
  const db = construireDebrief(st, aff, 'fuite', { jour: tr.jour, decouvreurs: tr.decouvreurs, arreteurs: [] });
  assert.equal(db.complice.nom, aff.suspects[aff.complice].nom);
  assert.ok(db.zones.find((z) => z.uid === 'C').juste, 'la zone qui a accusé la paire a vu juste');
  assert.equal(db.pistes.length, 3, 'trois innocents écartés');
  assert.ok(db.pistes.every((p) => p.pieces.length >= 1));
  assert.ok(propre(recitFinal(aff)));
}

VARIANTES.force = null;
// 6. Faux témoin et fraude dans une partie : le débrief nomme le menteur et la pièce qui le trahissait.
{
  for (const v of ['fauxTemoin', 'fraude']) {
    const players = { A: { code: '1111', nom: 'Alpha' } };
    let st = createGame({ seed: `bout-${v}` });
    st.meurtreDes = -9; st.meurtre2Des = -9; st.corbeauDes = -9;
    st = resolveTurn(st, { players }).state;
    VARIANTES.force = v;
    st.enquete = null; nouvelleAffaire(st);
    // (forcée pendant tout le bloc)
    const aff = affaire(st, st.enquete.n);
    if (aff.variante !== v) continue; // fraude impossible dans ce décor
    const d = st.zones.A.enquete;
    for (const f of aff.faits) if (!d.pieces.some((p) => p.f === f)) d.pieces.push({ f, src: 'test', j: 1 });
    const r = resolveTurn(st, { players, orders: { A: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, accusation: aff.coupable } } });
    assert.ok(r.gazette.enquete.decouverte, `${v} : découverte`);
    const db = construireDebrief(r.state, aff, 'classee', { jour: 1 });
    assert.equal(db.variante.k, v);
    if (v === 'fauxTemoin') { assert.ok(db.mensonge && db.mensonge.piece.titre && db.mensonge.couvert === aff.suspects[aff.coupable].nom); }
    if (v === 'fraude') assert.ok(r.gazette.enquete.decouverte && /plainte/.test(JSON.stringify(r.gazette)));
  }
}
VARIANTES.force = null;
void ENQ;
console.log('OK : variantes des vols (complices, faux témoin, fraude) vérifiées.');
