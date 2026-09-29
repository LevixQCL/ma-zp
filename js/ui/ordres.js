// Écran des ordres du tour.
import { S, esc, icon, fmt1, tabbar, myZone, zoneName } from './common.js';
import { SERVICES, SERVICE_LABELS, RYTHMES, INFRAS, COUTS, DEFAULT_ALLOC, DEPENSES } from '../engine/constants.js';
import { agentsFipaCeSoir } from './fipa.js';
import { demandeRenfortHtml } from './renfort.js';
import { chefDe, maCandidature, candidaturesRecues, placesRestantes, statutLabel } from './affaires.js';
import { forceEngagement, agentsDisponibles, blessesActifs, enFormation, capacite, coutDecision, decisionImpossible, effetsOperation, operationActive, NIVEAUX_OPERATION, coutDepenses } from '../engine/zone.js';

function enqueteDraft() {
  const o = S.savedOrders || {};
  return {
    demarches: o.demarches || [], accusation: o.accusation ?? null, traque: o.traque || null, partages: o.partages || [],
    fipa: o.fipa || null, fipaReponse: o.fipaReponse || null, fipaChoix: o.fipaChoix || null,
    manoeuvre: o.manoeuvre || null, renfort: o.renfort || null, aide: o.aide || null, duel: o.duel || null, duelReponse: o.duelReponse || null, votes: o.votes || {}, motionChef: o.motionChef || null,
  };
}

export function initDraft() {
  const z = myZone();
  const st = S.state;
  const dispo = agentsDisponibles(z, st.turn);
  const base = S.savedOrders || (z.dernierOrdre ? { alloc: z.dernierOrdre.alloc, rythme: z.dernierOrdre.rythme } : { alloc: DEFAULT_ALLOC, rythme: 'normal' });
  const d = JSON.parse(JSON.stringify({ alloc: { ...DEFAULT_ALLOC, ...(base.alloc || {}) }, rythme: base.rythme || 'normal', decision: base.decision || null, engagements: base.engagements || {}, evenement: base.evenement || 0, operation: base.operation || 'complet', depenses: (S.savedOrders && S.savedOrders.depenses) || { reserve: 0, reserveService: 'intervention' }, ...enqueteDraft() }));
  // On ne garde que les engagements sur des affaires encore ouvertes.
  const ids = new Set(st.affaires.map((a) => a.id));
  for (const k of Object.keys(d.engagements)) if (!ids.has(k)) delete d.engagements[k];
  // Ajuste la répartition si des agents manquent (blessés, formation…).
  let total = SERVICES.reduce((s, k) => s + d.alloc[k], 0) + engages(d);
  let i = 0;
  while (total > dispo && i < 200) { const k = SERVICES[i % SERVICES.length]; if (d.alloc[k] > 0) { d.alloc[k]--; total--; } i++; }
  S.draft = d;
}

function engages(d) {
  return Object.values(d.engagements).reduce((s, e) => s + (e.agents || 0), 0) + (d.evenement || 0) + (d.renfort && S.state.zones[d.renfort.cible] && operationActive(S.state.zones[d.renfort.cible], S.state.turn) ? d.renfort.agents || 0 : 0);
}

export function estimations() {
  const z = myZone(), st = S.state, d = S.draft;
  const opts = { rythme: d.rythme, turn: st.turn };
  const opx = effetsOperation(z, d.alloc, d.operation, st.turn);
  const eff = opx.eff;
  const pr = {};
  for (const p of z.pressions || []) Object.assign(pr, p.effet);
  const dep = d.depenses || {};
  const cap = {};
  for (const s of SERVICES) cap[s] = capacite(z, s, eff[s] + (dep.reserve && dep.reserveService === s ? dep.reserve * 0.8 : 0), opts);
  const crim = Math.max(10, Math.min(95, z.criminalite + (pr.criminalite || 0) - (dep.prevention ? 6 : 0)));
  const attendus = Math.max(1, Math.round(1.5 + crim / 14) + (pr.incidents || 0));
  const couverts = Math.min(attendus, Math.floor(cap.intervention / 1.1));
  const pap = Math.round(couverts * 0.4 + 0.6 + 1.2 + (pr.paperasse || 0) - (dep.soustraitance ? 5 : 0) - cap.admin * 1.2);
  const amendes = cap.roulage * 0.7;
  const total = SERVICES.reduce((s, k) => s + eff[k], 0) || 1;
  const chasse = eff.roulage / total > 0.25 && !z.infra.anpr;
  const dispo = agentsDisponibles(z, st.turn);
  const reste = dispo - SERVICES.reduce((s, k) => s + d.alloc[k], 0) - engages(d);
  const coutDep = coutDepenses(dep);
  return { attendus, couverts, pap, amendes, chasse, dispo, reste, opx, coutDep };
}

function opCouvHtml(e) {
  const { op, pris, couverture } = e.opx;
  const f = NIVEAUX_OPERATION[S.draft.operation];
  const manques = Object.entries(op.besoins).map(([s, n]) => [s, Math.ceil(n * f) - (pris[s] || 0)]).filter(([, m]) => m > 0);
  const pct = Math.round(couverture * 100);
  const cls = couverture >= 0.9 ? 'ok' : couverture >= 0.5 ? 'warn' : 'bad';
  return `<span class="small ${cls}" style="font-weight:700">Dispositif couvert à ${pct} %</span>${manques.length ? `<span class="tiny muted">Il manque : ${manques.map(([s, m]) => `${m} en ${SERVICE_LABELS[s]}`).join(', ')}. Augmente ces services dans l\u2019affectation.</span>` : ''}`;
}

function statusHtml(e) {
  if (e.reste === 0) return `<span class="small ok" style="font-weight:600">${e.dispo} agents affectés</span>`;
  if (e.reste > 0) return `<span class="small warn" style="font-weight:600">${e.reste} agent${e.reste > 1 ? 's' : ''} sans affectation</span>`;
  return `<span class="small bad" style="font-weight:600">${-e.reste} agent${e.reste < -1 ? 's' : ''} de trop</span>`;
}

/** Mise à jour sans redessiner l'écran (pendant qu'on glisse un curseur). */
export function updateOrdresLive() {
  const e = estimations();
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  for (const s of SERVICES) set(`val-${s}`, `${S.draft.alloc[s]}${e.opx.pris[s] ? ` <span class="tiny warn">dont ${e.opx.pris[s]} sur l\u2019opération</span>` : ''}`);
  if (e.opx.op) set('op-couv', opCouvHtml(e));
  set('alloc-status', statusHtml(e));
  set('est-inc', `${e.couverts} sur ${e.attendus}`);
  set('est-pap', e.pap <= 0 ? `−${-e.pap} dossiers` : `+${e.pap} dossiers`);
  set('est-am', `+${fmt1(e.amendes)} k€`);
  const ch = document.getElementById('est-chasse'); if (ch) ch.hidden = !e.chasse;
  const btn = document.getElementById('btn-valider'); if (btn) btn.disabled = e.reste < 0;
  const dirty = document.getElementById('dirty'); if (dirty) dirty.hidden = !S.ordersDirty;
}

function decisionLabel(z, d) {
  if (!d) return 'Aucune';
  if (d.type === 'recruter') return `Recruter ${d.n} agent${d.n > 1 ? 's' : ''}`;
  if (d.type === 'former') return `Former : ${SERVICE_LABELS[d.service]} niveau ${z.niveaux[d.service]} → ${z.niveaux[d.service] + 1}`;
  if (d.type === 'equiper') return d.cible === 'vehicule' ? 'Acheter un véhicule' : `Équiper : ${SERVICE_LABELS[d.cible]} niveau ${z.equip[d.cible]} → ${z.equip[d.cible] + 1}`;
  if (d.type === 'construire') return `Construire : ${INFRAS[d.infra].nom}`;
  return '';
}

function decisionOptions(z, T) {
  const opts = [];
  for (const n of [1, 2, 3]) opts.push({ d: { type: 'recruter', n }, sub: `${COUTS.recrue * n} k€ · arrivée dans 3 tours` });
  for (const s of SERVICES) opts.push({ d: { type: 'former', service: s }, sub: `${COUTS.formation} k€ · 2 agents absents 2 tours` });
  opts.push({ d: { type: 'equiper', cible: 'vehicule' }, sub: `${COUTS.vehicule} k€ · ${z.vehicules} véhicules actuellement` });
  for (const s of SERVICES) opts.push({ d: { type: 'equiper', cible: s }, sub: `${COUTS.equipementBase * z.equip[s]} k€` });
  for (const [id, inf] of Object.entries(INFRAS)) if (!z.infra[id]) opts.push({ d: { type: 'construire', infra: id }, sub: `${inf.cout} k€ · ${inf.effet}` });
  return opts.map((o) => ({ ...o, refus: decisionImpossible(z, o.d, T) }));
}

/** Aide courte de chaque service, avec la situation actuelle de la zone. */
function aide(s, z) {
  const f = (v) => fmt1(v);
  switch (s) {
    case 'intervention': return `Traite les incidents du jour (environ 1 agent par incident, ${Math.max(1, Math.round(1.5 + z.criminalite / 14))} attendus). Incident traité : +0,5 de satisfaction ; raté : −1,8. Au-delà de 2,5 agents par véhicule, les agents en trop comptent pour moitié.`;
    case 'proximite': return `Prévention : fait baisser la criminalité (actuellement ${Math.round(z.criminalite)}). Environ 4 agents la stabilisent. Au-dessus de 55, la criminalité coûte de la satisfaction chaque jour et augmente les incidents. Effet lent, visible sur plusieurs jours.`;
    case 'recherche': return `Fait avancer tes dossiers locaux (${z.dossiers.length} en cours). Dossier élucidé : des points et +2 de satisfaction. Un dossier de plus de 6 tours coûte de la satisfaction chaque jour.`;
    case 'roulage': return `Rapporte environ 0,7 k€ par agent et par jour. Au-delà de 25 % de tes effectifs : « chasse aux PV », −2 de satisfaction par jour.`;
    case 'admin': return `Traite la paperasse (environ 1 dossier par agent ; ${f(z.paperasse)} en attente). Au-delà de 14 : −2 de moral par jour. Au-delà de 20 : Inspection générale, 5 k€ d’amende.`;
    default: return '';
  }
}

function prisesHtml() {
  const d = S.draft, l = [];
  if (d.traque && d.traque.agents) l.push(`${d.traque.agents} agent${d.traque.agents > 1 ? 's' : ''} d’Intervention partent en traque`);
  if ((d.demarches || []).includes('temoin')) l.push('2 agents de Recherche passent la journée sur une audition');
  const f = agentsFipaCeSoir();
  if (f) l.push(`${f} agents partent en FIPA (pris d’abord en Proximité)`);
  return l.length ? `<p class="small warn" style="margin:0">Enquête et FIPA : ${l.join(' ; ')}. Ils quittent leur service pour la journée.</p>` : '';
}

export function situationHtml(z) {
  if (!z.pressions || !z.pressions.length) return '';
  return `<section class="card amber" aria-label="Situation du jour" style="gap:6px"><span class="kicker">Situation du jour</span>
    ${z.pressions.map((p) => `<div class="col" style="gap:1px"><span style="font-weight:600;font-size:14px">${esc(p.titre)}</span><span class="small" style="color:var(--amber-soft)">${esc(p.texte)}</span></div>`).join('')}
  </section>`;
}

/** Une section repliable : une ligne résumé, ouverte à la demande. */
function pli(key, titre, resume, contenu, alerte = false) {
  const ouvert = !!(S.ordOpen && S.ordOpen[key]);
  return `<section class="card ${alerte ? 'amber' : ''}" aria-label="${esc(titre)}" style="gap:8px">
    <button type="button" class="pli" data-action="ord-open" data-k="${key}" aria-expanded="${ouvert}">
      <span class="col" style="gap:1px;align-items:flex-start;text-align:left"><span class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.6px">${esc(titre)}</span>
      <span style="font-size:14px;font-weight:600">${resume}</span></span>${icon('chevron', 18, ouvert ? 'style="transform:rotate(90deg)"' : '')}</button>
    ${ouvert ? contenu : ''}
  </section>`;
}

export function renderOrdres() {
  const z = myZone(), st = S.state, d = S.draft, T = st.turn;
  const e = estimations();
  const bl = blessesActifs(z, T), fo = enFormation(z, T);
  const others = Object.values(st.zones).filter((x) => x.uid !== z.uid);
  const saved = !!S.savedOrders && !S.ordersDirty;
  const pap = (v) => (v < 0 ? `−${-v}` : v > 0 ? `+${v}` : '±0');
  const nbEng = Object.values(d.engagements).filter((x) => x.agents > 0).length;
  const dep = d.depenses || {};
  const nbDep = (dep.reserve ? 1 : 0) + ['prime', 'prevention', 'soustraitance'].filter((k) => dep[k]).length;

  const affairesHtml = st.affaires.map((a) => {
    const eg = d.engagements[a.id] || { agents: 0, acceptes: [] };
    const force = eg.agents ? Math.round(forceEngagement(z, eg.agents) * 10) / 10 : 0;
    const chef = chefDe(a);
    const moiChef = a.zone === z.uid;
    const cand = !moiChef && maCandidature(a);
    const stepper = `<div class="between"><span class="small">${moiChef ? 'Tes agents' : 'Agents proposés'}</span>
        <span class="stepper"><button type="button" data-action="eng" data-id="${a.id}" data-d="-1" aria-label="Retirer un agent">−</button><span class="n">${eg.agents}</span><button type="button" data-action="eng" data-id="${a.id}" data-d="1" aria-label="Ajouter un agent">+</button></span></div>`;
    let corps;
    if (moiChef) {
      const recues = candidaturesRecues().filter((c) => c.aid === a.id);
      const acc = recues.filter((c) => c.statut === 'acceptee');
      const att = recues.filter((c) => c.statut === 'attente').length;
      corps = `${stepper}
        ${eg.agents ? '' : '<p class="tiny warn" style="margin:0">Sans agents de ta part, l’affaire n’est pas lancée ce soir.</p>'}
        <p class="tiny muted" style="margin:0">Équipe : ${acc.length ? acc.map((c) => `${esc(S.state.zones[c.uid] ? S.state.zones[c.uid].nom : '?')} (${c.agents})`).join(', ') : 'toi seul pour l’instant'} · places restantes : ${placesRestantes(a)} sur ${a.agentsMax}${att ? ` · <a href="#prive">${att} candidature${att > 1 ? 's' : ''} à traiter</a>` : ''}</p>`;
    } else if (cand) {
      corps = `<p class="tiny" style="margin:0">Ta candidature auprès de ${esc(chef ? chef.nom : '?')} : ${statutLabel(cand.statut)}</p>${cand.statut !== 'refusee' ? stepper : ''}`;
    } else {
      corps = `<p class="tiny muted" style="margin:0">Dirigée par ${chef ? zoneName(chef) : '?'}. <a href="#carte">Postuler depuis la Carte</a></p>`;
    }
    return `<div class="card tight">
      <div class="between"><span style="font-weight:600;font-size:14px">${esc(a.titre)}</span><span class="pill amber">${a.recompense} pts</span></div>
      <p class="tiny muted" style="margin:0">${moiChef ? '<strong style="color:var(--amber)">Chez toi · tu diriges</strong> · ' : ''}Force minimale ${a.forceMin}, conseillée ${a.forceConseillee}${eg.agents ? ` · ta force : <strong style="color:${force >= a.forceConseillee ? 'var(--green-soft)' : 'var(--text)'}">${fmt1(force)}</strong>` : ''} · ${a.tours > 1 ? 'nouvelle affaire' : 'dernier tour'}</p>
      ${corps}
    </div>`;
  }).join('');

  const decisionHtml = `<div class="col" style="gap:6px">
    <button type="button" class="choice" data-action="decision" data-json="null" aria-pressed="${!d.decision}" style="align-items:flex-start;text-align:left">Aucune décision</button>
    ${decisionOptions(z, T).map((o) => `<button type="button" class="choice" data-action="decision" data-json='${esc(JSON.stringify(o.d))}' aria-pressed="${JSON.stringify(d.decision) === JSON.stringify(o.d)}" ${o.refus ? 'disabled' : ''} style="align-items:flex-start;text-align:left">
      <span style="font-size:14px">${esc(decisionLabel(z, o.d))}</span><span class="s">${esc(o.refus || o.sub)}</span></button>`).join('')}
  </div>`;

  const depensesHtml = `<div class="col" style="gap:6px">
      <div class="between"><span class="col" style="gap:1px"><span style="font-weight:600;font-size:14px">Agents de réserve</span><span class="tiny muted">${esc(DEPENSES.reserve.texte)}</span></span>
        <span class="stepper"><button type="button" data-action="dep-reserve" data-d="-1" aria-label="Un agent de réserve en moins">−</button><span class="n">${dep.reserve || 0}</span><button type="button" data-action="dep-reserve" data-d="1" aria-label="Un agent de réserve en plus">+</button></span></div>
      ${dep.reserve ? `<label class="field" style="font-weight:500">Service renforcé
        <select class="text" data-change="dep-service" style="min-height:44px;font-size:14px">${SERVICES.map((s2) => `<option value="${s2}" ${dep.reserveService === s2 ? 'selected' : ''}>${SERVICE_LABELS[s2]}</option>`).join('')}</select></label>` : ''}
    </div>
    <div class="col" style="gap:6px">${['prime', 'prevention', 'soustraitance'].map((k) => `
      <button type="button" class="choice" data-action="dep-toggle" data-k="${k}" aria-pressed="${!!dep[k]}" style="flex-direction:row;justify-content:space-between;text-align:left">
        <span class="col" style="gap:1px;align-items:flex-start"><span style="font-size:14px">${esc(DEPENSES[k].nom)}</span><span class="s">${esc(DEPENSES[k].texte)}</span></span><span class="mono small">${fmt1(DEPENSES[k].cout)} k€</span></button>`).join('')}
    </div>
    <p class="tiny muted" style="margin:0">Payées à 20:00 si le budget le permet (${fmt1(z.budget)} k€). Elles ne sont pas reconduites le lendemain.</p>`;

  return `<main class="screen">
    <header class="col" style="gap:3px"><h1 class="big">Ordres du tour ${T}</h1>
      <p class="sub">${e.dispo} agents disponibles${bl || fo || z.absents ? ` (${[bl ? `${bl} absent${bl > 1 ? 's' : ''}` : '', fo ? `${fo} en formation` : '', z.absents ? `${z.absents} en congé maladie, moral bas` : ''].filter(Boolean).join(', ')})` : ''} · secrets jusqu’à 20:00</p></header>

    ${saved ? `<div class="card green" style="flex-direction:row;align-items:center;justify-content:space-between;padding:10px 10px 10px 14px">
        <span class="ok" style="font-weight:700">${icon('check', 16)} Ordres validés</span><span class="tiny muted">modifiables jusqu’à 20:00</span></div>`
      : !S.savedOrders && !S.ordersDirty && z.dernierOrdre ? `<button class="btn primary block" data-action="save-orders">Reprendre les ordres d’hier et valider</button>
        <p class="tiny muted" style="margin:-4px 0 0;text-align:center">Ou ajuste ci-dessous, puis valide.</p>` : ''}

    ${situationHtml(z)}
    ${e.opx.op ? (() => { const op = e.opx.op; const jour = T - op.tourDebut + 1; return `<section class="card red" aria-label="Opération d'envergure">
      <div class="between"><span class="kicker" style="color:var(--red-soft)">Opération d’envergure${op.duree > 1 ? ` · jour ${jour} sur ${op.duree}` : ''}</span><span class="pill amber">${op.recompense} pts</span></div>
      <h2 class="card-title">${esc(op.titre)}</h2>
      <p class="small" style="margin:0;color:var(--text2)">${esc(op.texte)} Les agents engagés quittent leur service pour la journée.</p>
      <p class="small" style="margin:0"><strong>Dispositif requis :</strong> ${Object.entries(op.besoins).map(([s2, n]) => `${n} en ${SERVICE_LABELS[s2]}`).join(' · ')}</p>
      <div class="seg" role="group" aria-label="Niveau du dispositif">${[['complet', 'Complet', 'réussite : +pts, +6 satisf.'], ['reduit', 'Réduit', 'moitié des agents'], ['aucun', 'Aucun', 'échec : −10 satisf.']].map(([k, t, dsc]) => `
        <button type="button" data-action="op-niveau" data-v="${k}" aria-pressed="${d.operation === k}"><span class="t">${t}</span><span class="d">${dsc}</span></button>`).join('')}</div>
      <div class="col" id="op-couv" style="gap:2px">${opCouvHtml(e)}</div>
      ${demandeRenfortHtml()}
    </section>`; })() : ''}

    <section class="card" aria-label="Affectation des agents" style="gap:6px">
      <div class="between"><h2 class="card-title">Affectation</h2><span id="alloc-status">${statusHtml(e)}</span></div>
      ${SERVICES.map((s2) => `<div class="col" style="gap:0">
        <div class="between" style="min-height:48px">
          <span class="row" style="gap:2px"><span style="font-weight:600;font-size:14px">${SERVICE_LABELS[s2]}</span>
            <button type="button" class="helpbtn" data-action="help" data-s="${s2}" aria-expanded="${!!(S.help && S.help[s2])}" aria-label="À quoi sert ${SERVICE_LABELS[s2]} ?">?</button>
            <span class="tiny muted" style="margin-left:4px">niv. ${z.niveaux[s2]}</span></span>
          <span class="stepper"><button type="button" data-action="alloc" data-s="${s2}" data-d="-1" aria-label="Un agent de moins en ${SERVICE_LABELS[s2]}" ${d.alloc[s2] <= 0 ? 'disabled' : ''}>−</button>
            <span class="n" style="min-width:34px">${d.alloc[s2]}</span>
            <button type="button" data-action="alloc" data-s="${s2}" data-d="1" aria-label="Un agent de plus en ${SERVICE_LABELS[s2]}">+</button></span></div>
        ${e.opx.pris[s2] ? `<span class="tiny warn">dont ${e.opx.pris[s2]} sur l’opération</span>` : ''}
        ${S.help && S.help[s2] ? `<p class="tiny" style="margin:2px 0 6px;color:var(--text2);line-height:1.45">${esc(aide(s2, z))}</p>` : ''}
      </div>`).join('')}
      <p class="tiny muted" style="margin:0">Touche + : si aucun agent n’est libre, il est pris dans ton service le plus fourni.</p>
      <div class="tiles" style="margin-top:2px">
        <div class="tile" style="padding:8px"><span class="l">Incidents couverts</span><span class="mono" style="font-size:14px">${e.couverts} sur ${e.attendus}</span></div>
        <div class="tile" style="padding:8px"><span class="l">Paperasse ce soir</span><span class="mono" style="font-size:14px">${pap(e.pap)} dossiers</span></div>
        <div class="tile" style="padding:8px"><span class="l">Amendes</span><span class="mono" style="font-size:14px">+${fmt1(e.amendes)} k€</span></div>
      </div>
      ${e.chasse ? '<p class="small bad" style="margin:0">Plus de 25 % en Roulage : effet « chasse aux PV », la satisfaction baisse.</p>' : ''}
      <p class="tiny muted" style="margin:0">Estimations indicatives : le hasard du tour peut les faire varier.</p>
    </section>

    <section class="col" aria-label="Rythme"><h2 class="section">Rythme de travail</h2>
      <div class="seg" role="group" aria-label="Rythme de travail">${Object.entries(RYTHMES).map(([k, r]) => `
        <button type="button" data-action="rythme" data-v="${k}" aria-pressed="${d.rythme === k}"><span class="t">${r.label}</span><span class="d">${r.sub}</span></button>`).join('')}</div>
      ${z.renforceSuite >= 2 && d.rythme === 'renforce' ? '<p class="small bad" style="margin:0">Attention : plus de 3 tours renforcés d’affilée exposent à l’épuisement.</p>' : ''}
    </section>

    ${prisesHtml()}
    ${pli('affaires', 'Affaires disputées', st.affaires.length ? (nbEng ? `${nbEng} affaire${nbEng > 1 ? 's' : ''} engagée${nbEng > 1 ? 's' : ''} sur ${st.affaires.length}` : `${st.affaires.length} affaire${st.affaires.length > 1 ? 's' : ''} ouverte${st.affaires.length > 1 ? 's' : ''} · aucun agent engagé`) : 'Aucune ce tour', st.affaires.length ? `<div class="col" style="gap:8px">${affairesHtml}</div>` : '<p class="small muted" style="margin:0">Aucune affaire disputée ce tour.</p>')}
    ${pli('decision', 'Grande décision', `${esc(decisionLabel(z, d.decision))}${d.decision ? ` · ${coutDecision(z, d.decision)} k€` : ''}`, decisionHtml)}
    ${pli('depenses', 'Dépenses du jour', nbDep ? `${nbDep} dépense${nbDep > 1 ? 's' : ''} · ${fmt1(e.coutDep)} k€` : 'Aucune', depensesHtml)}

    <a class="small" href="#guide-ordres" style="text-align:center;padding:10px">Comment fonctionnent les ordres ?</a>
  </main>${tabbar('ordres')}`;
}
