// Parcours complet du mode démo dans un vrai navigateur, avec captures d'écran.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const OUT = process.argv[2] || '/tmp/shots';
const BASE = process.argv[3] || 'http://127.0.0.1:8765/';
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });

// Fenêtres d'aide ou de nouveautés qui s'ouvrent d'elles-mêmes : on les ferme dès qu'elles gênent un clic.
await page.addLocatorHandler(page.locator('.aide-wrap'), async () => { await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });

const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };

await page.goto(BASE);
await page.waitForSelector('[data-action="demo-start"]');
await shot('01-login');
await page.click('[data-action="demo-start"]');
await page.waitForSelector('[data-form="signup"]');
await page.fill('[name="pseudo"]', 'Bryan');
await page.fill('[name="code"]', '5324');
await page.fill('[name="nom"]', 'Horizon');
await shot('02-inscription');
await page.click('[data-form="signup"] button[type="submit"]');
await page.waitForSelector('#countdown');
await shot('03-hp');

await page.click('a[href="#ordres"] >> nth=-1');
await page.waitForSelector('[data-action="alloc"][data-s="intervention"][data-d="1"]');
await page.click('[data-action="alloc"][data-s="intervention"][data-d="1"]');
await page.click('[data-action="alloc"][data-s="intervention"][data-d="1"]');
await page.click('[data-action="rythme"][data-v="renforce"]');
await page.click('[data-action="ord-open"][data-k="nondroit"]');
const engBtn = page.locator('[data-action="eng"][data-d="1"]').first();
if (await engBtn.count()) { await engBtn.click(); await engBtn.click(); await engBtn.click(); }
await page.click('[data-action="ord-open"][data-k="decision"]');
await shot('04-ordres-decision');
await page.locator('.dtuile[data-action="decision"]:not([disabled])').first().click();
await page.click('.savebar [data-action="save-orders"]');
await page.waitForSelector('.card.green');
await shot('05-ordres-valides');

await page.goto(`${BASE}#quete`);
await page.waitForSelector('.kicker');
await shot('06-quete');

await page.goto(`${BASE}#carte`);
await page.waitForSelector('svg[role="img"]');
await shot('07-carte');
// Quartiers : toucher un quartier, envoyer une patrouille, la déplacer.
await page.locator('polygon[data-action="quartier"]').first().click({ force: true });
await page.waitForSelector('.qrow.sel');
await page.locator('.qrow [data-action="patrouille"][data-d="1"]:not([disabled])').first().click();
if ((await page.locator('.qrow .stepper .n', { hasText: /^[1-9]/ }).count()) < 1) errors.push('Quartiers : la patrouille n’est pas affectée');
await shot('07b-carte-patrouille');
await page.goto(`${BASE}#radio`);
await page.fill('#radio-msg', 'Salut le district, qui fait équipe sur le trafic ?');
await page.click('[data-form="radio"] button');
await shot('08-radio');

// Faire avancer plusieurs tours
await page.goto(`${BASE}#hp`);
for (let i = 0; i < 4; i++) {
  await page.waitForSelector('[data-action="demo-next"]');
  await page.click('[data-action="demo-next"]');
  await page.waitForTimeout(600);
}
await page.waitForSelector('#countdown');
await page.click('[data-action="toggle-rapport"]');
await shot('09-hp-apres-tours');
await page.goto(`${BASE}#gazette`);
await page.waitForSelector('.paper');
await shot('10-gazette');
await page.goto(`${BASE}#classement`);
await shot('11-classement');
await page.goto(`${BASE}#profil`);
await shot('12-profil');
await page.goto(`${BASE}#admin`);
await shot('13-admin');

// Enquête : constatation, vérification ciblée, tableau MMO, accusation, notes.
await page.goto(`${BASE}#enquete`);
await page.waitForSelector('h1.big');
await shot('16-enquete-suspects');
await page.click('[data-action="enq-tab"][data-t="scene"]');
await page.waitForSelector('.constat');
await shot('16b-enquete-scene');
await page.click('[data-action="enq-tab"][data-t="suspects"]');
await page.locator('[data-action="enq-open"]').first().click();
await page.waitForSelector('.suspect .dem-row');
await page.locator('button.dem[data-action="dem-toggle"]:not([disabled])').first().click();
await page.locator('button.dem[data-action="dem-toggle"]:not([disabled]):not([aria-pressed="true"])').first().click();
if ((await page.locator('[data-action="dem-toggle"][aria-pressed="true"]').count()) !== 2) errors.push('Enquête : les deux démarches ne sont pas demandées');
await page.locator('[data-action="mmo-mark"]').first().click();
await page.locator('[data-action="mmo-mark"]').nth(1).click();
await page.locator('[data-action="mmo-mark"]').nth(1).click();
if ((await page.locator('.mmo.m-x').count()) !== 1 || (await page.locator('.mmo.m-ok').count()) !== 1) errors.push('Enquête : les cases du tableau ne se cochent pas');
await shot('17-enquete-suspect-ouvert');
await page.locator('[data-action="accuser"]').first().click();
await page.waitForSelector('[data-c="1"]');
await page.click('[data-c="1"]');
await page.waitForSelector('[data-action="accuser-annuler"]');
await shot('18-accusation-prete');
await page.click('[data-action="enq-tab"][data-t="notes"]');
await page.fill('#carnet-notes', 'Comparer les heures des alibis.');
await page.click('[data-action="enq-tab"][data-t="pieces"]');
const partage = page.locator('[data-action="partage"]').first();
if (await partage.count()) await partage.click();
await shot('19-enquete-pieces');
await page.click('[data-action="enq-tab"][data-t="planques"]');
await page.waitForSelector('[data-action="carnet-mark"][data-t="p"]');
await page.click('[data-action="enq-tab"][data-t="notes"]');
if ((await page.inputValue('#carnet-notes')) !== 'Comparer les heures des alibis.') errors.push('Notes du carnet perdues');
await page.click('[data-action="enq-tab"][data-t="suspects"]');
await page.click('.savebar [data-action="save-orders"]');
await page.waitForTimeout(300);
if (await page.locator('.savebar').count()) errors.push('Choix d’enquête non enregistrés');
// Faire tourner quelques tours pour voir une découverte, une traque et des FIPA.
let vuTraque = false, vuFipa = false;
for (let i = 0; i < 12 && !(vuTraque && vuFipa); i++) {
  await page.goto(`${BASE}#hp`);
  await page.click('[data-action="demo-next"]');
  await page.waitForTimeout(500);
  if (!vuFipa && await page.locator('section[aria-label^="FIPA"], section[aria-label^="Invitation FIPA"]').count()) { vuFipa = true; await shot('20-hp-fipa'); }
  await page.goto(`${BASE}#enquete`);
  await page.waitForSelector('h1.big');
  if (!vuTraque && await page.locator('[aria-label="Traque en cours"]').count()) {
    vuTraque = true;
    await page.locator('[data-action="traque-planque"]').first().click();
    await shot('21-traque');
  }
}
console.log('Traque vue :', vuTraque, '· FIPA vue :', vuFipa);
await page.goto(`${BASE}#gazette`);
await page.waitForSelector('.paper');
await shot('22-gazette-enquete');

// Diplomatie : manœuvre, entraide, duel.
await page.goto(`${BASE}#diplomatie`);
await page.waitForSelector('[data-action="diplo-open"][data-k="man"]');
await page.click('[data-action="diplo-open"][data-k="man"]');
await page.click('[data-action="man-type"][data-v="poste"]');
await page.waitForSelector('[data-change="man-cible"]');
const opt = await page.$$eval('[data-change="man-cible"] option:not([disabled])', (o) => o.map((x) => x.value).filter(Boolean));
if (opt.length) await page.selectOption('[data-change="man-cible"]', opt[0]);
await page.click('[data-action="diplo-open"][data-k="aide"]');
await page.selectOption('[data-change="aide-cible"]', { index: 1 });
await page.click('[data-action="aide-n"][data-k="budget"][data-d="1"]');
await page.click('[data-action="aide-n"][data-k="budget"][data-d="1"]');
await shot('26-diplomatie');
await page.click('.savebar [data-action="save-orders"]');
await page.waitForTimeout(300);
// Péril : on force un budget très négatif dans la partie démo, puis on passe un tour.
await page.evaluate(() => { const db = JSON.parse(localStorage.getItem('mazp-demo-v2')); db.parties[db.current].state.zones.moi.budget = -60; localStorage.setItem('mazp-demo-v2', JSON.stringify(db)); });
await page.goto(`${BASE}#hp`); await page.reload();
await page.waitForSelector('[data-action="demo-next"]');
await page.click('[data-action="demo-next"]');
await page.waitForTimeout(600);
// Si ce tour était le dernier de la saison, tout repart à zéro (budget compris) : pas de péril à vérifier.
const nouvelleSaison = await page.evaluate(() => { const db = JSON.parse(localStorage.getItem('mazp-demo-v2')); return db.parties[db.current].state.turn === 1; });
if (!nouvelleSaison && !(await page.locator('[aria-label="Zone en péril"]').count())) errors.push('Bandeau de péril absent');
await shot('27-hp-peril');
await page.goto(`${BASE}#gazette`);
await page.waitForSelector('.chantier');
await shot('28-gazette-compteur');

// Plusieurs parties : créer, ouvrir, revenir.
await page.goto(`${BASE}#parties`);
await page.waitForSelector('[data-form="party-create"]');
await shot('29-parties');
await page.fill('[data-form="party-create"] [name="nom"]', 'Brigade de nuit');
await page.click('[data-form="party-create"] button[type="submit"]');
await page.waitForSelector('[data-form="signup"]');
await page.fill('[name="pseudo"]', 'Bryan');
await page.fill('[name="code"]', '7777');
await page.fill('[name="nom"]', 'Nuit');
await page.click('[data-form="signup"] button[type="submit"]');
await page.waitForSelector('#countdown');
if (!(await page.locator('text=Brigade de nuit').count())) errors.push('Nom de la nouvelle partie absent de l’HP');
await shot('30-hp-nouvelle-partie');
await page.goto(`${BASE}#parties`);
await page.click('[data-action="party-open"]');
await page.waitForSelector('#countdown');
if (!(await page.locator('text=Partie de démonstration').count())) errors.push('Retour à la partie de démo impossible');
await page.goto(`${BASE}#admin`);
await page.waitForSelector('text=Inviter des collègues');
await shot('31-admin-invitation');

// Guide du joueur : sections, lien direct et recherche.
await page.goto(`${BASE}#guide`);
await page.waitForSelector('details.gsec');
if ((await page.locator('details.gsec').count()) < 10) errors.push('Guide incomplet');
await shot('23-guide');
await page.goto(`${BASE}#guide-enquete`);
await page.waitForSelector('#g-enquete[open]');
await shot('24-guide-enquete');
await page.goto(`${BASE}#guide`);
await page.waitForSelector('#guide-q');
await page.type('#guide-q', 'traque');
await page.waitForTimeout(200);
if ((await page.inputValue('#guide-q')) !== 'traque') errors.push('Recherche du guide : saisie perdue');
if (!(await page.locator('details.gsec[open]').count())) errors.push('Recherche du guide : aucun résultat');
await shot('25-guide-recherche');

// Quête : tester les différents types en avançant les tours
const types = new Set();
for (let i = 0; i < 7; i++) {
  await page.goto(`${BASE}#quete`);
  await page.waitForSelector('h1.big');
  const t = await page.locator('h1.big').innerText();
  if (!types.has(t)) { types.add(t); await shot(`14-quete-${types.size}`); }
  // Outils : grille à cocher, roue de décodage, brouillon
  if (await page.locator('.gcell').count()) {
    await page.locator('.gcell').first().click(); await page.waitForTimeout(100);
    if ((await page.locator('.gcell').first().innerText()) !== '✗') errors.push('Grille : la case ne se coche pas');
    await shot('14b-grille-cochee');
  }
  if (await page.locator('.dq-carte [data-action="roue"]').count()) {
    await page.locator('.dq-carte [data-action="roue"][data-d="1"]').click(); await page.waitForTimeout(150);
    { const r = await page.locator('.dq-ks').textContent(); if (r !== 'décalage 1') errors.push(`Disque : le décalage ne change pas (${JSON.stringify(r)})`); }
  }
  if (await page.locator('[data-qnote]').count()) await page.fill('[data-qnote]', 'essai');
  // Répond au hasard pour vérifier le flux
  const choice = page.locator('[data-action="quest-pick"]').first();
  if (await choice.count()) { await choice.click(); await page.click('[data-action="quest-submit"]'); }
  else if (await page.locator('.chr button[type="submit"]').count()) { await page.locator('.chr-carte').nth(1).locator('[data-chr="-1"]').click(); await page.click('.chr button[type="submit"]'); }
  else if (await page.locator('.bt button[type="submit"]').count()) { await page.fill('.bt input[name="reponse"]', '100'); await page.click('.bt button[type="submit"]'); }
  else if (await page.locator('.cad-form button[type="submit"]').count()) { await page.locator('[data-cad-pas="1"]').first().click(); await page.click('.cad-form button[type="submit"]'); }
  else if (await page.locator('#qtext').count()) { await page.fill('#qtext', (await page.getAttribute('#qtext', 'placeholder')) || 'PONT'); await page.click('[data-form="quest-text"] button'); }
  await page.waitForSelector('[data-c="1"]');
  if (i === 0) await shot('15a-confirmation');
  await page.click('[data-c="1"]');
  await page.waitForTimeout(200);
  // Après la réponse, plus aucun choix ne doit être possible.
  if (await page.locator('[data-action="quest-submit"]').count()) errors.push('La quête accepte encore une réponse');
  if (i === 0) await shot('15-quete-apres-reponse');
  await page.goto(`${BASE}#hp`);
  await page.click('[data-action="demo-next"]');
  await page.waitForTimeout(500);
}
console.log('Types vus :', [...types].join(', '));
console.log(errors.length ? `ERREURS :\n${errors.join('\n')}` : 'Aucune erreur JavaScript.');
await browser.close();
