// Régressions trouvées à l'audit du 20 oct. 2026 (moteur v171). Chaque cas échoue sur la v171 et passe après correction.
//  1. Un ordre « matériel » forgé (clés constructor / toString / __proto__) faisait planter tout le tour de 20:00.
//  2. Une répartition négative envoyée par l'appareil rendait les chaussures neuves (usure lue sur l'ordre brut).
//  3. À la bascule, les dates du matériel n'étaient décalées que d'un jour (au lieu du nombre de tours joués),
//     et les recyclages TTI pas du tout : gilets et TTI périmés redevenaient valides, une commande en route arrivait
//     des saisons plus tard.
//  4. À la bascule, les PS déjà dépensés étaient rendus (les skins achetés restant acquis).
//  5. Un marché groupé lancé en fin de saison ne fermait jamais (dates non recalées) : son lanceur ne pouvait plus en lancer.
//  6. Une formation lancée le jour 13 était annoncée « perdue » alors que le niveau monte le soir 14.
//  7. Après 20:00, l'écran affichait « 00:00:00 » jusqu'au calcul du tour ; la Gazette ne disait pas qui l'avait calculé.
//  8. Une relève prise avec un service d'Intervention vide ne coûtait aucun agent aux autres services (agents « fantômes »).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { SEASON_LENGTH, tourEffet } from '../js/engine/constants.js';
import { psDispo, skinsEnVente } from '../js/engine/decor.js';
import { compteReboursHtml } from '../js/engine/time.js';
import { resolvePending, DELAI_SECOURS } from '../js/data/resolver.js';
import { zonesVoisines } from '../js/engine/vagues.js';
import { agentsDisponibles } from '../js/engine/zone.js';

const base = { alloc: { intervention: 7, proximite: 4, recherche: 4, roulage: 2, admin: 3 }, rythme: 'normal' };
const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' } };
const nuit = (st, o) => { const r = resolveTurn(st, { players, orders: o }); r.state.nextDeadline += 864e5; return r.state; };
const copie = (o) => JSON.parse(JSON.stringify(o));

// 1. Ordres « matériel » forgés : le tour se calcule, les budgets restent des nombres.
{
  let s = createGame({ seed: 'audit-mat', turnDeadline: Date.parse('2026-10-12T18:00:00Z') });
  for (let k = 0; k < 3; k++) s = nuit(s, { A: { ...base }, B: { ...base } });
  const forges = [
    { commandes: [{ item: 'constructor', lots: 1, voie: 'centrale' }] },
    { commandes: [{ item: 'gilets', lots: 1, voie: 'constructor' }] },
    { commandes: [{ item: 'gilets', lots: 1, voie: 'toString' }] },
    { commandes: [{ item: 'gilets', lots: 1, voie: 'centrale', q: '__proto__' }] },
    { commandes: [{ item: 'gilets', lots: 1, voie: 'centrale', q: 'constructor' }] },
    { lancer: { item: 'toString', lots: 1 } },
    { lancer: { item: 'gilets', lots: 'beaucoup' } },
    { fonctions: { constructor: 'chef', toString: null } },
  ];
  for (const m of forges) {
    let st = copie(s);
    assert.doesNotThrow(() => { st = nuit(st, { A: { ...base, materiel: m }, B: { ...base } }); }, `ordre matériel ${JSON.stringify(m)}`);
    for (let k = 0; k < 3; k++) st = nuit(st, { A: { ...base }, B: { ...base } }); // clôture d'un éventuel marché
    assert.ok(Number.isFinite(st.zones.A.budget), `budget fini après ${JSON.stringify(m)}`);
  }
  // 2. Répartition négative : l'usure du jour n'est jamais négative.
  const st = copie(s); st.zones.A.materiel.chaussures = 10;
  const r = resolveTurn(st, { players, orders: { A: { ...base, alloc: { ...base.alloc, intervention: -1000 } }, B: { ...base } } });
  assert.ok(r.state.zones.A.materiel.chaussures <= 10, `chaussures ${r.state.zones.A.materiel.chaussures} (devaient s'user)`);
}

// 3. Bascule de saison : chaque date du matériel recule exactement du nombre de tours joués.
{
  let s = createGame({ seed: 'audit-bascule', turnDeadline: Date.parse('2026-10-05T18:00:00Z') });
  while (s.turn < SEASON_LENGTH) s = nuit(s, { A: { ...base }, B: { ...base } });
  const avant = copie(s.zones.A.materiel), d = s.turn;
  s = nuit(s, { A: { ...base, materiel: { commandes: [{ item: 'gilets', lots: 1, voie: 'centrale' }] } }, B: { ...base } });
  assert.equal(s.season, 2);
  const m = s.zones.A.materiel;
  // Les gilets encore listés gardent leur durée de validité restante (fins de la saison 1 moins le nombre de tours joués).
  const restants = (l) => l.map((g) => g.fin).sort((a, b) => a - b);
  const attendus = new Set(avant.gilets.map((g) => g.fin - d));
  for (const f of restants(m.gilets)) assert.ok(attendus.has(f) || f > d, `gilet qui finit au jour ${f} de la saison 2 : décalage incorrect`);
  for (const t of ['af', 'saf']) {
    const a = new Set((avant.tti[t] || []).map((x) => x.fin - d));
    for (const x of m.tti[t] || []) assert.ok(a.has(x.fin), `TTI ${t} qui finit au jour ${x.fin} : non décalé`);
  }
  // La commande passée le dernier soir arrive dans les premiers jours de la nouvelle saison.
  for (const c of m.commandes) assert.ok(c.arrive <= 5, `commande attendue au jour ${c.arrive} de la saison 2`);
}

// 4. Bascule de saison : les PS dépensés restent dépensés.
{
  let s = createGame({ seed: 'audit-ps', turnDeadline: Date.parse('2026-10-15T18:00:00Z') });
  for (let k = 0; k < 3; k++) s = nuit(s, { A: { ...base }, B: { ...base } });
  s.zones.A.ps = 600;
  const offre = skinsEnVente(s.nextDeadline)[0];
  assert.ok(offre, 'un skin en vente pour le test');
  s = nuit(s, { A: { ...base, achat: offre.cle }, B: { ...base } });
  const dispoAvant = psDispo(s.zones.A), psAvant = s.zones.A.ps;
  assert.ok(s.zones.A.psDepense > 0, 'achat payé en PS');
  s.finSaison = 'soir';
  s = nuit(s, { A: { ...base }, B: { ...base } });
  assert.equal(s.season, 2);
  const gagnes = s.zones.A.ps - psAvant; // PS de fin de saison et du dernier soir
  assert.ok(psDispo(s.zones.A) <= dispoAvant + gagnes, `PS à dépenser ${psDispo(s.zones.A)} : l'achat a été remboursé`);
}

// 5. Marché groupé lancé le jour 13 : il ferme dans la nouvelle saison, et son lanceur peut en relancer un.
{
  let s = createGame({ seed: 'audit-marche', turnDeadline: Date.parse('2026-10-05T18:00:00Z') });
  while (s.turn < SEASON_LENGTH - 1) s = nuit(s, { A: { ...base }, B: { ...base } });
  s = nuit(s, { A: { ...base, materiel: { lancer: { item: 'gilets', lots: 1 } } }, B: { ...base } });
  const id = (s.marches || []).find((m) => m.lanceur === 'A' && !m.clos)?.id;
  assert.ok(id, 'marché lancé le jour 13');
  for (let k = 0; k < 6; k++) s = nuit(s, { A: { ...base }, B: { ...base } });
  assert.equal(s.season, 2);
  const mk = (s.marches || []).find((m) => m.id === id);
  assert.ok(!mk || mk.clos, `marché du jour 13 toujours ouvert au jour ${s.turn} de la saison 2 (ferme au jour ${mk && mk.ferme})`);
  s = nuit(s, { A: { ...base, materiel: { lancer: { item: 'gilets', lots: 1 } } }, B: { ...base } });
  assert.ok((s.marches || []).some((m) => m.lanceur === 'A' && !m.clos && m.id !== id), 'le lanceur peut relancer un marché');
}

// 6. Formation : lancée le jour 13 elle aboutit (avertissement « perdu » seulement le jour 14).
assert.ok(tourEffet({ type: 'former', service: 'roulage' }, SEASON_LENGTH - 1) <= SEASON_LENGTH, 'formation du jour 13 annoncée perdue');
assert.ok(tourEffet({ type: 'former', service: 'roulage' }, SEASON_LENGTH) > SEASON_LENGTH, 'formation du jour 14 bien annoncée perdue');

// 7. Après 20:00 : « la Gazette s'imprime » ; la Gazette dit qui a calculé le tour ; les appareils attendent une heure.
{
  assert.match(compteReboursHtml(1000, 'hs-cd', 2000), /s’imprime/);
  assert.match(compteReboursHtml(2000 + 3723000, 'hs-cd', 2000), /01:02:03/);
  assert.equal(DELAI_SECOURS, 60 * 60000);
  const passe = Date.now() - 3 * 3600e3;
  let enregistre = null;
  const etat = createGame({ seed: 'audit-qui', turnDeadline: passe });
  const back = { async getState() { return etat; }, async getAllOrders() { return {}; }, async getAllQuests() { return {}; }, async getPlayers() { return {}; },
    async commitResolution(prev, next, gazette) { enregistre = gazette; return true; } };
  await resolvePending(back, { serveur: true, maxTurns: 1 });
  assert.equal(enregistre && enregistre.calculePar, 'serveur');
}

// 8. Relève prise par une zone sans agent d'Intervention : les agents partent d'un autre service (ici la Proximité).
{
  let s = createGame({ seed: 'm05', turnDeadline: Date.parse('2026-10-05T18:00:00Z') });
  for (let k = 0; k < 4; k++) s = nuit(s, { A: { ...base }, B: { ...base } });
  const T = s.turn, v = zonesVoisines(s, 'A').B;
  assert.ok(v, 'A et B voisines');
  s.releves = [{ id: 'rX', origine: 'A', vers: 'B', par: null, transmis: false, suspect: 'le chauffeur', titre: '', cause: 'test', cell: v.chezLui, tour: T, etape: 'proposee' }];
  const dispo = agentsDisponibles(s.zones.B, T);
  const allocB = { intervention: 0, proximite: 8, recherche: 6, roulage: 3, admin: dispo - 17 };
  const run = (choix) => resolveTurn(copie(s), { players, orders: { A: { ...base }, B: { alloc: allocB, rythme: 'normal', releve: { id: 'rX', choix, agents: 4 } } } }).state.zones.B;
  const avec = run('prendre'), sans = run('refuser');
  assert.ok((avec.stats.releves || 0) === 1, 'relève prise');
  assert.ok(avec.criminalite > sans.criminalite, `relève gratuite : criminalité ${avec.criminalite} contre ${sans.criminalite} sans relève`);
}

console.log('audit-20-oct : OK');
