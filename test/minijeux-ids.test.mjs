// Les identifiants créés par la coque des mini-jeux (base.js) ne doivent pas exister dans un jeu :
// sinon le bouton de la coque reste sans effet (bug du « Retour à l'enquête » du Traçage).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const base = readFileSync('minijeux/src/base.js', 'utf8');
const coque = new Set([...base.matchAll(/id="([A-Za-z][\w-]*)"/g)].map((m) => m[1]));
for (const f of readdirSync('minijeux/src').filter((x) => x.endsWith('.src.html'))) {
  const src = readFileSync(`minijeux/src/${f}`, 'utf8');
  for (const [, id] of src.matchAll(/id="([A-Za-z][\w-]*)"/g)) assert.ok(!coque.has(id), `${f} : l’identifiant « ${id} » est déjà utilisé par la coque des mini-jeux`);
}
console.log(`OK : aucun identifiant des mini-jeux ne double ceux de la coque (${coque.size} vérifiés).`);
