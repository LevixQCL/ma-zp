// Zone de non-droit : le centre de la ville, aux mains du milieu.
// Toutes les zones peuvent y envoyer des agents, sans rien demander à personne : les forces
// engagées le même soir sur un secteur s'additionnent, avec un bonus quand plusieurs zones agissent ensemble.
// Un secteur repris rapporte chaque nuit à celles qui l'ont repris (selon leur influence) et apaise les
// quartiers qui le bordent ; il faut y laisser un peu de monde, sinon le milieu le reprend.
// Une zone qui ne joue plus ne bloque personne : son influence s'efface, les autres continuent.
import { CONFIG } from '../config.js';
import { nonDroit as geoNonDroit, ville } from '../ui/ville.js';
import { ND, CHEFS, bonusChef, secteurOuvert, regenSecteur, risqueBlessure } from './constants.js';
import { makeRng } from './rng.js';
import { clamp, round1, forceEngagement, jalon, noter } from './zone.js';
import { carteQuartiers, assurerQuartiers } from './quartiers.js';
import { donnerTrophee, TROPHEE, figure, nomComplet } from './equipe.js';

export const MILIEUX = [
  { id: 'deal', titre: 'Point de deal', texte: 'Des guetteurs à chaque coin de rue, un trafic jour et nuit.' },
  { id: 'recel', titre: 'Atelier de recel', texte: 'Un entrepôt où transitent vélos, téléphones et outillage volés.' },
  { id: 'squat', titre: 'Squat organisé', texte: 'Un immeuble muré où un réseau loue des matelas à la nuit.' },
  { id: 'garage', titre: 'Garage clandestin', texte: 'Des voitures volées démontées en une nuit, les pièces revendues en ligne.' },
  { id: 'rodeos', titre: 'Rodéos urbains', texte: 'Motos-cross et quads tous les soirs ; les riverains n’en peuvent plus.' },
  { id: 'jeux', titre: 'Tripot clandestin', texte: 'Un café baisse ses volets à 22 h et sort ses tables de jeu.' },
  { id: 'sommeil', titre: 'Marchands de sommeil', texte: 'Des caves louées à prix d’or, sans eau ni électricité.' },
  { id: 'contrefacon', titre: 'Marché de contrefaçon', texte: 'Faux sacs, fausses cigarettes et faux médicaments, à même le trottoir.' },
];
export const QG = { id: 'qg', titre: 'Le QG du milieu', texte: 'Le cœur du réseau : c’est d’ici que tout s’organise. Il ne tombera qu’une fois ses abords repris.' };

const fmt1 = (v) => String(round1(v)).replace('.', ',');

/** Nom du quartier d'un secteur. */
export function nomSecteur(k) { return ville(CONFIG.seed).cells[Number(k)].nom; }

/** Crée la zone de non-droit d'une saison (tous les secteurs aux mains du milieu). */
export function creerNonDroit(seed, season = 1) {
  const g = geoNonDroit(CONFIG.seed);
  const rng = makeRng(`${seed}:s${season}:nondroit`);
  const milieux = rng.shuffle(MILIEUX);
  const secteurs = {};
  g.anneau.forEach((c, k) => {
    const e = rng.int(...ND.empriseAnneau);
    secteurs[c] = { cell: c, coeur: false, milieu: milieux[k % milieux.length].id, statut: 'milieu', emprise: e, max: e, influence: {}, chef: null };
  });
  secteurs[g.coeur] = { cell: g.coeur, coeur: true, milieu: QG.id, statut: 'milieu', emprise: ND.empriseCoeur, max: ND.empriseCoeur, influence: {}, chef: null };
  return { season, secteurs };
}

/** Description du milieu installé dans un secteur. */
export function milieuDe(s) { return s.coeur ? QG : MILIEUX.find((m) => m.id === s.milieu) || MILIEUX[0]; }

/** Parts d'influence (0 à 1) sur un secteur, de la plus grande à la plus petite. */
export function partsDe(s) {
  const tot = Object.values(s.influence || {}).reduce((a, b) => a + b, 0);
  if (tot <= 0) return [];
  return Object.entries(s.influence).map(([uid, v]) => ({ uid, part: v / tot })).filter((x) => x.part > 0.005).sort((a, b) => b.part - a.part);
}

/** Bonus de coopération pour k zones engagées le même soir sur un secteur. */
export const multCoop = (k) => 1 + ND.coop * (Math.min(k, ND.coopMax) - 1);

/**
 * Prévision pour l'affichage : emprise ce soir si ces forces sont engagées
 * (`forces` : liste des forces de chaque zone engagée, la mienne comprise).
 */
export function prevoirSecteur(state, s, forces) {
  const f = forces.filter((x) => x > 0);
  const F = f.reduce((a, b) => a + b, 0) * multCoop(f.length);
  const regen = regenSecteur(state, s);
  const haut = s.statut === 'repris' ? s.emprise + regen : Math.min(s.emprise + regen, Math.max(s.emprise, s.max || 100));
  return { force: round1(F), emprise: round1(clamp(haut - F * ND.efficacite, 0, 100)), regen, coop: multCoop(f.length) };
}

/** Force nécessaire pour faire baisser l'emprise d'un secteur (au-delà, elle baisse). */
export const forceTenue = (state, s) => regenSecteur(state, s) / ND.efficacite;

/**
 * Résolution du soir. `ord[uid].secteurs` : agents envoyés par secteur (déjà validés).
 * Renvoie un résumé pour la Gazette.
 */
export function nonDroitResoudre(state, uids, ord, push, T, zoneLabel) {
  if (!state.nonDroit || state.nonDroit.season !== state.season) state.nonDroit = creerNonDroit(state.seed, state.season);
  const nd = state.nonDroit;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:nondroit`);
  const res = { prises: [], rechutes: [], ripostes: [] };
  const nom = (u) => (state.zones[u] ? zoneLabel(state.zones[u]) : 'une zone');
  const cles = Object.keys(nd.secteurs).sort((a, b) => Number(a) - Number(b));
  const regen = Object.fromEntries(cles.map((k) => [k, regenSecteur(state, nd.secteurs[k])]));

  // Riposte du milieu : un secteur tenu reprend un coup (annoncé dans la Gazette).
  const tenus = cles.filter((k) => nd.secteurs[k].statut === 'repris');
  if (tenus.length && rng.chance(ND.riposte)) {
    const k = rng.pick(tenus);
    const f = rng.int(...ND.riposteForce);
    nd.secteurs[k].emprise = clamp(nd.secteurs[k].emprise + f, 0, 100);
    res.ripostes.push({ cell: Number(k), force: f });
    push(5, 'Le milieu riposte', `Riposte à ${nomSecteur(k)} : le milieu tente de reprendre le secteur`, `Son emprise remonte de ${f}. Sans agents sur place, le secteur peut retomber.`);
    for (const p of partsDe(nd.secteurs[k])) if (state.zones[p.uid] && Array.isArray(state.zones[p.uid].rapport)) state.zones[p.uid].rapport.push(`Zone de non-droit : le milieu riposte à ${nomSecteur(k)} (emprise +${f}). Garde du monde sur place.`);
  }

  for (const k of cles) {
    const s = nd.secteurs[k];
    const m = milieuDe(s);
    const ouvert = secteurOuvert(nd, k);
    const engages = ouvert ? uids.filter((u) => ord[u] && ord[u].secteurs && ord[u].secteurs[k] > 0).map((u) => {
      const n = ord[u].secteurs[k];
      // Une figure de l'équipe en mission sur ce secteur : plus de force, moins de blessés.
      const mm = (ord[u].missions || (ord[u].mission ? [ord[u].mission] : [])).find((m) => m.type === 'nondroit' && m.secteur === k);
      const mi = mm ? figure(state.zones[u], mm.role) : null;
      if (mi) (state.zones[u]._missions ||= []).push(mi.role);
      const bonus = mi ? bonusChef(mi.niveau) : 0;
      return { u, n, f: forceEngagement(state.zones[u], n) * (1 + bonus), chef: mi, risque: mi ? CHEFS.nd.blessure : 1 };
    }) : [];
    for (const e of engages) if (e.chef) state.zones[e.u].rapport.push(`Mission : ${nomComplet(e.chef)} mène tes agents à ${nomSecteur(k)} (force +${Math.round(bonusChef(e.chef.niveau) * 100)} %, deux fois moins de risque de blessure).`);
    s.hier = engages.map((e) => ({ u: e.u, n: e.n })); // public après 20:00 : qui y était hier soir
    const coop = multCoop(engages.length);
    const F = engages.reduce((a, e) => a + e.f, 0) * coop;
    const avant = s.emprise;
    const nomS = nomSecteur(k);
    if (s.statut === 'milieu') {
      // Assaut repoussé : pas assez de force pour faire reculer le milieu, ou une zone seule qui tombe dans un piège.
      const seuil = regen[k] / ND.efficacite;
      const tropFaible = engages.length > 0 && F <= seuil;
      const piege = engages.length === 1 && !tropFaible && makeRng(`${state.seed}:s${state.season}:t${T}:ndpiege:${k}`).chance(ND.seulEchec);
      if (tropFaible || piege) {
        s.emprise = round1(clamp(Math.min(s.emprise + regen[k], Math.max(s.emprise, s.max || 100)), 0, 100));
        res.repousses = res.repousses || [];
        res.repousses.push({ cell: Number(k), zones: engages.map((e) => e.u) });
        let blessesTot = 0;
        for (const e of engages) {
          const z = state.zones[e.u];
          const br = makeRng(`${state.seed}:s${state.season}:t${T}:ndrepousse:${k}:${e.u}`);
          let b = 0;
          for (let i = 0; i < e.n; i++) if (br.chance(ND.blesseRepousse * risqueBlessure(z) * e.risque)) b += 1;
          blessesTot += b;
          if (b) { z.blesses.push({ n: b, retour: T + 1 + ND.absenceRepousse, motif: 'blessé' }); z.moral -= 2; jalon(z, `Assaut repoussé à ${nomS} (blessés)`); }
          const autres = engages.filter((x) => x.u !== e.u);
          z.rapport.push(`Zone de non-droit · ${nomS} : assaut repoussé ! ${tropFaible ? `Pas assez de force (${fmt1(F)} pour plus de ${fmt1(seuil)} nécessaires${autres.length ? '' : ', et tu étais seul'})` : 'Seul sur le secteur, ton équipe est tombée dans un piège'} : l’emprise ne baisse pas.${b ? ` ${b} agent${b > 1 ? 's' : ''} blessé${b > 1 ? 's' : ''}, absent${b > 1 ? 's' : ''} ${ND.absenceRepousse} tours (−2 de moral).` : ' Ton équipe rentre sans blessé, cette fois.'} Plus on y va nombreux, moins le milieu résiste.`);
        }
        push(blessesTot ? 6 : 3, 'Zone de non-droit', `Assaut repoussé à ${nomS}`, `${engages.map((e) => nom(e.u)).join(', ')} ${engages.length > 1 ? 'ont' : 'a'} dû battre en retraite${blessesTot ? ` : ${blessesTot} policier${blessesTot > 1 ? 's' : ''} blessé${blessesTot > 1 ? 's' : ''}` : ''}.`);
        continue;
      }
      // Assaut : l'emprise baisse avec la force engagée, le milieu se refait la nuit.
      // Le milieu se refait, mais pas au-delà de sa force de départ : un assaut abandonné laisse des traces un moment.
      s.emprise = round1(clamp(Math.min(s.emprise + regen[k], Math.max(s.emprise, s.max || 100)) - F * ND.efficacite, 0, 100));
      for (const e of engages) s.influence[e.u] = round1((s.influence[e.u] || 0) + e.f);
      // Sans personne, l'influence d'un assaut abandonné s'efface peu à peu.
      if (!engages.length) for (const u of Object.keys(s.influence)) { s.influence[u] = round1(s.influence[u] * ND.usure); if (s.influence[u] < 0.2) delete s.influence[u]; }
      if (s.emprise <= 0) {
        prise(state, s, k, T, push, res, nom);
      } else {
        for (const e of engages) {
          const z = state.zones[e.u];
          const autres = engages.filter((x) => x.u !== e.u);
          z.rapport.push(`Zone de non-droit · ${nomS} (${m.titre.toLowerCase()}) : ${e.n} agent${e.n > 1 ? 's' : ''} engagé${e.n > 1 ? 's' : ''}${autres.length ? ` avec ${autres.map((x) => nom(x.u)).join(', ')} (force +${Math.round((coop - 1) * 100)} % à plusieurs)` : ', seul'}. Emprise du milieu ${Math.round(avant)} → ${Math.round(s.emprise)}.${s.emprise >= avant ? ' Pas assez de monde : le milieu tient bon.' : ''}`);
        }
      }
      // Assaut musclé : risque d'un blessé pour qui engage beaucoup d'agents.
      for (const e of engages) {
        const risque = Math.min(ND.risqueMax, Math.max(0, (e.n - 3) * ND.risqueParAgent)) * risqueBlessure(state.zones[e.u]) * e.risque;
        if (risque && makeRng(`${state.seed}:s${state.season}:t${T}:ndblesse:${k}:${e.u}`).chance(risque)) {
          const z = state.zones[e.u];
          z.blesses.push({ n: 1, retour: T + 4, motif: 'blessé' }); z.moral -= 2;
          jalon(z, `Agent blessé à ${nomS}`);
          z.rapport.push(`${nomS} : un agent blessé pendant l’assaut, absent 3 tours (−2 de moral). Plus tu engages d’agents au même endroit, plus le risque monte.`);
        }
      }
    } else {
      // Secteur tenu : le milieu revient, la garde le repousse ; l'influence suit la garde.
      s.emprise = round1(clamp(s.emprise + ND.remontee - F * ND.efficacite, 0, 100));
      for (const u of Object.keys(s.influence)) { s.influence[u] = round1(s.influence[u] * ND.usure); if (s.influence[u] < 0.2) delete s.influence[u]; }
      for (const e of engages) s.influence[e.u] = round1((s.influence[e.u] || 0) + e.f);
      const ancienChef = s.chef;
      const parts = partsDe(s);
      s.chef = parts.length ? parts[0].uid : null;
      if (s.emprise >= ND.seuilRechute) {
        // Rechute : le secteur retombe aux mains du milieu.
        const anciens = parts.map((p) => p.uid);
        s.statut = 'milieu'; s.emprise = s.coeur ? ND.empriseCoeur : ND.rechute; s.max = Math.max(s.max || 0, s.emprise); s.influence = {}; s.chef = null; s.reprisLe = null;
        res.rechutes.push({ cell: Number(k), anciens });
        push(7, 'Zone de non-droit', `${nomS} retombe aux mains du milieu`, `Faute d’agents sur place, ${m.titre.toLowerCase()} se réinstalle. Il faudra tout recommencer.`);
        for (const u of anciens) if (state.zones[u]) state.zones[u].rapport.push(`Zone de non-droit : ${nomS} est retombé aux mains du milieu (personne pour le tenir). Les retombées s’arrêtent.`);
        continue;
      }
      if (ancienChef && s.chef && ancienChef !== s.chef && state.zones[s.chef]) {
        state.zones[s.chef].rapport.push(`Zone de non-droit : tu deviens la zone de référence à ${nomS} (plus grande influence).`);
        if (state.zones[ancienChef]) state.zones[ancienChef].rapport.push(`Zone de non-droit : ${nom(s.chef)} te dépasse en influence à ${nomS}.`);
      }
      retombees(state, s, k, parts, engages, avant, nom);
    }
  }
  for (const u of uids) if (state.zones[u]) delete state.zones[u]._ndSatisf;
  // Zone de non-droit dans les quartiers voisins : le milieu déborde, un secteur repris apaise.
  contagion(state, nd);
  res.etat = cles.map((k) => ({ cell: Number(k), statut: nd.secteurs[k].statut, emprise: Math.round(nd.secteurs[k].emprise), chef: nd.secteurs[k].chef }));
  return res;
}

function prise(state, s, k, T, push, res, nom) {
  const nomS = nomSecteur(k);
  const m = milieuDe(s);
  const mult = s.coeur ? ND.coeurMult : 1;
  const parts = partsDe(s);
  s.statut = 'repris'; s.emprise = ND.apresPrise; s.reprisLe = T; s.chef = parts.length ? parts[0].uid : null;
  res.prises.push({ cell: Number(k), coeur: s.coeur, zones: parts.map((p) => p.uid) });
  for (const p of parts) {
    const z = state.zones[p.uid];
    if (!z) continue;
    const plein = p.part >= ND.partMin;
    const pts = round1(mult * ((plein ? ND.prise.points : 0) + ND.prise.pointsPart * p.part));
    const prime = round1(ND.prise.prime * mult * p.part);
    z._points += pts; z.stats.pointsAffaires = (z.stats.pointsAffaires || 0) + pts;
    if (prime > 0) { z.budget += prime; z._compta.push({ k: 'nondroit', l: `Reprise de ${nomS}`, v: prime }); }
    const rep = ND.prise.rep + (parts.length > 1 ? 1 : 0);
    if (plein) {
      z.reputation += rep;
      z.moral += ND.prise.moral;
      jalon(z, `Reprise de ${nomS} (+${ND.prise.moral} de moral)`);
      z.satisfaction += ND.prise.satisfaction * mult;
      noter(z, 'satisfaction', `Reprise de ${nomS}`, ND.prise.satisfaction * mult);
    }
    z.stats.secteursRepris = (z.stats.secteursRepris || 0) + 1;
    if (parts.length >= 3) z.stats.affairesOrchestre = (z.stats.affairesOrchestre || 0) + 1;
    if (s.coeur) { z.stats.coeur = (z.stats.coeur || 0) + 1; if (donnerTrophee(z, 'liberateur', state.season, T)) z.rapport.push(`Trophée débloqué : « ${TROPHEE.liberateur.nom} » (${TROPHEE.liberateur.texte.toLowerCase()}).`); }
    z.rapport.push(`Zone de non-droit : ${nomS} est repris ! ${m.titre} démantelé${parts.length > 1 ? ` avec ${parts.filter((x) => x.uid !== p.uid).map((x) => nom(x.uid)).join(', ')}` : ''}. Ta part : ${Math.round(p.part * 100)} % (+${fmt1(pts)} pts, +${fmt1(prime)} k€${plein ? `, +${fmt1(ND.prise.satisfaction * mult)} de satisfaction, +${rep} de réputation, +${ND.prise.moral} de moral` : ` ; sous ${Math.round(ND.partMin * 100)} %, pas de part fixe`}). Laisse un peu de monde sur place pour le garder.`);
  }
  const noms = parts.map((p) => nom(p.uid));
  push(s.coeur ? 12 : 9, s.coeur ? 'Le Cœur est tombé' : 'Reconquête', s.coeur ? `Le QG du milieu tombe à ${nomS} !` : `${nomS} repris au milieu`,
    `${m.titre} démantelé par ${noms.length > 1 ? `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}` : noms[0] || 'les zones du district'}.`, s.chef);
}

function retombees(state, s, k, parts, engages, avant, nom) {
  const nomS = nomSecteur(k);
  const mult = s.coeur ? ND.coeurMult : 1;
  const ayants = parts.filter((p) => p.part >= ND.partMin);
  const tot = ayants.reduce((a, p) => a + p.part, 0) || 1;
  for (const p of ayants) {
    const z = state.zones[p.uid];
    if (!z) continue;
    const pts = round1(mult * (ND.retombees.points + ND.retombees.pointsPart * p.part));
    const b = round1(ND.retombees.budget * mult * p.part), ps = Math.round(ND.retombees.ps * mult);
    // Satisfaction : la population voit le centre se calmer (plafonnée par nuit, tous secteurs confondus).
    const sat = Math.max(0, Math.min(ND.retombees.satisfaction * mult, ND.retombees.satisfactionMax - (z._ndSatisf || 0)));
    z._ndSatisf = (z._ndSatisf || 0) + sat;
    z._points += pts; z.stats.pointsAffaires = (z.stats.pointsAffaires || 0) + pts;
    if (b > 0) { z.budget += b; z._compta.push({ k: 'nondroit', l: `Retombées de ${nomS}`, v: b }); }
    if (sat > 0) { z.satisfaction += sat; noter(z, 'satisfaction', `${nomS} tenu`, sat); }
    z._psEntraide = (z._psEntraide || 0) + ps;
    const e = engages.find((x) => x.u === p.uid);
    z.rapport.push(`Zone de non-droit · ${nomS} tenu (${Math.round(p.part * 100)} % d’influence${s.chef === p.uid ? ', zone de référence' : ''}) : +${fmt1(pts)} pts, +${fmt1(b)} k€${sat ? `, +${fmt1(sat)} de satisfaction` : ''}, +${ps} PS.${e ? ` ${e.n} agent${e.n > 1 ? 's' : ''} de garde.` : ''} Emprise ${Math.round(avant)} → ${Math.round(s.emprise)}${s.emprise >= ND.seuilRechute - 15 ? ` : attention, à ${ND.seuilRechute} il retombe` : ''}.`);
  }
  for (const e of engages) {
    if (ayants.some((p) => p.uid === e.u)) continue;
    state.zones[e.u].rapport.push(`Zone de non-droit · ${nomS} : ${e.n} agent${e.n > 1 ? 's' : ''} de garde. Ton influence monte (${Math.round(((parts.find((p) => p.uid === e.u) || {}).part || 0) * 100)} % ; retombées dès ${Math.round(ND.partMin * 100)} %).`);
  }
}

/** Les quartiers qui touchent la zone de non-droit : le milieu y déborde, un secteur repris les apaise. */
function contagion(state, nd) {
  const c = carteQuartiers(state);
  const parZone = {};
  for (const [k, s] of Object.entries(nd.secteurs)) {
    const d = s.statut === 'repris' ? -ND.apaisement : ND.contagion;
    for (const nb of c.adj[Number(k)]) {
      const u = c.proprio(nb);
      if (!u || !state.zones[u]) continue;
      ((parZone[u] ||= {})[nb] ||= 0);
      parZone[u][nb] += d;
    }
  }
  for (const [u, cells] of Object.entries(parZone)) {
    const z = state.zones[u];
    const q = assurerQuartiers(state, z);
    let tot = 0;
    for (const [nb, d] of Object.entries(cells)) { if (!(nb in q)) continue; q[nb] = round1(clamp(q[nb] + d, 10, 95)); tot += d; }
    const v = Object.values(q);
    if (v.length) z.criminalite = round1(v.reduce((a, b) => a + b, 0) / v.length);
    if (Array.isArray(z.rapport) && Math.abs(tot) >= 0.5) z.rapport.push(tot > 0 ? `Zone de non-droit : le milieu déborde sur tes quartiers frontaliers (+${fmt1(tot)} de tension au total). Reprendre les secteurs voisins l’arrêterait.` : `Zone de non-droit : les secteurs repris à ta frontière apaisent tes quartiers (${fmt1(tot)} de tension au total).`);
  }
}

/** Secteurs qui touchent les quartiers d'une zone. */
export function secteursVoisins(state, uid) {
  const c = carteQuartiers(state);
  const mes = new Set(c.deZone[uid] || []);
  return Object.keys((state.nonDroit && state.nonDroit.secteurs) || {}).filter((k) => c.adj[Number(k)].some((nb) => mes.has(nb)));
}

