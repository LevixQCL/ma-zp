// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-09-29',
  titre: 'Mise à jour du 29 septembre',
  points: [
    ['Nouvel onglet Terrain', 'tout ce qui se passe chez toi, chez les voisins et dans le district, avec de quoi agir. L’Enquête est au centre de la barre du bas.'],
    ['Affaires disputées', 'la zone où l’affaire éclate la dirige ; les autres postulent depuis la Carte, et la zone qui dirige accepte ou refuse.'],
    ['Appel à renfort', 'pendant une opération d’envergure, demande des agents sur la radio ; les autres en prêtent pour la journée contre de la réputation.'],
    ['Messages privés', 'onglet Privé à côté de la Radio, avec les invitations qui t’attendent (FIPA, duels, candidatures, renforts).'],
    ['Nouvelle carte', 'plan de nuit, zoom sur ta zone, et un site sensible par zone (stade, usine Seveso, gare…) qui provoque ses propres imprévus.'],
    ['Logistique et budget', 'hôtel de police et garage à niveaux sur l’HP ; touche la tuile Budget pour le détail de ce qui coûte et rapporte.'],
    ['Énigmes', '11 types au lieu de 5 (plaque, photos, filature, écriture…) et tu peux en changer une par jour.'],
    ['Règles', 'recrues en 2 tours, formation et travaux en 1 tour ; à la fin de la saison, formations et bâtiments sont conservés (un niveau de moins).'],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Mise à jour de Ma ZP ! Nouvel onglet Terrain, affaires disputées dirigées par la zone concernée (les autres postulent), appels à renfort, messages privés, nouvelle carte avec un site sensible par zone, logistique et détail du budget, 11 types d’énigmes (une à changer par jour), délais raccourcis et héritage entre saisons. Tout le détail s’affiche à ta prochaine ouverture du jeu (ou HP → Nouveautés). Recharge la page si besoin !`;
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
  if (S.majMontree || noteVue() || document.querySelector('.aide-wrap')) return;
  S.majMontree = true;
  setTimeout(ouvrirNouveautes, 400);
}
