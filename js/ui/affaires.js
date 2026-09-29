// Affaires disputées : la zone où l'affaire éclate la dirige ; les autres postulent.
// Candidatures et réponses voyagent en messages privés (champ `candidature` / `reponse`).
import { S, esc, myZone, zoneName } from './common.js';

const duTour = (x) => x && x.season === S.state.season && x.turn === S.state.turn;

export function chefDe(a) { return a.zone && S.state.zones[a.zone] ? S.state.zones[a.zone] : null; }

/** Réponse reçue (ou envoyée) pour une candidature : true, false ou null. */
function reponse(aid, de, a) {
  const m = (S.prives || []).filter((x) => x.reponse && x.de === de && x.a === a && x.reponse.aid === aid && duTour(x.reponse)).slice(-1)[0];
  return m ? !!m.reponse.accepte : null;
}

/** Ma candidature du tour sur une affaire : { agents, statut: 'attente' | 'acceptee' | 'refusee' } ou null. */
export function maCandidature(a) {
  const me = myZone().uid;
  const m = (S.prives || []).filter((x) => x.candidature && x.de === me && x.candidature.aid === a.id && duTour(x.candidature)).slice(-1)[0];
  if (!m) return null;
  const r = reponse(a.id, a.zone, me);
  return { agents: m.candidature.agents, statut: r === null ? 'attente' : r ? 'acceptee' : 'refusee' };
}

/** Candidatures reçues ce tour sur mes affaires. */
export function candidaturesRecues() {
  const me = myZone().uid;
  const miennes = new Set(S.state.affaires.filter((a) => a.zone === me).map((a) => a.id));
  const par = {};
  for (const m of S.prives || []) {
    if (!m.candidature || m.a !== me || !miennes.has(m.candidature.aid) || !duTour(m.candidature)) continue;
    par[`${m.candidature.aid}|${m.de}`] = { aid: m.candidature.aid, uid: m.de, agents: m.candidature.agents, at: m.at };
  }
  return Object.values(par).map((c) => {
    const acc = ((S.draft && S.draft.engagements[c.aid] && S.draft.engagements[c.aid].acceptes) || []).includes(c.uid);
    const r = reponse(c.aid, me, c.uid);
    return { ...c, affaire: S.state.affaires.find((a) => a.id === c.aid), statut: acc || r === true ? 'acceptee' : r === false ? 'refusee' : 'attente' };
  });
}

/** Places restantes sur une de mes affaires (agents), selon mon brouillon et mes acceptations. */
export function placesRestantes(a) {
  const e = (S.draft && S.draft.engagements[a.id]) || { agents: 0, acceptes: [] };
  const recues = candidaturesRecues();
  const pris = (e.agents || 0) + (e.acceptes || []).reduce((s, u) => s + ((recues.find((c) => c.aid === a.id && c.uid === u) || {}).agents || 0), 0);
  return Math.max(0, (a.agentsMax || 0) - pris);
}

export function statutLabel(s) {
  return s === 'acceptee' ? '<span class="ok" style="font-weight:700">acceptée</span>' : s === 'refusee' ? '<span class="bad" style="font-weight:700">refusée</span>' : '<span class="warn" style="font-weight:700">en attente de réponse</span>';
}

/** Bloc « postuler » sous une affaire d'une autre zone (Carte). */
export function postulerCtrl(a) {
  const c = maCandidature(a);
  const chef = chefDe(a);
  if (!chef) return '';
  if (c) return `<div class="renfort-ctrl"><span class="small">Ta candidature (${c.agents} agent${c.agents > 1 ? 's' : ''}) : ${statutLabel(c.statut)}</span>
    <span class="tiny muted">${c.statut === 'refusee' ? 'Tes agents resteront en Intervention.' : `Tu peux ajuster tes agents dans tes ordres. ${c.statut === 'acceptee' ? 'Pense à valider tes ordres.' : `Si ${esc(chef.nom)} ne répond pas avant 20:00, tes agents restent chez toi.`}`}</span></div>`;
  const n = (S.postuler && S.postuler[a.id]) || Math.min(3, a.agentsMax || 3);
  return `<div class="renfort-ctrl">
    <div class="between"><span class="small" style="font-weight:600">Postuler auprès de ${esc(chef.nom)}</span>
      <span class="stepper"><button type="button" data-action="post-n" data-id="${a.id}" data-d="-1" aria-label="Un agent de moins" ${n <= 1 ? 'disabled' : ''}>−</button><span class="n">${n}</span><button type="button" data-action="post-n" data-id="${a.id}" data-d="1" aria-label="Un agent de plus" ${n >= (a.agentsMax || 10) ? 'disabled' : ''}>+</button></span></div>
    <button type="button" class="btn small block" data-action="postuler" data-id="${a.id}" data-n="${n}">Proposer ${n} agent${n > 1 ? 's' : ''}</button>
    <span class="tiny muted">${esc(chef.nom)} accepte ou refuse. Si ta candidature n’est pas retenue, tes agents restent chez toi.</span></div>`;
}

/** Ligne de candidature reçue, avec Accepter / Refuser (onglet Privé). */
export function candidatureCtrl(c) {
  const a = c.affaire;
  const reste = placesRestantes(a);
  const monEng = (S.draft && S.draft.engagements[a.id] && S.draft.engagements[a.id].agents) || 0;
  if (c.statut !== 'attente') return `<div class="renfort-ctrl"><span class="small">Candidature ${statutLabel(c.statut)}${c.statut === 'acceptee' ? ' · pense à valider tes ordres' : ''}</span></div>`;
  return `<div class="renfort-ctrl">
    <span class="tiny muted">Places restantes : ${reste} agent${reste > 1 ? 's' : ''} sur ${a.agentsMax}.${monEng ? '' : ' <strong class="warn">Tu n’as encore engagé aucun agent : sans toi, l’affaire n’est pas lancée.</strong>'}</span>
    <div class="row"><button type="button" class="btn small grow" data-action="cand-non" data-id="${a.id}" data-uid="${esc(c.uid)}">Refuser</button>
      <button type="button" class="btn small primary grow" data-action="cand-ok" data-id="${a.id}" data-uid="${esc(c.uid)}" ${reste <= 0 ? 'disabled' : ''}>Accepter</button></div></div>`;
}

export { zoneName };
