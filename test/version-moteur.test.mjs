// Le moteur (js/engine, js/quests) calcule les tours sur l'appareil du premier joueur connecté après 20:00.
// Un appareil resté sur une ancienne version (cache) ne doit pas calculer avec d'anciennes règles :
// toute modification du moteur doit s'accompagner d'une hausse de APP_VERSION (constants.js).
// Après avoir monté APP_VERSION : node test/version-moteur.test.mjs --maj
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { APP_VERSION } from '../js/engine/constants.js';

const racine = new URL('../js/', import.meta.url);
const h = createHash('sha256');
for (const dir of ['engine', 'quests']) {
  for (const f of readdirSync(new URL(`${dir}/`, racine)).filter((x) => x.endsWith('.js')).sort()) {
    let src = readFileSync(new URL(`${dir}/${f}`, racine), 'utf8');
    if (f === 'constants.js') src = src.replace(/export const APP_VERSION = \d+;/, '');
    h.update(`${dir}/${f}\n${src}`);
  }
}
const empreinte = h.digest('hex').slice(0, 16);
const fichier = new URL('./version-moteur.json', import.meta.url);
if (process.argv.includes('--maj')) {
  writeFileSync(fichier, `${JSON.stringify({ version: APP_VERSION, empreinte }, null, 1)}\n`);
  console.log(`version-moteur.json : v${APP_VERSION} ${empreinte}`);
  process.exit(0);
}
const ref = JSON.parse(readFileSync(fichier, 'utf8'));
if (ref.empreinte !== empreinte) {
  if (ref.version === APP_VERSION) {
    console.error(`Le moteur a changé (${ref.empreinte} → ${empreinte}) mais APP_VERSION est toujours ${APP_VERSION} : monte APP_VERSION dans js/engine/constants.js, puis node test/version-moteur.test.mjs --maj`);
    process.exit(1);
  }
  console.error(`APP_VERSION ${APP_VERSION} : lance node test/version-moteur.test.mjs --maj pour enregistrer la nouvelle empreinte du moteur.`);
  process.exit(1);
}
console.log(`Moteur v${APP_VERSION} à jour`);
