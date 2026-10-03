// Enquête en pause (affaire retirée par le maître du jeu) : la traque continue, la nouvelle affaire s'ouvre au tour suivant.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { affaire, nouvelleAffaire } from '../js/engine/enquete.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';

const players = Object.fromEntries(BOT_PROFILES.slice(0, 4).map((b) => [b.uid, b]));
let state = resolveTurn(createGame({ seed: 'pause-test' }), { players }).state;
const uids = Object.keys(state.zones);
const ordres = (st, extra = {}) => Object.fromEntries(uids.map((u) => [u, { ...botOrders(st.zones[u], st, players[u].style), ...(extra[u] || {}) }]));
// Un tour normal, puis l'affaire 1 est « découverte » : traque sur l'affaire 1, affaire 2 ouverte.
state = resolveTurn(state, { orders: ordres(state), players }).state;
const n1 = state.enquete.n;
for (const z of Object.values(state.zones)) z.enquete = z.enquete || { n: n1, pieces: [] };
state.traques = [{ n: n1, tours: 2, decouvreurs: [uids[0]], contributeurs: [] }];
nouvelleAffaire(state);
const n2 = state.enquete.n;
assert.equal(state.zones[uids[0]].enquetePrecedente.n, n1);
// Le maître du jeu retire l'affaire 2.
state.enquete = null;
state.enquetePause = { id: 'x', n: n2, titre: affaire(state, n2).titre, tour: state.turn, reprise: 0 };
// Nuit 1 : personne ne trouve la planque ; la nouvelle affaire s'ouvre, la traque continue.
const a1 = affaire(state, n1);
const mauvaise = (a1.planque + 1) % a1.planques.length;
const r1 = resolveTurn(state, { orders: ordres(state, { [uids[1]]: { traque: { n: n1, planque: mauvaise, agents: 4 } } }), players });
state = r1.state;
assert.ok(!state.enquetePause, 'la pause est levée');
assert.equal(state.enquete.n, n2 + 1, 'nouvelle affaire ouverte');
assert.equal(state.enquete.jour, 1);
assert.equal(r1.gazette.enquete.pause, true);
assert.ok(r1.gazette.enquete.nouvelle);
assert.equal(state.traques.length, 1);
assert.equal(state.traques[0].tours, 1);
assert.equal(state.zones[uids[0]].enquetePrecedente.n, n1, 'le dossier de la traque est gardé');
// Nuit 2 : arrestation à la bonne planque.
const r2 = resolveTurn(state, { orders: ordres(state, { [uids[1]]: { traque: { n: n1, planque: a1.planque, agents: 6 }, alloc: { ...botOrders(state.zones[uids[1]], state, players[uids[1]].style).alloc, intervention: 8 } } }), players });
assert.equal(r2.gazette.enquete.arrestations.length, 1, 'arrestation pendant la traque');
console.log('pause-enquete : OK');
