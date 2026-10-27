// Enquête : régressions trouvées à l'audit du 20 oct. 2026. Chaque cas échouait sur la v172.
//  E-01  le plafond de pièces partagées reçues par soir se contournait en « répondant » par une pièce que l'autre avait déjà.
//  E-02  le témoin tardif prenait l'accusation du suspect n°0 pour « pas d'accusation » (et oubliait les zones exclues).
//  E-03  dans une affaire écrite, le témoin tardif pouvait livrer une pièce qui exige un mandat, une réaudition ou un recoupement.
//  E-04  une audition au-delà du plafond de démarches prenait quand même 2 agents de Recherche (saison 4 : plafond de démarches lancées par jour).
//  E-12  le malus du parquet laissait une réputation négative en fin de tour.
// Aucune sortie de contenu d'affaire (pas de spoiler) : seulement des comptes.
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import * as ENQ from '../js/engine/enquete.js';
import { makeRng } from '../js/engine/rng.js';
import { rejouer, DIRECT } from '../js/engine/enquete-direct.js';
import { confrontation, demarches } from './aides-enquete.mjs';

const PLAYERS = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
const BASE = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
const ECHEANCE = Date.parse('2026-10-20T18:00:00Z'), JOUR = 86400000;
const clone = (s) => JSON.parse(JSON.stringify(s));
/** Partie à 3 zones sur un vol généré (les affaires écrites sont repoussées au numéro 999). */
function partie(seed) {
  let st = createGame({ seed });
  for (const k of ['meurtreDes', 'meurtre2Des', 'corbeauDes', 'medaillonDes']) st[k] = 999;
  st.nextDeadline = ECHEANCE;
  st = resolveTurn(st, { players: PLAYERS }).state;
  st.nextDeadline = ECHEANCE + JOUR;
  return st;
}
function tour(st, orders = {}, enqueteActions = null) {
  const o = Object.fromEntries(Object.keys(PLAYERS).map((u) => [u, orders[u] === undefined ? BASE : orders[u]]));
  const r = resolveTurn(st, { players: PLAYERS, orders: o, enqueteActions });
  r.state.nextDeadline = (st.nextDeadline || ECHEANCE) + JOUR;
  return r;
}
const pieces = (st, u) => (st.zones[u].enquete && st.zones[u].enquete.pieces) || [];

// E-01 : échange « donnant-donnant » à sens unique.
{
  let st = tour(partie('audit-e01')).state;
  const a = ENQ.affaire(st, st.enquete.n), j = st.enquete.jour;
  const [p1, p2, p3, X] = a.faits.filter((f) => f.startsWith('occ:') || f.startsWith('mob:'));
  st.zones.A.enquete.pieces.push(...[p1, p2, p3, X].map((f) => ({ f, j, src: 'alibi' })));
  st.zones.B.enquete.pieces.push({ f: X, j, src: 'alibi' });
  const envoisA = [p1, p2, p3].map((f) => ({ f, a: 'B' }));
  const c = tour(st, { A: { ...BASE, partages: envoisA }, B: { ...BASE, partages: [{ f: X, a: 'A' }] } });
  const recus = pieces(c.state, 'B').filter((p) => p.src === 'partage').length;
  assert.equal(recus, ENQ.ENQ.maxRecus, `B reçoit ${recus} pièces alors que A n'a rien reçu de nouveau`);
  // Un vrai échange (B envoie une pièce que A n'a pas) passe toujours hors plafond.
  const st2 = clone(st), Y = a.faits.find((f) => (f.startsWith('occ:') || f.startsWith('mob:')) && ![p1, p2, p3, X].includes(f));
  st2.zones.B.enquete.pieces.push({ f: Y, j, src: 'alibi' });
  const e = tour(st2, { A: { ...BASE, partages: envoisA }, B: { ...BASE, partages: [{ f: Y, a: 'A' }] } });
  assert.ok(pieces(e.state, 'A').some((p) => p.f === Y && p.src === 'partage'), 'A reçoit la pièce de l’échange');
  assert.ok(pieces(e.state, 'B').filter((p) => p.src === 'partage').length >= 1, 'B reçoit au moins une pièce de l’échange');
}

// E-02 : une zone exclue après avoir accusé à tort le suspect n°0 ne reçoit pas de témoin tardif (affaire écrite déjà jouée : rue de la Clef).
{
  let st = createGame({ seed: 'audit-e02' });
  Object.assign(st, { meurtreDes: 1, meurtre2Des: 999, corbeauDes: 999, medaillonDes: 999, variantes: { 1: 'a' } });
  st.nextDeadline = ECHEANCE; st = resolveTurn(st, { players: PLAYERS }).state; st.nextDeadline = ECHEANCE + JOUR;
  const a = ENQ.affaire(st, st.enquete.n);
  if (a.coupable !== 0) {
    const SANS = { alloc: { intervention: 9, proximite: 6, recherche: 0, roulage: 2, admin: 3 }, rythme: 'normal' };
    st = tour(st, { A: SANS, B: SANS, C: SANS }, { A: [confrontation(st, 0, { pieces: [] })] }).state;
    assert.equal(st.zones.A.enquete.exclu, true, 'A confronte le suspect n°0, innocent : affaire retirée');
    while (st.enquete.jour < 5) st = tour(st, { A: SANS, B: SANS, C: SANS }).state;
    assert.equal(pieces(st, 'A').filter((p) => p.src === 'tardif').length, 0, 'témoin tardif versé à une zone qui a accusé le suspect n°0');
  }
}

// E-03 : affaires écrites, les quatre (deux versions) : le témoin tardif ne tire que des pièces libres.
{
  const st = createGame({ seed: 'audit-e03', turnDeadline: ECHEANCE });
  Object.assign(st, { meurtreDes: 1, meurtre2Des: 2, corbeauDes: 3, medaillonDes: 4 });
  let ecrites = 0, horsLibres = 0;
  for (const v of ['a', 'b']) for (let n = 1; n <= 4; n++) {
    st.variantes = { [n]: v };
    const aff = ENQ.affaire(st, n);
    if (!aff || !Array.isArray(aff.libres)) continue;
    ecrites++;
    for (let k = 0; k < 200; k++) {
      const rng = makeRng(`e03:${v}:${n}:${k}`);
      const dossier = rng.shuffle(aff.libres.slice()).slice(0, rng.int(0, 6)).map((f) => ({ f, j: 1 }));
      const f = ENQ.pieceCoupDePouce(st, { enquete: { n, pieces: dossier } }, aff, makeRng(`e03b:${v}:${n}:${k}`));
      if (f && !aff.libres.includes(f)) horsLibres++;
    }
  }
  assert.equal(ecrites, 8, 'les 4 affaires écrites, en deux versions');
  assert.equal(horsLibres, 0, `${horsLibres} pièces tirées hors des pièces libres`);
}

// E-04 : audition au-delà du plafond de démarches du jour : refusée, aucun agent prélevé.
{
  const st = tour(partie('audit-e04')).state;
  const dem = ['cam', 'labo', 'alibi:0', 'alibi:1', 'alibi:2', 'alibi:3', 'alibi:4'].slice(0, DIRECT.parTour);
  const passe = (liste) => {
    const c = clone(st), acts = demarches(c, liste);
    const ord = Object.fromEntries(['A', 'B', 'C'].map((u) => [u, { ...BASE, partages: [], _libres: 0 }]));
    let refus = [];
    const journee = (u, d) => { if (u !== 'A') return null; const r = rejouer({ state: c, z: c.zones.A, agents: 4, budget: 100, limite: c.nextDeadline }, d, acts); refus = r.refus; return r; };
    const { prises } = ENQ.enquetePre(c, ['A', 'B', 'C'], ord, () => {}, journee);
    return { prises, refus };
  };
  const trop = passe([...dem, 'temoin']);
  assert.ok(trop.refus.some((x) => x.x.x === 'temoin' && /pas plus de/.test(x.raison)), 'audition au-delà du plafond : refusée');
  assert.equal((trop.prises.A && trop.prises.A.recherche) || 0, 0, 'agents pris pour une audition non menée');
  // Témoin : sous le plafond, l'audition est menée et prend ses agents.
  const ok = passe(['temoin']);
  assert.equal(ok.prises.A.recherche, ENQ.DEMARCHES.temoin.agents, 'audition menée : agents de Recherche pris');
}

// E-12 : malus du parquet sur une zone à 0 de réputation : la réputation reste à 0.
{
  const st = tour(partie('audit-e12')).state;
  const a = ENQ.affaire(st, st.enquete.n), j = st.enquete.jour;
  for (const f of a.faits.filter((x) => /^(occ|mob):/.test(x)).slice(0, 7)) st.zones.A.enquete.pieces.push({ f, j, src: 'partage', de: 'B' });
  st.zones.A.reputation = 0;
  const r = tour(st, { A: { alloc: { intervention: 9, proximite: 6, recherche: 0, roulage: 2, admin: 3 }, rythme: 'normal' } });
  assert.ok(r.state.zones.A.reputation >= 0, `réputation ${r.state.zones.A.reputation}`);
}

console.log('enquete-audit : OK');
