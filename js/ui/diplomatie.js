// Écran Diplomatie : Conseil de police, duels, entraide, manœuvres.
import { S, esc, icon, tabbar, myZone, zoneName, fmt1 } from './common.js';
import { gradeFor, REPUTATION } from '../engine/constants.js';
import { sousTutelle } from '../engine/zone.js';
import { nonLus, invitations } from './prive.js';
import {
  MANOEUVRES, MAN, chanceBase, cibleImpossible, DUEL, DUEL_INDICATEURS, enDuel, AIDE, gainEntraide, MOTIONS_CHEF, themeActif, THEMES,
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
  } else if (sousTutelle(st.zones[me], st.turn)) {
    html += '<p class="small warn" style="margin:0">Ta zone est sous tutelle : pas de nouveau duel pour l’instant.</p>';
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
  const T = S.state.turn;
  const statut = (z) => {
    if (z.tutelle) return { cls: 'bad', t: 'sous tutelle', d: `${(z.tutelle.raisons || []).join(', ') || 'zone en redressement'} · faillite au tour ${z.tutelle.fin} si elle est encore en péril`, bonus: 5 };
    if (z.peril) return { cls: 'bad', t: 'en péril', d: `${(z.peril.raisons || []).join(', ') || 'zone en difficulté'} · ${z.tutelleSaison ? 'faillite' : 'tutelle'} au tour ${z.peril.fin} sans redressement`, bonus: 5 };
    const bl = (z.blesses || []).filter((b) => b.retour > T && b.motif !== 'prêté').reduce((s, b) => s + b.n, 0);
    const cd = z.dernierCoupDur && T - z.dernierCoupDur.tour <= 2 ? z.dernierCoupDur : null;
    if (bl || cd) return { cls: 'warn', t: 'coup dur', d: [cd ? `${cd.titre.toLowerCase()} au tour ${cd.tour}` : '', bl ? `${bl} blessé${bl > 1 ? 's' : ''} ou absent${bl > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · '), bonus: bl ? 3 : 1 };
    if (z.budget < 0) return { cls: 'warn', t: 'budget négatif', d: `${fmt1(z.budget)} k€`, bonus: 1 };
    return null;
  };
  const enDiff = autres().map((z) => ({ z, s: statut(z) })).filter((x) => x.s);
  return `<section class="card" aria-label="Entraide"><h2 class="card-title" style="margin:0">Entraide</h2>
    <p class="small muted" style="margin:0">Envoie du budget (immédiat) ou prête des agents pour ${AIDE.dureePret} tours. Réputation gagnée : jusqu’à +5 pour une zone en péril ou sous tutelle, +3 pour une zone qui a des blessés après un coup dur, +1 sinon. Le plein est atteint avec 3 agents ou 7,5 k€ (1 agent vaut 2,5 k€), et une aide plus large rapporte jusqu’à 40 % de plus ; une petite aide rapporte moins.</p>
    <div class="col" style="gap:4px"><span class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.6px">Zones en difficulté</span>
      ${enDiff.length ? enDiff.map(({ z, s }) => `<div class="between small" style="gap:8px"><span>${zoneName(z)} <span class="${s.cls}" style="font-weight:700">· ${s.t}</span><br><span class="tiny muted">${esc(s.d)}</span></span><span class="pill ${s.cls === 'bad' ? 'red' : 'amber'}">jusqu’à +${gainEntraide(s.bonus, AIDE.budgetMax, AIDE.agentsMax)} rép.</span></div>`).join('') : '<span class="small muted">Aucune pour l’instant. Une zone passe « en péril » quand son budget tombe sous −15 k€, qu’il lui reste moins de 8 agents disponibles ou que son moral passe sous 10.</span>'}
    </div>
    <label class="field">Zone aidée<select class="text" data-change="aide-cible" style="min-height:44px;font-size:14px"><option value="">Personne</option>
      ${autres().map((z) => `<option value="${esc(z.uid)}" ${a.cible === z.uid ? 'selected' : ''}>${zoneName(z)}${statut(z) ? ` · ${statut(z).t}` : ''}</option>`).join('')}</select></label>
    ${a.cible ? `<div class="between"><span class="small">Budget envoyé</span><span class="stepper"><button type="button" data-action="aide-n" data-k="budget" data-d="-1" aria-label="1 k€ de moins">−</button><span class="n">${a.budget} k€</span><button type="button" data-action="aide-n" data-k="budget" data-d="1" aria-label="1 k€ de plus">+</button></span></div>
      <div class="between"><span class="small">Agents prêtés</span><span class="stepper"><button type="button" data-action="aide-n" data-k="agents" data-d="-1" aria-label="Un agent de moins">−</button><span class="n">${a.agents}</span><button type="button" data-action="aide-n" data-k="agents" data-d="1" aria-label="Un agent de plus">+</button></span></div>
      <p class="tiny muted" style="margin:0">Maximum ${AIDE.budgetMax} k€ et ${AIDE.agentsMax} agents ; tu gardes toujours au moins 8 agents.</p>
      <p class="small" style="margin:0">Réputation prévue : <strong>+${gainEntraide(statut(S.state.zones[a.cible])?.bonus || 1, a.budget, a.agents)}</strong></p>` : ''}
  </section>`;
}

function manoeuvreHtml() {
  const st = S.state, d = S.draft, z = myZone();
  const m = d.manoeuvre || { type: '', cible: '' };
  if (sousTutelle(z, st.turn)) return `<section class="card" aria-label="Manœuvres"><h2 class="card-title" style="margin:0">Manœuvres</h2><p class="small warn" style="margin:0">Ta zone est sous tutelle : pas de manœuvre ni de duel jusqu’au tour ${z.tutelle.fin}.</p></section>`;
  const chance = Math.round(chanceBase(st, z) * 100);
  return `<section class="card" aria-label="Manœuvres"><h2 class="card-title" style="margin:0">Manœuvres</h2>
    <p class="small muted" style="margin:0">Une manœuvre par tour. Réussie ou non, elle coûte ${MAN.coutReputation} de réputation et la Gazette révèle ton nom le lendemain. Chance de la prochaine : <strong class="warn">${chance} %</strong> avant les parades de la cible (elle baisse à chaque manœuvre des 7 derniers tours).</p>
    <div class="man-regles"><strong>Comment ça se passe.</strong> Tout est secret jusqu’à 20:00 : la cible ne voit rien venir et ne peut pas réagir sur le moment. Sa défense, c’est l’état de sa zone ce soir-là (moral, dossiers, paperasse, Proximité). Juste après 20:00, elle lit dans son rapport qu’une zone l’a visée et si ça a marché, sans savoir laquelle ; la Gazette du lendemain soir révèle ton nom. Elle peut alors riposter (duel, manœuvre) ou te le faire payer au Conseil (blâme). Les zones en péril ou sous tutelle et les nouvelles zones sont intouchables. Une manœuvre ratée par une zone de réputation supérieure à ${REPUTATION.scandale} fait scandale : −${REPUTATION.scandaleMalus} de réputation en plus.</div>
    <div class="col" style="gap:6px">${Object.entries(MANOEUVRES).map(([k, v]) => `<button type="button" class="choice" data-action="man-type" data-v="${k}" aria-pressed="${m.type === k}" style="text-align:left;align-items:flex-start">${esc(v.nom)}<span class="s">${esc(v.texte)}</span>
      ${m.type === k ? `<span class="s"><strong>Tu gagnes :</strong> ${esc(v.gain)}.</span><span class="s"><strong>La cible :</strong> ${esc(v.cible)}.</span><span class="s"><strong>Elle se protège par :</strong> ${esc(v.defense)}</span>` : `<span class="s">Parade : ${esc(v.parade.charAt(0).toLowerCase() + v.parade.slice(1))}</span>`}</button>`).join('')}</div>
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
  if (o) return html.replace('<section class="card"', `<section class="card" data-k="${key}"`).replace(/(<h2 class="card-title"[^>]*>)([^<]*)(<\/h2>)/, `<div class="between" style="gap:8px">$1$2$3<button type="button" class="btn small ghost" data-action="diplo-open" data-k="${key}" style="flex-shrink:0">Replier</button></div>`);
  return `<button type="button" class="list-row" data-action="diplo-open" data-k="${key}" style="width:100%;text-align:left"><span class="col grow" style="gap:1px"><span style="font-weight:600">${titre}</span><span class="small muted">${resume}</span></span>${icon('chevron', 18)}</button>`;
}

export function renderDiplomatie() {
  const st = S.state, d = S.draft, me = S.user.uid;
  const mien = (st.duels || []).find((x) => x.a === me || x.b === me);
  const duelAction = !!(mien && mien.etape === 'propose' && mien.b === me && mien.tourReponse === st.turn);
  const perils = Object.values(st.zones).filter((z) => (z.peril || z.tutelle) && z.uid !== me).length;
  return `<main class="screen">
    ${ongletsRadio('diplomatie')}
    <header class="col" style="gap:3px"><h1 class="big">Diplomatie</h1>
      <p class="sub">Conseil, duels, entraide et manœuvres : tout part avec tes ordres et se résout à 20:00.</p></header>
    ${conseilHtml()}
    ${repli('duel', 'Duels', mien ? (duelAction ? '<strong class="warn">Un défi attend ta réponse</strong>' : 'Un duel en cours') : d.duel ? 'Défi prêt à partir ce soir' : 'Défier une zone pendant 5 tours', duelsHtml(), duelAction)}
    ${repli('aide', 'Entraide', perils ? `<strong class="bad">${perils} zone${perils > 1 ? 's' : ''} en difficulté</strong>` : d.aide && d.aide.cible ? 'Aide prévue ce soir' : 'Envoyer du budget ou prêter des agents', aideHtml(), false)}
    ${repli('man', 'Manœuvres', d.manoeuvre && d.manoeuvre.type ? 'Manœuvre prévue ce soir' : 'Gêner une autre zone, à tes risques', manoeuvreHtml(), false)}
    <a class="small" href="#guide-diplomatie" style="text-align:center">Règles de la diplomatie et des manœuvres</a>
  </main>${tabbar('radio')}`;
}
