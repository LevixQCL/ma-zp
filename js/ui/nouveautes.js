// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-09-29e',
  titre: 'Mise à jour du 29 septembre (soir)',
  points: [
    ['Carte', 'le district s’agrandit quand une zone arrive : la carte dézoome et la nouvelle zone s’installe en bordure, sans déplacer les autres.'],
    ['Agents en mission', 'audition, traque et FIPA sortent du total à répartir (« 20 disponibles, dont 2 en mission : 18 à répartir ») et partent d’abord parmi les agents laissés libres.'],
    ['Mon équipe', 'tu peux renommer les membres de ton équipe.'],
    ['Où sont mes agents ?', 'dans tes ordres, sous « Affectation » : le détail de ton effectif, les agents bloqués, un bouton pour les rapatrier et un autre pour répartir les libres. Sous chaque service, tu vois aussi ceux qui partent en audition, en traque ou en FIPA.'],
    ['Grande décision', 'chaque option affiche ce qu’elle change pour ta zone, chiffré sur ta répartition du jour (incidents, amendes, rentabilité, entretien).'],
    ['Économie', 'dotation fédérale 10 k€ par tour (au lieu de 8), matériel moins cher (5, 7, 9, 11 k€) et plus efficace (+15 % par niveau), annexes à 10 k€. Caméras de lecture de plaques : radars automatiques +1 k€ par tour en plus de Roulage +20 %.'],
    ['Véhicules', 'chaque intervention use le parc ; sous 80 % d’état, l’Intervention perd de l’efficacité. Nouvelle dépense du jour : révision du parc (2 k€, +20 %).'],
    ['Énigmes', '3 sur 3 : prime « sans faute » de +3 k€ et +2 de moral en plus du bonus. Message codé plus retors (groupes de 5 lettres, mots-clés). « Qui ment ? » : la règle du menteur est expliquée.'],
    ['Affaires disputées', 'toujours dirigées par une zone, et jamais deux dans la même zone.'],
    ['Diplomatie', 'la liste des zones en difficulté (péril, coup dur) avec le gain de réputation ; les manœuvres expliquent ce que tu gagnes, ce que subit la cible et comment elle se protège.'],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Mise à jour de Ma ZP ! Détail « Où sont mes agents ? » avec rapatriement, grandes décisions chiffrées, dotation à 10 k€ et matériel moins cher, usure et révision des véhicules, prime « sans faute » aux énigmes, message codé plus retors, entraide et manœuvres expliquées. Recharge la page si besoin !`;
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
