import { nonLus, invitations } from './prive.js';
import { aFairePactes } from './pactes.js';
import { terrainAFaire } from './terrain.js';
// Outils partagés par tous les écrans.
import { gradeFor, nextGrade, ENIGMES } from '../engine/constants.js';

/** Bonus d'énigme « +10 % de capacité » choisi aujourd'hui pour ce service (1 sinon) : appliqué à 20:00, montré dès maintenant dans les estimations. */
export function bonusEnigme(service) {
  const b = (S.questResults || []).find((r) => r && r.bonus === 'capacite' && (r.statut === 'ok' || (r.statut === 'quiz' && Number(r.tentatives) >= 3))); // confié à un agent : pas sûr, on ne l'affiche pas
  return b && b.service === service ? ENIGMES.bonusCapacite : 1;
}
import { moyenneIpz } from '../engine/zone.js';
import { slotsDuJour, slotsComptes } from '../quests/quests.js';
/** Emplacements des énigmes du jour en cours (3 ou 4, sans le dossier noir). */
export const slotsJour = () => slotsDuJour(S.state && S.state.nextDeadline);
/** Emplacements qui comptent (bonus, prime, « à faire ») : la 4e énigme est pour le plaisir. */
export const slotsCompte = () => slotsComptes(S.state && S.state.nextDeadline);
/** Énigme du jour à l'emplacement `i` (0, 1, 2 ou 4). */
export const questDuSlot = (i) => (S.quests ? S.quests.find((q) => q.slot === i) || S.quests[0] : null);

/** État de l'application (côté interface). */
export const S = {
  backend: null, config: null, user: null, player: null, state: null, players: {},
  route: 'hp', draft: null, savedOrders: null, ordersDirty: false,
  quests: null, questResults: [null, null, null], questIdx: 0, questPick: null,
  radio: [], prives: [], gazettes: [], gazetteIndex: 0,
  editingName: false, busy: false, decisionOpen: false, showRapport: false,
};

/** Nom affiché d'un joueur sur les badges (records, nominettes) : toujours son pseudo, jamais le nom de sa zone. */
export function pseudoJoueur(uid) {
  const p = (S.players || {})[uid] || {};
  if (p.pseudo) return p.pseudo;
  if (S.user && uid === S.user.uid && S.player && S.player.pseudo) return S.player.pseudo;
  const z = S.state && S.state.zones && S.state.zones[uid];
  return z && z.code ? `ZP ${z.code}` : 'Un joueur';
}

/** Pseudo par défaut pour un ancien compte qui n'en a pas : prénom Google, sinon début de l'adresse e-mail. */
export function pseudoParDefaut(user) {
  const d = String((user && user.displayName) || '').trim().split(/\s+/)[0];
  if (d) return d.slice(0, 24);
  const m = String((user && user.email) || '').split('@')[0].split(/[._\-+]/)[0].replace(/\d+$/, '');
  return m ? (m[0].toUpperCase() + m.slice(1)).slice(0, 24) : '';
}

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
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  liste: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  tableau: '<rect x="3" y="4" width="18" height="14" rx="1.5"/><path d="M8 21l2-3M16 21l-2-3M7 8l5 3 5-2"/><circle cx="7" cy="8" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="17" cy="9" r="1"/>',
  hp: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  ordres: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/>',
  quete: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  carte: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
  radio: '<path d="M4 5h16v11H9l-5 4z"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  alert: '<path d="M12 3.5L2.8 19.5h18.4z"/><path d="M12 10v4.2"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  chef: '<path d="M4 13.5c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5"/><path d="M2.5 13.5h19l-2.2 3.5H4.7z"/><path d="M10 9.6h4M12 6v-.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  send: '<path d="M4 12l16-8-6 16-2-6z"/>',
  enquete: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  terrain: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  loupe: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  star: '<path d="M12 2l3 6.3 6.9.9-5 4.8 1.2 6.8L12 17.6l-6.1 3.2 1.2-6.8-5-4.8 6.9-.9z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  mur: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19"/>',
  equipe: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.1c2.6.2 4.5 2 4.5 4.9"/>',
  poignee: '<path d="M2.5 11l4-4 3 1.5 2.5-1.5 2.5 1.5 3-1.5 4 4"/><path d="M6.5 7l-1 7 4 3.5 2-1 2 1.5 2.5-1.5 2-1-1-8.5"/><path d="M9 11.5l3 2.5M11.5 10.5l3 2.5"/>',
  euro: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.6A4 4 0 0 0 9 11.2v1.6a4 4 0 0 0 6.5 2.6M7 11h6M7 13.2h6"/>',
  renfort: '<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20c0-3.6 2.9-6 6.5-6 1.3 0 2.5.3 3.5.9"/><path d="M18 14v6M15 17h6"/>',
  marteau: '<path d="M13.5 3.5l7 7M10.5 6.5l7 7M12 5l-3.5 3.5M19 12l-3.5 3.5M12 12l-8.5 8.5M3 21h9"/>',
};

export function icon(name, size = 22, extra = '') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${PATHS[name] || ''}</svg>`;
}

function clePastilles() { return `mazp-pastilles-${(S.backend && S.backend.gameId && S.backend.gameId()) || ''}-${(S.user && S.user.uid) || ''}`; }
function pastillesVues() {
  if (S._pastilles && S._pastilles.cle === clePastilles()) return S._pastilles.v;
  let v = {};
  try { v = JSON.parse(localStorage.getItem(clePastilles()) || '{}') || {}; } catch (e) { v = {}; }
  S._pastilles = { cle: clePastilles(), v };
  return v;
}
function ecrirePastillesVues(v) { try { localStorage.setItem(clePastilles(), JSON.stringify(v)); } catch (e) { /* pas de stockage : la mémoire suffit pour la session */ } }

let chefAFaireTab = () => false;
export function brancherChefTab(fn) { chefAFaireTab = fn; }
export function tabbar(active, { questBadge = false, radioBadge = false } = {}) {
  const st = S.state, me = S.user && st && st.zones ? st.zones[S.user.uid] : null;
  // Saison 2 : le Terrain devient un calque de la Carte (6 onglets).
  const v2 = !!st && (Number(st.regles) || 1) >= 2;
  const tabs = v2 ? [['hp', 'HP'], ['ordres', 'Ordres'], ['carte', 'Carte'], ['enquete', 'Enquête'], ['quete', 'Énigmes'], ['chef', 'Chef'], ['radio', 'Radio']]
    : [['hp', 'HP'], ['ordres', 'Ordres'], ['terrain', 'Terrain'], ['enquete', 'Enquête'], ['quete', 'Énigmes'], ['carte', 'Carte'], ['radio', 'Radio']];
  if (v2 && active === 'terrain') active = 'carte';
  const nbJour = slotsCompte().length;
  const faites = (S.questResults || []).some((r) => r && (r.statut === 'delegue' || r.statut === 'quiz')) ? nbJour : slotsCompte().filter((k) => { const r = (S.questResults || [])[k]; return r && (r.statut === 'ok' || r.statut === 'rate'); }).length;
  const dots = {
    ordres: !S.savedOrders || S.ordersDirty,
    enquete: !!(st && (st.traques || []).length && !(S.draft && S.draft.traque)),
    quete: questBadge || faites < nbJour,
    terrain: terrainAFaire() > 0,
    radio: radioBadge || (() => { const n = nonLus(); return n.radio + n.prive > 0 || invitations().some((i) => !i.fait && i.href !== '#pactes'); })(),
    carte: aFairePactes().some((x) => !x.fait) || (v2 && terrainAFaire() > 0),
    chef: v2 && chefAFaireTab(),
  };
  // Pastille = « du nouveau depuis ta dernière visite » : elle s'éteint quand tu ouvres la page et ne se rallume
  // que si ce qu'elle signale change (nouveau tour, nouvelle demande…). Exception : des ordres modifiés mais
  // pas validés gardent leur pastille. La Radio garde son propre compteur de messages non lus.
  const T = st ? `${st.season}-${st.turn}` : '';
  const sig = {
    ordres: T,
    quete: `${T}:${faites}`,
    terrain: `${T}:${dots.terrain ? terrainAFaire() : 0}`,
    carte: `${T}:${dots.carte ? aFairePactes().filter((x) => !x.fait).map((x) => x.titre).join('|') : ''}${v2 ? `:${terrainAFaire()}` : ''}`,
    enquete: `${T}:${st ? (st.traques || []).length : 0}`,
    chef: `${T}:${dots.chef ? 1 : 0}`,
  };
  const vus = pastillesVues();
  if (sig[active] !== undefined && vus[active] !== sig[active]) { vus[active] = sig[active]; ecrirePastillesVues(vus); }
  for (const k of Object.keys(sig)) if (dots[k] && vus[k] === sig[k] && !(k === 'ordres' && S.ordersDirty)) dots[k] = false;
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

/** Silhouette de la ville (bandeau du ciel de l'HP et de l'accueil). Calculée une fois. */
let SKY = '';
export function skyline() {
  if (SKY) return SKY;
  let x = 0, seed = 7, d = '';
  const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  while (x < 400) {
    const w = 14 + Math.round(r() * 26), h = 14 + Math.round(r() * 38);
    const top = 64 - h;
    d += `M${x} 64V${top}h${w}V64z`;
    if (r() > 0.72) d += `M${x + Math.round(w / 2) - 1} ${top}v-${6 + Math.round(r() * 8)}h2V${top}z`; // antenne
    x += w + (r() > 0.6 ? 2 : 0);
  }
  SKY = `<svg class="skyline" viewBox="0 0 400 64" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><pattern id="sk-win" width="29" height="23" patternUnits="userSpaceOnUse" fill="#FFC970"><rect x="3" y="4" width="2.6" height="3.4"/><rect x="17" y="4" width="2.6" height="3.4" opacity=".4"/><rect x="24" y="15" width="2.6" height="3.4"/><rect x="10" y="15" width="2.6" height="3.4" fill="#BFD6FF" opacity=".55"/></pattern></defs>
    <path d="${d}" fill="#0A0E22"/><path class="sk-win" d="${d}" fill="url(#sk-win)"/></svg>`;
  return SKY;
}

/** Moment du ciel selon l'heure réelle : renvoie les opacités du crépuscule et de la nuit (0 à 1). */
export function cielDuMoment(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const lin = (a, b) => Math.max(0, Math.min(1, (h - a) / (b - a)));
  const nuit = h < 12 ? 1 - lin(5.5, 7.5) : lin(19.5, 21.5);
  const crep = h < 12 ? 1 - lin(7, 9) : lin(16.5, 19);
  return { crep: Math.round(crep * 100) / 100, nuit: Math.round(nuit * 100) / 100 };
}
export function cielStyle() { const c = cielDuMoment(); return `--crep:${c.crep};--nuit:${c.nuit}`; }
