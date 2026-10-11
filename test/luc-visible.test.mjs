// Luc ne doit pas disparaître pour un joueur qui n'y a jamais joué quand l'urgence Bitonal tombe.
import assert from 'node:assert/strict';
import { decisionLuc } from '../js/ui/luc.js';
let n = 0;
for (const jourLuc of [true, false]) for (const apres7h of [true, false]) for (const urgence of [true, false]) {
  assert.equal(decisionLuc({ premiere: true, jourLuc, apres7h, urgence }), true, `jamais joué : toujours visible (jourLuc=${jourLuc}, 7h=${apres7h}, urgence=${urgence})`);
  assert.equal(decisionLuc({ premiere: false, jourLuc, apres7h, urgence }), jourLuc && apres7h && !urgence);
  n += 2;
}
console.log(`OK : ${n} cas de présence de Luc vérifiés (l'urgence ne cache plus Luc à ceux qui n'y ont jamais joué).`);
