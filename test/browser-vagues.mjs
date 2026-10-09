// Vagues et relève à l'écran (mode démo) : on injecte une vague, une relève, un appui et une saisie, puis captures.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/shots-vagues';
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
await page.evaluate(async () => {
  const { zonesVoisines } = await import('./js/engine/vagues.js');
  const db = JSON.parse(localStorage.getItem('mazp-demo-v3'));
  const st = db.parties.demo.state, T = st.turn;
  const vois = zonesVoisines(st, 'moi'), nb = Object.keys(vois);
  st.vagues = { liste: [{ de: nb[0], vers: 'moi', origine: 'proximite', domaine: 'roulage', force: 2, cell: vois[nb[0]].chezMoi, depuis: vois[nb[0]].chezLui, ref: 3.2, tour: T }], ref: {}, bilan: [] };
  st.releves = [
    { id: 'rtest', origine: nb[0], vers: 'moi', par: null, transmis: false, suspect: 'le guetteur', titre: 'Contrôle des cafés', cause: 'Contrôle des cafés réussi à moitié', cell: vois[nb[0]].chezMoi, tour: T, etape: 'proposee' },
    { id: 'rappui', origine: 'moi', vers: nb[1] || nb[0], par: null, transmis: false, suspect: 'la complice', titre: '', cause: 'Vague brisée', cell: vois[nb[1] || nb[0]].chezLui, tour: T, etape: 'proposee' },
    { id: 'rsaisie', origine: nb[0], vers: 'moi', suspect: 'le receleur', etape: 'saisie', tour: T, cell: vois[nb[0]].chezMoi },
  ];
  st.zones.moi.vagueEnvoyee = { tour: T - 1, domaine: 'proximite', vers: nb[0], force: 1 };
  localStorage.setItem('mazp-demo-v3', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('#countdown');
{ const plusTard = page.getByRole('button', { name: 'Plus tard' }); if (await plusTard.count()) await plusTard.first().click(); }
await shot('01-hp');
await page.click('[data-action="releve"][data-c="prendre"]');
await page.click('[data-action="releve-n"][data-d="-1"]');
await page.click('[data-action="releve-appui"][data-d="1"]');
await page.click('[data-action="saisie"][data-v="voiture"]');
await page.evaluate(() => document.getElementById('hp-releve').scrollIntoView());
await page.screenshot({ path: `${OUT}/02-releve.png` });
await page.goto(BASE.replace(/\?.*/, '') + '?demo#ordres');
await page.waitForTimeout(800);
await shot('03-ordres');
await page.goto(BASE.replace(/\?.*/, '') + '?demo#carte');
await page.waitForTimeout(800);
await shot('04-carte');
await page.goto(BASE.replace(/\?.*/, '') + '?demo#guide-vagues');
await page.waitForTimeout(800);
await shot('05-guide');
console.log(errors.length ? errors.join('\n') : 'aucune erreur');
await browser.close();
