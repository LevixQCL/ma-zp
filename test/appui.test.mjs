// Appui fédéral (labo, RCCU) : équipes limitées, priorité aux refusés, pièce si le mini-jeu est réussi.
import assert from 'node:assert/strict';
import { createGame, buildJoinZone, resolveTurn } from '../js/engine/resolve.js';
import { equipesDispo, APPUI, appuiDuJour } from '../js/engine/appui.js';

const deadline = Date.UTC(2026, 9, 2, 18, 0, 0);
let st = createGame({ seed: 'appui-test', turnDeadline: deadline });
const uids = ['a', 'b', 'c', 'd', 'e', 'f'];
uids.forEach((u, k) => { st.zones[u] = buildJoinZone(st, u, { code: String(1111 * (k + 1)).slice(0, 4), nom: `Zone ${u}`, couleur: '#fff' }, 1); });
const players = Object.fromEntries(uids.map((u) => [u, { nom: `Zone ${u}`, code: '1234' }]));

// 0. Disponibilités : jamais négatives, autour de la base, déterministes.
const vus = new Set();
for (let t = 1; t <= 200; t++) { const n = equipesDispo(st, 'labo', t, 6); vus.add(n); assert.equal(n, equipesDispo(st, 'labo', t, 6)); assert.ok(n >= 0 && n <= 2); }
assert.ok(vus.size >= 2, 'la disponibilité varie d’un jour à l’autre');
assert.ok(equipesDispo(st, 'rccu', 5, 2) >= 0);

// 1. Tour 1 : toutes les zones demandent le labo. Pas plus d'équipes que de disponibles ; les refusés deviennent prioritaires.
const orders1 = Object.fromEntries(uids.map((u) => [u, { appui: 'labo' }]));
const dispo1 = equipesDispo(st, 'labo', st.turn, uids.length);
const { state: s1 } = resolveTurn(st, { orders: orders1, players });
const servis = uids.filter((u) => s1.zones[u].appui);
assert.equal(servis.length, Math.min(dispo1, uids.length));
for (const u of uids) {
  const z = s1.zones[u];
  if (z.appui) { assert.equal(z.appui.tour, 2); assert.ok(APPUI.unites.labo.jeux.includes(z.appui.jeu)); assert.ok(!z.appuiPrio); assert.ok(appuiDuJour(s1, z)); }
  else { assert.ok(z.appuiPrio, 'refusé : prioritaire la prochaine fois'); assert.ok(z.rapport.some((l) => l.includes('refusée'))); }
}

// 2. Tour 2 : un servi réussit, un autre ne joue pas. Les refusés d'hier redemandent et passent devant.
const [ok, absent] = servis;
const players2 = { ...players, [ok]: { ...players[ok], appui: { id: s1.zones[ok].appui.id, statut: 'ok' } } };
const avant = s1.zones[ok].enquete.pieces.length;
const refuses = uids.filter((u) => !s1.zones[u].appui);
const orders2 = Object.fromEntries(refuses.map((u) => [u, { appui: 'labo' }]));
const dispo2 = equipesDispo(s1, 'labo', s1.turn, uids.length);
const { state: s2 } = resolveTurn(s1, { orders: orders2, players: players2 });
const pj = s2.zones[ok].enquete.pieces.filter((p) => p.src === 'pjf');
assert.equal(pj.length, 1, 'une pièce de l’appui réussi');
assert.ok(s2.zones[ok].enquete.pieces.length >= avant + 1);
assert.ok(s2.zones[ok].rapport.some((l) => l.includes('analyse réussie')));
if (absent) { assert.ok(!s2.zones[absent].enquete.pieces.some((p) => p.src === 'pjf')); assert.ok(!s2.zones[absent].appui); }
assert.equal(refuses.filter((u) => s2.zones[u].appui).length, Math.min(dispo2, refuses.length), 'les prioritaires sont servis en premier');
assert.ok(!s2.zones[ok].appui, 'appui consommé');

// 3. Le labo trouve de préférence les moyens.
let moy = 0, tot = 0;
for (let t = 0; t < 40; t++) {
  let s = createGame({ seed: `appui-moy-${t}`, turnDeadline: deadline });
  s.zones.a = buildJoinZone(s, 'a', { code: '1111', nom: 'A', couleur: '#fff' }, 1);
  const p = { a: { nom: 'A', code: '1111' } };
  s = resolveTurn(s, { orders: { a: { appui: 'labo' } }, players: p }).state;
  if (!s.zones.a.appui) continue;
  s = resolveTurn(s, { orders: {}, players: { a: { ...p.a, appui: { id: s.zones.a.appui.id, statut: 'ok' } } } }).state;
  const piece = s.zones.a.enquete.pieces.find((x) => x.src === 'pjf');
  if (piece) { tot++; if (piece.f.startsWith('moy:')) moy++; }
}
assert.ok(tot >= 20 && moy / tot > 0.8, `labo → moyens (${moy}/${tot})`);
console.log(`OK : appui fédéral (dispo, répartition, priorité, pièce ; labo → moyens ${moy}/${tot}).`);
