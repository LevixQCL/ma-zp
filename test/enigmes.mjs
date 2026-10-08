import { createRequire } from 'node:module';
// Type d'énigme à l'entraînement : tuiles (déplie la liste si elle est repliée).
async function choisirType(p, t) { if (!(await p.locator('[data-action="train-type"]').count())) await p.click('[data-action="train-choix"]'); await p.click(`[data-action="train-type"][data-v="${t}"]`); }
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
// Énigmes visuelles (mode entraînement) : chaque type s'affiche sans erreur, et les manipulations marchent.
// Usage : node test/enigmes.mjs [dossier des captures] [adresse] [difficulté]
const OUT = process.argv[2] || '/tmp/shots', BASE = process.argv[3] || 'http://127.0.0.1:8765/?demo';
const types = ['quiment', 'grille', 'cadenas', 'chronologie', 'code', 'plaque', 'photos', 'filature', 'butin', 'horaires', 'ecriture'], diff = process.argv[4] || '3';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.addLocatorHandler(p.locator('.aide-wrap'), async () => { await p.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts|Failed to load/.test(m.text())) errs.push(m.text()); });
await p.goto(BASE); await p.click('[data-action="demo-start"]');
await p.fill('[name="pseudo"]', 'Bryan'); await p.fill('[name="code"]', '5324'); await p.fill('[name="nom"]', 'Horizon');
await p.click('[data-form="signup"] button[type="submit"]'); await p.waitForSelector('#countdown');
await p.goto(`${BASE}#quete`); await p.waitForTimeout(300);
await p.click('[data-action="quest-mode"][data-v="train"]');
await choisirType(p, types[0]); await p.click(`[data-action="train-diff"][data-v="${diff}"]`);
for (const t of types) {
  await choisirType(p, t); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((x) => x.remove()));
  await p.locator('h1.big').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/${t}-${diff}.png`, fullPage: true });
}

// Manipulations

  // Chronologie : glisser la dernière carte en premier
  await choisirType(p, 'chronologie'); await p.waitForTimeout(300);
  const v0 = await p.inputValue('.chr input[name="reponse"]');
  await p.locator('.chr').scrollIntoViewIfNeeded();
  const last = p.locator('.chr-carte').last().locator('.chr-poignee');
  const first = await p.locator('.chr-carte').first().boundingBox();
  const lb = await last.boundingBox();
  await p.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2); await p.mouse.down();
  await p.mouse.move(lb.x + lb.width / 2, first.y + 5, { steps: 20 }); await p.mouse.up();
  const v1 = await p.inputValue('.chr input[name="reponse"]');
  console.log('chrono', v0, '->', v1);
  if (v1[0] !== v0[v0.length - 1]) errs.push('Chronologie : le glisser ne réordonne pas');
  await p.locator('.chr-carte').nth(1).locator('[data-chr="1"]').click();
  console.log('chrono flèche', await p.inputValue('.chr input[name="reponse"]'));
  await p.screenshot({ path: `${OUT}/chrono-apres.png`, fullPage: true });
  // Disque : tourner d'un quart de tour
  await choisirType(p, 'code'); await p.waitForTimeout(300);
  await p.locator('svg.dq').scrollIntoViewIfNeeded();
  const d = await p.locator('svg.dq').boundingBox();
  const cx = d.x + d.width / 2, cy = d.y + d.height / 2, R = d.width * 0.32;
  await p.mouse.move(cx, cy - R); await p.mouse.down();
  for (let a = 0; a <= 90; a += 10) { const t = (a - 90) * Math.PI / 180; await p.mouse.move(cx + R * Math.cos(t), cy + R * Math.sin(t)); }
  await p.mouse.up(); await p.waitForTimeout(400);
  const k = await p.locator('.dq-k').textContent();
  console.log('disque', k, await p.locator('.dq-ks').textContent());
  if (k === 'A') errs.push('Disque : ne tourne pas');
  await p.click('.dq-carte [data-action="roue"][data-d="1"]'); await p.waitForTimeout(300);
  console.log('disque +1', await p.locator('.dq-ks').textContent());
  await p.screenshot({ path: `${OUT}/disque-apres.png`, fullPage: true });
  // Plaque : rayer, choisir
  await choisirType(p, 'plaque'); await p.waitForTimeout(300);
  await p.locator('.pl-x').first().click(); await p.locator('.pl').nth(1).click(); await p.waitForTimeout(200);
  if (!(await p.locator('.pl-item.raye').count())) errs.push('Plaque : rayer ne marche pas');
  if (!(await p.locator('.pl[aria-pressed="true"]').count())) errs.push('Plaque : choix impossible');
  await p.locator('.pl-grille').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/plaque-apres.png` });
  // Qui ment : marques
  await choisirType(p, 'quiment'); await p.waitForTimeout(300);
  await p.locator('.tem-marque').first().click(); await p.locator('.tem-marque').nth(1).click(); await p.locator('.tem-marque').nth(1).click();
  await p.locator('.tem-liste').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/quiment-apres.png` });


  await choisirType(p, 'filature'); await p.waitForTimeout(300);
  await p.locator('.fi-plan').scrollIntoViewIfNeeded();
  const xs = p.locator('.fi-x');
  for (const k of [7, 12, 13]) { await p.evaluate((k) => document.querySelectorAll('.fi-x')[k].dispatchEvent(new MouseEvent('click', { bubbles: true })), k); await p.waitForTimeout(100); }
  const pts = await p.getAttribute('.fi-trace', 'points');
  console.log('tracé', pts);
  if (pts.split(' ').length < 4) errs.push('Filature : le tracé ne s’ajoute pas');
  await p.locator('.fi-lieu').first().click({ force: true }); await p.waitForTimeout(200);
  if (!(await p.locator('.fi-lieu[data-sel]').count())) errs.push('Filature : toucher un lieu ne le choisit pas');
  await p.locator('.fi-plan').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/filature-apres.png` });
  await choisirType(p, 'photos'); await p.waitForTimeout(300);
  await p.locator('.ph-hit').nth(2).click({ force: true }); await p.waitForTimeout(200);
  if (!(await p.locator('.ph-hit[data-sel]').count())) errs.push('Photos : toucher une place ne la choisit pas');
  await p.locator('.ph-hit[data-sel]').first().scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/photos-apres.png` });
  await choisirType(p, 'ecriture'); await p.waitForTimeout(300);
  await p.locator('.ec-t').first().click(); await p.locator('.ec-t').nth(1).click(); await p.locator('.ec-t').nth(1).click();
  await p.locator('.ec-pick').nth(1).click(); await p.waitForTimeout(200);
  if (!(await p.locator('.ec-ech.sel').count())) errs.push('Écriture : choix impossible');
  await p.locator('.ec-ech.sel').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/ecriture-apres.png` });
  await choisirType(p, 'butin'); await p.waitForTimeout(300);
  await p.locator('[data-bt]').first().fill('450');
  const ans = await p.evaluate(async () => (await import('/js/ui/common.js')).S.train.answer);
  await p.fill('.bt input[name="reponse"]', ans);
  await p.click('.bt button[type="submit"]'); await p.waitForTimeout(400);
  if (!(await p.locator('.card.green').count())) errs.push('Butin : la bonne réponse n’est pas acceptée');
  await p.screenshot({ path: `${OUT}/butin-apres.png`, fullPage: true });
  await choisirType(p, 'horaires'); await p.waitForTimeout(300);
  await p.locator('.hb-trajet').nth(1).click(); await p.waitForTimeout(200);
  if (!(await p.locator('.hb-trajet[aria-pressed="true"]').count())) errs.push('Horaires : choix impossible');
  await p.locator('.hb-trajet[aria-pressed="true"]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/horaires-apres.png` });
  // Chronologie : bonne réponse via les flèches
  await choisirType(p, 'chronologie'); await p.waitForTimeout(300);
  const bon = await p.evaluate(async () => (await import('/js/ui/common.js')).S.train.answer);
  for (let i = 0; i < bon.length; i++) {
    let cur = await p.inputValue('.chr input[name="reponse"]');
    let j = cur.indexOf(bon[i]);
    while (j > i) { await p.locator('.chr-carte').nth(j).locator('[data-chr="-1"]').click(); j--; }
  }
  await p.click('.chr button[type="submit"]'); await p.waitForTimeout(400);
  if (!(await p.locator('.card.green').count())) errs.push('Chronologie : la bonne réponse n’est pas acceptée');

console.log(errs.join('\n') || 'Aucune erreur.');
if (errs.length) process.exitCode = 1;
await b.close();
