// Péril, tutelle et faillite : une zone dans le rouge trop longtemps passe sous tutelle, puis fait faillite.
import { GRADES, gradeFor, START, TUTELLE } from './constants.js';
import { agentsDisponibles, clamp, newZone } from './zone.js';

// Zone retirée de la partie : jamais de plantage du tour pour un nom.
const nomZone = (z) => (z ? `ZP ${z.code} ${z.nom}` : "une zone qui a quitté la partie");

// ───── Péril et faillite ─────
export const PERIL = { budget: -15, agents: 8, moral: 10, tours: 3 };
export function enPeril(z, T) {
  const raisons = [];
  if (z.budget < PERIL.budget) raisons.push(`budget sous ${PERIL.budget} k€`);
  if (agentsDisponibles(z, T + 1) < PERIL.agents) raisons.push(`moins de ${PERIL.agents} agents disponibles`);
  if (z.moral < PERIL.moral) raisons.push(`moral sous ${PERIL.moral}`);
  return raisons;
}

/** Après la simulation : péril, tutelle et faillite, compteur du district. */
export function perilPost(state, uids, push, T, players = {}) {
  const res = { faillites: [], perils: [] };

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
        push(7, 'Redressement', `${nomZone(z)} sort de la zone rouge`, 'La barre est redressée à temps.');
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
      push(12, 'Zone en péril', `${nomZone(z)} au bord de la faillite`, `${raisons.join(', ')}. Il reste peu de temps.`);
    }
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
  z.rapport.push(`Tutelle : ta zone n’a pas pu se redresser à temps (${raisons.join(', ')}). Pendant ${TUTELLE.tours} tours, pas d’heures sup, d’agents de réserve ni de grande décision (sauf recruter). Avance de ${TUTELLE.avance} k€ et +${TUTELLE.moral} de moral. Si la zone est encore en péril à la fin : faillite.`);
  push(14, 'Tutelle', `${nomZone(z)} placée sous tutelle`, `Dernière chance avant la faillite : ${TUTELLE.tours} tours pour se redresser, sous contrôle. Il reste peu de temps.`);
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
  nz.ipzSomme = z.ipzSomme; nz.toursJoues = z.toursJoues + 3; nz.ipzHist = [...(z.ipzHist || []), ...[0, 1, 2].map(() => ({ t: T, v: 0, joue: true, faillite: true }))]; if (z.compSomme) { nz.compSomme = z.compSomme; nz.compTours = (z.compTours || 0) + 3; }
  nz.stats = { ...z.stats }; nz.enquete = z.enquete; nz.enquetePrecedente = z.enquetePrecedente;
  nz.faillites = (z.faillites || 0) + 1; nz.failliteSaison = true;
  nz.motionSaison = z.motionSaison;
  // Ce qui survit aussi à une fin de saison : décor, skins, trophées, plaques, équipe, jauge des incidents.
  for (const k of ['equipe', 'trophees', 'plaques', 'decor', 'skins', 'skinsChoix', 'jaugeIncidents', 'carriere', 'adjoint']) if (z[k] !== undefined) nz[k] = z[k];
  nz.rapport = [`Faillite : ta zone est dissoute. Tu repars avec une nouvelle zone et les ressources de départ (${START.agents} agents, ${START.budget} k€).${g > 0 ? ` Rétrogradation : ${GRADES[g - 1].nom}.` : ''}`];
  state.zones[uid] = nz;
  state.toursSansFaillite = 0;
  push(20, 'Faillite', `${nomZone(z)} met la clé sous la porte`, 'Budget, infrastructures, équipement : tout est perdu. Tout repart de zéro avec une nouvelle zone.');
}

