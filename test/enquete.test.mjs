// Enquête et FIPA : génération, accusation, traque, partage, FIPA de bout en bout.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { genererAffaire, affaire, trajet, candidats, texteFait, pointsDecouverte, ENQ, coutDemarche, celluleDe, celluleSuspect } from '../js/engine/enquete.js';
import { PARTAGE } from '../js/engine/fipa.js';

// 1. Chaque affaire a une solution unique (mobile + moyen + occasion), et il faut croiser les pièces.
for (let n = 1; n <= 600; n++) {
  const a = genererAffaire(`g${n % 17}`, n);
  assert.equal(a.suspects.length, ENQ.nbSuspects);
  const c = candidats(a, a.faits);
  assert.deepEqual(c.suspects, [a.coupable], 'un seul suspect réunit les trois');
  assert.equal(c.planques.length, 1); assert.equal(c.planques[0], a.planque);
  for (const f of a.faits) assert.ok(texteFait(a, f).length > 20, `pièce vide ${f}`);
  // Sans les constatations, aucune vérification n'écarte personne.
  const sansConstat = a.faits.filter((f) => !f.startsWith('c:'));
  assert.equal(candidats(a, sansConstat).suspects.length, ENQ.nbSuspects, 'une vérification seule ne prouve rien');
  // Aucune paire de pièces ne suffit : il faut au moins écarter les quatre innocents.
  let min = 99;
  for (const f1 of a.faits) for (const f2 of a.faits) if (candidats(a, [f1, f2]).suspects.length < min) min = candidats(a, [f1, f2]).suspects.length;
  assert.ok(min >= 4, 'deux pièces écartent au plus un suspect');
  // Chaque innocent n'a qu'un seul point faible ; le coupable n'en a aucun.
  a.suspects.forEach((s, i) => {
    const faibles = Object.values(s.statut).filter((v) => !v).length;
    assert.equal(faibles, i === a.coupable ? 0 : 1);
  });
  // Le coup de théâtre porte sur un point établi du suspect visé (accablant, jamais décisif).
  { const [el, x] = a.rebonds[3].f.split(':'); assert.ok(a.suspects[Number(x)].statut[el]); }
  // Aucun alibi ne se juge sans l'heure exacte : la vérification ne couvre jamais toute la soirée déclarée.
  for (const s of a.suspects) if (s.alibi.type === 'couvre' || s.alibi.type === 'partiel') assert.ok(s.alibi.de !== s.alibi.ditDe || s.alibi.a !== s.alibi.ditA);
  // Les textes ne trahissent pas le coupable : même gabarit de mensonge pour tous.
  assert.ok(!/borné près/.test(Object.values(a.textes).join(' ')));
}

// 1 bis. Avec le plan : un alibi troué laisse le temps de faire le trajet, un alibi qui couvre jamais.
for (let n = 1; n <= 600; n++) {
  const a = genererAffaire(`c${n % 13}`, n, true);
  assert.ok(a.carte);
  assert.deepEqual(candidats(a, a.faits).suspects, [a.coupable]);
  for (const s of a.suspects) {
    const al = s.alibi;
    if (al.type !== 'couvre' && al.type !== 'partiel') continue;
    const t = trajet(a.pos, al.pos);
    assert.ok(t >= 3 && t <= 30);
    const possible = al.a + t <= a.heure || a.fin + t <= al.de;
    assert.equal(possible, al.type === 'partiel', `alibi ${al.type} incohérent avec le trajet (${t} min)`);
    assert.ok(al.de !== al.ditDe || al.a !== al.ditA);
  }
}
// 1 ter. Dossier complet : la vraie route et le véhicule de chaque suspect décident de l'occasion.
{
  const { minutes, itineraire, LIEUX } = await import('../js/engine/carte3.js');
  const { modesPossibles } = await import('../js/engine/enquete.js');
  const { dossierAffaire3 } = await import('../js/engine/dossier.js');
  let pieges = 0;
  for (let n = 1; n <= 800; n++) {
    const a = genererAffaire(`d${n % 19}`, n, false, true);
    assert.ok(a.prof && a.carte);
    assert.deepEqual(candidats(a, a.faits).suspects, [a.coupable]);
    for (const s of a.suspects) {
      const al = s.alibi;
      if (al.type !== 'couvre' && al.type !== 'partiel') continue;
      assert.ok(al.ditDe <= al.de && al.de < al.a && al.a <= al.ditA, 'fenêtre d’alibi cohérente');
      const ok = (m) => { const t = minutes(a.pos, al.pos, m, a.travaux); return al.a + t <= a.heure || a.fin + t <= al.de; };
      if (al.type === 'partiel') assert.ok(ok(s.vehicule.mode), 'alibi troué : son véhicule passe');
      else { assert.ok(!modesPossibles(s).some(ok), 'alibi qui couvre : aucun moyen possible ne passe'); if (ok('moteur')) pieges++; }
    }
    // Le récit ne parle que de ce qui est public.
    const d = dossierAffaire3(`d${n % 19}`, a);
    const tout = JSON.stringify([d.journal, d.pvc, d.auditions]);
    assert.ok(!/undefined|\{e\}|NaN/.test(tout), `texte mal formé (${n})`);
    assert.ok(!tout.includes(a.textes['c:moy']) && !tout.includes(a.textes['c:mob']));
    assert.equal(d.auditions.length, 5);
  }
  assert.ok(pieges > 50, 'des pièges « en voiture oui, à vélo non »');
  // Passerelles : à vélo, on passe là où la voiture fait le tour.
  assert.ok(itineraire('petitpont', 'anniversaire', 'velo').m < itineraire('petitpont', 'anniversaire', 'moteur').m);
  // Travaux : un pont fermé allonge la route en voiture, pas à vélo.
  assert.ok(minutes('relais', 'moulins', 'moteur', 'n44-n54') > minutes('relais', 'moulins', 'moteur', null));
  assert.equal(minutes('relais', 'moulins', 'velo', 'n44-n54'), minutes('relais', 'moulins', 'velo', null));
  for (const k of Object.keys(LIEUX)) assert.ok(itineraire('tanneurs', k, 'moteur'), `lieu ${k} accessible en voiture`);
  // L'affaire en cours ne change pas : le dossier complet commence à la suivante.
  assert.equal(affaire({ seed: 'v', carteDes: 1, profDes: 6 }, 5).prof, false);
  assert.equal(affaire({ seed: 'v', carteDes: 1, profDes: 6 }, 6).prof, true);
}
// Les affaires ouvertes avant l'arrivée du plan ne changent pas.
{
  const vieux = { seed: 'v', carteDes: 5 };
  assert.equal(affaire(vieux, 4).carte, false);
  assert.equal(affaire(vieux, 5).carte, true);
  assert.equal(affaire({ seed: 'v' }, 3).carte, false);
}

// 2. Partie à trois joueurs humains simulés.
const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
let state = createGame({ seed: 'test-enquete' });
let r = resolveTurn(state, { players }); state = r.state;
assert.ok(state.enquete && state.enquete.jour === 1);
const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
let aff = affaire(state, state.enquete.n);

// Jour 1 : B se trompe, A lance deux démarches et partage l'indice d'ouverture (ignoré), C ne fait rien.
const faux = (aff.coupable + 1) % ENQ.nbSuspects;
r = resolveTurn(state, { players, orders: { A: { ...base, demarches: ['labo', 'alibi:0'] }, B: { ...base, accusation: faux }, C: base } });
state = r.state;
assert.ok(!state.zones.B.enquete.exclu && state.zones.B.enquete.accuse === null, 'accusation sans dossier : refusée sans pénalité');
assert.ok(state.zones.B.rapport.some((l) => /parquet refuse/.test(l)), 'le refus est expliqué');
assert.ok(state.zones.A.enquete.pieces.some((p) => p.f === 'c:moy') && state.zones.A.enquete.pieces.some((p) => p.f === 'occ:0'), 'démarches reçues');
// Cellules : jusqu'à trois zones, une seule cellule (personne n'est seul dans la sienne).
assert.equal(state.enquete.nbCellules, 1);
// Avec 7 zones : 3 cellules, au moins 2 zones et 2 suspects chacune ; un suspect hors cellule coûte le double.
{
  const { cellulesSuspect, dansMaCellule } = await import('../js/engine/enquete.js');
  const { newZone } = await import('../js/engine/zone.js');
  const s7 = JSON.parse(JSON.stringify(state));
  for (const u of ['D', 'E', 'F', 'G']) s7.zones[u] = newZone({ uid: u, code: '9999', nom: u }, 1);
  const { nouvelleAffaire } = await import('../js/engine/enquete.js');
  nouvelleAffaire(s7);
  assert.equal(s7.enquete.nbCellules, 3);
  for (let c = 0; c < 3; c++) {
    assert.ok(Object.values(s7.enquete.cellules).filter((x) => x === c).length >= 2, 'au moins deux zones par cellule');
    assert.ok([0, 1, 2, 3, 4].filter((i) => cellulesSuspect(s7, i).includes(c)).length >= 2, 'au moins deux suspects par cellule');
  }
  const horsA = [0, 1, 2, 3, 4].find((i) => !dansMaCellule(s7, 'A', i));
  assert.equal(coutDemarche(s7, 'A', `alibi:${horsA}`), 4);
  void celluleSuspect; void celluleDe;
}
assert.ok(state.zones.A.budget < state.zones.C.budget, 'les démarches sont payées');

// A partage tout ce qu'il a avec C ; C doit le recevoir le soir même.
// Pièces que C n'a pas encore, dans la limite de ce qu'on peut recevoir en un soir.
const aPieces = state.zones.A.enquete.pieces.filter((p) => p.src !== 'ouverture' && !state.zones.C.enquete.pieces.some((q) => q.f === p.f)).map((p) => p.f).slice(0, Math.min(ENQ.maxPartages, ENQ.maxRecus));
r = resolveTurn(state, { players, orders: { A: { ...base, partages: aPieces.map((f) => ({ f, a: 'C' })) }, B: base, C: base } });
state = r.state;
for (const f of aPieces) assert.ok(state.zones.C.enquete.pieces.some((p) => p.f === f && p.de === 'A'), 'indice reçu de A');
// Chez A, on voit que C a déjà ces pièces ; chez C, que A les a (il les a données).
{
  const { dejaPartagee } = await import('../js/engine/enquete.js');
  for (const f of aPieces) { assert.ok(dejaPartagee(state, 'A', f).has('C'), 'partage visible chez l’expéditeur'); assert.ok(dejaPartagee(state, 'C', f).has('A')); assert.ok(!dejaPartagee(state, 'A', f).has('B')); }
  const lg = state.zones.A.rapport.find((l) => l.includes('transmise'));
  assert.ok(lg && lg.includes(`+${5 * aPieces.length} PS`), 'récompense par pièce');
}

// Dossier complet (pièces qui écartent les innocents, caractéristiques de la planque) : le parquet et le juge exigent des preuves.
function dossierComplet(st, uid, af) {
  const d = st.zones[uid].enquete;
  const add = (f) => { if (!d.pieces.some((p) => p.f === f)) d.pieces.push({ f, src: 'test' }); };
  for (const e of ['mob', 'moy', 'occ']) add(`c:${e}`);
  af.suspects.forEach((sus, i) => { for (const e of ['mob', 'moy', 'occ']) if (!sus.statut[e]) add(`${e}:${i}`); });
  for (const k of ['humidite', 'temperature', 'rive', 'acces']) add(`p:${k}`);
}
// C accuse juste (il « connaît » la solution) : découverte, contribution de A, nouvelle affaire, traque.
const jour = state.enquete.jour;
const limierA = state.zones.A.stats.limier;
dossierComplet(state, 'C', aff); dossierComplet(state, 'A', aff);
r = resolveTurn(state, { players, orders: { A: base, B: base, C: { ...base, accusation: aff.coupable } } });
state = r.state;
assert.ok(r.gazette.enquete.decouverte, 'découverte annoncée');
assert.equal(state.zones.C.stats.limier, pointsDecouverte(jour));
if (aPieces.length) assert.ok(state.zones.A.stats.limier > limierA, 'contribution récompensée');
assert.equal(state.enquete.n, aff.n + 1, 'nouvelle affaire ouverte');
assert.equal(state.enquete.jour, 1);
assert.equal(state.traques.length, 1);
assert.equal(state.zones.B.enquete.exclu, false, 'B peut de nouveau accuser sur la nouvelle affaire');

// Traque (une seule nuit) : A fouille la mauvaise planque, B la bonne avec 3 agents (trop peu), C la bonne avec 5.
const tr = state.traques[0];
const autre = (aff.planque + 1) % 6;
const avantTraque = state;
r = resolveTurn(state, { players, orders: {
  A: { ...base, traque: { n: tr.n, planque: autre, agents: 4 } },
  B: { ...base, traque: { n: tr.n, planque: aff.planque, agents: 1 } },
  C: { ...base, traque: { n: tr.n, planque: aff.planque, agents: 5 } } } });
state = r.state;
assert.equal(r.gazette.enquete.arrestations.length, 1, 'arrestation');
assert.equal(state.zones.C.stats.arrestations, 1);
assert.equal(state.zones.B.stats.arrestations, 0, 'trop peu d’agents');
assert.equal(state.traques.length, 0);
// Mise à prix : C choisit sa récompense (le lendemain, avec ses ordres) ; sans choix, confiscation.
assert.ok(state.zones.C.primeAChoisir, 'C peut choisir sa mise à prix');
assert.equal((state.zones.C.affiches || []).length, 1, 'avis de recherche accroché chez C');
assert.ok(!state.zones.A.primeAChoisir && !state.zones.B.primeAChoisir);
{ const b0 = state.zones.C.budget, lendemain = resolveTurn(JSON.parse(JSON.stringify(state)), { players, orders: { A: base, B: base, C: { ...base, prime: 'formation:recherche' } } }).state;
  assert.equal(lendemain.zones.C.primeAChoisir, undefined); assert.equal(lendemain.zones.C.niveaux.recherche, state.zones.C.niveaux.recherche + 1, 'formation offerte appliquée'); }
// Sans la bonne planque cette nuit-là, l'auteur s'enfuit : pas de deuxième tour.
const fuite = resolveTurn(avantTraque, { players, orders: { A: { ...base, traque: { n: tr.n, planque: autre, agents: 4 } }, B: base, C: base } });
assert.equal(fuite.gazette.enquete.fuites.length, 1, 'fuite après une nuit');
assert.equal(fuite.state.traques.length, 0);
// Filature : une voiture anonymisée surveille une deuxième planque (sans anonyme, la deuxième planque est ignorée).
{
  const ordA = { ...base, traque: { n: tr.n, planque: autre, planque2: aff.planque, agents: 4 } };
  const sansAnon = resolveTurn(JSON.parse(JSON.stringify(avantTraque)), { players, orders: { A: ordA, B: base, C: base } });
  assert.equal(sansAnon.gazette.enquete.arrestations.length, 0, 'deuxième planque sans anonyme : ignorée');
  const avecAnon = JSON.parse(JSON.stringify(avantTraque));
  avecAnon.zones.A.flotte.push({ m: 'anonyme', u: 0, km: 0, achat: 0 }); avecAnon.zones.A.vehicules += 1;
  const r2 = resolveTurn(avecAnon, { players, orders: { A: ordA, B: base, C: base } });
  assert.equal(r2.gazette.enquete.arrestations.length, 1, 'l’anonyme repère le suspect dans la deuxième planque');
  assert.ok(r2.state.zones.A.rapport.some((l) => l.includes('voiture anonymisée en planque')));
}
// Une traque ouverte quand elle durait deux tours se termine aussi en une nuit.
const ancienne = JSON.parse(JSON.stringify(avantTraque)); ancienne.traques[0].tours = 2;
assert.equal(resolveTurn(ancienne, { players, orders: { A: base, B: base, C: base } }).gazette.enquete.fuites.length, 1, 'ancienne traque ramenée à une nuit');

// 3. Affaire classée au bout de 7 jours sans découverte.
let s2 = createGame({ seed: 'classee' });
s2 = resolveTurn(s2, { players }).state;
const n0 = s2.enquete.n;
let classee = false;
for (let i = 0; i < ENQ.dureeMax; i++) { const g = resolveTurn(s2, { players, orders: { A: base, B: base, C: base } }); s2 = g.state; if (g.gazette.enquete.classee) classee = true; }
assert.ok(classee, 'affaire classée');
assert.equal(s2.enquete.n, n0 + 1);

// 4. FIPA de bout en bout, avec un tricheur.
let s3 = createGame({ seed: 'fipa' });
s3 = resolveTurn(s3, { players }).state;
s3.fipas = [{ id: 'fx', demandeur: 'A', titre: 'Braderie annuelle', texte: '', besoin: 8, recompense: 12, etape: 'demande', tourDecision: s3.turn }];
s3 = resolveTurn(s3, { players, orders: { A: { ...base, fipa: { id: 'fx', invite: 'B', moi: 4, lui: 4 } }, B: base, C: base } }).state;
assert.equal(s3.fipas.find((f) => f.id === 'fx').etape, 'invite');
s3 = resolveTurn(s3, { players, orders: { A: base, B: { ...base, fipaReponse: { id: 'fx', accepte: true } }, C: base } }).state;
assert.equal(s3.fipas.find((f) => f.id === 'fx').etape, 'accepte');
const budA = s3.zones.A.budget, budB = s3.zones.B.budget;
const g4 = resolveTurn(s3, { players, orders: { A: { ...base, fipaChoix: { id: 'fx', choix: 'partager' } }, B: { ...base, fipaChoix: { id: 'fx', choix: 'revendiquer' } }, C: base } });
s3 = g4.state;
const fr = g4.gazette.fipa.find((x) => x.titre === 'Braderie annuelle');
assert.ok(fr && fr.mult === 1, 'dispositif complet');
assert.ok(Math.abs(fr.gainB - 12 * PARTAGE['partager/revendiquer'][1]) < 0.06);
assert.ok(Math.abs(fr.gainA - 12 * PARTAGE['partager/revendiquer'][0]) < 0.06);
assert.equal(s3.zones.A.stats.fipaHonorees, 1);
assert.equal(s3.zones.B.stats.fipaHonorees, 0, 'le tricheur n’est pas compté fiable');
assert.ok(!s3.fipas.some((f) => f.id === 'fx'));
void budA; void budB;

// Invitation refusée d'office : même paire trop tôt.
s3.fipas.push({ id: 'fy', demandeur: 'A', titre: 'Carnaval', texte: '', besoin: 6, recompense: 10, etape: 'demande', tourDecision: s3.turn });
const satA = s3.zones.A.satisfaction;
s3 = resolveTurn(s3, { players, orders: { A: { ...base, fipa: { id: 'fy', invite: 'B', moi: 3, lui: 3 } }, B: base, C: base } }).state;
assert.ok(!s3.fipas.some((f) => f.id === 'fy'), 'paire déjà vue cette semaine : invitation impossible');
void satA;

console.log('OK : enquête, traque et FIPA vérifiées.');
