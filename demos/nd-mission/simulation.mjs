// Test du prototype de mission d'interception (règles v3, sans dé) : profils de joueurs × difficulté × formation de la zone,
// puis une campagne collective sur un secteur.
// node demos/nd-mission/simulation.mjs [nombre de plateaux par difficulté]
import { DIFF, plateau, revele, posterieur, etat, resoudre, casesVues, partage, interdite, force, graine, cles } from './regles.js';

const NB = Number(process.argv[2] || 200);
const t0 = Date.now();
const { k } = cles;
const rues = (P) => { const r = []; P.lignes.forEach((l, y) => l.forEach((c, x) => { if (c !== '#' && !interdite(P, [x, y]) && !P.guetteurs.some((g) => g[0] === x && g[1] === y)) r.push([x, y]); })); return r; };
const ok = (P, c) => !interdite(P, c) && !P.guetteurs.some((g) => g[0] === c[0] && g[1] === c[1]);
const libre = (place, c) => !Object.values(place).some((p) => p && p[0] === c[0] && p[1] === c[1]);
const autres = (P) => P.pions.filter((p) => p.s !== 'R');
const voisinsGuetteur = (P) => P.guetteurs.flatMap((g) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [g[0] + dx, g[1] + dy])).filter((c) => P.rue(...c) && P.lignes[c[1]][c[0]] !== 'L');

// ───── Profils ─────
function aleatoire(P, fb, rnd) {
  const r = rues(P), place = {};
  for (const p of P.pions) { let c; do c = r[Math.floor(rnd() * r.length)]; while (!libre(place, c)); place[p.id] = c; }
  return place;
}
// Adjoint 19:55 (= « Placer pour moi ») : Recherche sur une case qui départage les itinéraires, puis barrages sur les plus probables,
// hors des cases vues ; il ne neutralise jamais un guetteur.
function adjoint(P, fb) {
  const place = {};
  const ordre = P.priors.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
  place.r = P.routes[ordre[0]].slice(1).find((c) => ok(P, c) && partage(P, c) && !casesVues(P, {}).has(k(...c))) || P.routes[ordre[0]].slice(1).find((c) => ok(P, c));
  const post = posterieur(P, revele(P, place.r, casesVues(P, {})));
  const poss = ordre.filter((i) => post[i] > 0);
  const vus = casesVues(P, {}), res = DIFF[P.difficulte].resistance;
  // Il forme des barrages complets : sur l'itinéraire le plus probable d'abord, en regroupant des policiers si un seul ne suffit pas.
  const reste = autres(P).sort((a, b) => force(b.s, fb) - force(a.s, fb));
  for (const r of poss) {
    if (!reste.length) break;
    let f = 0; const cs = P.routes[r].slice(1).reverse().filter((x) => ok(P, x) && !vus.has(k(...x)));
    while (reste.length && f < res) { const c = cs.find((x) => libre(place, x)); if (!c) break; const p = reste.shift(); place[p.id] = c; f += force(p.s, fb); }
  }
  return place;
}
// Expert : essaie chaque case de repérage (en moyenne sur ce qu'elle peut révéler), puis le meilleur placement des autres.
function meilleur(P, fb, rPos) {
  const cs = new Map();
  P.routes.forEach((r) => r.slice(1).forEach((c) => cs.set(k(...c), c)));
  voisinsGuetteur(P).forEach((c) => cs.set(k(...c), c));
  const cand = [...cs.values()].filter((c) => ok(P, c) && !(c[0] === rPos[0] && c[1] === rPos[1]));
  const ps = autres(P); let best = null, bv = -1;
  const rec = (idx, place, min) => {
    if (idx === ps.length) { const v = etat(P, place, fb).esperance; if (v > bv) { bv = v; best = { ...place }; } return; }
    const p = ps[idx], meme = idx > 0 && ps[idx - 1].s === p.s;
    for (let a = meme ? min + 1 : 0; a < cand.length; a++) { const c = cand[a]; if (!libre(place, c)) continue; place[p.id] = c; rec(idx + 1, place, a); delete place[p.id]; }
  };
  rec(0, { r: rPos }, -1);
  return { place: best, v: bv };
}
function expert(P, fb) {
  let best = null, bv = -1;
  for (const rPos of rues(P)) {
    let v = 0;
    for (let vrai = 0; vrai < P.routes.length; vrai++) v += P.priors[vrai] * meilleur({ ...P, vrai }, fb, rPos).v;
    if (v > bv) { bv = v; best = rPos; }
  }
  return meilleur(P, fb, best).place;
}
const PROFILS = { 'Aléatoire': aleatoire, 'Placer pour moi': adjoint, 'Expert': expert };

// ───── 1. Missions isolées ─────
const res = {}, tirages = {};
console.log(`\n1. MISSIONS · ${NB} plateaux par difficulté et par formation (mêmes plateaux pour chaque profil)\n`);
console.log('Formation | Difficulté | Profil          | Succès moy. | Échec total | Arrestation | Chance annoncée | Repéré');
for (const fb of [false, true]) for (const diff of Object.keys(DIFF)) {
  for (const nom of Object.keys(PROFILS)) res[`${fb}|${diff}|${nom}`] = { succ: 0, zero: 0, arr: 0, chance: 0, rep: 0, n: 0 };
  for (let n = 0; n < NB; n++) {
    const P = plateau(diff, graine(1000 + n * 7919 + diff.length * 31));
    for (const [nom, f] of Object.entries(PROFILS)) {
      const place = f(P, fb, graine(5 + n * 104729));
      const r = resoudre(P, place, fb), s = res[`${fb}|${diff}|${nom}`];
      (tirages[`${fb}|${diff}|${nom}`] ||= []).push(r);
      s.succ += r.succes; s.zero += r.succes ? 0 : 1; s.arr += r.arrestation ? 1 : 0; s.chance += r.chance; s.rep += r.reperes.length ? 1 : 0; s.n++;
    }
  }
  for (const nom of Object.keys(PROFILS)) {
    const s = res[`${fb}|${diff}|${nom}`], pc = (x) => `${Math.round(100 * x / s.n)} %`;
    console.log(`${(fb ? 'bonne' : 'faible').padEnd(9)} | ${diff.padEnd(10)} | ${nom.padEnd(15)} | ${(s.succ / s.n).toFixed(2).padStart(11)} | ${pc(s.zero).padStart(11)} | ${pc(s.arr).padStart(11)} | ${pc(s.chance).padStart(15)} | ${pc(s.rep).padStart(6)}`);
  }
}
console.log('\nSuccès par agent engagé (hors Recherche) :');
for (const fb of [false, true]) for (const diff of Object.keys(DIFF)) {
  const n = DIFF[diff].pions.length - 1;
  console.log(`  ${(fb ? 'bonne ' : 'faible')} ${diff.padEnd(10)} ${Object.keys(PROFILS).map((p) => `${p} ${(res[`${fb}|${diff}|${p}`].succ / NB / n).toFixed(2)}`).join(' · ')}`);
}
console.log('\nCohérence de l\'affichage : chance annoncée moyenne vs arrestations réelles (doivent être proches, il n\'y a plus de dé caché)');
for (const diff of ['standard', 'ambitieux']) for (const nom of Object.keys(PROFILS)) {
  const s = res[`false|${diff}|${nom}`];
  console.log(`  ${diff.padEnd(10)} ${nom.padEnd(15)} annoncé ${Math.round(100 * s.chance / s.n)} % · réel ${Math.round(100 * s.arr / s.n)} %`);
}

// ───── 2. Campagne collective ─────
// Chaque nuit : chaque actif joue une mission (30 % expert en ambitieux, 50 % « placer pour moi » en standard, 20 % aléatoire-ish
// = « placer pour moi » en prudent) ; formation bonne pour la moitié des zones. Les inactifs ont 50 % de chances d'avoir engagé des agents :
// l'adjoint joue alors pour eux en prudent. Emprise 62 ; valeur d'un succès adaptée au nombre de joueurs ; reprise nocturne selon
// le réseau et le lieutenant libre ; chute si emprise 0 et porte réussie (= première mission du soir réussie à fond).
function tirer(cle, rnd) { const t = tirages[cle]; return t[Math.floor(rnd() * t.length)]; }
function campagne(actifs, inactifs, seed) {
  const rnd = graine(seed);
  let emprise = 62, reseau = 2, libreLt = true;
  const valeur = Math.max(3, Math.round(62 / (4 * (1.1 * actifs + 0.25 * inactifs))));
  for (let nuit = 1; nuit <= 30; nuit++) {
    let succes = 0, porte = false;
    const js = [];
    for (let j = 0; j < actifs; j++) { const u = rnd(), fb = rnd() < 0.5; js.push(u < 0.3 ? [fb, 'ambitieux', 'Expert'] : u < 0.8 ? [fb, 'standard', 'Placer pour moi'] : [fb, 'prudent', 'Placer pour moi']); }
    for (let j = 0; j < inactifs; j++) if (rnd() < 0.5) js.push([rnd() < 0.5, 'prudent', 'Placer pour moi']);
    js.forEach(([fb, diff, nom], idx) => { const r = tirer(`${fb}|${diff}|${nom}`, rnd); succes += r.succes; if (idx === 0 && r.succes >= DIFF[diff].succes) porte = true; if (r.arrestation) libreLt = false; });
    if (succes >= 3) reseau = Math.max(0, reseau - 1);
    emprise -= succes * valeur;
    if (emprise <= 0 && porte) return nuit;
    emprise = Math.min(100, Math.max(0, emprise) + (reseau === 2 && libreLt ? 8 : libreLt ? 5 : reseau ? 3 : 2));
  }
  return 31;
}
console.log('\n2. CAMPAGNE · nuits pour faire tomber un secteur (1 000 campagnes par configuration)\n');
for (const [a, i] of [[1, 4], [2, 3], [3, 7], [5, 5], [10, 0]]) {
  const t = []; for (let s = 0; s < 1000; s++) t.push(campagne(a, i, 77 + s * 13));
  t.sort((x, y) => x - y);
  console.log(`  ${String(a).padStart(2)} actifs + ${String(i).padStart(2)} inactifs : médiane ${t[500]} nuits · 10 % ≤ ${t[100]} · 90 % ≤ ${t[900]}${t[900] > 30 ? ' · certaines campagnes ne finissent pas' : ''}`);
}
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
