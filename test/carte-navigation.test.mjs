// Navigation autour du central (audit du 21 octobre) : vérifié dans le jeu réel (index.html, partie démo, téléphone 390 px).
//  1. la Carte s'ouvre sur « Ma zone » (le central), y compris après un rechargement ; #carte-nondroit et #terrain mènent au non-droit ;
//  2. aucune étiquette du calque Non-droit (« 🧱 9 ? », « +1🧱 »…) n'est dessinée sur la maquette de Ma zone ;
//  3. l'HP montre la ligne du central en direct, qui ouvre le central ;
//  4. patrouilles du soir dans les Ordres (#ordres-patrouilles, #nuit) : un toucher sur une case remplit le même brouillon
//     d'ordres que la Carte (la ligne « Patrouilles du soir » sous le central le montre aussi) ;
//  5. #classement-central ouvre l'onglet Central des Classements.
// Usage : node test/carte-navigation.test.mjs   (lance son propre petit serveur). Échoue (code 1) au moindre écart.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { try { pw = require('/opt/npm-tools/node_modules/playwright'); } catch (e2) { pw = require('/opt/node22/lib/node_modules/playwright'); } }

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const serveur = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const chemin = normalize(join(RACINE, p));
    if (!chemin.startsWith(RACINE)) throw new Error('hors racine');
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' }); res.end(await readFile(chemin));
  } catch (e) { res.writeHead(404); res.end(); }
});
await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${serveur.address().port}/?demo`;

const pb = [];
const verifier = (ok, msg) => { if (!ok) pb.push(msg); };
const b = await pw.chromium.launch();
try {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.addLocatorHandler(p.locator('.aide-wrap'), async () => { await p.evaluate(() => document.querySelectorAll('.aide-wrap').forEach((x) => x.remove())); });
  await p.goto(BASE); await p.click('[data-action="demo-start"]');
  await p.fill('[name="pseudo"]', 'Testeur'); await p.fill('[name="code"]', '9999'); await p.fill('[name="nom"]', 'Horizon');
  await p.click('[data-form="signup"] button[type="submit"]'); await p.waitForSelector('#countdown');
  { const pt = p.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) await pt.click(); }
  const clic = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (e) e.dispatchEvent(new MouseEvent('click', { bubbles: true })); return !!e; }, sel);
  const aller = async (h) => { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(500); };
  const calque = () => p.evaluate(() => { const e = document.querySelector('[data-action="carte-calque"][aria-selected="true"]'); return e ? e.dataset.v : null; });

  // 3. HP : la ligne du central.
  await aller('#hp'); await p.waitForSelector('.hp-central', { timeout: 5000 }).catch(() => {});
  const ligne = await p.evaluate(() => { const a = document.querySelector('.hp-central'); return a ? { href: a.getAttribute('href'), txt: a.textContent.replace(/\s+/g, ' ').trim() } : null; });
  verifier(ligne && ligne.href === '#carte-mazone' && /^Central/.test(ligne.txt), `HP : ligne du central absente ou mal reliée (${JSON.stringify(ligne)})`);

  // 1. Carte : Ma zone par défaut.
  await aller('#carte');
  verifier(await calque() === 'mazone', `#carte ouvre « ${await calque()} » au lieu de Ma zone`);
  verifier(!!(await p.$('.cx-tete')), 'Ma zone : le central n’est pas affiché');
  // 2. Pas d'étiquette du non-droit sur la maquette de Ma zone (le rendu réel, texte par texte).
  const intrus = await p.evaluate(() => [...document.querySelectorAll('.cx-carte svg text')].map((t) => t.textContent.trim()).filter((t) => /🧱|🔨|⚔|🛡/.test(t)));
  verifier(!intrus.length, `Ma zone : étiquettes du non-droit dessinées sur la maquette (${intrus.slice(0, 4).join(' | ')})`);
  await aller('#carte-nondroit');
  verifier(await calque() === 'nondroit', `#carte-nondroit ouvre « ${await calque()} »`);
  await aller('#hp'); await aller('#terrain');
  verifier(await calque() === 'nondroit', `#terrain ouvre « ${await calque()} »`);

  // 4. Patrouilles du soir dans les Ordres.
  await aller('#ordres-patrouilles');
  verifier(!!(await p.$('#ord-patrouilles .cv-fiche')), '#ordres-patrouilles : la fiche du quartier n’est pas ouverte dans les Ordres');
  const nbQ = (await p.$$('#ord-patrouilles .cv-ql')).length;
  verifier(nbQ > 0, 'Ordres : pas de liste des quartiers');
  const avant = await p.$eval('#ord-patrouilles .op-t span', (e) => e.textContent).catch(() => '');
  const caseOk = await clic('#ord-patrouilles .cv-case[data-n="1"]:not([disabled])');
  await p.waitForTimeout(300);
  if (caseOk) {
    const apres = await p.$eval('#ord-patrouilles .op-t span', (e) => e.textContent).catch(() => '');
    verifier(/^1 patrouille/.test(apres) && apres !== avant, `Ordres : la case n’a pas envoyé de patrouille (« ${avant} » → « ${apres} »)`);
    verifier(!!(await p.$('#ord-patrouilles .cv-fiche')), 'Ordres : la partie Patrouilles s’est refermée après un toucher');
    verifier(!!(await p.$('.savebar [data-action="save-orders"]')), 'Ordres : pas de barre « Valider » après une patrouille');
    await aller('#carte-mazone'); // #terrain plus haut a laissé le non-droit choisi pour la session
    const lien = await p.$eval('.cv-liens a[href="#ordres-patrouilles"]', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
    verifier(/1 patrouille/.test(lien), `Carte : la ligne « Patrouilles du soir » ne voit pas la patrouille des Ordres (« ${lien} »)`);
  } else pb.push('Ordres : aucune case de patrouille utilisable (pas d’agent en Proximité ?)');
  await aller('#hp'); await aller('#nuit');
  verifier(!!(await p.$('#ord-patrouilles .cv-fiche')), '#nuit : n’ouvre pas les patrouilles dans les Ordres');

  // 5. Classements : onglet Central.
  await aller('#classement-central');
  const onglet = await p.$eval('.crs-tabs [aria-selected="true"]', (e) => e.textContent.trim()).catch(() => '');
  verifier(/Central/.test(onglet), `#classement-central ouvre l’onglet « ${onglet} »`);

  // 1 bis. Après rechargement, la Carte revient sur Ma zone même si on était sur le non-droit.
  await aller('#carte-nondroit');
  await p.reload(); await p.waitForSelector('#countdown, nav.tabs', { timeout: 15000 }).catch(() => {});
  { const pt = p.locator('[data-action="chef-plus-tard"]'); if (await pt.count()) await pt.click(); }
  await aller('#hp'); await aller('#carte');
  verifier(await calque() === 'mazone', `après rechargement, #carte ouvre « ${await calque()} »`);

  verifier(!erreurs.length, `erreurs JavaScript : ${erreurs.slice(0, 3).join(' | ')}`);
} finally { await b.close(); serveur.close(); }

if (pb.length) { console.error(`ÉCHEC navigation (${pb.length}) :\n - ${pb.join('\n - ')}`); process.exit(1); }
console.log('Navigation autour du central : OK (calque par défaut, non-droit hors de Ma zone, ligne HP, patrouilles dans les Ordres, classement du central)');
