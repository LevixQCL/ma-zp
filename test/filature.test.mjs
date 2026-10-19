// Mini-jeu Filature : grilles justes à tous les niveaux et jeu jouable de bout en bout.
// Vérifie, dans la page réelle (minijeux/filature.html) :
//  1. pour une série de niveaux du Challenge, la grille générée a une solution unique et les chiffres affichés
//     comptent exactement les tuiles du trajet, ligne par ligne et colonne par colonne ;
//  2. la zone qu'on touche est la tuile dessinée (même rectangle pour le dessin et le toucher) ;
//  3. en glissant le long du trajet, les tuiles se retournent vraiment à l'écran (pixel lu sur le canevas) et le niveau est réussi ;
//  4. trois fausses pistes font rater le niveau.
// Usage : node test/filature.test.mjs   (lance son propre petit serveur). Échoue (code 1) au moindre écart.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { try { pw = require('/opt/npm-tools/node_modules/playwright'); } catch (e2) { pw = require('/opt/node22/lib/node_modules/playwright'); } }

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const serveur = http.createServer(async (req, res) => {
  try {
    const chemin = normalize(join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!chemin.startsWith(RACINE)) throw new Error('hors racine');
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' }); res.end(await readFile(chemin));
  } catch (e) { res.writeHead(404); res.end(); }
});
await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
const URLJ = `http://127.0.0.1:${serveur.address().port}/minijeux/filature.html?mode=train&rec=3&recNom=Test&moi=1&u=test`;
const browser = await pw.chromium.launch();
const pb = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => pb.push('erreur JS : ' + e.message));
await page.goto(URLJ); await page.waitForSelector('#defiGo');

// 1. Grilles : solution unique, chiffres = trajet.
const NIV = [1, 2, 3, 4, 6, 8, 9, 12, 15, 16, 20, 25, 26, 30, 40];
const grilles = await page.evaluate((niv) => niv.map((n) => {
  const c = Shell.cfgNiveau(n), t = performance.now(), g = filGrille(c.N, c.dens, c.extra), ms = performance.now() - t;
  if (!g) return { n, err: 'pas de grille' };
  const lig = Array(g.N).fill(0), col = Array(g.N).fill(0); for (const [k] of g.sol) { lig[(k / g.N) | 0]++; col[k % g.N]++; }
  const uniq = filCompter(g.N, g.lig, g.col, g.dep, g.arr, new Map(g.donnes), 5e6);
  return { n, N: c.N, time: c.time, extra: c.extra, ms: Math.round(ms), ok: JSON.stringify(lig) === JSON.stringify(g.lig) && JSON.stringify(col) === JSON.stringify(g.col), uniq, temoins: g.donnes.length - 2 };
}), NIV);
console.table(grilles);
for (const x of grilles) { if (x.err) pb.push(`niveau ${x.n} : ${x.err}`); else { if (!x.ok) pb.push(`niveau ${x.n} : chiffres ≠ trajet`); if (x.uniq !== 1) pb.push(`niveau ${x.n} : solution non unique (${x.uniq})`); if (x.ms > 4000) pb.push(`niveau ${x.n} : génération trop lente (${x.ms} ms)`); } }
for (let i = 1; i < grilles.length; i++) if (grilles[i].N < grilles[i - 1].N) pb.push(`la grille rétrécit au niveau ${grilles[i].n}`);

// 2-3. Jouer le niveau 5 : toucher = tuile dessinée, retournement visible, niveau réussi.
await page.evaluate(() => Shell._essaiNiveau(5)); await page.waitForTimeout(500);
const geo = await page.evaluate(() => { const e = __filature.etat(), r = document.getElementById('fcan').getBoundingClientRect();
  const P = new Map(e.g.sol), N = e.N, sol = new Set(e.sol); const ordre = [e.g.dep]; let k = e.g.dep, prev = -1;
  while (k !== e.g.arr) { const v = [k - N, k + 1, k + N, k - 1].find((q) => q !== prev && sol.has(q < k ? `${q}-${k}` : `${k}-${q}`)); prev = k; k = v; ordre.push(k); }
  const rects = Array.from({ length: N * N }, (_, i) => __filature.rect(i));
  const toucher = rects.every((q, i) => __filature.caseA(q.x + q.w / 2, q.y + q.w / 2) === i && __filature.caseA(q.x + 2, q.y + 2) === i);
  return { N, ordre, rects, toucher, ox: r.left, oy: r.top }; });
if (!geo.toucher) pb.push('zone de toucher ≠ tuile dessinée');
const pt = (k) => ({ x: geo.ox + geo.rects[k].x + geo.rects[k].w / 2, y: geo.oy + geo.rects[k].y + geo.rects[k].w / 2 });
// Couleur au centre d'une tuile, lue sur le canevas réellement affiché (dos bleu nuit / face crème).
const clair = (k) => page.evaluate(([q]) => { const c = document.getElementById('fcan'), d = Math.min(2, devicePixelRatio || 1);
  const px = c.getContext('2d').getImageData(Math.round((q.x + q.w * 0.2) * d), Math.round((q.y + q.w * 0.2) * d), 1, 1).data; return (px[0] + px[1] + px[2]) / 3 > 150; }, [geo.rects[k]]);
const milieu = geo.ordre[Math.floor(geo.ordre.length / 2)];
const etaitClair = await clair(milieu);
await page.mouse.move(pt(geo.ordre[0]).x, pt(geo.ordre[0]).y); await page.mouse.down();
for (const k of geo.ordre.slice(1)) await page.mouse.move(pt(k).x, pt(k).y, { steps: 3 });
await page.mouse.up(); await page.waitForTimeout(400);
if (etaitClair && !(await page.evaluate(() => __filature.etat().g.donnes.some(([k]) => k === 0)))) { /* tuile déjà retournée (témoin) : rien à conclure */ }
if (!(await clair(milieu))) pb.push('tuile du trajet pas retournée à l’écran');
const fin = await page.evaluate(() => __filature.etat()); if (!fin.won) pb.push('niveau non réussi après le trajet complet');
await page.waitForTimeout(2200);
const carte = await page.textContent('#card'); if (!/réussi/.test(carte || '')) pb.push('pas d’écran « niveau réussi »');

// 4. Trois fausses pistes : niveau raté.
await page.evaluate(() => Shell._essaiNiveau(2)); await page.waitForTimeout(400);
const faux = await page.evaluate(() => { const e = __filature.etat(), N = e.N, sol = new Set(e.sol), out = [];
  for (let k = 0; k < N * N && out.length < 3; k++) for (const q of [k + 1, k + N]) { if (q >= N * N || (q === k + 1 && k % N === N - 1)) continue; const c = `${k}-${q}`; if (!sol.has(c) && !out.some(([a, b]) => a === k || b === k || a === q || b === q)) { out.push([k, q]); break; } }
  return out; });
for (const [a, b] of faux) { const r1 = await page.evaluate((k) => __filature.rect(k), a), r2 = await page.evaluate((k) => __filature.rect(k), b);
  await page.mouse.move(geo.ox + r1.x + r1.w / 2, geo.oy + r1.y + r1.w / 2); await page.mouse.down(); await page.mouse.move(geo.ox + r2.x + r2.w / 2, geo.oy + r2.y + r2.w / 2, { steps: 3 }); await page.mouse.up(); }
await page.waitForTimeout(1800);
const e4 = await page.evaluate(() => __filature.etat()); if (e4.pistes !== 0 || !e4.over) pb.push(`après 3 fausses pistes : pistes=${e4.pistes}, fini=${e4.over}`);
if (!/raté/.test((await page.textContent('#card')) || '')) pb.push('pas d’écran « niveau raté »');

await browser.close(); serveur.close();
console.log(pb.length ? `PROBLÈMES :\n- ${pb.join('\n- ')}` : 'Filature : 0 problème.');
process.exit(pb.length ? 1 : 0);
