// Plan de filature « papier » : purement visuel. Le plan redessiné doit garder exactement les mêmes
// carrefours et lieux cliquables (mêmes cx/cy, même data-v), le point de départ et le tracé.
import assert from 'node:assert/strict';
globalThis.window ??= globalThis; globalThis.document ??= { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
globalThis.localStorage ??= { getItem() { return null; }, setItem() {} }; globalThis.sessionStorage ??= globalThis.localStorage;
const { generateQuest } = await import('../js/quests/quests.js');
const { habillerFilature } = await import('../js/ui/enigmes.js');

const pts = (s, cls) => [...s.matchAll(new RegExp(`class="${cls}"[^>]*?cx="([\\d.]+)" cy="([\\d.]+)"`, 'g'))].map((m) => `${m[1]},${m[2]}`).sort();
const lieux = (s) => [...s.matchAll(/class="fi-lieu" data-action="quest-pick" data-v="([^"]+)" cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => m.slice(1).join('|')).sort();
let n = 0;
for (const forme of ['classique', 'rebours']) for (let d = 1; d <= 6; d++) for (let k = 0; k < 15; k++) {
  const q = generateQuest('filature', `plan-${forme}-${d}-${k}`, d, forme);
  const avant = q.figures[0].svg, apres = habillerFilature(avant);
  assert.ok(apres.includes('fi-papier'), 'plan redessiné');
  assert.deepEqual(pts(apres, 'fi-x'), pts(avant, 'fi-x'), 'mêmes carrefours');
  assert.deepEqual(lieux(apres), lieux(avant), 'mêmes lieux');
  assert.equal(apres.match(/data-depart="([^"]+)"/)[1], avant.match(/data-depart="([^"]+)"/)[1]);
  assert.ok(apres.includes('<polyline class="fi-trace" points=""'));
  for (const l of q.choix) assert.equal(apres.split(`data-v="${l.id}"`).length, 2, `un seul data-v pour ${l.id}`);
  assert.equal(habillerFilature(apres), apres, 'idempotent');
  n++;
}
console.log(`OK : plan de filature papier (${n} plans, mêmes zones cliquables).`);

// Le tracé ne coupe jamais à travers les pâtés : chaque segment est horizontal ou vertical.
{
  const { figureInteractive } = await import('../js/ui/enigmes.js');
  const { S } = await import('../js/ui/common.js');
  const q = { ...generateQuest('filature', 'trace-rues', 3), id: 'tr' };
  const [dx, dy] = q.figures[0].svg.match(/data-depart="([\d.]+),([\d.]+)"/).slice(1).map(Number);
  S.trace = { tr: [`${dx + 92},${dy + 46}`, `${dx + 46},${dy}`, `${dx + 46},${dy + 46}`] };
  const pts = figureInteractive(q, q.figures[0].svg, null).match(/class="fi-trace" points="([^"]*)"/)[1].split(' ').map((p) => p.split(',').map(Number));
  for (let k = 1; k < pts.length; k++) assert.ok(pts[k][0] === pts[k - 1][0] || pts[k][1] === pts[k - 1][1], `segment en diagonale : ${pts[k - 1]} → ${pts[k]}`);
  console.log('OK : le tracé de filature suit les rues.');
}

// Étape en cours (surlignée sous le plan et dans le compte rendu) : un tronçon = une ligne droite.
{
  const { etapeFilature, classeEtape } = await import('../js/ui/enigmes.js');
  const { S } = await import('../js/ui/common.js');
  const svg = '<svg data-depart="26,26"></svg>';
  const q = { id: 'et', type: 'filature', figures: [{ svg }], indices: ['a', 'b', 'c', 'd'] };
  const vu = (tr, forme) => { S.trace = { et: tr }; return etapeFilature({ ...q, forme }); };
  assert.equal(vu([]).phrase, 0, 'rien tracé : 1re phrase');
  assert.equal(vu(['72,26']).phrase, 0);
  assert.equal(vu(['72,26', '118,26']).phrase, 0, 'deux carrefours tout droit : toujours la 1re');
  assert.equal(vu(['72,26', '118,26', '118,72']).phrase, 1, 'virage : 2e phrase');
  assert.equal(vu(['72,26', '118,72']).phrase, 1, 'tap en diagonale : passe par le coin (est puis sud = 2 tronçons)');
  assert.equal(vu(['72,26', '26,26']).phrase, 1, 'demi-tour : nouvelle phrase');
  assert.equal(vu(['72,26', '72,72', '118,72', '118,118', '164,118']).phrase, -1, 'plus de tronçons que de phrases');
  assert.equal(vu([], 'rebours').phrase, 3, 'à rebours : on part de la dernière phrase');
  assert.equal(vu(['72,26', '72,72'], 'rebours').phrase, 2);
  S.trace = { et: ['72,26', '72,72'] };
  assert.deepEqual([0, 1, 2, 3].map((i) => classeEtape(q, i)), ['fait', 'encours', '', '']);
  console.log('OK : étape en cours de la filature.');
}
