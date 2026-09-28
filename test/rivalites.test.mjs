// Entraide, manœuvres, duels, Conseil, péril et faillite.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { PERIL } from '../js/engine/rivalites.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let s = createGame({ seed: 'riv' });
s = resolveTurn(s, { players }).state;
const tour = (orders = {}, wd = 2) => { const r = resolveTurn(s, { players, orders: { A: base, B: base, C: base, ...orders }, nextWeekday: wd }); s = r.state; return r.gazette; };

// Les nouvelles zones sont protégées quelques tours.
assert.ok(s.zones.A.protegeJusqua > 0);
let g = tour({ A: { ...base, manoeuvre: { type: 'debauchage', cible: 'B' } } });
assert.ok(s.zones.A.rapport.some((l) => l.includes('Manœuvre annulée')), 'cible protégée');
for (let i = 0; i < 5; i++) tour();

// Signalement vrai : Inspection chez C, réputation pour A (+3 −2).
s.zones.C.paperasse = 22; s.zones.C.inspectionCooldown = 0;
const repA = s.zones.A.reputation, budC = s.zones.C.budget;
g = tour({ A: { ...base, manoeuvre: { type: 'signalement', cible: 'C' } } });
assert.ok(s.zones.C.rapport.some((l) => l.includes('Inspection générale sur signalement')));
assert.ok(s.zones.C.budget < budC);
assert.ok(g.breves.concat([g.une]).some((n) => n.kicker === 'Manœuvre'));
g = tour();
assert.ok(g.breves.concat([g.une]).some((n) => n.kicker === 'Révélation' && n.titre.includes('Alpha')), 'auteur révélé le lendemain');
void repA;

// Entraide : B envoie 5 k€ et 2 agents à A.
const budA = s.zones.A.budget;
tour({ B: { ...base, aide: { cible: 'A', budget: 5, agents: 2 } } });
assert.ok(s.zones.A.budget > budA + 3, 'budget reçu');
assert.equal(s.zones.A.renforts.length, 1, 'agents prêtés');
assert.ok(s.zones.B.blesses.some((b) => b.motif === 'prêté'));

// Duel : A défie B, B accepte, 5 tours plus tard c'est fini.
tour({ A: { ...base, duel: { cible: 'B', ind: 'incidents' } } });
assert.equal(s.duels.length, 1);
const id = s.duels[0].id;
tour({ B: { ...base, duelReponse: { id, accepte: true } } });
assert.equal(s.duels[0].etape, 'encours');
for (let i = 0; i < 5; i++) tour();
assert.equal(s.duels.length, 0, 'duel terminé');

// Conseil : annoncé la veille du dimanche, dépouillé le dimanche.
tour({}, 0);
assert.ok(s.conseil && s.conseil.motions.length >= 2);
const budgets = Object.fromEntries(['A', 'B', 'C'].map((u) => [u, s.zones[u].budget]));
g = tour({ A: { ...base, votes: { dotation: 0, theme: 1 } }, B: { ...base, votes: { dotation: 0, theme: 1 } }, C: { ...base, votes: { dotation: 1, theme: 2 } } });
assert.ok(g.conseil.length >= 2);
assert.equal(s.theme && s.theme.id, 'routiere', 'thème voté');
assert.ok(s.zones.A.budget > budgets.A, 'dotation reçue');
assert.equal(s.conseil, null);

// Péril puis faillite.
s.zones.C.budget = -60;
tour();
assert.ok(s.zones.C.peril, 'zone en péril');
const g2 = tour({ A: { ...base, manoeuvre: { type: 'debauchage', cible: 'C' } } });
assert.ok(s.zones.A.rapport.some((l) => l.includes('Manœuvre annulée')), 'zone en péril protégée');
void g2;
tour(); g = tour();
assert.equal(s.zones.C.faillites, 1, 'faillite comptée');
assert.equal(s.zones.C.budget > 40, true, 'nouvelle zone');
assert.equal(s.zones.C.peril, null);
assert.equal(s.toursSansFaillite, 0);
assert.ok([g.une, ...g.breves].some((n) => n.kicker === 'Faillite'));
assert.ok(PERIL.tours === 3);

console.log('OK : entraide, manœuvres, duels, Conseil et faillite vérifiés.');
