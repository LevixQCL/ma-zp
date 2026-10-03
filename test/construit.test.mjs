// Vérifie que js/app.min.js (le fichier réellement chargé par index.html) a été reconstruit après la dernière modification de js/.
import { readFileSync } from 'node:fs';
import { empreinteSources } from '../outils/construire.mjs';
const min = readFileSync(new URL('../js/app.min.js', import.meta.url), 'utf8');
const attendu = empreinteSources();
const trouve = (min.match(/sources:([0-9a-f]+)/) || [])[1];
if (trouve !== attendu) { console.error(`js/app.min.js n'est pas à jour (sources:${trouve} ≠ ${attendu}) : lance node outils/construire.mjs`); process.exit(1); }
console.log('js/app.min.js à jour');
