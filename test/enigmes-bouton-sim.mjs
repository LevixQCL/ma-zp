// Bouton « trop facile / trop dur » — variante « niveau partagé » : le bouton bouge d'un cran le même
// décalage que le Directeur (qui continue de corriger d'un cran par nuit selon les 7 derniers jours).
// « Trop dur » n'est possible qu'un jour où l'on a raté au moins une énigme (pas de farm des niveaux faciles).
// Récompense : +BONUS par cran au-dessus du niveau du jour (k€ et PS), jamais de malus.
import { cibleEnigmes } from '../js/engine/directeur.js';
import { ENIGMES, PS } from '../js/engine/constants.js';

const DIFF_PAR_JOUR = [2, 3, 3, 4, 4, 5, 5];
const B = Number(process.env.BONUS ?? 0.10), BMAX = Number(process.env.BMAX ?? 0.20), MIN = -2, MAX = 2;
const SEMAINES = 300, SEUIL = Number(process.env.SEUIL ?? 2); // « trop dur » permis si bonnes réponses ≤ SEUIL
function rngDe(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const pOk = (s, d) => 1 / (1 + Math.exp(-1.2 * (s - d)));

function simuler(s, strat, avecBouton, seed) {
  const r = rngDe(seed * 7919 + Math.round(s * 100));
  let niv = 0; const h = [];
  const a = { keur: 0, ps: 0, moral: 0, sf: 0, diff: 0, n: 0 };
  for (let t = 0; t < SEMAINES * 7; t++) {
    const wd = t % 7;
    const base = Math.max(1, Math.min(5, DIFF_PAR_JOUR[wd] + niv));
    const eff = base - DIFF_PAR_JOUR[wd], m = 1 + Math.min(BMAX, B * Math.max(0, eff));
    const ok = [Math.max(1, base - 1), base, Math.min(5, base + 1)].filter((d) => r() < pOk(s, d)).length, faux = 3 - ok;
    a.ps += Math.round((ok * PS.queteOk + faux * PS.queteTentee) * m); a.moral -= faux;
    if (ok >= 2) a.keur += ENIGMES.bonusBudget * m;
    if (ok === 3) { a.keur += ENIGMES.sansFaute.budget * m; a.moral += ENIGMES.sansFaute.moral; a.ps += Math.round(ENIGMES.sansFaute.ps * m); a.sf++; }
    a.diff += base; a.n++;
    // Nuit : le Directeur bouge d'un cran vers sa cible, puis le choix du joueur (un cran) s'applique.
    h.push({ ok, t: 3 }); if (h.length > 7) h.shift();
    const cible = Math.min(MAX, cibleEnigmes(h, undefined) + (avecBouton ? 0 : 0));
    niv = Math.max(MIN, Math.min(avecBouton ? MAX : 1, niv + Math.sign(cible - niv)));
    if (avecBouton) { let c = strat(ok); if (c < 0 && ok > SEUIL) c = 0; niv = Math.max(MIN, Math.min(MAX, niv + c)); }
  }
  const w = a.n / 7;
  return { 'k€/sem': a.keur / w, 'PS/sem': a.ps / w, 'moral/sem': a.moral / w, 'sans faute/sem': a.sf / w, 'diff moy': a.diff / a.n };
}
const STRATS = {
  'sans bouton (actuel)': [() => 0, false],
  'honnête (3/3 → +1, ≤1/3 → −1)': [(ok) => (ok === 3 ? 1 : ok <= 1 ? -1 : 0), true],
  'tricheur du bas (−1 dès que possible)': [() => -1, true],
  'ambitieux (+1 chaque jour)': [() => 1, true],
};
const JOUEURS = { ...(process.env.IA ? { 'Copie sur une IA (toujours juste)': 50 } : {}), 'Nul (1,5)': 1.5, 'Moyen (3)': 3, 'Bon (4)': 4, 'Fort (5)': 5, 'Très fort (6)': 6 };
const r1 = (v) => Math.round(v * 10) / 10;
console.log(`Bonus +${B * 100} %/cran au-dessus du niveau du jour (max +${BMAX * 100} %), sans malus. Agent délégué : ${r1(7 * 0.6 * ENIGMES.bonusBudget)} k€/sem.`);
const out = {};
for (const [jn, s] of Object.entries(JOUEURS)) {
  const rows = [];
  for (const [sn, [f, bt]] of Object.entries(STRATS)) {
    const acc = {}; const N = 6;
    for (let k = 1; k <= N; k++) { const x = simuler(s, f, bt, k); for (const key in x) acc[key] = (acc[key] || 0) + x[key] / N; }
    rows.push({ joueur: jn, strat: sn, ...Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, r1(v)])) });
  }
  out[jn] = rows; console.log(`\n${jn}`); console.table(rows.map(({ joueur, ...x }) => x));
}
if (process.env.JSON) console.log(JSON.stringify(out));
