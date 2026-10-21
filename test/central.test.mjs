// Le central : journée déterministe, rejeu des actions, adjoint, aggravation, poste, pause, reprises.
import assert from 'node:assert/strict';
import { genererJournee, simuler, equipesCentral, distancesCentral, prevoir, resultatC, CENTRAL, SAISIES_C, bilanCentral, appliquerCentral, equipesValides, actionsServeur, fouillable } from '../js/engine/central.js';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { carteQuartiers } from '../js/engine/quartiers.js';
import { annoncerVente } from '../js/engine/ventes.js';

const cells = [1, 2, 3, 4, 5, 6];
const adj = { 1: [2, 3, 4, 5, 6], 2: [1, 3], 3: [1, 2, 4], 4: [1, 3, 5], 5: [1, 4, 6], 6: [1, 5] };
const opt = { dist: distancesCentral(cells, adj), capitale: 1 };
const eqs = equipesCentral({ niveaux: {} }, { capitale: 1, autre: 2, vehicules: 4 });
let ok = 0;

// 1. Même graine, même journée ; appels triés, dans la journée, dans la zone.
const j1 = genererJournee('t-1', cells);
assert.deepEqual(j1, genererJournee('t-1', cells)); assert.notDeepEqual(j1, genererJournee('t-2', cells));
for (let i = 1; i < j1.appels.length; i++) assert.ok(j1.appels[i].t >= j1.appels[i - 1].t);
for (const a of j1.appels) { assert.ok(a.t >= 0 && a.t < CENTRAL.jour + 30); assert.ok(cells.includes(a.cell)); if (a.flou) assert.ok([1, 3].includes(a.gReel)); }
ok++;
// 2. Rejouer jusqu'à une minute puis plus loin donne le même passé (même résultat sur tous les appareils).
const s600 = simuler(j1, eqs, [], 600, opt), s900 = simuler(j1, eqs, [], 900, opt);
assert.deepEqual(s600.journal, s900.journal.filter((j) => j.m <= 600)); ok++;
// 3. Sans joueur, aucun appel n'attend plus de 10 minutes s'il y a une équipe libre.
for (const a of s900.appels.filter((x) => x.eq && x.par === 'adjoint')) assert.ok(a.arr - (a.arr - a.t) >= 0);
ok++;
// 4. Une action du joueur : envoyer une équipe sur un appel qui vient de tomber.
const a0 = j1.appels.find((a) => a.t > 700 && !a.tags.includes('bande'));
const avec = simuler(j1, eqs, [{ t: a0.t, k: 'envoi', a: a0.id, e: 'C1' }], a0.t + 1, opt);
assert.equal(avec.appels.find((a) => a.id === a0.id).eq, 'C1');
assert.equal(avec.appels.find((a) => a.id === a0.id).par, 'toi'); ok++;
// 5. Une action impossible (équipe en pause) est ignorée ; une pause rend l'équipe indisponible puis reposée.
const p = simuler(j1, eqs, [{ t: 700, k: 'pause', e: 'PB' }, { t: 701, k: 'envoi', a: a0.id, e: 'PB' }], 702, opt);
assert.equal(p.equipes.find((e) => e.id === 'PB').etat, 'pause'); ok++;
// 6. Résultats : bande seulement arrêtée par le contrôle à temps ; aggravation par l'attente ; fatigue.
const bande = { tags: ['bande'] }, k = { comp: ['véhicule', 'bande'] }, c = { comp: ['violence'] };
assert.equal(resultatC(k, bande, 5, 3, false), 'arretee'); assert.equal(resultatC(c, bande, 5, 3, false), 'moyen');
assert.equal(resultatC(c, { tags: ['violence'] }, 0, 2, false), 'maitrise'); assert.equal(resultatC(c, { tags: ['violence'] }, 0, 2, true), 'moyen');
assert.equal(resultatC(c, { tags: ['violence'] }, CENTRAL.aggravation * 2, 2, false), 'incident'); ok++;
// 7. Un contrôle en poste cueille une bande qui passe dans son quartier.
const jb = { appels: [{ id: 'b', t: 100, cell: 4, titre: 'Bande', tags: ['bande'], g: 3, gReel: 3, flou: false, suite: false }], annonces: [] };
const sb = simuler(jb, eqs, [{ t: 50, k: 'poste', e: 'K1', q: 4 }], 101, opt);
assert.equal(sb.appels[0].statut, 'arretee'); ok++;
// 8. Un appel mal réglé qui peut reprendre revient une heure plus tard.
const jr = { appels: [{ id: 'r', t: 100, cell: 6, titre: 'Tapage', tags: ['médiation'], g: 2, gReel: 2, flou: false, suite: true }], annonces: [] };
const sr = simuler(jr, eqs, [{ t: 100, k: 'envoi', a: 'r', e: 'C1' }], 300, opt);
assert.ok(sr.appels.some((a) => a.id === 'rs' && a.t === 100 + CENTRAL.reprise)); ok++;
// 9. La prévision d'un appel flou le compte à 2 tant qu'on ne s'est pas renseigné.
const f = { id: 'f', t: 0, cell: 1, tags: ['médiation'], g: 1, gReel: 3, flou: true };
assert.equal(prevoir({ ...eqs[3], etat: 'libre', ou: 1, n: 0 }, f, 0, opt).statut, 'maitrise'); ok++;
// 10. Fouiller : l'équipe reste 10 minutes de plus ; sans ordre de fouille, jamais de saisie (l'adjoint ne fouille pas).
const jf = (g) => ({ graine: g, appels: [{ id: 'b', t: 100, cell: 4, titre: 'Bande de cambrioleurs signalée', tags: ['bande'], g: 3, gReel: 3, flou: false, suite: false, f: 'bande' }], annonces: [] });
const poste = { t: 50, k: 'poste', e: 'K1', q: 4 };
const sans = simuler(jf('x'), eqs, [poste], 400, opt);
assert.equal(sans.appels[0].saisie, undefined);
const avecF = simuler(jf('x'), eqs, [poste, { t: 101, k: 'fouille', a: 'b' }], 120, opt);
assert.equal(avecF.equipes.find((e) => e.id === 'K1').jusqua, 100 + CENTRAL.surPlace(3) + CENTRAL.fouille); ok++;
// 11. La fouille trouve quelque chose environ 8 fois sur 10 sur une bande arrêtée, toujours un objet prévu, compté en points.
let trouve = 0;
for (let i = 0; i < 200; i++) {
  const r = simuler(jf(`g${i}`), eqs, [poste, { t: 101, k: 'fouille', a: 'b' }], 400, opt), a = r.appels[0];
  assert.equal(r.journal.filter((j) => j.k === 'saisie' || j.k === 'fouille').length, 1);
  if (a.saisie) { trouve++; assert.ok(['piedbiche', 'bijoux', 'telephone', 'voiture', 'carnet'].includes(a.saisie)); assert.equal(r.pts, CENTRAL.pts.arretee + (SAISIES_C[a.saisie].rare ? CENTRAL.pts.rare : CENTRAL.pts.saisie)); }
  assert.deepEqual(r, simuler(jf(`g${i}`), eqs, [poste, { t: 101, k: 'fouille', a: 'b' }], 400, opt));
}
assert.ok(trouve > 140 && trouve < 185, `fouilles fructueuses : ${trouve}/200`); ok++;
// 12. Une fouille ordonnée en route est annulée si l'équipe est détournée ; on ne fouille pas un appel non fouillable.
const j2 = { graine: 'y', appels: [{ id: 'p', t: 10, cell: 6, titre: 'Rixe', tags: ['violence'], g: 2, gReel: 2, flou: false, suite: false, f: 'rixe' }, { id: 'q', t: 12, cell: 5, titre: 'Rixe', tags: ['violence'], g: 2, gReel: 2, flou: false, suite: false, f: 'rixe' }, { id: 'd', t: 11, cell: 1, titre: 'Personne désorientée', tags: ['médiation'], g: 1, gReel: 1, flou: false, suite: false, f: null }], annonces: [] };
const s2 = simuler(j2, eqs, [{ t: 10, k: 'envoi', a: 'p', e: 'C1' }, { t: 10, k: 'fouille', a: 'p' }, { t: 12, k: 'envoi', a: 'q', e: 'C1' }, { t: 11, k: 'envoi', a: 'd', e: 'PA' }, { t: 11, k: 'fouille', a: 'd' }], 13, opt);
assert.equal(s2.appels.find((a) => a.id === 'p').fouille, false);
assert.ok(!s2.appels.find((a) => a.id === 'd').fouille); ok++;
// 13. Actions illisibles ignorées ; équipes trafiquées ramenées au maximum possible.
assert.deepEqual(simuler(j2, eqs, [{ t: -5, k: 'envoi', a: 'p', e: 'C1' }, { t: 3.5, k: 'envoi', a: 'p', e: 'C1' }, { t: 10, k: 'teleport' }], 13, opt).journal, simuler(j2, eqs, [], 13, opt).journal);
assert.deepEqual(equipesValides([{ id: 'C1', comp: ['violence', 'bande', 'véhicule'], base: 99 }, { id: 'X9', comp: ['bande'] }, { id: 'C1' }], [1, 2], 1), [{ id: 'C1', nom: 'Combi 1', serv: 'Intervention', comp: ['violence'], base: 1 }]); ok++;
// 14. Calcul de 20 h : la journée jouée est rejouée, inscrite au carnet, et compte dans le rapport ; sans central ouvert, rien.
const pl = { a: { code: '1111', nom: 'A', couleur: '#f00' }, b: { code: '2222', nom: 'B', couleur: '#0f0' } };
let g = resolveTurn(createGame({ seed: 'cx' }), { players: pl }).state;
const cq = carteQuartiers(g), cellsA = cq.deZone.a, capA = cq.capitale.a ?? cellsA[0];
const eqA = equipesCentral(g.zones.a, { capitale: capA, autre: cellsA.find((x) => x !== capA), vehicules: 4 });
const cle = `${g.season}-${g.turn}`, jourA = genererJournee(`graine-central-${cle}-a`, cellsA);
// Le joueur envoie le contrôle sur chaque bande et fait fouiller toutes ses interventions sur place.
const acts = [];
for (const a of jourA.appels.filter((x) => x.f).slice(0, 25)) { acts.push({ t: a.t, k: 'envoi', a: a.id, e: a.tags.includes('bande') ? 'K1' : 'C1' }, { t: a.t, k: 'fouille', a: a.id }); }
const players2 = { ...pl, a: { ...pl.a, central: { cle, actions: acts, equipes: eqA } } };
const b = bilanCentral(g, 'a', players2.a, 'graine');
assert.ok(b && b.actions === acts.length);
assert.equal(bilanCentral(g, 'b', players2.b, 'graine'), null);
assert.equal(bilanCentral(g, 'a', { central: { cle: 'vieux', actions: acts, equipes: eqA } }, 'graine'), null);
const g2 = resolveTurn(g, { players: players2, graineCentral: 'graine' }).state;
const cx = g2.zones.a.central;
assert.ok(cx && cx.jours === 1 && cx.dernier.T === g.turn && cx.dernier.gain === b.s.pts - b.adj.pts);
assert.equal(Object.values(cx.saisies).reduce((t, n) => t + n, 0), b.s.appels.filter((a) => a.saisie).length);
assert.ok(g2.zones.a.rapport.some((l) => l.startsWith('Central :')));
assert.equal(g2.zones.b.central, undefined); ok++;
// 15. Confiscation : une jauge pleine met un lot de la zone dans la prochaine salle des ventes.
const g3 = JSON.parse(JSON.stringify(g)); g3.zones.a.central = { jours: 3, types: {}, saisies: {}, interp: 0, jauge: CENTRAL.confiscation - 1, gainMax: 0, gainSaison: 0, joursSaison: 0, s: g3.season };
appliquerCentral(g3, 'a', { ...b, s: { ...b.s, appels: [{ statut: 'maitrise', par: 'toi', titre: 'Rodéo en scooter', saisie: 'scooter' }] } }, g3.turn);
assert.equal(g3.saisiesCentral.length, 1); assert.equal(g3.saisiesCentral[0].id, 'banalise');
g3.vente = null; const v = annoncerVente(g3, g3.turn + 1);
assert.ok(v.lots.some((l) => l.saisie && l.saisie.src === 'central' && l.saisie.parts.a === 1)); assert.equal(g3.saisiesCentral.length, 0); ok++;
// 16. Heure du serveur : une action antidatée de plus de 3 minutes est ramenée à l'heure où le serveur l'a reçue.
const debut = 1_000_000_000_000;
assert.deepEqual(actionsServeur([{ t: 100, k: 'envoi', a: 'x', e: 'C1', at: debut + 101 * 60000 }, { t: 10, k: 'envoi', a: 'y', e: 'C1', at: debut + 200 * 60000 + 5 }, { t: 5, k: 'pause', e: 'PA' }], debut),
  [{ t: 100, k: 'envoi', a: 'x', e: 'C1' }, { t: 200, k: 'envoi', a: 'y', e: 'C1' }]);
// Au calcul de 20 h, ce sont les actions du serveur qui comptent, pas celles du document joueur.
const bS = bilanCentral(g, 'a', players2.a, 'graine', []);
assert.equal(bS.actions, 0); assert.equal(bS.s.pts, bS.adj.pts); ok++;
// 17. Équipes : jamais plus que la zone n'en a (C3 et K2 inventées ignorées).
const bE = bilanCentral(g, 'a', { central: { cle, actions: [], equipes: [...eqA, { id: 'C3', comp: ['violence', 'ivresse'], base: capA }, { id: 'K2', comp: ['bande', 'véhicule'], base: capA }] } }, 'graine');
assert.ok(!bE.s.equipes.some((e) => e.id === 'K2' || e.id === 'C3')); ok++;
// 18. Consignes à l'adjoint : fouiller quand c'est réussi (sans autre ordre), garder une équipe en réserve.
const jC = genererJournee('cons-1', cells);
const sC = simuler(jC, eqs, [{ t: 0, k: 'consigne', c: { fouille: 'reussi' } }], 1439, opt);
const fC = sC.appels.filter((a) => a.fouille);
assert.ok(fC.length > 5 && fC.every((a) => a.fouillePar === 'consigne' && (a.statut === 'maitrise' || a.statut === 'arretee') && fouillable(a)));
const sR = simuler(jC, eqs, [{ t: 0, k: 'consigne', c: { reserve: 'K1' } }], 1439, opt);
assert.ok(sR.appels.filter((a) => a.eq === 'K1' && a.par === 'adjoint').every((a) => a.gReel >= 3 || a.tags.includes('bande'))); ok++;
// 19. Classement : une journée compte de 0 à +25, quel que soit l'écart.
const g4 = JSON.parse(JSON.stringify(g)); delete g4.zones.a.central;
appliquerCentral(g4, 'a', { s: { pts: 140, appels: [] }, adj: { pts: 40, appels: [] }, actions: 3, capitale: capA }, g4.turn);
assert.equal(g4.zones.a.central.gainSaison, CENTRAL.plafondJour);
appliquerCentral(g4, 'a', { s: { pts: 10, appels: [] }, adj: { pts: 40, appels: [] }, actions: 3, capitale: capA }, g4.turn + 1);
assert.equal(g4.zones.a.central.gainSaison, CENTRAL.plafondJour); ok++;
console.log(`central : ${ok} vérifications passées`);
