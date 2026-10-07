// Événement d'actualité : une mobilisation réelle sert de prétexte à un mini-jeu. Affiché une fois par appareil
// à l'ouverture du jeu, puis rappelé par une carte sur l'HP tant que le joueur n'a pas joué sa partie
// (au plus tard jusqu'à la date de fin). Une partie terminée clôt l'événement pour ce joueur, sur tous ses appareils.
// Ton factuel : on explique pourquoi les gens manifestent, sources à l'appui, sans prendre parti.
import { S, esc } from './common.js';

export const EVT_ACTU = {
  id: '2026-10-mobilisation-etudiante',
  fin: '2026-10-25T23:59:00+02:00',
  jeu: 'bouclage',
  ico: '📣',
  kicker: 'Actualité · Événement',
  titre: 'Mobilisation étudiante',
  court: 'Étudiants et élèves manifestent : ta zone encadre le cortège',
  chapeau: 'Depuis la rentrée, étudiants du supérieur et élèves du secondaire manifestent en Fédération Wallonie-Bruxelles : à Bruxelles mi-septembre, puis à Liège, Mons et Charleroi début octobre. Ta zone est appelée à encadrer un cortège jusqu’à ton hôtel de police.',
  pourquoi: [
    ['🎓', 'Le minerval', 'Dans le supérieur, il passe à près de 1 200 € pour plus de la moitié des étudiants (mesures du décret-programme). Selon la FEF, une année d’études coûte déjà entre 8 100 et 13 600 €, et 42 % des étudiants travaillent toute l’année.'],
    ['🏫', 'L’école', 'Les élèves du secondaire soutiennent leurs professeurs, opposés aux réformes de l’enseignement du gouvernement de la Fédération Wallonie-Bruxelles (MR – Les Engagés). Ils dénoncent les classes surchargées, les bâtiments vétustes et les profs absents non remplacés.'],
    ['🚌', 'Le transport', 'La hausse du prix des abonnements TEC pèse aussi sur les jeunes.'],
  ],
  terrain: 'La grande majorité manifeste pacifiquement. À Liège, une minorité de casseurs a provoqué des incidents : à toi de garder le cortège sous contrôle sans débordement.',
  sources: [
    ['Paris Match Belgique (7 octobre) : pourquoi les élèves du secondaire manifestent', 'https://www.parismatch.be/actualites/societe/2026/10/07/le-blocus-des-lyceens-francais-sexporte-en-belgique-pourquoi-nos-etudiants-du-secondaire-manifestent-ils-JRSQLVH4TNHWPADWTPONFEUSMU/'],
    ['RTBF (16 septembre) : les étudiants contre la hausse du minerval', 'https://www.rtbf.be/article/les-etudiants-se-mobilisent-a-bruxelles-contre-la-hausse-du-minerval-11786067'],
  ],
};

const cleJoue = () => `mazp-actu-joue-${EVT_ACTU.id}`;
/** Le joueur a terminé sa partie de l'événement (profil synchronisé, ou cet appareil). */
export const evtJoue = () => { if (S.player && S.player.actu && S.player.actu[EVT_ACTU.id]) return true; try { return !!localStorage.getItem(cleJoue()); } catch (e) { return false; } };
export const evtActif = (now = Date.now()) => now <= Date.parse(EVT_ACTU.fin) && !evtJoue();
/** Partie terminée : l'événement se ferme pour ce joueur. */
export async function marquerEvtJoue() {
  try { localStorage.setItem(cleJoue(), '1'); } catch (e) { /* pas de stockage */ }
  if (!S.user || !S.backend) return;
  const p = { ...(S.player || {}) }; p.actu = { ...(p.actu || {}), [EVT_ACTU.id]: Date.now() }; S.player = p;
  try { await S.backend.savePlayer(S.user.uid, p); } catch (e) { /* hors ligne : l'appareil s'en souvient */ }
}
const cle = () => `mazp-actu-vue-${EVT_ACTU.id}`;
const evtVu = () => { try { return !!localStorage.getItem(cle()); } catch (e) { return true; } };

/** Fenêtre de l'événement : pourquoi ils manifestent, sources, et le bouton qui lance le mini-jeu. */
export function ouvrirActu(lancer) {
  try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ }
  document.querySelector('.aide-wrap')?.remove();
  const E = EVT_ACTU;
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="actu-titre">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="kicker">${esc(E.kicker)}</span><h2 id="actu-titre" class="aide-titre">${E.ico} ${esc(E.titre)}</h2></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <p class="small" style="margin:0;line-height:1.45">${esc(E.chapeau)}</p>
    <span class="kicker" style="margin-top:2px">Pourquoi ils manifestent</span>
    <div class="col" style="gap:10px">${E.pourquoi.map(([ico, t, x]) => `<div class="row" style="gap:10px;align-items:flex-start">
      <span aria-hidden="true" style="font-size:22px;line-height:1.1">${ico}</span>
      <span class="small" style="line-height:1.4"><strong>${esc(t)}</strong><br><span class="muted">${esc(x)}</span></span></div>`).join('')}</div>
    <p class="small muted" style="margin:0;line-height:1.4">${esc(E.terrain)}</p>
    <div class="col" style="gap:4px">${E.sources.map(([t, u]) => `<a class="tiny" href="${esc(u)}" target="_blank" rel="noopener">↗ ${esc(t)}</a>`).join('')}</div>
    <button class="btn primary block" data-go>🛡️ Encadrer la manifestation</button>
    <button class="btn ghost small block" data-close>Plus tard</button>
  </div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-go]')) { e.stopPropagation(); fermer(); lancer(); return; }
    if (e.target === wrap || e.target.closest('[data-close]')) { e.stopPropagation(); fermer(); }
  });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
}

/** À l'ouverture du jeu (HP affichée) : montre l'événement une fois par appareil, pendant sa période. */
export function actuAuBesoin(lancer) {
  if (!evtActif() || S.actuMontree || evtVu() || S.tuto != null || document.querySelector('.aide-wrap, .mj-wrap')) return false;
  S.actuMontree = true;
  setTimeout(() => ouvrirActu(lancer), 400);
  return true;
}

/** Carte de l'HP tant que l'événement dure. */
export function actuHtml() {
  if (!evtActif()) return '';
  const E = EVT_ACTU;
  return `<section class="card" aria-label="${esc(E.titre)}" style="gap:8px;border-color:rgba(255,178,62,.45)">
    <div class="between"><span class="kicker">${esc(E.kicker)}</span><button type="button" class="tiny linkbtn" data-action="actu-voir" style="background:none;border:0;color:var(--blue-soft);padding:0;cursor:pointer">Pourquoi ils manifestent ?</button></div>
    <div class="row" style="gap:10px;align-items:center"><span aria-hidden="true" style="font-size:24px">${E.ico}</span>
      <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:700">${esc(E.titre)}</span><span class="tiny muted">${esc(E.court)}</span></span>
      <button class="btn primary small" data-action="actu-jouer">Encadrer</button></div>
  </section>`;
}
