// Invitation à installer Ma ZP sur l'écran d'accueil (plein écran, sans barre d'adresse).
// - Android (Chrome, Edge, Samsung…) : le navigateur signale qu'il peut installer → vrai bouton « Installer ».
// - iPhone / iPad : pas de bouton possible → on montre les 2 gestes à faire dans Safari.
// Rien ne s'affiche si le jeu est déjà ouvert depuis l'icône, sur PC, ou si le joueur a fermé le bandeau
// (il revient au bout de 7 jours, au cas où).

const CLE = 'mazp-install-ferme';
const DELAI_RETOUR = 7 * 24 * 3600 * 1000;
let promptAndroid = null;
let barre = null;

const estInstalle = () => navigator.standalone === true
  || (globalThis.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches));
const estIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const estMobile = () => estIOS() || /Android/i.test(navigator.userAgent)
  || (globalThis.matchMedia && matchMedia('(pointer: coarse)').matches);

function fermeRecemment() {
  try { return Date.now() - Number(localStorage.getItem(CLE) || 0) < DELAI_RETOUR; } catch (e) { return false; }
}
function memoriserFermeture() {
  try { localStorage.setItem(CLE, String(Date.now())); } catch (e) { /* pas de stockage : on ferme pour cette visite */ }
}

// Navigateur iOS dans lequel le lien a été ouvert : Safari, Chrome/Edge/Firefox iOS, ou navigateur intégré
// d'une autre appli (Teams, Outlook, SharePoint…) qui ne permet pas l'installation.
function navigateurIOS() {
  const ua = navigator.userAgent;
  if (/CriOS|EdgiOS|FxiOS|OPiOS/.test(ua)) return 'autre';
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'safari';
  return 'integre';
}

const ICONE_PARTAGE = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICONE_PLUS = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function contenuIOS() {
  const nav = navigateurIOS();
  if (nav === 'integre') {
    return `<b>Joue en plein écran</b><span>Ouvre ce lien dans <b>Safari</b>, puis ajoute Ma ZP à l’écran d’accueil.</span>`;
  }
  return `<b>Joue en plein écran</b>
    <span class="inst-etapes">
      <span class="inst-etape">${ICONE_PARTAGE} Partager${nav === 'safari' ? ' <i>(ou •••)</i>' : ''}</span>
      <span class="inst-fleche" aria-hidden="true">›</span>
      <span class="inst-etape">${ICONE_PLUS} Sur l’écran d’accueil</span>
    </span>`;
}

function afficher(mode) {
  if (barre || estInstalle() || fermeRecemment()) return;
  barre = document.createElement('div');
  barre.className = 'inst-barre';
  barre.setAttribute('role', 'note');
  barre.innerHTML = `
    <img class="inst-icone" src="icons/icon-180.png" alt="" width="40" height="40">
    <div class="inst-texte">${mode === 'android'
      ? '<b>Installe Ma ZP</b><span>Plein écran, une icône sur ton téléphone.</span>'
      : contenuIOS()}</div>
    ${mode === 'android' ? '<button type="button" class="btn primary small inst-ok">Installer</button>' : ''}
    <button type="button" class="inst-x" aria-label="Fermer">✕</button>`;
  barre.querySelector('.inst-x').addEventListener('click', () => { memoriserFermeture(); retirer(); });
  const ok = barre.querySelector('.inst-ok');
  if (ok) ok.addEventListener('click', async () => {
    if (!promptAndroid) return retirer();
    const p = promptAndroid; promptAndroid = null;
    p.prompt();
    try { const r = await p.userChoice; if (r && r.outcome === 'dismissed') memoriserFermeture(); } catch (e) { /* rien */ }
    retirer();
  });
  document.body.appendChild(barre);
}

function retirer() { if (barre) { barre.remove(); barre = null; } }

// À appeler le plus tôt possible : Chrome peut annoncer l'installation dès le chargement.
export function installerInvitationAppli() {
  if (estInstalle() || window.top !== window.self) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // on garde la proposition pour notre propre bouton
    promptAndroid = e;
    if (estMobile()) setTimeout(() => afficher('android'), 2500);
  });
  window.addEventListener('appinstalled', () => { promptAndroid = null; retirer(); });
  if (estIOS()) setTimeout(() => afficher('ios'), 2500);
}
