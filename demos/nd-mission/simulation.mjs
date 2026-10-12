// Test du prototype de mission d'interception : différents profils de joueurs, par difficulté, puis une campagne collective.
// node demos/nd-mission/simulation.mjs [nombre de plateaux par difficulté]
import { DIFF, plateau, revele, posterieur, esperance, resoudre, neutralises, vueGuetteur, graine, cles } from './regles.js';

const NB = Number(process.argv[2] || 400);
const tirages = {}, alertes = {};
const desDe = graine(20261012); // un vrai tirage par plateau (le premier tirage d'une graine voisine est presque toujours le même)
const t0 = Date.now();
const { k } = cles;
const rues = (P) => { const r = []; P.lignes.forEach((l, y) => l.forEach((c, x) => { if (c !== '#' && c !== 'L') r.push([x, y]); })); return r; };
const libre = (place, c) => !Object.values(place).some((p) => p && p[0] === c[0] && p[1] === c[1]);
const vusPar = (P, place) => { const n = neutralises(P, place), v = new Set(); P.guetteurs.forEach((g, j) => { if (!n[j]) vueGuetteur(g, P.rue).forEach((c) => v.add(c)); }); return v; };

// ───── Profils ─────
const autres = (P) => P.pions.filter((p) => p.id !== 'r');
// Aléatoire : chaque agent sur une case de rue au hasard.
function aleatoire(P, rnd) {
  const r = rues(P), place = {};
  for (const p of P.pions) { let c; do c = r[Math.floor(rnd() * r.length)]; while (!libre(place, c)); place[p.id] = c; }
  return place;
}
const ordreRoutes = (P, post) => P.priors.map((p, i) => [post ? post[i] : p, i]).sort((a, b) => b[0] - a[0]).filter(([v]) => v > 0).map(([, i]) => i);
const rechercheSurPlusProbable = (P) => { const r0 = P.routes[ordreRoutes(P)[0]]; return r0[Math.min(2, r0.length - 1)]; };
// Adjoint (19:55) : plan correct et prévisible : un agent par itinéraire possible, hors de la vue des guetteurs ; pas de neutralisation ni de doublement.
function adjoint(P) {
  const place = { r: rechercheSurPlusProbable(P) };
  const possibles = ordreRoutes(P, posterieur(P, revele(P, place.r)));
  const vus = new Set(); P.guetteurs.forEach((g) => vueGuetteur(g, P.rue).forEach((c) => vus.add(c)));
  autres(P).forEach((p, j) => {
    const cs = P.routes[possibles[j % possibles.length]].slice(1).reverse();
    const c = cs.find((x) => libre(place, x) && !vus.has(k(...x))) || cs.find((x) => libre(place, x));
    if (c) place[p.id] = c;
  });
  return place;
}
// Joueur moyen : comme l'adjoint, mais reste hors de la vue des guetteurs et neutralise celui qui gêne s'il a un Intervention.
function moyen(P) {
  const place = { r: rechercheSurPlusProbable(P) };
  const possibles = ordreRoutes(P, posterieur(P, revele(P, place.r)));
  const reste = autres(P);
  const iP = reste.find((p) => p.id === 'i');
  if (iP && P.guetteurs.length) {
    const g = P.guetteurs[0], cs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [g[0] + dx, g[1] + dy]).filter((c) => P.rue(...c) && P.lignes[c[1]][c[0]] !== 'L' && libre(place, c));
    if (cs.length) place.i = cs[0];
  }
  const vus = new Set(); { const n = neutralises(P, place); P.guetteurs.forEach((g, j) => { if (!n[j]) vueGuetteur(g, P.rue).forEach((c) => vus.add(c)); }); }
  if (vus.has(k(...place.r))) { const r0 = P.routes[possibles[0]]; const c = r0.slice(1).find((x) => !vus.has(k(...x))); if (c) place.r = c; }
  let j = 0;
  for (const p of reste) {
    if (place[p.id]) continue;
    const route = P.routes[possibles[j % possibles.length]]; j++;
    const cs = route.slice(1).reverse();
    const c = cs.find((x) => libre(place, x) && !vus.has(k(...x))) || cs.find((x) => libre(place, x));
    if (c) place[p.id] = c;
  }
  return place;
}
// Expert : essaie chaque case pour la Recherche (en moyenne sur ce qu'elle peut révéler), puis le meilleur placement des autres.
function candidats(P) {
  const m = new Map();
  P.routes.forEach((r) => r.slice(1).forEach((c) => m.set(k(...c), c)));
  P.guetteurs.forEach((g) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const c = [g[0] + dx, g[1] + dy]; if (P.rue(...c) && P.lignes[c[1]][c[0]] !== 'L') m.set(k(...c), c); }));
  return [...m.values()];
}
function meilleur(P, rPos, cs) {
  const others = autres(P); let best = null, bv = -1;
  const rec = (idx, place, minIdx) => {
    if (idx === others.length) { const v = esperance(P, place); if (v > bv) { bv = v; best = { ...place }; } return; }
    const p = others[idx], memeType = idx > 0 && others[idx - 1].s === p.s;
    for (let a = memeType ? minIdx + 1 : 0; a < cs.length; a++) {
      const c = cs[a]; if (!libre(place, c)) continue;
      place[p.id] = c; rec(idx + 1, place, a); delete place[p.id];
    }
  };
  rec(0, { r: rPos }, -1);
  return { place: best, v: bv };
}
function expert(P) {
  const cs = candidats(P);
  let best = null, bv = -1;
  for (const rPos of rues(P)) {
    let v = 0;
    for (let vrai = 0; vrai < P.routes.length; vrai++) v += P.priors[vrai] * meilleur({ ...P, vrai }, rPos, cs.filter((c) => k(...c) !== k(...rPos))).v;
    if (v > bv) { bv = v; best = rPos; }
  }
  return meilleur(P, best, cs.filter((c) => k(...c) !== k(...best))).place;
}

const PROFILS = { 'Aléatoire': aleatoire, 'Adjoint 19:55': adjoint, 'Joueur moyen': moyen, 'Expert': expert };

// ───── 1. Missions isolées ─────
const res = {};
console.log(`\n1. MISSIONS · ${NB} plateaux par difficulté (mêmes plateaux et mêmes dés pour chaque profil)\n`);
for (const diff of Object.keys(DIFF)) {
  for (const [nom, f] of Object.entries(PROFILS)) res[`${diff}|${nom}`] = { succ: 0, echec: 0, arr: 0, chance: 0, n: 0, dist: [0, 0, 0, 0] };
  for (let n = 0; n < NB; n++) {
    const rnd = graine(1000 + n * 7 + diff.length);
    const P = plateau(diff, rnd);
    const de = desDe() * 100;
    for (const [nom, f] of Object.entries(PROFILS)) {
      const place = f(P, graine(5 + n * 7919));
      const r = resoudre(P, place, de), s = res[`${diff}|${nom}`];
      if (r.alerte.length) alertes[nom] = (alertes[nom] || 0) + 1; (tirages[`${diff}|${nom}`] ||= []).push({ succes: r.succes, arr: r.arrestation }); s.succ += r.succes; s.echec += r.succes === 0 ? 1 : 0; s.arr += r.arrestation ? 1 : 0; s.chance += r.chance; s.n++; s.dist[r.succes]++;
    }
  }
}
const pc = (x) => `${Math.round(x * 100)} %`.padStart(5);
console.log('Difficulté  | Profil         | Succès moyens | Échecs totaux | Arrestations | Chance sur l’itinéraire pris');
for (const diff of Object.keys(DIFF)) for (const nom of Object.keys(PROFILS)) {
  const s = res[`${diff}|${nom}`];
  console.log(`${diff.padEnd(11)} | ${nom.padEnd(14)} | ${(s.succ / s.n).toFixed(2).padStart(13)} | ${pc(s.echec / s.n).padStart(13)} | ${pc(s.arr / s.n).padStart(12)} | ${(s.chance / s.n).toFixed(0).padStart(4)} %`);
}
console.log('\nSuccès moyens par agent engagé :');
for (const diff of Object.keys(DIFF)) console.log(`  ${diff.padEnd(10)} ${Object.keys(PROFILS).map((n) => `${n} ${(res[`${diff}|${n}`].succ / res[`${diff}|${n}`].n / DIFF[diff].pions.length).toFixed(2)}`).join(' · ')}`);
console.log('\nÉcart expert / adjoint et moyen / adjoint (succès moyens) :');
for (const diff of Object.keys(DIFF)) {
  const a = res[`${diff}|Adjoint 19:55`].succ, e = res[`${diff}|Expert`].succ, m = res[`${diff}|Joueur moyen`].succ;
  console.log(`  ${diff.padEnd(10)} expert ${pc(e / a - 1)} · moyen ${pc(m / a - 1)}`);
}

// ───── 2. Campagne collective sur un secteur ─────
// Chaque nuit, chaque joueur actif fait une mission (profil tiré : 30 % expert, 50 % moyen, 20 % « placer pour moi » = adjoint),
// à une difficulté qui dépend de son profil ; les inactifs sont joués par l'adjoint (prudent) avec 50 % de chances d'avoir engagé des agents.
// Emprise 62. Valeur d'un succès adaptée au nombre de joueurs actifs. Reprise nocturne selon le réseau et le lieutenant libre.
// Le secteur tombe si l'emprise atteint 0 et qu'une mission « porte » a réussi ce soir-là (modélisée comme une mission standard).
// Les missions de la campagne sont tirées dans les résultats mesurés en 1 (mêmes plateaux, mêmes profils).
function tirer(cle, rnd) { const t = tirages[cle]; return t[Math.floor(rnd() * t.length)]; }
function campagne(actifs, inactifs, seed) {
  const rnd = graine(seed);
  let emprise = 62, reseau = 2, lieutenantLibre = true, nuits = 0;
  const valeur = Math.max(3, Math.round(62 / (4 * (1.1 * actifs + 0.25 * inactifs))));
  while (nuits < 30) {
    nuits++;
    let succes = 0, porte = false;
    const joueurs = [];
    for (let j = 0; j < actifs; j++) { const u = rnd(); joueurs.push(u < 0.3 ? ['Expert', 'ambitieux'] : u < 0.8 ? ['Joueur moyen', 'standard'] : ['Adjoint 19:55', 'standard']); }
    for (let j = 0; j < inactifs; j++) if (rnd() < 0.5) joueurs.push(['Adjoint 19:55', 'prudent']);
    joueurs.forEach(([prof, diff], idx) => {
      const e = tirer(`${diff}|${prof}`, rnd);
      succes += e.succes;
      if (idx === 0 && e.succes >= DIFF[diff].succes) porte = true; // le premier joueur actif prend la porte
      if (e.arr) lieutenantLibre = false;
    });
    if (succes >= 3) reseau = Math.max(0, reseau - 1);
    emprise -= succes * valeur;
    if (emprise <= 0 && porte) return nuits;
    emprise = Math.max(0, emprise);
    const reprise = reseau === 2 && lieutenantLibre ? 8 : lieutenantLibre ? 5 : reseau > 0 ? 3 : 2;
    emprise = Math.min(100, emprise + reprise);
  }
  return 31;
}
console.log(`\nAlertes déclenchées : ${Object.entries(alertes).map(([n, v]) => `${n} ${Math.round(100 * v / (NB * 3))} %`).join(' · ')}`);
console.log('\n2. CAMPAGNE · nuits pour faire tomber un secteur (1 000 campagnes par configuration)\n');
for (const [a, i] of [[1, 4], [2, 3], [3, 7], [5, 5], [10, 0]]) {
  const t = []; for (let s = 0; s < 1000; s++) t.push(campagne(a, i, 77 + s * 13));
  t.sort((x, y) => x - y);
  const moy = t.reduce((x, y) => x + y, 0) / t.length;
  console.log(`  ${String(a).padStart(2)} actifs + ${String(i).padStart(2)} inactifs : médiane ${t[500]} nuits · 10 % des cas ≤ ${t[100]} · 90 % ≤ ${t[900]} · moyenne ${moy.toFixed(1)}${t[900] > 30 ? ' · certaines campagnes ne finissent pas' : ''}`);
}

console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
