// Écran Diplomatie : Conseil de police, duels, entraide, manœuvres.
import { S, esc, icon, tabbar, myZone, zoneName, fmt1 } from './common.js';
import { gradeFor } from '../engine/constants.js';
import { nonLus, invitations } from './prive.js';
import {
  MANOEUVRES, MAN, chanceBase, cibleImpossible, DUEL, DUEL_INDICATEURS, enDuel, AIDE, MOTIONS_CHEF, themeActif, THEMES,
} from '../engine/rivalites.js';

function autres() {
  return Object.values(S.state.zones).filter((z) => z.uid !== S.user.uid).sort((a, b) => a.code.localeCompare(b.code));
}

function conseilHtml() {
  const st = S.state, d = S.draft, z = myZone();
  const c = st.conseil;
  const theme = themeActif(st);
  let html = '';
  if (c && c.tour === st.turn) {
    html += `<section class="card amber" aria-label="Conseil de police"><span class="kicker">Conseil de police · vote ce soir à 20:00</span>
      <p class="small" style="margin:0;color:var(--amber-soft)">Une voix par zone, vote secret. En cas d’égalité, la première option l’emporte.</p>
      ${c.motions.map((m) => `<div class="col" style="gap:6px"><span style="font-weight:700">${esc(m.titre)}</span>${m.texte ? `<span class="small muted">${esc(m.texte)}</span>` : ''}
        <div class="col" style="gap:6px">${m.options.map((o, i) => `<button type="button" class="choice" data-action="vote" data-m="${m.id}" data-i="${i}" aria-pressed="${d.votes && d.votes[m.id] === i}" style="text-align:left;align-items:flex-start">${esc(o)}</button>`).join('')}</div></div>`).join('')}
    </section>`;
  } else {
    html += `<section class="card tight"><span class="kicker">Conseil de police</span><span class="small muted">Il se réunit chaque dimanche : dotation, thème de la semaine, blâme éventuel.${theme ? ` Thème en cours : ${esc(THEMES[theme.id].nom)} (${esc(THEMES[theme.id].effet)}).` : ''}</span></section>`;
  }
  if (gradeFor(z.ps).nom === 'Chef de corps' && !z.motionSaison) {
    html += `<section class="card"><span class="kicker">Privilège de Chef de corps</span><span class="small">Propose une motion au prochain Conseil (une fois par saison).</span>
      <div class="col" style="gap:6px">${Object.entries(MOTIONS_CHEF).map(([k, m]) => `<button type="button" class="choice" data-action="motion-chef" data-v="${k}" aria-pressed="${d.motionChef === k}" style="text-align:left;align-items:flex-start">${esc(m.titre)}<span class="s">${esc(m.texte)}</span></button>`).join('')}</div></section>`;
  }
  return html;
}

function duelsHtml() {
  const st = S.state, d = S.draft, me = S.user.uid;
  const mien = (st.duels || []).find((x) => x.a === me || x.b === me);
  let html = '<section class="card" aria-label="Duels"><h2 class="card-title" style="margin:0">Duels</h2>';
  if (mien) {
    const autre = st.zones[mien.a === me ? mien.b : mien.a];
    if (mien.etape === 'propose' && mien.b === me && mien.tourReponse === st.turn) {
      const r = d.duelReponse && d.duelReponse.id === mien.id ? d.duelReponse.accepte : null;
      html += `<p class="small" style="margin:0"><strong>${zoneName(autre)}</strong> te défie : ${esc(DUEL_INDICATEURS[mien.ind].nom.toLowerCase())} pendant ${DUEL.duree} tours. Enjeu : ${DUEL.enjeu} points de réputation. Un refus est publié dans la Gazette.</p>
        <div class="choices"><button type="button" class="choice" data-action="duel-rep" data-id="${mien.id}" data-v="1" aria-pressed="${r === true}">Relever le défi</button>
        <button type="button" class="choice" data-action="duel-rep" data-id="${mien.id}" data-v="0" aria-pressed="${r === false}">Refuser</button></div>`;
    } else if (mien.etape === 'propose') {
      html += `<p class="small muted" style="margin:0">Défi envoyé à ${zoneName(autre)}, réponse attendue.</p>`;
    } else {
      const mes = DUEL_INDICATEURS[mien.ind].mesure;
      const moi = st.zones[me];
      const gMoi = mien.base ? fmt1(mes(moi) - (mien.a === me ? mien.base.a : mien.base.b)) : '0';
      const gLui = mien.base ? fmt1(mes(autre) - (mien.a === me ? mien.base.b : mien.base.a)) : '0';
      html += `<p class="small" style="margin:0">Duel en cours contre <strong>${zoneName(autre)}</strong> : ${esc(DUEL_INDICATEURS[mien.ind].nom.toLowerCase())}. Fin au tour ${mien.fin}.</p>
        <div class="tiles"><div class="tile"><span class="l">Toi</span><span class="v">${gMoi}</span></div><div class="tile"><span class="l">${esc(autre.nom)}</span><span class="v">${gLui}</span></div></div>`;
    }
  } else {
    const dd = d.duel || { cible: '', ind: 'satisfaction' };
    html += `<p class="small muted" style="margin:0">Défie une zone pendant ${DUEL.duree} tours. Le gagnant prend ${DUEL.enjeu} points de réputation au perdant. Un seul duel à la fois.</p>
      <label class="field">Zone défiée<select class="text" data-change="duel-cible" style="min-height:44px;font-size:14px"><option value="">Aucun duel</option>
        ${autres().map((z) => { const r = cibleImpossible(S.state, z) || (enDuel(S.state, z.uid) ? 'déjà en duel' : ''); return `<option value="${esc(z.uid)}" ${dd.cible === z.uid ? 'selected' : ''} ${r ? 'disabled' : ''}>${zoneName(z)}${r ? ` (${esc(r.toLowerCase())})` : ''}</option>`; }).join('')}</select></label>
      ${dd.cible ? `<div class="seg">${Object.entries(DUEL_INDICATEURS).map(([k, v]) => `<button type="button" data-action="duel-ind" data-v="${k}" aria-pressed="${dd.ind === k}"><span class="t">${esc(v.nom)}</span></button>`).join('')}</div>` : ''}`;
  }
  return `${html}</section>`;
}

function aideHtml() {
  const d = S.draft;
  const a = d.aide || { cible: '', budget: 0, agents: 0 };
  const perils = autres().filter((z) => z.peril);
  return `<section class="card" aria-label="Entraide"><h2 class="card-title" style="margin:0">Entraide</h2>
    <p class="small muted" style="margin:0">Envoie du budget (immédiat) ou prête des agents pour ${AIDE.dureePret} tours. Aider une zone en péril rapporte +5 de réputation, une zone frappée par un coup dur +3.</p>
    ${perils.length ? `<p class="small bad" style="margin:0">En péril : ${perils.map((z) => zoneName(z)).join(', ')}.</p>` : ''}
    <label class="field">Zone aidée<select class="text" data-change="aide-cible" style="min-height:44px;font-size:14px"><option value="">Personne</option>
      ${autres().map((z) => `<option value="${esc(z.uid)}" ${a.cible === z.uid ? 'selected' : ''}>${zoneName(z)}${z.peril ? ' · en péril' : ''}</option>`).join('')}</select></label>
    ${a.cible ? `<div class="between"><span class="small">Budget envoyé</span><span class="stepper"><button type="button" data-action="aide-n" data-k="budget" data-d="-1" aria-label="1 k€ de moins">−</button><span class="n">${a.budget} k€</span><button type="button" data-action="aide-n" data-k="budget" data-d="1" aria-label="1 k€ de plus">+</button></span></div>
      <div class="between"><span class="small">Agents prêtés</span><span class="stepper"><button type="button" data-action="aide-n" data-k="agents" data-d="-1" aria-label="Un agent de moins">−</button><span class="n">${a.agents}</span><button type="button" data-action="aide-n" data-k="agents" data-d="1" aria-label="Un agent de plus">+</button></span></div>
      <p class="tiny muted" style="margin:0">Maximum ${AIDE.budgetMax} k€ et ${AIDE.agentsMax} agents ; tu gardes toujours au moins 8 agents.</p>` : ''}
  </section>`;
}

function manoeuvreHtml() {
  const st = S.state, d = S.draft, z = myZone();
  const m = d.manoeuvre || { type: '', cible: '' };
  const chance = Math.round(chanceBase(st, z) * 100);
  return `<section class="card" aria-label="Manœuvres"><h2 class="card-title" style="margin:0">Manœuvres</h2>
    <p class="small muted" style="margin:0">Une manœuvre par tour. Réussie ou non, elle coûte ${MAN.coutReputation} de réputation et la Gazette révèle ton nom le lendemain. Chance de la prochaine : <strong class="warn">${chance} %</strong> avant les parades de la cible (elle baisse à chaque manœuvre des 7 derniers tours).</p>
    <div class="col" style="gap:6px">${Object.entries(MANOEUVRES).map(([k, v]) => `<button type="button" class="choice" data-action="man-type" data-v="${k}" aria-pressed="${m.type === k}" style="text-align:left;align-items:flex-start">${esc(v.nom)}<span class="s">${esc(v.texte)} Parade : ${esc(v.parade.charAt(0).toLowerCase() + v.parade.slice(1))}</span></button>`).join('')}</div>
    ${m.type ? `<label class="field">Zone visée<select class="text" data-change="man-cible" style="min-height:44px;font-size:14px"><option value="">Choisir…</option>
      ${autres().map((c) => { const r = cibleImpossible(st, c); return `<option value="${esc(c.uid)}" ${m.cible === c.uid ? 'selected' : ''} ${r ? 'disabled' : ''}>${zoneName(c)}${r ? ` (${esc(r.split(' :')[0].toLowerCase())})` : ''}</option>`; }).join('')}</select></label>
      <button class="btn small ghost" data-action="man-annuler">Pas de manœuvre ce tour</button>` : ''}
  </section>`;
}

export function ongletsRadio(actif) {
  const n = nonLus();
  const diploAFaire = invitations().some((i) => i.href === '#diplomatie');
  const priveAFaire = n.prive > 0 || invitations().some((i) => !i.fait);
  const tab = (k, l, pastille) => `<a role="tab" href="#${k}" aria-selected="${actif === k}" class="segl">${l}${actif !== k && pastille ? '<span class="pastille" aria-label="nouveau"></span>' : ''}</a>`;
  return `<div class="onglets-flottants"><div class="seg3" role="tablist" aria-label="Radio, messages privés et diplomatie">
    ${tab('radio', 'Radio', n.radio > 0)}${tab('prive', 'Privé', priveAFaire)}${tab('diplomatie', 'Diplomatie', diploAFaire)}</div></div>`;
}

/** Section repliée tant que le joueur ne l'ouvre pas (sauf si elle demande une action). */
function repli(key, titre, resume, html, ouvertParDefaut) {
  const o = S.diploOpen && key in S.diploOpen ? S.diploOpen[key] : ouvertParDefaut;
  if (o) return html.replace('<section class="card"', `<section class="card" data-k="${key}"`).replace(/(<h2 class="card-title"[^>]*>)([^<]*)(<\/h2>)/, `$1$2$3<button type="button" class="btn small ghost" data-action="diplo-open" data-k="${key}" style="position:absolute;right:10px;top:8px">Replier</button>`);
  return `<button type="button" class="list-row" data-action="diplo-open" data-k="${key}" style="width:100%;text-align:left"><span class="col grow" style="gap:1px"><span style="font-weight:600">${titre}</span><span class="small muted">${resume}</span></span>${icon('chevron', 18)}</button>`;
}

export function renderDiplomatie() {
  const st = S.state, d = S.draft, me = S.user.uid;
  const mien = (st.duels || []).find((x) => x.a === me || x.b === me);
  const duelAction = !!(mien && mien.etape === 'propose' && mien.b === me && mien.tourReponse === st.turn);
  const perils = Object.values(st.zones).filter((z) => z.peril && z.uid !== me).length;
  return `<main class="screen">
    ${ongletsRadio('diplomatie')}
    <header class="col" style="gap:3px"><h1 class="big">Diplomatie</h1>
      <p class="sub">Conseil, duels, entraide et manœuvres : tout part avec tes ordres et se résout à 20:00.</p></header>
    ${conseilHtml()}
    ${repli('duel', 'Duels', mien ? (duelAction ? '<strong class="warn">Un défi attend ta réponse</strong>' : 'Un duel en cours') : d.duel ? 'Défi prêt à partir ce soir' : 'Défier une zone pendant 5 tours', duelsHtml(), duelAction)}
    ${repli('aide', 'Entraide', perils ? `<strong class="bad">${perils} zone${perils > 1 ? 's' : ''} en péril</strong>` : d.aide && d.aide.cible ? 'Aide prévue ce soir' : 'Envoyer du budget ou prêter des agents', aideHtml(), false)}
    ${repli('man', 'Manœuvres', d.manoeuvre && d.manoeuvre.type ? 'Manœuvre prévue ce soir' : 'Gêner une autre zone, à tes risques', manoeuvreHtml(), false)}
    <a class="small" href="#guide-diplomatie" style="text-align:center">Règles de la diplomatie et des manœuvres</a>
  </main>${tabbar('radio')}`;
}
