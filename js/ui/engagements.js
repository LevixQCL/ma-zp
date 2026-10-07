// Ce que les ordres du jour engagent à 20:00 : dépenses, démarches d'enquête, grande décision (payée en dernier).
// Module feuille (moteur + état seulement) : importable depuis Ordres comme depuis l'Enquête sans import circulaire.
import { S } from './common.js';
import { coutDepenses, coutDecision, decisionImpossible } from '../engine/zone.js';
import { coutDemarche, REAUD, RECOUP } from '../engine/enquete.js';
import { coutBilan } from '../engine/bilan.js';

export const coutEnquete = (d) => (d.demarches || []).reduce((s, x) => s + coutDemarche(S.state, S.user.uid, x), 0) + (d.reaud ? REAUD.cout : 0) + (d.recoup ? RECOUP.cout : 0);

export function engagementsDuJour(d, z) {
  const depenses = coutDepenses(d.depenses, z), enquete = coutEnquete(d);
  const decision = d.decision && !decisionImpossible(z, d.decision, S.state.turn) ? coutDecision(z, d.decision) : 0;
  const bilan = coutBilan(z, d.bilan);
  return { depenses, enquete, decision, bilan, total: depenses + enquete + decision + bilan };
}
