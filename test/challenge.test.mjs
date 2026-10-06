// Prime du Challenge : semaine, niveau minimum, une prime par joueur, remise du dimanche dans la résolution.
import assert from 'node:assert/strict';
import { CHALLENGE, cleSemaine, laureatsSemaine, classementSemaine, primeChallenge } from '../js/engine/challenge.js';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES } from '../js/engine/bots.js';
import { weekdayBe } from '../js/engine/time.js';

// Semaine : l'échéance du dimanche 20:00 (mardi 6 oct. 2026 20:00 → dimanche 11 oct. 20:00, Bruxelles).
const mardi = Date.UTC(2026, 9, 6, 18, 0);
const dim = cleSemaine(mardi);
assert.equal(weekdayBe(dim), 6);
assert.equal(dim, Date.UTC(2026, 9, 11, 18, 0));
assert.equal(cleSemaine(dim), dim, 'le dimanche lui-même clôt sa semaine');
assert.equal(cleSemaine(Date.UTC(2026, 9, 25, 19, 0)), Date.UTC(2026, 9, 25, 19, 0), 'dimanche d’heure d’hiver');

const e = (n, at = 1, c = dim) => ({ c, n, at });
const players = {
  a: { defisSem: { colis: e(14, 5), adn: e(9, 2), reseau: e(7) } },
  b: { defisSem: { colis: e(12), adn: e(8) } },
  c: { defisSem: { adn: e(30, 1, dim - 7 * 86400000) } }, // semaine passée : ne compte pas
  d: { defisSem: { reseau: e(CHALLENGE.niveauMin - 1) } }, // sous le minimum
  r: { retire: true, defisSem: { dossier: e(40) } },
};
assert.deepEqual(classementSemaine(players, dim, 'adn').map((x) => x.uid), ['a', 'b']);
assert.deepEqual(classementSemaine(players, dim, 'reseau').map((x) => x.uid), ['a']);
const l = laureatsSemaine(players, dim);
// a est premier partout : il garde un seul jeu, b prend l'autre ; reseau n'a plus personne d'autre que a.
assert.equal(l.filter((x) => x.uid === 'a').length, 1, 'une prime par joueur');
assert.deepEqual(l.map((x) => x.uid).sort(), ['a', 'b']);
assert.ok(!l.some((x) => x.uid === 'r' || x.uid === 'c' || x.uid === 'd'));
// Égalité : le premier arrivé.
assert.equal(laureatsSemaine({ x: { defisSem: { colis: e(10, 50) } }, y: { defisSem: { colis: e(10, 20) } } }, dim)[0].uid, 'y');

// Remise : budget, jauge (skin si elle déborde), rapport, brève.
const zone = (uid, jauge = 0) => ({ uid, code: '5300', nom: uid, budget: 20, jaugeIncidents: jauge, stats: {}, rapport: [], skins: [] });
const st = { nextDeadline: dim, zones: { a: zone('a', 45), b: zone('b') } };
const news = [];
let skins = 0;
primeChallenge(st, ['a', 'b'], players, { push: (...x) => news.push(x), zoneLabel: (z) => z.nom, remplirJauge: (z) => { if (z.jaugeIncidents >= 50) { z.jaugeIncidents -= 50; skins++; } return null; } });
assert.equal(st.zones.a.budget, 20 + CHALLENGE.prime);
assert.equal(st.zones.b.budget, 20 + CHALLENGE.prime);
assert.equal(skins, 1, 'la jauge de a déborde : un skin');
assert.equal(st.zones.a.jaugeIncidents, 45 + CHALLENGE.jauge - 50);
assert.equal(news.length, 1);
assert.equal(st.challenge.laureats.length, 2);

// Dans la résolution : seulement le dimanche (nextWeekday === 0), avec la clé de l'échéance résolue.
let s0 = createGame({ seed: 'chal' });
const pl = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, { ...b }]));
s0 = resolveTurn(s0, { players: pl }).state;
s0.nextDeadline = dim;
const u = BOT_PROFILES[0].uid;
pl[u].defisSem = { crochetage: e(11) };
const lundi = resolveTurn(s0, { players: pl, nextWeekday: 1 }).state;
assert.ok(!lundi.challenge, 'pas de remise un autre jour');
const r = resolveTurn(s0, { players: pl, nextWeekday: 0 });
assert.deepEqual(r.state.challenge.laureats, [{ jeu: 'crochetage', uid: u, niveau: 11 }]);
assert.ok(r.state.zones[u].rapport.some((x) => x.startsWith('Prime du Challenge')));
assert.ok(r.state.zones[u].compta.lignes.some((x) => x.k === 'challenge' && x.v === CHALLENGE.prime));
console.log('OK : prime du Challenge (semaine, minimum, une prime par joueur, remise du dimanche).');
