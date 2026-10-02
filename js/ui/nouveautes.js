// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-10-02e',
  titre: 'Quoi de neuf à la ZP ?',
  // Pop-up à l'ouverture : seulement ce que le joueur va découvrir et aimer (pas l'équilibrage).
  essentiel: [
    ['🚨', 'Des incidents en journée', 'colis suspect, porte à crocheter, parking à débloquer… un mini-jeu tombe sur ta zone à une heure imprévue.'],
    ['🔐', 'Des énigmes à manipuler', 'cadenas à molettes, disque de décodage, plaques à rayer : on touche les objets.'],
    ['🎨', 'Des skins pour ton commissariat', 'réussis les incidents pour remplir ta jauge et débloquer un nouveau décor.'],
    ['🌆', 'Un nouveau look', 'le ciel du district suit l’heure réelle jusqu’au soir.'],
  ],
  // Liste complète, dans le menu Nouveautés.
  sections: [
    ['À découvrir', [
      ['Incidents du jour', 'une ou deux fois par jour, à une heure imprévue, un incident tombe sur un de tes services. L’HP affiche un compte à rebours, puis tu as 6 heures pour intervenir, avec un seul essai.'],
      ['Quatre mini-jeux', 'Intervention : un colis suspect à neutraliser avec la fiche SEDEE. Recherche : une porte à crocheter du bout des doigts. Roulage : un parking à débloquer pour la dépanneuse. Proximité : un rapport de domiciliation où trois erreurs se cachent.'],
      ['Récompenses des incidents', 'réussi : +5 PS et un bonus du service (Intervention du moral, Recherche un indice d’enquête, Roulage +2 k€, Proximité +2 de satisfaction). Raté ou abandonné : −1 de moral. Pas joué : ton équipe se débrouille seule, mieux si le service est bien fourni.'],
      ['La jauge des skins', '+2 par incident réussi sans faute, +1 sinon. À 50 points, un nouveau skin pour ton commissariat.'],
      ['Tuto et entraînement', 'chaque mini-jeu a son tuto. Pour t’exercer sans enjeu : écran Énigmes, onglet Entraînement.'],
      ['Des énigmes à manipuler', 'cadenas à molettes, cartes à remettre sur une ligne du temps, disque de décodage à tourner, vraies plaques belges à rayer, places et lieux à toucher sur la photo ou le plan, étiquettes de scellés, ligne de bus, échantillons d’écriture à comparer trait par trait.'],
      ['Nouveau look', 'toute l’interface a été redessinée : le ciel du district suit l’heure réelle jusqu’à 20:00, la barre d’onglets flotte en bas d’écran et les titres sont plus lisibles.'],
      ['IPZ du jour et moyenne', 'sur l’HP comme sur la carte, l’IPZ du jour et la moyenne de la saison (c’est la moyenne qui compte pour le classement).'],
    ]],
    ['Entraide et coopération', [
      ['Aider rapporte vraiment', 'les PS d’entraide (renfort, indices partagés, FIPA, zone de non-droit…) ont leur propre plafond de 30 par jour, en plus des 40. Un renfort rapporte, par agent prêté, 5 PS, 1 point de résultats terrain et 0,5 k€ d’indemnité fédérale, en plus de la réputation.'],
      ['Zone de non-droit mieux payée', 'chaque nuit où tu tiens un secteur, il rapporte jusqu’à 3 k€ selon ta part d’influence.'],
      ['Entraide entre zones', 'entre deux zones qui vont bien, l’entraide rapporte de la réputation une fois par semaine pour la même paire. Aider une zone en difficulté rapporte à chaque fois.'],
    ]],
    ['Règles et équilibrage', [
      ['Résultats terrain', 'nouveau calcul : 45 × part des incidents traités + 2,5 × bilan. Tes points (Recherche, flagrants, zone de non-droit, opérations) font davantage la différence. Tous les IPZ baissent un peu, de la même façon pour tout le monde.'],
      ['Moins de hasard', 'la Recherche rapporte des points chaque jour, au fil du travail sur les dossiers ; le flagrant délit suit une jauge qui se remplit avec tes patrouilles libres ; le bilan garde la moitié de celui de la veille.'],
      ['L’argent qui dort', 'au-delà de 60 k€ en caisse, la composante Budget de l’IPZ perd 1 point par k€ en plus (jusqu’à 50). Garde une réserve de 35 à 60 k€ et investis le reste. L’HP te prévient.'],
      ['Bonus de moral', 'énigmes, incident réussi, prime au personnel : plein effet sous 70 de moral, moitié de 70 à 85, +1 au-delà.'],
      ['Recrues', 'elles sortent de l’académie le soir et sont dans tes ordres dès le lendemain.'],
      ['Délinquance déplacée', 'quand tu concentres beaucoup d’agents sur un quartier, la délinquance qui part chez tes voisins compte vraiment chez eux.'],
    ]],
    ['Confort', [
      ['Jauges expliquées', 'Résultats terrain s’affiche sous tes jauges, et chaque bouton « ? » détaille le calcul avec tes chiffres. Sous le moral, l’efficacité de tes agents.'],
      ['Mises à jour sans accroc', 'après une mise à jour, ton téléphone charge directement la nouvelle version. Sans réseau, l’appli s’ouvre avec la dernière version connue.'],
      ['Plus solide', 'un ordre mal formé ne peut plus bloquer le calcul de 20:00, et l’appli télécharge beaucoup moins de données en arrière-plan.'],
    ]],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Du neuf à la ZP ! Des incidents tombent en journée sur ta zone (colis suspect, porte à crocheter, parking à débloquer…) : un mini-jeu, un seul essai. Les énigmes se jouent avec de vrais objets (cadenas, disque, plaques) et tu peux gagner des skins pour ton commissariat. Tout le détail, équilibrage compris : menu ⚙ de l'HP → Nouveautés.`;
}


const cle = () => `mazp-maj-vue-${NOTE_MAJ.id}`;
export function noteVue() { try { return !!localStorage.getItem(cle()); } catch (e) { return true; } }

/** Fenêtre « Nouveautés » : l'essentiel (à l'ouverture du jeu) ou la liste complète (menu de l'HP). */
export function ouvrirNouveautes({ complet = true } = {}) {
  try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ }
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  const corps = complet
    ? NOTE_MAJ.sections.map(([titre, pts]) => `<h3 class="kicker" style="margin:6px 0 0">${esc(titre)}</h3>
      <ul class="aide-liste">${pts.map(([t, x]) => `<li><strong>${esc(t)}</strong> : ${esc(x)}</li>`).join('')}</ul>`).join('')
    : `<div class="col" style="gap:10px">${NOTE_MAJ.essentiel.map(([ico, t, x]) => `<div class="row" style="gap:10px;align-items:flex-start">
        <span aria-hidden="true" style="font-size:22px;line-height:1.1">${ico}</span>
        <span class="small" style="line-height:1.4"><strong>${esc(t)}</strong><br><span class="muted">${esc(x)}</span></span></div>`).join('')}</div>`;
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="maj-titre">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="kicker">Nouveautés</span><h2 id="maj-titre" class="aide-titre">${esc(complet ? 'Toutes les nouveautés' : NOTE_MAJ.titre)}</h2></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    ${corps}
    ${complet ? '<p class="tiny muted" style="margin:0">Le guide du joueur est à jour. Bon jeu !</p>' : ''}
    <button class="btn primary block" data-close>C’est parti</button>
    ${complet ? '' : '<button class="btn ghost small block" data-tout>Voir toutes les nouveautés</button>'}
  </div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-tout]')) { e.stopPropagation(); fermer(); ouvrirNouveautes({ complet: true }); return; }
    if (e.target === wrap || e.target.closest('[data-close]')) { e.stopPropagation(); fermer(); }
  });
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
  setTimeout(() => ouvrirNouveautes({ complet: false }), 400);
}
