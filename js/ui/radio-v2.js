// Radio Delta — saison 2.
// F1 « Discussion » : une messagerie (bulles, portraits, séries regroupées).
// F2 « Renforts & ops » : un tableau des appels de ce soir (cases à remplir, comme dans les Ordres),
// les échanges de la fréquence repliés en dessous.
import { S, esc, icon, tabbar, myZone } from './common.js';
import { portraitChef } from './chef.js';
import { marquerRadioLue, canalRadio, nonLus, invitations } from './prive.js';
import { appelsRenfort, monAppel } from './renfort.js';
import { annoncesND, suggestionND, placeND, prevoirRejoindre } from './nondroit.js';
import { nomSecteur } from '../engine/nondroit.js';
import { operationActive } from '../engine/zone.js';
import { secteurOuvert, ND, RENFORT, gainRenfort } from '../engine/constants.js';
import { formatCountdown } from '../engine/time.js';

const pseudoDe = (uid) => (S.players && S.players[uid] && S.players[uid].pseudo) || '';
const hm = (at) => new Date(at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
const euros = (n) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
const pl = (n, s = 's') => (n > 1 ? s : '');

function jourDe(at) {
  const d = new Date(at), auj = new Date();
  const j0 = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate()).getTime();
  const j = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (j === j0) return 'Aujourd’hui';
  if (j === j0 - 864e5) return 'Hier';
  return d.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function zoneDe(uid) {
  const z = S.state.zones[uid] || (S.players && S.players[uid]);
  return z ? { nom: z.nom, code: z.code, couleur: z.couleur || '#9FB0C0', chef: !!(S.state.zones[uid] && S.state.zones[uid].chef) } : { nom: 'Ancienne zone', code: '', couleur: '#9FB0C0', chef: false };
}

function avatar(uid, w, taille = 32) {
  if (w.chef) return `<span class="rv-av">${portraitChef(uid, taille, { galons: false })}</span>`;
  const ini = (pseudoDe(uid) || w.nom || '?').trim().charAt(0).toUpperCase();
  return `<span class="rv-av rv-ini" style="--zc:${esc(w.couleur)};width:${taille}px;height:${taille}px">${esc(ini)}</span>`;
}

/** Renforts promis par les autres zones (annoncés automatiquement à la validation de leurs ordres). */
export function promesRenfort(cible) {
  const st = S.state, me = myZone(), der = {};
  for (const m of S.radio || []) {
    const r = m.renfortRep;
    if (!r || r.season !== st.season || r.turn !== st.turn || (me && m.uid === me.uid) || !st.zones[m.uid]) continue;
    if (!der[m.uid] || der[m.uid].at < m.at) der[m.uid] = { uid: m.uid, cible: r.cible, n: r.agents || 0, at: m.at };
  }
  return Object.values(der).filter((x) => x.cible === cible && x.n > 0).sort((a, b) => a.at - b.at);
}

function cases(demande, promis, moi) {
  const out = [];
  for (const p of promis) {
    const w = zoneDe(p.uid);
    for (let i = 0; i < p.n; i++) out.push(`<span class="rv-case pleine" style="--zc:${esc(w.couleur)}" title="${esc(w.nom)}">${esc(w.code)}</span>`);
  }
  for (let i = 0; i < moi; i++) out.push('<span class="rv-case toi">toi</span>');
  const reste = Math.max(0, demande - out.length);
  for (let i = 0; i < reste; i++) out.push(`<span class="rv-case vide">${i === 0 && !moi ? 'toi ?' : 'libre'}</span>`);
  return `<div class="rv-cases">${out.join('')}</div>`;
}

function tuileRenfort(a) {
  const st = S.state, d = S.draft || {};
  const w = zoneDe(a.uid);
  const promis = promesRenfort(a.uid);
  const autres = promis.reduce((s, p) => s + p.n, 0);
  const moi = d.renfort && d.renfort.cible === a.uid ? d.renfort.agents : 0;
  if (autres >= a.agents && !moi) {
    return `<div class="rv-complet">${icon('check', 14)}<span>« ${esc(a.op.titre)} » · ${esc(w.nom)} · complet (${autres}/${a.agents})</span></div>`;
  }
  const libres = Math.max(0, a.agents - autres - moi);
  const ailleurs = d.renfort && d.renfort.cible !== a.uid && d.renfort.agents > 0 ? st.zones[d.renfort.cible] : null;
  const g = gainRenfort(moi);
  const info = moi
    ? `<span class="ok" style="font-weight:600">Tu prêtes ${moi} agent${pl(moi)}</span> · +${g.rep} réputation, +${g.ps} PS d’entraide, ${euros(moi * RENFORT.indemnite * 1000)} · pense à valider tes ordres`
    : `Par agent prêté : +${RENFORT.repParAgent} réputation, +${RENFORT.psParAgent} PS d’entraide, ${euros(RENFORT.indemnite * 1000)} d’indemnité${ailleurs ? ` · remplace ton renfort pour ${esc(ailleurs.nom)}` : ''}`;
  return `<article class="rv-appel">
    <div class="rv-a-tete"><span class="rv-ico rouge">${icon('shield', 20)}</span>
      <div class="col grow" style="gap:1px;min-width:0"><span class="rv-a-t">${esc(a.op.titre)}</span>
        <span class="small muted"><b style="color:${esc(w.couleur)}">${esc(w.nom)}</b> · ${a.district ? 'appel du district, renfort payé ×1,5' : `demande ${a.agents} agent${pl(a.agents)}`}</span></div></div>
    ${cases(a.agents, promis, moi)}
    <div class="rv-a-pied"><span class="small">${libres ? `${libres} place${pl(libres)} libre${pl(libres)}` : 'Toutes les places sont prises'}</span>
      <span class="stepper"><button type="button" data-action="renfort-n" data-uid="${esc(a.uid)}" data-d="-1" aria-label="Un agent de moins" ${moi <= 0 ? 'disabled' : ''}>−</button><span class="n">${moi}</span><button type="button" data-action="renfort-n" data-uid="${esc(a.uid)}" data-d="1" aria-label="Un agent de plus" ${moi >= RENFORT.maxParZone ? 'disabled' : ''}>+</button></span></div>
    <span class="tiny muted">${info}</span>
  </article>`;
}

function tuileMonAppel(m) {
  const st = S.state, z = myZone(), op = operationActive(z, st.turn);
  if (!op) return '';
  const promis = promesRenfort(z.uid), n = promis.reduce((s, p) => s + p.n, 0);
  return `<article class="rv-appel mien">
    <div class="rv-a-tete"><span class="rv-ico ambre">${icon('radio', 20)}</span>
      <div class="col grow" style="gap:1px;min-width:0"><span class="rv-a-t">Ton appel · ${esc(op.titre)}</span>
        <span class="small muted">${n ? `${n} agent${pl(n)} promis sur ${m.renfort.agents}` : 'Personne n’a encore répondu'} · ils arrivent à 20:00</span></div></div>
    ${cases(m.renfort.agents, promis, 0).replace(/toi \?/g, 'libre')}
  </article>`;
}

function tuileND(k, l) {
  const st = S.state, s = st.nonDroit.secteurs[k];
  const d = S.draft || {};
  const mien = (d.secteurs && d.secteurs[k]) || 0;
  const place = placeND(k), sug = suggestionND(k);
  const choisi = Math.max(1, Math.min(place, (S.ndRejoindre && S.ndRejoindre[k]) || sug));
  const qui = l.filter((x) => !x.moi).map((x) => `${esc(st.zones[x.uid].nom)} (${x.n})`).join(', ');
  const em = Math.round(s.emprise);
  const p = !mien && place ? prevoirRejoindre(k, choisi) : null;
  const apres = p ? Math.max(0, Math.round(p.emprise)) : em;
  const repris = s.statut === 'repris';
  let action;
  if (mien) action = `<div class="between" style="gap:8px"><span class="small ok" style="font-weight:700">✓ Tu y vas avec ${mien} agent${pl(mien)}</span><button type="button" class="btn small ghost" data-action="secteur" data-c="${k}">Ajuster</button></div>`;
  else if (place) action = `<div class="between" style="gap:8px"><span class="small">${repris ? 'Ta garde' : `Emprise ${em} → <b style="color:var(--amber-hi)">${apres}</b> avec toi`}${choisi === sug ? ' · conseillé' : ''}</span>
      <span class="stepper"><button type="button" data-action="nd-rej-n" data-c="${k}" data-d="-1" aria-label="Un agent de moins" ${choisi <= 1 ? 'disabled' : ''}>−</button><span class="n">${choisi}</span><button type="button" data-action="nd-rej-n" data-c="${k}" data-d="1" aria-label="Un agent de plus" ${choisi >= place ? 'disabled' : ''}>+</button></span></div>
    <div class="row" style="gap:8px"><button type="button" class="btn small primary grow" data-action="nd-rejoindre" data-c="${k}" data-n="${choisi}">Rejoindre avec ${choisi}</button><button type="button" class="btn small ghost" data-action="secteur" data-c="${k}">Carte</button></div>`;
  else action = `<span class="tiny muted">Tu as déjà engagé tes ${ND.maxTotal} agents possibles dans la zone de non-droit.</span>`;
  return `<article class="rv-appel">
    <div class="rv-a-tete"><span class="rv-ico ambre">${icon('alert', 20)}</span>
      <div class="col grow" style="gap:1px;min-width:0"><span class="rv-a-t">Non-droit · ${esc(nomSecteur(k))}</span>
        <span class="small muted">${qui ? `${qui} y ${l.filter((x) => !x.moi).length > 1 ? 'vont' : 'va'}` : 'Tu es seul annoncé pour l’instant'}${repris ? ' · secteur à garder' : ''}</span></div></div>
    ${repris ? '' : `<div class="rv-emprise" role="img" aria-label="Emprise du milieu ${em} sur 100"><span style="width:${apres}%"></span><span class="perdu" style="width:${Math.max(0, em - apres)}%"></span></div>`}
    ${action}
  </article>`;
}

function enTete(canal, nl) {
  const appels = appelsRenfort().length;
  const priveAFaire = nl.prive > 0 || invitations().some((i) => !i.fait && i.href !== '#pactes');
  return `<div class="rv-tete">
    <div class="between"><h1 class="rv-titre">Radio Delta</h1>
      <nav class="rv-seg" aria-label="Radio et messages privés"><a href="#radio" aria-current="page">Radio</a><a href="#prive">Privé${priveAFaire ? '<span class="pastille" aria-label="nouveau"></span>' : ''}</a></nav></div>
    <div class="rv-freqs" role="tablist" aria-label="Fréquences">
      <button type="button" role="tab" class="rv-freq ${canal === 'parole' ? 'on' : ''}" data-action="radio-canal" data-v="parole" aria-selected="${canal === 'parole'}">
        <span class="rv-k"><span class="rv-led"></span>F1 · ${canal === 'parole' ? 'EN ÉCOUTE' : nl.radio ? `${nl.radio} NON LU${nl.radio > 1 ? 'S' : ''}` : 'À JOUR'}</span><span class="rv-ft">Discussion</span></button>
      <button type="button" role="tab" class="rv-freq ops ${canal === 'ops' ? 'on' : ''}" data-action="radio-canal" data-v="ops" aria-selected="${canal === 'ops'}">
        <span class="rv-k"><span class="rv-led ${appels ? 'vive' : ''}"></span>F2 · ${appels ? `${appels} APPEL${appels > 1 ? 'S' : ''}` : canal === 'ops' ? 'EN ÉCOUTE' : nl.ops ? `${nl.ops} NON LU${nl.ops > 1 ? 'S' : ''}` : 'À JOUR'}</span><span class="rv-ft">Renforts &amp; ops</span></button>
    </div>
  </div>`;
}

function formulaire(canal) {
  const rapides = canal === 'ops' ? ['J’arrive avec 2', 'Pas l’effectif ce soir', 'Bien reçu', 'Qui vient en non-droit ?'] : [];
  return `${rapides.length ? `<div class="rv-rapides">${rapides.map((t) => `<button type="button" data-action="radio-rapide" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    <form data-form="radio" data-canal="${canal}" class="rv-form">
      <label class="sr" for="radio-msg">Message</label>
      <input id="radio-msg" class="text grow" name="texte" maxlength="280" placeholder="${canal === 'parole' ? 'Message à tout le district…' : 'Répondre sur F2…'}" autocomplete="off">
      <button class="btn primary" type="submit" aria-label="Envoyer" style="width:48px;padding:0">${icon('send', 18)}</button>
    </form>`;
}

function fil(msgs, me) {
  if (!msgs.length) return '<p class="small muted" style="text-align:center;margin:24px 0">Aucun message pour l’instant. Lance la conversation !</p>';
  const out = [];
  let jour = '', prec = null;
  msgs.forEach((m, i) => {
    const j = jourDe(m.at);
    if (j !== jour) { out.push(`<div class="rv-jour">${esc(j)}</div>`); jour = j; prec = null; }
    const suiv = msgs[i + 1];
    const debut = !prec || prec.uid !== m.uid || m.at - prec.at > 15 * 60e3;
    const fin = !suiv || suiv.uid !== m.uid || suiv.at - m.at > 15 * 60e3 || jourDe(suiv.at) !== j;
    prec = m;
    if (m.uid === me.uid) { out.push(`<div class="rv-b moi ${debut ? 'deb' : ''}"><span>${esc(m.texte)}</span><time>${hm(m.at)}</time></div>`); return; }
    const w = zoneDe(m.uid), ps = pseudoDe(m.uid);
    out.push(`<div class="rv-l ${debut ? 'deb' : ''}">${fin ? avatar(m.uid, w) : '<span class="rv-av vide"></span>'}
      <div class="rv-col">${debut ? `<span class="rv-qui"><b style="color:${esc(w.couleur)}">${esc(ps || w.nom)}</b> · ZP ${esc(w.code)}${ps ? ` ${esc(w.nom)}` : ''}</span>` : ''}
        <div class="rv-b"><span>${esc(m.texte)}</span><time>${hm(m.at)}</time></div></div></div>`);
  });
  return out.join('');
}

function courante(msgs, me) {
  return msgs.map((m) => {
    const w = zoneDe(m.uid), moi = m.uid === me.uid, auto = !!(m.renfort || m.nd || m.enchere || m.renfortRep) || /^(🚨|🚔|🤝|📻|🔨)/u.test(m.texte || '');
    return `<div class="rv-mc ${moi ? 'moi' : ''} ${auto ? 'auto' : ''}"><time>${hm(m.at)}</time><span class="rv-trait" style="background:${esc(moi ? 'var(--amber)' : w.couleur)}"></span>
      <div class="col" style="gap:1px;min-width:0"><span class="rv-mc-q" style="color:${esc(moi ? 'var(--amber)' : w.couleur)}">${moi ? 'Toi' : `ZP ${esc(w.code)} ${esc(w.nom)}`}</span><span class="rv-mc-t">${esc((m.texte || '').replace(/^(🚨|🚔|🤝|📻|🔨)\s*/u, ''))}</span></div></div>`;
  }).join('');
}

export function renderRadioV2() {
  const st = S.state, me = myZone();
  const canal = S.radioCanal === 'ops' ? 'ops' : 'parole';
  const nl = nonLus();
  const msgs = (S.radio || []).filter((m) => canalRadio(m) === canal).slice(-60);
  marquerRadioLue(canal);
  let corps;
  if (canal === 'parole') {
    corps = `<section class="rv-fil" id="radio-list" aria-label="Messages">${fil(msgs, me)}</section>`;
  } else {
    const appels = appelsRenfort().sort((a, b) => (b.district ? 1 : 0) - (a.district ? 1 : 0) || a.at - b.at);
    const mon = monAppel();
    const ann = st.nonDroit ? annoncesND() : {};
    const nds = Object.keys(ann).filter((k) => st.nonDroit.secteurs[k] && secteurOuvert(st.nonDroit, k));
    const tuiles = [mon ? tuileMonAppel(mon) : '', ...appels.map(tuileRenfort), ...nds.map((k) => tuileND(k, ann[k]))].filter(Boolean);
    const ouvert = !!S.radioEchanges;
    const der = msgs[msgs.length - 1];
    corps = `<section class="col" style="gap:10px" aria-label="Tableau des appels">
      <div class="between" style="align-items:baseline"><h2 class="section" style="margin:0">Tableau des appels</h2><span class="rv-cd">20:00 dans <b id="countdown">${formatCountdown(st.nextDeadline - Date.now())}</b></span></div>
      ${tuiles.length ? tuiles.join('') : '<div class="rv-vide"><span class="small">Aucun appel en cours.</span><span class="tiny muted">Les demandes de renfort et les zones annoncées en non-droit s’affichent ici.</span></div>'}
      ${st.nonDroit && !nds.length ? `<a class="rv-complet" href="#carte">${icon('alert', 14)}<span>Personne n’est annoncé en zone de non-droit ce soir · ouvrir la carte</span></a>` : ''}
    </section>
    <section class="rv-echanges" aria-label="Échanges sur F2">
      <button type="button" class="rv-ech-t" data-action="radio-echanges" aria-expanded="${ouvert}">
        <span class="between"><b>Échanges sur F2 · ${msgs.length}</b><span style="color:var(--amber)">${ouvert ? 'Replier' : 'Ouvrir'}</span></span>
        ${!ouvert && der ? `<span class="rv-ech-d"><b style="color:${esc(der.uid === me.uid ? 'var(--amber)' : zoneDe(der.uid).couleur)}">${der.uid === me.uid ? 'Toi' : esc(zoneDe(der.uid).nom)}</b> ${esc((der.texte || '').replace(/^(🚨|🚔|🤝|📻|🔨)\s*/u, ''))}</span>` : ''}</button>
      ${ouvert ? `<div id="radio-list">${msgs.length ? courante(msgs, me) : '<p class="small muted" style="padding:10px 12px;margin:0">Rien sur cette fréquence pour l’instant.</p>'}</div>` : ''}
    </section>`;
  }
  return `<main class="screen rv">
    ${enTete(canal, nl)}
    ${corps}
    <div class="rv-bas">${formulaire(canal)}</div>
  </main>${tabbar('radio')}`;
}
