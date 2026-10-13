// « Le Quartier » (oct. 2026) : nouvelle règle de la zone de non-droit.
// Chaque secteur du milieu est fermé par des barricades qu'on voit (et parfois 1 ou 2 cachées, le « ? »).
// Trois verbes, un par service : l'Intervention 🔨 casse une barricade par agent, la Recherche 🔦 révèle le « ? »,
// la Proximité 🛡 protège un secteur repris (un bouclier arrête un point d'attaque).
// Le milieu annonce le matin ce qu'il fera le soir : une attaque sur un secteur repris, des barricades en plus ailleurs.
// Pas de dé : ce qu'on voit sur le plateau, c'est ce qui arrivera (sauf le « ? »).
// Décor conservé : le Parrain et ses lieutenants (arrêtés à la prise, interrogés : chaque renseignement retire une
// barricade au QG), les saisies vendues aux enchères, les retombées et l'apaisement des quartiers voisins.
import { ND, secteurOuvert, zonesActivesND, aAnnexe, INFRAS } from './constants.js';
import { makeRng } from './rng.js';
import { round1, clamp, jalon } from './zone.js';
import { ville } from '../ui/ville.js';
import { CONFIG } from '../config.js';
import { assurerMilieu, interrogatoires, LIEUTENANTS } from './milieu.js';

/**
 * Interrupteur. `depuis` : instant (ms) d'un 20:00 ; la règle s'applique aux tours dont l'échéance tombe après
 * (l'écran change donc juste après ce 20:00-là). `force` : mode démo (posé par l'application, jamais par le serveur).
 */
export const QUARTIER = { depuis: null, force: false };

/** La partie joue-t-elle « Le Quartier » ? Une fois converti, le non-droit le reste jusqu'à la fin de la saison. */
export const quartierActif = (state) => !!state && (!!(state.nonDroit && state.nonDroit.quartier && state.nonDroit.season === state.season)
  || QUARTIER.force || (QUARTIER.depuis != null && Number(state.nextDeadline) > QUARTIER.depuis));

// Équilibrage (test/quartier-sim.mjs). N = zones actives. Visé : un district qui joue prend l'anneau en 10 à 14 jours
// et le QG en fin de saison une fois sur deux ; à 3 zones actives, une partie de l'anneau.
export const Q = {
  anneau: { base: 2, parZone: 1.1 },     // barricades d'un secteur de l'anneau au départ
  qg: { base: 4, parZone: 2 },           // barricades du QG
  cacheMax: 2,                            // barricades cachées au plus (le « ? »)
  rechute: { base: 2, parZone: 0.2 },     // barricades remontées sur un secteur reperdu
  renfort: { base: 1, parZone: 1 / 6 },   // barricades ajoutées chaque nuit par le milieu (annoncées le matin)
  attaque: { base: 1, parZone: 0.3, max: 10 }, // force d'une attaque annoncée (+ secteurs du milieu qui touchent la cible)
  deuxAttaques: 4,                        // secteurs de l'anneau repris pour que le milieu attaque deux fois par nuit
  expert: [3, 5],                         // niveau d'Intervention : 1 agent compte double dès 3, 2 agents dès 5
  partRecherche: 0.5,                     // part d'une Recherche dans le partage (un casseur = 1)
  garde: { pts: 1.5, budget: 1, rep: 1, ps: 3 },  // par bouclier sur une attaque repoussée
  parRens: 1,                             // barricades retirées au QG par renseignement au dossier
};
const nZ = (state) => Math.max(1, zonesActivesND(state));
const nomS = (k) => ville(CONFIG.seed).cells[Number(k)].nom;
const adjND = (nd, k) => (ville(CONFIG.seed).adj[Number(k)] || []).map(String).filter((x) => nd.secteurs[x]);
export const barDepart = (state, coeur) => { const P = coeur ? Q.qg : Q.anneau; return Math.round(P.base + P.parZone * nZ(state)); };
export const totalBar = (s) => (s.bar || 0) + (s.cache || 0);

/**
 * Conversion (et création) : un secteur sans barricades en reçoit selon son emprise (proportion de son emprise de départ).
 * Repris : reste repris. Le reste de l'ancienne règle (scènes, gangs, dernier carré, repérage) est effacé.
 */
export function assurerQuartier(state) {
  const nd = state && state.nonDroit;
  if (!nd || nd.season !== state.season) return nd;
  if (nd.v3 === undefined) nd.v3 = true;
  assurerMilieu(state, nd);
  if (!nd.quartier) {
    nd.quartier = true;
    nd.scenes = []; nd.gangs = [];
    if (nd.memoire) { nd.memoire.guetteurs = null; nd.memoire.sansRep = []; }
  }
  for (const [k, s] of Object.entries(nd.secteurs)) {
    if (Number.isFinite(s.bar)) continue;
    delete s.barricade; delete s.repere;
    if (s.statut === 'repris') { s.bar = 0; s.cache = 0; s.vu = true; continue; }
    const r = makeRng(`${state.seed}:s${nd.season}:quartier:${k}`);
    const ratio = clamp((Number(s.emprise) || 0) / Math.max(1, s.max || 100), 0.15, 1);
    s.bar = Math.max(1, Math.round(barDepart(state, s.coeur) * ratio));
    s.cache = r.int(0, Q.cacheMax);
    s.vu = false; // le « ? » (0, 1 ou 2) n'est levé que par une Recherche ou une première attaque
    s.emprise = empriseDe(state, s);
  }
  if (!nd.intentions || nd.intentions.nuit !== state.turn) nd.intentions = intentionsPour(state, nd, state.turn);
  if (!Number.isFinite(nd.rensQG)) nd.rensQG = Object.keys(nd.dossier || {}).length;
  return nd;
}
/** Emprise gardée en phase pour les anciens affichages (carte, Gazette) : barricades restantes sur barricades de départ. */
const empriseDe = (state, s) => (s.statut === 'repris' ? 0 : round1(clamp(100 * totalBar(s) / Math.max(1, barDepart(state, s.coeur)), 0, 100)));

/** Un secteur du milieu est-il attaquable ce soir ? (le QG s'ouvre quand assez de secteurs de l'anneau sont repris) */
export const attaquable = (nd, k) => !!nd.secteurs[k] && nd.secteurs[k].statut === 'milieu' && secteurOuvert(nd, k);

/**
 * Intentions du milieu pour la nuit `nuit`, annoncées dès le matin. Déterministes : l'écran et le calcul de 20:00 voient les mêmes.
 * Attaque : le secteur repris le plus exposé (le plus de voisins encore au milieu). Renforts : sur le secteur attaquable le plus faible.
 */
export function intentionsPour(state, nd, nuit) {
  const N = nZ(state), out = { nuit, attaques: {}, renforts: {} };
  if (nd.parrain && nd.parrain.tombe) return out;
  const cles = Object.keys(nd.secteurs).sort((a, b) => Number(a) - Number(b));
  const rng = makeRng(`${state.seed}:s${nd.season}:t${nuit}:intentions`);
  const expo = (k) => adjND(nd, k).filter((x) => nd.secteurs[x].statut === 'milieu').length;
  const repris = rng.shuffle(cles.filter((k) => nd.secteurs[k].statut === 'repris' && expo(k) > 0)).sort((a, b) => expo(b) - expo(a));
  const nbAtt = Math.min(repris.length, cles.filter((k) => nd.secteurs[k].statut === 'repris' && !nd.secteurs[k].coeur).length >= Q.deuxAttaques ? 2 : 1);
  for (const k of repris.slice(0, nbAtt)) out.attaques[k] = Math.min(Q.attaque.max, Math.round(Q.attaque.base + Q.attaque.parZone * N) + expo(k));
  let R = Math.floor(Q.renfort.base + Q.renfort.parZone * N);
  const cibles = rng.shuffle(cles.filter((k) => attaquable(nd, k))).sort((a, b) => totalBar(nd.secteurs[a]) - totalBar(nd.secteurs[b]));
  for (let i = 0; R > 0 && cibles.length; i++, R--) { const k = cibles[i % Math.min(2, cibles.length)]; out.renforts[k] = (out.renforts[k] || 0) + 1; }
  return out;
}

/** Agents d'Intervention qui comptent double (formation de la zone). */
export const experts = (zone) => { const n = (zone && zone.niveaux && zone.niveaux.intervention) || 1; return n >= Q.expert[1] ? 2 : n >= Q.expert[0] ? 1 : 0; };
/** Coups 🔨 d'une zone sur un secteur : un par casseur, les experts comptent double, le drone ajoute un coup dès 3 casseurs. */
export function coupsDe(zone, desc) {
  if (!desc) return 0;
  const drone = zone && aAnnexe(zone, 'drone') && desc >= INFRAS.drone.minAgents ? 1 : 0;
  return desc + Math.min(desc, experts(zone)) + drone;
}

/**
 * Bilan d'un secteur pour une liste d'engagements [{ u, zone, r: { rep, desc, bouc } }] : ce qui arrivera ce soir.
 * `statut` (secteur du milieu) : 'vide' | 'tombe' | 'peutetre' (tombe si le « ? » est vide) | 'manque'.
 */
export function bilanQuartier(state, k, liste) {
  const nd = state.nonDroit, s = nd.secteurs[k], it = nd.intentions || {};
  const l = liste.filter((x) => x.r && (x.r.rep || x.r.desc || x.r.bouc));
  if (s.statut === 'repris') {
    const att = (it.attaques && it.attaques[k]) || 0, bouc = l.reduce((a, x) => a + (x.r.bouc || 0), 0);
    return { type: 'garde', att, bouc, manque: Math.max(0, att - bouc), inutiles: l.reduce((a, x) => a + (x.r.desc || 0) + (x.r.rep || 0), 0), l };
  }
  const coups = l.reduce((a, x) => a + coupsDe(x.zone, x.r.desc || 0), 0);
  const vu = !!s.vu || l.some((x) => x.r.rep > 0), total = totalBar(s), visibles = s.bar || 0, cache = s.cache || 0;
  const sait = vu ? total : visibles;
  const statut = !coups ? 'vide' : vu ? (coups >= total ? 'tombe' : 'manque') : (coups >= visibles + Q.cacheMax ? 'tombe' : coups >= visibles ? 'peutetre' : 'manque');
  return { type: 'attaque', coups, vu, total, visibles, cache, sait, manque: Math.max(0, sait - coups), statut, renfort: (it.renforts && it.renforts[k]) || 0, inutiles: l.reduce((a, x) => a + (x.r.bouc || 0), 0), l, ouvert: attaquable(nd, k) };
}

/**
 * Résolution de la nuit (appelée par nonDroitResoudre quand « Le Quartier » est actif).
 * `prise(state, s, k, T, push, res, nom)` et `contagion(state, nd)` viennent de nondroit.js (récompenses et quartiers voisins).
 */
export function quartierResoudre(state, uids, ord, push, T, zoneLabel, outils) {
  const nd = state.nonDroit;
  if (nd.v3 === undefined) nd.v3 = true;
  assurerMilieu(state, nd);
  assurerQuartier(state);
  const res = { prises: [], rechutes: [], ripostes: [], quartier: { cassees: {}, repoussees: [], renforts: {} } };
  const nom = (u) => (state.zones[u] ? zoneLabel(state.zones[u]) : 'une zone');
  const rapport = (u, t) => { const z = state.zones[u]; if (z && Array.isArray(z.rapport)) z.rapport.push(t); };
  // Lieutenants arrêtés hier : interrogés cette nuit. Chaque renseignement au dossier retire une barricade au QG.
  interrogatoires(state, nd, T, push);
  rensAuQG(state, nd, push);
  const it = nd.intentions && nd.intentions.nuit === T ? nd.intentions : intentionsPour(state, nd, T);
  const cles = Object.keys(nd.secteurs).sort((a, b) => Number(a) - Number(b));
  // Le QG ne s'ouvre qu'avec l'état de l'anneau au début de la nuit (un secteur repris ce soir ne l'ouvre que demain).
  const ouverts = new Set(cles.filter((k) => attaquable(nd, k)));
  for (const k of cles) {
    const s = nd.secteurs[k], nS = nomS(k);
    const liste = uids.filter((u) => ord[u] && ord[u].secteurs && ord[u].secteurs[k] > 0 && state.zones[u]).map((u) => ({ u, zone: state.zones[u], r: (ord[u].roles && ord[u].roles[k]) || { rep: 0, desc: ord[u].secteurs[k], bouc: 0 } }));
    s.hier = liste.map((x) => ({ u: x.u, n: x.r.rep + x.r.desc + x.r.bouc, r: { rep: x.r.rep, desc: x.r.desc, bouc: x.r.bouc } }));
    if (s.statut === 'repris') { gardeNuit(state, nd, s, k, liste, it, T, push, res, nom, rapport); continue; }
    if (!ouverts.has(k)) { for (const x of liste) rapport(x.u, `Zone de non-droit · ${nS} : le QG n’était pas encore ouvert, tes agents sont rentrés.`); continue; }
    const b = bilanQuartier(state, k, liste);
    // Contribution : coups 🔨 de chaque zone, et la moitié pour une Recherche (cumulée tant que le secteur tient).
    for (const x of liste) {
      const c = coupsDe(x.zone, x.r.desc || 0) + (x.r.rep ? Q.partRecherche : 0);
      if (c > 0) s.influence[x.u] = round1((s.influence[x.u] || 0) + c);
      if (x.r.bouc) rapport(x.u, `Zone de non-droit · ${nS} : ${x.r.bouc} Proximité sur un secteur du milieu ne casse${x.r.bouc > 1 ? 'nt' : ''} rien. La Proximité protège les secteurs repris.`);
    }
    const total = totalBar(s), revele = !s.vu && s.cache > 0 && (b.coups > 0 || liste.some((x) => x.r.rep));
    if (b.coups > 0 && b.coups >= total) {
      res.quartier.cassees[k] = total;
      outils.prise(state, s, k, T, push, res, nom, tirage(state, s, k, T));
      s.bar = 0; s.cache = 0; s.vu = true; s.emprise = 0;
      continue;
    }
    if (b.coups > 0) {
      const reste = Math.max(1, total - b.coups);
      res.quartier.cassees[k] = total - reste;
      s.bar = reste; s.cache = 0; s.vu = true;
      for (const x of liste) {
        const c = coupsDe(x.zone, x.r.desc || 0);
        if (c) rapport(x.u, `Zone de non-droit · ${nS} : ${c} barricade${c > 1 ? 's' : ''} cassée${c > 1 ? 's' : ''} par tes agents (${b.coups} en tout ce soir). Il en reste ${reste}${revele ? ` (le « ? » cachait ${total - (b.visibles)} barricade${total - b.visibles > 1 ? 's' : ''})` : ''}. Ta part du secteur grandit.`);
      }
      push(3, 'Zone de non-droit', `${nS} : ${total - reste} barricade${total - reste > 1 ? 's' : ''} cassée${total - reste > 1 ? 's' : ''}`, `Il en reste ${reste}. ${liste.filter((x) => x.r.desc).map((x) => nom(x.u)).join(', ')} ${liste.filter((x) => x.r.desc).length > 1 ? 'y étaient' : 'y était'}.`);
    } else if (revele) {
      s.vu = true;
      for (const x of liste) if (x.r.rep) rapport(x.u, `Zone de non-droit · ${nS} : ta Recherche a révélé le « ? » : ${s.cache} barricade${s.cache > 1 ? 's' : ''} cachée${s.cache > 1 ? 's' : ''}. Tout le district le voit maintenant.`);
    }
    const n = it.renforts && it.renforts[k];
    if (n) { s.bar += n; res.quartier.renforts[k] = n; }
    s.emprise = empriseDe(state, s); s.max = Math.max(s.max || 0, s.emprise);
  }
  // Retombées des secteurs tenus (partagées selon la part de chacun) et quartiers voisins apaisés.
  for (const k of cles) if (nd.secteurs[k].statut === 'repris' && nd.secteurs[k].reprisLe !== T) outils.retombees(state, nd.secteurs[k], k);
  delete nd._desc;
  for (const u of uids) if (state.zones[u]) delete state.zones[u]._ndSatisf;
  outils.contagion(state, nd);
  // Intentions de demain, annoncées dès ce soir.
  nd.intentions = intentionsPour(state, nd, T + 1);
  annoncer(state, nd, push);
  res.intentions = nd.intentions;
  res.etat = cles.map((k) => ({ cell: Number(k), statut: nd.secteurs[k].statut, coeur: !!nd.secteurs[k].coeur, bar: totalBar(nd.secteurs[k]), chef: nd.secteurs[k].chef }));
  return res;
}

/** Affiche « ARRÊTÉ » : la zone qui garde le lieutenant est tirée au sort selon les parts (un casseur = un billet). */
function tirage(state, s, k, T) {
  const e = Object.entries(s.influence || {}).filter(([u, v]) => v > 0 && state.zones[u]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const tot = e.reduce((a, [, v]) => a + v, 0);
  if (!tot) return null;
  let x = makeRng(`${state.seed}:s${state.season}:t${T}:affiche:${k}`).next() * tot;
  for (const [u, v] of e) { x -= v; if (x <= 0) return u; }
  return e[e.length - 1][0];
}

/** Secteur repris : l'attaque annoncée est arrêtée si les boucliers 🛡 suffisent, sinon le secteur est reperdu. */
function gardeNuit(state, nd, s, k, liste, it, T, push, res, nom, rapport) {
  const nS = nomS(k), att = (it.attaques && it.attaques[k]) || 0;
  const bouc = liste.reduce((a, x) => a + (x.r.bouc || 0), 0);
  // La part de chacun sur un secteur tenu s'efface doucement ; la garde la renouvelle.
  for (const u of Object.keys(s.influence || {})) { s.influence[u] = round1(s.influence[u] * ND.usure); if (s.influence[u] < 0.2) delete s.influence[u]; }
  for (const x of liste) {
    if (x.r.bouc) s.influence[x.u] = round1((s.influence[x.u] || 0) + x.r.bouc);
    const autres = (x.r.desc || 0) + (x.r.rep || 0);
    if (autres) rapport(x.u, `Zone de non-droit · ${nS} : ${autres} agent${autres > 1 ? 's' : ''} hors Proximité sur un secteur repris : ${autres > 1 ? 'ils ne protègent' : 'il ne protège'} rien.`);
  }
  if (!att) { for (const x of liste) if (x.r.bouc && !att) rapport(x.u, `Zone de non-droit · ${nS} : nuit calme, aucune attaque n’était annoncée ici.`); return; }
  if (bouc >= att) {
    res.quartier.repoussees.push({ cell: Number(k), att, zones: liste.filter((x) => x.r.bouc).map((x) => x.u) });
    const G = Q.garde;
    for (const x of liste) {
      if (!x.r.bouc) continue;
      const z = state.zones[x.u], n = Math.min(x.r.bouc, att);
      const pts = round1(G.pts * n), b = round1(G.budget * n);
      z._points += pts; z.stats.pointsAffaires = (z.stats.pointsAffaires || 0) + pts;
      z.budget += b; (z._compta ||= []).push({ k: 'nondroit', l: `Garde de ${nS}`, v: b });
      z.reputation += G.rep; z._psEntraide = (z._psEntraide || 0) + G.ps;
      z.stats.gangsRepousses = (z.stats.gangsRepousses || 0) + 1;
      jalon(z, `Attaque repoussée à ${nS}`);
      rapport(x.u, `Zone de non-droit · ${nS} : l’attaque du milieu (${att}) s’est cassé les dents sur tes ${x.r.bouc} bouclier${x.r.bouc > 1 ? 's' : ''} ! +${pts} pts, +${b} k€, +${G.rep} de réputation, +${G.ps} PS.`);
    }
    push(6, 'Zone de non-droit', `${nS} tient`, `L’attaque du milieu (${att}) est repoussée par ${liste.filter((x) => x.r.bouc).map((x) => nom(x.u)).join(', ')}.`);
    return;
  }
  // Reperdu : le milieu remonte quelques barricades et installe un nouveau lieutenant.
  const anciens = Object.keys(s.influence || {});
  s.statut = 'milieu'; s.influence = {}; s.chef = null; s.reprisLe = null; delete s.confiance;
  s.bar = Math.round(Q.rechute.base + Q.rechute.parZone * nZ(state)); s.cache = 0; s.vu = true; s.emprise = empriseDe(state, s); s.max = Math.max(s.max || 0, s.emprise);
  if (!s.coeur) { const r = makeRng(`${state.seed}:s${nd.season}:t${T}:lt:${k}`); s.lieutenant = { nom: r.pick(LIEUTENANTS[s.milieu] || LIEUTENANTS.deal), etat: 'libre', pieces: 1, remplacant: true }; }
  res.rechutes.push({ cell: Number(k), anciens, attaque: att, boucliers: bouc });
  push(7, 'Zone de non-droit', `${nS} est reperdu`, `Le milieu attaquait avec ${att}, il n’y avait que ${bouc} bouclier${bouc > 1 ? 's' : ''}. ${s.bar} barricades remontées.`);
  for (const u of new Set([...anciens, ...liste.map((x) => x.u)])) rapport(u, `Zone de non-droit : ${nS} est reperdu (attaque ${att}, ${bouc} bouclier${bouc > 1 ? 's' : ''} sur place). Le milieu y remonte ${s.bar} barricades.`);
}

/** Renseignements arrivés au dossier depuis la dernière nuit : une barricade de moins au QG pour chacun. */
function rensAuQG(state, nd, push) {
  const n = Object.keys(nd.dossier || {}).length, avant = Number.isFinite(nd.rensQG) ? nd.rensQG : n;
  nd.rensQG = n;
  if (n <= avant) return;
  const qg = Object.entries(nd.secteurs).find(([, s]) => s.coeur);
  if (!qg || qg[1].statut !== 'milieu') return;
  const [k, s] = qg, ret = Math.min((n - avant) * Q.parRens, Math.max(0, totalBar(s) - 1));
  if (!ret) return;
  const vis = Math.min(s.bar, ret); s.bar -= vis; s.cache = Math.max(0, (s.cache || 0) - (ret - vis));
  s.emprise = empriseDe(state, s);
  push(5, 'Le milieu', `Le QG perd ${ret} barricade${ret > 1 ? 's' : ''}`, `Grâce aux aveux au dossier du Parrain, on sait par où passer à ${nomS(k)}.`);
}

function annoncer(state, nd, push) {
  const it = nd.intentions, a = Object.entries(it.attaques), r = Object.entries(it.renforts);
  if (!a.length && !r.length) return;
  const txt = [...a.map(([k, n]) => `⚔ ${n} sur ${nomS(k)}`), ...r.map(([k, n]) => `+${n} 🧱 sur ${nomS(k)}`)].join(' · ');
  push(a.length ? 6 : 3, 'Le milieu annonce', a.length ? `Le milieu attaquera ${a.map(([k]) => nomS(k)).join(' et ')} demain soir` : 'Le milieu se barricade', `${txt}. Un bouclier 🛡 (Proximité) arrête un point d’attaque.`);
  for (const [k, n] of a) for (const u of Object.keys(nd.secteurs[k].influence || {})) {
    const z = state.zones[u];
    if (z && Array.isArray(z.rapport)) z.rapport.push(`Zone de non-droit : le milieu attaquera ${nomS(k)} demain soir avec ${n}. Il faut ${n} Proximité sur place, avec les autres zones, sinon le secteur est reperdu.`);
  }
}

// ───── Placer pour moi (robots, adjoint d'une zone sans ordres, bouton de l'écran) ─────
// Ce que les zones précédentes ont posé ce soir (les robots « lisent la radio ») : { k: { rep, desc, bouc, coups } }.
const radio = { cle: null, ann: {} };
export function radioQuartier(state) {
  const cle = `${state.seed}:${state.season}:${state.turn}`;
  if (radio.cle !== cle) { radio.cle = cle; radio.ann = {}; }
  return radio.ann;
}
/**
 * Placement conseillé de `agents` agents (au plus ND.maxTotal) : des boucliers là où une attaque n'est pas couverte,
 * une Recherche sur le « ? » le plus utile, puis les casseurs là où il manque le moins. `ann` : ce que les autres ont posé.
 * Renvoie { secteurs, roles } au format des ordres.
 */
export function planQuartier(zone, state, agents, ann = {}, opts = {}) {
  const nd = state.nonDroit, it = nd.intentions || {}, secteurs = {}, roles = {};
  let dispo = Math.min(ND.maxTotal, Math.max(0, Math.floor(agents)));
  const mettre = (k, role, n) => {
    n = Math.min(n, dispo, ND.maxParSecteur - (secteurs[k] || 0));
    if (n <= 0) return 0;
    (roles[k] ||= { rep: 0, desc: 0, bouc: 0 })[role] += n; secteurs[k] = (secteurs[k] || 0) + n; dispo -= n;
    const a = (ann[k] ||= { rep: 0, desc: 0, bouc: 0, coups: 0 }); a[role] += n;
    if (role === 'desc') a.coups += coupsDe(zone, roles[k].desc) - coupsDe(zone, roles[k].desc - n);
    return n;
  };
  const cles = Object.keys(nd.secteurs).sort((a, b) => Number(a) - Number(b));
  // 1. Boucliers : d'abord là où la zone a une part, puis ailleurs.
  const mien = (k) => ((nd.secteurs[k].influence || {})[zone.uid] || 0);
  for (const k of cles.filter((x) => nd.secteurs[x].statut === 'repris' && (it.attaques || {})[x]).sort((a, b) => mien(b) - mien(a))) {
    const manque = it.attaques[k] - ((ann[k] || {}).bouc || 0);
    if (manque > 0 && (opts.garde !== false)) mettre(k, 'bouc', manque);
  }
  // 2 et 3. Attaque : on vise le secteur ouvert où il reste le moins à casser (tout le monde au même endroit).
  const reste = (k) => { const s = nd.secteurs[k], a = ann[k] || {}; return (s.vu || a.rep ? totalBar(s) : (s.bar || 0) + Q.cacheMax) - (a.coups || 0); };
  for (let garde = 0; dispo > 0 && garde < 4; garde++) {
    const cibles = cles.filter((k) => attaquable(nd, k) && reste(k) > 0).sort((a, b) => reste(a) - reste(b) || Number(a) - Number(b));
    const k = cibles[0];
    if (!k) break;
    const s = nd.secteurs[k];
    if (!s.vu && s.cache !== 0 && !((ann[k] || {}).rep) && dispo >= 3 && opts.reperer !== false) mettre(k, 'rep', 1);
    const besoin = reste(k);
    // Assez d'agents pour finir : juste ce qu'il faut ; sinon tout ce qu'on a (les barricades cassées restent cassées).
    let n = 0; while (n < dispo && coupsDe(zone, n) < besoin) n += 1;
    if (!mettre(k, 'desc', Math.max(1, n))) break;
  }
  return { secteurs, roles };
}
