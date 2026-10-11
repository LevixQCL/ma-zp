// Non-droit profond, affichage : le réseau du Parrain (au-dessus de la fiche), le lieutenant et la scène du soir
// dans la fiche d'un secteur du milieu, la confiance des habitants dans la fiche d'un secteur repris.
import { S, esc } from './common.js';
import { nomSecteur, milieuDe } from '../engine/nondroit.js';
import { niveauChef } from '../engine/chef.js';
import { TACTIQUES, M3, RENSEIGNEMENTS, SCENES, ETAPES, etape, portraitParrain, portraitLieutenant, scenesDuSoir, seuilScene, SERVICE_SCENE, PORTRAITS_PRETS } from '../engine/milieu.js';

const nd = () => (S.state && S.state.nonDroit) || null;
export const v3Actif = () => !!(nd() && nd().v3 && nd().parrain);
const nomZ = (uid, me) => (me && uid === me.uid ? 'toi' : !S.state.zones[uid] || (S.state.zones[uid].toursSansOrdres || 0) >= 2 ? 'le parquet (compte pour tous)' : `ZP ${esc(S.state.zones[uid].code)} ${esc(S.state.zones[uid].nom)}`);
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const ICO_R = { plan: '▦', garde: '⏱', compta: '€', armes: '⚑', issue: '⇥' };
export const ICO_SCENE = { emeute: '🔥', rodeo: '🏍', livraison: '📦', perquisition: '🚪' };

/** Portrait rond : silhouette dessinée, l'image Gemini par-dessus quand elle existe. */
export function portrait(src, cls = '') {
  return `<span class="ml-pt ${cls}" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="15" r="7" fill="#0E0B12"/><path d="M5 40c1-10 7-15 15-15s14 5 15 15z" fill="#0E0B12"/></svg>${PORTRAITS_PRETS ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
}

const ETAT_LT = { libre: 'libre', garde: 'en garde à vue', tombe: 'a parlé', enfui: 'en fuite' };

/** Bande « le réseau du Parrain » (repliable, se replie seule une fois le Parrain tombé). */
export function reseauHtml(me) {
  const n = nd();
  if (!v3Actif()) return '';
  const p = n.parrain, dossier = n.dossier || {};
  const types = Object.keys(RENSEIGNEMENTS);
  const nb = types.filter((t) => dossier[t]).length;
  const lts = Object.entries(n.secteurs).filter(([, s]) => s.lieutenant).sort((a, b) => Number(a[0]) - Number(b[0]));
  const mesR = types.filter((t) => dossier[t] === me.uid);
  const detenteurs = [...new Set(types.map((t) => dossier[t]).filter((u) => u && S.state.zones[u]))];
  const ouvert = !!(S.ouverts && S.ouverts['nd-reseau']);
  const resume = p.tombe ? 'arrêté' : `${nb}/${types.length}${mesR.length ? ` · ${mesR.length} chez toi` : ''}`;
  return `<details class="ml-reseau card tight" data-k="nd-reseau" ${ouvert ? 'open' : ''}>
    <summary class="row" style="gap:10px">${portrait(portraitParrain(p.nom), `boss ${p.tombe ? 'tombe' : ''}`)}
      <span class="col" style="gap:1px;min-width:0;flex:1"><strong class="ml-boss">${esc(cap(p.nom))}</strong><span class="tiny muted">${p.tombe ? 'Le Parrain du milieu est tombé' : `Parrain du milieu · ${lts.filter(([, s]) => s.lieutenant.etat === 'libre').length} lieutenant${lts.filter(([, s]) => s.lieutenant.etat === 'libre').length > 1 ? 's' : ''} en liberté · renseignements ${nb}/${types.length}`}</span></span>
      <span class="pill ${p.tombe ? 'green' : 'amber'}">${resume}</span></summary>
    <div class="col" style="gap:8px;margin-top:10px">
      <div class="ml-dossier" role="list" aria-label="Dossier du Parrain">${types.map((t) => `<span role="listitem" class="${dossier[t] ? 'ok' : ''}" title="${dossier[t] ? `${esc(RENSEIGNEMENTS[t].nom)} : ${nomZ(dossier[t], me)}` : 'Renseignement à trouver'}"><b>${dossier[t] ? ICO_R[t] : '?'}</b><i>${dossier[t] ? esc(RENSEIGNEMENTS[t].nom) : 'à trouver'}</i></span>`).join('')}</div>
      ${nb ? `<p class="tiny" style="margin:0">${types.filter((t) => dossier[t]).map((t) => `${esc(RENSEIGNEMENTS[t].nom)} : <strong>${nomZ(dossier[t], me)}</strong>`).join(' · ')}.</p>
        <p class="tiny muted" style="margin:0">À l’assaut du QG, chaque renseignement apporté par une zone <strong>présente ce soir-là</strong> : +${Math.round(M3.bonusRens * 100)} % de force, moins de blessés${detenteurs.length > 1 ? `. Pour tout avoir, il faut ${detenteurs.length} zones le même soir` : ''}.</p>`
        : '<p class="tiny muted" style="margin:0">Reprendre un secteur avec un bon bouclage fait tomber son lieutenant : interrogé, il donne un renseignement sur le QG. Les livraisons interceptées aussi.</p>'}
      <div class="ml-lts">${lts.map(([k, s]) => `<button type="button" class="ml-lt ${s.lieutenant.etat}" data-action="secteur" data-c="${k}">${portrait(portraitLieutenant(s.milieu), s.lieutenant.etat)}<span class="n">${esc(cap(s.lieutenant.nom))}</span><span class="e">${esc(nomSecteur(k))} · ${ETAT_LT[s.lieutenant.etat] || ''}</span></button>`).join('')}</div>
    </div></details>`;
}

/** Ligne « lieutenant » dans la fiche d'un secteur du milieu. */
export function ligneLieutenant(k, s) {
  if (!v3Actif() || !s.lieutenant || s.coeur) return '';
  const lt = s.lieutenant, n = esc(cap(lt.nom));
  // Une ligne : qui tient le secteur, et ce que le bouclage change pour lui (le détail est dans la prévision et le guide).
  const txt = lt.etat === 'libre' ? `Tenu par <strong>${n}</strong> · bien bouclé, il est arrêté et parle${lt.pieces > 1 ? ` (<strong>${lt.pieces} renseignements</strong>)` : ''}`
    : lt.etat === 'garde' ? `<strong>${n}</strong> en garde à vue` : lt.etat === 'tombe' ? `<strong>${n}</strong> est tombé et a parlé` : `<strong>${n}</strong> a filé chez un voisin`;
  return `<div class="row ml-ltl" style="gap:8px">${portrait(portraitLieutenant(s.milieu), lt.etat)}<span class="tiny" style="flex:1;min-width:0">${txt}</span></div>`;
}

/** Carte « Ce soir : émeute » dans la fiche du secteur : compteur, agents à la scène, mini-jeu facultatif ; les gains se déplient. */
export function sceneHtml(k, s, mes, place, annonces, { hp = false } = {}) {
  const sc = scenesDuSoir(S.state).find((x) => String(x.cell) === String(k));
  if (!sc) return '';
  const def = SCENES[sc.type], seuil = seuilScene(S.state, sc.type);
  const autres = annonces.filter((x) => !x.moi).reduce((t, x) => t + ((x.r && x.r.sc) || 0), 0);
  const res = S.player && S.player.incidents && S.player.incidents.r && S.player.incidents.r[sc.id];
  const jeuOk = res && res.statut === 'ok', joue = res && res.statut !== 'abandon';
  const valJeu = jeuOk ? M3.scenes.jeu + (res.fautes ? 0 : M3.scenes.sansFaute) : 0;
  const total = autres + (mes.sc || 0) + valJeu;
  const ok = total >= seuil;
  const verbe = { emeute: 'Encadrer l’émeute', rodeo: 'Rattraper le rodéo', livraison: 'Intercepter les téléphones', perquisition: 'Ouvrir la porte' }[sc.type];
  // Sur l'HP, la ligne dépliée porte déjà le titre : seulement le compteur.
  const tete = hp ? `<div class="between"><span class="tiny muted">${ok ? 'assez de monde, elle sera réglée' : `il faut ${seuil} agents, toutes zones confondues`}</span><span class="pill ${ok ? 'green' : ''}">${Math.min(total, 99)}/${seuil}</span></div>`
    : `<div class="row" style="gap:8px"><span class="ml-scene-ico" aria-hidden="true">${ICO_SCENE[sc.type]}</span>
      <span class="col" style="gap:0;flex:1;min-width:0"><strong class="small ml-scene-t">Ce soir : ${esc(def.titre.toLowerCase())}</strong><span class="tiny muted">${ok ? 'assez de monde, elle sera réglée' : `il faut ${seuil} agents, toutes zones confondues`}</span></span>
      <span class="pill ${ok ? 'green' : ''}">${Math.min(total, 99)}/${seuil}</span></div>`;
  return `<div class="ml-scene ${ok ? 'ok' : ''}${hp ? ' hp' : ''}">
    ${tete}
    <div class="between"><span class="col" style="gap:0"><span class="small">Agents à la scène</span><span class="tiny muted">à part de l’assaut, sans piège</span></span>
      <span class="stepper"><button type="button" data-action="nd-role" data-c="${k}" data-r="sc" data-d="-1" aria-label="Un agent de moins à la scène" ${(mes.sc || 0) <= 0 ? 'disabled' : ''}>−</button><span class="n">${mes.sc || 0}</span><button type="button" data-action="nd-role" data-c="${k}" data-r="sc" data-d="1" aria-label="Un agent de plus à la scène" ${place <= 0 ? 'disabled' : ''}>+</button></span></div>
    ${joue ? `<p class="tiny ${jeuOk ? 'ok' : 'muted'}" style="margin:0">${jeuOk ? `✓ Mini-jeu réussi : compte comme ${valJeu} agents.` : 'Mini-jeu raté : seuls les agents comptent.'}</p>`
      : `<button type="button" class="btn small ghost block" data-action="nd-scene-jeu" data-c="${k}">🎮 ${verbe} moi-même · facultatif, = ${M3.scenes.jeu} agents</button>`}
    <details class="tiny ml-scene-plus"><summary>Ce que ça rapporte</summary><p class="muted" style="margin:4px 0 0">${esc(def.texte)} Réglée : emprise −${M3.scenes.effet[sc.type]}, secteur repéré 2 soirs, et pour chaque zone présente +${M3.scenes.rep} de réputation, +${M3.scenes.ps} PS, +${M3.scenes.pts} pts, +${Math.round(M3.scenes.budget * 1000).toLocaleString('fr-BE')} €${sc.type === 'livraison' ? ' ; le mini-jeu donne en plus un renseignement sur le QG' : ''}.${sc.type === 'emeute' ? ' Ratée : l’émeute déborde sur les quartiers voisins.' : sc.type === 'livraison' ? ' Ratée : emprise +8.' : ''}</p></details>
  </div>`;
}

/** Confiance des habitants (secteur repris). */
export function confianceHtml(k, s, presence) {
  if (!v3Actif() || !Number.isFinite(s.confiance)) return '';
  const e = etape(s), C = M3.confiance, [a, b] = C.etapes;
  const gain = Math.min(C.presenceMax, presence * C.parPresence) + C.calme;
  return `<div class="ml-conf">
    <div class="between"><strong class="small">Confiance des habitants · ${Math.round(s.confiance)}</strong><span class="pill ${e ? 'green' : ''}">${ETAPES[e].nom}</span></div>
    <span class="ml-jauge" role="img" aria-label="Confiance ${Math.round(s.confiance)} sur 100"><span style="width:${Math.max(2, Math.round(s.confiance))}%"></span><i style="left:${a}%"></i><i style="left:${b}%"></i></span>
    <span class="tiny muted">${esc(ETAPES[e].texte)} ${e < 2 ? `Ce soir : +${gain}${presence ? ` avec ${presence} en présence` : ' au calme (mets de la Proximité en présence : +4 chacun)'} · ${e === 0 ? `${a} = sécurisé` : `${b} = rendu à la vie`}.` : ''}</span>
  </div>`;
}

/** Bulle de carte pour la scène du soir d'un secteur (ou null). */
export const sceneCarte = (k) => scenesDuSoir(S.state).find((x) => String(x.cell) === String(k)) || null;
export { milieuDe };

/** Dernier carré : le lieutenant barricadé, trois tactiques à voter (le vote compte si on engage des agents à l'assaut). */
/** Tactique en tête ce soir sur un secteur barricadé (votes annoncés à la radio et le mien), ou null. */
export function tactiqueEnTete(k, annonces, mesAgents) {
  const s = nd() && nd().secteurs[k];
  if (!s || !s.barricade) return null;
  const mien = (S.draft && S.draft.tactiques && S.draft.tactiques[k]) || null, votes = {};
  for (const x of annonces) { const v = x.moi ? mien : x.tac; const n = x.moi ? mesAgents : x.n; if (v && n > 0) votes[v] = (votes[v] || 0) + n; }
  const l = Object.entries(votes).sort((a, b) => b[1] - a[1] || (a[0] === 'frontal' ? -1 : b[0] === 'frontal' ? 1 : 0));
  return l.length ? l[0][0] : null;
}

export function dernierCarreHtml(k, s, annonces, mesAgents) {
  if (!v3Actif() || !s.barricade || !s.lieutenant) return '';
  const C = M3.carre, mien = (S.draft && S.draft.tactiques && S.draft.tactiques[k]) || null;
  const votes = {};
  for (const x of annonces) { const v = x.moi ? mien : x.tac; const n = x.moi ? mesAgents : x.n; if (v && n > 0) votes[v] = (votes[v] || 0) + n; }
  const chefs = annonces.map((x) => S.state.zones[x.uid]).filter(Boolean).map((z) => (z.chef ? niveauChef(z.chef, 'diplomatie') || 0 : 0));
  const nego = Math.min(C.negoMax, C.negoBase + C.negoParNiveau * Math.max(0, ...chefs));
  const tete = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  const choix = (v) => {
    const t = TACTIQUES[v];
    return `<button type="button" class="choice ml-tac" data-action="nd-tactique" data-c="${k}" data-v="${v}" aria-pressed="${mien === v}">
      <span class="ml-tac-t">${t.ico} ${esc(t.nom)}${votes[v] ? ` <span class="pill">${votes[v]} ag.</span>` : ''}</span>
      <span class="tiny muted">${{ frontal: `tombe à coup sûr · risque de blessé (${Math.round(C.frontalBlessure * 100)} % par agent en descente)`, negocier: `${Math.round(nego * 100)} % (diplomatie des chefs) : il se rend, +1 renseignement · sinon emprise +${C.negoEchec}`, encercler: 'sans fuite : tombe, saisies ×2 · sinon assaut normal' }[v]}</span></button>`;
  };
  return `<div class="ml-carre">
    <div class="row" style="gap:8px"><span class="ml-scene-ico" aria-hidden="true">🧱</span><span class="col" style="gap:0;flex:1;min-width:0"><strong class="small" style="color:var(--amber)">Dernier carré : ${esc(cap(s.lieutenant.nom))} s’est barricadé</strong>
      <span class="tiny muted">Vote des zones engagées (1 agent à l’assaut = 1 voix)${tete ? ` · en tête : <strong>${esc(TACTIQUES[tete[0]].nom.toLowerCase())}</strong>` : ''}</span></span></div>
    ${['frontal', 'negocier', 'encercler'].map(choix).join('')}
    ${mesAgents ? '' : '<p class="tiny warn" style="margin:0">Engage au moins un agent à l’assaut de ce secteur pour que ton vote compte.</p>'}
  </div>`;
}
