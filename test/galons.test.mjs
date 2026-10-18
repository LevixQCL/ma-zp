// Galons des figures (onglet Brigade) : attribués seulement par ajout, un par surnom, appliqués au tour de 20:00.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { appliquerGalons, lireGalons, galonsLibres, creerEquipe } from '../js/engine/equipe.js';

const z = { equipe: [{ role: 'inter', prenom: 'A', nom: 'B', xp: 90, niveau: 2 }, { role: 'rech', prenom: 'C', nom: 'D', xp: 0, niveau: 0 }] };
assert.deepEqual(lireGalons({ galons: { inter: ['A', 'X', 'B', 'A', 'B'], zz: ['A'] } }), { inter: ['A', 'B', 'A'] });
assert.equal(appliquerGalons(z, { inter: ['A', 'B', 'A'], rech: ['A'] }).length, 2, 'deux galons au plus pour un niveau 2, aucun sans surnom');
assert.deepEqual(z.equipe[0].galons, ['A', 'B']);
assert.equal(z.equipe[1].galons, undefined);
assert.equal(appliquerGalons(z, { inter: ['B', 'B'] }).length, 0, 'pas de retour sur un palier déjà attribué');
assert.deepEqual(z.equipe[0].galons, ['A', 'B']);
assert.equal(galonsLibres(z.equipe[0]), 0);
// Au tour de 20:00, avec les ordres.
const st = createGame({ seed: 'galons' });
st.zones.u1 = newZone({ uid: 'u1', code: '1111', nom: 'Test' }, 1);
const zz = st.zones.u1; zz.equipe = zz.equipe || creerEquipe('u1'); const m = zz.equipe.find((x) => x.role === 'prox') || zz.equipe[0];
m.xp = 30; m.niveau = 1;
const r = resolveTurn(st, { orders: { u1: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal', galons: { [m.role]: ['B'] } } }, quests: {}, players: {}, nextWeekday: 1 });
const m2 = r.state.zones.u1.equipe.find((x) => x.role === m.role);
assert.deepEqual(m2.galons, ['B']);
assert.ok(r.state.zones.u1.rapport.some((l) => l.startsWith('Galon :')), 'ligne de rapport');
console.log('galons : ok');
