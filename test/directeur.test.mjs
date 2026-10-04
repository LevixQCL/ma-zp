// Le Directeur : rythme des zones, zones absentes épargnées, feuilletons, dilemmes, niveau des énigmes.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { sanitizeOrders } from '../js/engine/zone.js';
import { assurerDir, cielDe, dilemmeDuJour, feuilletonEnCours, FEUILLETONS, cibleEnigmes, adapterEnigmes, niveauEnigmes, fragilites, imprevusDuJour, directeurNuit } from '../js/engine/directeur.js';
import { questsFor } from '../js/quests/quests.js';
import { makeRng } from '../js/engine/rng.js';

const players = {}; for (const b of BOT_PROFILES) players[b.uid] = b;
const styles = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, b.style]));
const absent = BOT_PROFILES[0].uid;

// 1. Une saison : déterministe, ciels qui tournent, zone absente épargnée.
function saison(seed) {
  let st = resolveTurn(createGame({ seed }), { players }).state;
  const vus = new Set(); let coupsAbsent = 0, opsAbsent = 0, dilemmes = 0, feuilletons = 0;
  for (let t = 0; t < 13; t++) {
    const orders = {};
    for (const u of Object.keys(st.zones)) if (u !== absent) { const o = botOrders(st.zones[u], st, styles[u]); if (o) orders[u] = o; }
    for (const z of Object.values(st.zones)) { vus.add(cielDe(z).id); if (dilemmeDuJour(st, z)) dilemmes++; if (feuilletonEnCours(st, z)) feuilletons++; }
    const T = st.turn;
    const r = resolveTurn(st, { orders, players });
    st = r.state;
    const za = st.zones[absent];
    if (za.toursSansOrdres >= 3 && za.scene && za.scene.coup) coupsAbsent++;
    if (za.toursSansOrdres >= 2 && za.operation && za.operation.tourDebut === T + 1) opsAbsent++;
    if (r.gazette.finSaison) break;
  }
  return { st, vus, coupsAbsent, opsAbsent, dilemmes, feuilletons };
}
const a = saison('dir-1'), b = saison('dir-1');
assert.deepEqual(JSON.stringify(a.st.zones), JSON.stringify(b.st.zones), 'même graine, même saison');
let tous = new Set(), dil = 0, fe = 0;
for (let s = 0; s < 6; s++) { const r = saison(`dir-s${s}`); r.vus.forEach((v) => tous.add(v)); dil += r.dilemmes; fe += r.feuilletons;
  assert.equal(r.coupsAbsent, 0, 'pas de coup dur pour une zone absente'); assert.equal(r.opsAbsent, 0, 'pas d’opération pour une zone absente'); }
assert.deepEqual([...tous].sort(), ['calme', 'eclaircie', 'montee', 'orage'], 'les quatre ciels apparaissent');
assert.ok(dil > 0 && fe > dil, 'des feuilletons et des dilemmes');

// 2. Coup dur ciblé : une zone au moral bas reçoit plutôt la grippe, avec l'explication.
{
  const z = { uid: 'x', moral: 30, paperasse: 5, reputation: 55, niveaux: { intervention: 3 }, equip: { intervention: 3 }, infra: { logiciel: true }, toursSansOrdres: 0, equipe: [] };
  const fr = fragilites(z);
  assert.equal(fr.slice().sort((p, q) => q.w - p.w)[0].id, 'grippe');
  let grippes = 0, total = 0;
  for (let i = 0; i < 200; i++) {
    const zz = { ...z, dir: { ph: 'orage', j: 0, n: 1, orage: 'coup', h: [], neg: {} } };
    const imp = imprevusDuJour({}, zz, makeRng(`g${i}`));
    assert.ok(imp.coupDur, 'l’orage « coup » tombe');
    total++; if (imp.coupDur.id === 'grippe') { grippes++; assert.match(imp.pourquoi, /moral bas/); }
  }
  assert.ok(grippes / total > 0.5, `grippe surtout (${grippes}/${total})`);
  // Éclaircie : jamais de mauvaise nouvelle.
  for (let i = 0; i < 200; i++) {
    const imp = imprevusDuJour({}, { ...z, dir: { ph: 'eclaircie', j: 0, n: 1, h: [], neg: {} } }, makeRng(`e${i}`));
    assert.equal(imp.coupDur, null);
  }
}

// 3. Feuilleton : test réussi ou raté selon les ordres, choix d'un dilemme pris en compte.
{
  let st = resolveTurn(createGame({ seed: 'fe' }), { players: { a: { code: '1111', nom: 'A' }, b: { code: '2222', nom: 'B' } } }).state;
  const z = st.zones.a; assurerDir(z);
  z.dir.fe = { id: 'rodeos', e: 'debut', tour: st.turn, d: {} };
  const base = { intervention: 8, proximite: 4, recherche: 3, roulage: 0, admin: 3 };
  const rate = resolveTurn(st, { orders: { a: { alloc: base }, b: { alloc: base } } }).state;
  assert.equal(rate.zones.a.dir.fe.e, 'accident', 'raté : le feuilleton continue');
  const ok = resolveTurn(st, { orders: { a: { alloc: { ...base, intervention: 5, roulage: 3 } }, b: { alloc: base } } }).state;
  assert.equal(ok.zones.a.dir.fe, null, 'réussi : le feuilleton s’arrête');
  assert.ok(ok.zones.a.rapport.some((l) => l.startsWith('Rodéos urbains : motos saisies')));

  st.zones.a.dir.fe = { id: 'mecene', e: 'debut', tour: st.turn, d: {} };
  assert.ok(dilemmeDuJour(st, st.zones.a), 'dilemme visible');
  const b0 = resolveTurn(st, { orders: { a: { alloc: base, dilemme: 0 }, b: { alloc: base } } }).state.zones.a;
  const b1 = resolveTurn(st, { orders: { a: { alloc: base, dilemme: 1 }, b: { alloc: base } } }).state.zones.a;
  assert.ok(b0.rapport.some((l) => l.includes('« Accepter »')) && b1.rapport.some((l) => l.includes('« Refuser poliment »')));
  assert.ok(b0.budget > b1.budget, 'le sponsor rapporte');
  const sansRep = resolveTurn(st, { orders: { b: { alloc: base } } }).state.zones.a;
  assert.ok(sansRep.rapport.some((l) => l.includes('ton adjoint a choisi')), 'sans réponse : choix par défaut');
  assert.equal(sanitizeOrders(st.zones.a, { dilemme: 7 }, st).dilemme, null);
  assert.equal(sanitizeOrders(st.zones.a, { dilemme: 1 }, st).dilemme, 1);
}
// Chaque feuilleton a ses étapes complètes.
for (const [id, f] of Object.entries(FEUILLETONS)) {
  assert.ok(f.titre && f.etapes.debut, id);
  for (const et of Object.values(f.etapes)) { assert.equal(typeof et.signe, 'function'); assert.equal(typeof et.resoudre, 'function'); if (et.choix) assert.ok(typeof et.choix === 'function' || et.choix[et.defaut], `${id} : choix par défaut`); }
}

// 4. Niveau des énigmes : suit la forme, un cran par nuit, borné.
assert.equal(cibleEnigmes([[0, 3], [1, 3]], 0.5), -2, 'beaucoup d’échecs : plus facile');
assert.equal(cibleEnigmes([[2, 3], [1, 3]], 0.5), -1);
assert.equal(cibleEnigmes([[3, 3], [3, 3]], 0.5), 1, 'tout juste : un peu plus dur');
assert.equal(cibleEnigmes([[2, 3], [2, 3]], 0.5), 0);
assert.equal(cibleEnigmes([], 0.9), -1, 'dernier du classement aux énigmes : un peu plus facile');
assert.equal(cibleEnigmes([[2, 3], [2, 3]], 1), -1, 'le classement pèse un peu');
{
  const z = { uid: 'q' };
  assert.equal(adapterEnigmes(z, 0, 3), -1, 'un cran à la fois');
  assert.equal(adapterEnigmes(z, 0, 3), -2);
  assert.equal(adapterEnigmes(z, 0, 3), -2, 'borné à −2');
  for (let i = 0; i < 10; i++) adapterEnigmes(z, 3, 3);
  assert.equal(niveauEnigmes(z), 1, 'borné à +1');
  const qs0 = questsFor({ seed: 's', uid: 'u', season: 1, turn: 2, weekday: 3 });
  const qsF = questsFor({ seed: 's', uid: 'u', season: 1, turn: 2, weekday: 3, ajust: -2 });
  assert.deepEqual(qs0.map((q) => q.difficulte), [3, 4, 5]);
  assert.deepEqual(qsF.map((q) => q.difficulte), [1, 2, 3]);
  assert.deepEqual(questsFor({ seed: 's', uid: 'u', season: 1, turn: 2, weekday: 0, ajust: -2 }).map((q) => q.difficulte), [1, 1, 2]);
}
{
  // À la résolution : un joueur qui rate tout descend, sur plusieurs nuits.
  let st = resolveTurn(createGame({ seed: 'en' }), { players: { a: { code: '1111', nom: 'A' } } }).state;
  for (let i = 0; i < 3; i++) st = resolveTurn(st, { orders: { a: { alloc: { intervention: 8, proximite: 4, recherche: 3, roulage: 2, admin: 3 } } }, quests: { a: [{ statut: 'rate' }, { statut: 'rate' }, { statut: 'ok' }] } }).state;
  assert.equal(niveauEnigmes(st.zones.a), -2);
}

// 5. La nuit : une zone absente passe au ciel clair et perd son feuilleton.
{
  const st = createGame({ seed: 'n' });
  const z = { uid: 'z', toursSansOrdres: 4, dir: { ph: 'orage', j: 0, n: 1, h: [], neg: {}, fe: { id: 'rodeos', e: 'debut', tour: 2, d: {} } }, quartiers: {}, criminalite: 50, moral: 60, paperasse: 5, reputation: 50, budget: 20, dossiers: [], niveaux: {}, equip: {}, infra: {} };
  st.zones.z = z;
  directeurNuit(st, z, makeRng('n'), { T: 1, nextWeekday: 2 });
  assert.equal(z.dir.ph, 'calme'); assert.equal(z.dir.fe, null); assert.ok(!z.operation);
}
console.log('OK : Directeur (rythme, zones absentes, coups durs ciblés, feuilletons, dilemmes, niveau des énigmes).');

// Firestore refuse les tableaux dans un tableau : les historiques du Directeur sont rangés en objets.
{
  const { adapterIncidents } = await import('../js/engine/directeur.js');
  const { tableauxImbriques } = await import('../js/data/resolver.js');
  const z = { uid: 'x', dir: { enig: { h: [[1, 3]], niv: 0 } } }; // ancien format resté en mémoire
  adapterEnigmes(z, 2, 3, 0.5); adapterEnigmes(z, 3, 3, 0.5); adapterIncidents(z, 1, 1); adapterIncidents(z, 0, 1);
  assert.deepEqual(tableauxImbriques(JSON.parse(JSON.stringify(z))), [], 'pas de tableau imbriqué');
  assert.deepEqual(z.dir.enig.h[0], { ok: 1, t: 3 }, 'ancien format converti');
  console.log('OK : historiques du Directeur compatibles Firestore.');
}
