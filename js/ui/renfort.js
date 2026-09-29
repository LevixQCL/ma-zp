// Appel à renfort pour une opération d'envergure : une zone demande des agents sur la radio,
// les autres en prêtent quelques-uns pour la journée (inscrit dans leurs ordres), contre de la réputation.
import { S, esc, myZone } from './common.js';
import { operationActive } from '../engine/zone.js';
import { RENFORT } from '../engine/constants.js';

/** Appels à renfort lancés aujourd'hui par d'autres zones dont l'opération est en cours. */
export function appelsRenfort() {
  const st = S.state, z = myZone();
  if (!st || !z) return [];
  const par = {};
  for (const m of S.radio || []) {
    const r = m.renfort;
    if (!r || m.uid === z.uid || r.season !== st.season || r.turn !== st.turn) continue;
    const c = st.zones[m.uid];
    const op = c && operationActive(c, st.turn);
    if (op) par[m.uid] = { uid: m.uid, zone: c, op, agents: r.agents, at: m.at };
  }
  return Object.values(par);
}

/** Mon propre appel de ce tour, s'il existe. */
export function monAppel() {
  const st = S.state, z = myZone();
  return (S.radio || []).find((m) => m.renfort && m.uid === z.uid && m.renfort.season === st.season && m.renfort.turn === st.turn) || null;
}

/** Réponse déjà prévue dans mes ordres pour cette zone. */
export function renfortPrevu(uid) {
  const r = S.draft && S.draft.renfort;
  return r && r.cible === uid ? r.agents : 0;
}

/** Contrôle « prêter N agents » affiché sous un appel. */
export function renfortCtrl(a) {
  const n = renfortPrevu(a.uid);
  const autre = S.draft && S.draft.renfort && S.draft.renfort.cible !== a.uid && S.draft.renfort.agents > 0 ? S.state.zones[S.draft.renfort.cible] : null;
  const rep = Math.min(RENFORT.repMax, n * RENFORT.repParAgent);
  return `<div class="renfort-ctrl">
    <div class="between"><span class="small" style="font-weight:600">Prêter des agents ce soir</span>
      <span class="stepper"><button type="button" data-action="renfort-n" data-uid="${esc(a.uid)}" data-d="-1" aria-label="Un agent de moins" ${n <= 0 ? 'disabled' : ''}>−</button><span class="n">${n}</span><button type="button" data-action="renfort-n" data-uid="${esc(a.uid)}" data-d="1" aria-label="Un agent de plus" ${n >= RENFORT.maxParZone ? 'disabled' : ''}>+</button></span></div>
    <span class="tiny ${n ? '' : 'muted'}">${n ? `${n} agent${n > 1 ? 's' : ''} quitte${n > 1 ? 'nt' : ''} tes services pour la journée · +${rep} de réputation, +${RENFORT.ps} PS. Pense à valider tes ordres.` : `Jusqu’à ${RENFORT.maxParZone} agents, pour la journée seulement · +${RENFORT.repParAgent} de réputation par agent.`}${autre ? ` Remplace ton renfort prévu pour ${esc(autre.nom)}.` : ''}</span>
  </div>`;
}

/** Carte « appel à renfort » pour la zone qui mène l'opération (HP et Ordres). */
export function demandeRenfortHtml() {
  const st = S.state, z = myZone();
  const op = z && operationActive(z, st.turn);
  if (!op) return '';
  const deja = monAppel();
  if (deja) return `<div class="renfort-ctrl"><span class="small" style="font-weight:600">Appel à renfort lancé sur la radio : ${deja.renfort.agents} agent${deja.renfort.agents > 1 ? 's' : ''} demandé${deja.renfort.agents > 1 ? 's' : ''}.</span>
    <span class="tiny muted">Les zones qui répondent l’inscrivent dans leurs ordres : tu verras les renforts arriver dans le rapport de 20:00.</span></div>`;
  const n = S.renfortDemande || Math.min(RENFORT.maxDemande, Math.max(2, Math.ceil(Object.values(op.besoins).reduce((a, b) => a + b, 0) / 3)));
  return `<div class="renfort-ctrl">
    <div class="between"><span class="small" style="font-weight:600">Besoin de renfort ?</span>
      <span class="stepper"><button type="button" data-action="renfort-dem" data-d="-1" aria-label="Un agent de moins" ${n <= 1 ? 'disabled' : ''}>−</button><span class="n">${n}</span><button type="button" data-action="renfort-dem" data-d="1" aria-label="Un agent de plus" ${n >= RENFORT.maxDemande ? 'disabled' : ''}>+</button></span></div>
    <span class="tiny muted">Lance un appel sur la radio : les autres zones peuvent te prêter des agents pour la journée. Ils comptent dans la couverture de ton dispositif. Un appel par tour.</span>
    <button type="button" class="btn small block" data-action="renfort-appel" data-n="${n}">Appeler ${n} agent${n > 1 ? 's' : ''} en renfort</button>
  </div>`;
}

