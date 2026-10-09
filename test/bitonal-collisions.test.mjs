// Garde-fou du mini-jeu Bitonal : « on ne se fait jamais toucher par quelque chose qu'on n'a pas vu ».
// Le test espionne ce que le jeu DESSINE vraiment (window.__bt.dessiner renvoie les obstacles tracés à l'image),
// au lieu de recalculer de son côté ce qui « devrait » être visible (c'est ce qui avait laissé passer le bug
// des voitures effacées alors qu'elles étaient encore à côté du combi).
//
// Règles vérifiées à CHAQUE accrochage, sur des centaines de courses avec un conducteur qui zigzague au hasard :
//  1. l'obstacle était dessiné sur toutes les images des 0,3 s précédant le choc (il n'a pas disparu juste avant) ;
//  2. il a été visible à l'écran (dans le cadre et pas entièrement caché par le combi) pendant au moins 0,25 s
//     dans la seconde et demie qui précède ;
//  3. il mordait franchement sur la largeur du combi (pas d'accrochage « à côté »).
// Plus un scénario précis : dépasser une voiture puis se rabattre trop tôt.
//
// Usage : node test/bitonal-collisions.test.mjs [courses-par-niveau]   (lance son propre petit serveur)
// Échoue (code 1) au moindre accrochage « invisible ».
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const serveur = http.createServer(async (req, res) => {
  try {
    const chemin = normalize(join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!chemin.startsWith(RACINE)) throw new Error('hors racine');
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' }); res.end(await readFile(chemin));
  } catch (e) { res.writeHead(404); res.end(); }
});
await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
const port = serveur.address().port;

const N = Number(process.argv[2] || 25);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
const erreursPage = [];
page.on('pageerror', (e) => erreursPage.push(e.message));
await page.goto(`http://127.0.0.1:${port}/minijeux/bitonal.html?debug=1`);
await page.waitForFunction(() => window.__bt);

const res = await page.evaluate(({ N }) => {
  const B = window.__bt, DT = 1 / 30;
  document.getElementById('intro').hidden = true;
  const boite = (o) => {
    let a, b;
    if (o.type === 'ilot') { a = B.proj(-o.w / 2, Math.max(o.z, B.S().z - 12), 0); b = B.proj(o.w / 2, Math.max(o.z, B.S().z - 12), 0.4); }
    else { const z = Math.max(o.z, B.S().z - 12.5 + 0.7); a = B.proj(o.x - o.w / 2, z, 0); b = B.proj(o.x + o.w / 2, z, o.h); }
    if (!a || !b) return null;
    return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) };
  };
  const aire = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
  const inter = (r, q) => ({ x0: Math.max(r.x0, q.x0), x1: Math.min(r.x1, q.x1), y0: Math.max(r.y0, q.y0), y1: Math.min(r.y1, q.y1) });
  // Une image : avance le jeu, le dessine, note pour chaque obstacle s'il a été tracé et s'il était visible.
  function image(S, t) {
    const avant = new Map([...S.ent, ...S.croiseurs].map((o) => [o, o.fantome]));
    B.pas(DT);
    const traces = B.dessiner(t * 1000);
    const { W, H } = B.dims();
    const p = B.proj(S.x - 1.05, S.z - 5, 0), q = B.proj(S.x + 1.05, S.z - 5, 2.5);
    const combi = { x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x), y0: Math.min(p.y, q.y), y1: Math.max(p.y, q.y) };
    for (const o of [...S.ent, ...S.croiseurs]) {
      const dessine = traces.has(o);
      let visible = false;
      if (dessine) { const r = boite(o); if (r) { const ecran = inter(r, { x0: 0, x1: W, y0: 0, y1: H }); visible = aire(ecran) > 4 && aire(ecran) - aire(inter(ecran, combi)) > 4; } }
      (o._h ||= []).push({ dessine, visible }); if (o._h.length > 60) o._h.shift();
    }
    return avant;
  }
  function verifierChoc(S, avant, problemes, contexte) {
    const coupable = [...S.ent, ...S.croiseurs].find((o) => o.fantome > 1.7 && (avant.get(o) || 0) <= 1.7);
    const cause = S.accrochages[S.accrochages.length - 1];
    if (!coupable) { problemes.push({ ...contexte, cause, pb: 'accrochage sans obstacle identifiable' }); return; }
    const h = coupable._h || [];
    const derniers = h.slice(-10, -1); // 0,3 s avant le choc (image du choc exclue)
    const fenetre = h.slice(-46, -1);  // 1,5 s
    const vuImages = fenetre.filter((x) => x.visible).length;
    const lat = coupable.type === 'croise' ? 9 : coupable.type === 'ilot' ? (coupable.w + 2.05) / 2 - Math.abs(S.x) : (coupable.w + 2.05) / 2 - Math.abs(coupable.x - S.x);
    const typ = coupable.type || '?';
    if (derniers.length < 9 || derniers.some((x) => !x.dessine)) problemes.push({ ...contexte, type: typ, cause, pb: 'obstacle pas dessiné juste avant le choc' });
    else if (vuImages < 8) problemes.push({ ...contexte, type: typ, cause, pb: `obstacle quasi jamais visible (${vuImages} images sur 45)` });
    else if (lat < 0.15) problemes.push({ ...contexte, type: typ, cause, pb: `choc alors qu'on passait à côté (chevauchement ${lat.toFixed(2)} m)` });
  }
  const out = { courses: 0, accrochages: 0, problemes: [] };
  // 1. Conducteur erratique : change de position au hasard, souvent, et ne regarde rien → beaucoup de chocs à contrôler.
  for (const niv of ['facile', 'moyen', 'difficile']) for (let run = 0; run < N; run++) {
    const graine = 31337 + run * 7919;
    B.nouvelle(niv, graine);
    const S = B.S(); S.pause = true;
    let hits = 0, prochain = 0, alea = graine;
    const rnd = () => ((alea = (alea * 1103515245 + 12345) % 2147483648) / 2147483648);
    let t = 0;
    while (S.enCours && t < 240) {
      t += DT;
      if (t > prochain) { const v = rnd(); const cible = v < .5 ? 2 : v < .8 ? 1 : 0; while (S.pos < cible) B.voie(1); while (S.pos > cible) B.voie(-1); prochain = t + 0.25 + rnd() * 1.2; }
      const feu = S.inters.find((i) => !i.passe && i.z - S.z < 60 && i.z - S.z > -2);
      B.frein((!!feu && S.v > B.LENT - 0.5) || rnd() < 0.02);
      const avant = image(S, t);
      if (S.hits > hits) { hits = S.hits; out.accrochages++; verifierChoc(S, avant, out.problemes, { niveau: niv, graine, t: +t.toFixed(1) }); }
    }
    out.courses++;
  }
  // 2. Scénario : dépasser une voiture lente par l'axe, puis se rabattre de plus en plus tôt.
  for (let k = 0; k < 12; k++) {
    B.nouvelle('moyen', 900 + k);
    const S = B.S(); S.pause = true;
    S.inters.forEach((i) => { i.passe = true; i.z = -1e4; }); S.croiseurs = [];
    S.ent = [{ z: S.z + 30, x: 1.8, v: 6, sens: 1, w: 1.85, h: 1.45, len: 4.3, coul: '#7B1E22', fantome: 0, reagi: true, type: 'tard', portee: 0 }];
    const lente = S.ent[0];
    B.voie(-1);
    let t = 0, hits = 0, rabattu = false;
    while (S.enCours && t < 20) {
      t += DT;
      if (!rabattu && lente.z < S.z - 5 + 4 - k * 0.6) { B.voie(1); rabattu = true; }
      const avant = image(S, t);
      if (S.hits > hits) { hits = S.hits; out.accrochages++; verifierChoc(S, avant, out.problemes, { scenario: 'rabattement', k }); }
    }
    out.courses++;
  }
  return out;
}, { N });

await browser.close(); serveur.close();
const resume = {};
for (const p of res.problemes) { const c = `${p.pb} — ${p.type || ''} — ${p.cause}`; resume[c] = (resume[c] || 0) + 1; }
console.log(`Bitonal : ${res.courses} courses, ${res.accrochages} accrochages contrôlés, ${res.problemes.length} problème(s).`);
if (erreursPage.length) console.log('Erreurs JavaScript :', erreursPage);
if (res.problemes.length) { console.log(resume); console.log('Exemples :', res.problemes.slice(0, 5)); }
if (res.accrochages < 30) { console.log('ÉCHEC : trop peu d’accrochages contrôlés, le test ne prouve rien.'); process.exit(1); }
process.exit(res.problemes.length || erreursPage.length ? 1 : 0);
