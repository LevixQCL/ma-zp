// Saison 4 : une partie complète de robots (deux saisons et la bascule), sans erreur de zone,
// avec des jauges bornées et des budgets plausibles. node test/saison4-sim.mjs [graines=3]
import assert from 'node:assert/strict';
import { createGame, resolveTurn, migrateState } from '../js/engine/resolve.js';
import { botOrders, BOT_PROFILES } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { SEASON_LENGTH, palierSpe } from '../js/engine/constants.js';

const SEEDS = Number(process.argv[2] || 3);
const STYLES = ['equilibre', 'agressif', 'prudent', 'distrait', 'equilibre', 'agressif', 'prudent', 'equilibre'];

for (let g = 0; g < SEEDS; g++) {
  let state = createGame({ seed: `s4-${g}`, turnDeadline: 1_700_000_000_000 });
  for (let i = 0; i < 8; i++) {
    const uid = `bot-${i}`;
    state.zones[uid] = newZone({ uid, code: String(5300 + i), nom: `Zone ${i}` }, 1, { arrivee: i });
  }
  migrateState(state);
  let tours = 0, saisons = state.season, resolues = 0, classees = 0;
  while (state.season < saisons + 2 && tours < SEASON_LENGTH * 2 + 4) {
    const orders = {}, enqueteActions = {};
    Object.keys(state.zones).forEach((u, i) => { const o = botOrders(state.zones[u], state, STYLES[i % STYLES.length]); if (o) { orders[u] = o; enqueteActions[u] = o.actionsEnquete || []; } });
    const { state: s2, gazette } = resolveTurn(state, { orders, enqueteActions, nextWeekday: (tours + 1) % 7 });
    if (gazette.enquete && gazette.enquete.decouverte) resolues++;
    if (gazette.enquete && gazette.enquete.classee) classees++;
    s2.nextDeadline = (state.nextDeadline || 0) + 86400000; s2.lastResolvedAt = state.nextDeadline;
    assert.ok(!s2.zonesEnErreur, `zones en erreur au tour ${state.turn} : ${JSON.stringify(s2.zonesEnErreur)} ${JSON.stringify(Object.values(s2.zones).map((z) => z.rapport.filter((l) => /Incident technique/.test(l))))}`);
    for (const z of Object.values(s2.zones)) {
      for (const k of ['moral', 'satisfaction', 'reputation']) assert.ok(z[k] >= 0 && z[k] <= 100, `${k} hors bornes`);
      assert.ok(Number.isFinite(z.budget) && Number.isFinite(z.ipz), 'budget ou IPZ non fini');
      for (const k of ['chef', 'equipe', 'lots', 'materiel', 'doctrine']) assert.equal(z[k], undefined, `champ retiré présent : ${k}`);
    }
    for (const k of ['fipas', 'pactes', 'vente', 'releves', 'affaires', 'conseil']) assert.equal(s2[k], undefined, `champ d'état retiré présent : ${k}`);
    assert.ok(gazette && gazette.une, 'Gazette sans une');
    state = s2; tours++;
  }
  const zs = Object.values(state.zones);
  const spe = zs.filter((z) => z.specialite).length;
  const pal3 = zs.filter((z) => palierSpe(z) === 3).length;
  console.log(`graine ${g} : ${tours} tours, saison ${state.season}, ${spe}/${zs.length} spécialisées (${pal3} au palier 3), affaires résolues ${resolues}, classées ${classees}, budgets ${zs.map((z) => Math.round(z.budget)).join(' ')}`);
  assert.ok(spe >= 6, 'les robots choisissent une spécialité');
}
console.log('saison4-sim : OK');
