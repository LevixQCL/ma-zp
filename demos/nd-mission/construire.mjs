// Construit la démo autonome (une seule page) à partir de page.html et de regles.js.
import { readFileSync, writeFileSync } from 'node:fs';
const ici = new URL('.', import.meta.url);
const regles = readFileSync(new URL('regles.js', ici), 'utf8').replace(/^export /gm, '').replace(/^const cles = .*$/m, '');
const page = readFileSync(new URL('page.html', ici), 'utf8').replace('/*REGLES*/', regles);
writeFileSync(new URL('../nd-mission.html', ici), page);
console.log('demos/nd-mission.html construit');
