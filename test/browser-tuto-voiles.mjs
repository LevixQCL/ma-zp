// Visite guidée complète en saison 2 (démo corbeau) : à chaque étape « ouvre l'onglet X », l'onglet éclairé
// doit être réellement touchable (aucun voile plein écran — journal, lecture des pièces, scène — par-dessus).
// Bug du 9 octobre 2026 : le journal de l'affaire restait ouvert par-dessus la barre d'onglets à l'étape Énigmes.
// Usage : servir le dossier (http-server -p 8765 -c-1 .) puis node test/browser-tuto-voiles.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8765/?demo=corbeau';
const OUT = process.env.OUT || '';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const action = (a, data = {}) => page.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.action = a; Object.assign(b.dataset, data); document.body.append(b); b.click(); b.remove(); }, [a, data]);
await page.goto(BASE);
await page.click('[data-action="demo-start"]');
await page.waitForSelector('[data-form="signup"]');
await page.fill('[name="pseudo"]', 'Bryan'); await page.fill('[name="code"]', '5324'); await page.fill('[name="nom"]', 'Horizon');
await page.click('[data-form="signup"] button[type="submit"]');
await page.waitForSelector('#countdown');
{ const pt = page.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) await pt.click(); }
await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove()));
for (let k = 0; k < 2; k++) { await action('demo-next'); await page.waitForTimeout(600); }
await action('admin-fin-saison', { mode: 'soir' }); await page.waitForTimeout(300);
await action('demo-next'); await page.waitForTimeout(1500);
// Le joueur ouvre le journal pendant la visite (gros bouton, pièce « une »…) : scénario MODE=journal.
const MODE = process.env.MODE || 'journal';
await page.goto(`${BASE.split('#')[0]}#hp`); await page.waitForTimeout(800);
await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove()));
await action('tuto'); await page.waitForTimeout(800);
const problemes = [];
let ouvert = false;
for (let n = 0; n < 60; n++) {
  if (!(await page.locator('.tuto-bulle').count())) break;
  const titre = (await page.locator('.tuto-titre').textContent()).trim();
  const m = titre.match(/ouvre l’onglet (.+)$/);
  if (m) {
    const hrefs = { 'HP': 'hp', 'Ordres': 'ordres', 'Enquête': 'enquete', 'Énigmes': 'quete', 'Carte': 'carte', 'Radio': 'radio', 'Chef': 'chef' };
    const r = hrefs[m[1]] || m[1];
    await page.waitForTimeout(400);
    const touchable = await page.evaluate((r) => { const a = document.querySelector(`nav.tabs a[href="#${r}"]`); if (!a) return 'absent'; const b = a.getBoundingClientRect(); const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return a.contains(el) ? 'ok' : (el ? `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}` : 'rien'); }, r);
    if (touchable !== 'ok') { problemes.push(`étape « ${titre} » : onglet couvert par ${touchable}`); if (OUT) await page.screenshot({ path: `${OUT}/tuto-${n}.png` }); }
    await page.evaluate((r) => { location.hash = `#${r}`; }, r); // le toucher (même si couvert, pour continuer)
    await page.waitForTimeout(700);
    if (r === 'enquete' && MODE === 'journal' && !ouvert) { ouvert = true; await action('journal-ouvrir'); await page.waitForTimeout(500); }
    if (r === 'enquete' && MODE === 'lire' && !ouvert) { ouvert = true; await action('e2-lire'); await page.waitForTimeout(500); }
    continue;
  }
  const suiv = page.locator('.tuto-bulle [data-tuto="suiv"]');
  if (!(await suiv.count())) break;
  await suiv.click(); await page.waitForTimeout(450);
}
await browser.close();
console.log(problemes.length ? `PROBLÈMES :\n${problemes.join('\n')}` : 'Visite guidée : chaque onglet demandé est touchable.');
if (errors.length) console.log(`Erreurs JS :\n${errors.join('\n')}`);
process.exit(problemes.length || errors.length ? 1 : 0);
