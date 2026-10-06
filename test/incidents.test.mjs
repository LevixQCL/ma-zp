// Incidents du jour : tirage déterministe, horaires, effets à la résolution.
import assert from 'node:assert/strict';
import { createGame, buildJoinZone, resolveTurn } from '../js/engine/resolve.js';
import { incidentsDuTour as tousIncidents, incidentsVisibles, separerIncidents, appliquerIncidents, MALUS, INC, difficulte, chanceSeule, pointsJauge, URGENCE, CIBLE, refUrgence, cibleUrgence, adapterCibleUrgence } from '../js/engine/incidents.js';
import { readFileSync } from 'node:fs';
import { vitesseCombi, PREPA } from '../js/engine/constants.js';
// Les incidents « classiques » (l'urgence du jour est vérifiée à part, section 6).
const incidentsDuTour = (s, u) => tousIncidents(s, u).filter((i) => !i.urgence);
import { makeRng } from '../js/engine/rng.js';

const H = 3600 * 1000;
const deadline = Date.UTC(2026, 9, 2, 18, 0, 0); // 20:00 à Bruxelles
const st = createGame({ seed: 'inc-test', turnDeadline: deadline });
for (const [u, c] of [['a', '1111'], ['b', '2222'], ['c', '3333']]) st.zones[u] = buildJoinZone(st, u, { code: c, nom: `Zone ${c}`, couleur: '#fff' }, 1);

// 1. Tirage déterministe, horaires dans la journée, services différents.
let deux = 0, total = 0;
for (let t = 1; t <= 300; t++) {
  const s2 = { ...st, turn: t, nextDeadline: deadline + (t - 1) * 24 * H };
  for (const u of ['a', 'b', 'c']) {
    const l = incidentsDuTour(s2, u);
    assert.deepEqual(l, incidentsDuTour(s2, u), 'tirage stable');
    assert.ok(l.length === 1 || l.length === 2);
    total++; if (l.length === 2) { deux++; assert.notEqual(l[0].service, l[1].service); assert.ok(l[1].ouvre - l[0].ouvre >= 2 * H - 1, 'au moins 2 h d’écart'); }
    for (const i of l) {
      const debut = s2.nextDeadline - 24 * H;
      assert.ok(i.ouvre >= debut + 10 * H && i.ouvre <= debut + 16 * H, 'ouvre entre 6 h et 12 h');
      assert.equal(i.ferme, s2.nextDeadline, 'ouvert jusqu’à 20:00');
      assert.ok(i.ferme - i.ouvre >= 8 * H, 'au moins 8 heures pour jouer');
      assert.ok(['colis', 'crochetage', 'depanneuse', 'dossier'].includes(i.jeu));
    }
  }
}
assert.ok(deux / total > 0.35 && deux / total < 0.65, `second incident ~50 % (${deux}/${total})`);

// 2. Difficulté et chance seule selon l'effectif.
assert.equal(difficulte('roulage', 1), 'difficile');
assert.equal(difficulte('roulage', 2), 'normal');
assert.equal(difficulte('roulage', 3), 'facile');
assert.equal(difficulte('intervention', 7), 'normal');
assert.ok(chanceSeule('intervention', 0) === 0.25 && chanceSeule('intervention', 20) === 0.8);
assert.equal(pointsJauge({ statut: 'ok', fautes: 0 }), 2);
assert.equal(pointsJauge({ statut: 'ok', fautes: 3 }), 1);
assert.equal(pointsJauge({ statut: 'rate' }), 0);

// 3. Effets : réussite, échec, abandon, jauge pleine → skin.
const z = structuredClone(st.zones.a);
z._compta = [];
const incs = [{ id: 'x0', service: 'intervention', titre: 'Colis suspect' }, { id: 'x1', service: 'roulage', titre: 'Accident' }];
z.moral = 60; // sous 70 : plein effet des bonus de moral
const moral0 = z.moral, budget0 = z.budget;
z.jaugeIncidents = 49;
const r = appliquerIncidents(z, { incidents: incs, resultats: { x0: { statut: 'ok', fautes: 0 }, x1: { statut: 'rate', fautes: 2 } }, alloc: { intervention: 7, roulage: 2 }, T: 5, rng: makeRng('t') });
assert.equal(z.moral, moral0 + 3 - 1, 'Intervention réussie +3, Roulage raté −1');
{ const z2 = structuredClone(st.zones.a); z2._compta = []; z2.moral = 90; appliquerIncidents(z2, { incidents: [incs[0]], resultats: { x0: { statut: 'ok', fautes: 0 } }, alloc: {}, T: 5, rng: makeRng('t') }); assert.equal(z2.moral, 91, 'au-delà de 85 de moral, un bonus ne donne plus que +1'); }
assert.equal(z.budget, budget0, 'un échec ne coûte pas de budget');
assert.equal(z.jaugeIncidents, 1, 'jauge 49 + 2 = 51 → skin et reste 1');
assert.ok(r.skin && (z.skins || []).length === 1, 'skin gagné');
assert.equal(z._ps, 5 + 2, '+5 PS réussi, +2 PS tenté');
assert.ok(!z.blesses.length, 'plus d’agents absents');
// Recherche réussie : indice, ou +2 k€ s'il n'y a rien à trouver.
const z2 = structuredClone(st.zones.b); const b2 = z2.budget;
appliquerIncidents(z2, { incidents: [{ id: 'y', service: 'recherche', titre: 'Porte' }], resultats: { y: { statut: 'ok', fautes: 1 } }, alloc: {}, T: 2, rng: makeRng('u'), indice: () => false });
assert.equal(z2.budget, b2 + 2);
let donne = 0;
appliquerIncidents(structuredClone(st.zones.c), { incidents: [{ id: 'y', service: 'recherche', titre: 'Porte' }], resultats: { y: { statut: 'ok', fautes: 0 } }, alloc: {}, T: 2, rng: makeRng('u'), indice: () => { donne++; return true; } });
assert.equal(donne, 1);

// 4. Résolution complète : les résultats du profil sont lus, l'incident non joué est géré seul.
const s3 = structuredClone(st);
const la = incidentsDuTour(s3, 'a');
const players = { a: { nom: 'Zone 1111', code: '1111', incidents: { cle: 's1t1', r: { [la[0].id]: { statut: 'ok', fautes: 0 } } } }, b: { nom: 'Zone 2222', code: '2222' }, c: { nom: 'Zone 3333', code: '3333' } };
const { state: apres } = resolveTurn(s3, { players });
assert.equal(apres.zones.a.jaugeIncidents, 2);
assert.ok(apres.zones.a.rapport.some((l) => l.startsWith('Incident ·') && l.includes('réussi sans faute')));
for (const u of ['b', 'c']) {
  const { maintenant, reportes } = separerIncidents(s3, u, {});
  const seul = apres.zones[u].rapport.filter((l) => l.startsWith('Incident ·') && l.includes('personne n’est venu')).length;
  assert.equal(seul, maintenant.filter((i) => !i.urgence).length, `incidents clos non joués gérés seuls (${u})`);
  assert.deepEqual(apres.zones[u].incidentsReportes || [], reportes, `incidents encore ouverts reportés (${u})`);
}
// 5. Plus de report : tout incident ferme à 20:00 et se règle ce soir-là (les reportés d'une ancienne version restent gérés).
for (let t = 1; t <= 60; t++) {
  const s4 = { ...structuredClone(st), turn: t, nextDeadline: deadline + (t - 1) * 24 * H };
  assert.equal(separerIncidents(s4, 'a', {}).reportes.length, 0, 'aucun incident reporté au lendemain');
}
// Un résultat d'un autre tour n'est pas compté.
const players2 = { ...players, a: { ...players.a, incidents: { cle: 's1t0', r: { 's1t0-0': { statut: 'ok', fautes: 0 } } } } };
const { state: apres2 } = resolveTurn(structuredClone(st), { players: players2 });
assert.ok(!apres2.zones.a.jaugeIncidents);
assert.equal(INC.jauge, 50);

// 6. L'urgence du jour : une par jour, entre 6 h et 12 h, sans changer le tirage des autres incidents.
for (let t = 1; t <= 120; t++) {
  const s6 = { ...st, turn: t, nextDeadline: deadline + (t - 1) * 24 * H };
  const tous = tousIncidents(s6, 'a'), u = tous.filter((i) => i.urgence);
  assert.equal(u.length, 1, 'une urgence par jour');
  const debut = s6.nextDeadline - 24 * H;
  assert.ok(u[0].ouvre >= debut + 10 * H && u[0].ouvre <= debut + 16 * H && u[0].ferme === s6.nextDeadline);
  assert.equal(u[0].jeu, 'bitonal'); assert.ok(u[0].id.endsWith('-u'));
  assert.ok(u[0].vit > 0.79 && u[0].vit <= 1.16);
}
// Vitesse : parc neuf 1, parc usé à 70 % 0,86 ; tout cabossé −6 % ; préparation +5 % par niveau.
{
  const z0 = { usure: 0, vehicules: 4, vehiculesHS: [], cabosses: [], prepa: 0 };
  assert.equal(vitesseCombi(z0).mult, 1);
  assert.equal(vitesseCombi({ ...z0, usure: 70 }).mult, 0.86);
  assert.equal(vitesseCombi({ ...z0, cabosses: [{}, {}, {}, {}] }).mult, 0.94);
  assert.equal(vitesseCombi({ ...z0, cabosses: [{}] }).cabosse, false, 'une combi saine reste disponible');
  assert.equal(vitesseCombi({ ...z0, prepa: 3 }).mult, 1.15);
  assert.equal(vitesseCombi({ ...z0, prepa: 9 }).prepa, PREPA.max);
}
// Conséquences.
{
  const base = () => { const z = structuredClone(st.zones.a); z._compta = []; z.moral = 60; z.usure = 10; z.cabosses = []; z.blesses = []; return z; };
  const inc = [{ id: 'u', urgence: true, service: 'intervention', titre: URGENCE.titre, agents: 7 }];
  const jouer = (res, seed = 'r') => { const z = base(); appliquerIncidents(z, { incidents: inc, resultats: res ? { u: res } : {}, alloc: { intervention: 7 }, T: 4, rng: makeRng(seed) }); return z; };
  let z = jouer({ statut: 'ok', fautes: 0, score: 5000 });
  assert.equal(z.moral, 63); assert.equal(z.jaugeIncidents, 2); assert.equal(z._ps, 5); assert.equal(z.usure, 10);
  z = jouer({ statut: 'ok', fautes: 2 });
  assert.equal(z.usure, 14, 'deux accrochages : +4 % d’usure'); assert.equal(z.jaugeIncidents, 1);
  z = jouer({ statut: 'passe', fautes: 0 });
  assert.equal(z.moral, 60); assert.ok(!z._ps && !z.jaugeIncidents && !z.blesses.length && z.usure === 10, 'pas le temps : rien');
  z = jouer({ statut: 'rate', raison: 'hs', fautes: 3 });
  assert.equal(z.cabosses.length, 1, 'combi hors service : un véhicule cabossé'); assert.ok(!z.blesses.length && z.moral === 60 && z.usure === 10);
  let blesses = 0, moralPerdu = 0;
  for (let k = 0; k < 400; k++) { const zz = jouer({ statut: 'rate', fautes: 1 }, `t${k}`); if (zz.blesses.length) { blesses++; assert.equal(zz.blesses[0].retour, 4 + 1 + URGENCE.absence); } else if (zz.moral === 59) moralPerdu++; }
  assert.ok(blesses > 70 && blesses < 130, `trop tard : ~25 % de blessé (${blesses}/400)`); assert.equal(blesses + moralPerdu, 400);
  z = jouer({ statut: 'abandon', fautes: 1 });
  assert.equal(z.usure, 10, 'un abandon n’use pas le parc');
  // Stand de tir : moitié moins de blessés.
  let avecTir = 0;
  for (let k = 0; k < 400; k++) { const zz = base(); zz.infra = { ...(zz.infra || {}), tir: true }; appliquerIncidents(zz, { incidents: inc, resultats: { u: { statut: 'rate', fautes: 0 } }, alloc: {}, T: 4, rng: makeRng(`t${k}`) }); if (zz.blesses.length) avecTir++; }
  assert.ok(avecTir < blesses * 0.7, `stand de tir : moins de blessés (${avecTir} contre ${blesses})`);
}
// Temps cible : les parcours du moteur sont ceux du mini-jeu ; la marge suit les courses (65 % à temps), pas à pas, bornée.
{
  const html = readFileSync('minijeux/bitonal.html', 'utf8');
  for (const [niv, cle] of [['facile', 'facile'], ['normal', 'moyen'], ['difficile', 'difficile']]) {
    const m = html.match(new RegExp(`${cle}:\\s*\\{ long: (\\d+), inter: (\\d+),`));
    assert.ok(m && Number(m[1]) === CIBLE.niveaux[niv].long && Number(m[2]) === CIBLE.niveaux[niv].inter, `parcours ${niv} identique au mini-jeu`);
  }
  const s8 = {};
  assert.equal(cibleUrgence(s8, 'normal').cible, Math.round(refUrgence('normal') * CIBLE.niveaux.normal.marge));
  adapterCibleUrgence(s8, [{ niveau: 'normal', temps: 100, vit: 1 }]);
  assert.equal(s8.urgenceCible.normal.marge, CIBLE.niveaux.normal.marge, 'moins de 5 courses : pas d’ajustement');
  // Des joueurs lents (ratios 1,5 à 1,7) : la marge monte, pas à pas, jusqu'à son maximum.
  { const m0 = s8.urgenceCible.normal.marge; adapterCibleUrgence(s8, [1.5, 1.55, 1.6, 1.65, 1.7].map((r) => ({ niveau: 'normal', temps: r * refUrgence('normal'), vit: 1 }))); assert.ok(s8.urgenceCible.normal.marge > m0 && s8.urgenceCible.normal.marge - m0 <= CIBLE.pasMax + 1e-9, 'un pas borné'); }
  for (let k = 0; k < 30; k++) adapterCibleUrgence(s8, [1.5, 1.55, 1.6, 1.65, 1.7].map((r) => ({ niveau: 'normal', temps: r * refUrgence('normal'), vit: 1 })));
  assert.equal(s8.urgenceCible.normal.marge, CIBLE.niveaux.normal.max, 'bornée au maximum');
  // Des joueurs rapides (1,10) : elle redescend.
  for (let k = 0; k < 30; k++) adapterCibleUrgence(s8, Array.from({ length: 5 }, () => ({ niveau: 'normal', temps: 1.1 * refUrgence('normal'), vit: 1 })));
  assert.ok(Math.abs(s8.urgenceCible.normal.marge - 1.1) < 0.01, `redescend vers les temps réels (${s8.urgenceCible.normal.marge})`);
  // Une combi lente (×0,9) : son temps est ramené à une combi neuve.
  const s9 = {};
  for (let k = 0; k < 40; k++) adapterCibleUrgence(s9, [{ niveau: 'facile', temps: 1.25 / 0.9 * refUrgence('facile'), vit: 0.9 }]);
  assert.ok(Math.abs(s9.urgenceCible.facile.marge - 1.25) < 0.01, 'temps ramené à une combi neuve');
  assert.ok(s9.urgenceCible.facile.h.length <= CIBLE.garde);
}
// Résolution : l'urgence jouée est lue dans le profil ; « pas le temps » ne compte pas pour le Directeur.
{
  const s7 = structuredClone(st);
  const u = tousIncidents(s7, 'a').find((i) => i.urgence);
  const pl = { a: { nom: 'Zone 1111', code: '1111', incidents: { cle: 's1t1', r: { [u.id]: { statut: 'ok', fautes: 0, score: 4200, niveau: 'normal' } } } }, b: { nom: 'Zone 2222', code: '2222' }, c: { nom: 'Zone 3333', code: '3333' } };
  const { state: ap } = resolveTurn(s7, { players: pl });
  assert.ok(ap.zones.a.rapport.some((l) => l.startsWith('Urgence ·') && l.includes('sur place à temps')));
  assert.equal(ap.zones.a.stats.urgencesOk, 1);
  // Le temps de la course entre dans le calcul de la marge (stocké dans l'état de la partie).
  const pl2 = { ...pl, a: { ...pl.a, incidents: { cle: 's1t1', r: { [u.id]: { statut: 'rate', fautes: 0, temps: 150, niveau: 'normal' } } } } };
  const { state: ap2 } = resolveTurn(structuredClone(st), { players: pl2 });
  assert.equal(ap2.urgenceCible.normal.h.length, 1);
  assert.ok(Number.isFinite(tousIncidents(ap2, 'a').find((i) => i.urgence).cible));
}
console.log('OK : incidents du jour (tirage, horaires, difficulté, effets, jauge, résolution).');
