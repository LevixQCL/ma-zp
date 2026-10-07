// Maintien de l'ordre (Challenge) : courbe de difficulté sur le long terme.
// Pour chaque niveau, 12 stratégies de bot (ordre des moyens × réserve gardée ou non, sommations sur le plus gros groupe)
// jouent la partie complète avec les vrais réglages du niveau (Shell.cfgNiveau) : on mesure combien gagnent,
// le cordon perdu en moyenne et l'effectif total en fin de partie (pour repérer un effet boule de neige).
// Les bots n'utilisent ni le glisser-déplacer, ni le Directeur, ni les avantages de zone : un bon joueur fait mieux.
// Servir le dossier (http-server -p 8765 -c-1 .) puis : node test/bouclage-sim.mjs [premier=1] [dernier=30] [répétitions=2]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(require('node:fs').existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : '/opt/npm-tools/node_modules/playwright');
const [A = 1, Z = 30, N = 2] = process.argv.slice(2).map(Number);
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const PAR = Number(process.env.PAR || 4);

const AVEC_CMD = process.env.CMD !== '0';
async function jouer(page, niveau, reps) {
  return page.evaluate(([n, N, avecCmd]) => {
    const B = window.__bouclage, R = B.R;
    const T = ['peloton', 'barrage', 'autopompe', 'cavalerie'];
    const cycles = [[0, 1, 2, 3], [1, 0, 2, 3], [2, 0, 1, 3], [0, 2, 1, 3], [1, 2, 0, 3], [0, 0, 2, 1]];
    const strats = []; cycles.forEach((c) => ['eager', 'reserve'].forEach((pol) => strats.push({ c, pol })));
    const res = { wins: 0, games: 0, perte: 0, fin: 0, vies: 0 };
    for (const s of strats) for (let rep = 0; rep < N; rep++) {
      Math.random = ((z) => () => { z = (z * 16807) % 2147483647; return (z - 1) / 2147483646; })(rep * 7 + 3 + n * 101);
      const cf = Shell.cfgNiveau(n); B.resetGame(cf, false, cf.map); R.sim = true;
      const ids = R.pads.map((p) => p.id).filter((id) => id !== R.fire); let k = 0;
      const act = () => {
        for (let t = 0; t < 3; t++) { const id = ids.find((i) => !R.towers[i]); if (!id) break; const ty = T[s.c[k % s.c.length]];
          if (B.build(id, ty)) k++; else if (R.agents >= 12) k++; else break; }
        for (const id of ids) { const tw = R.towers[id]; if (tw && tw.lvl < 3 && R.agents >= B.upCost(tw) + (s.pol === 'reserve' ? 5 : 0)) B.up(id); } };
      act(); B.launchWave();
      for (let t = 0; t < 60 * 420 && !R.over; t++) {
        if (t % 60 === 0) { act(); const go = R.units.filter((u) => u.state === 'go' && u.p && u.p.y > 8); let best = null, bn = 3;
          for (const u of go) { const m = go.filter((o) => Math.hypot(o.p.x - u.p.x, o.p.y - u.p.y) < 1.6).length; if (m > bn) { bn = m; best = u; } }
          if (best) B.somm(best.p.x, best.p.y);
          // commandant : se poste sur l'emplacement occupé où il y a le plus d'émeutiers autour, mégaphone dès qu'un groupe est à portée
          if (avecCmd && R.cmd) { const live = R.units.filter((u) => u.state === 'go' && u.p); let bp = null, bc = 0;
            for (const id of Object.keys(R.towers)) { const P = R.pads.find((q) => q.id === id), c = live.filter((u) => Math.hypot(u.p.x - P.x, u.p.y - P.y) < 2.5).length; if (c > bc) { bc = c; bp = P; } }
            const tr = live.find((u) => ['tracteur', 'sono', 'car'].includes(u.type));
            if (tr && t % 60 === 0) B.cmdVers(tr.p.x, tr.p.y + .5); // tracteur : on va négocier
            else if (!tr && bp && t % 120 === 0) B.cmdVers(bp.x, bp.y);
            if (tr && Math.hypot(tr.p.x - R.cmd.x, tr.p.y - R.cmd.y) < 1.2) B.ordreCmd();
            if (live.filter((u) => Math.hypot(u.p.x - R.cmd.x, u.p.y - R.cmd.y) < 1.9).length >= 4) B.ordreCmd(); } }
        B.step(1 / 60); }
      res.games++; if (R.lives > 0) res.wins++; res.vies = R.lives0;
      res.perte += R.lives0 - Math.max(0, R.lives);
      res.fin += R.agents + Object.values(R.towers).reduce((a, t) => a + t.spent, 0);
    }
    return { ...res, nom: B.MAPS[(n - 1) % B.MAPS.length].nom, cfg: Shell.cfgNiveau(n) };
  }, [niveau, reps, AVEC_CMD]);
}

const browser = await chromium.launch();
const pages = await Promise.all(Array.from({ length: PAR }, async () => { const p = await browser.newPage(); await p.goto(`${BASE}minijeux/bouclage.html?mode=train`); await p.waitForFunction(() => window.__bouclage && typeof Shell !== 'undefined'); return p; }));
const niveaux = []; for (let n = A; n <= Z; n++) niveaux.push(n);
const out = {};
await Promise.all(pages.map(async (p, i) => { for (let j = i; j < niveaux.length; j += PAR) out[niveaux[j]] = await jouer(p, niveaux[j], N); }));
await browser.close();

console.log('niv  quartier              météo  boss  vagues cordon agents | gagnantes  cordon perdu  effectif fin');
let mur = null;
for (const n of niveaux) {
  const r = out[n], c = r.cfg, pc = Math.round((r.wins / r.games) * 100);
  const met = n % 5 === 3 ? 'brouillard' : n % 5 === 0 ? 'pluie' : '';
  console.log(`${String(n).padStart(3)}  ${r.nom.padEnd(21)} ${met.padEnd(11)}${(c.boss||[]).map((b) => b[0].toUpperCase()).join('').padStart(3)} ${String(c.waves).padStart(6)} ${String(Math.round(c.lives)).padStart(6)} ${String(Math.round(c.eff)).padStart(6)} | ${String(pc).padStart(4)} %   ${(r.perte / r.games).toFixed(1).padStart(6)} / ${Math.round(r.vies)}   ${Math.round(r.fin / r.games)}`);
  if (mur === null && r.wins === 0) mur = n;
}
console.log(mur ? `Premier niveau qu'aucune stratégie de bot ne passe : ${mur}` : 'Toutes les stratégies passent au moins une fois sur la plage testée.');
