// « Le Quartier » : barricades, trois verbes, intentions du milieu ; conversion de l'état ; interrupteur.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { QUARTIER, quartierActif, assurerQuartier, bilanQuartier, totalBar, coupsDe, intentionsPour, Q } from '../js/engine/quartier.js';

const ALLOC = { intervention: 6, proximite: 4, recherche: 4, roulage: 2, admin: 2 };
function partie() {
  const st = createGame({ seed: 'quartier-test' });
  st.nonDroit.roles = true; st.nonDroit.v3 = true;
  for (const [uid, code] of [['a', '5301'], ['b', '5302'], ['c', '5303']]) st.zones[uid] = newZone({ uid, code, nom: uid.toUpperCase() }, 1);
  return st;
}
const anneau = (st) => Object.keys(st.nonDroit.secteurs).filter((k) => !st.nonDroit.secteurs[k].coeur).sort((a, b) => Number(a) - Number(b));
const tour = (st, roles = {}) => {
  const orders = {};
  for (const u of Object.keys(st.zones)) {
    const r = roles[u] || {};
    orders[u] = { alloc: ALLOC, rythme: 'normal', roles: r, secteurs: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (v.rep || 0) + (v.desc || 0) + (v.bouc || 0)])) };
  }
  return resolveTurn(st, { orders, players: {}, nextWeekday: 1 });
};
const copie = (x) => JSON.parse(JSON.stringify(x));

// 0. Interrupteur fermé : l'ancienne règle tourne, aucune barricade.
QUARTIER.force = false; QUARTIER.depuis = null;
let st = partie();
assert.equal(quartierActif(st), false);
st = tour(st).state;
assert.ok(!Object.values(st.nonDroit.secteurs).some((s) => Number.isFinite(s.bar)), 'pas de barricades avant la bascule');
assert.ok(!st.nonDroit.quartier);

// 1. Bascule par date : seulement pour un tour dont l'échéance tombe après `depuis`.
QUARTIER.depuis = Number(st.nextDeadline);
assert.equal(quartierActif(st), false, 'le tour de l’échéance de bascule suit encore l’ancienne règle');
QUARTIER.depuis = Number(st.nextDeadline) - 1;
assert.equal(quartierActif(st), true, 'le tour suivant suit la nouvelle');
QUARTIER.depuis = null;

// 2. Conversion : un secteur repris le reste, les autres reçoivent des barricades selon leur emprise.
QUARTIER.force = true;
{
  const s2 = copie(st), [k1, k2, k3] = anneau(s2);
  const a = s2.nonDroit.secteurs[k1]; a.statut = 'repris'; a.emprise = 20; a.influence = { a: 5 };
  s2.nonDroit.secteurs[k2].emprise = s2.nonDroit.secteurs[k2].max;
  s2.nonDroit.secteurs[k3].emprise = Math.round(s2.nonDroit.secteurs[k3].max / 2);
  s2.nonDroit.secteurs[k3].barricade = { de: 2 };
  assurerQuartier(s2);
  assert.equal(s2.nonDroit.quartier, true);
  assert.equal(s2.nonDroit.secteurs[k1].statut, 'repris'); assert.equal(totalBar(s2.nonDroit.secteurs[k1]), 0);
  assert.ok(s2.nonDroit.secteurs[k2].bar > s2.nonDroit.secteurs[k3].bar, 'moins d’emprise, moins de barricades');
  assert.ok(!s2.nonDroit.secteurs[k3].barricade, 'le dernier carré disparaît');
  for (const k of [k2, k3]) { const s = s2.nonDroit.secteurs[k]; assert.ok(s.cache >= 0 && s.cache <= Q.cacheMax); assert.equal(s.vu, false); }
  assert.deepEqual(s2.nonDroit.scenes, []); assert.deepEqual(s2.nonDroit.gangs, []);
  // Idempotent.
  const avant = copie(s2.nonDroit.secteurs); assurerQuartier(s2); assert.deepEqual(s2.nonDroit.secteurs, avant);
}

// 3. Casser : assez de coups, le secteur tombe (lieutenant arrêté, récompenses) ; pas assez, les barricades cassées restent cassées.
assurerQuartier(st);
const T0 = st.turn;
{
  const s2 = copie(st), k = anneau(s2)[0], s = s2.nonDroit.secteurs[k];
  s.bar = 3; s.cache = 1; s.vu = false;
  const pts0 = s2.zones.a.stats.pointsAffaires || 0;
  const r = tour(s2, { a: { [k]: { rep: 0, desc: 2, bouc: 0 } }, b: { [k]: { rep: 0, desc: 2, bouc: 0 } } }).state;
  const t = r.nonDroit.secteurs[k];
  assert.equal(t.statut, 'repris', '4 coups contre 3 + 1 cachée');
  assert.equal(totalBar(t), 0);
  assert.ok(['garde', 'tombe'].includes(t.lieutenant.etat), 'lieutenant arrêté');
  assert.ok(['a', 'b'].includes(t.lieutenant.par), 'gardé par une zone qui a cassé');
  assert.ok((r.zones.a.stats.pointsAffaires || 0) > pts0, 'récompense à la prise');
}
{
  const s2 = copie(st), k = anneau(s2)[0], s = s2.nonDroit.secteurs[k];
  s.bar = 5; s.cache = 2; s.vu = false;
  s2.nonDroit.intentions = { nuit: s2.turn, attaques: {}, renforts: {} };
  const r = tour(s2, { a: { [k]: { rep: 0, desc: 3, bouc: 0 } } }).state.nonDroit.secteurs[k];
  assert.equal(r.statut, 'milieu');
  assert.equal(r.bar, 4, '7 barricades − 3 coups = 4, le « ? » révélé et compté');
  assert.equal(r.cache, 0); assert.equal(r.vu, true);
  assert.ok(r.influence.a > 0, 'la part de la zone est gardée pour la prise');
}

// 4. Révéler : une Recherche seule lève le « ? » sans rien casser.
{
  const s2 = copie(st), k = anneau(s2)[1], s = s2.nonDroit.secteurs[k];
  s.bar = 4; s.cache = 2; s.vu = false;
  s2.nonDroit.intentions = { nuit: s2.turn, attaques: {}, renforts: {} };
  const r = tour(s2, { c: { [k]: { rep: 1, desc: 0, bouc: 0 } } }).state.nonDroit.secteurs[k];
  assert.equal(r.vu, true); assert.equal(r.bar, 4); assert.equal(r.cache, 2);
}

// 5. Bilan (écran) : le « ? » compte pour 2 tant qu'il n'est pas révélé, les experts comptent double.
{
  const s2 = copie(st), k = anneau(s2)[2], s = s2.nonDroit.secteurs[k];
  s.bar = 3; s.cache = 1; s.vu = false;
  const z = s2.zones.a, zb = s2.zones.b;
  z.niveaux.intervention = 1; zb.niveaux.intervention = 1;
  assert.equal(bilanQuartier(s2, k, [{ u: 'a', zone: z, r: { rep: 0, desc: 3, bouc: 0 } }]).statut, 'peutetre');
  assert.equal(bilanQuartier(s2, k, [{ u: 'a', zone: z, r: { rep: 0, desc: 5, bouc: 0 } }]).statut, 'tombe');
  assert.equal(bilanQuartier(s2, k, [{ u: 'a', zone: z, r: { rep: 0, desc: 2, bouc: 0 } }]).statut, 'manque');
  assert.equal(bilanQuartier(s2, k, [{ u: 'a', zone: z, r: { rep: 1, desc: 3, bouc: 0 } }, { u: 'b', zone: zb, r: { rep: 0, desc: 1, bouc: 0 } }]).statut, 'tombe', 'révélé : 4 coups pour 4');
  z.niveaux.intervention = 3; assert.equal(coupsDe(z, 2), 3);
  z.niveaux.intervention = 5; assert.equal(coupsDe(z, 2), 4); assert.equal(coupsDe(z, 1), 2);
}

// 6. Protéger : l'attaque annoncée passe si les boucliers manquent, elle est repoussée sinon.
{
  const base = copie(st), k = anneau(base)[3], s = base.nonDroit.secteurs[k];
  s.statut = 'repris'; s.bar = 0; s.cache = 0; s.vu = true; s.influence = { a: 4, b: 2 }; s.lieutenant.etat = 'tombe';
  base.nonDroit.intentions = { nuit: base.turn, attaques: { [k]: 3 }, renforts: {} };
  const ok = tour(copie(base), { a: { [k]: { rep: 0, desc: 0, bouc: 2 } }, b: { [k]: { rep: 0, desc: 0, bouc: 1 } } }).state;
  assert.equal(ok.nonDroit.secteurs[k].statut, 'repris', '3 boucliers contre 3');
  assert.ok(ok.zones.a.rapport.some((l) => l.includes('cassé les dents')));
  const ko = tour(copie(base), { a: { [k]: { rep: 0, desc: 3, bouc: 2 } } }).state;
  assert.equal(ko.nonDroit.secteurs[k].statut, 'milieu', '2 boucliers contre 3 : reperdu (les casseurs ne protègent pas)');
  assert.ok(ko.nonDroit.secteurs[k].bar >= 2); assert.equal(ko.nonDroit.secteurs[k].vu, true);
  assert.equal(ko.nonDroit.secteurs[k].lieutenant.etat, 'libre', 'nouveau lieutenant');
  // Sans attaque annoncée, rien ne retombe, même sans personne.
  const calme = copie(base); calme.nonDroit.intentions = { nuit: calme.turn, attaques: {}, renforts: {} };
  assert.equal(tour(calme).state.nonDroit.secteurs[k].statut, 'repris');
}

// 7. Intentions : annoncées pour la nuit suivante, déterministes, et appliquées (renfort sur un secteur qui ne tombe pas).
{
  const s2 = copie(st);
  const r = tour(s2).state;
  assert.equal(r.nonDroit.intentions.nuit, r.turn, 'intentions pour la prochaine résolution');
  assert.deepEqual(intentionsPour(r, r.nonDroit, r.turn), r.nonDroit.intentions, 'recalculables à l’identique');
  const [k, n] = Object.entries(r.nonDroit.intentions.renforts)[0];
  const avant = totalBar(r.nonDroit.secteurs[k]);
  const r2 = tour(copie(r)).state;
  assert.equal(totalBar(r2.nonDroit.secteurs[k]), avant + n, 'renfort annoncé appliqué');
}

// 8. QG : fermé tant que l'anneau n'est pas assez repris ; les renseignements lui retirent des barricades.
{
  const s2 = copie(st), qg = Object.keys(s2.nonDroit.secteurs).find((k) => s2.nonDroit.secteurs[k].coeur);
  const b0 = totalBar(s2.nonDroit.secteurs[qg]);
  const r = tour(s2, { a: { [qg]: { rep: 0, desc: 6, bouc: 0 } } }).state;
  assert.equal(r.nonDroit.secteurs[qg].statut, 'milieu', 'QG fermé');
  assert.equal(totalBar(r.nonDroit.secteurs[qg]), b0 + (st.nonDroit.intentions.renforts[qg] || 0), 'rien de cassé au QG fermé');
  const s3 = copie(r); s3.nonDroit.rensQG = Object.keys(s3.nonDroit.dossier).length; s3.nonDroit.dossier.plan = 'a'; s3.nonDroit.dossier.garde = 'b';
  const b1 = totalBar(s3.nonDroit.secteurs[qg]);
  s3.nonDroit.intentions = { nuit: s3.turn, attaques: {}, renforts: {} };
  const r3 = tour(s3).state;
  assert.equal(totalBar(r3.nonDroit.secteurs[qg]), b1 - 2 * Q.parRens, 'deux renseignements, deux barricades de moins');
}

// 9. Chute du QG : le Parrain tombe.
{
  const s2 = copie(st), ks = anneau(s2), qg = Object.keys(s2.nonDroit.secteurs).find((k) => s2.nonDroit.secteurs[k].coeur);
  for (const k of ks.slice(0, 4)) Object.assign(s2.nonDroit.secteurs[k], { statut: 'repris', bar: 0, cache: 0, vu: true, influence: { a: 3 } });
  Object.assign(s2.nonDroit.secteurs[qg], { bar: 4, cache: 0, vu: true });
  s2.nonDroit.intentions = { nuit: s2.turn, attaques: {}, renforts: {} };
  const r = tour(s2, { a: { [qg]: { rep: 0, desc: 2, bouc: 0 } }, b: { [qg]: { rep: 0, desc: 2, bouc: 0 } } }).state;
  assert.equal(r.nonDroit.secteurs[qg].statut, 'repris');
  assert.equal(r.nonDroit.parrain.tombe, true, 'le Parrain tombe');
  assert.deepEqual(r.nonDroit.intentions.attaques, {}, 'plus d’attaques après la chute');
}
// 10. Zone sans ordres : l'adjoint pose un agent là où il sert (pas les ordres d'hier).
{
  const s2 = copie(st), k = anneau(s2)[0];
  s2.zones.c.dernierOrdre = { alloc: ALLOC, rythme: 'normal', secteurs: { [k]: 6 }, roles: { [k]: { rep: 0, desc: 6, bouc: 0 } } };
  const orders = {}; for (const u of ['a', 'b']) orders[u] = { alloc: ALLOC, rythme: 'normal', secteurs: {}, roles: {} };
  const r = resolveTurn(s2, { orders, players: {}, nextWeekday: 1 }).state;
  const h = Object.values(r.nonDroit.secteurs).flatMap((s) => (s.hier || []).filter((x) => x.u === 'c'));
  assert.equal(h.reduce((a, x) => a + x.n, 0), 1, 'un agent de l’adjoint');
}
QUARTIER.force = false;
console.log('quartier : ok');
