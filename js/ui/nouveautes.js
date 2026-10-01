// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-10-02c',
  titre: 'Mise à jour du 2 octobre : incidents du jour et résultats terrain',
  points: [
    ['Résultats terrain, moins de hasard', 'la Recherche rapporte des points chaque jour (+0,5 par unité de travail sur les dossiers) au lieu d’un gros paquet le jour où un dossier tombe, et le flagrant délit suit une jauge qui se remplit avec tes patrouilles libres au lieu d’un tirage au sort.'],
    ['Les gros coups comptent plus longtemps', 'les points vont dans un bilan qui garde la moitié de celui de la veille : une reprise dans la zone de non-droit pèse encore les jours suivants, et un jour creux ne fait plus tout chuter.'],
    ['Nouvelle jauge sur l’HP', 'Résultats terrain s’affiche sous tes jauges ; son bouton « ? » détaille d’où viennent tes points. Sous le moral, l’efficacité de tes agents (par exemple 104 % à 74 de moral), aussi rappelée dans le rapport du soir.'],
    ['Des incidents en journée', 'une ou deux fois par jour, à une heure imprévue, un incident tombe sur un de tes services. L’HP affiche un compte à rebours, puis tu as 6 heures pour intervenir.'],
    ['Quatre mini-jeux', 'Intervention : un colis suspect à neutraliser avec la fiche SEDEE. Recherche : une porte à crocheter du bout des doigts. Roulage : un parking à débloquer pour la dépanneuse. Proximité : un rapport de domiciliation où trois erreurs se cachent.'],
    ['Un seul essai', 'réussi : +5 PS et un bonus du service (Intervention +3 de moral, Recherche +1 indice d’enquête, Roulage +2 k€, Proximité +2 de satisfaction). Raté ou abandonné : −1 de moral, comme une énigme ratée. Pas joué : ton équipe se débrouille seule, mieux si le service est bien fourni.'],
    ['La jauge des skins', '+2 sans faute, +1 sinon. À 50 points, un nouveau skin pour ton commissariat.'],
    ['Tuto et entraînement', 'chaque mini-jeu a son tuto. Pour t’exercer sans enjeu : écran Énigmes, onglet Entraînement.'],
    ['Le cadenas', 'l’énigme du cadenas se joue maintenant sur un vrai cadenas à molettes : fais rouler les chiffres du doigt, puis tire l’anse.'],
    ['Nouveau look', 'toute l’interface a été redessinée : en haut de l’HP, le ciel du district suit l’heure réelle jusqu’à la résolution de 20:00, la barre d’onglets flotte en bas d’écran et les titres sont plus lisibles.'],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Mise à jour de Ma ZP : les incidents du jour ! Une ou deux fois par jour, à une heure imprévue, un incident tombe sur un de tes services : colis suspect, porte à crocheter, parking à débloquer, dossier à relire. Tu as 6 h pour jouer le mini-jeu, un seul essai. Réussi : PS, bonus et jauge des skins. Raté : −1 de moral. Entraînement dans l'écran Énigmes.`;
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
