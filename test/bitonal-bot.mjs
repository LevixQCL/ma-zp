// Banc d'essai du mini-jeu Bitonal : un bot « humain » qui ne réagit qu'à ce qu'il VOIT à l'écran
// (obstacle hors champ ou caché derrière le combi = invisible pour lui), avec un temps de réaction.
// Mesure : accrochages par course, et part des accrochages contre un obstacle qui n'a jamais été
// visible assez tôt pour réagir (« crash sans voir l'obstacle »).
// Usage : servir le dossier (http-server -p 8765 -c-1 .) puis
//   node test/bitonal-bot.mjs [url-du-jeu] [courses-par-niveau]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }

const url = process.argv[2] || 'http://127.0.0.1:8765/minijeux/bitonal.html?debug=1';
const N = Number(process.argv[3] || 40);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
await page.goto(url);
await page.waitForFunction(() => window.__bt);

const res = await page.evaluate(({ N }) => {
  const B = window.__bt;
  const DT = 1 / 60, REACT = 0.35;
  function rect(o, S) {
    let a, b;
    if (o.type === 'croise') { a = B.proj(o.x - o.w / 2, o.z, 0); b = B.proj(o.x + o.w / 2, o.z, o.h); }
    else if (o.type === 'ilot') { a = B.proj(-o.w / 2, o.z, 0); b = B.proj(o.w / 2, o.z, 1.8); }
    else { a = B.proj(o.x - o.w / 2, o.z, 0); b = B.proj(o.x + o.w / 2, o.z, o.h); }
    if (!a || !b) return null;
    return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) };
  }
  const inter = (r, q) => Math.max(0, Math.min(r.x1, q.x1) - Math.max(r.x0, q.x0)) * Math.max(0, Math.min(r.y1, q.y1) - Math.max(r.y0, q.y0));
  // Part visible (0..1) de l'obstacle : à l'écran et pas cachée par le combi.
  function partVisible(o, S, combiR, W, H) {
    const r = rect(o, S); if (!r) return 0;
    const aire = (r.x1 - r.x0) * (r.y1 - r.y0); if (aire < 1) return 0;
    const rc = { x0: Math.max(r.x0, 0), x1: Math.min(r.x1, W), y0: Math.max(r.y0, 0), y1: Math.min(r.y1, H) };
    const a = Math.max(0, rc.x1 - rc.x0) * Math.max(0, rc.y1 - rc.y0);
    return Math.max(0, a - inter(rc, combiR)) / aire;
  }
  const out = {};
  for (const niv of ['facile', 'moyen', 'difficile']) {
    let hits = 0, invis = 0, arrivees = 0, temps = 0, hs = 0; const causes = {};
    for (let run = 0; run < N; run++) {
      B.nouvelle(niv, 1000 + run * 7919);
      let S = B.S(); const { W, H } = B.dims();
      let tChoix = 0, cible = 2, prevHits = 0, attente = [];
      while (S.enCours && S.t < 400) {
        B.regleCamera();
        const p = B.proj(S.x - 1.05, S.z - 5, 0), q = B.proj(S.x + 1.05, S.z - 5, 2.5);
        const combiR = { x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x), y0: Math.min(p.y, q.y), y1: Math.max(p.y, q.y) };
        const tous = [...S.ent, ...S.croiseurs];
        for (const o of tous) {
          if (o.z > S.z + 150 || o.z + (o.len || 0) < S.z - 6) continue;
          const f = partVisible(o, S, combiR, W, H);
          (o._h ||= []).push(f); if (o._h.length > 60) o._h.shift();
          if (f > 0.3 && o._vu == null) o._vu = S.t;
        }
        // Le bot perçoit avec un retard REACT : il ne réagit qu'aux objets vus depuis au moins REACT s.
        const vus = (o) => o._vu != null && S.t - o._vu >= REACT;
        // Feu : ralentit sous 30 km/h à l'approche si le feu est vu.
        const feu = S.inters.find((i) => !i.passe && i.z - S.z < 70 && i.z - S.z > -2);
        let frein = !!feu && S.v > B.LENT - 0.6;
        // Danger dans la voie cible devant (perçu) : change de position ou freine.
        const occupe = (x) => tous.some((o) => vus(o) && o.type !== 'croise' && !o.fantome && o.z - S.z < 30 && o.z + (o.len || 0) > S.z - 5 && Math.abs((o.tx ?? o.x) - x) < (o.w + 2.05) / 2);
        const POS = [-1.8, 0, 1.8];
        // Un humain se déplace d'une position à la fois et vérifie chaque position traversée.
        const passeLibre = (de, a) => { for (let k = Math.min(de, a); k <= Math.max(de, a); k++) if (k !== de && occupe(POS[k])) return false; return true; };
        if (S.t > tChoix) { const v = Math.random() < .6 ? 2 : Math.random() < .5 ? 1 : 0; if (passeLibre(S.pos, v)) cible = v; tChoix = S.t + 0.8 + Math.random() * 1.6; }
        if (occupe(POS[cible])) { const libre = [S.pos, S.pos + 1, S.pos - 1].filter((k) => k >= 0 && k <= 2).find((k) => !occupe(POS[k])); if (libre != null) cible = libre; else frein = true; }
        const croiseProche = S.croiseurs.some((c) => vus(c) && c.v > 1 && Math.abs(c.i.z - S.z) < 20);
        if (croiseProche) frein = true;
        while (S.pos < cible) B.voie(1); while (S.pos > cible) B.voie(-1);
        B.frein(frein);
        // détecter l'accrochage de ce pas
        const avant = new Map(tous.map((o) => [o, o.fantome]));
        B.pas(DT);
        if (S.hits > prevHits) {
          prevHits = S.hits; hits++;
          const coupable = [...S.ent, ...S.croiseurs].find((o) => o.fantome > 1.7 && (avant.get(o) || 0) < 1.7) || null;
          const cause = S.accrochages[S.accrochages.length - 1];
          causes[cause] = (causes[cause] || 0) + 1;
          // « Sans voir » : quasi pas de chevauchement à l'écran (il semblait passer à côté), ou obstacle
          // caché / hors champ une demi-seconde avant le choc.
          let louche = !coupable;
          if (coupable) {
            const lat = coupable.type === 'croise' ? 9 : coupable.type === 'ilot' ? (coupable.w + 2.05) / 2 - Math.abs(S.x) : (coupable.w + 2.05) / 2 - Math.abs(coupable.x - S.x);
            const h = coupable._h || []; const f05 = h.length >= 31 ? h[h.length - 31] : 0;
            louche = lat < 0.3 || f05 < 0.5;
          }
          if (louche) { invis++; causes['(sans voir) ' + cause] = (causes['(sans voir) ' + cause] || 0) + 1; }
        }
      }
      if (S.hits >= 3 || (!S.enCours && S.z < S.N.long)) hs++; else { arrivees++; temps += S.t; }
    }
    out[niv] = { courses: N, accrochagesParCourse: +(hits / N).toFixed(2), partInvisibles: hits ? +(invis / hits).toFixed(2) : 0, horsService: hs, tempsMoyen: arrivees ? Math.round(temps / arrivees) : null, causes };
  }
  return out;
}, { N });
console.log(JSON.stringify(res, null, 2));
await browser.close();
