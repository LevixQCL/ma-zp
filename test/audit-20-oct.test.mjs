// Régressions trouvées à l'audit du 20 oct. 2026 (moteur v171). Chaque cas échoue sur la v171 et passe après correction.
//  1. Un ordre « matériel » forgé (clés constructor / toString / __proto__) faisait planter tout le tour de 20:00.
//     (Saison 4 : le magasin est devenu une armurerie ; on garde les anciens ordres forgés et on ajoute ceux de l'armurerie.)
//  3. À la bascule, le matériel était mal recalé. Saison 4 : l'armurerie est gardée telle quelle d'une saison à l'autre.
//  4. À la bascule, les PS déjà dépensés étaient rendus (les skins achetés restant acquis).
//  6. Une formation lancée le jour 13 était annoncée « perdue » alors que le niveau monte le soir 14.
//  7. Après 20:00, l'écran affichait « 00:00:00 » jusqu'au calcul du tour ; la Gazette ne disait pas qui l'avait calculé.
// Retirés avec la saison 4 : 2 (usure des chaussures), 5 (marchés groupés), 8 (relève).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { SEASON_LENGTH, tourEffet } from '../js/engine/constants.js';
import { psDispo, skinsEnVente } from '../js/engine/decor.js';
import { compteReboursHtml } from '../js/engine/time.js';
import { resolvePending, DELAI_SECOURS } from '../js/data/resolver.js';

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
    { acheter: 'constructor' }, { acheter: '__proto__' }, { acheter: 'toString' }, { acheter: ['gilets'] }, { acheter: { k: 'gilets' } }, { acheter: null },
  ];
  for (const m of forges) {
    let st = copie(s);
    assert.doesNotThrow(() => { st = nuit(st, { A: { ...base, materiel: m }, B: { ...base } }); }, `ordre matériel ${JSON.stringify(m)}`);
    for (let k = 0; k < 3; k++) st = nuit(st, { A: { ...base }, B: { ...base } }); // clôture d'un éventuel marché
    assert.ok(Number.isFinite(st.zones.A.budget), `budget fini après ${JSON.stringify(m)}`);
  }
}

// 3. Bascule de saison : l'armurerie (achats permanents) passe telle quelle en saison 2, achat du dernier soir compris.
{
  let s = createGame({ seed: 'audit-bascule', turnDeadline: Date.parse('2026-10-05T18:00:00Z') });
  while (s.turn < SEASON_LENGTH - 1) s = nuit(s, { A: { ...base }, B: { ...base } });
  s.zones.A.budget = 60;
  s = nuit(s, { A: { ...base, materiel: { acheter: 'gilets' } }, B: { ...base } });
  assert.ok(s.zones.A.armurerie.gilets);
  s = nuit(s, { A: { ...base, materiel: { acheter: 'radios' } }, B: { ...base } });
  assert.equal(s.season, 2);
  assert.deepEqual(s.zones.A.armurerie, { gilets: true, radios: true }, 'armurerie gardée à la bascule');
  assert.equal(s.zones.A.materiel, undefined, 'plus d’ancien magasin');
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

console.log('audit-20-oct : OK');
