// Ce que la journée engage à 20:00 : dépenses, démarches d'enquête déjà lancées, grande décision (payée en dernier).
import { S } from './common.js';
import { coutDepenses, coutDecision, decisionImpossible } from '../engine/zone.js';
import { coutBilan } from '../engine/bilan.js';
import { journeeLive } from './enquete-direct.js';

/** Démarches d'enquête lancées aujourd'hui (enquête en direct) : payées à 20:00. */
export const coutEnquete = () => { const r = journeeLive(); return r ? r.depense : 0; };

export function engagementsDuJour(d, z) {
  const depenses = coutDepenses(d.depenses, z), enquete = coutEnquete();
  const decision = d.decision && !decisionImpossible(z, d.decision, S.state.turn) ? coutDecision(z, d.decision) : 0;
  const bilan = coutBilan(z, d.bilan);
  return { depenses, enquete, decision, bilan, total: depenses + enquete + decision + bilan };
}
