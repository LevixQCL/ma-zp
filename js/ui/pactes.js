// Onglet « Pactes » de la Carte : pactes entre zones, défi amical, coup de main aux zones en difficulté, Conseil.
// Remplace l'ancien écran Diplomatie (duels, manœuvres, entraide libre).
import { S, esc, icon, tabbar, myZone, zoneName } from './common.js';
import { gradeFor } from '../engine/constants.js';
import { reglesV2 } from '../engine/regles.js';
import { planVille } from './plan.js';
import { AIDE, gainEntraide, MOTIONS_CHEF, themeActif, THEMES } from '../engine/rivalites.js';
import {
  PACTES, PACTE, DEFI, DEFI_INDICATEURS, pactesDe, partenaire, pacteJoue, toursRestants, pacteImpossible, defiImpossible, moitiesPiece, enDefi,
} from '../engine/pactes.js';
import { affaire } from '../engine/enquete.js';
import { enDifficulte } from '../engine/zone.js';

const ICONES = {
  terrain: '<path d="M3 12l4-4 4 3 3-3 3 3 4-3"/><path d="M7 8v8M17 8v8M3 16h18"/>',
  enquete: '<circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/>',
  achat: '<path d="M4 7h16l-1.5 9h-13z"/><path d="M8 7V5h8v2"/><path d="M9 20h.01M15 20h.01"/>',
};
const TEINTE = { terrain: 'var(--green)', enquete: 'var(--amber)', achat: 'var(--blue)' };
const ico = (type, size = 22) => `<span class="pacte-ico" style="color:${TEINTE[type]}"><svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[type]}</svg></span>`;

function autres() {
  return Object.values(S.state.zones).filter((z) => z.uid !== S.user.uid).sort((a, b) => a.code.localeCompare(b.code));
}
const nomCourt = (uid) => { const z = S.state.zones[uid]; return z ? `${esc(z.code)} ${esc(z.nom)}` : 'zone partie'; };
const puce = (uid) => { const z = S.state.zones[uid]; return `<i class="puce" style="background:${esc((z && z.couleur) || '#67719A')}"></i>`; };

// ───── Propositions du jour, échangées en messages privés (l'autre peut répondre avant 20:00) ─────
const duTour = (x) => x && S.state && x.season === S.state.season && x.turn === S.state.turn;
/** Dernier message du jour de `de` à `a` portant cette clé (pacte, pacteRep, defi, defiRep). */
function dernierMsg(de, a, cle) {
  return (S.prives || []).filter((m) => m[cle] && m.de === de && m.a === a && duTour(m[cle])).sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-1)[0] || null;
}
/** Propositions de pacte reçues aujourd'hui par message (une par zone, la dernière). */
export function pactesRecus() {
  const st = S.state, me = S.user.uid, out = {};
  for (const m of S.prives || []) {
    if (!m.pacte || m.a !== me || !duTour(m.pacte) || !PACTES[m.pacte.type] || !st.zones[m.de]) continue;
    if (!out[m.de] || (m.at || 0) > out[m.de].at) out[m.de] = { de: m.de, type: m.pacte.type, at: m.at || 0 };
  }
  return Object.values(out).filter((x) => !pactesDe(st, me).some((p) => partenaire(p, me) === x.de && p.etape === 'actif')).map((x) => {
    const rep = dernierMsg(me, x.de, 'pacteRep');
    return { ...x, reponse: rep && rep.pacteRep.type === x.type ? rep.pacteRep.ok : null };
  });
}
/** Défis reçus aujourd'hui par message. */
export function defisRecus() {
  const st = S.state, me = S.user.uid, out = {};
  for (const m of S.prives || []) {
    if (!m.defi || m.a !== me || !duTour(m.defi) || !DEFI_INDICATEURS[m.defi.ind] || !st.zones[m.de]) continue;
    if (!out[m.de] || (m.at || 0) > out[m.de].at) out[m.de] = { de: m.de, ind: m.defi.ind, mise: Number(m.defi.mise) || 0, at: m.at || 0 };
  }
  return Object.values(out).map((x) => { const rep = dernierMsg(me, x.de, 'defiRep'); return { ...x, reponse: rep && rep.defiRep.ind === x.ind ? rep.defiRep.ok : null }; });
}
/** Réponse reçue à ma proposition du jour (true, false ou null). */
const reponseA = (cible, cle, ok) => { const m = dernierMsg(cible, S.user.uid, cle); return m && ok(m[cle]) ? !!m[cle].ok : null; };

/** Ce qui attend une réponse ou un geste du joueur dans l'onglet Pactes (pour les pastilles et l'HP). */
export function aFairePactes() {
  const st = S.state, z = myZone();
  if (!st || !z) return [];
  const T = st.turn, me = z.uid, d = S.draft || {}, out = [];
  for (const p of pactesDe(st, me)) {
    if (p.etape === 'propose' && p.b === me && p.tourReponse === T) out.push({ k: 'pacte', titre: `${nomCourt(p.a)} te propose un ${PACTES[p.type].nom.toLowerCase()}`, texte: PACTES[p.type].court, fait: !!(d.pacteReponse && d.pacteReponse.id === p.id) });
    if (p.etape === 'actif' && p.frag && !(p.frag.donne && p.frag.donne[me])) out.push({ k: 'frag', titre: `Demi-pièce à mettre en commun avec ${nomCourt(partenaire(p, me))}`, texte: 'avant le prochain 20:00, sinon elle est perdue', fait: d.fragment === p.id });
  }
  for (const f of st.defis || []) if (f.b === me && f.etape === 'propose' && f.tourReponse === T) out.push({ k: 'defi', titre: `${nomCourt(f.a)} te lance un défi amical`, texte: `${DEFI_INDICATEURS[f.ind].nom.toLowerCase()}${f.mise ? ` · ${f.mise} k€ chacun` : ''} · refuser ne coûte rien`, fait: !!(d.defiReponse && d.defiReponse.id === f.id) });
  for (const x of pactesRecus()) out.push({ k: 'pacte', titre: `${nomCourt(x.de)} te propose un ${PACTES[x.type].nom.toLowerCase()}`, texte: `${PACTES[x.type].court} · si tu acceptes avant 20:00, signé ce soir`, fait: x.reponse !== null });
  for (const x of defisRecus()) out.push({ k: 'defi', titre: `${nomCourt(x.de)} te lance un défi amical`, texte: `${DEFI_INDICATEURS[x.ind].nom.toLowerCase()}${x.mise ? ` · ${x.mise} k€ chacun` : ''} · refuser ne coûte rien`, fait: x.reponse !== null });
  if (st.conseil && st.conseil.tour === T) out.push({ k: 'conseil', titre: 'Conseil de police : vote ce soir', texte: 'une voix par zone, résultat à 20:00', fait: Object.keys(d.votes || {}).length > 0 });
  return out;
}

export function ongletsCarte(actif) {
  const pastille = actif !== 'pactes' && aFairePactes().some((x) => !x.fait);
  const tab = (k, l, p) => `<a role="tab" href="#${k}" aria-selected="${actif === k}" class="segl">${l}${p ? '<span class="pastille" aria-label="à faire"></span>' : ''}</a>`;
  return `<div class="onglets-flottants"><div class="seg3 deux" role="tablist" aria-label="Carte et pactes">${tab('carte', 'Carte', false)}${tab('pactes', 'Pactes', pastille)}</div></div>`;
}

// ───── Carte des pactes ─────
function carteHtml() {
  const st = S.state, me = myZone();
  const liens = (st.pactes || []).map((p) => ({ a: p.a, b: p.b, couleur: { terrain: '#3DD39A', enquete: '#FFB23F', achat: '#63B0FF' }[p.type], pointille: p.etape !== 'actif', moi: p.a === me.uid || p.b === me.uid }));
  const d = S.draft || {};
  if (d.pacte && d.pacte.cible && PACTES[d.pacte.type]) liens.push({ a: me.uid, b: d.pacte.cible, couleur: { terrain: '#3DD39A', enquete: '#FFB23F', achat: '#63B0FF' }[d.pacte.type], pointille: true, moi: true });
  return `<div class="plan-cadre">${planVille(st, me, { zoom: false, chaleur: false, liens })}</div>
    <div class="row tiny muted" style="flex-wrap:wrap;gap:12px">${Object.entries(PACTES).map(([k, v]) => `<span class="row" style="gap:5px"><span style="width:16px;height:0;border-top:3px solid ${TEINTE[k]}"></span>${esc(v.nom)}</span>`).join('')}<span>pointillés : proposé</span></div>`;
}

// ───── Mes pactes ─────
function demiPiece(p) {
  const st = S.state, me = S.user.uid;
  const fr = p.frag;
  const aff = st.enquete && affaire(st, st.enquete.n);
  if (!fr || !aff || fr.n !== st.enquete.n) return '';
  const m = moitiesPiece(aff, fr.f);
  const moi = fr.haut === me ? m.haut : m.bas;
  const donne = !!(fr.donne && fr.donne[me]);
  const lui = !!(fr.donne && fr.donne[partenaire(p, me)]);
  const coche = S.draft && S.draft.fragment === p.id;
  return `<div class="demi-piece ${fr.haut === me ? 'haut' : 'bas'}">
      <span class="tiny" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)">Demi-pièce · ${fr.haut === me ? 'début' : 'fin'}</span>
      <strong style="font-family:var(--serif)">${esc(moi.titre)}</strong>
      <span class="small" style="white-space:pre-line">${esc(moi.texte)}</span>
    </div>
    ${donne ? `<span class="small ok" style="font-weight:700">✓ Ta moitié est sur la table${lui ? '' : `, ${nomCourt(partenaire(p, me))} doit encore donner la sienne`}.</span>`
      : `<button type="button" class="choice" data-action="pacte-frag" data-id="${esc(p.id)}" aria-pressed="${coche}" style="min-height:44px">${coche ? '✓ Mise en commun ce soir' : 'Mettre en commun'}<span class="s">${lui ? 'ton partenaire a déjà donné sa moitié' : 'il faut que vous le fassiez tous les deux'}</span></button>`}`;
}

function mesPactesHtml() {
  const st = S.state, me = S.user.uid, d = S.draft || {};
  const liste = pactesDe(st, me);
  const lignes = liste.map((p) => {
    const lui = partenaire(p, me);
    const v = PACTES[p.type];
    if (p.etape === 'propose') {
      const pourMoi = p.b === me && p.tourReponse === st.turn;
      const r = d.pacteReponse && d.pacteReponse.id === p.id ? d.pacteReponse.accepte : null;
      return `<div class="pacte-ligne">${ico(p.type)}<span class="col grow" style="gap:2px;min-width:0"><strong class="small">${esc(v.nom)} · ${puce(lui)}${nomCourt(lui)}</strong><span class="tiny muted">${pourMoi ? esc(v.texte) : 'proposé, réponse ce soir'}</span></span>${pourMoi ? '' : '<span class="pill amber">en attente</span>'}</div>
        ${pourMoi ? `<div class="choices"><button type="button" class="choice" data-action="pacte-rep" data-id="${esc(p.id)}" data-v="1" aria-pressed="${r === true}">Accepter</button><button type="button" class="choice" data-action="pacte-rep" data-id="${esc(p.id)}" data-v="0" aria-pressed="${r === false}">Refuser</button></div>` : ''}`;
    }
    const reste = toursRestants(st, p);
    const joue = pacteJoue(st, p);
    const rompre = d.pacteRompre === p.id;
    return `<div class="pacte-ligne">${ico(p.type)}<span class="col grow" style="gap:2px;min-width:0"><strong class="small">${esc(v.nom)} · ${puce(lui)}${nomCourt(lui)}</strong><span class="tiny muted">${esc(v.court)}</span></span>
        <span class="col" style="gap:4px;align-items:flex-end;flex-shrink:0"><span class="pill ${joue ? 'green' : 'amber'}">${joue ? 'actif' : 'dès demain'}</span>
        <span class="jours" role="img" aria-label="${reste} tour${reste > 1 ? 's' : ''} restant${reste > 1 ? 's' : ''}">${Array.from({ length: PACTE.duree }, (_, i) => `<i class="${i < reste ? 'f' : ''}"></i>`).join('')}</span></span></div>
      ${p.type === 'enquete' ? demiPiece(p) : ''}
      ${rompre ? `<p class="tiny warn" style="margin:0">Rupture prévue ce soir : annoncée dans la Gazette, pas de nouveau pacte pendant ${PACTE.blocage} tours. <button type="button" class="lien" data-action="pacte-rompre" data-id="${esc(p.id)}">Garder le pacte</button></p>`
        : `<button type="button" class="lien" data-action="pacte-rompre" data-id="${esc(p.id)}" style="align-self:flex-end;color:var(--faint);font-size:12px">Rompre ce pacte</button>`}`;
  });
  const brouillon = d.pacte && d.pacte.cible && st.zones[d.pacte.cible]
    ? `<div class="pacte-ligne">${ico(d.pacte.type)}<span class="col grow" style="gap:2px"><strong class="small">${esc(PACTES[d.pacte.type].nom)} · ${puce(d.pacte.cible)}${nomCourt(d.pacte.cible)}</strong><span class="tiny ${liste.length >= PACTE.max ? 'warn' : 'muted'}">${liste.length >= PACTE.max ? `ne partira pas : tu as déjà ${PACTE.max} pactes` : (() => { const r = reponseA(d.pacte.cible, 'pacteRep', (x) => x.type === d.pacte.type); return r === true ? '<span class="ok">accepté : signé ce soir à 20:00</span>' : r === false ? 'refusé, pas cette fois' : 'proposition envoyée en message ; s’il accepte avant 20:00, signé ce soir (sinon il pourra répondre demain)'; })()}</span></span><button type="button" class="btn small ghost" data-action="pacte-annuler">Annuler</button></div>` : '';
  const max = liste.length + (brouillon ? 1 : 0) >= PACTE.max;
  const bloque = (myZone().pacteBloque || 0) >= (st.season - 1) * 100 + st.turn;
  const recus = pactesRecus().map((x) => `<div class="pacte-ligne">${ico(x.type)}<span class="col grow" style="gap:2px;min-width:0"><strong class="small">${puce(x.de)}${nomCourt(x.de)} te propose : ${esc(PACTES[x.type].nom)}</strong><span class="tiny muted">${esc(PACTES[x.type].texte)}</span></span></div>
      <div class="choices"><button type="button" class="choice" data-action="pacte-accepter" data-de="${esc(x.de)}" data-type="${x.type}" data-v="1" aria-pressed="${x.reponse === true}">${x.reponse === true ? '✓ Accepté' : 'Accepter'}</button><button type="button" class="choice" data-action="pacte-accepter" data-de="${esc(x.de)}" data-type="${x.type}" data-v="0" aria-pressed="${x.reponse === false}">${x.reponse === false ? 'Refusé' : 'Refuser'}</button></div>
      ${x.reponse === true ? '<span class="tiny ok">Signé ce soir à 20:00 (ta réponse lui a été envoyée).</span>' : ''}`).join('<hr class="sep">');
  return `<section class="card" aria-label="Mes pactes"><div class="between"><h2 class="card-title">Mes pactes</h2><span class="tiny muted">${Math.min(PACTE.max, liste.length + (brouillon ? 1 : 0))} sur ${PACTE.max}</span></div>
    ${recus ? `${recus}${lignes.length || brouillon ? '<hr class="sep">' : ''}` : ''}
    ${lignes.length || brouillon || recus ? `${lignes.join('<hr class="sep">')}${brouillon ? `${lignes.length ? '<hr class="sep">' : ''}${brouillon}` : ''}` : '<p class="small muted" style="margin:0">Aucun pacte pour l’instant. Un pacte lie deux zones pendant 7 tours, avec un avantage concret pour les deux.</p>'}
    ${bloque ? `<p class="tiny warn" style="margin:0">Tu as rompu un pacte récemment : pas de nouveau pacte avant quelques tours.</p>` : max ? '' : S.pacteForm ? proposerHtml() : '<button type="button" class="btn primary" data-action="pacte-form">Proposer un pacte</button>'}
  </section>`;
}

function proposerHtml() {
  const st = S.state, me = S.user.uid;
  const f = S.pacteForm || {};
  const zones = autres();
  return `<div class="col pacte-form" style="gap:10px">
    <span class="small" style="font-weight:700">Avec quelle zone ?</span>
    <div class="zchips">${zones.map((z) => { const r = pacteImpossible(st, me, z.uid); return `<button type="button" class="zchip" data-action="pacte-cible" data-v="${esc(z.uid)}" aria-pressed="${f.cible === z.uid}" ${r ? 'disabled' : ''}>${puce(z.uid)}${esc(z.code)} ${esc(z.nom)}${r ? ` · ${esc(r)}` : ''}</button>`; }).join('')}</div>
    <span class="small" style="font-weight:700">Quel pacte ?</span>
    <div class="col" style="gap:6px">${Object.entries(PACTES).map(([k, v]) => `<button type="button" class="choice pacte-choix" data-action="pacte-type" data-v="${k}" aria-pressed="${f.type === k}">${ico(k)}<span class="col" style="gap:2px;text-align:left"><span>${esc(v.nom)}</span><span class="s">${esc(v.texte)}</span></span></button>`).join('')}</div>
    <div class="row" style="gap:8px"><button type="button" class="btn ghost" data-action="pacte-form-fermer">Fermer</button>
      <button type="button" class="btn primary grow" data-action="pacte-proposer" ${f.cible && f.type ? '' : 'disabled'}>${f.cible && st.zones[f.cible] ? `Proposer à ${esc(st.zones[f.cible].nom)}` : 'Proposer'}</button></div>
    <span class="tiny muted">Ta proposition part tout de suite en message privé. Si l’autre zone accepte avant 20:00, le pacte est signé ce soir ; sinon elle pourra répondre demain. ${PACTE.max} pactes au plus, un seul par zone partenaire.</span>
  </div>`;
}

// ───── Défi amical ─────
function defiHtml() {
  const st = S.state, me = S.user.uid, d = S.draft || {};
  const mien = (st.defis || []).find((x) => x.a === me || x.b === me);
  let corps = '';
  const recu = !mien || mien.etape !== 'encours' ? defisRecus()[0] : null;
  if (recu) {
    corps = `<p class="small" style="margin:0"><strong>${nomCourt(recu.de)}</strong> te défie : ${esc(DEFI_INDICATEURS[recu.ind].nom.toLowerCase())} pendant ${DEFI.duree} tours${recu.mise ? `, ${recu.mise} k€ misés chacun` : ', sans mise'}. Si tu acceptes avant 20:00, il démarre ce soir. Refuser ne coûte rien.</p>
      <div class="choices"><button type="button" class="choice" data-action="defi-accepter" data-de="${esc(recu.de)}" data-ind="${recu.ind}" data-mise="${recu.mise}" data-v="1" aria-pressed="${recu.reponse === true}">${recu.reponse === true ? '✓ Défi relevé' : 'Relever le défi'}</button><button type="button" class="choice" data-action="defi-accepter" data-de="${esc(recu.de)}" data-ind="${recu.ind}" data-mise="${recu.mise}" data-v="0" aria-pressed="${recu.reponse === false}">Pas cette fois</button></div>`;
  } else if (mien && mien.etape === 'encours') {
    const lui = mien.a === me ? mien.b : mien.a;
    const mes = DEFI_INDICATEURS[mien.ind].mesure;
    const [bm, bl] = mien.base ? (mien.a === me ? [mien.base.a, mien.base.b] : [mien.base.b, mien.base.a]) : [null, null];
    const sm = bm === null ? 0 : mes(st.zones[me]) - bm, sl = bl === null ? 0 : mes(st.zones[lui]) - bl;
    corps = `<div class="defi-score"><span class="col"><span class="tiny muted">Toi</span><strong>${sm}</strong></span><span class="tiny muted" style="text-align:center">${esc(DEFI_INDICATEURS[mien.ind].nom.toLowerCase())}</span><span class="col"><span class="tiny muted">${nomCourt(lui)}</span><strong>${sl}</strong></span></div>
      <span class="tiny muted" style="text-align:center">Verdict au 20:00 du tour ${mien.fin}${mien.mise ? ` · pot ${mien.mise * 2} k€ + ${DEFI.prime} k€ du district` : ` · ${DEFI.prime} k€ de prime du district`}${bm === null ? ' · le compteur démarre ce soir' : ''}</span>`;
  } else if (mien && mien.etape === 'propose') {
    if (mien.b === me) {
      const r = d.defiReponse && d.defiReponse.id === mien.id ? d.defiReponse.accepte : null;
      corps = `<p class="small" style="margin:0"><strong>${nomCourt(mien.a)}</strong> te défie : ${esc(DEFI_INDICATEURS[mien.ind].nom.toLowerCase())} pendant ${DEFI.duree} tours${mien.mise ? `, ${mien.mise} k€ misés chacun` : ', sans mise'}. Refuser ne coûte rien.</p>
        <div class="choices"><button type="button" class="choice" data-action="defi-rep" data-id="${esc(mien.id)}" data-v="1" aria-pressed="${r === true}">Relever le défi</button><button type="button" class="choice" data-action="defi-rep" data-id="${esc(mien.id)}" data-v="0" aria-pressed="${r === false}">Pas cette fois</button></div>`;
    } else corps = `<p class="small muted" style="margin:0">Défi envoyé à ${nomCourt(mien.b)}, réponse ce soir.</p>`;
  } else if (d.defi && d.defi.cible) {
    corps = `<div class="between"><span class="small">${esc(DEFI_INDICATEURS[d.defi.ind].nom)} contre <strong>${nomCourt(d.defi.cible)}</strong>${d.defi.mise ? `, ${d.defi.mise} k€` : ', sans mise'} · ${(() => { const r = reponseA(d.defi.cible, 'defiRep', (x) => x.ind === d.defi.ind); return r === true ? '<span class="ok">relevé : il démarre ce soir</span>' : r === false ? 'refusé' : 'envoyé, en attente de sa réponse'; })()}</span><button type="button" class="btn small ghost" data-action="defi-annuler">Annuler</button></div>`;
  } else if (S.defiForm) {
    const f = S.defiForm;
    corps = `<div class="zchips">${autres().map((z) => { const r = defiImpossible(st, me, z.uid); return `<button type="button" class="zchip" data-action="defi-cible" data-v="${esc(z.uid)}" aria-pressed="${f.cible === z.uid}" ${r ? 'disabled' : ''}>${puce(z.uid)}${esc(z.code)} ${esc(z.nom)}${r ? ` · ${esc(r)}` : ''}</button>`; }).join('')}</div>
      <div class="zchips">${Object.entries(DEFI_INDICATEURS).map(([k, v]) => `<button type="button" class="zchip" data-action="defi-ind" data-v="${k}" aria-pressed="${f.ind === k}">${esc(v.nom)}</button>`).join('')}</div>
      <div class="between"><span class="small">Mise de chacun</span><div class="zchips">${DEFI.mises.map((m) => `<button type="button" class="zchip" data-action="defi-mise" data-v="${m}" aria-pressed="${(f.mise || 0) === m}" ${m > myZone().budget ? 'disabled' : ''}>${m ? `${m} k€` : 'aucune'}</button>`).join('')}</div></div>
      <div class="row" style="gap:8px"><button type="button" class="btn ghost" data-action="defi-form-fermer">Fermer</button><button type="button" class="btn primary grow" data-action="defi-lancer" ${f.cible && f.ind ? '' : 'disabled'}>Lancer le défi</button></div>`;
  } else {
    corps = `<button type="button" class="btn" data-action="defi-form" ${enDefi(st, me) || enDifficulte(myZone()) ? 'disabled' : ''}>Lancer un défi</button>`;
  }
  return `<section class="card" aria-label="Défi amical"><div class="col" style="gap:2px"><h2 class="card-title">Défi amical</h2>
      <span class="tiny muted">${DEFI.duree} tours sur une activité que tu fais toi-même. Le gagnant prend le pot et ${DEFI.prime} k€ de prime du district.</span></div>${corps}</section>`;
}

// ───── Coup de main (seulement quand une zone est en difficulté) ─────
function coupDeMainHtml() {
  const d = S.draft || {};
  const enDiff = autres().filter((z) => enDifficulte(z));
  if (!enDiff.length) return '';
  const a = d.aide || { cible: '', budget: 0, agents: 0 };
  const statut = (z) => (z.tutelle ? `sous tutelle · faillite au tour ${z.tutelle.fin} si elle ne se redresse pas` : `en péril · ${(z.peril.raisons || []).join(', ') || 'zone en difficulté'}`);
  return `<section class="card" aria-label="Coup de main" style="border-color:var(--red-line)"><div class="col" style="gap:2px"><h2 class="card-title">Coup de main</h2>
      <span class="tiny muted">Envoie du budget (reçu ce soir) ou prête des agents pour ${AIDE.dureePret} tours à une zone en difficulté. Jusqu’à +${gainEntraide(5, AIDE.budgetMax, AIDE.agentsMax)} de réputation.</span></div>
    <div class="col" style="gap:6px">${enDiff.map((z) => `<button type="button" class="choice" data-action="aide-cible" data-v="${esc(z.uid)}" aria-pressed="${a.cible === z.uid}" style="text-align:left;align-items:flex-start;min-height:0;padding:8px 10px"><span>${puce(z.uid)}${zoneName(z)}</span><span class="s bad">${esc(statut(z))}</span></button>`).join('')}</div>
    ${a.cible ? `<div class="between"><span class="small">Budget envoyé</span><span class="stepper"><button type="button" data-action="aide-n" data-k="budget" data-d="-1" aria-label="1 k€ de moins">−</button><span class="n">${a.budget} k€</span><button type="button" data-action="aide-n" data-k="budget" data-d="1" aria-label="1 k€ de plus">+</button></span></div>
      <div class="between"><span class="small">Agents prêtés</span><span class="stepper"><button type="button" data-action="aide-n" data-k="agents" data-d="-1" aria-label="Un agent de moins">−</button><span class="n">${a.agents}</span><button type="button" data-action="aide-n" data-k="agents" data-d="1" aria-label="Un agent de plus">+</button></span></div>
      <p class="tiny muted" style="margin:0">Maximum ${AIDE.budgetMax} k€ et ${AIDE.agentsMax} agents ; tu gardes toujours au moins 8 agents. Réputation prévue : <strong>+${gainEntraide(5, a.budget, a.agents)}</strong></p>` : ''}
  </section>`;
}

// ───── Conseil de police ─────
function conseilHtml() {
  const st = S.state, d = S.draft || {}, z = myZone();
  const c = st.conseil;
  const theme = themeActif(st);
  let html = '';
  if (c && c.tour === st.turn) {
    html += `<section class="card amber" aria-label="Conseil de police"><span class="kicker">Conseil de police · vote ce soir à 20:00</span>
      <p class="tiny" style="margin:0;color:var(--amber-soft)">Une voix par zone, vote secret. En cas d’égalité, la première option l’emporte.</p>
      ${c.motions.map((m) => `<div class="col" style="gap:6px"><span style="font-weight:700" class="small">${esc(m.titre)}</span>${m.texte ? `<span class="tiny muted">${esc(m.texte)}</span>` : ''}
        <div class="col" style="gap:6px">${m.options.map((o, i) => `<button type="button" class="choice" data-action="vote" data-m="${m.id}" data-i="${i}" aria-pressed="${d.votes && d.votes[m.id] === i}" style="text-align:left;align-items:flex-start;min-height:42px">${esc(o)}</button>`).join('')}</div></div>`).join('')}
    </section>`;
  } else {
    html += `<section class="card tight"><span class="kicker">Conseil de police</span><span class="small muted">Il se réunit chaque dimanche : dotation, fonds de solidarité si une zone est en difficulté, blâme éventuel.${theme ? ` Thème en cours : ${esc(THEMES[theme.id].nom)} (${esc(THEMES[theme.id].effet)}).` : ''} Les crises du district, elles, sont votées par le Conseil des chefs sur l’HP, environ tous les 5 jours.</span></section>`;
  }
  if (gradeFor(z.ps).nom === 'Chef de corps' && !z.motionSaison) {
    html += `<section class="card"><span class="kicker">Privilège de Chef de corps</span><span class="small">Propose une motion au prochain Conseil (une fois par saison).</span>
      <div class="col" style="gap:6px">${Object.entries(MOTIONS_CHEF).map(([k, m]) => `<button type="button" class="choice" data-action="motion-chef" data-v="${k}" aria-pressed="${d.motionChef === k}" style="text-align:left;align-items:flex-start">${esc(m.titre)}<span class="s">${esc(m.texte)}</span></button>`).join('')}</div></section>`;
  }
  return html;
}

export function renderPactes() {
  const rem = myZone().remiseAchat;
  const conseil = conseilHtml();
  const voteCeSoir = !!(S.state.conseil && S.state.conseil.tour === S.state.turn);
  return `<main class="screen">
    ${reglesV2(S.state) ? '<a class="retour-carte small" href="#carte" data-action="carte-calque" data-v="district">‹ District</a>' : ongletsCarte('pactes')}
    <header class="col" style="gap:3px"><h1 class="big">Pactes</h1>
      <p class="sub">Des accords à deux pendant ${PACTE.duree} tours, avec un avantage concret pour chacun. Accepté avant 20:00, signé le soir même.</p></header>
    ${rem ? `<p class="tiny ok" style="margin:0">Centrale d’achat : formations et équipement −${Math.round(rem * 100)} % aujourd’hui.</p>` : ''}
    ${voteCeSoir ? conseil : ''}
    ${mesPactesHtml()}
    <details class="card repli" data-k="pactes-carte" ${S.ouverts && S.ouverts['pactes-carte'] ? 'open' : ''}>
      <summary><span style="color:var(--amber)">${icon('carte', 18)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Les pactes sur la carte</span><span class="tiny muted">qui est lié à qui dans le district</span></span>${icon('chevron', 16)}</summary>
      <div class="col" style="gap:8px">${carteHtml()}</div></details>
    ${coupDeMainHtml()}
    ${defiHtml()}
    ${voteCeSoir ? '' : conseil}
    <a class="small" href="#guide-pactes" style="text-align:center">Règles des pactes, des défis et du Conseil</a>
  </main>${tabbar('carte')}`;
}

