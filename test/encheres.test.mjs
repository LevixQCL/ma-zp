// Salle des ventes, subside par agent et effets de la réputation.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { LOTS, ENCHERE, SUBSIDE, REPUTATION, COUTS } from '../js/engine/constants.js';
import { fraisFixes, coutRecrue, capacite } from '../js/engine/zone.js';
import { encherePossible } from '../js/engine/encheres.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let s = createGame({ seed: 'ench' });
assert.ok(s.enchere && LOTS[s.enchere.lot], 'un lot dès la création');
s = resolveTurn(s, { players }).state;
const tour = (orders = {}) => { const r = resolveTurn(s, { players, orders: { A: base, B: base, C: base, ...orders }, nextWeekday: 2 }); s = r.state; return r.gazette; };

// Un nouveau lot chaque jour, jamais un des 3 derniers.
const vus = [];
for (let i = 0; i < 6; i++) { assert.equal(s.enchere.tour, s.turn); vus.push(s.enchere.lot); tour(); }
for (let i = 3; i < vus.length; i++) assert.ok(!vus.slice(i - 3, i).includes(vus[i]), 'pas de répétition immédiate');

// On force un lot ouvert pour tester la vente.
s.enchere = { id: 'test-1', lot: 'chien', tour: s.turn, prixMin: 5 };
for (const u of ['A', 'B', 'C']) { s.zones[u].budget = 40; s.zones[u].reputation = 50; }
s.zones.B.reputation = 58;
const capAvant = capacite(s.zones.A, 'recherche', 4);
let g = tour({ A: { ...base, offre: { id: 'test-1', montant: 9 } }, B: { ...base, offre: { id: 'test-1', montant: 9 } }, C: { ...base, offre: { id: 'test-1', montant: 4 } } });
assert.equal(g.enchere.gagnant, 'B', 'égalité : la meilleure réputation gagne');
assert.equal(g.enchere.montant, 9);
assert.ok(g.enchere.egalite);
assert.ok(s.zones.B.lots.some((l) => l.id === 'chien'));
assert.ok(s.zones.B.compta.lignes.some((l) => l.k === 'enchere' && l.v === -9), 'offre débitée');
assert.ok(!s.zones.A.compta.lignes.some((l) => l.k === 'enchere'), 'perdant non débité');
assert.ok(s.zones.C.rapport.some((l) => l.includes('sous la mise à prix')), 'offre trop basse refusée');
assert.ok(capacite(s.zones.B, 'recherche', 4) > capAvant * 1.1, 'bonus du chien pisteur');

// Un lot gagné bloque les enchères pendant une semaine.
s.enchere = { id: 'test-1b', lot: 'drone', tour: s.turn, prixMin: 5 };
assert.ok(encherePossible(s, s.zones.B), 'B doit attendre');
assert.equal(encherePossible(s, s.zones.A), null);

// Lot réservé : il faut la réputation.
s.enchere = { id: 'test-2', lot: 'parquet', tour: s.turn, prixMin: 6 };
s.zones.A.reputation = 50; s.zones.C.reputation = ENCHERE.repReserve + 5;
g = tour({ A: { ...base, offre: { id: 'test-2', montant: 20 } }, C: { ...base, offre: { id: 'test-2', montant: 7 } } });
assert.equal(g.enchere.gagnant, 'C', 'lot réservé aux zones réputées');
assert.ok(s.zones.A.rapport.some((l) => l.includes('réservé')));

// Offre supérieure au budget : refusée.
s.enchere = { id: 'test-3', lot: 'banalise', tour: s.turn, prixMin: 4 };
s.zones.A.budget = 5;
const vehA = s.zones.A.vehicules;
g = tour({ A: { ...base, offre: { id: 'test-3', montant: 12 } } });
assert.equal(g.enchere.gagnant, undefined);
assert.equal(s.zones.A.vehicules, vehA);

// Subside communal : par agent au-delà de l'effectif de départ, plus la confiance (réputation).
const z = JSON.parse(JSON.stringify(s.zones.A));
z.agents = SUBSIDE.seuil; z.reputation = 50;
const f0 = fraisFixes(z, s);
assert.ok(!f0.lignes.some((l) => l.k === 'subside' || l.k === 'confiance'), 'rien à 20 agents et réputation 50');
z.agents = SUBSIDE.seuil + 10; z.reputation = 80;
const f1 = fraisFixes(z, s);
assert.equal(f1.lignes.find((l) => l.k === 'subside').v, 1.5);
assert.equal(f1.lignes.find((l) => l.k === 'confiance').v, 6, 'réputation 80 : +6 k€');
z.reputation = 20;
assert.equal(fraisFixes(z, s).lignes.find((l) => l.k === 'confiance').v, -3, 'réputation 20 : −3 k€ (malus deux fois plus doux)');

// Recrues : moins chères pour une zone réputée, plus chères pour une zone mal vue.
assert.equal(coutRecrue({ reputation: 50 }), COUTS.recrue);
assert.equal(coutRecrue({ reputation: REPUTATION.recrueHaute }), REPUTATION.coutRecrueHaute);
assert.equal(coutRecrue({ reputation: REPUTATION.recrueBasse - 1 }), REPUTATION.coutRecrueBasse);

console.log('OK : salle des ventes, subside par agent et réputation vérifiés.');
