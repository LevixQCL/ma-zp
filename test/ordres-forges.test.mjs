// Ordres forgés (audit du 9 octobre 2026) : un ordre trafiqué à la main ne doit jamais faire échouer le tour de tout le district.
// - doctrine qui porte le nom d'une propriété d'objet (« constructor », « __proto__ »…) ;
// - achat à deux d'un gros lot « avec soi-même ».
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';

const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
{
  const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
  let s = createGame({ seed: 'rd', turnDeadline: Date.parse('2026-10-05T18:00:00Z') });
  for (let i = 0; i < 3; i++) { s = resolveTurn(s, { players, orders: { A: base, B: base } }).state; s.nextDeadline += 864e5; }
  s.finSaison = 'soir';
  s = resolveTurn(s, { players, orders: { A: base, B: base } }).state; s.nextDeadline += 864e5;
  assert.equal(s.season, 2);
  for (const d of ['constructor', 'toString', '__proto__', 42, null]) {
    const r = resolveTurn(s, { players, orders: { A: { ...base, doctrine: d }, B: base } });
    assert.ok(!r.state.zones.A.doctrine, `doctrine ${String(d)} refusée`);
  }
}
{
  const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
  const nuit = (s, o) => { const r = resolveTurn(s, { players, orders: o }); r.state.nextDeadline += 864e5; return r; };
  const O = (a = {}) => ({ A: { ...base, ...a }, B: { ...base }, C: { ...base } });
  let s = createGame({ seed: 'rv', regles: 2, turnDeadline: Date.parse('2026-10-05T18:00:00Z') });
  for (let i = 0; i < 8 && !(s.vente && s.vente.cloture === s.turn); i++) s = nuit(s, O()).state;
  const gros = s.vente.lots.find((l) => l.gros);
  s.zones.A.budget = 40;
  s.pactes = [{ id: 'px', a: 'A', b: 'B', type: 'achat', etape: 'actif', debut: (s.season - 1) * 100 + s.turn - 1, fin: (s.season - 1) * 100 + s.turn + 5 }];
  const r = nuit(s, O({ finales: { [gros.k]: { montant: gros.prixMin, partenaire: 'A' } } }));
  assert.ok(Number.isFinite(r.state.zones.A.budget));
  // Si A remporte le lot seul, il paie toute son offre (pas une demi-part).
  const paye = (r.state.zones.A.compta.lignes || []).filter((l) => l.k === 'enchere').reduce((t, l) => t - l.v, 0);
  assert.ok(paye === 0 || paye >= gros.prixMin - 0.05, `A paie son offre entière (${paye})`);
}
console.log('ordres-forges : OK');
