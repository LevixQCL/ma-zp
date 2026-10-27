// Ordres forgés (audit du 9 octobre 2026) : un ordre trafiqué à la main ne doit jamais faire échouer le tour de tout le district.
// - spécialité (ex-doctrine) qui porte le nom d'une propriété d'objet (« constructor », « __proto__ »…) ;
// - saison 4 : actions d'enquête en direct trafiquées (types inconnus, clés piège, heures absurdes, pièces qui ne sont pas des listes).
// (L'achat à deux d'un gros lot « avec soi-même » a disparu avec la salle des ventes.)
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
  for (const d of ['constructor', 'toString', '__proto__', 42, null, { id: 'routiere' }, ['routiere']]) {
    const r = resolveTurn(s, { players, orders: { A: { ...base, specialite: d, doctrine: d }, B: base } });
    assert.ok(!r.state.zones.A.specialite, `spécialité ${JSON.stringify(d)} refusée`);
    assert.ok(!r.state.zones.A.doctrine, 'plus de doctrine');
    assert.ok(Number.isFinite(r.state.zones.A.budget));
  }
  // Une spécialité valide passe.
  assert.equal(resolveTurn(s, { players, orders: { A: { ...base, specialite: 'routiere' }, B: base } }).state.zones.A.specialite.id, 'routiere');
}
{
  const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
  let s = createGame({ seed: 'rv', turnDeadline: Date.parse('2026-09-20T18:00:00Z') });
  for (let i = 0; i < 2; i++) { s = resolveTurn(s, { players, orders: { A: base, B: base, C: base } }).state; s.nextDeadline += 864e5; }
  const fin = s.nextDeadline, H = 3600000;
  const forges = [
    null, 'tout', 42, [null, 7, 'x'],
    [{ k: 'constructor', at: fin - H }, { k: '__proto__', at: fin - H }, { k: 'dem', x: 'constructor', at: fin - H }, { k: 'dem', x: '__proto__', at: fin - H }],
    [{ k: 'dem', x: 'alibi:999', at: fin - H }, { k: 'dem', x: 'moyens:-1', at: fin - H }, { k: 'dem', x: { k: 'cam' }, at: fin - H }, { k: 'dem', x: 'cam', at: NaN }, { k: 'dem', x: 'cam', at: 'midi' }],
    [{ k: 'confront', i: 999, at: fin - 2 * H }, { k: 'confront', i: '0', i2: 'constructor', pieces: 'tout', mobile: {}, at: fin - 2 * H }, { k: 'confront', i: 0, pieces: [{}, null, 'constructor'], at: fin + 9 * H }],
    [{ k: 'reaud', i: 'x', f: '__proto__', at: fin - H }, { k: 'recoup', a: 'constructor', b: 'constructor', at: fin - H }],
    Array.from({ length: 500 }, (_, k) => ({ k: 'dem', x: 'cam', at: fin - 10 * H + k })),
  ];
  for (const l of forges) {
    let r;
    assert.doesNotThrow(() => { r = resolveTurn(s, { players, orders: { A: base, B: base, C: base }, enqueteActions: { A: l, B: { constructor: 1 }, constructor: l, __proto__: l } }); }, `actions ${JSON.stringify(l).slice(0, 80)}`);
    for (const u of ['A', 'B', 'C']) {
      const z = r.state.zones[u];
      assert.ok(Number.isFinite(z.budget) && Number.isFinite(z.reputation), `${u} : budget et réputation finis`);
      assert.ok(!z.enquete || (z.enquete.pieces || []).every((p) => typeof p.f === 'string'), `${u} : dossier propre`);
    }
    // Rien de lancé après 20:00 : la confrontation hors délai ne compte pas.
    assert.ok(!(r.state.zones.A.enquete && r.state.zones.A.enquete.exclu), 'pas d’affaire retirée par une action forgée');
  }
}
console.log('ordres-forges : OK');
