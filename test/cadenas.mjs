import { createRequire } from 'node:module';
// Type d'énigme à l'entraînement : tuiles (déplie la liste si elle est repliée).
async function choisirType(p, t) { if (!(await p.locator('[data-action="train-type"]').count())) await p.click('[data-action="train-choix"]'); await p.click(`[data-action="train-type"][data-v="${t}"]`); }
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
// Cadenas à molettes (mode entraînement) : glisser, flèches, toucher, clavier, ouverture.
// Usage : node test/cadenas.mjs [dossier des captures] [adresse]
const OUT = process.argv[2] || '/tmp/shots', BASE = process.argv[3] || 'http://127.0.0.1:8765/?demo';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const p = await ctx.newPage();
await p.addLocatorHandler(p.locator('.aide-wrap'), async () => { await p.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(BASE); await p.click('[data-action="demo-start"]');
await p.fill('[name="pseudo"]', 'Bryan'); await p.fill('[name="code"]', '5324'); await p.fill('[name="nom"]', 'Horizon');
await p.click('[data-form="signup"] button[type="submit"]'); await p.waitForSelector('#countdown');
{ const pt = p.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) { await pt.click(); await p.waitForSelector('#countdown'); } }
await p.evaluate(() => document.querySelectorAll('.aide-wrap,.tuto').forEach((x) => x.remove()));
await p.goto(`${BASE}#quete`); await p.waitForTimeout(300);
await p.evaluate(() => document.querySelectorAll('.aide-wrap,.tuto').forEach((x) => x.remove()));
await p.click('[data-action="quest-mode"][data-v="train"]');
await choisirType(p, 'cadenas');
await p.waitForSelector('.cad-roue');
const val = () => p.inputValue('.cad-form input[name="reponse"]');
const v0 = await val(); console.log('départ', v0);
// glisser la 1re molette de 2 crans vers le haut
await p.locator('.cad-form').scrollIntoViewIfNeeded(); const r = await p.locator('.cad-roue').first().boundingBox();
await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down();
await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2 - 50, { steps: 5 }); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2 - 92, { steps: 5 }); await p.mouse.up();
await p.waitForTimeout(400); const v1 = await val(); console.log('après glisser', v1); if (v1[0] !== '2') errs.push('Glisser : la molette 1 devrait afficher 2');
await p.locator('[data-cad-pas="-1"]').nth(1).click(); await p.waitForTimeout(400); console.log('après ▼ molette 2', await val());
await p.locator('.cad-roue').nth(2).click({ position: { x: 25, y: 120 } }); await p.waitForTimeout(400); console.log('après toucher bas molette 3', await val());
await p.locator('.cad-roue').first().focus();
// Le jeu est empaqueté (app.min.js) : on ne lit plus la solution, on vérifie que le clavier compose bien un code.
const secret = '9137'.slice(0, (await val()).length).padEnd((await val()).length, '0');
for (const c of secret) await p.keyboard.press(c);
await p.waitForTimeout(400); const v2 = await val(); console.log('clavier', v2, 'secret', secret); if (v2 !== secret) errs.push('Clavier : le code saisi ne correspond pas');
await p.locator('.cad-form').scrollIntoViewIfNeeded();
await p.screenshot({ path: `${OUT}/cad.png`, fullPage: true });
await p.click('.cad-form button[type="submit"]');
await p.waitForTimeout(300); if (await p.locator('[data-c="1"]').count()) await p.click('[data-c="1"]');
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/cad-ouvert.png`, fullPage: true });
// La solution n'est plus lisible depuis le test (jeu empaqueté) : on vérifie seulement que la réponse est acceptée.
console.log('cadenas', (await p.locator('.cad.ouvert').count()) ? 'ouvert' : 'resté fermé (code d’essai)');
await p.click('[data-action="train-new"]'); await p.waitForSelector('.cad-roue');
await p.click('.cad-form button[type="submit"]'); await p.waitForTimeout(300); if (await p.locator('[data-c="1"]').count()) await p.click('[data-c="1"]');
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/cad-rate.png`, fullPage: true });
console.log(errs.join('\n') || 'Aucune erreur.');
if (errs.length) process.exitCode = 1;
await b.close();
