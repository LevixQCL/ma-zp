// Passage d'une saison à l'autre (audit du 9 octobre 2026) : rien de ce qui est en cours ne doit se perdre sans le dire.
import assert from 'node:assert/strict';
import { createGame, resolveTurn, buildJoinZone } from '../js/engine/resolve.js';
import { affaire, casDe, ouvrirAffaireMaintenant } from '../js/engine/enquete.js';
import { SEASON_LENGTH, CLASSEMENT } from '../js/engine/constants.js';
import { moyenneIpz } from '../js/engine/zone.js';

const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const O = (sauf = []) => Object.fromEntries(['A', 'B', 'C'].filter((u) => !sauf.includes(u)).map((u) => [u, { ...base }]));
function partie(seed, tours) {
  let s = createGame({ seed, turnDeadline: Date.parse('2026-10-05T18:00:00Z') });
  for (let k = 0; k < tours; k++) { s = resolveTurn(s, { players, orders: O() }).state; s.nextDeadline += 864e5; }
  return s;
}
const nuit = (s, orders = O()) => { const r = resolveTurn(s, { players, orders }); r.state.nextDeadline += 864e5; return r; };

// 1. Fin normale (jour 14) : l'affaire écrite en cours continue, avec les dossiers.
{
  let s = partie('bas-1', 10);
  s.meurtre2Des = -5; s.meurtreDes = -6;
  ouvrirAffaireMaintenant(s, 'corbeau', 0);
  const n = s.corbeauDes;
  while (s.turn < SEASON_LENGTH) s = nuit(s).state;
  const pieces = s.zones.A.enquete.pieces.length, jour = s.enquete.jour;
  const r = nuit(s);
  assert.equal(r.state.season, 2);
  assert.equal(r.state.enquete.n, n, 'le corbeau continue');
  assert.equal(casDe(r.state, r.state.enquete.n), 'corbeau');
  assert.ok(r.state.enquete.jour >= jour, 'le jour de l’affaire ne repart pas à 1');
  assert.ok(r.state.zones.A.enquete.pieces.length >= pieces, 'le dossier suit la zone');
}

// 2. Mise à prix à choisir le soir de la bascule : proposée en saison 2, versée le lendemain.
{
  let s = partie('bas-2', 4);
  s.zones.A.primeAChoisir = { n: s.enquete.n, titre: 'x', suspect: 'y', tour: s.turn };
  s.finSaison = 'soir';
  s = nuit(s).state;
  assert.equal(s.season, 2);
  assert.ok(s.zones.A.primeAChoisir, 'mise à prix gardée');
  const r = nuit(s, { ...O(), A: { ...base, prime: 'confiscation' } });
  assert.ok(r.state.zones.A.rapport.some((l) => /Mise à prix/.test(l)), 'mise à prix versée');
}

// 3. Directeur, zones inactives : rien de daté de l'ancienne saison (chef de corps et relèves retirés en saison 4).
{
  let s = partie('bas-3', 6);
  s.dir = { ...(s.dir || {}), prochain: 18, g: { id: 'x', tour: 16 } };
  s.zones.C.toursSansOrdres = 5;
  s.finSaison = 'soir';
  s = nuit(s, O(['C'])).state;
  assert.equal(s.dir.prochain, undefined);
  assert.equal(s.zones.A.chef, undefined, 'plus de chef de corps');
  assert.ok(s.zones.C.toursSansOrdres >= 3, 'une zone partie reste inactive');
}

// 4. Classement : un soir tenu par l'adjoint compte avec la décote.
{
  const z = { ipzHist: [{ t: 1, v: 60, joue: true }, { t: 2, v: 60, joue: false }], toursJoues: 1 };
  assert.ok(moyenneIpz(z) < 60 && moyenneIpz(z) > 60 - CLASSEMENT.decoteAbsent, 'décote appliquée');
}

// 5. Une zone écrite par un appareil à l'inscription est reconstruite par le moteur (pas de classement offert).
{
  let s = partie('bas-5', 3);
  const triche = buildJoinZone(s, 'D', { code: '4444', nom: 'Delta' }, s.turn);
  triche.avantArrivee = { n: 13, v: 100 }; triche.budget = 60; triche.infra = { cachots: true };
  s.zones.D = triche;
  const r = nuit(s, { ...O(), D: { ...base } });
  const d = r.state.zones.D;
  assert.ok(!d.infra.cachots, 'annexe offerte retirée');
  assert.ok(!d.avantArrivee || d.avantArrivee.v < 100, 'avant-arrivée recalculée');
}

console.log('OK : bascule de saison (affaire, mise à prix, Directeur, inactifs, adjoint, inscription).');
