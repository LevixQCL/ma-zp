// Enquête en direct (saison 4) : temps de recherche, enquêteurs occupés, confrontation et verdict en étapes,
// et le calcul de 20:00 qui rejoue la journée comme l'appareil du joueur.
import assert from 'node:assert/strict';
import { createGame, resolveTurn, migrateState } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { affaire, dossierDe, candidats, faitsConnus } from '../js/engine/enquete.js';
import { rejouer, piecesA, dureeDemarche, etapeVerdict, DIRECT, DELAI_VERDICT, enCoursMax } from '../js/engine/enquete-direct.js';

const H = 3600000, MIN = 60000;
const fin = Date.parse('2026-09-10T18:00:00Z'); // 20:00 à Bruxelles (avant le lancement de la Rampe, qui mettrait l'enquête en pause)
const state = createGame({ seed: 'direct-1', turnDeadline: fin });
state.zones.u1 = newZone({ uid: 'u1', code: '5301', nom: 'Un' }, 1, { arrivee: 0 });
state.zones.u2 = newZone({ uid: 'u2', code: '5302', nom: 'Deux' }, 1, { arrivee: 1 });
migrateState(state);
const aff = affaire(state, state.enquete.n);
assert.ok(!aff.meurtre, 'affaire de départ : un vol');
const z = state.zones.u1, d0 = dossierDe(state, z);
const ctx = { state, z, agents: 4, budget: 60, limite: fin };
const t0 = fin - 10 * H;

// 1. Une démarche rend sa pièce après son temps de recherche.
{
  const r = rejouer(ctx, d0, [{ k: 'dem', x: 'cam', at: t0 }]);
  assert.equal(r.lancees.length, 1);
  const p = r.dossier.pieces.find((x) => x.src === 'cam');
  assert.ok(p, 'pièce des caméras au dossier');
  assert.equal(p.dispo, t0 + dureeDemarche('cam', 4) * MIN);
  assert.ok(!piecesA(r.dossier, t0 + 30 * MIN).includes(p), 'pas encore arrivée au bout de 30 min');
  assert.ok(piecesA(r.dossier, p.dispo).includes(p), 'arrivée à l’heure dite');
  assert.equal(r.depense, 3);
}
// 2. Les enquêteurs sont occupés : pas plus de démarches en cours que le plafond.
{
  const l = ['cam', 'labo', 'temoin'].map((x, k) => ({ k: 'dem', x, at: t0 + k * MIN }));
  const r = rejouer(ctx, d0, l);
  assert.equal(r.lancees.length, enCoursMax(4));
  assert.match(r.refus[0].raison, /occupés/);
  // Une fois la première revenue, la suivante peut partir.
  const r2 = rejouer(ctx, d0, [...l.slice(0, 2), { k: 'dem', x: 'temoin', at: t0 + dureeDemarche('cam', 4) * MIN + MIN }]);
  assert.equal(r2.lancees.length, 3);
  // Plus d'enquêteurs : des démarches plus rapides.
  assert.ok(dureeDemarche('cam', 12) < dureeDemarche('cam', 4));
}
// 3. Confrontation d'un vol avec un dossier incomplet : le parquet refuse, sans pénalité ni fin d'affaire.
{
  const r = rejouer(ctx, d0, [{ k: 'confront', i: 0, at: t0 }]);
  assert.equal(r.confrontations[0].issue, 'refus');
  assert.equal(r.dossier.accuse ?? null, null);
  const e = etapeVerdict(r.confrontations[0], t0 + 15 * MIN);
  assert.equal(e.fini, false);
  assert.equal(e.t, DIRECT.verdict[1].t);
  assert.equal(etapeVerdict(r.confrontations[0], t0 + DELAI_VERDICT * MIN).fini, true);
}
// 4. Le parquet ferme 45 minutes avant 20:00.
{
  const r = rejouer(ctx, d0, [{ k: 'confront', i: 0, at: fin - 20 * MIN }]);
  assert.equal(r.confrontations.length, 0);
  assert.match(r.refus[0].raison, /parquet ferme/);
}
// 5. Dossier complet : la bonne zone identifie l'auteur, le calcul de 20:00 donne le même résultat.
{
  const toutes = aff.faits.filter((f) => !f.startsWith('p:'));
  const zc = state.zones.u2;
  zc.enquete = { ...dossierDe(state, zc), pieces: [...dossierDe(state, zc).pieces, ...toutes.map((f) => ({ f, j: 1, src: 'voisinage' }))] };
  const c = candidats(aff, faitsConnus(zc.enquete));
  assert.deepEqual(c.suspects, aff.complice != null ? [aff.coupable, aff.complice].sort() : [aff.coupable]);
  const acts = { u2: [{ k: 'confront', i: c.suspects[0], ...(c.suspects.length > 1 ? { i2: c.suspects[1] } : {}), at: t0 }], u1: [{ k: 'dem', x: 'cam', at: t0 }, { k: 'dem', x: 'labo', at: t0 + MIN }] };
  const avant = state.zones.u1.budget;
  const { state: s2, gazette } = resolveTurn(state, { orders: { u1: {}, u2: {} }, enqueteActions: acts });
  assert.ok(gazette.enquete.decouverte, 'découverte publiée à 20:00');
  assert.deepEqual(gazette.enquete.decouverte.uids, ['u2']);
  assert.ok(s2.zones.u1.budget <= avant - 8 + 20, 'les démarches de la journée sont payées');
  assert.ok((s2.zones.u1.compta.lignes || []).some((l) => l.k === 'enquete' && l.v === -8), 'ligne « Démarches d’enquête » de 8 k€');
}
console.log('enquete-direct.test : OK');
