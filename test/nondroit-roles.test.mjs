// Zone de non-droit avec rôles : ordres nettoyés, repérage, porte close sans mandat, saisies partagées.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone, sanitizeOrders } from '../js/engine/zone.js';
import { ND } from '../js/engine/constants.js';
import { repere } from '../js/engine/nondroit.js';

let st = createGame({ seed: 'roles-test' });
st.nonDroit.roles = true;
for (const u of ['a', 'b', 'c']) st.zones[u] = newZone({ uid: u, code: `53${u.charCodeAt(0)}`, nom: u }, 1);
const cles = Object.keys(st.nonDroit.secteurs).filter((k) => !st.nonDroit.secteurs[k].coeur);
const squat = cles.find((k) => st.nonDroit.secteurs[k].milieu === 'squat');
const autre = cles.find((k) => k !== squat);

// 1. Nettoyage : plafond par secteur, total recopié dans `secteurs`.
const o = sanitizeOrders(st.zones.a, { alloc: { intervention: 5 }, roles: { [autre]: { rep: 2, desc: 9, bouc: 3 }, xx: { desc: 2 } } }, st);
assert.equal(o.secteurs[autre], ND.maxParSecteur);
assert.equal(o.roles[autre].rep + o.roles[autre].desc + o.roles[autre].bouc, ND.maxParSecteur);
assert.ok(!o.roles.xx);
// Ancien format : tout en descente.
const o2 = sanitizeOrders(st.zones.a, { alloc: {}, secteurs: { [autre]: 3 } }, st);
assert.deepEqual(o2.roles[autre], { rep: 0, desc: 3, bouc: 0 });

// 2. Soir 1 : repérage sur `autre`, descente sans mandat sur le squat (porte close).
const ord = (r) => ({ alloc: { intervention: 6, proximite: 3, recherche: 3, roulage: 2, admin: 2 }, rythme: 'normal', roles: r });
const avant = st.nonDroit.secteurs[squat].emprise;
let r = resolveTurn(st, { orders: { a: ord({ [autre]: { rep: 2, desc: 0, bouc: 0 } }), b: ord({ [squat]: { rep: 0, desc: 4, bouc: 2 } }), c: ord({ [squat]: { rep: 0, desc: 4, bouc: 2 } }) }, nextWeekday: 2 });
st = r.state;
assert.ok(st.nonDroit.secteurs[autre].connue, 'faille connue après repérage');
assert.ok(repere(st.nonDroit.secteurs[autre], st.turn), 'repéré dès le lendemain');
assert.ok(st.nonDroit.secteurs[squat].emprise >= avant, 'squat sans mandat : rien ne bouge');
assert.ok((r.gazette.nonDroit.repousses || []).some((x) => String(x.cell) === squat));

// 3. Soir 2 : descente repérée à trois zones, bien bouclée : l'emprise baisse, saisies, le repéreur touche sa part.
const e0 = st.nonDroit.secteurs[autre].emprise, b0 = st.zones.a.budget;
r = resolveTurn(st, { orders: { a: ord({}), b: ord({ [autre]: { rep: 0, desc: 4, bouc: 2 } }), c: ord({ [autre]: { rep: 0, desc: 4, bouc: 2 } }) }, nextWeekday: 3 });
st = r.state;
const d = (r.gazette.nonDroit.descentes || []).find((x) => String(x.cell) === autre);
assert.ok(d && d.repere && d.butin > 0, 'descente repérée avec saisies');
assert.ok(st.nonDroit.secteurs[autre].emprise < e0 || st.nonDroit.secteurs[autre].statut === 'repris');
assert.ok((st.zones.a.stats.reperagesUtiles || 0) >= 1, 'le repérage a servi');
console.log('nondroit-roles : ok');
