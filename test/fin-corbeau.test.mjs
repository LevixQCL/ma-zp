// Soir de clôture du corbeau avec « fin de saison à la clôture de l'affaire » programmée (audit du 9 octobre 2026) :
// la bonne confrontation fait basculer la partie en saison 2, sans erreur, et la saison 2 tourne ensuite plusieurs soirs.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { affaire, casDe, ouvrirAffaireMaintenant } from '../js/engine/enquete.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
const O = (extra = {}) => ({ A: { ...base, ...(extra.A || {}) }, B: { ...base, ...(extra.B || {}) }, C: { ...base } });
const nuit = (s, o = O()) => { const r = resolveTurn(s, { players, orders: o }); r.state.nextDeadline += 864e5; return r; };

let s = createGame({ seed: 'fin-corbeau', turnDeadline: Date.parse('2026-09-28T18:00:00Z') });
for (let k = 0; k < 9; k++) s = nuit(s).state;
s.meurtre2Des = -5; s.meurtreDes = -6;
ouvrirAffaireMaintenant(s, 'corbeau', 0);
for (let k = 0; k < 2; k++) s = nuit(s).state;
assert.equal(casDe(s, s.enquete.n), 'corbeau');
s.finSaison = 'enquete';
const n0 = s.enquete.n, aff = affaire(s, n0);
// A possède les pièces accablantes (deux décisives au moins) et confronte le bon suspect ; B se trompe de suspect.
const dec = aff.confront.decisives.slice(0, 2), autre = aff.confront.accablantes.find((f) => !dec.includes(f));
const pieces = [...dec, autre];
for (const f of pieces) if (!s.zones.A.enquete.pieces.some((p) => p.f === f)) s.zones.A.enquete.pieces.push({ f, j: s.enquete.jour, src: 'demarche' });
const faux = aff.suspects.findIndex((_, i) => i !== aff.coupable);
const r = nuit(s, O({ A: { accusation: aff.coupable, confront: pieces, mobile: aff.mobileVrai }, B: { accusation: faux, confront: [] } }));
s = r.state;
assert.equal(s.season, 2, 'bascule en saison 2');
assert.equal(s.turn, 1);
assert.equal(s.regles, 2);
assert.equal(s.finSaison, undefined);
assert.ok(r.gazette.enquete && r.gazette.enquete.decouverte, 'découverte publiée');
assert.ok(r.gazette.finSaison && r.gazette.finSaison.anticipee, 'fin de saison anticipée dans la Gazette');
assert.ok(s.enquete && s.enquete.n === n0 + 1, 'une nouvelle affaire suit');
assert.ok(Object.values(s.zones).every((z) => z.enquete && z.enquete.n === n0 + 1), 'chaque zone a le nouveau dossier');
assert.ok(Object.values(s.zones).every((z) => z.chef), 'chaque zone a un chef');
assert.ok(JSON.stringify(s).length < 900_000, `état sous 1 Mo (${JSON.stringify(s).length})`);
// Saison 2 : une semaine de soirs sans erreur.
for (let k = 0; k < 7; k++) {
  const q = nuit(s); s = q.state;
  assert.ok(q.gazette && q.gazette.season === 2);
  for (const z of Object.values(s.zones)) for (const c of ['budget', 'moral', 'satisfaction', 'reputation', 'agents']) assert.ok(Number.isFinite(z[c]), `${z.uid}.${c} = ${z[c]}`);
}
assert.equal(s.turn, 8);
console.log('fin-corbeau : OK');
