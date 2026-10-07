// Bilan de saison : cas calculés en fin de saison, remises en état plafonnées et payées, acceptation automatique.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { SEASON_LENGTH } from '../js/engine/constants.js';
import { BILAN, calculerBilan, moyennesDistrict, maxRemises, niveauxGagnes } from '../js/engine/bilan.js';

// Calcul pur : la zone au-dessus de la moyenne subit plus de cas ; l'hôtel de police 4 est protégé.
{
  const forte = newZone({ uid: 'a' }, 1), faible = newZone({ uid: 'b' }, 1);
  Object.assign(forte, { toursJoues: 10, niveaux: { intervention: 4, proximite: 3, recherche: 3, roulage: 2, admin: 2 }, equip: { intervention: 3, proximite: 2, recherche: 2, roulage: 3, admin: 1 }, batiments: { bureaux: 4, garage: 2 } });
  Object.assign(faible, { toursJoues: 10, niveaux: { intervention: 2, proximite: 1, recherche: 1, roulage: 1, admin: 1 }, equip: { intervention: 1, proximite: 1, recherche: 1, roulage: 1, admin: 1 }, batiments: { bureaux: 1, garage: 1 } });
  const moy = moyennesDistrict([forte, faible]);
  const bf = calculerBilan(forte, moy, 'x'), bb = calculerBilan(faible, moy, 'x');
  assert.equal(niveauxGagnes(forte), 19);
  assert.ok(bf.cas.length > bb.cas.length, 'la zone forte subit plus de cas');
  assert.ok(!bf.cas.some((c) => c.s === 'bureaux'), 'hôtel de police 4 protégé');
  assert.deepEqual(calculerBilan(forte, moy, 'x'), bf, 'déterministe');
  const par = {};
  for (const c of bf.cas) { const k = `${c.k}:${c.s}`; par[k] = (par[k] || 0) + 1; assert.ok(c.t && c.x && c.a && c.prix > 0); }
  assert.ok(Object.values(par).every((n) => n <= BILAN.maxParElement));
}

// Fin de saison réelle, puis remises en état.
{
  let st = createGame({ seed: 'bilan-t' });
  for (const u of ['z1', 'z2', 'z3']) st.zones[u] = newZone({ uid: u, code: '53' + u.slice(1) + '0', nom: u }, 1);
  const z1 = st.zones.z1;
  z1.niveaux.intervention = 4; z1.niveaux.recherche = 3; z1.equip.intervention = 4; z1.equip.roulage = 3; z1.batiments.garage = 3;
  for (let t = 1; t <= SEASON_LENGTH; t++) st = resolveTurn(st, { orders: {}, quests: {}, nextWeekday: t % 7 }).state;
  assert.equal(st.season, 2);
  const b = st.zones.z1.bilan;
  assert.ok(b && b.cas.length >= 3, 'des cas pour la zone développée');
  assert.ok(st.zones.z1.equip.intervention >= 2, 'le matériel n’est plus remis à 1');
  const avant = { ...st.zones.z1.equip }, avantN = { ...st.zones.z1.niveaux }, avantB = { ...st.zones.z1.batiments };
  const max = maxRemises(b);
  const choix = Object.fromEntries(b.cas.map((c) => [c.id, 'paye'])); // tente tout : plafonné
  const budget0 = st.zones.z1.budget;
  st = resolveTurn(st, { orders: { z1: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, bilan: choix } }, quests: {}, nextWeekday: 1 }).state;
  const b2 = st.zones.z1.bilan;
  assert.equal(b2.cas.filter((c) => c.etat === 'paye').length, max, 'plafond des remises');
  const paye = b2.cas.filter((c) => c.etat === 'paye');
  for (const c of paye) {
    const now = c.k === 'batiments' ? st.zones.z1.batiments[c.s] : st.zones.z1[c.k][c.s];
    const was = c.k === 'batiments' ? avantB[c.s] : c.k === 'equip' ? avant[c.s] : avantN[c.s];
    assert.ok(now > was, `${c.k}:${c.s} remis en état`);
  }
  assert.ok(st.zones.z1.budget < budget0 + 50, 'budget débité');
  for (let t = 2; t <= BILAN.tours; t++) st = resolveTurn(st, { orders: {}, quests: {}, nextWeekday: t }).state;
  assert.ok(st.zones.z1.bilan.clos && st.zones.z1.bilan.cas.every((c) => c.etat), 'sans réponse : accepté au dernier soir');
}
console.log('bilan.test : OK');
