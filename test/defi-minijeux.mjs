// Défi d'endurance des mini-jeux : réglages de chaque niveau, lancement des niveaux 1 à 40 sans erreur, captures.
// Servir le dossier (http-server -p 8765 -c-1 .) puis : node test/defi-minijeux.mjs <dossier-captures> [http://127.0.0.1:8765/]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/shots';
const BASE = process.argv[3] || 'http://127.0.0.1:8765/';
const JEUX = ['colis', 'crochetage', 'depanneuse', 'dossier', 'empreintes', 'adn', 'reseau', 'interception'];
const NIV = [1, 4, 7, 10, 15, 20, 25, 30, 40];
const browser = await chromium.launch();
const errors = [];
for (const jeu of JEUX) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(`${jeu}: ${e.message}`));
  await page.goto(`${BASE}minijeux/${jeu}.html?mode=train&rec=12&recNom=Bryan&moi=4`);
  await page.waitForSelector('#defiGo');
  if (jeu === 'crochetage') await page.screenshot({ path: `${OUT}/defi-menu-${jeu}.png` });
  const cfgs = await page.evaluate((niv) => niv.map((n) => { const c = Shell.cfgNiveau(n); delete c.grille; return c; }), NIV);
  console.log(`\n${jeu}`);
  console.table(Object.fromEntries(NIV.map((n, i) => [n, Object.fromEntries(Object.entries(cfgs[i]).filter(([k]) => !['label', 'niveau', 'defi', 'set', 'flip'].includes(k)).map(([k, v]) => [k, Array.isArray(v) ? v.join('/') : v]))])));
  for (const n of [1, 10, 25, 40]) {
    await page.evaluate((x) => Shell._essaiNiveau(x), n);
    await page.waitForTimeout(400);
    if (n === 25) await page.screenshot({ path: `${OUT}/defi-${jeu}-niv25.png` });
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? `ERREURS :\n${errors.join('\n')}` : 'Aucune erreur JavaScript.');
if (errors.length) process.exit(1);
