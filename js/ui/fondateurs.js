// Zones fondatrices (présentes depuis la saison 1) : la photo de promotion (cadre de l'onglet Chef, en attendant le bureau)
// et l'annonce unique, à la première ouverture après la bascule de saison. La plaque est dessinée dans scene-hp.js.
import { S, esc, pseudoJoueur } from './common.js';
import { plaqueFondatrice } from './scene-hp.js';

/** Zones fondatrices de la partie, la sienne en premier. */
export function fondatrices() {
  const st = S.state; if (!st) return [];
  const moi = S.user && S.user.uid;
  return Object.values(st.zones || {}).filter((z) => z.fondateur && !(S.players && S.players[z.uid] && S.players[z.uid].bot))
    .sort((a, b) => (b.uid === moi) - (a.uid === moi) || String(a.nom).localeCompare(String(b.nom), 'fr'));
}

let numPhoto = 0;
/** Photo de groupe sépia : un agent par zone fondatrice, en deux rangs devant l'hôtel de police. */
export function photoPromo(n) {
  const W = 240, H = 150, u = `pp${++numPhoto}`;
  const r = (k) => { const x = Math.sin(k * 99.7) * 43758.5; return x - Math.floor(x); };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Photo de groupe des ${n} zones fondatrices"><defs>
    <radialGradient id="${u}v" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2A1B0C" stop-opacity=".55"/></radialGradient>
    <linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9C7A2"/><stop offset="1" stop-color="#C4AE84"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#${u}c)"/>
    <rect x="30" y="18" width="180" height="96" fill="#A98F66"/><rect x="30" y="18" width="18" height="96" fill="#9A8059"/>`;
  for (let f = 0; f < 3; f++) for (let k = 0; k < 6; k++) s += `<rect x="${58 + k * 25}" y="${26 + f * 22}" width="16" height="12" fill="#7A6447"/>`;
  s += `<rect x="30" y="88" width="180" height="5" fill="#6F5A3E"/><text x="120" y="92.3" text-anchor="middle" style="font:700 5px 'Barlow Condensed',sans-serif;fill:#E9DCC0;letter-spacing:1px">POLICE</text>
    <rect x="0" y="112" width="${W}" height="${H - 112}" fill="#B7A07A"/>`;
  const nb = Math.max(1, Math.min(n, 24));
  [Math.ceil(nb / 2), Math.floor(nb / 2)].forEach((k2, ri) => {
    const y = ri === 0 ? 112 : 132, k = ri === 0 ? 0.92 : 1.05, pas = Math.min(28, 200 / Math.max(k2, 1));
    for (let i = 0; i < k2; i++) {
      const x = W / 2 + (i - (k2 - 1) / 2) * pas, dh = r(i + ri * 7) * 3;
      const peau = ['#D8C3A0', '#C9AD86', '#B8976E'][Math.floor(r(i * 3 + ri) * 3)];
      s += `<g transform="translate(${x.toFixed(1)} ${y}) scale(${k})">
        <path d="M-9 0 L-8 ${-17 - dh} Q0 ${-21 - dh} 8 ${-17 - dh} L9 0 Z" fill="#3F3120"/>
        <path d="M-2 ${-19 - dh} L0 ${-13 - dh} L2 ${-19 - dh} Z" fill="#E9DCC0" opacity=".7"/>
        <rect x="-2" y="${-22 - dh}" width="4" height="3" fill="${peau}"/><ellipse cx="0" cy="${-26 - dh}" rx="4.4" ry="5" fill="${peau}"/>
        <path d="M-5.2 ${-28.5 - dh} Q0 ${-35 - dh} 5.2 ${-28.5 - dh} Z" fill="#2E2416"/><rect x="-5.6" y="${-29 - dh}" width="11.2" height="1.6" rx=".6" fill="#2E2416"/><rect x="-1.3" y="${-32.4 - dh}" width="2.6" height="1.8" fill="#C9B07A"/>
        <rect x="-6" y="${-14 - dh}" width="2" height="1.2" fill="#C9B07A" opacity=".8"/><rect x="4" y="${-14 - dh}" width="2" height="1.2" fill="#C9B07A" opacity=".8"/></g>`;
    }
  });
  for (let i = 0; i < 260; i++) s += `<rect x="${(r(i + 0.3) * W).toFixed(1)}" y="${(r(i + 0.7) * H).toFixed(1)}" width=".7" height=".7" fill="${i % 2 ? '#fff' : '#3A2C1A'}" opacity=".18"/>`;
  return `${s}<rect width="${W}" height="${H}" fill="url(#${u}v)"/><rect width="${W}" height="${H}" fill="#704214" opacity=".1"/></svg>`;
}

/** Petit cadre doré posé dans l'en-tête de l'onglet Chef (zones fondatrices seulement). */
export function cadrePromoHtml(z) {
  if (!z || !z.fondateur) return '';
  return `<button type="button" class="fd-cadre" data-action="promo-photo" aria-label="Voir la photo de promotion de la saison 1"><span class="f"><span>${photoPromo(fondatrices().length)}</span></span><span class="l">Promo S1</span></button>`;
}

function fenetre(html, apres) {
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = html;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); if (apres) apres(); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) { e.stopPropagation(); fermer(); } });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
  wrap.querySelector('[data-close]')?.focus();
}

/** La photo en grand, avec les pseudos des fondateurs. */
export function ouvrirPromo() {
  const L = fondatrices(), moi = S.user && S.user.uid;
  fenetre(`<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="fd-titre">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="kicker">Bureau du chef</span><h2 id="fd-titre" class="aide-titre">Promotion fondatrice</h2></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <div class="fd-photo">${photoPromo(L.length)}<span class="leg">Ma ZP · Saison 1 · 2026</span></div>
    <p class="small muted" style="margin:0">Ils étaient là dès la saison 1 :</p>
    <div class="fd-noms">${L.map((z) => `<span class="${z.uid === moi ? 'moi' : ''}">${esc(pseudoJoueur(z.uid) || z.nom)}</span>`).join('')}</div>
    <button class="btn ghost block" data-close>Fermer</button>
  </div>`);
}

const cleVu = (uid) => `mazp-fondateur-vu-${uid}`;
/** L'annonce reste-t-elle à montrer à ce joueur (zone fondatrice, pas encore vue sur cet appareil) ? */
export function fondateurAVoir() {
  const z = S.state && S.user && S.state.zones[S.user.uid];
  if (!z || !z.fondateur) return false;
  try { return !localStorage.getItem(cleVu(S.user.uid)); } catch (e) { return false; }
}

/** Annonce unique « Zone fondatrice » ; `apres` est appelé à la fermeture (pour enchaîner sur les nouveautés). */
export function ouvrirFondateur(apres) {
  try { localStorage.setItem(cleVu(S.user.uid), '1'); } catch (e) { /* pas de stockage */ }
  const plaque = plaqueFondatrice(-1.5, -5, { neon: false }, 'annonce').replace(/<title>[\s\S]*?<\/title>/, '').replace(/<path d="M[^"]*h5 l-1 1.6 h-3 Z"[^>]*\/>/, '');
  fenetre(`<div class="aide card fd-annonce" role="dialog" aria-modal="true" aria-labelledby="fd-a-titre">
    <svg class="fd-plaque" viewBox="0 0 16 19" aria-hidden="true">${plaque}</svg>
    <h2 id="fd-a-titre" class="aide-titre">Zone fondatrice</h2>
    <p class="small" style="margin:0;color:var(--text2)">Merci d’être là depuis le premier soir.<br>Ta plaque est scellée sur le commissariat, et la photo de la promo t’attend dans l’onglet Chef.</p>
    <button class="btn primary block" data-close>Merci !</button>
  </div>`, apres);
}
