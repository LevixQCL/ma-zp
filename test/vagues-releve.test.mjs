// Vagues de délinquance et relève : règles de base.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { newZone } from '../js/engine/zone.js';
import { vagueVisee } from '../js/engine/vagues.js';
import { releveRecue, releveResoudre } from '../js/engine/releve.js';
import { zonesVoisines } from '../js/engine/vagues.js';

const BASE = { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 };
const SPE = { intervention: 5, proximite: 11, recherche: 2, roulage: 1, admin: 1 };
let st = createGame({ seed: 'vt' });
for (let i = 0; i < 6; i++) st.zones[`z${i}`] = newZone({ uid: `z${i}`, code: String(5300 + i), nom: `Z${i}` }, 1);
let vue = 0, versNouveau = 0;
for (let t = 1; t <= 8; t++) {
  if (t === 5) st.zones.neuf = newZone({ uid: 'neuf', code: '5399', nom: 'Neuve' }, 5);
  const orders = {};
  for (const u of Object.keys(st.zones)) orders[u] = { alloc: u === 'z0' ? SPE : BASE, rythme: 'normal' };
  st = resolveTurn(st, { orders }).state;
  for (const v of st.vagues.liste) { vue++; assert.notEqual(v.de, v.vers); if (v.vers === 'neuf') versNouveau++; assert.ok(zonesVoisines(st, v.de)[v.vers], 'vague vers une voisine'); }
  // une seule vague reçue par zone
  const recues = st.vagues.liste.map((v) => v.vers); assert.equal(new Set(recues).size, recues.length);
}
assert.ok(vue > 0, 'la zone spécialisée envoie des vagues');
assert.equal(versNouveau, 0, 'les nouvelles zones sont protégées');

// Relève : refus sans conséquence, capture assurée à 3 agents.
const s2 = JSON.parse(JSON.stringify(st));
const [a, b] = (() => { for (const u of Object.keys(s2.zones)) { const v = Object.keys(zonesVoisines(s2, u)).filter((x) => x !== 'neuf'); if (v.length) return [u, v[0]]; } })();
const mk = () => ({ id: 'rx', origine: a, vers: b, par: null, transmis: false, suspect: 'le guetteur', titre: 'Test', cause: 'Test', cell: zonesVoisines(s2, a)[b].chezLui, tour: s2.turn, etape: 'proposee' });
const prep = (z) => { z.rapport = []; z._points = 0; z._psEntraide = 0; z._compta = []; };
s2.releves = [mk()];
for (const z of Object.values(s2.zones)) prep(z);
assert.ok(releveRecue(s2, b));
const avant = JSON.stringify([s2.zones[b].satisfaction, s2.zones[b].moral, s2.zones[b].reputation]);
let r = releveResoudre(s2, Object.keys(s2.zones), { [b]: { releve: { id: 'rx', choix: 'refuser' } } }, () => {}, s2.turn, (z) => z.nom);
assert.equal(JSON.stringify([s2.zones[b].satisfaction, s2.zones[b].moral, s2.zones[b].reputation]), avant, 'refus sans malus');
assert.deepEqual(r.prises, {});
s2.releves = [mk()];
for (const z of Object.values(s2.zones)) prep(z);
r = releveResoudre(s2, Object.keys(s2.zones), { [b]: { releve: { id: 'rx', choix: 'prendre', agents: 3 } } }, () => {}, s2.turn, (z) => z.nom);
assert.equal(r.prises[b].intervention, 3);
assert.ok(s2.zones[b]._points >= 10 && s2.zones[a]._points >= 3, 'mérite partagé');
console.log('vagues-releve : ok', { vagues: vue });
