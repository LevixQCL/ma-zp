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

// Brigade en direct : appel du jour commun, style appris, rodage des recrues.
import { appelDuJour, intentionBrigade, facteurRodage, ajouterRodage } from '../js/engine/brigade.js';
{
  const st2 = createGame({ seed: 'appel' });
  for (const u of ['a', 'b']) { st2.zones[u] = newZone({ uid: u, code: u === 'a' ? '1111' : '2222', nom: u }, 1); st2.zones[u].equipe = creerEquipe(u); }
  const a1 = appelDuJour(st2);
  const r2 = resolveTurn(st2, { orders: { a: { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal', appel: 1 } }, quests: {}, players: {}, nextWeekday: 1 });
  const za = r2.state.zones.a, zb = r2.state.zones.b;
  assert.equal(za.appelHier.i, a1.i, 'même appel pour toutes les zones');
  assert.equal(zb.appelHier.i, a1.i);
  assert.equal(za.appelHier.seule, false); assert.equal(zb.appelHier.seule, true, 'sans ordres, la brigade décide seule');
  assert.equal(za.styleBrigade[a1.ctx][a1.opts[1].app], 1, 'le choix apprend le style');
  assert.equal(intentionBrigade(za, a1).op.app, a1.opts[1].app, 'seule, elle refait ce que le joueur a choisi');
  const zr = { agents: 20, equipe: [] };
  assert.equal(ajouterRodage(zr, 2, 5), 4); assert.equal(facteurRodage(zr, 6), 1 - 1 / 20);
  assert.equal(facteurRodage(zr, 10), 1, 'formation finie au bout de 4 jours');
  const zt = { agents: 20, equipe: [{ role: 'inter', galons: ['A', 'B'] }] };
  assert.equal(ajouterRodage(zt, 2, 5), 2, 'deux jours avec un tuteur');
  console.log('brigade en direct : ok');
}
