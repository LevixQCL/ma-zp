// Récompenses du podium en fin de saison : PS selon le rang, skin exclusif et imprévu offert à la Zone de l'année,
// titre « Révélation de la saison ». node test/podium-saison.test.mjs
import assert from 'node:assert/strict';
import { createGame, resolveTurn, revelation } from '../js/engine/resolve.js';
import { botOrders } from '../js/engine/bots.js';
import { newZone } from '../js/engine/zone.js';
import { SEASON_LENGTH, PS, SERVICES } from '../js/engine/constants.js';
import { TOUS_SKINS, skinsEnVente, skinsValides } from '../js/engine/decor.js';
import { maxRemises } from '../js/engine/bilan.js';
import { makeRng } from '../js/engine/rng.js';

// Le skin exclusif ne se gagne ni à la jauge ni à la boutique.
assert.ok(!TOUS_SKINS.some((s) => s.id === 'honneur'), 'pas dans la jauge');
assert.ok(!skinsEnVente(Date.parse('2026-12-01T00:00:00Z')).some((s) => s.id === 'honneur'), 'pas en boutique');

let st = createGame({ seed: 'podium-test' });
for (let i = 0; i < 8; i++) st.zones[`z${i}`] = newZone({ uid: `z${i}`, code: String(5300 + i), nom: `Z${i}` }, 1, { arrivee: i });
let avant = null, ps = null;
for (let t = 1; t <= SEASON_LENGTH; t++) {
  const orders = {};
  for (const [uid, z] of Object.entries(st.zones)) {
    const rng = makeRng(`podium:${uid}:${t}`);
    if (uid !== 'z7' && !rng.chance(0.9)) continue;
    // Les petites zones ne jouent bien qu'en seconde moitié (pour qu'une remontée existe).
    const o = botOrders(z, st, t <= 7 && Number(uid.slice(1)) >= 5 ? 'distrait' : 'agressif');
    if (!o) continue;
    if (z.budget > 30 && rng.chance(0.6)) o.decision = { type: 'former', service: rng.pick(SERVICES) };
    orders[uid] = o;
  }
  if (t === SEASON_LENGTH) { avant = JSON.parse(JSON.stringify(st.zones)); ps = Object.fromEntries(Object.entries(st.zones).map(([u, z]) => [u, z.ps])); }
  st = resolveTurn(st, { orders, quests: {}, nextWeekday: (t + 1) % 7 }).state;
}
assert.equal(st.season, 2);
const pal = st.palmares[st.palmares.length - 1], cl = pal.classement.filter((c) => c.classe);
const champ = cl[0].uid, z1 = st.zones[champ];

// PS (le 14e soir rapporte aussi ses PS ordinaires : on vérifie au moins le bonus de rang).
const gain = (u) => st.zones[u].ps - ps[u];
assert.ok(gain(champ) >= PS.podium[0], `1er : +${gain(champ)}`);
assert.ok(gain(cl[1].uid) >= PS.podium[1] && gain(cl[1].uid) < PS.podium[0] + 60, `2e : +${gain(cl[1].uid)}`);
assert.ok(gain(cl[2].uid) >= PS.podium[2], '3e');

// Skin exclusif possédé et équipé.
assert.ok(z1.skins.includes('batiment:honneur'));
assert.equal(skinsValides(z1, z1.skinsChoix).batiment, 'honneur');
assert.ok(!(st.zones[cl[1].uid].skins || []).includes('batiment:honneur'));

// Imprévu offert : le plus coûteux, non appliqué, ne compte pas dans les remises.
const b = z1.bilan, offerts = b.cas.filter((c) => c.etat === 'offert');
if (b.cas.length) {
  assert.equal(offerts.length, 1);
  const o = offerts[0];
  assert.ok(b.cas.every((c) => c.prix <= o.prix), 'le plus coûteux');
  const niv = o.k === 'batiments' ? z1.batiments[o.s] : z1[o.k][o.s], av = o.k === 'batiments' ? avant[champ].batiments[o.s] : avant[champ][o.k][o.s];
  const autres = b.cas.filter((c) => c !== o && c.k === o.k && c.s === o.s).length;
  assert.equal(niv, av - autres, 'le niveau offert est conservé');
  const n = b.cas.length - 1;
  assert.equal(maxRemises(b), n ? Math.max(1, Math.floor(n * 0.5)) : 0);
  assert.ok(z1.rapport.some((l) => l.startsWith('Zone de l’année')));
}
assert.ok(z1.rapport.some((l) => l.startsWith('Récompenses de fin de saison') && l.includes('Palais')));
for (const [u, z] of Object.entries(st.zones)) if (u !== champ) assert.ok(!z.bilan.cas.some((c) => c.etat === 'offert'));

// Révélation : au plus une, jamais le champion, +2 places au moins.
const rev = pal.titres.filter((t) => t.titre === 'Révélation de la saison');
assert.ok(rev.length <= 1);
if (rev.length) { assert.notEqual(rev[0].uid, champ); assert.ok(st.zones[rev[0].uid].rapport.some((l) => l.includes('Révélation'))); }
console.log(`OK podium-saison (champion ${champ}, ${b.cas.length} imprévus dont 1 offert, révélation : ${rev.length ? rev[0].uid : 'aucune'})`);

// Révélation, cas construits : C remonte de 4 places, D de 2 ; A (1er) n'est jamais retenu.
const h = (mi, fin) => [...[1, 2, 3, 4, 5, 6, 7].map((t) => ({ t, v: mi, joue: true })), ...[8, 9, 10, 11, 12, 13, 14].map((t) => ({ t, v: fin, joue: true }))];
const Z = { A: { uid: 'A', ipzHist: h(10, 90) }, B: { uid: 'B', ipzHist: h(80, 60) }, C: { uid: 'C', ipzHist: h(20, 70) }, D: { uid: 'D', ipzHist: h(70, 50) }, E: { uid: 'E', ipzHist: h(60, 10) }, F: { uid: 'F', ipzHist: h(50, 5) } };
// mi-saison : B D E F C A ; final : A C B D E F
assert.deepEqual(revelation(['A', 'C', 'B', 'D', 'E', 'F'], Z), { uid: 'C', i: 1, gain: 3 });
assert.equal(revelation(['A', 'B', 'D', 'E', 'F', 'C'], Z), null, 'personne ne remonte de 2 places');
console.log('OK révélation (cas construits)');
