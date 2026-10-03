// Le Directeur, suite : coopération (fugitif, duo, appel du district), mémoire des dilemmes, ennemi de la saison,
// coup de pouce à l'enquête, routine, retour d'absence, mini-jeux à la mesure du joueur, réglages du maître du jeu.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../js/engine/bots.js';
import { carteQuartiers } from '../js/engine/quartiers.js';
import { assurerDir, memoirePlainte, adapterIncidents, niveauIncidents, enqueteDirecteur, reglages, apercuDirecteur, parZoneFantome } from '../js/engine/directeur.js';
import { difficulte } from '../js/engine/incidents.js';
import { dossierDe } from '../js/engine/enquete.js';
import { makeRng } from '../js/engine/rng.js';

const alloc = { intervention: 8, proximite: 5, recherche: 3, roulage: 2, admin: 3 };
const deux = { a: { code: '1111', nom: 'A' }, b: { code: '2222', nom: 'B' }, c: { code: '3333', nom: 'C' } };
const base = () => resolveTurn(createGame({ seed: 'd2' }), { players: deux }).state;

// 1. Fugitif à la frontière : il faut les deux côtés le même soir.
{
  const st = base();
  const c = carteQuartiers(st);
  let p = null;
  for (const ca of c.deZone.a) for (const nb of c.adj[ca]) if (!p && c.proprio(nb) === 'b') p = { ca: String(ca), cb: String(nb) };
  assert.ok(p, 'A et B sont voisines');
  st.dir = { ...(st.dir || {}), coop: [{ id: 'fugitif', a: 'a', b: 'b', ...p, tour: st.turn, e: 'debut' }] };
  const ord = (pa, pb) => ({ a: { alloc, patrouilles: pa }, b: { alloc, patrouilles: pb }, c: { alloc } });
  const ok = resolveTurn(st, { orders: ord({ [p.ca]: 2 }, { [p.cb]: 2 }), players: deux });
  assert.ok(ok.state.zones.a.rapport.some((l) => l.startsWith('Fugitif à la frontière : coincé')) && ok.state.zones.b.rapport.some((l) => l.startsWith('Fugitif à la frontière : coincé')));
  assert.ok(ok.gazette.breves.concat([ok.gazette.une]).some((n) => n.kicker === 'Coopération'));
  const seul = resolveTurn(st, { orders: ord({ [p.ca]: 2 }, {}), players: deux }).state;
  assert.ok(seul.zones.a.rapport.some((l) => l.includes('Tes patrouilles étaient là')), 'A était là, pas B');
  assert.equal(seul.dir.coop[0].e, 'cavale', 'dernière chance le lendemain');
}

// 2. Défi en duo : bonus commun si les deux réussissent.
{
  const st = base();
  for (const [u, autre] of [['a', 'b'], ['b', 'a']]) { const d = assurerDir(st.zones[u]); d.fe = { id: 'rodeos', e: 'debut', tour: st.turn, d: {}, duo: autre }; }
  st.dir = { ...(st.dir || {}), duo: { a: 'a', b: 'b', id: 'rodeos', tour: st.turn } };
  const r = { ...alloc, intervention: 5, roulage: 5 };
  const ok = resolveTurn(st, { orders: { a: { alloc: r }, b: { alloc: r }, c: { alloc } }, players: deux }).state;
  assert.ok(ok.zones.a.rapport.some((l) => l.startsWith('Défi en duo relevé')));
  const ko = resolveTurn(st, { orders: { a: { alloc: r }, b: { alloc }, c: { alloc } }, players: deux }).state;
  assert.ok(ko.zones.a.rapport.some((l) => l.includes('pas de bonus commun')));
}

// 3. Appel du district : renfort payé ×1,5.
{
  const st = base();
  st.zones.b.operation = { id: 'rixe', titre: 'Rixe', besoins: { intervention: 5 }, duree: 1, recompense: 8, tourDebut: st.turn, couvertures: [], appel: true };
  const r = resolveTurn(st, { orders: { a: { alloc, renfort: { cible: 'b', agents: 3 } }, b: { alloc }, c: { alloc } }, players: deux }).state;
  assert.ok(r.zones.a.rapport.some((l) => l.includes('appel du district : renfort payé ×1,5')));
}

// 4. Mémoire : la journaliste amie tempère une plainte, l'hostile l'aggrave ; l'indic payé revient.
{
  assert.equal(memoirePlainte({ dir: { mem: { journaliste: 'amie' } } }).sat, 3);
  assert.equal(memoirePlainte({ dir: { mem: { journaliste: 'hostile' } } }).sat, -2);
  assert.equal(memoirePlainte({}).sat, 0);
  const st = base();
  const d = assurerDir(st.zones.a); d.fe = { id: 'journaliste', e: 'debut', tour: st.turn, d: {} };
  st.zones.a.satisfaction = 90;
  const r = resolveTurn(st, { orders: { a: { alloc, dilemme: 0 }, b: { alloc }, c: { alloc } }, players: deux }).state;
  assert.equal(r.zones.a.dir.mem.journaliste, 'amie', 'le Directeur se souvient');
}

// 5. Retour d'absence : accueil, puis éclaircie ; routine remarquée.
{
  let st = base();
  for (let i = 0; i < 3; i++) st = resolveTurn(st, { orders: { b: { alloc }, c: { alloc } }, players: deux }).state;
  assert.ok(st.zones.a.toursSansOrdres >= 2);
  st = resolveTurn(st, { orders: { a: { alloc }, b: { alloc }, c: { alloc } }, players: deux }).state;
  assert.ok(st.zones.a.rapport.some((l) => l.startsWith('Bon retour aux commandes')));
  assert.equal(st.zones.a.dir.ph, 'eclaircie');
  let vu = false;
  for (let i = 0; i < 6; i++) { st = resolveTurn(st, { orders: { a: { alloc }, b: { alloc }, c: { alloc } }, players: deux }).state; vu ||= st.zones.a.rapport.some((l) => l.startsWith('Ta répartition n’a pas bougé')); }
  assert.ok(vu, 'routine remarquée');
}

// 6. Mini-jeux à la mesure du joueur.
{
  const z = { uid: 'm' };
  adapterIncidents(z, 0, 1); adapterIncidents(z, 0, 1);
  assert.equal(niveauIncidents(z), -1, 'ratés : plus facile');
  assert.equal(difficulte('intervention', 7, -1), 'facile');
  assert.equal(difficulte('intervention', 7, 0), 'normal');
  assert.equal(difficulte('intervention', 1, -1), 'normal');
  for (let i = 0; i < 8; i++) adapterIncidents(z, 1, 1);
  assert.equal(niveauIncidents(z), 1, 'enchaîne : plus difficile');
  assert.equal(difficulte('intervention', 7, 1), 'difficile');
}

// 7. Enquête : un témoin tardif pour les zones qui piétinent, rien pour celles qui avancent.
{
  const st = base();
  st.enquete.jour = 5;
  for (const z of Object.values(st.zones)) z.enquete = dossierDe(st, z);
  const avant = Object.fromEntries(Object.values(st.zones).map((z) => [z.uid, z.enquete.pieces.length]));
  for (const z of Object.values(st.zones)) z.rapport = [];
  const news = [];
  const r = enqueteDirecteur(st, (...a) => news.push(a), makeRng('e'));
  assert.ok(r && r.aides.length >= 1, 'les zones qui piétinent sont aidées');
  for (const z of Object.values(st.zones)) {
    if (!r.aides.includes(z.uid)) { assert.equal(z.enquete.pieces.length, avant[z.uid], 'rien pour celles qui avancent'); continue; }
    assert.equal(z.enquete.pieces.length, avant[z.uid] + 1); assert.equal(z.enquete.pieces.at(-1).src, 'temoin'); assert.ok(!z.enquete.pieces.at(-1).f.startsWith('p:'));
  }
  assert.equal(enqueteDirecteur(st, () => {}, makeRng('e')), null, 'une fois par étape');
}

// 8. L'ennemi de la saison : apparitions, dossier, opération finale le dernier soir.
{
  const players = {}; for (const b of BOT_PROFILES) players[b.uid] = b;
  const styles = Object.fromEntries(BOT_PROFILES.map((b) => [b.uid, b.style]));
  let st = resolveTurn(createGame({ seed: 'fantome' }), { players }).state;
  let apparitions = 0, fin = null;
  for (let t = 0; t < 14; t++) {
    const orders = {};
    for (const u of Object.keys(st.zones)) { const o = botOrders(st.zones[u], st, styles[u]); if (o) orders[u] = o; }
    apparitions += Object.values(st.zones).filter((z) => z.dir && z.dir.fe && z.dir.fe.id === 'fantome' && z.dir.fe.tour === st.turn).length;
    if (st.evenement) assert.ok(st.evenement.fantome && st.evenement.tour === 14);
    const r = resolveTurn(st, { orders, players });
    if (r.gazette.finSaison) { fin = r; break; }
    st = r.state;
  }
  assert.ok(apparitions >= 3, `le Fantôme apparaît (${apparitions})`);
  assert.ok(fin, 'fin de saison');
  assert.ok([fin.gazette.une, ...fin.gazette.breves].some((n) => /Opération Filet/.test(n.kicker)), 'la grande opération a lieu');
  assert.ok(parZoneFantome({ dossier: 0 }) === 3 && parZoneFantome({ dossier: 3 }) < 2 && parZoneFantome({ dossier: 9 }) === 1.5);
  assert.ok(fin.state.zones[BOT_PROFILES[0].uid].dir && fin.state.zones[BOT_PROFILES[0].uid].dir.enig !== undefined, 'le niveau des énigmes passe à la saison suivante');
}

// 9. Réglages du maître du jeu.
{
  assert.deepEqual(reglages({}), { intensite: 'normal', feuilletons: 'normal' });
  assert.deepEqual(reglages({ dir: { reglages: { intensite: 'corse', feuilletons: 'nimporte' } } }), { intensite: 'corse', feuilletons: 'normal' });
  const ap = apercuDirecteur(base());
  assert.equal(ap.zones.length, 3);
}
console.log('OK : Directeur, suite (fugitif, duo, appel, mémoire, retour, routine, mini-jeux, enquête, Fantôme, réglages).');
