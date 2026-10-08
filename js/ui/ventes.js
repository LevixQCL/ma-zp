// Vente aux enchères des saisies (saison 2) : catalogue de trois lots, relances visibles le premier jour (publiées sur
// la Radio), offre finale secrète le second, expertise et tuyau du chef.
import { S, esc, icon, fmt1, myZone, zoneName } from './common.js';
import { LOTS } from '../engine/constants.js';
import { VENTE, ETATS, aEtat, lireRelances, phaseVente, liees } from '../engine/ventes.js';
import { niveauChef } from '../engine/chef.js';
import { pactesDe, partenaire } from '../engine/pactes.js';
import { vignetteVentes } from './vignettes-hp.js';

const euros = (k) => `${String(Math.round(k * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
const ICO = { chien: '🐕', drone: '🛸', radar: '📡', analyse: '💻', banalise: '🚗', prevention: '💡', stage: '🎓', gilets: '🦺', parquet: '⚖️', quartier: '🏠', cellule: '👮', helico: '🚁', blinde: '🛡️', cellulef: '🚔' };

/** Relances visibles du jour (Radio). */
export function relancesDuJour() {
  const st = S.state, v = st && st.vente;
  if (!v) return { meneurs: {}, parZone: {}, n: {} };
  const msgs = (S.radio || []).filter((m) => m.enchere && m.enchere.vente === v.id).map((m) => ({ uid: m.uid, at: m.at, ...m.enchere }));
  return lireRelances(st, msgs);
}
export const mesRelances = () => { const st = S.state, v = st.vente, me = S.user && S.user.uid; return (S.radio || []).filter((m) => m.enchere && v && m.enchere.vente === v.id && m.uid === me).length; };
/** Montant d'une relance sur ce lot (au palier au-dessus du meneur, ou la mise à prix). */
export function prochaineRelance(k, plus = 0) {
  const v = S.state.vente, lot = v.lots.find((x) => x.k === k), m = relancesDuJour().meneurs[k];
  return Math.min(VENTE.max, Math.round(((m ? m.montant + VENTE.pas : lot.prixMin) + plus) * 10) / 10);
}

function lotHtml(v, lot, ph, z, rel) {
  const L = LOTS[lot.id], st = S.state, d = S.draft || {};
  const meneur = ph === 'visible' ? rel.meneurs[lot.k] : v.meneurs && v.meneurs[lot.k];
  const mien = ph === 'visible' ? (rel.parZone[z.uid] || {})[lot.k] : v.engagees && v.engagees[z.uid] && v.engagees[z.uid][lot.k];
  const exp = (z.expertises || {})[`${v.id}:${lot.k}`];
  const fin = (d.finales || {})[lot.k];
  const partners = lot.gros ? pactesDe(st, z.uid).map((p) => partenaire(p, z.uid)).filter((u) => st.zones[u] && liees(st, z.uid, u)) : [];
  let action = '';
  if (ph === 'visible') {
    const n = prochaineRelance(lot.k), reste = VENTE.relancesJour - mesRelances();
    action = `<div class="between" style="gap:8px;flex-wrap:wrap">
        ${meneur && meneur.uid === z.uid ? '<span class="small ok" style="font-weight:700">Tu mènes</span>' : `<button type="button" class="btn small primary" data-action="vente-relance" data-k="${lot.k}" data-m="${n}" ${reste <= 0 || n > z.budget ? 'disabled' : ''}>Relancer à ${euros(n)}</button>`}
        <span class="tiny muted">${reste > 0 ? `${reste} relance${reste > 1 ? 's' : ''} possible${reste > 1 ? 's' : ''} aujourd’hui` : 'plus de relance aujourd’hui'}</span></div>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        ${aEtat(lot.id) ? `<button type="button" class="choice" style="flex:1;min-width:140px" data-action="vente-expertise" data-k="${lot.k}" aria-pressed="${d.expertise === lot.k}"><span style="font-weight:600">🔍 Expertise</span><span class="s">1 agent immobilisé demain · Flair ${niveauChef(z.chef, 'flair')}</span></button>` : ''}
        ${z.chef && !(z.tuyaux || []).includes(v.id) ? `<button type="button" class="choice" style="flex:1;min-width:140px" data-action="vente-tuyau" data-k="${lot.k}" aria-pressed="${d.tuyau === lot.k}"><span style="font-weight:600">🤫 Tuyau du priseur</span><span class="s">qui d’autre s’y intéresse (une fois par vente)</span></button>` : ''}</div>`;
  } else if (ph === 'finale') {
    const m = fin ? fin.montant : 0, plancher = Math.max(lot.prixMin, mien || 0);
    action = `<div class="col" style="gap:6px"><div class="between"><span style="font-weight:600;font-size:14px">Ton offre finale secrète</span><span class="tiny muted">budget ${fmt1(z.budget)} k€</span></div>
      <span class="stepper" style="align-self:center"><button type="button" data-action="vente-finale" data-k="${lot.k}" data-d="-1" ${m ? '' : 'disabled'}>−1</button><button type="button" data-action="vente-finale" data-k="${lot.k}" data-d="-0.5" ${m ? '' : 'disabled'}>−</button>
        <span class="n" style="min-width:84px">${m ? euros(m) : '—'}</span>
        <button type="button" data-action="vente-finale" data-k="${lot.k}" data-d="0.5" data-p="${plancher}">+</button><button type="button" data-action="vente-finale" data-k="${lot.k}" data-d="1" data-p="${plancher}">+1</button></span>
      <span class="tiny muted" style="text-align:center">${mien ? `Ta relance d’hier (${euros(mien)}) compte déjà comme offre : tu ne peux que monter.` : 'Débitée seulement si tu l’emportes.'}</span>
      ${lot.gros && partners.length ? `<label class="field tiny">Acheter à deux (vous mettez vos offres en commun)<select class="text" data-change="vente-partenaire" data-k="${lot.k}"><option value="">Seul</option>${partners.map((u) => `<option value="${esc(u)}" ${fin && fin.partenaire === u ? 'selected' : ''}>avec ${zoneName(st.zones[u])}</option>`).join('')}</select></label>
        <span class="tiny muted">Ton partenaire doit te désigner aussi : le lot vous profite à tous les deux, chacun paie sa part.</span>` : lot.gros ? '<span class="tiny muted">Gros lot : avec un pacte, deux zones peuvent l’acheter ensemble.</span>' : ''}</div>`;
  }
  return `<div class="bat vente-lot${lot.gros ? ' gros' : ''}">
    <div class="row" style="gap:10px;align-items:flex-start"><span class="vente-ico" aria-hidden="true">${ICO[lot.id] || '📦'}</span>
      <span class="col grow" style="gap:2px;min-width:0"><span class="between" style="gap:6px;align-items:flex-start"><span style="font-weight:700">${esc(L.nom)}</span>${lot.gros ? '<span class="pill amber" style="flex-shrink:0">gros lot</span>' : ''}</span>
        <span class="tiny muted">${esc(L.texte)}</span><span class="small ok" style="font-weight:600">${esc(L.effet)}</span>
        <span class="tiny muted">Mise à prix ${euros(lot.prixMin)}${aEtat(lot.id) ? ` · état ${exp ? `expertisé : <strong>${esc(exp)}</strong>` : 'caché (comme neuf, usé ou défectueux)'}` : ''}</span>
        <span class="tiny">${meneur ? `${meneur.uid === z.uid ? '<strong>Tu mènes</strong>' : `${zoneName(st.zones[meneur.uid])} mène`} à <strong>${euros(meneur.montant)}</strong>` : 'Aucune relance pour l’instant'}${ph === 'visible' && rel.n[lot.k] ? ` · ${rel.n[lot.k]} relance${rel.n[lot.k] > 1 ? 's' : ''}` : ''}</span></span></div>
    ${action}</div>`;
}

export function ventesHtml() {
  const z = myZone(), st = S.state, v = st.vente, ph = phaseVente(st);
  const rel = relancesDuJour();
  const d = S.draft || {};
  const nbFin = Object.keys(d.finales || {}).length;
  const resume = !v ? 'Prochaine vente annoncée à 20:00' : ph === 'visible' ? `3 lots · enchères visibles jusqu’à 20:00${Object.keys(rel.parZone[z.uid] || {}).length ? ' · <strong class="ok">tu as relancé</strong>' : ''}` : `Coup de marteau ce soir · offres finales secrètes${nbFin ? ` · <strong class="ok">${nbFin} offre${nbFin > 1 ? 's' : ''}</strong>` : ''}`;
  const r = st.venteResultat;
  const mesLots = (z.lots || []).map((l) => LOTS[l.id] && `${LOTS[l.id].nom}${l.etat && l.etat !== 'use' ? ` (${ETATS[l.etat].nom})` : ''}`).filter(Boolean);
  return `<details class="card repli" aria-label="Vente aux enchères" data-k="encheres" ${S.ouverts && S.ouverts.encheres ? 'open' : ''}>
    <summary><span class="vign">${vignetteVentes(!!nbFin || !!(rel.parZone[z.uid]))}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Vente aux enchères des saisies</span>
      <span class="tiny muted">${resume}</span></span>${icon('chevron', 16)}</summary>
    <div class="col" style="gap:10px">
      ${v ? `<p class="tiny muted" style="margin:0">${ph === 'visible' ? 'Jour 1 sur 2 : les relances sont visibles de tous (sur la Radio). Demain, chaque zone dépose une seule offre finale secrète ; ta relance compte déjà comme offre.' : 'Jour 2 sur 2 : une seule offre finale secrète par lot, dévoilée au coup de marteau de 20:00. À égalité, la négociation (Diplomatie) du chef départage.'}</p>
        ${v.lots.map((lot) => lotHtml(v, lot, ph, z, rel)).join('')}` : '<p class="small muted" style="margin:0">La prochaine vente ouvre à 20:00 : trois lots, deux jours pour enchérir.</p>'}
      ${mesLots.length ? `<p class="small" style="margin:0"><strong>Tes lots cette saison</strong> : ${mesLots.map(esc).join(' · ')}</p>` : ''}
      ${r && r.adjuges ? `<p class="tiny muted" style="margin:0">Dernière vente (jour ${r.tour}) : ${r.adjuges.length ? r.adjuges.map((a) => `${esc(a.nom)} adjugé à ${a.uids.map((u) => (st.zones[u] ? esc(st.zones[u].nom) : '?')).join(' et ')} pour ${euros(a.montant)}`).join(' · ') : 'aucun lot adjugé'}.</p>` : ''}
    </div></details>`;
}
