// Quartiers : tension par quartier, points chauds, patrouilles et déplacement de la délinquance.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { carteQuartiers, quartiersFrontaliers, lirePatrouilles } from '../js/engine/quartiers.js';

const players = { a: { code: '1111', nom: 'A', couleur: '#f00' }, b: { code: '2222', nom: 'B', couleur: '#0f0' } };
let st = resolveTurn(createGame({ seed: 'q' }), { players }).state;
const alloc = { intervention: 7, proximite: 6, recherche: 3, roulage: 2, admin: 2 };

// La criminalité de la zone est la moyenne de ses quartiers.
for (let i = 0; i < 6; i++) {
  const pc = st.zones.a.pointChaud;
  st = resolveTurn(st, { orders: { a: { alloc, patrouilles: pc ? { [pc.cell]: 2 } : {} }, b: { alloc } }, players }).state;
  const z = st.zones.a, v = Object.values(z.quartiers);
  assert.equal(v.length, 6, '6 quartiers par zone');
  assert.ok(Math.abs(v.reduce((s, x) => s + x, 0) / v.length - z.criminalite) < 0.2, 'criminalité = moyenne des quartiers');
  if (pc) assert.ok(z.rapport.some((l) => l.startsWith('Point chaud désamorcé')), 'point chaud désamorcé avec 2 agents');
}

// Déplacement : 6 agents sur un quartier frontalier poussent la tension chez le voisin.
const c = carteQuartiers(st);
const front = quartiersFrontaliers(st, 'a');
assert.ok(front.length > 0, 'les deux zones se touchent');
const chezB = front.find((i) => c.proprio(i) === 'b');
const monQ = c.deZone.a.find((i) => c.adj[i].includes(chezB));
const avant = st.zones.b.quartiers[chezB];
const r = resolveTurn(st, { orders: { a: { alloc, patrouilles: { [monQ]: 6 } }, b: { alloc } }, players }).state;
assert.ok(r.zones.b.rapport.some((l) => l.includes('déborde chez toi')), 'le voisin est prévenu');
assert.ok(r.zones.a.rapport.some((l) => l.includes('se déplace')), 'la zone qui concentre est prévenue');
assert.ok(Number.isFinite(avant));

// Patrouilles trop nombreuses : le point chaud est retiré en dernier.
const z = { ...st.zones.a, pointChaud: { cell: String(c.deZone.a[0]) } };
const p = lirePatrouilles(st, z, { [c.deZone.a[0]]: 2, [c.deZone.a[1]]: 3, 999: 4 }, 2);
assert.deepEqual(p, { [c.deZone.a[0]]: 2 }, 'point chaud protégé, quartier étranger ignoré');
console.log('OK : quartiers, points chauds, patrouilles et déplacement.');
