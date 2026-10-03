// Une zone qui arrive en cours d'affaire reçoit un dossier de rattrapage : la moyenne des autres, moins une pièce.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { dossierDe, RATTRAPAGE } from '../js/engine/enquete.js';

let state = createGame({ seed: 'rattrapage' });
for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
for (let t = 1; t <= 12 && !(state.enquete && state.enquete.jour >= 5); t++) {
  const orders = {};
  for (const b of BOT_PROFILES) { const o = botOrders(state.zones[b.uid], state, b.style); if (o) orders[b.uid] = o; }
  state = resolveTurn(state, { orders, nextWeekday: (t + 1) % 7 }).state;
}
assert.ok(state.enquete && state.enquete.jour >= 5, 'affaire en cours');
const moy = Math.round(BOT_PROFILES.reduce((s, b) => s + state.zones[b.uid].enquete.pieces.length, 0) / BOT_PROFILES.length);
const nouveau = newZone({ uid: 'nouveau', code: '7777', nom: 'Nouveau' }, state.turn);
state.zones.nouveau = nouveau;
const d = dossierDe(state, nouveau);
const ratt = d.pieces.filter((p) => p.src === 'rattrapage');
assert.equal(d.pieces.length, Math.min(moy - RATTRAPAGE.retrait, d.pieces.length - ratt.length + RATTRAPAGE.max), `moyenne ${moy} − 1`);
assert.ok(ratt.length > 0, 'des pièces de rattrapage');
assert.ok(ratt.every((p) => !p.f.startsWith('p:')), 'jamais d’indice de planque');
assert.equal(new Set(d.pieces.map((p) => p.f)).size, d.pieces.length, 'pas de doublon');
assert.deepEqual(dossierDe(state, nouveau).pieces.map((p) => p.f), d.pieces.map((p) => p.f), 'tirage stable');
// Au jour 1 d'une affaire, rien à rattraper.
const s1 = createGame({ seed: 'r2' }); s1.enquete = { ...state.enquete, jour: 1 }; s1.zones = { x: newZone({ uid: 'x', code: '1', nom: 'X' }, 1) };
assert.equal(dossierDe(s1, s1.zones.x).pieces.filter((p) => p.src === 'rattrapage').length, 0);
console.log(`OK : rattrapage (${d.pieces.length} pièces pour une moyenne de ${moy}, jour ${state.enquete.jour}).`);
// Zone déjà inscrite pendant l'affaire, avant le rattrapage (dossier sans pièces de rattrapage) : elle le reçoit une fois.
{
  const ancien = newZone({ uid: 'ancien', code: '8888', nom: 'Ancien' }, state.turn);
  ancien.enquete = { n: state.enquete.n, v: dossierDe(state, nouveau).v, pieces: dossierDe(state, nouveau).pieces.filter((p) => p.src !== 'rattrapage'), accuse: null, exclu: false };
  state.zones.ancien = ancien;
  const d2 = dossierDe(state, ancien);
  assert.ok(d2.ratt && d2.pieces.some((p) => p.src === 'rattrapage'), 'rattrapage donné après coup');
  ancien.enquete = d2;
  assert.equal(dossierDe(state, ancien).pieces.length, d2.pieces.length, 'une seule fois');
  // Une zone présente depuis le début de l'affaire ne reçoit rien.
  const b0 = state.zones[BOT_PROFILES[0].uid];
  assert.equal(dossierDe(state, b0).pieces.filter((p) => p.src === 'rattrapage').length, 0);
}
console.log('OK : rattrapage après coup pour les zones déjà arrivées.');
