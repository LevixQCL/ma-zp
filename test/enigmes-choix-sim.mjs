// Bouton « trop facile / trop dur » des énigmes : simulation des gains selon le niveau du joueur.
// Modèle : chance de réussir une énigme de difficulté d pour un joueur de niveau s = 1 / (1 + e^(−1,2·(s − d))).
// Le Directeur (adapterEnigmes, le vrai code) continue d'ajuster ; le choix du joueur s'ajoute.
import { adapterEnigmes } from '../js/engine/directeur.js';
import { ENIGMES, PS } from '../js/engine/constants.js';

const DIFF_PAR_JOUR = [2, 3, 3, 4, 4, 5, 5];
const P = { bonusPar: Number(process.env.BONUS ?? 0.05), bonusMax: Number(process.env.BMAX ?? 0.15), malusPar: Number(process.env.MALUS ?? 0.05), malusMax: Number(process.env.MMAX ?? 0.10), jMin: -2, jMax: 2 };
const SEMAINES = 400;
// MODE=pct : % sur k€ et PS (idée de départ). MODE=ps : k€ inchangés, PS par bonne réponse ± PSCRAN par cran ; total borné à [−2, +3].
const MODE = process.env.MODE || 'pct', PSCRAN = Number(process.env.PSCRAN ?? 1);

// Multiplicateur : bonus selon le niveau réellement joué au-dessus du niveau du jour ;
// malus seulement pour les crans que le joueur a lui-même demandés en dessous (le Directeur seul ne pénalise jamais).
export function multiplicateur(eff, j) {
  const b = Math.min(P.bonusMax, P.bonusPar * Math.max(0, eff));
  const m = j < 0 ? Math.min(P.malusMax, P.malusPar * Math.min(-j, Math.max(0, -eff))) : 0;
  return 1 + b - m;
}

function rngDe(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const pOk = (s, d) => 1 / (1 + Math.exp(-1.2 * (s - d)));

/** Une saison de `SEMAINES` semaines : strat(jour, joueurOffset, okVeille) → nouvel offset joueur. */
function simuler(s, strat, seed = 1) {
  const r = rngDe(seed * 7919 + Math.round(s * 100));
  const z = { dir: {} };
  let j = 0, okVeille = null;
  const acc = { keur: 0, ps: 0, moral: 0, bonusJours: 0, sf: 0, jours: 0, diff: 0 };
  for (let t = 0; t < SEMAINES * 7; t++) {
    const wd = t % 7;
    j = strat(j, okVeille);
    j = Math.max(P.jMin, Math.min(P.jMax, j));
    const dir = (z.dir.enig && z.dir.enig.niv) || 0;
    const tot = MODE === 'ps' ? Math.max(-2, Math.min(3, dir + j)) : dir + j;
    const base = Math.max(1, Math.min(5, DIFF_PAR_JOUR[wd] + tot));
    const eff = base - DIFF_PAR_JOUR[wd];
    const m = MODE === 'ps' ? 1 : multiplicateur(eff, j);
    const crans = MODE === 'ps' ? (eff > 0 ? eff : j < 0 ? -Math.min(-j, -eff) : 0) : 0;
    const diffs = [Math.max(1, base - 1), base, Math.min(5, base + 1)];
    const ok = diffs.filter((d) => r() < pOk(s, d)).length, faux = 3 - ok;
    acc.ps += Math.round((ok * (PS.queteOk + PSCRAN * crans) + faux * PS.queteTentee) * m);
    acc.moral -= faux * ENIGMES.rateeMoral;
    if (ok >= 2) { acc.keur += ENIGMES.bonusBudget * m; acc.bonusJours++; }
    if (ok === 3) { acc.keur += ENIGMES.sansFaute.budget * m; acc.moral += ENIGMES.sansFaute.moral; acc.ps += Math.round(ENIGMES.sansFaute.ps * m); acc.sf++; }
    acc.jours++; acc.diff += base;
    adapterEnigmes(z, ok, 3, undefined);
    okVeille = ok;
  }
  const n = acc.jours / 7; // par semaine
  return { keur: acc.keur / n, ps: acc.ps / n, moral: acc.moral / n, bonus: acc.bonusJours / n, sf: acc.sf / n, diff: acc.diff / acc.jours };
}

const STRATS = {
  'sans bouton': () => () => 0,
  'honnête': () => (j, ok) => (ok === 3 ? j + 1 : ok !== null && ok <= 1 ? j - 1 : j),
  ...Object.fromEntries([-2, -1, 1, 2].map((k) => [`fixe ${k > 0 ? '+' : ''}${k}`, () => () => k])),
};
const JOUEURS = { 'Nul en énigmes (1,5)': 1.5, 'Moyen (3)': 3, 'Bon (4)': 4, 'Fort (5)': 5, 'Très fort (6)': 6 };
const r1 = (v) => Math.round(v * 10) / 10;
console.log(`Paramètres : +${P.bonusPar * 100} %/cran (max +${P.bonusMax * 100} %), −${P.malusPar * 100} %/cran demandé (max −${P.malusMax * 100} %). Valeurs par semaine.`);
console.log(`Agent délégué (moral 50) : ${r1(7 * 0.6 * ENIGMES.bonusBudget)} k€/sem, 0 PS, +7 paperasse.`);
for (const [nom, s] of Object.entries(JOUEURS)) {
  const rows = [];
  for (const [sn, f] of Object.entries(STRATS)) {
    let a = { keur: 0, ps: 0, moral: 0, bonus: 0, sf: 0, diff: 0 }; const N = 5;
    for (let k = 0; k < N; k++) { const x = simuler(s, f(), k + 1); for (const key in a) a[key] += x[key] / N; }
    rows.push({ strat: sn, 'k€': r1(a.keur), PS: r1(a.ps), moral: r1(a.moral), 'jours bonus': r1(a.bonus), 'sans faute': r1(a.sf), 'diff moy': r1(a.diff) });
  }
  console.log(`\n${nom}`); console.table(rows);
}
