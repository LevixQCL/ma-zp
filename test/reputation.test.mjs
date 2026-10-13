// Subside par agent et effets de la réputation (budget de la commune, coût des recrues).
// (Remplace encheres.test.mjs : la salle des ventes « un lot par jour » de la saison 1 a été retirée ;
// la vente aux enchères des saisies a ses propres vérifications dans les simulations de saison 2.)
import assert from 'node:assert/strict';
import { createGame, resolveTurn } from '../js/engine/resolve.js';
import { SUBSIDE, REPUTATION, COUTS } from '../js/engine/constants.js';
import { fraisFixes, coutRecrue } from '../js/engine/zone.js';

const players = { A: { code: '1111', nom: 'Alpha' }, B: { code: '2222', nom: 'Bravo' }, C: { code: '3333', nom: 'Charlie' } };
let s = createGame({ seed: 'ench' });
assert.ok(s.vente, 'une vente des saisies annoncée dès la création');
s = resolveTurn(s, { players }).state;

// Subside communal : par agent au-delà de l'effectif de départ, plus la confiance (réputation).
const z = JSON.parse(JSON.stringify(s.zones.A));
z.agents = SUBSIDE.seuil; z.reputation = 50;
const f0 = fraisFixes(z, s);
assert.ok(!f0.lignes.some((l) => l.k === 'subside'), 'pas de subside à 20 agents');
assert.equal(f0.lignes.find((l) => l.k === 'confiance').v, 0, 'confiance affichée à 0 à réputation 50 (avec son calcul)');
z.agents = SUBSIDE.seuil + 10; z.reputation = 80;
const f1 = fraisFixes(z, s);
assert.equal(f1.lignes.find((l) => l.k === 'subside').v, 1.5);
assert.equal(f1.lignes.find((l) => l.k === 'confiance').v, 6, 'réputation 80 : +6 k€');
z.reputation = 20;
assert.equal(fraisFixes(z, s).lignes.find((l) => l.k === 'confiance').v, -3, 'réputation 20 : −3 k€ (malus deux fois plus doux)');

// Recrues : moins chères pour une zone réputée, plus chères pour une zone mal vue.
assert.equal(coutRecrue({ reputation: 50 }), COUTS.recrue);
assert.equal(coutRecrue({ reputation: REPUTATION.recrueHaute }), REPUTATION.coutRecrueHaute);
assert.equal(coutRecrue({ reputation: REPUTATION.recrueBasse - 1 }), REPUTATION.coutRecrueBasse);

console.log('OK : subside par agent et réputation vérifiés.');
