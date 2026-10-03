// Figures de l'équipe : bonus dans leur service, mission en zone de non-droit.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { bonusChef } from '../js/engine/constants.js';

const players = { A: { code: '1111', nom: 'A' }, B: { code: '2222', nom: 'B' } };
function partie() {
  let st = createGame({ seed: 'chefs' });
  st.zones.A = newZone({ uid: 'A', code: '1111', nom: 'A' }, 1);
  st.zones.B = newZone({ uid: 'B', code: '2222', nom: 'B' }, 1);
  return st;
}
const st0 = partie();
const k = Object.keys(st0.nonDroit.secteurs).find((x) => !st0.nonDroit.secteurs[x].coeur);
const alloc = { intervention: 6, proximite: 4, recherche: 3, roulage: 2, admin: 3 };
const ordres = (mission) => ({ A: { alloc, rythme: 'normal', secteurs: { [k]: 2 }, mission }, B: { alloc, rythme: 'normal', secteurs: { [k]: 2 } } });

const sans = resolveTurn(partie(), { players, orders: ordres(null) }).state;
const avec = resolveTurn(partie(), { players, orders: ordres({ role: 'inter', type: 'nondroit', secteur: k }) }).state;

// Bonus de service : toutes les figures sans mission ; la figure en mission laisse son service sans bonus.
assert.equal(sans.zones.A.bonusChefs.intervention, bonusChef(0));
assert.equal(avec.zones.A.bonusChefs.intervention, undefined, 'la figure en mission ne donne plus son bonus');
assert.equal(avec.zones.A.bonusChefs.proximite, bonusChef(0));
// Mission en zone de non-droit : plus d'influence sur le secteur, et le rapport l'annonce.
const inf = (s) => s.nonDroit.secteurs[k].influence.A || 0;
assert.ok(inf(avec) > inf(sans), `force plus grande avec la figure (${inf(avec)} > ${inf(sans)})`);
assert.ok((avec.zones.A.rapport || []).some((l) => l.startsWith('Mission :')), 'mission annoncée au rapport');
// Sans agents sur place, pas de mission : la figure reste à son service.
const rien = resolveTurn(partie(), { players, orders: { A: { alloc, rythme: 'normal', mission: { role: 'inter', type: 'nondroit', secteur: k } }, B: { alloc, rythme: 'normal' } } }).state;
assert.equal(rien.zones.A.bonusChefs.intervention, bonusChef(0));
console.log('OK : figures de l’équipe (bonus et mission) vérifiées.');
