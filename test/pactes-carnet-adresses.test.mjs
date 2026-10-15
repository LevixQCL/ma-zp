// Retour de Luc (15 oct. 2026) : talent « Carnet d'adresses » équipé (un pacte de plus), mais l'écran des pactes
// restait bloqué à 2 (« 2 sur 2 », bouton Proposer grisé). Le moteur, lui, acceptait déjà un 3e pacte.
// On vérifie la règle commune moteur / écran : 2 pactes, 3 avec le talent, y compris s'il vient d'être équipé
// dans les ordres du jour (les talents sont appliqués ce soir avant les pactes).
import assert from 'node:assert/strict';
const { maxPactes, pacteImpossible, PACTE } = await import('../js/engine/pactes.js');

const chef = (talents) => ({ talents, xp: {} });
const zone = (uid, talents) => ({ uid, code: '0000', nom: uid, chef: chef(talents), toursSansOrdres: 0 });
const etat = (talentsMoi) => {
  const zones = { moi: zone('moi', talentsMoi), a: zone('a', []), b: zone('b', []), c: zone('c', []) };
  const pactes = [
    { id: 'p1', a: 'moi', b: 'a', type: 'terrain', etape: 'actif', debut: 1, fin: 99 },
    { id: 'p2', a: 'moi', b: 'b', type: 'achat', etape: 'actif', debut: 1, fin: 99 },
  ];
  return { season: 2, turn: 5, zones, pactes };
};

assert.equal(PACTE.max, 2);
assert.equal(maxPactes(zone('x', [])), 2, 'sans talent : 2');
assert.equal(maxPactes(zone('x', ['adresses'])), 3, 'talent équipé : 3');
assert.equal(maxPactes(zone('x', []), ['adresses']), 3, 'talent choisi dans les ordres du jour : 3');
assert.equal(maxPactes(zone('x', ['adresses']), []), 2, 'talent retiré dans les ordres du jour : 2');
assert.equal(maxPactes({ ...zone('x', ['adresses']), chef: { talents: ['adresses'], hs: true } }), 2, 'chef à l’hôpital : talents coupés');

// Le cas de Luc : 2 pactes en cours, talent équipé → un 3e est possible.
const st = etat(['gestionnaire', 'carnet', 'adresses']);
const nb = st.pactes.filter((p) => p.a === 'moi' || p.b === 'moi').length;
assert.equal(nb, 2);
assert.equal(pacteImpossible(st, 'moi', 'c'), null, '3e pacte possible avec le talent');
assert.match(String(pacteImpossible(etat([]), 'moi', 'c')), /déjà 2 pactes/, 'sans talent : refusé');

// L'écran utilise bien la même règle (plus aucun « PACTE.max » codé en dur dans l'écran des pactes).
const ecran = (await import('node:fs')).readFileSync(new URL('../js/ui/pactes.js', import.meta.url), 'utf8');
assert.ok(!/PACTE\.max/.test(ecran), 'l’écran des pactes ne doit plus plafonner à PACTE.max');
assert.ok(/maxPactes\(/.test(ecran), 'l’écran des pactes utilise maxPactes');
console.log('OK : Carnet d’adresses, 3 pactes possibles (moteur et écran).');
