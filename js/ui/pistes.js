// Pistes en cours (écran des ordres) et carte « Cette nuit » (HP).
import { S, esc, myZone } from './common.js';
import { PISTES, IDS_PISTES, MAX_PISTES, pisteImpossible } from '../engine/pistes.js';
import { affaire } from '../engine/enquete.js';
import { carteQuartiers, tensionsDe, niveauTension } from '../engine/quartiers.js';

const nuitsTxt = (n) => (n <= 0 ? 'ce soir' : n === 1 ? 'demain soir' : `dans ${n} nuits`);

/** Résumé d'une ligne (pli des ordres). */
export function resumePistes(z, d) {
  const en = (z.pistes || []).length, nv = (d.pistesNew || []).length;
  if (!en && !nv) return 'Aucune piste en cours';
  return [en ? `${en} en cours` : '', nv ? `${nv} à lancer ce soir` : ''].filter(Boolean).join(' · ');
}

/** Contenu du pli « Pistes » : celles en cours, et de quoi en lancer de nouvelles (avec les ordres). */
export function pistesOrdresHtml(z, d) {
  const st = S.state, T = st.turn;
  const nv = d.pistesNew || [];
  const enCours = (z.pistes || []).map((p) => { const P = PISTES[p.type]; return `<div class="between"><span class="small">${P.ico} ${esc(P.nom)}</span><span class="tiny muted">résultat ${nuitsTxt(p.retour - T)}</span></div>`; }).join('');
  const aff = st.enquete && !st.enquetePause ? affaire(st, st.enquete.n) : null;
  const tens = tensionsDe(st, z);
  const cells = (carteQuartiers(st).deZone[z.uid] || []).map(Number).sort((a, b) => (tens[b] || 0) - (tens[a] || 0));
  const options = IDS_PISTES.map((k) => {
    const P = PISTES[k], choisie = nv.find((p) => p.type === k);
    let sel = '';
    if (P.cible === 'suspect' && aff && !aff.meurtre) sel = `<select class="text" data-change="piste-cible" data-k="${k}" aria-label="Suspect à suivre" style="min-height:34px">${aff.suspects.map((s, i) => `<option value="${i}" ${choisie && choisie.cible === i ? 'selected' : ''}>${esc(s.nom)}</option>`).join('')}</select>`;
    if (P.cible === 'quartier' && cells.length) sel = `<select class="text" data-change="piste-cible" data-k="${k}" aria-label="Quartier" style="min-height:34px">${cells.map((c) => `<option value="${c}" ${choisie && choisie.cible === c ? 'selected' : ''}>Quartier ${c} · ${niveauTension(tens[c] || 50).nom}</option>`).join('')}</select>`;
    const raison = choisie ? null : pisteImpossible(st, { ...z, pistes: [...(z.pistes || []), ...nv.map((p) => ({ type: p.type }))] }, k, P.cible === 'suspect' ? 0 : P.cible === 'quartier' ? cells[0] : null);
    return `<div class="col" style="gap:4px">
      <button type="button" class="choice" data-action="piste-toggle" data-k="${k}" aria-pressed="${!!choisie}" ${raison && !choisie ? 'disabled' : ''} style="flex-direction:row;justify-content:space-between;text-align:left">
        <span class="col" style="gap:1px;align-items:flex-start"><span style="font-size:14px">${P.ico} ${esc(P.nom)}</span><span class="s">${esc(P.texte)} · résultat en ${P.nuits[0] === P.nuits[1] ? P.nuits[0] : `${P.nuits[0]} à ${P.nuits[1]}`} nuits${raison && !choisie ? ` · ${esc(raison)}` : ''}</span></span>
        <span class="mono small">${P.cout ? `${String(P.cout).replace('.', ',')} k€` : P.agents ? `${P.agents} agent` : 'gratuit'}</span></button>
      ${choisie && sel ? sel : ''}</div>`;
  }).join('');
  return `<div class="col" style="gap:8px">
    ${enCours ? `<div class="col" style="gap:4px">${enCours}</div>` : ''}
    <p class="tiny muted" style="margin:0">Une piste se lance avec tes ordres ; son résultat tombe une à trois nuits plus tard, que tu viennes ou non (rapport et HP). ${MAX_PISTES} en cours au plus, une de chaque sorte.</p>
    ${options}</div>`;
}

/** Bascule une piste dans le brouillon des ordres. */
export function basculerPiste(k) {
  const d = S.draft, z = myZone(), st = S.state;
  const l = (d.pistesNew ||= []);
  const i = l.findIndex((p) => p.type === k);
  if (i >= 0) { l.splice(i, 1); return; }
  const P = PISTES[k];
  let cible = null;
  if (P.cible === 'suspect') cible = 0;
  if (P.cible === 'quartier') { const t = tensionsDe(st, z); cible = (carteQuartiers(st).deZone[z.uid] || []).map(Number).sort((a, b) => (t[b] || 0) - (t[a] || 0))[0] ?? null; }
  l.push({ type: k, cible });
}
export function cibler(k, v) { const p = (S.draft.pistesNew || []).find((x) => x.type === k); if (p) p.cible = Number(v); }

// Lignes du rapport qui méritent la carte « Cette nuit » (en plus des résultats de pistes).
const MARQUANTS = [/^Coup dur/, /^Héros du jour/, /^Traque : .*arrêté/, /^Enquête : bien vu/, /^Enquête : .* passe aux aveux/, /^Trophée débloqué/, /^Jauge des skins pleine/, /vague de délinquance/i, /^Incident technique/];

/** Carte « Cette nuit » : trois faits au plus, ceux qui te concernent vraiment ; le rapport complet reste plus bas. */
export function cetteNuitHtml(z) {
  if (!z || S.state.turn <= 1) return '';
  const l = [...(z.cetteNuit || []).map((x) => x.t)];
  for (const r of z.rapport || []) { if (l.length >= 3) break; if (MARQUANTS.some((m) => m.test(r)) && !l.includes(r)) l.push(r); }
  if (!l.length) return '';
  const court = (t) => (t.length > 170 ? `${t.slice(0, 167)}…` : t);
  return `<section class="card" aria-label="Cette nuit" style="gap:6px">
    <span class="kicker">Cette nuit</span>
    ${l.slice(0, 3).map((t) => `<p class="small" style="margin:0;line-height:1.45">${esc(court(t))}</p>`).join('')}
    <button type="button" class="lien tiny" data-action="voir-rapport" style="align-self:flex-start;background:none;border:0;padding:0;color:var(--amber-soft);text-decoration:underline;cursor:pointer">Tout le rapport ↓</button></section>`;
}

/** Carte des pistes en cours (HP), seulement s'il y en a. */
export function pistesHpHtml(z) {
  const l = z.pistes || [];
  if (!l.length) return '';
  const T = S.state.turn;
  return `<a class="card" href="#ordres" style="gap:4px;text-decoration:none;color:var(--text)"><span class="kicker">Pistes en cours</span>
    ${l.map((p) => `<span class="small">${PISTES[p.type].ico} ${esc(PISTES[p.type].nom)} · résultat ${nuitsTxt(p.retour - T)}</span>`).join('')}</a>`;
}
