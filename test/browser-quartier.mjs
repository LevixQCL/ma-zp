// « Le Quartier » à l'écran (mode démo) : plateau, fiche, « Placer pour moi », 20:00, constat du lendemain.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/shots-quartier';
const BASE = process.argv[3] || 'http://127.0.0.1:8765/?demo&neuf';
const W = Number(process.argv[4] || 390);
const errors = [];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: W, height: W > 1000 ? 900 : 844 }, deviceScaleFactor: W > 1000 ? 1 : 2 })).newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.addLocatorHandler(page.locator('.aide-wrap'), async () => { await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
await page.goto(BASE);
await page.click('[data-action="demo-start"]');
await page.waitForSelector('[data-form="signup"]');
await page.fill('[name="pseudo"]', 'Bryan'); await page.fill('[name="code"]', '5324'); await page.fill('[name="nom"]', 'Horizon');
await page.click('[data-form="signup"] button[type="submit"]');
await page.waitForSelector('#countdown');
{ const pt = page.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) { await pt.click(); await page.waitForSelector('#countdown'); } }
await page.goto(BASE.replace(/\?.*/, '') + '?demo#carte');
await page.waitForSelector('.qz-fiche');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/01-carte.png`, fullPage: true });
// Un secteur touché sur la carte, deux casseurs.
const k = await page.evaluate(() => { const db = JSON.parse(localStorage.getItem('mazp-demo-v3')); const s = db.parties.demo.state.nonDroit.secteurs; return Object.keys(s).find((x) => !s[x].coeur && s[x].statut !== 'repris'); });
await page.evaluate((k) => document.querySelector(`svg.iso polygon.hit-nd[data-c="${k}"]`).dispatchEvent(new MouseEvent("click", { bubbles: true })), k);
await page.waitForTimeout(300);
await page.click(`[data-action="nd-role"][data-c="${k}"][data-r="desc"][data-d="1"]`);
await page.click(`[data-action="nd-role"][data-c="${k}"][data-r="desc"][data-d="1"]`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/02-fiche.png`, fullPage: true });
await page.click('[data-action="qz-auto"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/03-auto.png`, fullPage: true });
const etat = await page.evaluate(() => ({ marqueurs: document.querySelectorAll('svg.iso g[data-action="secteur"] text').length, fiche: document.querySelector('.qz-fiche h3')?.textContent }));
console.log(JSON.stringify(etat));
// 20:00 (démo) puis le plateau du lendemain.
for (let i = 0; i < 3; i++) {
  await page.goto(BASE.replace(/\?.*/, '') + '?demo#hp'); await page.waitForSelector('#countdown');
  const nx = page.locator('[data-action="demo-next"]').first();
  if (await nx.count()) { await nx.click(); await page.waitForTimeout(1500); }
}
await page.goto(BASE.replace(/\?.*/, '') + '?demo#carte');
await page.waitForSelector('.qz-fiche');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-apres.png`, fullPage: true });
const nd = await page.evaluate(() => { const db = JSON.parse(localStorage.getItem('mazp-demo-v3')); const n = db.parties.demo.state.nonDroit; return { turn: db.parties.demo.state.turn, quartier: n.quartier, sect: Object.values(n.secteurs).map((s) => `${s.statut === 'repris' ? 'R' : (s.bar || 0) + (s.cache || 0)}`).join(' '), int: n.intentions }; });
console.log(JSON.stringify(nd));
console.log(errors.length ? errors.join('\n') : 'aucune erreur');
await browser.close();
