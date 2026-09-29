// Dissuasion (avec humour) contre la copie des énigmes vers une IA.
// Aucun navigateur ne permet de détecter une capture d'écran de façon fiable :
// on bloque la copie de texte et on réagit aux gestes repérables (copier, touche Impr. écran).
import { S } from './common.js';

const enEnigme = () => S.route === 'quete' && S.questMode !== 'train';

// Visage moqueur original (dessiné ici, pas un mème existant).
const VISAGE = `<svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true">
  <circle cx="60" cy="60" r="54" fill="#F2B544" stroke="#1A1204" stroke-width="4"/>
  <path d="M30 44q10-10 22 0" fill="none" stroke="#1A1204" stroke-width="5" stroke-linecap="round"/>
  <path d="M68 40q12-6 22 4" fill="none" stroke="#1A1204" stroke-width="5" stroke-linecap="round"/>
  <circle cx="42" cy="54" r="5" fill="#1A1204"/><circle cx="80" cy="52" r="5" fill="#1A1204"/>
  <path d="M28 72q32 34 66-6q-30 14-66 6z" fill="#1A1204"/>
  <path d="M40 78q22 10 44-4" fill="none" stroke="#F4EFE3" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const PHRASES = [
  'Tu comptais demander à une IA ? Le parquet préfère les enquêteurs.',
  'Capture d’écran repérée… Chez nous, on résout avec sa tête.',
  'Copier l’énigme ? Même Columbo n’avait pas besoin d’aide.',
  'Bien essayé. Allez, un café et on réfléchit tout seul.',
];

function troll() {
  if (document.querySelector('.troll')) return;
  const d = document.createElement('div');
  d.className = 'troll';
  d.setAttribute('role', 'alert');
  d.innerHTML = `${VISAGE}<p>${PHRASES[Math.floor(Math.random() * PHRASES.length)]}</p><button class="btn primary">D’accord, je joue le jeu</button>`;
  d.addEventListener('click', () => d.remove());
  document.body.appendChild(d);
}

export function installerAntiTriche() {
  document.addEventListener('copy', (e) => { if (enEnigme()) { e.preventDefault(); troll(); } });
  document.addEventListener('cut', (e) => { if (enEnigme()) { e.preventDefault(); troll(); } });
  document.addEventListener('contextmenu', (e) => { if (enEnigme() && e.target.closest('main')) e.preventDefault(); });
  document.addEventListener('keyup', (e) => { if (enEnigme() && (e.key === 'PrintScreen' || e.key === 'Snapshot')) troll(); });
  document.addEventListener('keydown', (e) => {
    // Raccourcis de capture connus (Windows : Maj + Win + S ; macOS : Cmd + Maj + 3/4/5).
    if (!enEnigme()) return;
    if (e.shiftKey && (e.metaKey || e.getModifierState?.('OS')) && ['s', 'S', '3', '4', '5'].includes(e.key)) troll();
  });
}
