// Relations entre zones : entraide, manœuvres, duels, Conseil de police, péril et faillite.
import { makeRng } from './rng.js';
import { GRADES, gradeFor, PS, START, TUTELLE, REPUTATION } from './constants.js';
import { agentsDisponibles, clamp, round1, newZone, enDifficulte } from './zone.js';

export const absT = (state, T = state.turn) => (state.season - 1) * 100 + T;
const nomZone = (z) => `ZP ${z.code} ${z.nom}`;

// ───── Entraide ─────
export const AIDE = { budgetMax: 10, agentsMax: 3, dureePret: 3 };

// ───── Manœuvres ─────
export const MANOEUVRES = {
  debauchage: { nom: 'Débauchage', texte: 'Attirer un agent de la zone visée chez toi. Plus son moral est bas, plus ça marche.', parade: 'Garder un bon moral, ou verser une prime au personnel ce jour-là.',
    gain: 'un agent de plus chez toi, pour de bon (tu paies son salaire)', cible: 'un agent de moins et −2 de moral',
    defense: 'moral au-dessus de 70 (chance ×0,6), prime au personnel le même jour (chance ×0,5) ; une zone de 10 agents ou moins est intouchable. Moral sous 50 : chance ×1,25.' },
  dessaisissement: { nom: 'Dessaisissement', texte: 'Demander au parquet de te confier son plus vieux dossier (ouvert depuis plus de 3 tours). Il faut plus de Recherche qu’elle ce jour-là.', parade: 'Ne pas laisser vieillir ses dossiers.',
    gain: 'son plus vieux dossier : si tu l’élucides, les points et la satisfaction sont pour toi', cible: 'perd le dossier et −2 de satisfaction',
    defense: 'n’avoir aucun dossier de plus de 3 tours, ou mettre plus de force en Recherche que l’attaquant ce jour-là (agents × niveau).' },
  signalement: { nom: 'Signalement à l’Inspection', texte: 'Signaler une zone dont la paperasse déborde (plus de 14 dossiers). Vrai : Inspection chez elle et +3 de réputation pour toi. Faux : −5 de réputation.', parade: 'Garder sa paperasse à jour.',
    gain: '+3 de réputation si le signalement est fondé (pas de hasard) ; −5 s’il est faux', cible: 'amende de 5 k€ et −5 de satisfaction',
    defense: 'garder sa paperasse à 14 dossiers ou moins (visible sur la Carte si tu regardes la zone).' },
  poste: { nom: 'Poste avancé', texte: 'Pendant 5 tours, tu prélèves 30 % des points des affaires résolues par cette zone (sauf si tu y participes).', parade: '6 agents ou plus en Proximité annulent le bonus.',
    gain: '30 % des points de ses affaires disputées pendant 5 tours', cible: 'perd 30 % de ses points d’affaires pendant 5 tours',
    defense: 'mettre 6 agents ou plus en Proximité les jours où elle résout une affaire.' },
};
export const MAN = { base: 0.7, pas: 0.15, min: 0.1, fenetre: 7, coutReputation: 2, protectionTours: 5 };

/** Chance de réussite de la prochaine manœuvre de cette zone (avant les parades de la cible). */
export function chanceBase(state, z, T = state.turn) {
  const n = (z.manoeuvres || []).filter((t) => absT(state, T) - t < MAN.fenetre).length;
  return Math.max(MAN.min, MAN.base - MAN.pas * n);
}

/** Raison pour laquelle une zone ne peut pas être visée (null si elle peut l'être). */
export function cibleImpossible(state, cible, T = state.turn) {
  if (!cible) return 'Zone inconnue';
  if (cible.peril) return 'Zone en péril : on ne s’acharne pas sur un collègue à terre';
  if (cible.tutelle) return 'Zone sous tutelle : on ne s’acharne pas sur un collègue à terre';
  if ((cible.protegeJusqua || 0) > absT(state, T)) return 'Nouvelle zone, protégée quelques tours';
  return null;
}

// ───── Duels ─────
export const DUEL_INDICATEURS = {
  satisfaction: { nom: 'Satisfaction gagnée', mesure: (z) => z.satisfaction },
  affaires: { nom: 'Affaires résolues', mesure: (z) => z.stats.affairesGagnees + z.stats.dossiersResolus + z.stats.decouvertes },
  incidents: { nom: 'Incidents traités', mesure: (z) => z.stats.traites },
};
export const DUEL = { duree: 5, enjeu: 10 };
export function enDuel(state, uid) { return (state.duels || []).some((d) => d.a === uid || d.b === uid); }

// ───── Conseil de police ─────
export const THEMES = {
  routiere: { nom: 'Semaine de la sécurité routière', effet: 'Roulage +50 %, sans effet « chasse aux PV »' },
  proximite: { nom: 'Semaine de la proximité', effet: 'Proximité +30 %' },
};
export const MOTIONS_CHEF = {
  prime: { titre: 'Prime collective de fin de mois', texte: '+3 de moral pour toutes les zones.' },
  amnistie: { titre: 'Journée de rattrapage administratif', texte: '−5 dossiers de paperasse pour toutes les zones.' },
  subside: { titre: 'Subside régional exceptionnel', texte: '+3 k€ pour toutes les zones.' },
};

function motionsDuConseil(state, T, rng) {
  const actives = Object.values(state.zones).filter((z) => z.toursSansOrdres < 3);
  const motions = [];
  motions.push({ id: 'dotation', titre: 'Répartition d’une dotation fédérale de 20 k€', options: ['Parts égales entre les zones actives', 'Prime aux zones les plus coopératives (FIPA honorées, indices partagés)'] });
  motions.push({ id: 'theme', titre: 'Thème de la semaine', options: ['Aucun thème', THEMES.routiere.nom, THEMES.proximite.nom] });
  // Blâme : les zones les moins coopératives de la semaine.
  const score = (z) => (z.stats.fipaFaites - z.stats.fipaHonorees) * 2 + (z.manoeuvres || []).filter((t) => absT(state, T) - t < 7).length + (z.stats.refusFipa || 0);
  const candidats = actives.filter((z) => score(z) > 0).sort((a, b) => score(b) - score(a)).slice(0, 3);
  if (candidats.length) motions.push({ id: 'blame', titre: 'Blâme : −10 de réputation et −30 PS', options: ['Personne', ...candidats.map((z) => nomZone(z))], cibles: [null, ...candidats.map((z) => z.uid)] });
  const chef = (state.motionsChef || []).shift();
  if (chef) motions.push({ id: 'chef', titre: `Motion de ${chef.auteurNom} : ${MOTIONS_CHEF[chef.type].titre}`, texte: MOTIONS_CHEF[chef.type].texte, options: ['Contre', 'Pour'], type: chef.type });
  void rng;
  return motions;
}

// ───── Péril et faillite ─────
export const PERIL = { budget: -15, agents: 8, moral: 10, tours: 3 };
export function enPeril(z, T) {
  const raisons = [];
  if (z.budget < PERIL.budget) raisons.push(`budget sous ${PERIL.budget} k€`);
  if (agentsDisponibles(z, T + 1) < PERIL.agents) raisons.push(`moins de ${PERIL.agents} agents disponibles`);
  if (z.moral < PERIL.moral) raisons.push(`moral sous ${PERIL.moral}`);
  return raisons;
}

/**
 * Avant la simulation des zones : entraide, manœuvres, réponses aux duels, votes du Conseil.
 * Renvoie les postes avancés actifs (utilisés par les affaires disputées).
 */
export function rivalitesPre(state, uids, ord, push, T) {
  const A = absT(state, T);
  const rng = makeRng(`${state.seed}:s${state.season}:t${T}:rivalites`);
  state.aReveler = state.aReveler || [];
  // Révélation des auteurs des manœuvres de la veille.
  for (const r of state.aReveler) push(5, 'Révélation', r.titre, r.texte);
  state.aReveler = [];

  // 1. Entraide : budget immédiat, agents prêtés à partir du tour suivant.
  for (const u of uids) {
    const a = ord[u].aide;
    if (!a || !a.cible || a.cible === u || !state.zones[a.cible]) continue;
    const z = state.zones[u], c = state.zones[a.cible];
    const budget = clamp(a.budget || 0, 0, Math.min(AIDE.budgetMax, Math.max(0, z.budget)));
    const agents = clamp(a.agents || 0, 0, Math.min(AIDE.agentsMax, Math.max(0, agentsDisponibles(z, T) - 8)));
    if (!budget && !agents) continue;
    if (budget) { z.budget -= budget; c.budget += budget; (z._compta ||= []).push({ k: 'entraide', l: 'Entraide envoyée', v: -budget }); (c._compta ||= []).push({ k: 'entraide', l: 'Entraide reçue', v: budget }); }
    if (agents) {
      z.blesses.push({ n: agents, retour: T + 1 + AIDE.dureePret, motif: 'prêté' });
      c.renforts = [...(c.renforts || []), { n: agents, debut: T + 1, retour: T + 1 + AIDE.dureePret, de: u }];
    }
    const bonus = enDifficulte(c) ? 5 : (c.blesses || []).some((b) => b.retour > T && b.motif !== 'prêté') ? 3 : 1;
    z.reputation += bonus; z.stats.aides = (z.stats.aides || 0) + 1;
    if (enDifficulte(c)) z.stats.sauvetages = (z.stats.sauvetages || 0) + 1;
    const quoi = [budget ? `${String(budget).replace('.', ',')} k€` : '', agents ? `${agents} agent${agents > 1 ? 's' : ''} pour ${AIDE.dureePret} tours` : ''].filter(Boolean).join(' et ');
    z.rapport.push(`Entraide : tu envoies ${quoi} à ${nomZone(c)} (+${bonus} de réputation).`);
    c.rapport.push(`Entraide : ${nomZone(z)} t’envoie ${quoi}.`);
    if (enDifficulte(c) || bonus >= 3) push(6, 'Solidarité', `${nomZone(z)} vient en aide à ${nomZone(c)}`, `${quoi.charAt(0).toUpperCase()}${quoi.slice(1)}.`);
  }

  // 2. Manœuvres.
  state.postes = (state.postes || []).filter((p) => p.jusqua >= A);
  for (const u of uids) {
    const m = ord[u].manoeuvre;
    if (!m || !MANOEUVRES[m.type] || !m.cible || m.cible === u) continue;
    const z = state.zones[u], c = state.zones[m.cible];
    const refus = cibleImpossible(state, c, T);
    if (refus) { z.rapport.push(`Manœuvre annulée : ${refus.toLowerCase()}.`); continue; }
    let chance = chanceBase(state, z, T);
    z.manoeuvres = [...(z.manoeuvres || []).filter((t) => A - t < MAN.fenetre), A];
    z.stats.manoeuvresSaison = (z.stats.manoeuvresSaison || 0) + 1;
    z.reputation -= MAN.coutReputation;
    const oc = ord[m.cible] || {};
    let ok = false, detail = '';
    switch (m.type) {
      case 'debauchage':
        if (c.moral < 50) chance *= 1.25; else if (c.moral > 70) chance *= 0.6;
        if (oc.depenses && oc.depenses.prime) chance *= 0.5;
        if (c.agents <= 10) { chance = 0; detail = 'effectif déjà trop réduit'; }
        ok = rng.chance(chance);
        if (ok) { c.agents -= 1; z.agents += 1; c.moral -= 2; detail = 'un agent change de zone'; }
        break;
      case 'dessaisissement': {
        const vieux = c.dossiers.filter((d) => d.age > 3).sort((x, y) => y.age - x.age)[0];
        const forceA = ((ord[u].alloc || {}).recherche || 0) * (0.8 + 0.2 * z.niveaux.recherche);
        const forceC = ((oc.alloc || {}).recherche || 0) * (0.8 + 0.2 * c.niveaux.recherche);
        if (!vieux) { detail = 'aucun vieux dossier à reprendre'; break; }
        if (forceA <= forceC) { detail = 'sa Recherche est plus forte que la tienne'; break; }
        ok = rng.chance(chance);
        if (ok) { c.dossiers = c.dossiers.filter((d) => d !== vieux); z.dossiers.push({ ...vieux, id: ++z.dossierSeq, age: 0 }); c.satisfaction -= 2; detail = `le dossier « ${vieux.titre} » est transféré`; }
        break;
      }
      case 'signalement':
        if (c.paperasse > 14) {
          ok = true; detail = 'la paperasse débordait bien';
          c.budget -= 5; (c._compta ||= []).push({ k: 'inspection', l: 'Amende de l’Inspection (signalement)', v: -5 }); c.satisfaction -= 5; c.inspectionCooldown = 4; z.reputation += 3;
          c.rapport.push('Inspection générale sur signalement : amende de 5 k€ et −5 de satisfaction.');
        } else { z.reputation -= 5; detail = 'signalement infondé (−5 de réputation)'; }
        break;
      case 'poste':
        ok = rng.chance(chance);
        if (ok) { state.postes.push({ auteur: u, cible: m.cible, jusqua: A + 4 }); detail = 'poste installé pour 5 tours'; }
        break;
      default: break;
    }
    const nom = MANOEUVRES[m.type].nom;
    // Scandale : une zone bien vue qui se fait prendre la main dans le sac perd davantage.
    let scandale = '';
    if (!ok && z.reputation + MAN.coutReputation > REPUTATION.scandale) { z.reputation -= REPUTATION.scandaleMalus; scandale = `, scandale : −${REPUTATION.scandaleMalus} de plus, ta bonne réputation fait parler`; }
    z.rapport.push(`Manœuvre ${nom.toLowerCase()} contre ${nomZone(c)} : ${ok ? 'réussie' : 'échec'}${detail ? `, ${detail}` : ''} (−${MAN.coutReputation} de réputation${scandale}).`);
    c.rapport.push(`Une zone a tenté un ${nom.toLowerCase()} contre toi : ${ok ? 'réussi' : 'raté'}. La Gazette révélera son nom demain.`);
    push(ok ? 7 : 5, 'Manœuvre', `${nom} ${ok ? 'réussi' : 'raté'} contre ${nomZone(c)}`, 'L’auteur sera révélé demain.');
    state.aReveler.push({ titre: `C’était ${nomZone(z)}`, texte: `${nom} contre ${nomZone(c)}, ${ok ? 'réussi' : 'raté'}.` });
  }

  // 3. Duels : propositions et réponses.
  state.duels = state.duels || [];
  for (const d of state.duels) {
    if (d.etape !== 'propose' || d.tourReponse !== T) continue;
    const r = ord[d.b] && ord[d.b].duelReponse;
    const za = state.zones[d.a], zb = state.zones[d.b];
    if (!za || !zb) { d.fini = true; continue; }
    if (r && r.id === d.id && r.accepte) {
      d.etape = 'encours'; d.debut = T + 1; d.fin = T + DUEL.duree;
      d.base = null; // mesuré au début du tour suivant
      push(6, 'Duel', `${nomZone(za)} et ${nomZone(zb)} croisent le fer`, `Pendant ${DUEL.duree} tours : ${DUEL_INDICATEURS[d.ind].nom.toLowerCase()}. Enjeu : ${DUEL.enjeu} points de réputation.`);
    } else {
      d.fini = true;
      push(4, 'Duel', `${nomZone(zb)} décline le défi de ${nomZone(za)}`, `Le duel portait sur : ${DUEL_INDICATEURS[d.ind].nom.toLowerCase()}.`);
    }
  }
  for (const u of uids) {
    const dd = ord[u].duel;
    if (!dd || !DUEL_INDICATEURS[dd.ind] || !dd.cible || dd.cible === u || !state.zones[dd.cible]) continue;
    if (enDuel(state, u) || enDuel(state, dd.cible)) { state.zones[u].rapport.push('Duel impossible : une des deux zones a déjà un duel en cours.'); continue; }
    const refus = cibleImpossible(state, state.zones[dd.cible], T);
    if (refus) { state.zones[u].rapport.push(`Duel impossible : ${refus.toLowerCase()}.`); continue; }
    state.duelSeq = (state.duelSeq || 0) + 1;
    state.duels.push({ id: `d${state.season}-${state.duelSeq}`, a: u, b: dd.cible, ind: dd.ind, etape: 'propose', tourReponse: T + 1 });
    state.zones[dd.cible].rapport.push(`Duel : ${nomZone(state.zones[u])} te défie (${DUEL_INDICATEURS[dd.ind].nom.toLowerCase()}, ${DUEL.duree} tours). Réponds au prochain tour.`);
    state.zones[u].rapport.push(`Duel : défi envoyé à ${nomZone(state.zones[dd.cible])}.`);
  }

  // 4. Conseil de police : dépouillement.
  const cons = state.conseil;
  const res = [];
  if (cons && cons.tour === T) {
    const votants = uids.filter((u) => state.zones[u].toursSansOrdres < 3);
    for (const m of cons.motions) {
      const compte = m.options.map(() => 0);
      for (const u of votants) {
        const v = ord[u].votes && ord[u].votes[m.id];
        if (Number.isInteger(v) && v >= 0 && v < m.options.length) compte[v] += 1;
      }
      let best = 0;
      for (let i = 1; i < compte.length; i++) if (compte[i] > compte[best]) best = i;
      const exaequo = compte.filter((c) => c === compte[best]).length > 1;
      if (exaequo) best = 0; // égalité : on garde le statu quo
      appliquerMotion(state, m, best, votants, T);
      res.push({ titre: m.titre, choix: m.options[best], votes: compte, total: compte.reduce((s, c) => s + c, 0) });
      push(m.id === 'blame' && best > 0 ? 11 : 6, 'Conseil de police', `${m.titre} : ${m.options[best].toLowerCase()}`, `${compte.reduce((s, c) => s + c, 0)} vote${compte.reduce((s, c) => s + c, 0) > 1 ? 's' : ''} exprimé${compte.reduce((s, c) => s + c, 0) > 1 ? 's' : ''}${exaequo ? ', égalité : statu quo' : ''}.`);
    }
    state.conseil = null;
  }
  // Motions de Chef de corps (une par saison).
  for (const u of uids) {
    const mc = ord[u].motionChef;
    const z = state.zones[u];
    if (!mc || !MOTIONS_CHEF[mc] || gradeFor(z.ps).nom !== 'Chef de corps' || z.motionSaison) continue;
    z.motionSaison = true;
    state.motionsChef = [...(state.motionsChef || []), { type: mc, auteur: u, auteurNom: nomZone(z) }];
    z.rapport.push('Conseil : ta motion sera soumise au vote du prochain Conseil.');
  }
  return { conseil: res };
}

function appliquerMotion(state, m, choix, votants, T) {
  const zs = votants.map((u) => state.zones[u]);
  if (m.id === 'dotation') {
    if (!zs.length) return;
    if (choix === 0) for (const z of zs) { z.budget += round1(20 / zs.length); (z._compta ||= []).push({ k: 'conseil', l: 'Conseil : dotation partagée', v: round1(20 / zs.length) }); z.rapport.push(`Conseil : dotation fédérale partagée, +${String(round1(20 / zs.length)).replace('.', ',')} k€.`); }
    else {
      const poids = zs.map((z) => 1 + z.stats.fipaHonorees * 2 + z.stats.indicesPartages);
      const tot = poids.reduce((s, p) => s + p, 0);
      zs.forEach((z, i) => { const g = round1(20 * poids[i] / tot); z.budget += g; (z._compta ||= []).push({ k: 'conseil', l: 'Conseil : prime à la coopération', v: g }); z.rapport.push(`Conseil : prime à la coopération, +${String(g).replace('.', ',')} k€.`); });
    }
  } else if (m.id === 'theme') {
    state.theme = choix === 1 ? { id: 'routiere', jusqua: absT(state, T) + 7 } : choix === 2 ? { id: 'proximite', jusqua: absT(state, T) + 7 } : null;
  } else if (m.id === 'blame' && choix > 0) {
    const z = state.zones[m.cibles[choix]];
    if (z) { z.reputation = clamp(z.reputation - 10, 0, 100); z.ps = Math.max(0, z.ps - 30); z.rapport.push('Conseil : blâme voté contre ta zone (−10 de réputation, −30 PS).'); }
  } else if (m.id === 'chef' && choix === 1) {
    for (const z of Object.values(state.zones)) {
      if (m.type === 'prime') z.moral = clamp(z.moral + 3, 0, 100);
      if (m.type === 'amnistie') z.paperasse = Math.max(0, z.paperasse - 5);
      if (m.type === 'subside') { z.budget += 3; (z._compta ||= []).push({ k: 'conseil', l: 'Conseil : subside exceptionnel', v: 3 }); }
    }
  }
}

/** Thème de la semaine en cours (ou null). */
export function themeActif(state, T = state.turn) {
  return state.theme && state.theme.jusqua >= absT(state, T) ? state.theme : null;
}

/** Zones qui ont un poste avancé actif chez `cible` (annulé si la cible met 6 agents ou plus en Proximité). */
export function postesContre(state, cible, ord, T = state.turn) {
  const A = absT(state, T);
  if (ord[cible] && ord[cible].alloc && ord[cible].alloc.proximite >= 6) return [];
  return [...new Set((state.postes || []).filter((p) => p.cible === cible && p.jusqua >= A).map((p) => p.auteur))];
}

/** Bonus de force d'un poste avancé contre une zone concurrente. */
export function bonusPoste(state, auteur, concurrents, ord, T = state.turn) {
  const A = absT(state, T);
  return (state.postes || []).some((p) => p.auteur === auteur && p.jusqua >= A && concurrents.includes(p.cible)
    && !((ord[p.cible] && ord[p.cible].alloc && ord[p.cible].alloc.proximite) >= 6)) ? 1.3 : 1;
}

/**
 * Après la simulation : fin des duels, péril et faillite, compteur du district,
 * annonce du Conseil (la veille du dimanche).
 */
export function rivalitesPost(state, uids, push, T, nextWeekday, players = {}) {
  const res = { duels: [], faillites: [], perils: [] };
  // Duels.
  for (const d of state.duels || []) {
    if (d.fini || d.etape !== 'encours') continue;
    const za = state.zones[d.a], zb = state.zones[d.b];
    if (!za || !zb) { d.fini = true; continue; }
    const mes = DUEL_INDICATEURS[d.ind].mesure;
    if (!d.base) d.base = { a: mes(za) - 0, b: mes(zb) - 0, t: T };
    if (T >= d.fin) {
      const ga = round1(mes(za) - d.base.a), gb = round1(mes(zb) - d.base.b);
      d.fini = true;
      if (ga === gb) { push(5, 'Duel', `Match nul entre ${nomZone(za)} et ${nomZone(zb)}`, `${DUEL_INDICATEURS[d.ind].nom} : ${ga} partout.`); res.duels.push({ a: nomZone(za), b: nomZone(zb), nul: true }); continue; }
      const [w, l, gw, gl] = ga > gb ? [za, zb, ga, gb] : [zb, za, gb, ga];
      const enjeu = Math.min(DUEL.enjeu, l.reputation);
      w.reputation = clamp(w.reputation + enjeu, 0, 100); l.reputation = clamp(l.reputation - enjeu, 0, 100);
      w.stats.duelsGagnes = (w.stats.duelsGagnes || 0) + 1;
      w.rapport.push(`Duel gagné contre ${nomZone(l)} (${gw} contre ${gl}) : +${enjeu} de réputation.`);
      l.rapport.push(`Duel perdu contre ${nomZone(w)} (${gl} contre ${gw}) : −${enjeu} de réputation.`);
      push(8, 'Duel', `${nomZone(w)} remporte son duel contre ${nomZone(l)}`, `${DUEL_INDICATEURS[d.ind].nom} : ${gw} contre ${gl}. ${enjeu} points de réputation changent de main.`);
      res.duels.push({ gagnant: nomZone(w), perdant: nomZone(l), score: `${gw} contre ${gl}` });
    }
  }
  state.duels = (state.duels || []).filter((d) => !d.fini);

  // Péril, tutelle et faillite.
  state.toursSansFaillite = (state.toursSansFaillite || 0) + 1;
  res.tutelles = [];
  for (const u of uids) {
    const z = state.zones[u];
    const raisons = enPeril(z, T);
    if (z.tutelle) {
      if (T < z.tutelle.fin) {
        z.tutelle.raisons = raisons;
        const n = z.tutelle.fin - T;
        z.rapport.push(`Sous tutelle : encore ${n} tour${n > 1 ? 's' : ''}.${raisons.length ? ` Toujours en difficulté : ${raisons.join(', ')}.` : ' La zone tient le cap.'}`);
      } else if (raisons.length) {
        faillite(state, z, push, T, players);
        res.faillites.push(nomZone(z));
      } else {
        z.tutelle = null;
        z.rapport.push('Fin de la tutelle : ta zone a retrouvé son autonomie. Bravo.');
        push(8, 'Redressement', `${nomZone(z)} sort de tutelle`, 'La zone a tenu bon et retrouve son autonomie.');
      }
      continue;
    }
    if (z.peril) {
      if (!raisons.length) {
        z.rapport.push('Zone sortie de péril : bravo, la barre est redressée.');
        push(7, 'Redressement', `${nomZone(z)} sort de la zone rouge`, 'Le chef a redressé la barre à temps.');
        z.peril = null;
      } else if (T >= z.peril.fin && !z.tutelleSaison) {
        mettreSousTutelle(z, push, T, raisons);
        res.tutelles.push(nomZone(z));
      } else if (T >= z.peril.fin) {
        faillite(state, z, push, T, players);
        res.faillites.push(nomZone(z));
      } else {
        z.peril.raisons = raisons;
        z.rapport.push(`Zone en péril : ${raisons.join(', ')}. Encore ${z.peril.fin - T} tour${z.peril.fin - T > 1 ? 's' : ''} pour redresser la barre.`);
      }
    } else if (raisons.length) {
      z.peril = { debut: T, fin: T + PERIL.tours, raisons };
      res.perils.push(nomZone(z));
      const suite = z.tutelleSaison ? 'sinon c’est la faillite (la tutelle a déjà servi cette saison)' : 'sinon ta zone passe sous tutelle';
      z.rapport.push(`Alerte : ta zone est en péril (${raisons.join(', ')}). Tu as ${PERIL.tours} tours pour redresser la barre, ${suite}.`);
      push(12, 'Zone en péril', `${nomZone(z)} au bord de la faillite`, `${raisons.join(', ')}. Les autres zones peuvent l’aider.`);
    }
  }

  // Conseil : annoncé pour le dimanche.
  if (nextWeekday === 0 && !state.conseil) {
    const rng = makeRng(`${state.seed}:s${state.season}:t${T}:conseil`);
    state.conseil = { id: `c${state.season}-${T + 1}`, tour: T + 1, motions: motionsDuConseil(state, T, rng) };
    push(3, 'Conseil de police', 'Le Conseil de police se réunit demain', 'Les chefs de zone votent pendant le tour, résultats à 20:00.');
  }
  return res;
}

/** Dernière chance : la zone passe sous tutelle (une fois par saison). */
function mettreSousTutelle(z, push, T, raisons) {
  z.peril = null;
  z.tutelle = { debut: T + 1, fin: T + TUTELLE.tours, raisons };
  z.tutelleSaison = true;
  z.budget += TUTELLE.avance;
  (z._compta ||= []).push({ k: 'tutelle', l: 'Avance de trésorerie (tutelle)', v: TUTELLE.avance });
  z.moral = clamp(z.moral + TUTELLE.moral, 0, 100);
  z.rapport.push(`Tutelle : ta zone n’a pas pu se redresser à temps (${raisons.join(', ')}). Pendant ${TUTELLE.tours} tours, pas de manœuvre, de duel, d’enchère, d’heures sup, d’agents de réserve ni de grande décision (sauf recruter). Avance de ${TUTELLE.avance} k€ et +${TUTELLE.moral} de moral. Si la zone est encore en péril à la fin : faillite.`);
  push(14, 'Tutelle', `${nomZone(z)} placée sous tutelle`, `Dernière chance avant la faillite : ${TUTELLE.tours} tours pour se redresser, sous contrôle. Les autres zones peuvent l’aider.`);
}

function faillite(state, z, push, T, players) {
  const uid = z.uid;
  const g = GRADES.indexOf(gradeFor(z.ps));
  const ps = g > 0 ? GRADES[g - 1].ps : 0;
  const p = players[uid] || {};
  const nz = newZone({ uid, code: p.code || z.code, nom: p.nom || z.nom, couleur: z.couleur }, T + 1, {
    ps, badges: z.badges, titres: z.titres, arrivee: z.arrivee || 0,
  });
  // On garde la saison en cours pour le classement (3 tours comptés à 0) et les statistiques.
  nz.ipzSomme = z.ipzSomme; nz.toursJoues = z.toursJoues + 3; nz.ipzHist = z.ipzHist;
  nz.stats = { ...z.stats }; nz.enquete = z.enquete; nz.enquetePrecedente = z.enquetePrecedente;
  nz.faillites = (z.faillites || 0) + 1; nz.failliteSaison = true;
  nz.protegeJusqua = absT(state, T) + MAN.protectionTours;
  nz.motionSaison = z.motionSaison;
  nz.rapport = [`Faillite : ta zone est dissoute. Tu repars avec une nouvelle zone et les ressources de départ (${START.agents} agents, ${START.budget} k€).${g > 0 ? ` Rétrogradation : ${GRADES[g - 1].nom}.` : ''}`];
  state.zones[uid] = nz;
  state.toursSansFaillite = 0;
  state.fipas = (state.fipas || []).filter((f) => f.demandeur !== uid && f.partenaire !== uid);
  state.duels = (state.duels || []).filter((d) => d.a !== uid && d.b !== uid);
  push(20, 'Faillite', `${nomZone(z)} met la clé sous la porte`, 'Budget, infrastructures, équipement : tout est perdu. Le chef repart de zéro avec une nouvelle zone.');
}

/** Consignes de pilote automatique (grade Inspecteur principal et plus). */
export function appliquerConsignes(z, base, consignes, state) {
  if (!consignes || GRADES.indexOf(gradeFor(z.ps)) < 2) return base;
  const o = { ...base };
  if (consignes.alloc) o.alloc = { ...consignes.alloc };
  if (consignes.situation && z.pressions && z.pressions.length && o.alloc) {
    const cible = { nuit: 'intervention', weekend: 'intervention', plaintes: 'admin', deal: 'proximite', vitesse: 'roulage', parquet: 'recherche', bourgmestre: 'intervention' }[z.pressions[z.pressions.length - 1].id];
    const donneur = Object.keys(o.alloc).filter((s) => s !== cible).sort((a, b) => o.alloc[b] - o.alloc[a])[0];
    if (cible && donneur && o.alloc[donneur] >= 3) { o.alloc[donneur] -= 2; o.alloc[cible] = (o.alloc[cible] || 0) + 2; }
  }
  if (consignes.temoin && state.enquete) o.demarches = ['temoin'];
  if (consignes.prime && z.moral < 45 && z.budget > 15) o.depenses = { prime: true };
  return o;
}
