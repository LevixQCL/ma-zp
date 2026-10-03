// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-10-03',
  titre: 'Quoi de neuf à la ZP ?',
  // Pop-up à l'ouverture : seulement ce que le joueur va découvrir et aimer (pas l'équilibrage).
  essentiel: [
    ['📌', 'Le tableau d’enquête', 'l’enquête s’affiche sur un grand tableau en liège : photos des suspects, fiches, pièces à punaiser où tu veux. Un petit tuto te le présente.'],
    ['🗺️', 'Le plan du district', 'les lieux des alibis et les temps de trajet : un trou dans un alibi ne suffit plus si la route est trop longue.'],
    ['🧵', 'Tire tes ficelles', 'relie les pièces, les suspects et les lieux d’une ficelle rouge, comme dans les films.'],
  ],
  // Liste complète, dans le menu Nouveautés.
  sections: [
    ['Le tableau d’enquête', [
      ['Un vrai tableau', 'l’écran Enquête s’ouvre sur un grand liège encadré de bois. Glisse pour te déplacer, pince ou utilise la molette pour zoomer, et le bouton « vue d’ensemble » montre tout le tableau.'],
      ['Rien n’est rangé pour toi', 'les pièces arrivent dans la boîte à pièces, chaque soir à 20:00. Sors-les une à une et punaise-les où tu veux : près d’un suspect, sur le plan, dans un coin.'],
      ['Des visages qui collent à la fiche', 'chaque suspect a son portrait d’après sa fiche : âge, cheveux gris, tenue de son métier (gilet fluo de l’intérimaire, polo du technicien, tablier du commerçant…).'],
      ['Ton tableau te suit', 'disposition, ficelles, ✓ / ✕ et notes sont enregistrés en ligne : range ton tableau sur ordinateur, retrouve-le sur ton téléphone.'],
      ['Les planques sur le plan', 'les six planques possibles sont punaisées sur leur rive du canal : touche-en une pour voir sa fiche et les indices, et marque-la (écartée, douteuse, retenue).'],
      ['Le récit au tableau', 'le procès-verbal d’ouverture et la main courante de l’enquête sont punaisés au tableau. Dès la prochaine affaire : la une de la Gazette, la photo de la scène et le dépôt de plainte de la victime, et des photos dans les coupures des rebondissements.'],
      ['Chaque pièce a son objet', 'alibi sur un ticket, moyens dans un sachet à scellé, mobile sur un extrait de compte, indices de planque sur un rapport du labo, rebondissements en coupure de journal.'],
      ['Le plan et les trajets', 'au centre, le plan du district : la scène, les lieux où les suspects disent avoir été et le temps de trajet. Dans les nouvelles affaires, il faut avoir eu le temps de faire la route pour profiter d’un trou dans son alibi.'],
      ['Tout depuis le tableau', 'touche une photo, une fiche, une pièce ou un lieu : ce qu’on sait, tes ✓ / ✕, les démarches, la piste, l’accusation et le partage. Le bouton « Ce soir » résume ce qui part avec tes ordres.'],
      ['Ficelles et mini tuto', 'glisse d’une punaise à un autre élément pour tirer une ficelle rouge ; attrape-la et tire-la hors de sa ligne pour la décrocher. Un tuto de six écrans présente le tableau (bouton « ? » pour le revoir). L’ancien affichage reste disponible avec le bouton liste.'],
    ]],
    ['À découvrir', [
      ['Écrans allégés', 'l’HP affiche la situation du jour en pastilles sous le compte à rebours (le détail reste dans les Ordres). À l’enquête, seul le rebondissement du jour s’affiche en grand, les précédents se rouvrent d’un geste, et les explications du voisinage et de l’appui fédéral sont derrière leur « ? ». Zone de non-droit : une ligne par secteur au lieu des calculs de force, tout le détail reste dans les Règles.'],
      ['Gazette plus courte', 'quand plusieurs zones décrochent le même trophée le même soir, le tableau d’honneur les cite sur une seule ligne au lieu de répéter la phrase.'],
      ['Appui fédéral à l’enquête', 'une fois par jour, demande le labo de la PJF (traces, empreintes, ADN) ou la RCCU (téléphones, ordinateurs, comptes en ligne) depuis la carte « Aujourd’hui » de l’enquête. Les équipes sont rares et partagées entre toutes les zones : réponse à 20:00, et un refus te rend prioritaire la fois suivante. Si l’équipe passe, tu joues son mini-jeu le lendemain (un seul essai) : réussi, une pièce sur un suspect arrive à 20:00.'],
      ['Stand de tir', 'nouvelle annexe à construire (10 k€, grande décision « Construire », entretien habituel des annexes) : Intervention +15 %, formation Intervention à moitié prix (2 k€) et sans agent absent, et des agents deux fois moins souvent blessés quand tu engages une grosse équipe sur une affaire ou à l’assaut de la zone de non-droit ; une rébellion ne blesse plus qu’un agent. Il apparaît dans l’aile des annexes de ton commissariat : béton insonorisé, porte blindée et voyant « tir en cours ».'],
      ['Annexes redessinées', 'chaque annexe a maintenant sa propre façade et on voit la pièce derrière la vitre : sac de frappe et haltères à la salle de sport, cible au fond du pas de tir, table et miroir sans tain en salle d’audition, baies de serveurs qui clignotent, comptoir d’accueil de l’antenne. Les lumières s’allument le soir. Les skins conteneurs, roulotte et serre ont été refaits dans le même esprit.'],
      ['Incidents du jour', 'une ou deux fois par jour, à une heure imprévue (entre 7 h et 19 h), un incident tombe sur un de tes services. L’HP affiche un compte à rebours, puis tu as 12 heures pour intervenir, avec un seul essai.'],
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
      ['Matériel utile', 'chaque matériel a maintenant son propre effet, par niveau : Intervention −15 % de risque de blessure, Roulage +12 % d’amendes, Recherche +15 % de chances de pièce d’enquête, Proximité +0,5 de satisfaction par jour, Accueil +10 % de tracas internes évités. Le gain d’efficacité passe de 15 % à 8 % par niveau. La formation (+20 %, conservée d’une saison à l’autre) reste l’investissement de long terme, le matériel le coup de pouce immédiat et ciblé.'],
      ['Résultats terrain', 'nouveau calcul : 45 × part des incidents traités + 2,5 × bilan. Tes points (Recherche, flagrants, zone de non-droit, opérations) font davantage la différence. Tous les IPZ baissent un peu, de la même façon pour tout le monde.'],
      ['Moins de hasard', 'la Recherche rapporte des points chaque jour, au fil du travail sur les dossiers ; le flagrant délit suit une jauge qui se remplit avec tes patrouilles libres ; le bilan garde la moitié de celui de la veille.'],
      ['L’argent qui dort', 'au-delà de 75 k€ en caisse, la composante Budget de l’IPZ perd 1 point par k€ en plus (jusqu’à 50). Garde une réserve de 35 à 75 k€ et investis le reste. L’HP te prévient.'],
      ['Bonus de moral', 'énigmes, incident réussi, prime au personnel : plein effet sous 70 de moral, moitié de 70 à 85, +1 au-delà.'],
      ['Recrues', 'elles sortent de l’académie le soir et sont dans tes ordres dès le lendemain.'],
      ['Délinquance déplacée', 'quand tu concentres beaucoup d’agents sur un quartier, la délinquance qui part chez tes voisins compte vraiment chez eux.'],
    ]],
    ['Confort', [
      ['Jauges expliquées', 'Résultats terrain s’affiche sous tes jauges, et chaque bouton « ? » détaille le calcul avec tes chiffres. Sous le moral, l’efficacité de tes agents.'],
      ['Affichage sur ordinateur', 'sur un écran de PC, l’HP passe sur deux colonnes, les autres écrans s’élargissent, le texte est un peu plus grand et les mini-jeux s’ouvrent au centre, au format téléphone. Rien ne change sur téléphone et tablette.'],
      ['Mises à jour sans accroc', 'après une mise à jour, ton téléphone charge directement la nouvelle version. Sans réseau, l’appli s’ouvre avec la dernière version connue.'],
      ['Plus solide', 'un ordre mal formé ne peut plus bloquer le calcul de 20:00, et l’appli télécharge beaucoup moins de données en arrière-plan.'],
    ]],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Du neuf à la ZP ! L’enquête se joue maintenant sur un grand tableau en liège : photos des suspects, pièces à punaiser toi-même, ficelles rouges et plan du district avec les temps de trajet. Un petit tuto te le présente à l’ouverture de l’écran Enquête.`;
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
