// Zone de non-droit : règles de base.
import assert from 'node:assert/strict';
import { createGame, resolveTurn, migrateState } from '../js/engine/resolve.js';
import { newZone, sanitizeOrders, agentsLibres } from '../js/engine/zone.js';
import { ND, secteurOuvert } from '../js/engine/constants.js';
import { territoires, nonDroit } from '../js/ui/ville.js';
import { CONFIG } from '../js/config.js';

// La carte : le centre est réservé, aucune zone n'y a de quartier.
const g = nonDroit(CONFIG.seed);
const zs = Array.from({ length: 12 }, (_, k) => ({ uid: `z${k}`, arrivee: k }));
const T = territoires(CONFIG.seed, zs);
for (const tz of T.zones) for (const i of tz.quartiers) assert.ok(!g.cells.includes(i), 'aucune zone dans la zone de non-droit');
assert.ok(T.zones.every((tz) => tz.quartiers.length === 6), 'chaque zone garde 6 quartiers');

// Au-delà du monde de base, la carte s'agrandit sans déplacer les zones déjà installées.
const T26 = territoires(CONFIG.seed, Array.from({ length: 26 }, (_, k) => ({ uid: `z${k}`, arrivee: k })));
const T60 = territoires(CONFIG.seed, Array.from({ length: 60 }, (_, k) => ({ uid: `z${k}`, arrivee: k })));
assert.ok(T60.anneaux > 0 && T60.zones.every((tz) => tz.quartiers.length === 6), '60 zones ont toutes leurs quartiers');
T26.zones.forEach((tz, k) => assert.deepEqual(T60.zones[k].quartiers, tz.quartiers, 'les premières zones ne bougent pas'));

const base = () => {
  const state = createGame({ seed: 'nd-test' });
  for (const u of ['a', 'b', 'c']) state.zones[u] = newZone({ uid: u, code: '5300', nom: u }, 1);
  return state;
};
let state = base();
const nd = state.nonDroit;
assert.equal(Object.keys(nd.secteurs).length, g.cells.length);
assert.equal(state.affaires.length, 0, 'plus d’affaires disputées');
const coeur = String(g.coeur), s1 = String(g.anneau[0]);
assert.ok(!secteurOuvert(nd, coeur), 'le Cœur est fermé au départ');

// Ordres : plafonds par secteur et au total, Cœur refusé, agents comptés hors services.
const o = sanitizeOrders(state.zones.a, { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, secteurs: { [s1]: 9, [g.anneau[1]]: 5, [coeur]: 3, 999: 2 } }, state);
assert.ok(Object.values(o.secteurs).every((n) => n <= ND.maxParSecteur));
assert.equal(o.secteurs[coeur], undefined);
assert.equal(o.secteurs[999], undefined);
assert.equal(Object.values(o.secteurs).reduce((a, b) => a + b, 0), ND.maxTotal);
assert.equal(Object.values(o.alloc).reduce((a, b) => a + b, 0) + ND.maxTotal, 20, 'les agents envoyés quittent les services');
assert.equal(agentsLibres(state.zones.a, o, 1), 0);

// Seul avec 2 agents : le milieu tient. À trois zones : le secteur tombe en quelques soirs.
const alloc = { intervention: 6, proximite: 4, recherche: 4, roulage: 1, admin: 3 };
let r;
for (let t = 0; t < 5; t++) { r = resolveTurn(state, { orders: { a: { alloc, secteurs: { [s1]: 2 } }, b: { alloc }, c: { alloc } } }); state = r.state; }
assert.ok(state.nonDroit.secteurs[s1].statut === 'milieu' && state.nonDroit.secteurs[s1].emprise > nd.secteurs[s1].emprise - 12, 'seul, ça plafonne');
let pris = null;
for (let t = 0; t < 6 && !pris; t++) {
  r = resolveTurn(state, { orders: Object.fromEntries(['a', 'b', 'c'].map((u) => [u, { alloc, secteurs: { [s1]: 3 } }])) });
  state = r.state;
  pris = r.gazette.nonDroit.prises.find((p) => p.cell === Number(s1));
}
assert.ok(pris, 'à trois, le secteur est repris');
assert.equal(pris.zones.length, 3);
assert.equal(state.nonDroit.secteurs[s1].statut, 'repris');
assert.ok(r.gazette.rapports.a.some((l) => l.includes('est repris')));

// Abandonné : le secteur finit par retomber, et les zones inactives ne bloquent rien.
let rechute = false;
for (let t = 0; t < 12 && !rechute; t++) {
  r = resolveTurn(state, { orders: Object.fromEntries(['a', 'b', 'c'].map((u) => [u, { alloc }])) });
  state = r.state;
  rechute = r.gazette.nonDroit.rechutes.some((x) => x.cell === Number(s1));
}
assert.ok(rechute, 'sans garde, le secteur retombe');

// Une partie sauvegardée avant la mise à jour reçoit sa zone de non-droit.
const vieux = base(); delete vieux.nonDroit;
assert.ok(migrateState(vieux).nonDroit.secteurs[coeur]);

console.log('OK : zone de non-droit (carte, ordres, reprise à plusieurs, rechute, migration).');
