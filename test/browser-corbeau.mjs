// Parcours de l'affaire « Le corbeau de la rue d'Havré » en mode démo (?demo=corbeau), avec captures d'écran.
// Usage : servir le dossier (http-server -p 8765 -c-1 .) puis node test/browser-corbeau.mjs <dossier-captures> "http://127.0.0.1:8765/?demo=corbeau"
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');

const OUT = process.argv[2] || '/tmp/shots-corbeau';
const BASE = process.argv[3] || 'http://127.0.0.1:8765/?demo=corbeau';
const LARGE = process.argv.includes('--pc');
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: LARGE ? { width: 1440, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.addLocatorHandler(page.locator('.aide-wrap'), async () => { await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
const shot = async (name, full = false) => { await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); };
// Clique sur un bouton d'action fabriqué (comme si on le touchait dans un volet).
const action = (a, data = {}) => page.evaluate(([a2, d]) => { const b = document.createElement('button'); b.dataset.action = a2; Object.assign(b.dataset, d); document.body.append(b); b.click(); b.remove(); }, [a, data]);
const base = BASE;

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
// Premier tour : l'affaire s'ouvre.
await page.waitForSelector('[data-action="demo-next"]');
await page.click('[data-action="demo-next"]');
await page.waitForTimeout(800);

// Le journal du lendemain.
await page.goto(`${base}#enquete`);
await page.waitForSelector('#tb-vp');
await page.waitForSelector('.jr-wrap');
await page.waitForTimeout(1200);
await shot('01-journal', true);
await page.click('[data-action="journal-fermer"]');
while (await page.locator('[data-action="tab-tuto-suite"]').count()) await page.click('[data-action="tab-tuto-suite"]');
if (await page.locator('[data-action="tab-tuto-fin"]').count()) await page.click('[data-action="tab-tuto-fin"]');
await page.click('[data-action="tab-fit"]');
await shot('02-tableau-j1');

// Jours de jeu : démarches, réaudition, recoupement et hypothèse fabriqués comme des touchers, puis tour suivant.
const jours = [
  { dem: ['temoin', 'alibi:4'], hypo: { i: '0', s: '2' } },
  { dem: ['temoin', 'moyens:4'], recoup: ['c:labo1', 'doc:journal'] },
  { dem: ['cam', 'alibi:2'], recoup: ['c:septieme', 'doc:pvc'], reaud: { i: '4', f: 'c:septieme' }, hypo: { i: '4', s: '1' } },
  { dem: ['labo', 'banque:0'], recoup: ['r:odile', 'c:dest'] },
];
for (const [k, j] of jours.entries()) {
  await page.goto(`${base}#enquete`);
  await page.waitForSelector('#tb-vp');
  for (const x of j.dem) await action('dem-toggle', { k: x });
  if (j.reaud) await action('reaud-piece', j.reaud);
  if (j.recoup) await action('recoup-piece', { a: j.recoup[0], b: j.recoup[1] });
  if (j.hypo) { await action('hypo-choix', { i: j.hypo.i }); await action('hypo-choix', { s: j.hypo.s }); }
  if (k === 2) { await page.click('[data-action="tab-volet"][data-k="soir"]'); await shot('03-ce-soir'); await page.click('[data-action="tab-fermer"]'); }
  await page.click('.savebar [data-action="save-orders"]');
  await page.waitForTimeout(300);
  await page.goto(`${base}#hp`);
  await page.waitForSelector('[data-action="demo-next"]');
  await page.click('[data-action="demo-next"]');
  await page.waitForTimeout(700);
}
await page.goto(`${base}#hp`);
await page.waitForSelector('#countdown');
if (await page.locator('[data-action="toggle-rapport"]').count()) await page.click('[data-action="toggle-rapport"]');
await shot('04-rapport', true);

// Le tableau garni : tout sortir de la boîte, ranger, vue d'ensemble.
await page.goto(`${base}#enquete`);
await page.waitForSelector('#tb-vp');
await page.click('[data-action="tab-volet"][data-k="boite"]');
if (await page.locator('[data-action="tab-tout-sortir"]').count()) await page.click('[data-action="tab-tout-sortir"]');
await page.click('[data-action="tab-fit"]');
await shot('05-tableau-garni');
// Volets de pièces avec photo.
for (const f of ['c:dest', 'c:septieme', 'moy:4', 'c:direct', 'occ:4', 'c:labo1', 'x:sept', 'r:odile', 'Rb:4', 'occ:2', 'd:lettre']) {
  await action('tab-ouvrir', { tid: f });
  await page.waitForTimeout(450);
  if (await page.locator('.tb-volet').count()) await shot(`06-piece-${f.replace(':', '-')}`);
  await action('tab-fermer');
}
// La scène à fouiller.
await action('tab-ouvrir', { tid: 'scene' });
await page.waitForSelector('.sf');
await page.locator('.sf-plot[data-k="librairie"]').click({ force: true });
await shot('07-scene', true);
// La photo en plein écran : on la fait glisser, un plot reste cliquable.
await page.click('.sf-photo [data-action], .sf-loupe', { force: true }).catch(() => {});
await page.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'scene-zoom'; document.body.append(b); b.click(); b.remove(); });
await page.waitForSelector('.sf-zoom');
await page.locator('.sf-zoom .sf-plot[data-k="papier"]').click({ force: true });
await page.waitForSelector('.sf-zoom-bas');
await shot('07b-scene-zoom');
await page.click('[data-action="scene-dezoom"]');
await page.click('[data-action="scene-fermer"]');
// Hypothèse, coups de pouce, recoupement, frise, plan, suspect, confrontation.
await action('tab-ouvrir', { tid: 'hypo' }); await page.waitForTimeout(400); await shot('08-hypothese'); await action('tab-fermer');
await action('tab-ouvrir', { tid: 'pouce' }); await page.waitForTimeout(400);
await page.locator('[data-action="pouce-voir"]').first().click(); await shot('09-pouces'); await action('tab-fermer');
await action('tab-ouvrir', { tid: 'rec|c:direct' }); await page.waitForTimeout(400); await shot('10-recoupement'); await action('tab-fermer');
await action('tab-ouvrir', { tid: 'frise' }); await page.waitForTimeout(400);
for (const id of ['drache', 'helOut', 'natOut', 'rosine1', 'decouverte']) await action('frise-ev', { id });
await shot('11-frise'); await action('tab-fermer');
await action('tab-ouvrir', { tid: 'plan' }); await page.waitForTimeout(500); await shot('12-plan'); await action('tab-fermer');
await action('tab-ouvrir', { tid: 's4' }); await page.waitForTimeout(500); await shot('13-suspect-helene'); await action('tab-fermer');
await action('tab-ouvrir', { tid: 'X:4' }); await page.waitForTimeout(400);
for (const f of ['moy:4', 'x:sept', 'Rb:4']) await action('confront-piece', { f });
await action('mobile-choix', { m: '2' });
await shot('14-confrontation', true);

// Vue liste.
await page.click('.tb-haut [data-action="tab-vue"][data-v="liste"]').catch(() => {});
await page.waitForTimeout(400);
await shot('15-liste', true);

console.log(errors.length ? errors.join('\n') : 'Aucune erreur JavaScript.');
await browser.close();
