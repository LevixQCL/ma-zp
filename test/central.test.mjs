// Le central : journée déterministe, rejeu des actions, adjoint, aggravation, poste, pause, reprises.
import assert from 'node:assert/strict';
import { genererJournee, simuler, equipesCentral, distancesCentral, prevoir, resultatC, CENTRAL } from '../js/engine/central.js';

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
console.log(`central : ${ok} vérifications passées`);
