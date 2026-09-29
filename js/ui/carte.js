// Carte du District Delta, Radio Delta.
import { S, esc, icon, tabbar, myZone, zoneName, gradeInfo, fmt1 } from './common.js';
import { moyenneIpz, operationActive } from '../engine/zone.js';
import { territoires, W, H } from './ville.js';
import { hashString } from '../engine/rng.js';
import { fiabilite } from '../engine/fipa.js';
import { ongletsRadio } from './diplomatie.js';
import { marquerRadioLue } from './prive.js';
import { appelsRenfort, renfortCtrl } from './renfort.js';
import { GRADES, gradeFor } from '../engine/constants.js';
import { blasonSvg, insigne } from './blasons.js';
const gradeIdx = (ps) => GRADES.indexOf(gradeFor(ps));
const pseudoDe = (uid) => (S.players && S.players[uid] && S.players[uid].pseudo) || '';

function bezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
}

function planVille(st, me) {
  const zonesArr = Object.values(st.zones);
  const T = territoires(S.config.seed, zonesArr.map((z) => z.uid));
  const zoneOf = (k) => st.zones[T.order[k]];
  const moi = T.zones.find((x) => x.uid === me.uid);
  const P0 = [-10, H * 0.58], P1 = [W * 0.3, H * 0.7], P2 = [W * 0.58, H * 0.28], P3 = [W + 10, H * 0.42];
  const riviere = `M${P0} C${P1} ${P2} ${P3}`;
  const ponts = [0.22, 0.47, 0.72].map((t) => {
    const a = bezier(t - 0.01, P0, P1, P2, P3), b = bezier(t + 0.01, P0, P1, P2, P3), c = bezier(t, P0, P1, P2, P3);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    return `<rect x="${(c[0] - 3).toFixed(1)}" y="${(c[1] - 12).toFixed(1)}" width="6" height="24" rx="1.5" fill="#6B7A8A" transform="rotate(${ang.toFixed(0)} ${c[0].toFixed(1)} ${c[1].toFixed(1)})"/>`;
  }).join('');
  const proche = (x, y) => T.cells.reduce((b, c) => ((c.c[0] - x) ** 2 + (c.c[1] - y) ** 2 < (b.c[0] - x) ** 2 + (b.c[1] - y) ** 2 ? c : b));
  const gare = proche(W * 0.5, H * 0.2), hop = proche(W * 0.2, H * 0.3), stade = proche(W * 0.8, H * 0.8), port = proche(W * 0.86, H * 0.5), place = proche(W * 0.5, H * 0.5);
  const cellsSvg = T.cells.map((c) => {
    const z = zoneOf(T.owner[c.i]);
    const mine = z && z.uid === me.uid;
    return `<path d="M${c.poly.map((p) => p.join(',')).join('L')}Z" fill="${esc(z ? z.couleur : '#2A3644')}" fill-opacity="${mine ? 0.42 : 0.28}" stroke="#0B1119" stroke-width="2.2"><title>${esc(c.nom)}${z ? ` · ZP ${esc(z.code)} ${esc(z.nom)}` : ''}</title></path>`;
  }).join('');
  const frontieres = T.edges.filter(([i, j]) => T.owner[i] !== T.owner[j])
    .map(([, , a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('');
  const labels = T.zones.map((tz) => {
    const z = st.zones[tz.uid];
    const [x, y] = tz.label;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" class="zl">${esc(z.nom.toUpperCase().slice(0, 14))}</text>
      ${pseudoDe(tz.uid) ? `<text x="${x.toFixed(1)}" y="${(y + 23).toFixed(1)}" text-anchor="middle" class="zp">${esc(pseudoDe(tz.uid))}</text>` : ''}
      <text x="${x.toFixed(1)}" y="${(y + 12).toFixed(1)}" text-anchor="middle" class="zc">ZP ${esc(z.code)}${gradeIdx(z.ps) >= 3 ? ` ${'★'.repeat(gradeIdx(z.ps) - 2)}` : ''}${z.peril ? ' ⚠' : ''}</text>`;
  }).join('');
  const loinDesLabels = (c) => T.zones.every((tz) => (tz.label[0] - c.c[0]) ** 2 + (tz.label[1] - c.c[1] - 22) ** 2 > 28 ** 2);
  const nomsQuartiers = moi ? moi.quartiers.filter((i) => loinDesLabels(T.cells[i])).map((i) => { const c = T.cells[i]; return `<text x="${Math.min(W - 34, Math.max(34, c.c[0])).toFixed(1)}" y="${(c.c[1] + 22).toFixed(1)}" text-anchor="middle" class="ql">${esc(c.nom)}</text>`; }).join('') : '';
  const pin = (c, inner, fill = '#F2B544', ink = '#1A1204') => `<g transform="translate(${c.c[0].toFixed(1)} ${(c.c[1] - 16).toFixed(1)})"><circle r="10" fill="${fill}" stroke="#0B1119" stroke-width="2"/><text y="4" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" fill="${ink}">${inner}</text></g>`;
  const pinsAff = st.affaires.map((a, k) => pin(T.cells[Math.abs(hashString(a.id)) % T.cells.length], k + 1)).join('');
  const op = operationActive(me, st.turn);
  const opPin = op && moi ? (() => { const c = T.cells[moi.quartiers[Math.abs(hashString(op.id || op.titre)) % moi.quartiers.length]]; return `<g transform="translate(${c.c[0].toFixed(1)} ${c.c[1].toFixed(1)})"><circle r="16" fill="#F0736A" fill-opacity=".25"><animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/></circle><circle r="8" fill="#F0736A" stroke="#0B1119" stroke-width="2"/><text y="3.5" text-anchor="middle" font-size="10" font-weight="700" fill="#1A1204">!</text></g>`; })() : '';
  const hp = moi ? (() => { const c = T.cells[moi.capitale]; return `<g transform="translate(${(c.c[0] + 14).toFixed(1)} ${(c.c[1] + 2).toFixed(1)})"><path d="M0 -9l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10v-5z" fill="#F2B544" stroke="#0B1119" stroke-width="1.5"/></g>`; })() : '';
  const star = st.evenement ? `<g transform="translate(${place.c[0].toFixed(1)} ${(place.c[1] + 18).toFixed(1)})"><rect x="-11" y="-11" width="22" height="22" rx="6" fill="#E9EEF3" stroke="#0B1119" stroke-width="2"/><path transform="translate(-8 -8) scale(.67)" d="M12 2l3 6.3 6.9.9-5 4.8 1.2 6.8L12 17.6l-6.1 3.2 1.2-6.8-5-4.8 6.9-.9z" fill="#0B1119"/></g>` : '';
  const repere = (c, dx, dy, svg, titre) => `<g transform="translate(${(c.c[0] + dx).toFixed(1)} ${(c.c[1] + dy).toFixed(1)})"><title>${titre}</title>${svg}</g>`;
  const reperes = [
    repere(gare, -16, 6, '<rect x="-9" y="-7" width="18" height="14" rx="3" fill="#0B1119" stroke="#C8D3DD"/><path d="M-5 4v-6h10v6M-6 -1h12" stroke="#C8D3DD" stroke-width="1.4" fill="none"/>', 'Gare du Delta'),
    repere(hop, -16, 6, '<rect x="-8" y="-8" width="16" height="16" rx="3" fill="#E9EEF3"/><path d="M-1.8 -5h3.6v3.2h3.2v3.6h-3.2v3.2h-3.6v-3.2h-3.2v-3.6h3.2z" fill="#D9453B"/>', 'Hôpital'),
    repere(stade, -16, 6, '<ellipse rx="10" ry="7" fill="#2F6B45" stroke="#C8D3DD"/><ellipse rx="5" ry="3" fill="none" stroke="#C8D3DD" stroke-width="1"/>', 'Stade du Delta'),
    repere(port, -16, 6, '<circle r="9" fill="#0B1119" stroke="#8CC8F5"/><path d="M0 -5v9M-4 1a4 4 0 0 0 8 0M-2.5 -3h5" stroke="#8CC8F5" stroke-width="1.4" fill="none"/>', 'Port fluvial'),
  ].join('');
  const rail = `M${W * 0.5} -5 L${gare.c[0]} ${gare.c[1]} L${W * 0.12} ${H + 5}`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Plan de la ville : ${T.cells.length} quartiers répartis entre ${T.zones.length} zones" style="display:block;border-radius:12px">
    <style>.zl{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;fill:#F4F7FA;paint-order:stroke;stroke:#0B1119;stroke-width:3.5px;letter-spacing:.5px}.zc{font-family:'IBM Plex Mono',monospace;font-size:9.5px;fill:#DDE6EE;paint-order:stroke;stroke:#0B1119;stroke-width:3px}.zp{font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:9px;fill:#F2B544;paint-order:stroke;stroke:#0B1119;stroke-width:3px}.ql{font-family:'IBM Plex Sans',sans-serif;font-size:7.5px;fill:#C8D3DD;paint-order:stroke;stroke:#0B1119;stroke-width:2.5px}</style>
    <rect width="${W}" height="${H}" fill="#101821"/>
    ${cellsSvg}
    <ellipse cx="${W / 2}" cy="${H / 2}" rx="${W * 0.34}" ry="${H * 0.3}" fill="none" stroke="#56657A" stroke-width="3" stroke-opacity=".8"/>
    <path d="${rail}" fill="none" stroke="#9FB0C0" stroke-width="1.6" stroke-dasharray="5 3" stroke-opacity=".7"/>
    <path d="${riviere}" fill="none" stroke="#1E4A6B" stroke-width="16" stroke-linecap="round"/>
    <path d="${riviere}" fill="none" stroke="#3A7BA8" stroke-width="9" stroke-linecap="round"/>
    ${ponts}
    <g stroke="#E9EEF3" stroke-opacity=".6" stroke-width="2" stroke-linecap="round">${frontieres}</g>
    ${reperes}${nomsQuartiers}${labels}${hp}${star}${pinsAff}${opPin}
  </svg>`;
}

export function renderCarte() {
  const st = S.state, me = myZone();
  const zones = Object.values(st.zones).sort((a, b) => a.code.localeCompare(b.code));
  const n = zones.length;
  const ev = st.evenement;
  const op = operationActive(me, st.turn);
  const legende = `<div class="row small muted" style="flex-wrap:wrap;gap:10px">
    <span class="row" style="gap:4px"><span class="badge-num" style="width:18px;height:18px;font-size:10px">1</span>affaire disputée</span>
    ${ev ? '<span>☆ événement</span>' : ''}${op ? '<span class="bad">● opération en cours</span>' : ''}
    <span class="row" style="gap:4px"><svg width="12" height="14" viewBox="-9 -10 18 21" aria-hidden="true"><path d="M0 -9l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10v-5z" fill="#F2B544"/></svg>ton HP</span></div>`;
  return `<main class="screen">
    <header class="between" style="align-items:flex-end"><h1 class="big">District Delta</h1><span class="small muted">${n} zone${n > 1 ? 's' : ''}</span></header>
    <div style="background:#101821;border:1px solid var(--line);border-radius:16px;padding:4px">${planVille(st, me)}</div>
    ${legende}
    <section class="col" aria-label="Sur la carte"><h2 class="section">Sur la carte</h2>
      ${st.affaires.map((a, i) => {
        const eg = S.savedOrders && S.savedOrders.engagements && S.savedOrders.engagements[a.id];
        return `<a class="list-row" href="#ordres"><span class="badge-num">${i + 1}</span>
        <span class="col grow" style="gap:2px"><span style="font-weight:600">${esc(a.titre)}</span><span class="small muted">Affaire disputée · ${a.recompense} pts · force conseillée ${a.forceConseillee}</span></span>
        ${eg && eg.agents ? `<span class="tiny" style="font-weight:700;color:var(--blue-soft)">${eg.agents} engagés</span>` : `<span class="btn small">Engager</span>`}</a>`;
      }).join('')}
      ${ev ? `<a class="list-row" href="#ordres"><span style="width:26px;height:26px;border-radius:7px;background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon('star', 14)}</span>
        <span class="col grow" style="gap:2px"><span style="font-weight:600">${esc(ev.titre)}</span><span class="small muted">Événement collectif ${ev.tour === st.turn ? 'ce soir' : `dans ${ev.tour - st.turn} tours`} · ~${3 * Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length} agents requis</span></span></a>` : ''}
      ${!st.affaires.length && !ev ? '<p class="small muted" style="margin:0">Rien de particulier sur la carte ce tour.</p>' : ''}
    </section>
    <section class="col" aria-label="Les zones"><h2 class="section">Les zones</h2>
      ${zones.map((z) => `<div class="list-row">${S.players[z.uid] && S.players[z.uid].blason && gradeIdx(z.ps) >= 4 ? blasonSvg(S.players[z.uid].blason, z.couleur, 20) : `<span class="bullet" style="background:${esc(z.couleur)}"></span>`}
        <span class="col grow" style="gap:1px"><span style="font-weight:600">${zoneName(z)}${z.uid === me.uid ? ' (toi)' : ''} ${insigne(z.ps)}${z.peril ? ' <span class="tag" style="background:var(--red-bg);color:var(--red-soft)">en péril</span>' : ''}</span><span class="tiny muted">${pseudoDe(z.uid) ? `${esc(pseudoDe(z.uid))} · ` : ''}${gradeInfo(z.ps).g.nom} · FIPA : ${fiabilite(z)}${z.toursSansOrdres >= 3 ? ' · en veille' : ''}</span></span>
        <span class="mono small">${fmt1(moyenneIpz(z))}</span></div>`).join('')}
    </section>
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
