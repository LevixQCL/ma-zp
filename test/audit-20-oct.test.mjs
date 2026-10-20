// Régressions trouvées à l'audit du 20 oct. 2026 (moteur v171). Chaque cas échoue sur la v171 et passe après correction.
//  1. Un ordre « matériel » forgé (clés constructor / toString / __proto__) faisait planter tout le tour de 20:00.
//  2. Une répartition négative envoyée par l'appareil rendait les chaussures neuves (usure lue sur l'ordre brut).
//  3. À la bascule, les dates du matériel n'étaient décalées que d'un jour (au lieu du nombre de tours joués),
//     et les recyclages TTI pas du tout : gilets et TTI périmés redevenaient valides, une commande en route arrivait
//     des saisons plus tard.
//  4. À la bascule, les PS déjà dépensés étaient rendus (les skins achetés restant acquis).
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { SEASON_LENGTH } from '../js/engine/constants.js';
import { psDispo, skinsEnVente } from '../js/engine/decor.js';

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

console.log('audit-20-oct : OK');
