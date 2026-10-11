// Non-droit profond : chaque mécanique vérifiée isolément (et rien ne change quand il n'est pas activé).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { regenSecteur, ND } from '../js/engine/constants.js';
import { M3, etape, sceneId, RENSEIGNEMENTS } from '../js/engine/milieu.js';
import { annoncerVente } from '../js/engine/ventes.js';

const ALLOC = { intervention: 6, proximite: 4, recherche: 4, roulage: 2, admin: 2 };
function partie(v3 = true) {
  const st = createGame({ seed: 'milieu-test' });
  st.nonDroit.roles = true;
  if (v3) st.nonDroit.v3 = true;
  for (const [uid, code] of [['a', '5301'], ['b', '5302'], ['c', '5303']]) st.zones[uid] = newZone({ uid, code, nom: uid.toUpperCase() }, 1);
  return st;
}
const anneau = (st) => Object.keys(st.nonDroit.secteurs).filter((k) => !st.nonDroit.secteurs[k].coeur).sort((a, b) => Number(a) - Number(b));
const tour = (st, roles = {}, players = {}, tactiques = {}) => {
  const orders = {};
  for (const u of Object.keys(st.zones)) {
    const r = roles[u] || {};
    orders[u] = { alloc: ALLOC, rythme: 'normal', roles: r, tactiques: tactiques[u] || {}, secteurs: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (v.rep || 0) + (v.desc || 0) + (v.bouc || 0) + (v.sc || 0)])) };
  }
  return resolveTurn(st, { orders, players, nextWeekday: 1 });
};

// 0. Désactivé : aucune trace du Parrain, pas de scène.
{
  let st = partie(false);
  st = tour(st).state;
  assert.equal(st.nonDroit.parrain, undefined, 'pas de Parrain sans v3');
  assert.ok(!Object.values(st.nonDroit.secteurs).some((s) => s.lieutenant), 'pas de lieutenant sans v3');
  assert.ok(!(st.nonDroit.scenes || []).length, 'pas de scène sans v3');
}

// 1. Parrain et lieutenants créés ; une scène annoncée pour demain.
let st = partie();
st = tour(st).state;
assert.ok(st.nonDroit.parrain && st.nonDroit.parrain.nom, 'un Parrain');
for (const k of anneau(st)) assert.equal(st.nonDroit.secteurs[k].lieutenant.etat, 'libre', `lieutenant libre à ${k}`);
assert.equal(st.nonDroit.scenes.length, 1, 'une scène demain (moins de 10 zones)');
assert.equal(st.nonDroit.scenes[0].nuit, st.turn, 'la scène est pour la prochaine résolution');

// 2. Reprise bien bouclée : lieutenant arrêté, puis un renseignement à l'interrogatoire.
{
  let s2 = JSON.parse(JSON.stringify(st));
  const k = anneau(s2).find((x) => !['squat', 'jeux', 'rodeos'].includes(s2.nonDroit.secteurs[x].milieu));
  const sec = s2.nonDroit.secteurs[k];
  sec.emprise = 5; sec.repere = { de: s2.turn, a: s2.turn + 3, par: [] };
  const r = { [k]: { rep: 0, desc: 4, bouc: 3 } };
  const res = tour(s2, { a: r, b: r });
  s2 = res.state;
  assert.equal(s2.nonDroit.secteurs[k].statut, 'repris', 'secteur repris');
  assert.equal(s2.nonDroit.secteurs[k].lieutenant.etat, 'tombe', 'arrêté et interrogé le soir même');
  assert.ok(Number.isFinite(s2.nonDroit.secteurs[k].confiance), 'confiance de départ');
  assert.equal(s2.nonDroit.secteurs[k].confiance, M3.confiance.depart + M3.confiance.repere, 'confiance : départ + repérage');
  assert.equal(Object.keys(s2.nonDroit.dossier).length, 1, 'un renseignement au dossier');
  assert.ok(Object.values(s2.nonDroit.dossier).every((u) => ['a', 'b'].includes(u)), 'détenu par une zone qui a repris');
}

// 3. Reprise sans bouclage : le lieutenant file et renforce un voisin.
{
  let s2 = JSON.parse(JSON.stringify(st));
  const k = anneau(s2).find((x) => !['squat', 'jeux', 'rodeos', 'sommeil'].includes(s2.nonDroit.secteurs[x].milieu));
  s2.nonDroit.secteurs[k].emprise = 3; s2.nonDroit.secteurs[k].repere = { de: s2.turn, a: s2.turn + 3, par: [] };
  const r = { [k]: { rep: 0, desc: 5, bouc: 0 } };
  s2 = tour(s2, { a: r, b: r }).state;
  assert.equal(s2.nonDroit.secteurs[k].statut, 'repris');
  assert.equal(s2.nonDroit.secteurs[k].lieutenant.etat, 'enfui', 'lieutenant enfui faute de bouclage');
}

// 4. Confiance : la présence de la Proximité la fait monter ; les étapes freinent le retour du milieu.
{
  let s2 = JSON.parse(JSON.stringify(st));
  const k = anneau(s2)[0], sec = s2.nonDroit.secteurs[k];
  sec.statut = 'repris'; sec.emprise = 10; sec.confiance = 20; sec.influence = { a: 5 }; sec.chef = 'a'; sec.lieutenant.etat = 'tombe';
  s2.nonDroit.gangs = []; s2.nonDroit.scenes = [];
  assert.equal(regenSecteur(s2, sec), ND.remontee, 'étape 0 : remontée normale');
  s2 = tour(s2, { a: { [k]: { rep: 0, desc: 1, bouc: 3 } } }).state;
  const c = s2.nonDroit.secteurs[k].confiance;
  assert.ok(c >= 20 + M3.confiance.calme + M3.confiance.presenceMax - 0.01 || s2.nonDroit.secteurs[k].statut !== 'repris', `confiance montée (${c})`);
  s2.nonDroit.secteurs[k].confiance = 65;
  assert.equal(etape(s2.nonDroit.secteurs[k]), 2, 'rendu à la vie à 60');
  assert.equal(regenSecteur(s2, s2.nonDroit.secteurs[k]), Math.round(ND.remontee * 0.4 * 10) / 10, 'remontée ×0,4');
}

// 5. Scène : les agents « sc » la règlent ; un mini-jeu réussi compte 3 agents.
{
  let s2 = JSON.parse(JSON.stringify(st));
  const sc = s2.nonDroit.scenes[0];
  const k = String(sc.cell), avant = s2.nonDroit.secteurs[k].emprise;
  const res = tour(s2, { a: { [k]: { rep: 0, desc: 0, bouc: 0, sc: 2 } } }, { b: { incidents: { r: { [sc.id]: { statut: 'ok', fautes: 0 } } } } });
  const sr = res.gazette.nonDroit.scenesRes[0];
  assert.ok(sr.ok, `scène réglée (${sr.tot})`);
  assert.deepEqual(sr.zones, ['a', 'b'], 'les deux zones comptées');
  assert.ok(res.state.nonDroit.secteurs[k].emprise < avant + 40, 'emprise baissée par la scène');
  assert.ok(res.state.zones.a.reputation > s2.zones.a.reputation, 'récompense');
  // Les agents de scène ne font pas d'assaut : pas de descente enregistrée sur ce secteur.
  assert.ok(!(res.gazette.nonDroit.descentes || []).some((d) => String(d.cell) === k), 'pas de descente');
}

// 6. Guetteurs : trois descentes à l'aveugle en peu de soirs.
{
  let s2 = JSON.parse(JSON.stringify(st));
  const ks = anneau(s2).filter((x) => !['squat'].includes(s2.nonDroit.secteurs[x].milieu)).slice(0, 3);
  for (const k of ks) s2.nonDroit.secteurs[k].repere = null;
  const r = Object.fromEntries(ks.map((k) => [k, { rep: 0, desc: 2, bouc: 1 }]));
  const res = tour(s2, { a: r, b: r, c: r });
  assert.ok(res.state.nonDroit.memoire.guetteurs, 'le milieu double ses guetteurs');
}

// 7. Saisie : un lot du non-droit passe à la vente suivante.
{
  const s2 = JSON.parse(JSON.stringify(st));
  s2.nonDroit.saisies = [{ id: 'banalise', cell: 3, parts: { a: 1 }, T: 1 }];
  s2.vente = null;
  const v = annoncerVente(s2, s2.turn);
  assert.ok(v.lots.some((l) => l.id === 'banalise' && l.saisie), 'lot saisi en vente');
}
assert.equal(Object.keys(RENSEIGNEMENTS).length, 5);
// 8. Renseignement d'une zone qui ne joue plus : compte pour tout le monde au QG.
{
  const { rensDe } = await import('../js/engine/milieu.js');
  const s2 = JSON.parse(JSON.stringify(st));
  s2.nonDroit.dossier = { plan: 'c', garde: 'b' };
  s2.zones.c.toursSansOrdres = 3;
  assert.deepEqual(rensDe(s2.nonDroit, ['a'], s2), ['plan'], 'le renseignement de la zone partie compte');
  assert.deepEqual(rensDe(s2.nonDroit, ['a', 'b'], s2).sort(), ['garde', 'plan'], 'avec la zone qui détient l’autre');
}
// 9. Dernier carré : barricade sous 25 d'emprise, puis assaut frontal qui fait tomber le secteur même trop faible.
{
  const { barricades } = await import('../js/engine/milieu.js');
  let s2 = JSON.parse(JSON.stringify(st));
  const k = anneau(s2).find((x) => !['squat', 'jeux'].includes(s2.nonDroit.secteurs[x].milieu));
  s2.nonDroit.secteurs[k].emprise = 20;
  const res = {};
  barricades(s2, s2.nonDroit, s2.turn - 1, () => {}, res);
  assert.ok(s2.nonDroit.secteurs[k].barricade, 'le lieutenant se barricade');
  const fr = JSON.parse(JSON.stringify(s2));
  fr.nonDroit.secteurs[k].repere = { de: fr.turn, a: fr.turn + 2, par: [] };
  const r1 = tour(fr, { a: { [k]: { rep: 0, desc: 1, bouc: 1 } } }, {}, { a: { [k]: 'frontal' } });
  assert.equal(r1.state.nonDroit.secteurs[k].statut, 'repris', 'assaut frontal : il tombe');
  // Négociation : soit il se rend, soit il gagne une nuit (+10).
  const ng = JSON.parse(JSON.stringify(s2));
  const r2 = tour(ng, { a: { [k]: { rep: 0, desc: 1, bouc: 0 } } }, {}, { a: { [k]: 'negocier' } });
  const s3 = r2.state.nonDroit.secteurs[k];
  assert.ok(s3.statut === 'repris' || s3.emprise === 30, `négociation : repris ou +10 (${s3.statut} ${s3.emprise})`);
  assert.equal(r2.gazette.nonDroit.tactiques[0].choix, 'negocier');
}
console.log('milieu : ok');
