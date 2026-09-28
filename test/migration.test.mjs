import { APP_VERSION } from '../js/engine/constants.js';
// Vérifie qu'une mise à jour ne casse pas une partie en cours.
import assert from 'node:assert/strict';
import { createGame, resolveTurn, migrateState, isOutdated } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { createLocalBackend } from '../js/data/local.js';
import { resolvePending } from '../js/data/resolver.js';

// 1. Un état « ancien » (champs manquants) est complété sans rien perdre.
let state = createGame({ seed: 'm' });
for (const b of BOT_PROFILES) state.zones[b.uid] = newZone(b, 1);
state.zones['bot-canal'].budget = 42.5;
state.zones['bot-canal'].ps = 330;
delete state.zones['bot-canal'].stats;         // champ absent dans une vieille version
delete state.zones['bot-canal'].infra;
delete state.palmares;
delete state.minClientVersion;
const migrated = migrateState(JSON.parse(JSON.stringify(state)));
assert.equal(migrated.zones['bot-canal'].budget, 42.5, 'le budget est conservé');
assert.equal(migrated.zones['bot-canal'].ps, 330, 'les PS sont conservés');
assert.ok(migrated.zones['bot-canal'].stats && migrated.zones['bot-canal'].infra, 'champs manquants recréés');
assert.deepEqual(migrated.palmares, []);

// 2. Un tour se résout normalement à partir de cet état ancien.
const orders = {};
for (const b of BOT_PROFILES) { const o = botOrders(migrated.zones[b.uid], migrated, b.style); if (o) orders[b.uid] = o; }
const r = resolveTurn(state, { orders });
assert.equal(r.state.turn, 2);
assert.equal(r.state.minClientVersion, APP_VERSION);
assert.ok(r.state.enquete && r.state.enquete.n === 1, 'une affaire s’ouvre sur une ancienne partie');

// 3. Un appareil resté sur une ancienne version ne calcule plus les tours.
assert.equal(isOutdated({ minClientVersion: APP_VERSION }), false);
assert.equal(isOutdated({ minClientVersion: APP_VERSION + 1 }), true);
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
const b = createLocalBackend({ seed: 't', resolutionHour: 20 });
await b.signInDemo();
const s = await b.getState();
s.minClientVersion = APP_VERSION + 1; s.nextDeadline = Date.now() - 1000;
await b.adminImport({ state: s, players: {} });
assert.equal(await resolvePending(b, { hour: 20 }), 0, 'pas de résolution avec un code périmé');

// 4. Sauvegarde et restauration.
const backup = await b.adminExport();
assert.equal(backup.state.turn, s.turn);
console.log('OK : migration, garde de version et sauvegarde vérifiées.');
