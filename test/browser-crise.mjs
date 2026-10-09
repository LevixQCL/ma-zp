// Crise du district à l'écran (mode démo) : jour du vote, puis opération commune en cours.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/shots-crise';
const BASE = process.argv[3] || 'http://127.0.0.1:8765/?demo';
const W = Number(process.argv[4] || 390);
const errors = [];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.addLocatorHandler(page.locator('.aide-wrap'), async () => { await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
const shot = async (n) => { await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); };
await page.goto(BASE);
await page.click('[data-action="demo-start"]');
await page.waitForSelector('[data-form="signup"]');
await page.fill('[name="pseudo"]', 'Bryan'); await page.fill('[name="code"]', '5324'); await page.fill('[name="nom"]', 'Horizon');
await page.click('[data-form="signup"] button[type="submit"]');
await page.waitForSelector('#countdown');
{ const pt = page.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) { await pt.click(); await page.waitForSelector('#countdown'); } }
const injecter = async (etat) => {
  await page.evaluate((etat) => {
    const db = JSON.parse(localStorage.getItem('mazp-demo-v3'));
    const st = db.parties.demo.state, T = st.turn;
    st.crise = etat === 'vote'
      ? { season: st.season, n: 1, id: 'cambriolages', annonce: T - 1, vote: T, debut: T + 1, fin: T + 3, plan: null }
      : { season: st.season, n: 1, id: 'cambriolages', annonce: T - 3, vote: T - 2, debut: T - 1, fin: T + 1, plan: 'C', votes: [2, 1, 3], participants: { moi: true }, nuits: [{ T: T - 1, n: 4, requis: 3, ok: true }], presences: { moi: 1 } };
    localStorage.setItem('mazp-demo-v3', JSON.stringify(db));
  }, etat);
  await page.reload();
  await page.waitForSelector('#countdown');
};
await injecter('vote');
await page.click('[data-action="crise-vote"][data-i="2"]');
await page.evaluate(() => document.getElementById('hp-crise').scrollIntoView());
await page.screenshot({ path: `${OUT}/01-vote.png` });
await injecter('plan');
await page.evaluate(() => document.getElementById('hp-crise').scrollIntoView());
await page.screenshot({ path: `${OUT}/02-plan-c.png` });
await page.goto(BASE.replace(/\?.*/, '') + '?demo#ordres');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/03-ordres.png` });
await page.goto(BASE.replace(/\?.*/, '') + '?demo#guide-pactes');
await page.waitForTimeout(800);
await shot('04-guide');
console.log(errors.length ? errors.join('\n') : 'aucune erreur');
await browser.close();
