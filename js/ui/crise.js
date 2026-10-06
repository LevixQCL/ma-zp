// Crise du district (Conseil des chefs), côté joueur : vote secret, plan en vigueur, opération commune.
import { S, esc, myZone } from './common.js';
import { CRISE, CRISES, PLANS, criseCourante, planDuJour, agentsCommune, participeCommune } from '../engine/crise.js';

/** Ligne de la liste « avant ce soir ». */
export function criseTodo() {
  const st = S.state, z = myZone(), d = S.draft || {};
  const c = st && criseCourante(st);
  if (!c || !z) return null;
  if (c.vote === st.turn && !c.plan) return { ok: Number.isInteger(d.crise), href: '#hp-crise', t: 'Conseil des chefs : vote ce soir', s: Number.isInteger(d.crise) ? `plan ${PLANS[d.crise].k}, ${esc(PLANS[d.crise].nom.toLowerCase())}` : esc(CRISES[c.id].titre.toLowerCase()) };
  if (planDuJour(st) === 'C') { const p = participeCommune(st, z.uid, d); return { ok: true, href: '#hp-crise', t: p ? `Opération commune : ${agentsCommune(z, st.turn)} agents engagés ce soir` : 'Opération commune : tu n’y participes pas', s: p ? 'tu peux te retirer sur l’HP' : 'tu peux la rejoindre sur l’HP' }; }
  return null;
}

/** Carte de l'HP : annonce, vote, plan en vigueur. */
export function criseHtml() {
  const st = S.state, z = myZone(), d = S.draft;
  const c = st && criseCourante(st);
  if (!c || !z || !d) return '';
  const T = st.turn, cr = CRISES[c.id];
  if (c.vote === T && !c.plan) {
    const v = Number.isInteger(d.crise) ? d.crise : null;
    return `<section class="card crise" id="hp-crise" aria-label="Conseil des chefs">
      <span class="kicker">Conseil des chefs · vote secret jusqu’à 20:00</span>
      <p class="dil-q">${esc(cr.titre)}</p>
      <p class="small" style="margin:0;color:var(--text2)">${esc(cr.texte)}</p>
      <div class="crise-plans">${PLANS.map((p, i) => `<button type="button" class="dil-btn" data-action="crise-vote" data-i="${i}" aria-pressed="${v === i}">
        <span class="t"><span class="crise-k">${p.k}</span> ${esc(p.nom)}</span><span class="s" style="font-style:italic">${esc(cr.plans[i])}</span>
        <span class="s"><span class="ok">+</span> ${esc(p.plus)}</span><span class="s"><span class="bad">−</span> ${esc(p.moins)}${i === 2 ? ` (${agentsCommune(z, T + 1)} pour toi)` : ''}</span></button>`).join('')}</div>
      <p class="tiny muted" style="margin:0">Une voix par zone. Le plan gagnant s’applique à tout le district pendant ${CRISE.duree} jours, dès demain. Égalité ou aucune voix : travail discret. Voter C, c’est s’engager à participer (tu pourras te retirer).${v !== null ? (S.ordersDirty ? ' Valide tes ordres pour l’envoyer.' : ' Vote enregistré avec tes ordres.') : ''}</p>
      ${v !== null && S.ordersDirty ? '<button type="button" class="btn primary small" data-action="save-orders">Valider mes ordres</button>' : ''}
    </section>`;
  }
  const p = planDuJour(st, T);
  if (!p) return '';
  const i = 'ABC'.indexOf(p), jour = T - c.debut + 1;
  const votes = c.votes ? ` · votes ${c.votes.map((n, k) => `${'ABC'[k]} ${n}`).join(', ')}` : '';
  let corps = `<p class="small" style="margin:0"><span class="ok">+</span> ${esc(PLANS[i].plus)}<br><span class="bad">−</span> ${esc(PLANS[i].moins)}</p>`;
  if (p === 'C') {
    const part = participeCommune(st, z.uid, d);
    const ok = (c.nuits || []).filter((x) => x.ok).length;
    corps += `<p class="small" style="margin:0">Soirs réussis : <strong>${ok}</strong> sur ${(c.nuits || []).length} (il en faut ${CRISE.C.nuitsOk} sur 3, avec au moins la moitié des zones actives). ${part ? `Tu engages <strong>${agentsCommune(z, T)} agents</strong> ce soir : laisse-les sans affectation dans tes ordres, sinon ils partent d’abord de ta Proximité puis de ton Intervention.` : 'Tu n’y participes pas : ni coût ni récompense.'}</p>
      <button type="button" class="btn small ${part ? 'outline' : 'primary'}" data-action="crise-c" data-v="${part ? 'non' : 'oui'}">${part ? 'Me retirer ce soir' : `Rejoindre l’opération (${agentsCommune(z, T)} agents)`}</button>`;
  }
  return `<section class="card crise" id="hp-crise" aria-label="Plan du district">
    <span class="kicker">Plan du district · jour ${jour} sur ${CRISE.duree}${votes}</span>
    <p class="dil-q"><span class="crise-k">${p}</span> ${esc(PLANS[i].nom)} : ${esc(cr.plans[i].charAt(0).toLowerCase() + cr.plans[i].slice(1))}</p>
    ${corps}
  </section>`;
}

/** Actions des boutons (renvoie true si l'action est traitée). */
export function actionCrise(act, el) {
  const d = S.draft;
  if (!d) return false;
  if (act === 'crise-vote') { const i = Number(el.dataset.i); d.crise = d.crise === i ? null : i; }
  else if (act === 'crise-c') d.criseC = el.dataset.v;
  else return false;
  S.ordersDirty = true;
  return true;
}
