// Invitation : lien direct avec le code, partage en un geste, QR code.
import { S, esc, icon } from './common.js';

export const lienInvitation = (code) => `${location.origin}${location.pathname}?rejoindre=${encodeURIComponent(code)}`;
export const texteInvitation = (p) => `Rejoins ma partie de Ma ZP, « ${p.nom} » : ouvre ce lien et connecte-toi, tu arrives directement dans la partie. (Code : ${p.code})`;

/** Code d'invitation arrivé par le lien (?rejoindre=CODE), mémorisé le temps de se connecter. */
export function lireInvitationUrl() {
  try {
    const u = new URL(location.href);
    const c = u.searchParams.get('rejoindre');
    if (c) {
      sessionStorage.setItem('mazp-rejoindre', c.toUpperCase().trim());
      u.searchParams.delete('rejoindre');
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    }
    return sessionStorage.getItem('mazp-rejoindre');
  } catch (e) { return null; }
}
export function oublierInvitation() { try { sessionStorage.removeItem('mazp-rejoindre'); } catch (e) { /* rien */ } }

/** Bloc de partage (maître du jeu et « Mes parties »). */
export function partageHtml(p, { compact = false } = {}) {
  const lien = lienInvitation(p.code);
  return `<div class="partage">
    ${compact ? '' : `<div class="lien-invit mono">${esc(lien)}</div>`}
    <div class="row" style="gap:8px">
      <button type="button" class="btn small primary grow" data-action="invite-share" data-code="${esc(p.code)}" data-nom="${esc(p.nom)}">${icon('send', 16)} Partager le lien</button>
      <button type="button" class="btn small grow" data-action="invite-copy" data-code="${esc(p.code)}" data-nom="${esc(p.nom)}">Copier</button>
      <button type="button" class="btn small" data-action="invite-qr" data-code="${esc(p.code)}" aria-label="Afficher le QR code">QR</button>
    </div>
  </div>`;
}

export async function partager(code, nom) {
  const p = { code, nom };
  const url = lienInvitation(code), text = texteInvitation(p);
  if (navigator.share) {
    try { await navigator.share({ title: 'Ma ZP', text, url }); return 'partagé'; } catch (e) { if (e && e.name === 'AbortError') return null; }
  }
  return copier(code, nom);
}

export async function copier(code, nom) {
  const t = `${texteInvitation({ code, nom })}\n${lienInvitation(code)}`;
  try { await navigator.clipboard.writeText(t); return 'copié'; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e2) { /* rien */ }
    ta.remove(); return 'copié';
  }
}

let qrLib = null;
function chargerQr() {
  if (qrLib) return qrLib;
  qrLib = new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = () => ok(window.QRCode); s.onerror = ko;
    document.head.appendChild(s);
  });
  return qrLib;
}

/** Fenêtre avec le QR code du lien (à scanner avec le téléphone d'un collègue). */
export async function afficherQr(code) {
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-label="QR code d’invitation" style="align-items:center;text-align:center">
    <div class="between" style="width:100%"><h2 class="aide-titre">Scanne pour rejoindre</h2><button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;font-size:20px">×</button></div>
    <div id="qr-zone" style="background:#fff;padding:12px;border-radius:12px;min-width:224px;min-height:224px;display:flex;align-items:center;justify-content:center"><span class="small" style="color:#333">Chargement…</span></div>
    <p class="small muted" style="margin:0">Code : <strong class="mono" style="color:var(--text);letter-spacing:2px">${esc(code)}</strong></p></div>`;
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) wrap.remove(); });
  document.body.appendChild(wrap);
  try {
    const QR = await chargerQr();
    const zone = wrap.querySelector('#qr-zone'); zone.innerHTML = '';
    new QR(zone, { text: lienInvitation(code), width: 200, height: 200, colorDark: '#0B1119', colorLight: '#ffffff' });
  } catch (e) {
    wrap.querySelector('#qr-zone').innerHTML = '<span class="small" style="color:#333">QR code indisponible hors connexion. Utilise « Partager le lien ».</span>';
  }
}
