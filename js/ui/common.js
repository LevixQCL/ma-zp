import { nonLus, invitations } from './prive.js';
import { terrainAFaire } from './terrain.js';
// Outils partagés par tous les écrans.
import { gradeFor, nextGrade } from '../engine/constants.js';
import { moyenneIpz } from '../engine/zone.js';

/** État de l'application (côté interface). */
export const S = {
  backend: null, config: null, user: null, player: null, state: null, players: {},
  route: 'hp', draft: null, savedOrders: null, ordersDirty: false,
  quests: null, questResults: [null, null, null], questIdx: 0, questPick: null,
  radio: [], prives: [], gazettes: [], gazetteIndex: 0,
  editingName: false, busy: false, decisionOpen: false, showRapport: false,
};

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const fmt1 = (v) => (Math.round(v * 10) / 10).toLocaleString('fr-BE', { maximumFractionDigits: 1 });
export const fmtK = (v) => `${fmt1(v)} k€`;

export function zoneName(z) { return z ? `ZP ${esc(z.code)} ${esc(z.nom)}` : ''; }

export function myZone() { return S.state && S.user ? S.state.zones[S.user.uid] : null; }

export function classementLive(state) {
  return Object.values(state.zones)
    .map((z) => ({ z, moyenne: moyenneIpz(z), classe: z.toursJoues >= 5 }))
    .sort((a, b) => (b.classe - a.classe) || (b.moyenne - a.moyenne) || (b.z.ipz - a.z.ipz));
}

export function rangDe(uid) {
  const c = classementLive(S.state);
  const i = c.findIndex((r) => r.z.uid === uid);
  return { rang: i + 1, total: c.length };
}

export function gradeInfo(ps) {
  const g = gradeFor(ps), n = nextGrade(ps);
  const pct = n ? Math.round(100 * (ps - g.ps) / (n.ps - g.ps)) : 100;
  return { g, n, pct };
}

const PATHS = {
  hp: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  ordres: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/>',
  quete: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  carte: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
  radio: '<path d="M4 5h16v11H9l-5 4z"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  send: '<path d="M4 12l16-8-6 16-2-6z"/>',
  enquete: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  terrain: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  loupe: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  star: '<path d="M12 2l3 6.3 6.9.9-5 4.8 1.2 6.8L12 17.6l-6.1 3.2 1.2-6.8-5-4.8 6.9-.9z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
};

export function icon(name, size = 22, extra = '') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${PATHS[name] || ''}</svg>`;
}

export function tabbar(active, { questBadge = false, radioBadge = false } = {}) {
  const tabs = [['hp', 'HP'], ['ordres', 'Ordres'], ['terrain', 'Terrain'], ['enquete', 'Enquête'], ['quete', 'Énigmes'], ['carte', 'Carte'], ['radio', 'Radio']];
  const st = S.state, me = S.user && st && st.zones ? st.zones[S.user.uid] : null;
  const faites = (S.questResults || []).filter((r) => r && (r.statut === 'ok' || r.statut === 'rate')).length;
  const dots = {
    ordres: !S.savedOrders || S.ordersDirty,
    enquete: !!(st && (st.traques || []).length && !(S.draft && S.draft.traque)),
    quete: questBadge || faites < 3,
    terrain: terrainAFaire() > 0,
    radio: radioBadge || (() => { const n = nonLus(); return n.radio + n.prive > 0 || invitations().some((i) => !i.fait); })(),
  };
  return `<nav class="tabs" aria-label="Navigation principale">${tabs.map(([id, label]) => `
    <a href="#${id}" ${active === id ? 'aria-current="page"' : ''} ${id === 'enquete' ? 'class="centre"' : ''}>${id === 'enquete' ? `<span class="rond">${icon(id, 26)}</span>` : icon(id)}<span>${id === 'radio' ? 'Radio' : label}</span>${dots[id] ? '<span class="dot" aria-label="à faire"></span>' : ''}</a>`).join('')}
  </nav>`;
}

/** Jauge 0-100. `label` est du texte brut ; `extra` (HTML) s'affiche à côté, hors des attributs. */
export function gauge(label, value, color, extra = '') {
  const v = Math.round(value);
  return `<div class="gauge"><div class="between small"><span class="row" style="gap:4px">${esc(label)}${extra}</span><span class="mono muted">${v}</span></div>
    <div class="bar" role="img" aria-label="${esc(label)} : ${v} sur 100"><div style="width:${Math.max(0, Math.min(100, v))}%;background:${color}"></div></div></div>`;
}

let toastTimer = null;
export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}

export function header(kicker, title, right = '') {
  return `<header class="between" style="align-items:flex-start"><div class="col" style="gap:3px">${kicker ? `<span class="kicker">${kicker}</span>` : ''}<h1 class="big">${title}</h1></div>${right}</header>`;
}
