// Parcours de la bascule en saison 2 en mode démo (audit du 9 octobre 2026) : la fin de saison est programmée
// « ce soir », on passe le soir, puis on ouvre chaque écran (téléphone et PC) en relevant les erreurs JavaScript
// et les débordements horizontaux.
// Usage : servir le dossier (http-server -p 8765 -c-1 .) puis node test/browser-saison2.mjs <dossier-captures> [url]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');

const OUT = process.argv[2] || '/tmp/shots-s2';
const BASE = process.argv[3] || 'http://127.0.0.1:8765/?demo=corbeau';
require('node:fs').mkdirSync(OUT, { recursive: true });
const errors = [], debords = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror (${page.url().split('#')[1] || 'hp'}): ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(`console (${page.url().split('#')[1] || 'hp'}): ${m.text()}`); });
await page.addLocatorHandler(page.locator('.aide-wrap'), async () => { await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
const action = (a, data = {}) => page.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.action = a; Object.assign(b.dataset, data); document.body.append(b); b.click(); b.remove(); }, [a, data]);

await page.goto(BASE);
await page.waitForSelector('[data-action="demo-start"]');
await page.click('[data-action="demo-start"]');
await page.waitForSelector('[data-form="signup"]');
await page.fill('[name="pseudo"]', 'Bryan');
await page.fill('[name="code"]', '5324');
await page.fill('[name="nom"]', 'Horizon');
await page.click('[data-form="signup"] button[type="submit"]');
await page.waitForSelector('#countdown');
{ const pt = page.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) { await pt.click(); await page.waitForSelector('#countdown'); } }
// Quelques soirs en saison 1, puis bascule programmée « ce soir ».
for (let k = 0; k < 2; k++) { await action('demo-next'); await page.waitForTimeout(600); }
await action('admin-fin-saison', { mode: 'soir' });
await page.waitForTimeout(300);
await action('demo-next');
await page.waitForTimeout(1500);
const saison = await page.evaluate(() => { try { const d = JSON.parse(localStorage.getItem('mazp-demo-v3')); const g = d.games ? Object.values(d.games)[0] : d; return g.state.season; } catch (e) { return '?'; } });
console.log('Saison après la bascule :', saison);

const ROUTES = ['hp', 'gazette', 'ordres', 'chef', 'enquete', 'quete', 'carte', 'terrain', 'radio', 'prive', 'pactes', 'classement', 'profil', 'bureau', 'guide', 'debrief', 'admin'];
async function tour(label) {
  for (const r of ROUTES) {
    await page.goto(`${BASE.split('#')[0]}#${r}`);
    await page.waitForTimeout(700);
    await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove()));
    const o = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const larges = [...document.querySelectorAll('body *')].filter((el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.right > W + 2 && cs.position !== 'fixed' && !el.closest('[style*="overflow"], .tb-vp, #tb-vp, .scroll-x, svg'); }).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${Math.round(el.getBoundingClientRect().right)}>${W})`);
      return { scroll: document.documentElement.scrollWidth > W + 2, larges, titre: (document.querySelector('h1, h2, .card-title') || {}).textContent };
    });
    if (o.scroll) debords.push(`${label} #${r} : ${o.larges.join(' ; ')}`);
    await page.screenshot({ path: `${OUT}/${label}-${r}.png`, fullPage: false });
  }
}
await tour('tel');
await page.setViewportSize({ width: 1366, height: 860 });
await tour('pc');
// Un soir de saison 2, puis l'HP.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE.split('#')[0]}#hp`);
await page.waitForTimeout(600);
await action('demo-next');
await page.waitForTimeout(1500);
await tour('tel-j2');
await browser.close();
console.log(debords.length ? `Débordements :\n${[...new Set(debords)].join('\n')}` : 'Aucun débordement horizontal.');
console.log(errors.length ? `ERREURS :\n${[...new Set(errors)].join('\n')}` : 'Aucune erreur JavaScript.');
process.exit(errors.length ? 1 : 0);
