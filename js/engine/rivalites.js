// Relations entre zones : coup de main aux zones en difficulté, Conseil de police, péril et faillite.
// Les pactes et les défis amicaux sont dans pactes.js (ils remplacent les duels et les manœuvres).
import { makeRng } from './rng.js';
import { GRADES, gradeFor, START, TUTELLE } from './constants.js';
import { agentsDisponibles, clamp, round1, newZone, enDifficulte } from './zone.js';
import { oublierZone, absT } from './pactes.js';

export { absT };

const nomZone = (z) => `ZP ${z.code} ${z.nom}`;

// ───── Coup de main (entraide) : seulement vers une zone en péril ou sous tutelle ─────
export const AIDE = { budgetMax: 10, agentsMax: 3, dureePret: 3, kParAgent: 2.5, effortPlein: 3, bonusMax: 1.4 };
/**
 * Réputation gagnée par une entraide : la base dépend de la situation de la zone aidée (5 / 3 / 1),
 * pleine à partir de 3 « agents-équivalents » (1 agent = 2,5 k€), jusqu'à +40 % pour une aide très généreuse.
 */
export function gainEntraide(base, budget, agents) {
  const effort = (agents || 0) + (budget || 0) / AIDE.kParAgent;
  if (effort <= 0) return 0;
  return Math.max(1, Math.round(base * Math.min(AIDE.bonusMax, effort / AIDE.effortPlein)));
}

// ───── Conseil de police ─────
export const SOLIDARITE = { parZone: 2 };
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
  motions.push({ id: 'dotation', titre: 'Répartition d’une dotation fédérale de 20 k€', options: ['Parts égales entre les zones actives', 'Prime aux zones les plus coopératives (pactes tenus, FIPA honorées, pièces partagées)'] });
  // Le thème de la semaine est remplacé par les crises du district (crise.js), votées tous les 5 jours environ.
  // Blâme : les zones les moins coopératives de la semaine.
  const score = (z) => (z.stats.fipaFaites - z.stats.fipaHonorees) * 2 + (z.ruptures || []).filter((t) => absT(state, T) - t < 7).length * 2 + (z.stats.refusFipa || 0);
  const candidats = actives.filter((z) => score(z) > 0).sort((a, b) => score(b) - score(a)).slice(0, 3);
  if (candidats.length) motions.push({ id: 'blame', titre: 'Blâme : −10 de réputation et −30 PS', options: ['Personne', ...candidats.map((z) => nomZone(z))], cibles: [null, ...candidats.map((z) => z.uid)] });
  // Fonds de solidarité : une zone en péril ou sous tutelle, chaque zone active verse un peu.
  const aider = Object.values(state.zones).filter((z) => enDifficulte(z)).sort((a, b) => a.budget - b.budget)[0];
  if (aider && actives.length >= 3) motions.push({ id: 'solidarite', titre: `Fonds de solidarité pour ${nomZone(aider)}`, texte: `Chaque autre zone active verse ${SOLIDARITE.parZone} k€ à cette zone en difficulté.`, options: ['Non', 'Oui'], cible: aider.uid });
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

/** Avant la simulation des zones : coup de main aux zones en difficulté, votes du Conseil. */
export function rivalitesPre(state, uids, ord, push, T) {
  // Annonces d'avant la refonte (manœuvres) encore en attente : publiées une dernière fois.
  for (const r of state.aReveler || []) push(5, 'Révélation', r.titre, r.texte);
  state.aReveler = [];

  // 1. Coup de main : budget immédiat, agents prêtés à partir du tour suivant, seulement vers une zone en difficulté.
  for (const u of uids) {
    const a = ord[u].aide;
    if (!a || !a.cible || a.cible === u || !Object.hasOwn(state.zones, a.cible)) continue;
    const z = state.zones[u], c = state.zones[a.cible];
    if (!enDifficulte(c)) { z.rapport.push(`Coup de main annulé : ${nomZone(c)} n’est plus en difficulté.`); continue; }
    const budget = clamp(a.budget || 0, 0, Math.min(AIDE.budgetMax, Math.max(0, z.budget)));
    const agents = clamp(a.agents || 0, 0, Math.min(AIDE.agentsMax, Math.max(0, agentsDisponibles(z, T) - 8)));
    if (!budget && !agents) continue;
    if (budget) { z.budget -= budget; c.budget += budget; (z._compta ||= []).push({ k: 'entraide', l: 'Coup de main envoyé', v: -budget }); (c._compta ||= []).push({ k: 'entraide', l: 'Coup de main reçu', v: budget }); }
    if (agents) {
      z.blesses.push({ n: agents, retour: T + 1 + AIDE.dureePret, motif: 'prêté' });
      c.renforts = [...(c.renforts || []), { n: agents, debut: T + 1, retour: T + 1 + AIDE.dureePret, de: u }];
    }
    const bonus = gainEntraide(5, budget, agents);
    z.reputation += bonus; z.stats.aides = (z.stats.aides || 0) + 1;
    z.stats.sauvetages = (z.stats.sauvetages || 0) + 1;
    const quoi = [budget ? `${String(budget).replace('.', ',')} k€` : '', agents ? `${agents} agent${agents > 1 ? 's' : ''} pour ${AIDE.dureePret} tours` : ''].filter(Boolean).join(' et ');
    z.rapport.push(`Coup de main : tu envoies ${quoi} à ${nomZone(c)} (+${bonus} de réputation).`);
    c.rapport.push(`Coup de main : ${nomZone(z)} t’envoie ${quoi}.`);
    push(6, 'Solidarité', `${nomZone(z)} vient en aide à ${nomZone(c)}`, `${quoi.charAt(0).toUpperCase()}${quoi.slice(1)}.`);
  }

  // 2. Conseil de police : dépouillement.
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
      const poids = zs.map((z) => 1 + z.stats.fipaHonorees * 2 + z.stats.indicesPartages + (z.stats.pactesTenus || 0) * 2);
      const tot = poids.reduce((s, p) => s + p, 0);
      zs.forEach((z, i) => { const g = round1(20 * poids[i] / tot); z.budget += g; (z._compta ||= []).push({ k: 'conseil', l: 'Conseil : prime à la coopération', v: g }); z.rapport.push(`Conseil : prime à la coopération, +${String(g).replace('.', ',')} k€.`); });
    }
  } else if (m.id === 'theme') {
    state.theme = choix === 1 ? { id: 'routiere', jusqua: absT(state, T) + 7 } : choix === 2 ? { id: 'proximite', jusqua: absT(state, T) + 7 } : null;
  } else if (m.id === 'blame' && choix > 0) {
    const z = state.zones[m.cibles[choix]];
    if (z) { z.reputation = clamp(z.reputation - 10, 0, 100); z.ps = Math.max(0, z.ps - 30); z.rapport.push('Conseil : blâme voté contre ta zone (−10 de réputation, −30 PS).'); }
  } else if (m.id === 'solidarite' && choix === 1) {
    const c = state.zones[m.cible];
    if (c) {
      const donneurs = zs.filter((z) => z.uid !== c.uid);
      for (const z of donneurs) { z.budget -= SOLIDARITE.parZone; (z._compta ||= []).push({ k: 'conseil', l: 'Conseil : fonds de solidarité', v: -SOLIDARITE.parZone }); z.rapport.push(`Conseil : fonds de solidarité pour ${nomZone(c)} voté, tu verses ${SOLIDARITE.parZone} k€.`); }
      const tot = donneurs.length * SOLIDARITE.parZone;
      c.budget += tot; (c._compta ||= []).push({ k: 'conseil', l: 'Conseil : fonds de solidarité', v: tot });
      c.rapport.push(`Conseil : le district vote un fonds de solidarité pour ta zone, +${tot} k€.`);
    }
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
 * Après la simulation : péril et faillite, compteur du district,
 * annonce du Conseil (la veille du dimanche).
 */
export function rivalitesPost(state, uids, push, T, nextWeekday, players = {}) {
  const res = { faillites: [], perils: [] };
  state.duels = []; // duels d'avant la refonte : arrêtés

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
  z.rapport.push(`Tutelle : ta zone n’a pas pu se redresser à temps (${raisons.join(', ')}). Pendant ${TUTELLE.tours} tours, pas de défi, d’enchère, d’heures sup, d’agents de réserve ni de grande décision (sauf recruter). Avance de ${TUTELLE.avance} k€ et +${TUTELLE.moral} de moral. Si la zone est encore en péril à la fin : faillite.`);
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
  nz.ipzSomme = z.ipzSomme; nz.toursJoues = z.toursJoues + 3; nz.ipzHist = z.ipzHist; if (z.compSomme) { nz.compSomme = z.compSomme; nz.compTours = (z.compTours || 0) + 3; }
  nz.stats = { ...z.stats }; nz.enquete = z.enquete; nz.enquetePrecedente = z.enquetePrecedente;
  nz.faillites = (z.faillites || 0) + 1; nz.failliteSaison = true;
  nz.motionSaison = z.motionSaison;
  // Ce qui survit aussi à une fin de saison : décor, skins, trophées, plaques, équipe, jauge des incidents.
  for (const k of ['equipe', 'trophees', 'plaques', 'decor', 'skins', 'skinsChoix', 'jaugeIncidents']) if (z[k] !== undefined) nz[k] = z[k];
  nz.rapport = [`Faillite : ta zone est dissoute. Tu repars avec une nouvelle zone et les ressources de départ (${START.agents} agents, ${START.budget} k€).${g > 0 ? ` Rétrogradation : ${GRADES[g - 1].nom}.` : ''}`];
  state.zones[uid] = nz;
  state.toursSansFaillite = 0;
  state.fipas = (state.fipas || []).filter((f) => f.demandeur !== uid && f.partenaire !== uid);
  oublierZone(state, uid);
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
