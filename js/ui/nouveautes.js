// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-09-30i',
  titre: 'Mise à jour du 30 septembre : ton commissariat prend vie',
  points: [
    ['Personnalise ton commissariat', 'façade (brique, pierre bleue, verre, art déco…), couleur du néon et abords (arbres, fresque, horloge, toit végétalisé…). Tout se débloque avec ton grade et tes trophées : ouvre la fiche « Mon hôtel de police » depuis l’image de l’HP.'],
    ['Va voir chez les voisins', 'sur la Carte, l’œil à côté de chaque zone montre son commissariat ; dans le classement, touche le nom d’une zone.'],
    ['La scène raconte ta journée', 'drapeau en berne si le moral chute, file de citoyens si la satisfaction baisse, imprévus de la veille (grève, fuite d’eau, cheval sur la route, équipe de télé…), barrières pendant une opération, combis cabossés.'],
    ['Météo et fêtes', 'pluie ou neige certains jours (la même pour tout le monde), drapeaux belges le 21 juillet, guirlandes en fin d’année.'],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Mise à jour de Ma ZP ! Personnalise ton commissariat (façade, néon, abords) avec ce que ton grade et tes trophées débloquent, et va voir celui des autres depuis la Carte (l'œil) ou le classement. La scène montre aussi ta journée : moral, imprévus, météo et fêtes.`;
}


const cle = () => `mazp-maj-vue-${NOTE_MAJ.id}`;
export function noteVue() { try { return !!localStorage.getItem(cle()); } catch (e) { return true; } }

/** Fenêtre « Nouveautés ». */
export function ouvrirNouveautes() {
  try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ }
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="maj-titre">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="kicker">Nouveautés</span><h2 id="maj-titre" class="aide-titre">${esc(NOTE_MAJ.titre)}</h2></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <ul class="aide-liste">${NOTE_MAJ.points.map(([t, x]) => `<li><strong>${esc(t)}</strong> : ${esc(x)}</li>`).join('')}</ul>
    <p class="tiny muted" style="margin:0">Le guide du joueur est à jour. Bon jeu !</p>
    <button class="btn primary block" data-close>C’est parti</button>
  </div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) { e.stopPropagation(); fermer(); } });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
}

/** À appeler après l'affichage de l'HP : montre la note une fois par appareil. */
export function nouveautesAuBesoin() {
  if (S.majMontree || noteVue() || S.tuto != null || document.querySelector('.aide-wrap')) return;
  S.majMontree = true;
  // Nouveau joueur : les « nouveautés » ne le concernent pas, il découvre tout en même temps.
  const z = S.state && S.user && S.state.zones[S.user.uid];
  if (z && !z.toursJoues) { try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ } return; }
  setTimeout(ouvrirNouveautes, 400);
}
