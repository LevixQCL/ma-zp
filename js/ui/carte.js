// Carte du District Delta, Radio Delta.
import { S, esc, icon, tabbar, myZone, zoneName, gradeInfo, fmt1 } from './common.js';
import { moyenneIpz, operationActive } from '../engine/zone.js';
import { planVille, iconeSite } from './plan.js';
import { siteDe } from '../engine/sites.js';
import { chefDe, postulerCtrl } from './affaires.js';
import { hashString } from '../engine/rng.js';
import { fiabilite } from '../engine/fipa.js';
import { ongletsRadio } from './diplomatie.js';
import { marquerRadioLue } from './prive.js';
import { appelsRenfort, renfortCtrl } from './renfort.js';
import { GRADES, gradeFor } from '../engine/constants.js';
import { blasonSvg, insigne } from './blasons.js';
const gradeIdx = (ps) => GRADES.indexOf(gradeFor(ps));
const pseudoDe = (uid) => (S.players && S.players[uid] && S.players[uid].pseudo) || '';

export function renderCarte() {
  const st = S.state, me = myZone();
  const zones = Object.values(st.zones).sort((a, b) => a.code.localeCompare(b.code));
  const n = zones.length;
  const ev = st.evenement;
  const op = operationActive(me, st.turn);
  const monSite = siteDe(me);
  const legende = `<div class="row small muted" style="flex-wrap:wrap;gap:10px">
    <span class="row" style="gap:4px"><svg width="12" height="14" viewBox="-8 -12 16 22" aria-hidden="true"><path d="M0 9c-5-5.5-8-8.6-8-12.4a8 8 0 0 1 16 0C8 .4 5 3.5 0 9z" fill="#F2B544"/></svg>affaire disputée</span>
    ${ev ? '<span>☆ événement</span>' : ''}${op ? '<span class="bad">◎ opération en cours</span>' : ''}
    <span class="row" style="gap:4px"><svg width="14" height="14" viewBox="-9 -9 18 18" aria-hidden="true"><circle r="8.5" fill="#0B1119" stroke="#F2B544" stroke-width="1.5"/><path d="M0 -5l4.5 1.7v2.8c0 2.8-2 4.5-4.5 5.6-2.5-1.1-4.5-2.8-4.5-5.6v-2.8z" fill="#F2B544"/></svg>ton HP</span>
    <span class="row" style="gap:4px"><span style="width:14px;height:0;border-top:2px solid var(--amber)"></span>ta zone</span></div>`;
  const zoom = !!S.carteZoom;
  return `<main class="screen">
    <header class="between" style="align-items:flex-end"><h1 class="big">District Delta</h1><span class="small muted">${n} zone${n > 1 ? 's' : ''}</span></header>
    <div class="seg2" role="group" aria-label="Cadrage de la carte">
      <button type="button" data-action="carte-zoom" data-v="0" aria-selected="${!zoom}">Tout le district</button>
      <button type="button" data-action="carte-zoom" data-v="1" aria-selected="${zoom}">Ma zone</button></div>
    <div class="plan-cadre">${planVille(st, me, { zoom })}</div>
    ${legende}

    <section class="col" aria-label="Sur la carte"><div class="between"><h2 class="section">Sur la carte</h2><a class="small" href="#terrain">Agir sur le Terrain</a></div>
      ${st.affaires.map((a, i) => {
        const chef = chefDe(a), moiChef = a.zone === me.uid;
        return `<a class="list-row" href="#terrain"><span class="badge-num">${i + 1}</span>
          <span class="col grow" style="gap:2px"><span style="font-weight:600">${esc(a.titre)}</span>
            <span class="small muted">${moiChef ? '<strong style="color:var(--amber)">Chez toi · tu diriges</strong>' : `Chez ${chef ? zoneName(chef) : '?'} · postuler`} · ${a.recompense} pts</span></span>${icon('chevron', 16)}</a>`;
      }).join('')}
      ${ev ? `<a class="list-row" href="#terrain"><span style="width:26px;height:26px;border-radius:7px;background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon('star', 14)}</span>
        <span class="col grow" style="gap:2px"><span style="font-weight:600">${esc(ev.titre)}</span><span class="small muted">Événement collectif ${ev.tour === st.turn ? 'ce soir' : `dans ${ev.tour - st.turn} tours`} · ~${3 * Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length} agents requis</span></span></a>` : ''}
      ${!st.affaires.length && !ev ? '<p class="small muted" style="margin:0">Rien de particulier sur la carte ce tour.</p>' : ''}
    </section>
    <details class="card repli" data-k="zones" ${S.ouverts && S.ouverts.zones ? 'open' : ''}><summary><span class="col grow" style="gap:0"><span style="font-weight:600">Les zones du district</span><span class="tiny muted">${n} zone${n > 1 ? 's' : ''} · grades, sites, IPZ moyen</span></span>${icon('chevron', 16)}</summary><div class="col" style="gap:8px">
      ${zones.map((z) => `<div class="list-row">${S.players[z.uid] && S.players[z.uid].blason && gradeIdx(z.ps) >= 4 ? blasonSvg(S.players[z.uid].blason, z.couleur, 20) : `<span class="bullet" style="background:${esc(z.couleur)}"></span>`}
        <span class="col grow" style="gap:1px"><span style="font-weight:600">${zoneName(z)}${z.uid === me.uid ? ' (toi)' : ''} ${insigne(z.ps)}${z.peril ? ' <span class="tag" style="background:var(--red-bg);color:var(--red-soft)">en péril</span>' : ''}</span><span class="tiny muted">${pseudoDe(z.uid) ? `${esc(pseudoDe(z.uid))} · ` : ''}${gradeInfo(z.ps).g.nom} · FIPA : ${fiabilite(z)}${z.toursSansOrdres >= 3 ? ' · en veille' : ''}</span>${siteDe(z) ? `<span class="tiny row" style="gap:4px;color:${siteDe(z).couleur}">${iconeSite(siteDe(z).id, siteDe(z).couleur, 14)}${esc(siteDe(z).nom)}</span>` : ''}</span>
        <span class="mono small">${fmt1(moyenneIpz(z))}</span></div>`).join('')}
    </div></details>
    ${monSite ? `<details class="card repli" data-k="site" ${S.ouverts && S.ouverts.site ? 'open' : ''}><summary><span class="row grow" style="gap:8px">${iconeSite(monSite.id, monSite.couleur, 22)}<span class="col" style="gap:0"><span style="font-weight:600">Ton site sensible</span><span class="tiny muted">${esc(monSite.nom)} · ${esc(monSite.type)}</span></span></span>${icon('chevron', 16)}</summary>

      <p class="small muted" style="margin:0">Il peut provoquer des imprévus dans ta zone (environ un jour sur quatre), et plus rarement une opération d’envergure :</p>
      <ul class="aide-liste">${monSite.evenements.map((e) => `<li>${esc(e.titre)} <span class="muted">· ${esc(e.texte)}</span></li>`).join('')}<li><strong>${esc(monSite.operation.titre)}</strong> <span class="muted">· opération d’envergure</span></li></ul>
    </details>` : ''}
  </main>${tabbar('carte')}`;
}

export function renderRadio() {
  const st = S.state, me = myZone();
  const nameOf = (uid) => {
    const z = st.zones[uid] || S.players[uid];
    return z ? { nom: `${z.nom}${pseudoDe(uid) ? ` · ${pseudoDe(uid)}` : ''}`, code: z.code, couleur: z.couleur } : { nom: 'Ancienne zone', code: '', couleur: '#9FB0C0' };
  };
  const msgs = S.radio.slice(-50);
  marquerRadioLue();
  const appels = appelsRenfort();
  return `<main class="screen">
    ${ongletsRadio('radio')}
    <header class="col" style="gap:3px"><h1 class="big">Radio Delta</h1><p class="sub">Canal public de tout le district. Négociez, chambrez, mais restez corrects.</p></header>
    <section class="col" aria-label="Messages" id="radio-list" style="gap:8px">
      ${msgs.length ? msgs.map((m) => { const w = nameOf(m.uid); const moi = m.uid === me.uid; const appel = m.renfort && appels.find((x) => x.uid === m.uid && x.at === m.at); return `<div class="card tight" ${m.renfort ? 'style="border-color:var(--red-line);background:var(--red-bg)"' : moi ? 'style="border-color:var(--amber-line)"' : ''}>
        <div class="between"><span class="small" style="font-weight:700;color:${esc(w.couleur)}">ZP ${esc(w.code)} ${esc(w.nom)}${moi ? ' (toi)' : ''}</span><span class="tiny muted mono">${new Date(m.at).toLocaleString('fr-BE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
        <p style="margin:0;font-size:14px;line-height:1.4;overflow-wrap:anywhere">${esc(m.texte)}</p>${appel ? renfortCtrl(appel) : ''}</div>`; }).join('') : '<p class="small muted">Aucun message pour l’instant. Lance la conversation !</p>'}
    </section>
    <form data-form="radio" class="row" style="position:sticky;bottom:96px;background:var(--bg);padding-top:6px">
      <label class="sr" for="radio-msg">Message</label>
      <input id="radio-msg" class="text grow" name="texte" maxlength="280" placeholder="Message à tout le district…" autocomplete="off">
      <button class="btn primary" type="submit" aria-label="Envoyer" style="width:48px;padding:0">${icon('send', 18)}</button>
    </form>
  </main>${tabbar('radio')}`;
}
