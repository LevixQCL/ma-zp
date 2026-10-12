// Détail du moral : le +1 de la salle de sport porte son nom (avant le 12 oct. 2026, il s'affichait
// « Doctrine partenaire : réputation », reste de l'ancienne réputation quotidienne de la doctrine Partenaire).
import assert from 'node:assert/strict';
import { createGame, buildJoinZone, resolveTurn } from '../js/engine/resolve.js';

const st = createGame({ seed: 'sport', turnDeadline: Date.UTC(2026, 9, 12, 18) });
for (const u of ['a', 'b']) st.zones[u] = buildJoinZone(st, u, { code: u === 'a' ? '1111' : '2222', nom: `Zone ${u}`, couleur: '#fff' }, 1);
st.zones.a.infra.sport = true;
const { state } = resolveTurn(structuredClone(st), { players: {} });
const j = (state.zones.a.journal && state.zones.a.journal.lignes) || {};
const lignes = Object.values(j).flat().map((x) => x.l);
assert.ok(lignes.length, 'journal présent');
assert.ok(!lignes.some((l) => /Doctrine partenaire/.test(l)), 'plus de ligne « Doctrine partenaire : réputation »');
assert.ok((j.moral || []).some((x) => x.l === 'Salle de sport' && x.v === 1), 'la salle de sport a sa ligne (+1 de moral)');
console.log('OK : la salle de sport est nommée dans le détail du moral.');
