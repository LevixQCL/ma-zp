// Incidents du jour : tirage déterministe, horaires, effets à la résolution.
import assert from 'node:assert/strict';
import { createGame, buildJoinZone, resolveTurn } from '../js/engine/resolve.js';
import { incidentsDuTour, appliquerIncidents, MALUS, INC, difficulte, chanceSeule, pointsJauge } from '../js/engine/incidents.js';
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
    total++; if (l.length === 2) { deux++; assert.notEqual(l[0].service, l[1].service); assert.ok(l[1].ouvre - l[0].ouvre >= 3 * H - 1 || l[1].ouvre === s2.nextDeadline - 5 * H); }
    for (const i of l) {
      const debut = s2.nextDeadline - 24 * H;
      assert.ok(i.ouvre >= debut + 12 * H && i.ouvre <= debut + 19 * H, 'ouvre entre 8 h et 15 h');
      assert.ok(i.ferme <= s2.nextDeadline && i.ferme > i.ouvre);
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
const moral0 = z.moral, budget0 = z.budget;
z.jaugeIncidents = 49;
const r = appliquerIncidents(z, { incidents: incs, resultats: { x0: { statut: 'ok', fautes: 0 }, x1: { statut: 'rate', fautes: 2 } }, alloc: { intervention: 7, roulage: 2 }, T: 5, rng: makeRng('t') });
assert.equal(z.moral, moral0 + 3 - 1, 'Intervention réussie +3, Roulage raté −1');
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
for (const u of ['b', 'c']) assert.ok(apres.zones[u].rapport.some((l) => l.startsWith('Incident ·') && l.includes('personne n’est venu')), `incident non joué géré seul (${u})`);
// Un résultat d'un autre tour n'est pas compté.
const players2 = { ...players, a: { ...players.a, incidents: { cle: 's1t0', r: { 's1t0-0': { statut: 'ok', fautes: 0 } } } } };
const { state: apres2 } = resolveTurn(structuredClone(st), { players: players2 });
assert.ok(!apres2.zones.a.jaugeIncidents);
assert.equal(INC.jauge, 50);
console.log('OK : incidents du jour (tirage, horaires, difficulté, effets, jauge, résolution).');
