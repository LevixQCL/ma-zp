// Parcours du coup de filet en mode démo : cibles, ouverture, filature de 2 h, résultat, tour de 20:00.
// Usage : servir le dossier (http-server -p 8765 -c-1 .) puis node test/browser-filet.mjs <captures> [url]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/shots';
const BASE = process.argv[3] || 'http://127.0.0.1:8765/?demo';
const W = Number(process.env.LARGEUR || 390);
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.addLocatorHandler(page.locator('.aide-wrap'), async () => { await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
const shot = async (name) => { await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
const avancer = (h) => page.evaluate((h) => { const o = Date.now.bind(Date); const off = h * 3600e3; Date.now = () => o() + off; }, h);

await page.goto(BASE);
await page.click('[data-action="demo-start"]');
await page.waitForSelector('[data-form="signup"]');
await page.fill('[name="pseudo"]', 'Bryan'); await page.fill('[name="code"]', '5324'); await page.fill('[name="nom"]', 'Horizon');
await page.click('[data-form="signup"] button[type="submit"]');
await page.waitForSelector('#countdown');
{ const pt = page.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) { await pt.click(); await page.waitForSelector('#countdown'); } }
// Avant le premier tour : pas encore de cibles.
await page.evaluate(() => { location.hash = '#filet'; }); await page.waitForSelector('main.fi');
await shot('f0-avant');
await page.evaluate(() => { location.hash = '#hp'; }); await page.waitForSelector('[data-action="demo-next"]');
await page.click('[data-action="demo-next"]');
await page.waitForTimeout(2500);
await page.evaluate(() => { document.querySelectorAll('.aide-wrap').forEach((x) => x.remove()); location.hash = '#hp'; });
await page.waitForSelector('a[href="#filet"].ajd-alerte', { timeout: 10000 });
await shot('f1-hp');
await page.click('a[href="#filet"].ajd-alerte');
await page.waitForSelector('[data-action="filet-ouvrir"]');
await shot('f2-cibles');
await page.click('[data-action="filet-ouvrir"] >> nth=1');
await page.waitForSelector('[data-action="filet-lancer"][data-k="filature"]');
await shot('f3-dossier');
await page.click('[data-action="filet-duree"][data-k="filature"][data-d="2"]');
await page.click('[data-action="filet-lancer"][data-k="filature"]');
await page.waitForSelector('[data-filet-fin]');
await shot('f4-en-cours');
await avancer(2.2);
await page.waitForSelector('[data-action="filet-lancer"]', { timeout: 5000 });
await shot('f5-resultat');
// Ordres : la ligne des agents mobilisés.
await page.evaluate(() => { location.hash = '#ordres'; });
await page.waitForTimeout(800);
const ligne = await page.locator('a[href="#filet"].tiny').count();
if (!ligne) errors.push('Ordres : pas de ligne « coup de filet »');
await shot('f6-ordres');
await page.evaluate(() => { location.hash = '#guide-filet'; }); await page.waitForTimeout(500); await shot('f7-guide');
console.log(errors.length ? errors.join('\n') : 'aucune erreur');
await browser.close();
process.exit(errors.length ? 1 : 0);
