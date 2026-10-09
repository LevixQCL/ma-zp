// Zone de non-droit : le centre de la ville, aux mains du milieu.
// Toutes les zones peuvent y envoyer des agents, sans rien demander à personne : les forces
// engagées le même soir sur un secteur s'additionnent, avec un bonus quand plusieurs zones agissent ensemble.
// Un secteur repris rapporte chaque nuit à celles qui l'ont repris (selon leur influence) et apaise les
// quartiers qui le bordent ; il faut y laisser un peu de monde, sinon le milieu le reprend.
// Une zone qui ne joue plus ne bloque personne : son influence s'efface, les autres continuent.
import { CONFIG } from '../config.js';
import { nonDroit as geoNonDroit, ville } from '../ui/ville.js';
import { ND, CHEFS, bonusChef, secteurOuvert, regenSecteur, risqueBlessure, zonesActivesND, INFRAS, aAnnexe, LOTS } from './constants.js';
import { talentVal, talent, noterChef, FRONT, niveauChef } from './chef.js';
import { makeRng } from './rng.js';
import { reglesV2 } from './regles.js';
import { clamp, round1, forceEngagement, forceRole, jalon, noter } from './zone.js';
import { carteQuartiers, assurerQuartiers } from './quartiers.js';
import { donnerTrophee, TROPHEE, figure, nomComplet } from './equipe.js';
import { lies, PACTE } from './pactes.js';

/** Rôles dans la zone de non-droit : actifs avec les règles de la saison 2 (state.regles >= 2). */
export const ND_ROLES = true;
/** Les rôles sont-ils en jeu dans cette partie ? */
export const rolesND = (state) => !!(state && state.nonDroit && (state.nonDroit.roles || (ND_ROLES && reglesV2(state))));

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
/**
 * Rôles : la faille de chaque milieu (connue de tous après un premier repérage).
 * repSans / repAvec : force de la descente sans / avec repérage ; ratio : bouclage par point de descente ;
 * butin : multiplicateur des saisies ; piege : multiplicateur du risque de piège sans repérage ;
 * boucForce : le bouclage compte aussi dans la descente ; regen : le milieu se refait plus vite ; soirs : soirs d'ouverture.
 */
export const FAILLES = {
  deal:        { titre: 'Guetteurs à chaque coin', texte: 'Sans repérage, la descente est vue de loin (force ×0,4, piège deux fois plus probable). Repéré : ×1,5.', repSans: 0.4, repAvec: 1.5, piege: 2, interp: true },
  recel:       { titre: 'Un entrepôt plein', texte: 'Saisies ×1,5 si le secteur est bien bouclé.', butin: 1.5, interp: true },
  squat:       { titre: 'Il faut un mandat', texte: 'Sans repérage, pas de mandat : la descente ne peut pas entrer. Repéré : ×1,5.', repSans: 0, repAvec: 1.5, butin: 0.6 },
  garage:      { titre: 'Un butin énorme', texte: 'Saisies ×2, à condition que le secteur soit bouclé.', butin: 2, interp: true },
  rodeos:      { titre: 'Ils filent', texte: 'Il faut autant de bouclage que de descente, sinon les motos s’échappent.', ratio: 1, butin: 0.8 },
  jeux:        { titre: 'Ouvert 2 soirs sur 7', texte: 'Un soir fermé, la descente ne trouve personne (×0,3). Un soir ouvert : ×1,5 et la caisse de la nuit.', soirs: 2, butin: 1.2 },
  sommeil:     { titre: 'Des victimes à protéger', texte: 'Le bouclage (Proximité) met les locataires à l’abri : il compte aussi pour moitié dans la descente.', boucForce: 0.5, butin: 0.6 },
  contrefacon: { titre: 'Le marché se reforme', texte: 'Pas de violence (pas de blessé), mais le milieu se refait 30 % plus vite.', regen: 1.3, sansBlesse: true },
  qg:          { titre: 'Le cœur du réseau', texte: 'Sans repérage, impossible d’y entrer. Il faut aussi autant de bouclage que de descente.', repSans: 0, ratio: 1, butin: 2, interp: true },
};
export const faille = (s) => FAILLES[s.coeur ? 'qg' : s.milieu] || FAILLES.deal;
/** Le secteur est-il repéré ce soir ? */
export const repere = (s, T) => !!(s && s.repere && s.repere.de <= T && T <= s.repere.a);
/** Jour de la semaine (0 = premier jour) et soirs d'ouverture d'un tripot. */
export const ouvertCeSoir = (s, T) => { const f = faille(s); return !f.soirs || (s.soirs || []).includes((T - 1) % 7); };

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
  for (const s of Object.values(secteurs)) if (s.milieu === 'jeux') { const a = rng.int(0, 6); s.soirs = [a, (a + 2 + rng.int(0, 2)) % 7].sort(); }
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
/** Gang annoncé ce soir sur ce secteur (ou null). */
export function gangCeSoir(state, s) {
  const nd = state && state.nonDroit;
  return (nd && Array.isArray(nd.gangs) && nd.gangs.find((g) => g.nuit === state.turn && Number(g.cell) === Number(s.cell))) || null;
}

export function prevoirSecteur(state, s, forces) {
  const f = forces.filter((x) => x > 0);
  const F = f.reduce((a, b) => a + b, 0) * multCoop(f.length);
  const g = s.statut === 'repris' ? gangCeSoir(state, s) : null;
  const regen = regenSecteur(state, s) + (g ? g.force : 0);
  const haut = s.statut === 'repris' ? s.emprise + regen : Math.min(s.emprise + regen, Math.max(s.emprise, s.max || 100));
  return { force: round1(F), emprise: round1(clamp(haut - F * ND.efficacite, 0, 100)), regen, coop: multCoop(f.length) };
}

/**
 * Rôles : prévision d'un secteur du milieu pour ce soir (affichage). `liste` : [{ zone, r: { rep, desc, bouc } }].
 * Sans tirage : le piège est donné en probabilité. Les bonus d'annexes et de chef ne sont pas comptés.
 */
export function prevoirRoles(state, s, liste) {
  const R0 = ND.roles, F = faille(s), T = state.turn;
  const l = liste.filter((x) => x.zone && x.r && (x.r.rep || x.r.desc || x.r.bouc));
  const R = l.reduce((a, x) => a + forceRole(x.zone, 'rep', x.r.rep || 0, T), 0);
  const D = l.reduce((a, x) => a + forceRole(x.zone, 'desc', x.r.desc || 0, T), 0);
  const B = l.reduce((a, x) => a + forceRole(x.zone, 'bouc', x.r.bouc || 0, T), 0);
  const nD = l.reduce((a, x) => a + (x.r.desc || 0), 0), nB = l.reduce((a, x) => a + (x.r.bouc || 0), 0), nR = l.reduce((a, x) => a + (x.r.rep || 0), 0);
  const coop = multCoop(l.length), rep = repere(s, T), ouvert = ouvertCeSoir(s, T);
  const regen = regenSecteur(state, s) * (F.regen || 1);
  const haut = Math.min(s.emprise + regen, Math.max(s.emprise, s.max || 100));
  let mult = rep ? (F.repAvec ?? R0.repAvec) : (F.repSans ?? R0.sansRep);
  if (F.soirs) mult *= ouvert ? 1.5 : 0.3;
  const ratio = F.ratio ?? R0.ratio;
  const Deff = (D + B * (F.boucForce || 0)) * mult * coop;
  const fuite = D > 0 ? clamp(1 - B / (D * ratio), 0, 1) : 0;
  const piege = D > 0 && !rep ? Math.min(0.9, (l.length === 1 ? R0.piegeSeul : R0.piegeGroupe) * (F.piege || 1)) : 0;
  const tropFaible = D > 0 && Deff * ND.efficacite <= regen;
  const effet = Deff * ND.efficacite;
  const apres = D > 0 && !tropFaible ? Math.max(0, haut - effet * (1 - R0.perteFuite * fuite)) : haut;
  const butin = D > 0 && !tropFaible ? R0.butin * effet * (1 - fuite) * (F.butin || 1) * (F.soirs && ouvert ? 2 : 1) * (s.coeur ? ND.coeurMult : 1) : 0;
  // Agents à prévoir : 2 au repérage, assez de descente pour faire reculer, le bouclage qui va avec.
  const parAgent = forceRole(l[0] ? l[0].zone : { niveaux: {}, moral: 60 }, 'desc', 1, T) || 1;
  // Estimé comme si le secteur était repéré (c'est ainsi qu'il faut l'attaquer), à 3 zones.
  const multRep = (F.repAvec ?? R0.repAvec) * (F.soirs ? 1.5 : 1) * multCoop(Math.max(3, l.length));
  const besoinDesc = Math.min(12, Math.max(3, Math.ceil(regen / ND.efficacite / multRep / parAgent) + 2));
  return { R, D, B, nR, nD, nB, coop, rep, ouvert, mult, fuite, piege, tropFaible, apres: round1(apres), haut, butin: round1(butin), ratio, repFait: R >= R0.repSeuil,
    besoin: { rep: R >= R0.repSeuil || (s.repere && s.repere.a > T) ? 0 : 2, desc: besoinDesc, bouc: Math.ceil(Math.max(nD, besoinDesc) * ratio) } };
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
  if (ND_ROLES && reglesV2(state) && !nd.roles) nd.roles = true;
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:nondroit`);
  const res = { prises: [], rechutes: [], ripostes: [] };
  const nom = (u) => (state.zones[u] ? zoneLabel(state.zones[u]) : 'une zone');
  const cles = Object.keys(nd.secteurs).sort((a, b) => Number(a) - Number(b));
  const regen = Object.fromEntries(cles.map((k) => [k, regenSecteur(state, nd.secteurs[k])]));

  const assauts = new Set();
  // Gangs annoncés hier pour ce soir.
  const gangs = Object.fromEntries((nd.gangs || []).filter((g) => g.nuit === T).map((g) => [String(g.cell), g]));
  // Riposte du milieu : un secteur tenu reprend un coup (annoncé dans la Gazette), sauf là où un gang est déjà annoncé.
  const tenus = cles.filter((k) => nd.secteurs[k].statut === 'repris' && !gangs[k]);
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
      // Saison 2 : cellule drone (dès 3 agents, le drone guide l'assaut), talent « Tacticien ».
      const zz = state.zones[u];
      const drone = aAnnexe(zz, 'drone') && n >= INFRAS.drone.minAgents;
      const f0 = forceEngagement(zz, n, T) * (drone ? INFRAS.drone.force : 1);
      // Gros lots de la vente aux enchères (hélicoptère, blindé).
      const ndLots = (zz.lots || []).map((l) => LOTS[l.id] && LOTS[l.id].nd).filter(Boolean);
      const fLots = ndLots.reduce((a, x) => a * (1 + (x.force || 0)), 1), bLots = ndLots.reduce((a, x) => a * (x.blessure || 1), 1);
      const mz = (drone ? INFRAS.drone.force : 1) * fLots * (1 + bonus) * (1 + talentVal(zz, 'tacticien', 'force', 0));
      const r = nd.roles ? ((ord[u].roles && ord[u].roles[k]) || { rep: 0, desc: n, bouc: 0 }) : null;
      const fr = r ? { rep: forceRole(zz, 'rep', r.rep, T) * mz, desc: forceRole(zz, 'desc', r.desc, T) * mz, bouc: forceRole(zz, 'bouc', r.bouc, T) * mz } : null;
      const f = fr ? fr.rep * ND.roles.poidsRep + fr.desc + fr.bouc : f0 * fLots * (1 + bonus) * (1 + talentVal(zz, 'tacticien', 'force', 0));
      return { u, n, f, f0: f, r, fr, chef: mi, drone,
        risque: (mi ? CHEFS.nd.blessure : 1) * (drone ? INFRAS.drone.blessure : 1) * talentVal(zz, 'tacticien', 'blessure', 1) * bLots };
    }) : [];
    // Chef en première ligne : sur le secteur où la zone engage le plus d'agents.
    for (const e of engages) { const zz = state.zones[e.u]; if (zz._front === 'nondroit' && zz.chef && !zz._frontUtilise) { const ks = Object.entries((ord[e.u] && ord[e.u].secteurs) || {}).sort((a, b) => b[1] - a[1]); if (ks.length && ks[0][0] === k) { e.f *= 1 + FRONT.nondroit.force * niveauChef(zz.chef, 'commandement'); zz._frontUtilise = `il a mené l’assaut sur ${nomSecteur(k)}`; } } }
    // Salle de crise : +15 % de force quand au moins deux zones attaquent ensemble.
    if (engages.length >= 2) for (const e of engages) if (aAnnexe(state.zones[e.u], 'crise')) { e.f *= 1 + INFRAS.crise.coop; state.zones[e.u].rapport.push(`Salle de crise : coordination avec les autres zones sur ${nomSecteur(k)}, force +${Math.round(INFRAS.crise.coop * 100)} %.`); }
    for (const e of engages) if (talent(state.zones[e.u], 'tacticien')) noterChef(state.zones[e.u], 'tacticien', `Tacticien : ton assaut sur ${nomSecteur(k)} frappe plus fort (+8 %), avec moins de blessés.`);
    for (const e of engages) if (e.drone) state.zones[e.u].rapport.push(`Cellule drone : le drone survole ${nomSecteur(k)} et guide tes ${e.n} agents (force +${Math.round((INFRAS.drone.force - 1) * 100)} %, moins de blessés).`);
    // Jumelage terrain : +20 % de force pour deux zones jumelées sur le même secteur.
    for (const e of engages) {
      const jum = engages.filter((x) => x.u !== e.u && lies(state, e.u, x.u, 'terrain', T));
      if (jum.length) { e.f *= 1 + PACTE.ndBonus; state.zones[e.u].rapport.push(`Jumelage : avec ${jum.map((x) => state.zones[x.u].nom).join(', ')} sur ${nomSecteur(k)}, ta force est majorée de ${Math.round(PACTE.ndBonus * 100)} %.`); }
    }
    for (const e of engages) if (e.chef) state.zones[e.u].rapport.push(`Mission : ${nomComplet(e.chef)} mène tes agents à ${nomSecteur(k)} (force +${Math.round(bonusChef(e.chef.niveau) * 100)} %, deux fois moins de risque de blessure).`);
    s.hier = engages.map((e) => ({ u: e.u, n: e.n })); // public après 20:00 : qui y était hier soir
    if (s.statut === 'milieu' && engages.length) assauts.add(k);
    const coop = multCoop(engages.length);
    const F = engages.reduce((a, e) => a + e.f, 0) * coop;
    const avant = s.emprise;
    const nomS = nomSecteur(k);
    if (s.statut === 'milieu' && nd.roles) { assautRoles(state, nd, s, k, engages, regen[k], T, push, res, nom); continue; }
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
      const gang = gangs[k];
      s.emprise = round1(clamp(s.emprise + ND.remontee + (gang ? gang.force : 0) - F * ND.efficacite, 0, 100));
      for (const u of Object.keys(s.influence)) { s.influence[u] = round1(s.influence[u] * ND.usure); if (s.influence[u] < 0.2) delete s.influence[u]; }
      for (const e of engages) s.influence[e.u] = round1((s.influence[e.u] || 0) + e.f);
      const ancienChef = s.chef;
      const parts = partsDe(s);
      s.chef = parts.length ? parts[0].uid : null;
      if (s.emprise >= ND.seuilRechute) {
        // Rechute : le secteur retombe aux mains du milieu.
        const anciens = parts.map((p) => p.uid);
        s.statut = 'milieu'; s.emprise = s.coeur ? ND.empriseCoeur : ND.rechute; s.max = Math.max(s.max || 0, s.emprise); s.influence = {}; s.chef = null; s.reprisLe = null;
        res.rechutes.push({ cell: Number(k), anciens, gang: !!gang });
        if (gang) push(8, 'Zone de non-droit', `Le gang reprend ${nomS}`, `Pas assez d’agents de garde face au gang annoncé (force ${gang.force}).`);
        push(7, 'Zone de non-droit', `${nomS} retombe aux mains du milieu`, `Faute d’agents sur place, ${m.titre.toLowerCase()} se réinstalle. Il faudra tout recommencer.`);
        for (const u of anciens) if (state.zones[u]) state.zones[u].rapport.push(`Zone de non-droit : ${nomS} est retombé aux mains du milieu (personne pour le tenir). Les retombées s’arrêtent.`);
        continue;
      }
      if (ancienChef && s.chef && ancienChef !== s.chef && state.zones[s.chef]) {
        state.zones[s.chef].rapport.push(`Zone de non-droit : tu deviens la zone de référence à ${nomS} (plus grande influence).`);
        if (state.zones[ancienChef]) state.zones[ancienChef].rapport.push(`Zone de non-droit : ${nom(s.chef)} te dépasse en influence à ${nomS}.`);
      }
      if (gang) gangRepousse(state, k, gang, engages, T, push, nom, res);
      retombees(state, s, k, parts, engages, avant, nom);
    }
  }
  // Première ligne : une zone engagée sur tous les assauts du soir (secteurs du milieu attaqués), deux soirs d'affilée.
  if (assauts.size) for (const u of uids) {
    const z = state.zones[u]; if (!z) continue;
    const mes = new Set(Object.keys((ord[u] && ord[u].secteurs) || {}).filter((k) => ord[u].secteurs[k] > 0));
    z.stats.serieAssauts = [...assauts].every((k) => mes.has(k)) ? (z.stats.serieAssauts || 0) + 1 : 0;
  }
  if (nd._reflux) {
    for (const [k, v] of Object.entries(nd._reflux)) {
      const s = nd.secteurs[k];
      if (!s || s.statut !== 'milieu' || v < 0.5) continue;
      s.emprise = round1(clamp(s.emprise + v, 0, 100)); s.max = Math.max(s.max || 0, s.emprise);
      (res.reflux ||= []).push({ cell: Number(k), v: round1(v) });
      if (v >= 2) push(4, 'Zone de non-droit', `Le milieu se replie sur ${nomSecteur(k)}`, `Faute de bouclage, ceux qui ont filé s’y installent (emprise +${Math.round(v)}).`);
    }
    delete nd._reflux;
  }
  planifierGangs(state, nd, T, push, res);
  for (const u of uids) if (state.zones[u]) delete state.zones[u]._ndSatisf;
  // Zone de non-droit dans les quartiers voisins : le milieu déborde, un secteur repris apaise.
  contagion(state, nd);
  res.etat = cles.map((k) => ({ cell: Number(k), statut: nd.secteurs[k].statut, emprise: Math.round(nd.secteurs[k].emprise), chef: nd.secteurs[k].chef }));
  return res;
}

/** Gang repoussé : chaque zone de garde ce soir-là est récompensée. */
function gangRepousse(state, k, gang, engages, T, push, nom, res) {
  const nomS = nomSecteur(k), G = ND.gangs;
  (res.gangsRepousses ||= []).push({ cell: Number(k), zones: engages.map((e) => e.u) });
  for (const e of engages) {
    const z = state.zones[e.u];
    if (!z) continue;
    z.stats.gangsRepousses = (z.stats.gangsRepousses || 0) + 1;
    z.reputation += G.rep; z._psEntraide = (z._psEntraide || 0) + G.ps;
    jalon(z, `Gang repoussé à ${nomS}`);
    if (donnerTrophee(z, 'rempart', state.season, T)) z.rapport.push(`Trophée débloqué : « ${TROPHEE.rempart.nom} » (${TROPHEE.rempart.texte.toLowerCase()}).`);
    z.rapport.push(`Zone de non-droit · ${nomS} : le gang (force ${gang.force}) s’est cassé les dents sur ta garde ! +${G.rep} de réputation, +${G.ps} PS.`);
  }
  push(engages.length ? 7 : 4, 'Zone de non-droit', `${nomS} tient face au gang`, engages.length ? `${engages.map((e) => nom(e.u)).join(', ')} ${engages.length > 1 ? 'ont' : 'a'} tenu la garde.` : 'Le secteur a tenu, de justesse.');
}

/**
 * Gangs de demain : au-delà de ND.gangs.seuil secteurs de l'anneau tenus, un gang par secteur en plus ;
 * le Cœur tenu en ajoute un et renforce tous les gangs. Annoncés tout de suite (Gazette, rapports, carte).
 */
function planifierGangs(state, nd, T, push, res) {
  const G = ND.gangs;
  const tenus = Object.keys(nd.secteurs).filter((k) => nd.secteurs[k].statut === 'repris');
  const anneau = tenus.filter((k) => !nd.secteurs[k].coeur).length, coeur = tenus.some((k) => nd.secteurs[k].coeur);
  const n = Math.min(tenus.length, Math.max(0, anneau - G.seuil) + (coeur ? 1 : 0));
  if (!n) { nd.gangs = []; return; }
  const force = Math.min(G.max, G.base + G.parZone * zonesActivesND(state)) + (coeur ? G.coeur : 0);
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:gangs`);
  const cibles = rng.shuffle(tenus.slice().sort((a, b) => Number(a) - Number(b))).slice(0, n);
  nd.gangs = cibles.map((k) => ({ cell: Number(k), force, nuit: T + 1 }));
  res.gangs = nd.gangs;
  const noms = cibles.map((k) => nomSecteur(k));
  push(6, 'Zone de non-droit', `Le milieu prépare ${n > 1 ? `${n} descentes` : 'une descente'} demain soir`, `${n > 1 ? 'Des gangs visent' : 'Un gang vise'} ${noms.join(', ')} (force ${force}${coeur ? ', renforcés depuis la chute du QG' : ''}). Renforcez la garde.`);
  for (const k of cibles) for (const p of partsDe(nd.secteurs[k])) {
    const z = state.zones[p.uid];
    if (z && Array.isArray(z.rapport)) z.rapport.push(`Zone de non-droit : un gang attaquera ${nomSecteur(k)} demain soir (force ${force} : +${force} d’emprise). Mets du monde de garde, avec les autres zones.`);
  }
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


/** Secteurs de l'anneau voisins d'un secteur (pour le repli du milieu quand ça file). */
function voisinsND(nd, k) {
  const adj = ville(CONFIG.seed).adj[Number(k)] || [];
  return adj.map(String).filter((x) => nd.secteurs[x] && !nd.secteurs[x].coeur);
}

/**
 * Rôles : un secteur du milieu ce soir. Repérage (la faille, puis 2 soirs « repéré »), descente (emprise),
 * bouclage (fuite). Saisies à chaque descente réussie, partagées selon la force engagée (une part au repérage).
 */
function assautRoles(state, nd, s, k, engages, regen0, T, push, res, nom) {
  const R0 = ND.roles, F = faille(s), nomS = nomSecteur(k);
  const sc = (e) => (e.f0 ? e.f / e.f0 : 1);
  const fR = (e) => (e.fr ? e.fr.rep * sc(e) : 0), fD = (e) => (e.fr ? e.fr.desc * sc(e) : 0), fB = (e) => (e.fr ? e.fr.bouc * sc(e) : 0);
  const R = engages.reduce((a, e) => a + fR(e), 0), D = engages.reduce((a, e) => a + fD(e), 0), B = engages.reduce((a, e) => a + fB(e), 0);
  const nz = engages.length, coop = multCoop(nz);
  const rep0 = s.repere || null, repOK = repere(s, T);
  const regen = regen0 * (F.regen || 1);
  const haut = Math.min(s.emprise + regen, Math.max(s.emprise, s.max || 100));
  const stat = (u, c, v = 1) => { const z = state.zones[u]; if (z) z.stats[c] = (z.stats[c] || 0) + v; };
  // 1. Repérage : la faille devient publique, le secteur est repéré à partir de demain.
  if (R >= R0.repSeuil) {
    const neuf = !s.connue;
    s.connue = true;
    const par = engages.filter((e) => fR(e) > 0).map((e) => e.u);
    s.repere = { de: T + 1, a: T + R0.repDuree, par: [...new Set([...(rep0 && rep0.a >= T + 1 ? rep0.par : []), ...par])] };
    for (const u of par) { stat(u, 'reperages'); state.zones[u].rapport.push(`Zone de non-droit · ${nomS} : repérage fait${neuf ? `, faille trouvée : ${F.titre.toLowerCase()}` : ''}. Secteur repéré les ${R0.repDuree} prochains soirs ; tu toucheras ${Math.round(R0.tuyau * 100)} % des saisies des descentes qui en profitent.`); }
    if (neuf) push(5, 'Zone de non-droit', `${nomS} : la faille est trouvée`, `${par.map(nom).join(', ')} : ${F.titre.toLowerCase()}. ${F.texte}`);
  } else if (R > 0) {
    for (const e of engages) if (fR(e) > 0) state.zones[e.u].rapport.push(`Zone de non-droit · ${nomS} : repérage trop léger (il faut au moins 2 agents de Recherche, à plusieurs zones si besoin).`);
  }
  for (const e of engages) s.influence[e.u] = round1((s.influence[e.u] || 0) + e.f);
  if (D <= 0) {
    // Personne en descente : le milieu se refait.
    s.emprise = round1(clamp(haut, 0, 100));
    return;
  }
  // 2. Descente.
  let mult = repOK ? (F.repAvec ?? R0.repAvec) : (F.repSans ?? R0.sansRep);
  const ouvert = ouvertCeSoir(s, T);
  if (F.soirs) mult *= ouvert ? 1.5 : 0.3;
  const Deff = (D + B * (F.boucForce || 0)) * mult * coop;
  const fuite = clamp(1 - B / (D * (F.ratio ?? R0.ratio)), 0, 1);
  const piegeP = repOK ? 0 : Math.min(0.9, (nz === 1 ? R0.piegeSeul : R0.piegeGroupe) * (F.piege || 1));
  const piege = piegeP > 0 && makeRng(`${state.seed}:s${state.season}:t${T}:ndpiege:${k}`).chance(piegeP);
  const tropFaible = Deff * ND.efficacite <= regen;
  const nDesc = (e) => (e.r ? e.r.desc : e.n);
  if (piege || tropFaible) {
    s.emprise = round1(clamp(haut, 0, 100));
    (res.repousses ||= []).push({ cell: Number(k), zones: engages.map((e) => e.u) });
    let tot = 0;
    for (const e of engages) {
      const z = state.zones[e.u];
      let b = 0;
      if (!F.sansBlesse) { const br = makeRng(`${state.seed}:s${state.season}:t${T}:ndrepousse:${k}:${e.u}`); for (let i = 0; i < nDesc(e); i++) if (br.chance(ND.blesseRepousse * risqueBlessure(z) * e.risque)) b += 1; }
      tot += b;
      if (b) { z.blesses.push({ n: b, retour: T + 1 + ND.absenceRepousse, motif: 'blessé' }); z.moral -= 2; jalon(z, `Assaut repoussé à ${nomS} (blessés)`); stat(e.u, 'ndBlesses', b); }
      const pourquoi = piege ? (s.milieu === 'deal' ? 'sans repérage, les guetteurs ont donné l’alerte : piège' : 'sans repérage, ton équipe est tombée dans un piège')
        : mult === 0 ? (s.coeur ? 'sans repérage, impossible d’entrer au QG' : 'sans repérage, pas de mandat : impossible d’entrer')
        : F.soirs && !ouvert ? 'le tripot était fermé ce soir' : `pas assez de force (${fmt1(Deff)} pour plus de ${fmt1(regen / ND.efficacite)})`;
      z.rapport.push(`Zone de non-droit · ${nomS} : assaut repoussé, ${pourquoi}.${b ? ` ${b} agent${b > 1 ? 's' : ''} blessé${b > 1 ? 's' : ''}, absent${b > 1 ? 's' : ''} ${ND.absenceRepousse} tours (−2 de moral).` : ''}`);
    }
    push(tot ? 6 : 3, 'Zone de non-droit', `Assaut repoussé à ${nomS}`, `${engages.map((e) => nom(e.u)).join(', ')} : ${piege ? 'piège' : mult === 0 ? 'porte close' : 'pas assez de monde'}${tot ? `, ${tot} policier${tot > 1 ? 's' : ''} blessé${tot > 1 ? 's' : ''}` : ''}.`);
    return;
  }
  const avant = s.emprise;
  const effet = Deff * ND.efficacite;
  s.emprise = round1(clamp(haut - effet * (1 - R0.perteFuite * fuite), 0, 100));
  // Repli : ceux qui ont filé renforcent un secteur voisin encore aux mains du milieu.
  if (fuite > 0.05) {
    const v = voisinsND(nd, k).filter((x) => nd.secteurs[x].statut === 'milieu');
    if (v.length) { const c = v.sort((a, b) => nd.secteurs[a].emprise - nd.secteurs[b].emprise || Number(a) - Number(b))[0]; (nd._reflux ||= {})[c] = (nd._reflux[c] || 0) + R0.reflux * fuite * effet; }
  }
  // Saisies, partagées : une part au repérage qui a ouvert la voie, le reste selon la force engagée ce soir.
  const butin = R0.butin * effet * (1 - fuite) * (F.butin || 1) * (F.soirs && ouvert ? 2 : 1) * (s.coeur ? ND.coeurMult : 1);
  const poids = Object.fromEntries(engages.map((e) => [e.u, fR(e) * R0.poidsRep + fD(e) + fB(e)]));
  const totP = Object.values(poids).reduce((a, b) => a + b, 0) || 1;
  const tuyau = repOK && rep0 ? rep0.par.filter((u) => state.zones[u]) : [];
  const partB = {};
  for (const [u, w] of Object.entries(poids)) partB[u] = (tuyau.length ? 1 - R0.tuyau : 1) * w / totP;
  for (const u of tuyau) partB[u] = (partB[u] || 0) + R0.tuyau / tuyau.length;
  const interp = F.interp ? Math.round((Deff / 4) * (1 - fuite)) : 0;
  for (const [u, p] of Object.entries(partB)) {
    const z = state.zones[u];
    if (!z) continue;
    const b = round1(butin * p);
    if (b > 0) { z.budget += b; z._compta.push({ k: 'nondroit', l: `Saisies à ${nomS}`, v: b }); stat(u, 'ndSaisies', b); }
    const ici = engages.some((e) => e.u === u);
    if (tuyau.includes(u)) { stat(u, 'reperagesUtiles'); z._points += R0.tuyauPts; z.stats.pointsAffaires = (z.stats.pointsAffaires || 0) + R0.tuyauPts; }
    if (!ici) z.rapport.push(`Zone de non-droit · ${nomS} : ton repérage a payé, la descente des autres te reverse ${fmt1(b)} k€ de saisies (+${R0.tuyauPts} pt).`);
  }
  if (interp) for (const e of engages) if (fD(e) > 0) stat(e.u, 'ndInterpellations', Math.max(1, Math.round(interp * partB[e.u])));
  (res.descentes ||= []).push({ cell: Number(k), zones: engages.map((e) => e.u), butin: round1(butin), fuite: round1(fuite), interp, repere: repOK });
  if (s.emprise <= 0) {
    prise(state, s, k, T, push, res, nom);
    s.repere = null;
  } else {
    for (const e of engages) {
      if (!(fD(e) > 0 || fB(e) > 0)) continue;
      const z = state.zones[e.u];
      z.rapport.push(`Zone de non-droit · ${nomS} : ${repOK ? 'descente sur un secteur repéré' : 'descente sans repérage'}${nz > 1 ? ` à ${nz} zones (+${Math.round((coop - 1) * 100)} %)` : ''}. Emprise ${Math.round(avant)} → ${Math.round(s.emprise)} · saisies ${fmt1(butin)} k€ (ta part ${Math.round((partB[e.u] || 0) * 100)} %)${interp ? ` · ${interp} interpellé${interp > 1 ? 's' : ''}` : ''}${fuite > 0.15 ? ` · ${Math.round(fuite * 100)} % ont filé faute de bouclage` : ''}.`);
    }
  }
  // Risque de blessure d'une grosse descente (comme avant).
  if (!F.sansBlesse) for (const e of engages) {
    const risque = Math.min(ND.risqueMax, Math.max(0, (nDesc(e) - 3) * ND.risqueParAgent)) * risqueBlessure(state.zones[e.u]) * e.risque;
    if (risque && makeRng(`${state.seed}:s${state.season}:t${T}:ndblesse:${k}:${e.u}`).chance(risque)) {
      const z = state.zones[e.u];
      z.blesses.push({ n: 1, retour: T + 4, motif: 'blessé' }); z.moral -= 2; stat(e.u, 'ndBlesses');
      jalon(z, `Agent blessé à ${nomS}`);
      z.rapport.push(`${nomS} : un agent blessé pendant la descente, absent 3 tours (−2 de moral).`);
    }
  }
}
