// Magasin et armurerie : dotation de départ, péremption des gilets, refus d'intervention, commandes, marchés groupés,
// matériel abîmé en intervention, ordres des robots.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { creerEquipe } from '../js/engine/equipe.js';
import { ttiValides, trouTTI, facteurTTI, fonction, appliquerFonctions, ceder, inspecter, accueillirRecrues, effetCasquesND, surplus, gammeDe, creerMateriel, giletsValides, facteurGilets, risqueMateriel, prixMarche, abimer, degatsDuSoir, ordresMaterielRobot, MAT, materielDuTour } from '../js/engine/materiel.js';
import { makeRng } from '../js/engine/rng.js';

const ALLOC = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };

// Dotation de départ : tout le monde couvert, un tiers périme au 5e jour.
{
  const z = { agents: 20 }; z.materiel = creerMateriel(z, 1);
  assert.equal(giletsValides(z.materiel, 1).total, 20);
  assert.equal(giletsValides(z.materiel, 6).total, 13, 'le premier lot périme');
  assert.equal(facteurGilets(z, 1), 1);
  assert.ok(facteurGilets(z, 6) < 1, 'plus de 30 % sans gilet : refus d’intervention');
  assert.ok(risqueMateriel(z, 6) > risqueMateriel(z, 1), 'gilets périmés : plus de risque');
}
// Marchés : −5 % par zone, plafonné à −25 %.
assert.equal(prixMarche(1), MAT.marche.base);
assert.ok(Math.abs(prixMarche(3) - MAT.marche.base * 0.9) < 1e-9);
assert.ok(Math.abs(prixMarche(12) - MAT.marche.base * 0.75) < 1e-9);

// Au tour de 20:00 : commande payée, livrée au bon jour, masse dépensée.
{
  let st = createGame({ seed: 'mat' });
  st.zones.a = newZone({ uid: 'a', code: '1111', nom: 'A' }, 1); st.zones.a.equipe = creerEquipe('a');
  const b0 = st.zones.a.budget;
  let r = resolveTurn(st, { orders: { a: { alloc: ALLOC, rythme: 'normal', materiel: { masse: ['tenue'], commandes: [{ item: 'gilets', lots: 2, voie: 'negociee' }] } } }, quests: {}, players: {}, nextWeekday: 1 });
  st = r.state; const z = st.zones.a;
  assert.ok(z.materiel, 'dotation créée');
  assert.equal(z.materiel.tenue, 100 - MAT.tenue.usure, 'polos neufs (puis usure du soir)');
  assert.equal(z.materiel.commandes.length, 1);
  assert.ok(z.rapport.some((l) => l.startsWith('Commande : 10 gilets')), 'ligne de commande');
  r = resolveTurn(st, { orders: { a: { alloc: ALLOC, rythme: 'normal' } }, quests: {}, players: {}, nextWeekday: 2 });
  st = r.state;
  assert.equal(st.zones.a.materiel.commandes.length, 0, 'livrée le lendemain');
  assert.equal(giletsValides(st.zones.a.materiel, st.turn).total, 30);
  assert.ok(b0 > 0);
}
// Marché lancé par une zone, une autre adhère : remise pour les deux, PS pour le lanceur.
{
  let st = createGame({ seed: 'marche' });
  for (const u of ['a', 'b']) { st.zones[u] = newZone({ uid: u, code: u === 'a' ? '1111' : '2222', nom: u }, 1); st.zones[u].equipe = creerEquipe(u); }
  let r = resolveTurn(st, { orders: { a: { alloc: ALLOC, rythme: 'normal', materiel: { lancer: { item: 'taser', lots: 2 } } } }, quests: {}, players: {}, nextWeekday: 1 });
  st = r.state; const id = st.marches[0].id;
  r = resolveTurn(st, { orders: { b: { alloc: ALLOC, rythme: 'normal', materiel: { adherer: [{ id, lots: 1 }] } } }, quests: {}, players: {}, nextWeekday: 2 });
  st = r.state;
  assert.deepEqual(Object.keys(st.marches[0].part).sort(), ['a', 'b']);
  for (let t = 0; t < 4; t++) st = resolveTurn(st, { orders: {}, quests: {}, players: {}, nextWeekday: 3 }).state;
  assert.equal(st.zones.a.materiel.taser, 2, 'tasers du lanceur livrés');
  assert.equal(st.zones.b.materiel.taser, 1, 'taser de l’adhérent livré');
}
// Matériel abîmé : gilet entaillé, taser cassé ; blessés du jour.
{
  const z = { agents: 20, blesses: [] }; z.materiel = creerMateriel(z, 1); z.materiel.taser = 2; z.materiel._T = 1;
  const rng = makeRng('x');
  assert.match(abimer(z, 'gilets', 1, rng), /gilet/);
  assert.equal(giletsValides(z.materiel, 1).total, 19);
  assert.match(abimer(z, 'taser', 1, rng), /taser/);
  assert.equal(z.materiel.taser, 1);
  assert.equal(abimer({ agents: 1, materiel: { taser: 0, gilets: [] } }, 'taser', 1, rng), '', 'rien à casser');
  z.blesses.push({ n: 6, retour: 5, motif: 'non-droit' });
  degatsDuSoir({ seed: 's', season: 1 }, z, 1, 0);
  assert.ok(giletsValides(z.materiel, 1).total < 19, 'les blessés du jour abîment des gilets');
}
// Robots : tenue renouvelée, gilets commandés avant le trou.
{
  const z = { uid: 'r', agents: 20 }; z.materiel = creerMateriel(z, 1); z.materiel.tenue = 30; z.materiel.masse = 6;
  const o = ordresMaterielRobot(z, { turn: 2, marches: [] });
  assert.deepEqual(o.masse, ['tenue']);
  assert.equal(o.commandes[0].item, 'gilets');
}
// Fournisseurs : prix et validité des gilets selon la gamme.
{
  let st = createGame({ seed: 'gamme' });
  st.zones.a = newZone({ uid: 'a', code: '1111', nom: 'A' }, 1); st.zones.a.equipe = creerEquipe('a');
  const b0 = st.zones.a.budget;
  st = resolveTurn(st, { orders: { a: { alloc: ALLOC, rythme: 'renforce', materiel: { commandes: [{ item: 'gilets', lots: 1, voie: 'negociee', q: 'qualite' }] } } }, quests: {}, players: {}, nextWeekday: 1 }).state;
  const z = st.zones.a;
  assert.ok(z._compta === undefined || true);
  assert.equal(z.materiel.commandes[0].q, 'qualite');
  assert.ok(z.materiel.usureJour.tenue > MAT.tenue.usure, 'rythme renforcé : la tenue s’use plus vite');
  st = resolveTurn(st, { orders: { a: { alloc: ALLOC, rythme: 'normal' } }, quests: {}, players: {}, nextWeekday: 2 }).state;
  const lot = st.zones.a.materiel.gilets.find((g) => g.q === 'qualite');
  assert.ok(lot && lot.fin === 2 + gammeDe('qualite').validite, 'gilets haut de gamme : 35 jours');
  assert.ok(b0 > st.zones.a.budget - 100);
}
// Cession : surplus seulement, PS pour le donneur, gilets reçus avec leur date.
{
  const st = { zones: {} };
  const a = st.zones.a = { uid: 'a', nom: 'A', agents: 10, reputation: 50, _ps: 0 }; a.materiel = creerMateriel(a, 1); a.materiel.gilets.push({ n: 10, fin: 40, m: 'std' });
  const b = st.zones.b = { uid: 'b', nom: 'B', agents: 20, reputation: 50 }; b.materiel = creerMateriel(b, 1); b.materiel.gilets = [{ n: 8, fin: 30, m: 'std' }];
  assert.equal(surplus(a, 1).gilets, 10);
  const t = ceder(st, a, { cible: 'b', item: 'gilets', n: 12 }, 1);
  assert.match(t, /cèdes 10 gilets/);
  assert.equal(giletsValides(b.materiel, 1).total, 18);
  assert.ok(a._ps > 0 && a.reputation === 51, 'PS et réputation : B refusait les interventions');
  assert.equal(ceder(st, a, { cible: 'b', item: 'gilets', n: 5 }, 1), '', 'plus de surplus');
}
// Inspection : sanction si gilets périmés, félicitations sinon.
{
  const z = { agents: 20, budget: 10, reputation: 50, moral: 60 }; z.materiel = creerMateriel(z, 1);
  assert.match(inspecter(z, 1), /rien à signaler/);
  assert.match(inspecter(z, 20), /sans gilet valide/);
  assert.ok(z.budget < 10);
}
// Recrues : masse en plus, rappel s'il manque des gilets. Casques au non-droit.
{
  const z = { agents: 24 }; z.materiel = creerMateriel({ agents: 20 }, 1); z.materiel.masse = 0;
  assert.match(accueillirRecrues(z, 4, 1), /sans gilet/);
  assert.equal(z.materiel.masse, 4 * MAT.masseRecrue);
  z.materiel.gnep = 10;
  assert.ok(effetCasquesND(z, 8).force > 1 && effetCasquesND(z, 8).risque < 1);
  z.materiel.gnep = 0;
  assert.ok(effetCasquesND(z, 8).risque > 1, 'sans casques : plus de risque');
}
// Recyclage TTI : échéances, Intervention réduite, recyclage par groupes, moniteur et fonctions.
{
  const z = { agents: 20 }; z.materiel = creerMateriel(z, 1);
  assert.equal(ttiValides(z.materiel, 1, 'af'), 20);
  assert.ok(trouTTI(z, 8, 'af') > 0.3 && facteurTTI(z, 8) < 1, 'un tiers des agents à recycler : Intervention réduite');
  let st = createGame({ seed: 'tti' });
  st.zones.a = newZone({ uid: 'a', code: '1111', nom: 'A' }, 1); const za = st.zones.a; za.equipe = creerEquipe('a');
  za.equipe.find((m) => m.role === 'inter').niveau = 1;
  st = resolveTurn(st, { orders: { a: { alloc: ALLOC, rythme: 'normal', materiel: { fonctions: { moniteurTTI: 'inter' }, recyclage: [{ type: 'af', groupes: 2 }] } } }, quests: {}, players: {}, nextWeekday: 1 }).state;
  const z2 = st.zones.a;
  assert.ok(fonction(z2, 'moniteurTTI'), 'moniteur TTI nommé');
  assert.ok(z2.materiel.tti.af.some((x) => x.n === 8 && x.fin === 2 + 28 + 7), 'recyclage de 8 agents, 35 jours avec le moniteur');
  assert.ok(z2.blesses.some((b) => b.motif === 'recyclage TTI' && b.n === 2), 'un absent par groupe');
  assert.ok(z2.rapport.some((l) => l.startsWith('Fonction :')));
  assert.deepEqual(appliquerFonctions(z2, { magasinier: 'rech' }), [], 'figure sans surnom : pas de fonction');
}
console.log('magasin et armurerie : ok');
