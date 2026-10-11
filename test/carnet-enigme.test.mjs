// Carnet des énigmes sur téléphone, clavier ouvert : l'énoncé doit rester visible et atteignable au-dessus du carnet.
// Usage : servir le dossier (port 8765) puis node test/carnet-enigme.test.mjs ["http://127.0.0.1:8765/?demo"]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8765/?demo';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
await p.addLocatorHandler(p.locator('.aide-wrap'), async () => { await p.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
await p.goto(BASE);
await p.click('[data-action="demo-start"]');
await p.fill('[name="pseudo"]', 'Bryan'); await p.fill('[name="code"]', '5324'); await p.fill('[name="nom"]', 'H');
await p.click('[data-form="signup"] button[type="submit"]');
await p.waitForSelector('#countdown');
{ const pt = p.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) await pt.click(); }
await p.goto(BASE.replace(/#.*$/, '') + '#quete'); await p.waitForSelector('.carnet-b');
await p.evaluate(() => document.querySelectorAll('.bs-voile,.bs,.toast').forEach((x) => x.remove()));
await p.click('.carnet-b');
await p.click('.carnet-p textarea'); await p.keyboard.type('C d e B a f');
await p.setViewportSize({ width: 412, height: 420 }); // clavier ouvert
await p.waitForTimeout(300);
const pb = [];
const mesure = () => p.evaluate(() => {
  const nav = document.querySelector('nav.tabs');
  return { top: document.querySelector('.carnet-p').getBoundingClientRect().top, ih: innerHeight, nav: nav && getComputedStyle(nav).display !== 'none',
    titre: document.querySelector('.feuille h1').getBoundingClientRect().top, fin: document.querySelector('.fe-rep').getBoundingClientRect().bottom };
});
let m = await mesure();
if (m.nav) pb.push('la barre d’onglets reste par-dessus le carnet');
if (m.top < m.ih * 0.35) pb.push(`le carnet couvre presque tout l’écran visible (haut à ${Math.round(m.top)} px sur ${m.ih})`);
await p.evaluate(() => document.querySelector('.feuille h1').scrollIntoView({ block: 'start' })); m = await mesure();
if (m.titre < 0 || m.titre > m.top) pb.push('impossible de remonter jusqu’au titre de l’énigme au-dessus du carnet');
await p.evaluate(() => window.scrollTo(0, 1e6)); m = await mesure();
if (m.fin > m.top + 2) pb.push(`le bas de l’énoncé reste caché sous le carnet (${Math.round(m.fin)} > ${Math.round(m.top)})`);
await b.close();
if (pb.length) { console.log('ÉCHEC :\n- ' + pb.join('\n- ')); process.exit(1); }
console.log('Carnet : énoncé lisible au-dessus, clavier ouvert — OK');
