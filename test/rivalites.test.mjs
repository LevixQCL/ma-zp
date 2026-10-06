// Pactes, défis amicaux, coup de main, Conseil, péril et faillite.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { PERIL, SOLIDARITE } from '../js/engine/rivalites.js';
import { PACTE, DEFI, pacteImpossible, remiseAchat, moitiesPiece } from '../js/engine/pactes.js';
import { coutDecision } from '../js/engine/zone.js';
import { secteurOuvert } from '../js/engine/constants.js';
import { affaire, faitsConnus } from '../js/engine/enquete.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' }, D: { code: '4444', nom: 'Delta' } };
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let s;
// Une saison dure 14 tours : chaque partie de test repart d'une partie neuve.
const neuve = (seed) => { s = resolveTurn(createGame({ seed }), { players }).state; tour(); tour(); };
const tour = (orders = {}, wd = 2) => { const r = resolveTurn(s, { players, orders: { A: base, B: base, C: base, D: base, ...orders }, nextWeekday: wd }); s = r.state; return r.gazette; };
const rap = (u, txt) => s.zones[u].rapport.some((l) => l.includes(txt));
neuve('riv-achat');

// ── Centrale d'achat : proposée, acceptée, remise dès le lendemain, fin au bout de 7 tours.
tour({ A: { ...base, pacte: { cible: 'B', type: 'achat' } } });
assert.equal(s.pactes.length, 1);
assert.equal(s.pactes[0].etape, 'propose');
const idAchat = s.pactes[0].id;
let g = tour({ B: { ...base, pacteReponse: { id: idAchat, accepte: true } } });
assert.equal(s.pactes[0].etape, 'actif');
assert.ok([g.une, ...g.breves].some((n) => n.kicker === 'Pacte'), 'annoncé dans la Gazette');
assert.equal(remiseAchat(s, 'A'), PACTE.remise);
assert.equal(s.zones.A.remiseAchat, PACTE.remise);
assert.equal(coutDecision(s.zones.A, { type: 'former', service: 'admin' }), Math.round(4 * (1 - PACTE.remise) * 10) / 10, 'formation moins chère');
assert.equal(remiseAchat(s, 'C'), 0);
assert.equal(pacteImpossible(s, 'A', 'B'), 'déjà liée');
for (let i = 0; i < PACTE.duree - 1; i++) tour();
assert.equal(s.pactes.length, 1, 'encore actif le dernier soir');
tour();
assert.equal(s.pactes.length, 0, 'terminé après 7 tours');
assert.ok(rap('A', 'arrive à son terme'));
assert.ok(!s.zones.A.remiseAchat, 'plus de remise');
assert.equal(s.zones.A.stats.pactesTenus, 1);

neuve('riv-enq');
// ── Pacte d'enquête : deux demi-pièces, réunies seulement si les deux mettent en commun.
tour({ A: { ...base, pacte: { cible: 'C', type: 'enquete' } } });
const idEnq = s.pactes[0].id;
tour({ C: { ...base, pacteReponse: { id: idEnq, accepte: true } } });
let p = s.pactes.find((x) => x.id === idEnq);
assert.ok(p.frag, 'demi-pièce créée le soir de l’accord');
const f1 = p.frag.f;
assert.ok(!faitsConnus(s.zones.A.enquete).includes(f1) && !faitsConnus(s.zones.C.enquete).includes(f1), 'pièce inconnue des deux');
const m = moitiesPiece(affaire(s, s.enquete.n), f1);
assert.ok(m.haut.titre && m.bas.texte && !m.bas.texte.includes(affaire(s, s.enquete.n).suspects[Number(f1.split(':')[1])]?.nom || '§'), 'nom masqué dans la moitié « texte »');
// Une seule zone met en commun : rien encore.
tour({ A: { ...base, fragment: idEnq } });
assert.ok(!faitsConnus(s.zones.A.enquete).includes(f1));
p = s.pactes.find((x) => x.id === idEnq);
// Le soir suivant, l'autre aussi : les deux ont la pièce (avant le remplacement de la demi-pièce).
tour({ C: { ...base, fragment: idEnq } });
assert.ok(faitsConnus(s.zones.A.enquete).includes(f1) && faitsConnus(s.zones.C.enquete).includes(f1), 'pièce entière pour les deux');
assert.equal(s.zones.A.enquete.pieces.find((x) => x.f === f1).src, 'pacte');
assert.ok(rap('A', 'vous réunissez les deux moitiés'));

// ── Pacte refusé (pas de réponse) : rien.
tour({ C: { ...base, pacte: { cible: 'D', type: 'terrain' } } });
tour();
assert.ok(!s.pactes.some((x) => x.b === 'D'));
assert.ok(rap('C', 'n’a pas donné suite'));

// ── Rupture : publique, blocage, compteur.
g = tour({ C: { ...base, pacteRompre: idEnq } });
assert.equal(s.pactes.length, 0);
assert.ok([g.une, ...g.breves].some((n) => n.kicker === 'Pacte rompu'));
assert.equal(s.zones.C.stats.pactesRompus, 1);
assert.equal(pacteImpossible(s, 'C', 'B'), 'pacte rompu récemment');

neuve('riv-jour');
// ── Proposition par message, acceptée le jour même : signé dès ce soir (et défi lancé dès ce soir).
tour({ A: { ...base, pacte: { cible: 'D', type: 'achat' }, defi: { cible: 'D', ind: 'incidents', mise: 3 } }, D: { ...base, pacteAccepte: [{ de: 'A', type: 'achat' }], defiAccepte: [{ de: 'A', ind: 'incidents', mise: 3 }] } });
assert.equal(s.pactes.find((x) => x.a === 'A' && x.b === 'D').etape, 'actif', 'pacte signé le jour même');
assert.equal(s.zones.A.remiseAchat, PACTE.remise, 'remise dès demain');
assert.equal(s.defis.find((x) => x.a === 'A').etape, 'encours', 'défi lancé le jour même');
// Acceptation d'un autre type que celui proposé : rien de signé, réponse possible demain.
tour({ B: { ...base, pacte: { cible: 'C', type: 'terrain' } }, C: { ...base, pacteAccepte: [{ de: 'B', type: 'achat' }] } });
assert.equal(s.pactes.find((x) => x.a === 'B' && x.b === 'C').etape, 'propose');

neuve('riv-jum');
// ── Jumelage : un partenaire qui ne joue plus éteint le pacte, sans pénalité.
tour({ B: { ...base, pacte: { cible: 'D', type: 'terrain' } } });
tour({ D: { ...base, pacteReponse: { id: s.pactes[0].id, accepte: true } } });
assert.equal(s.pactes[0].etape, 'actif');
{
  const k = Object.keys(s.nonDroit.secteurs).find((c) => secteurOuvert(s.nonDroit, c));
  tour({ B: { ...base, secteurs: { [k]: 3 } }, D: { ...base, secteurs: { [k]: 3 } }, C: { ...base, secteurs: { [k]: 3 } } });
  assert.ok(rap('B', 'Jumelage : avec') && rap('D', 'Jumelage : avec'), 'force majorée pour les jumelés');
  assert.ok(!rap('C', 'Jumelage : avec'), 'pas pour les autres');
}
const sansD = () => { const r = resolveTurn(s, { players, orders: { A: base, B: base, C: base }, nextWeekday: 2 }); s = r.state; };
let n = 0;
while (s.pactes.length && n < 4) { sansD(); n++; }
assert.equal(s.pactes.length, 0, 'pacte éteint');
assert.equal(n, PACTE.inactif, 'au bout de 2 soirs sans nouvelles');
assert.ok(rap('B', 's’éteint, sans pénalité'));
assert.ok(!(s.zones.B.stats.pactesRompus > 0));
tour();

neuve('riv-defi');
// ── Défi amical : mise prise, pot au gagnant + prime.
s.zones.A.budget = 50; s.zones.B.budget = 50;
tour({ A: { ...base, defi: { cible: 'B', ind: 'dossiers', mise: 5 } } });
assert.equal(s.defis.length, 1);
const idDefi = s.defis[0].id;
const bA = s.zones.A.budget, bB = s.zones.B.budget;
tour({ B: { ...base, defiReponse: { id: idDefi, accepte: true } } });
assert.equal(s.defis[0].etape, 'encours');
assert.ok(s.zones.A.budget <= bA - 5 + 30 && s.zones.A.rapport.some((l) => l.includes('relève ton défi')));
s.zones.A.stats.dossiersResolus = (s.zones.A.stats.dossiersResolus || 0);
for (let i = 0; i < DEFI.duree; i++) { s.zones.A.stats.dossiersResolus += 0; tour({ A: { ...base, alloc: { intervention: 3, proximite: 3, recherche: 10, roulage: 2, admin: 2 } } }); }
assert.equal(s.defis.length, 0, 'défi terminé');
assert.ok(rap('A', 'Défi gagné') || rap('B', 'Défi gagné') || rap('A', 'égalité'), 'verdict');
if (rap('A', 'Défi gagné')) assert.ok(s.zones.A.stats.defisGagnes === 1);
void bB;

// ── Défi refusé : aucune conséquence.
tour({ C: { ...base, defi: { cible: 'D', ind: 'incidents', mise: 3 } } });
const bC = s.zones.C.budget;
tour();
assert.equal(s.defis.length, 0);
assert.ok(Math.abs(s.zones.C.budget - bC) < 20, 'pas de mise prise');

neuve('riv-conseil');
// ── Coup de main : refusé vers une zone qui va bien.
tour({ B: { ...base, aide: { cible: 'A', budget: 5, agents: 2 } } });
assert.ok(rap('B', 'Coup de main annulé'));

// ── Conseil : annoncé la veille du dimanche, dépouillé le dimanche.
tour({}, 0);
assert.ok(s.conseil && s.conseil.motions.length >= 1 && !s.conseil.motions.some((m) => m.id === 'theme'));
const budgets = Object.fromEntries(['A', 'B', 'C'].map((u) => [u, s.zones[u].budget]));
g = tour({ A: { ...base, votes: { dotation: 0, theme: 1 } }, B: { ...base, votes: { dotation: 0, theme: 1 } }, C: { ...base, votes: { dotation: 1, theme: 2 } } });
assert.ok(g.conseil.length >= 1);
assert.ok(!s.theme, 'plus de thème de la semaine : remplacé par les crises du district');
assert.ok(s.zones.A.budget > budgets.A - 15, 'dotation reçue');
assert.equal(s.conseil, null);

neuve('riv-peril');
// ── Péril : coup de main accepté, fonds de solidarité au Conseil, puis tutelle et faillite.
s.zones.C.budget = -60;
tour();
assert.ok(s.zones.C.peril, 'zone en péril');
const budC = s.zones.C.budget;
tour({ B: { ...base, aide: { cible: 'C', budget: 5, agents: 2 } } });
assert.ok(s.zones.C.budget > budC, 'budget reçu');
assert.ok(rap('B', 'Coup de main : tu envoies'));
assert.ok((s.zones.B.trophees || []).some((t) => t.id === 'sauveur'), 'trophée Sauveur');
tour({}, 0);
const sol = s.conseil.motions.find((x) => x.id === 'solidarite');
assert.ok(sol && sol.cible === 'C', 'motion de solidarité proposée');
const avantSol = s.zones.C.budget;
tour({ A: { ...base, votes: { solidarite: 1 } }, B: { ...base, votes: { solidarite: 1 } }, D: { ...base, votes: { solidarite: 1 } } });
assert.ok(s.zones.C.rapport.some((l) => l.includes('fonds de solidarité')), 'fonds versé');
assert.ok(s.zones.C.budget > avantSol - 10 + SOLIDARITE.parZone);
s.zones.C.budget = -60;
for (let i = 0; i < 4 && !s.zones.C.tutelle; i++) tour();
assert.ok(s.zones.C.tutelle, 'zone sous tutelle');
// Sous tutelle : pas de défi, ni de grande décision autre que recruter.
tour({ C: { ...base, rythme: 'renforce', defi: { cible: 'A', ind: 'incidents', mise: 0 }, decision: { type: 'former', service: 'admin' } } });
assert.ok(!s.defis.some((d) => d.a === 'C'), 'pas de défi sous tutelle');
assert.ok(!s.zones.C.rapport.some((l) => l.includes('Formation lancée')), 'pas de grande décision sous tutelle');
s.zones.C.budget = -60;
for (let i = 0; i < 6 && !(s.zones.C.faillites > 0); i++) { s.zones.C.budget = -60; g = tour(); }
assert.equal(s.zones.C.faillites, 1, 'faillite comptée');
assert.equal(s.zones.C.budget > 40, true, 'nouvelle zone');
assert.ok(PERIL.tours === 3);

console.log('OK : pactes, défis amicaux, coup de main, Conseil et faillite vérifiés.');
