// Retour de Luc (14 oct. 2026) : en retirant ou en changeant un renfort prêté, ses agents atterrissaient
// d'office en Intervention au lieu de redevenir libres (comme « Rapatrier »).
// Ce test clique sur les vrais boutons du renfort dans la page des Ordres de la partie démo et lit
// les chiffres affichés (Intervention, agents sans affectation).
// Usage : servir le dossier (http-server -p 8765 -c-1 .) puis node test/renfort-pret.browser.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8765/?demo';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
await page.addLocatorHandler(page.locator('.aide-wrap'), async () => { await page.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });

await page.goto(BASE);
await page.waitForSelector('[data-action="demo-start"]');
await page.click('[data-action="demo-start"]');
await page.waitForSelector('[data-form="signup"]');
await page.fill('[name="pseudo"]', 'Luc'); await page.fill('[name="code"]', '5324'); await page.fill('[name="nom"]', 'Test');
await page.click('[data-form="signup"] button[type="submit"]');
await page.waitForSelector('#countdown');
{ const pt = page.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) await pt.click(); }

// Deux zones robots avec une opération d'envergure en cours ce soir (comme les appels de Luc dans la Radio).
const [botA, botB] = await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('mazp-demo-v3'));
  const st = db.parties[db.current].state;
  const bots = Object.keys(st.zones).filter((u) => u !== 'moi').slice(0, 2);
  for (const u of bots) st.zones[u].operation = { id: 'otages', titre: 'Prise d’otages (test)', texte: '', besoins: { intervention: 5 }, duree: 1, recompense: 10, tourDebut: st.turn, couvertures: [] };
  localStorage.setItem('mazp-demo-v3', JSON.stringify(db));
  return bots;
});
await page.goto(`${BASE}#hp`); await page.reload(); await page.waitForSelector('#countdown');
await page.goto(`${BASE}#ordres`);
await page.waitForSelector('[data-action="alloc"][data-s="intervention"]');

// Boutons du renfort (ceux de la Radio) injectés dans la page des Ordres : même action, même gestionnaire.
const clic = async (uid, d) => {
  await page.evaluate(([u, dd]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.action = 'renfort-n'; b.dataset.uid = u; b.dataset.d = String(dd); b.id = 'test-renfort';
    document.body.appendChild(b); b.click(); b.remove();
  }, [uid, d]);
  await page.waitForTimeout(150);
};
const lire = async () => page.evaluate(() => {
  const n = (s) => Number(document.querySelector(`[data-action="alloc"][data-s="${s}"]`).parentElement.querySelector('.n').textContent);
  const services = ['intervention', 'proximite', 'recherche', 'roulage', 'admin'];
  return { inter: n('intervention'), total: services.reduce((a, s) => a + n(s), 0) };
});

const problemes = [];
const depart = await lire();
// Prêter 2 agents à la zone A : ils quittent les services.
await clic(botA, 1); await clic(botA, 1);
const prete = await lire();
if (prete.total !== depart.total - 2) problemes.push(`Prêter 2 agents : services ${depart.total} → ${prete.total} (attendu ${depart.total - 2})`);
// En retirer un : il doit redevenir libre, pas aller en Intervention.
await clic(botA, -1);
const retire = await lire();
if (retire.inter !== prete.inter) problemes.push(`Retirer un agent du renfort : Intervention ${prete.inter} → ${retire.inter} (il doit redevenir libre)`);
// Changer de zone : l'agent prévu pour A part vers B, rien ne bascule en Intervention.
await clic(botB, 1);
const change = await lire();
if (change.inter !== retire.inter) problemes.push(`Changer de zone : Intervention ${retire.inter} → ${change.inter} (attendu inchangé)`);

await browser.close();
if (erreurs.length) problemes.push(...erreurs.map((e) => `Erreur JS : ${e}`));
if (problemes.length) { console.log(`${problemes.length} problème(s) :\n- ${problemes.join('\n- ')}`); process.exit(1); }
console.log('Renfort prêté : les agents retirés redeviennent libres, aucun ne bascule en Intervention. 0 problème.');
