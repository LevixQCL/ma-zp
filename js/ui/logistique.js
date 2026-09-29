// Logistique (bâtiments de la zone) et détail du budget : ce qui coûte, ce qui rapporte.
import { S, esc, icon, fmt1, myZone } from './common.js';
import { BATIMENTS, BATIMENT_MAX, INFRAS, ENTRETIEN_ANNEXE, TRAVAUX_TOURS, PEREQUATION } from '../engine/constants.js';
import { fraisFixes, coutDepenses, coutDecision, decisionImpossible, capaciteAgents, capaciteVehicules, effectifPrevu, perequation } from '../engine/zone.js';
import { coutDemarche } from '../engine/enquete.js';
import { PERIL } from '../engine/rivalites.js';
import { estimations } from './ordres.js';

const k = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt1(Math.abs(v))} k€`;

/** Prévision de ce soir, à partir du brouillon d'ordres. */
export function previsionBudget() {
  const z = myZone(), st = S.state, d = S.draft || {};
  let amendes = 0;
  try { amendes = estimations().amendes; } catch (e) { /* écran sans brouillon */ }
  const ff = fraisFixes(z, st, { amendes, rythme: d.rythme || 'normal' });
  const choix = [];
  const dep = coutDepenses(d.depenses || {});
  if (dep) choix.push({ l: 'Dépenses du jour', v: -dep });
  if (d.decision && !decisionImpossible(z, d.decision, st.turn)) choix.push({ l: 'Grande décision', v: -coutDecision(z, d.decision) });
  const dem = (d.demarches || []).reduce((s, x) => s + coutDemarche(st, z.uid, x), 0);
  if (dem) choix.push({ l: 'Démarches d’enquête', v: -dem });
  if (d.aide && d.aide.cible && d.aide.budget) choix.push({ l: 'Entraide envoyée', v: -d.aide.budget });
  const totalChoix = choix.reduce((s, x) => s + x.v, 0);
  return { fixes: ff, choix, totalChoix, solde: ff.total + totalChoix, apres: z.budget + ff.total + totalChoix };
}

function lignes(l) {
  return l.map((x) => `<div class="between compta"><span>${esc(x.l)}</span><span class="mono ${x.v >= 0 ? 'ok' : 'bad'}">${k(x.v)}</span></div>`).join('');
}

/** Fenêtre « Détail du budget » (clic sur la tuile Budget). */
export function ouvrirBudget() {
  const z = myZone();
  const p = previsionBudget();
  const recettes = p.fixes.lignes.filter((x) => x.v > 0), frais = p.fixes.lignes.filter((x) => x.v < 0);
  // Tendance : sur la base des seuls frais fixes (sans amendes exceptionnelles ni dépenses).
  const net = p.fixes.total;
  const tours = net < 0 ? Math.max(0, Math.ceil((z.budget - PERIL.budget) / -net)) : null;
  const c = z.compta;
  const html = `
    <div class="between" style="align-items:flex-start"><h2 id="aide-titre" class="aide-titre">Budget de la zone</h2>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <div class="between"><span class="small muted">Aujourd’hui</span><span class="mono" style="font-size:20px;font-weight:700">${fmt1(z.budget)} k€</span></div>
    <h3 class="compta-t">Chaque jour, quoi qu’il arrive</h3>
    ${lignes(recettes)}${lignes(frais)}
    <div class="between compta total"><span>Solde fixe par jour</span><span class="mono ${net >= 0 ? 'ok' : 'bad'}">${k(net)}</span></div>
    ${net < 0 ? `<p class="small bad" style="margin:0">À ce rythme, ta zone passe en péril (sous −${Math.abs(PERIL.budget)} k€) dans environ ${tours} tour${tours > 1 ? 's' : ''}. Réduis tes effectifs, tes dépenses ou le rythme.</p>` : `<p class="tiny muted" style="margin:0">Positif : ta zone vit de ses recettes. Les dépenses ci-dessous puisent dans ta réserve.</p>`}
    <h3 class="compta-t">Tes choix de ce soir</h3>
    ${p.choix.length ? lignes(p.choix) : '<p class="tiny muted" style="margin:0">Aucune dépense prévue dans tes ordres.</p>'}
    <div class="between compta total"><span>Budget estimé après 20:00</span><span class="mono ${p.apres >= 0 ? '' : 'bad'}" style="font-weight:700">${fmt1(p.apres)} k€</span></div>
    <p class="tiny muted" style="margin:0">Hors imprévus, primes, FIPA et Conseil. Une dépense du jour est refusée si le budget ne suffit pas au moment de la payer.</p>
    ${c && c.lignes ? `<h3 class="compta-t">Relevé du dernier tour (tour ${c.tour})</h3>
      ${lignes(c.lignes)}
      <div class="between compta total"><span>${fmt1(c.debut)} k€ → ${fmt1(c.fin)} k€</span><span class="mono ${c.fin - c.debut >= 0 ? 'ok' : 'bad'}">${k(Math.round((c.fin - c.debut) * 10) / 10)}</span></div>` : ''}
    <p class="tiny muted" style="margin:0">Budget négatif deux tours de suite : Inspection générale (−5 k€). Sous −${Math.abs(PERIL.budget)} k€ : zone en péril, faillite après ${PERIL.tours} résolutions sans redressement.</p>
    <a class="small" href="#guide-zone" data-close>Règles du budget dans le guide</a>`;
  ouvrirPanneau(html);
}

/** Petit panneau en haut de l'écran (même présentation que les aides « ? »). */
function ouvrirPanneau(html) {
  document.querySelector('.aide-wrap')?.remove();
  const retour = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="aide-titre">${html}</div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); if (retour && retour.focus) retour.focus(); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) { fermer(); return; }
    const c = e.target.closest('[data-close]');
    if (c) { e.stopPropagation(); if (c.tagName !== 'A') e.preventDefault(); fermer(); }
  });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
  wrap.querySelector('[data-close]').focus();
}

/** Carte repliable « Logistique » de l'HP. */
export function logistiqueHtml() {
  const z = myZone(), st = S.state, d = S.draft || {};
  const b = z.batiments;
  const annexes = Object.entries(INFRAS).filter(([id]) => z.infra[id]);
  const entretienTotal = Object.entries(BATIMENTS).reduce((s, [id, B]) => s + B.entretien(b[id]), 0) + annexes.length * ENTRETIEN_ANNEXE;
  const occupation = { bureaux: `${effectifPrevu(z)} / ${capaciteAgents(z)} agents`, garage: `${z.vehicules} / ${capaciteVehicules(z)} véhicules` };
  const plein = { bureaux: effectifPrevu(z) >= capaciteAgents(z), garage: z.vehicules >= capaciteVehicules(z) };
  const bat = Object.entries(BATIMENTS).map(([id, B]) => {
    const n = b[id];
    const dec = { type: 'agrandir', batiment: id };
    const choisi = d.decision && d.decision.type === 'agrandir' && d.decision.batiment === id;
    const refus = decisionImpossible(z, dec, st.turn);
    const enTravaux = z.travaux && z.travaux.batiment === id;
    return `<div class="bat">
      <div class="between"><span style="font-weight:700">${B.nom}</span><span class="niv" aria-label="Niveau ${n} sur ${BATIMENT_MAX}">${Array.from({ length: BATIMENT_MAX }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span></div>
      <span class="tiny muted">${B.texte}</span>
      <div class="between small"><span class="${plein[id] ? 'warn' : ''}">${occupation[id]}${plein[id] ? ' · plein' : ''}</span><span class="mono tiny muted">entretien ${fmt1(B.entretien(n))} k€${B.subside(n) ? ` · subside +${fmt1(B.subside(n))}` : ''}</span></div>
      ${enTravaux ? `<span class="small warn" style="font-weight:600">Travaux en cours : niveau ${n + 1} au tour ${z.travaux.fin}</span>`
        : n >= BATIMENT_MAX ? '<span class="small ok" style="font-weight:600">Niveau maximum</span>'
        : `<button type="button" class="btn small block ${choisi ? 'primary' : ''}" data-action="agrandir" data-b="${id}" ${refus && !choisi ? 'disabled' : ''}>
            ${choisi ? '✓ Agrandissement prévu ce soir · annuler' : `Agrandir : niveau ${n + 1} · ${B.capacite(n + 1)} ${B.unite} · ${fmt1(B.coutAgrandir(n))} k€`}</button>
          <span class="tiny muted">${refus && !choisi ? esc(refus) : `${TRAVAUX_TOURS} tours de travaux · entretien ensuite ${fmt1(B.entretien(n + 1))} k€/tour${B.subside(n + 1) ? `, subside +${fmt1(B.subside(n + 1))}` : ''} · c’est ta grande décision du jour`}</span>`}
    </div>`;
  }).join('');
  const peq = perequation(z, st);
  return `<details class="card repli" aria-label="Logistique" data-k="logistique" ${S.ouverts && S.ouverts.logistique ? 'open' : ''}>
    <summary><span style="color:var(--amber)">${icon('hp', 20)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Logistique</span>
      <span class="tiny muted">Hôtel de police niv. ${b.bureaux} · Garage niv. ${b.garage}${annexes.length ? ` · ${annexes.length} annexe${annexes.length > 1 ? 's' : ''}` : ''} · ${fmt1(entretienTotal)} k€/tour${z.travaux ? ' · travaux en cours' : ''}</span></span>${icon('chevron', 16)}</summary>
    <div class="col" style="gap:10px">${bat}
      <div class="bat"><div class="between"><span style="font-weight:700">Annexes</span><span class="mono tiny muted">${fmt1(ENTRETIEN_ANNEXE)} k€/tour chacune</span></div>
        <span class="small">${annexes.length ? annexes.map(([, i]) => esc(i.nom)).join(' · ') : 'Aucune pour l’instant.'}</span>
        <a class="tiny" href="#ordres">Construire une annexe (grande décision, dans tes ordres)</a></div>
      ${peq ? `<p class="tiny ok" style="margin:0">Péréquation : ta zone est moins équipée que la moyenne du district, elle reçoit +${fmt1(PEREQUATION.montant)} k€ par tour.</p>` : ''}
      <p class="tiny muted" style="margin:0">Tout repart au niveau 1 à chaque nouvelle saison, comme les effectifs et le budget.</p>
    </div></details>`;
}
