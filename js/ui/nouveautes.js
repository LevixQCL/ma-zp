// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-10-05b-photos',
  titre: 'Quoi de neuf à la ZP ?',
  // Pop-up à l'ouverture : seulement ce que le joueur va découvrir et aimer (pas l'équilibrage).
  essentiel: [
    ['⛈️', 'Le Directeur', 'un maître du jeu veille sur ta zone : regarde le ciel de l’HP, il annonce la journée.'],
    ['🔎', 'Fouiller la scène', 'photos des pièces, scène à fouiller, réauditions et chronologie à reconstituer.'],
    ['🕯️', 'Un meurtre à Mons', 'la prochaine affaire se joue dans le vrai centre de Mons : cinq proches, cinq mensonges, un seul assassin.'],
    ['🕵️', 'L’ennemi de la saison', 'serre-le de près à chaque apparition, puis tout le district le coince le dernier soir.'],
    ['🤝', 'À deux, c’est mieux', 'fugitif à la frontière, défi en duo, dilemmes qui reviennent : le Directeur se souvient de tout.'],
  ],

  // Liste complète, dans le menu Nouveautés.
  sections: [
    ['Traque', [
      ['Suspect identifié', 'quand une zone démasque l’auteur, un bandeau le dit en haut de l’enquête (et sur le tableau) : qui l’a trouvé, et combien de tours il reste pour l’arrêter.'],
      ['Une seule nuit', 'la traque dure désormais une nuit : l’auteur identifié doit être arrêté avant le 20:00 suivant. Mettez-vous d’accord sur la radio pour fouiller des planques différentes.'],
      ['La planque reste secrète', 'le fin mot de l’affaire dans la Gazette ne dit plus où l’auteur se cache tant que la traque n’est pas finie.'],
      ['Indices lisibles', 'dans la carte de traque, les indices sur la planque sont affichés en entier (la rive était illisible).'],
      ['Édition spéciale', 'quand le maître du jeu met l’enquête en pause pendant une traque, la Gazette sort une édition spéciale chez tout le monde.'],
      ['Deux affaires différentes', 'une nouvelle affaire ne reprend plus le décor de celle qui vient d’être résolue.'],
    ]],
    ['Le Directeur, maître du jeu', [
      ['Le ciel du jour', 'en haut de l’HP : ciel clair (calme, le moment d’investir), ciel chargé (des signes, des tracas possibles), orage (grosse journée), puis éclaircie (rien de grave, de bonnes nouvelles). Touche-le pour l’explication.'],
      ['Fini les dés', 'les imprévus ne tombent plus au hasard chaque jour : ils suivent ce rythme, et une zone absente est laissée tranquille.'],
      ['Des coups durs mérités', 'ils visent ta plus grande faiblesse (Intervention pas formée, moral bas, paperasse, pas de logiciel), et le rapport dit pourquoi. Corrige-la et ils se font rares.'],
      ['Feuilletons', 'des histoires sur un ou plusieurs jours, annoncées dans la situation du jour avec ce qu’il faut faire ce soir : cambrioleur des toits (patrouilles dans un quartier), rodéos urbains, audit de l’Inspection, contrôle technique, évasion, fête de quartier. Réussi : points et satisfaction. Raté : l’histoire peut empirer.'],
      ['Dilemmes', 'une carte sur l’HP, deux choix : grogne au vestiaire, indic qui veut parler, journaliste, sponsor pour le combi. Le choix part avec tes ordres validés ; sans réponse, ton adjoint tranche.'],
      ['Événements du district', 'tempête, canicule, Fêtes du Delta, marathon : annoncés la veille, vécus par toutes les zones le même soir. La Gazette cite celles qui ont tenu bon.'],
      ['Héros du jour', 'pendant une éclaircie, une figure de ton équipe peut faire la une de la Gazette.'],
      ['Équitable', 'les zones en tête du classement sont surtout testées par des défis qui rapportent ; celles en difficulté ont des éclaircies plus longues et plus d’occasions (sponsor, indic).'],
      ['Énigmes à ta mesure', 'le niveau des énigmes du jour se décale d’un cran au plus par nuit selon tes réussites récentes et ton rang aux énigmes : jusqu’à 2 niveaux plus facile si ça coince, 1 plus difficile si tu enchaînes. Le dossier noir garde son niveau.'],
      ['Mini-jeux à ta mesure', 'les mini-jeux des incidents passent d’un cran plus facile si tu en rates souvent, d’un cran plus difficile si tu les réussis tous.'],
      ['L’ennemi de la saison', 'un malfaiteur insaisissable (le Fantôme du Delta, la Fouine…) apparaît dans une zone tous les deux ou trois jours : 3 patrouilles là où il est aperçu, et son dossier s’épaissit. Le dernier soir, l’« Opération Filet » réunit tout le district (Terrain) : plus le dossier est épais, moins il faut d’agents.'],
      ['Fugitif à la frontière', 'il se cache entre deux zones voisines : 2 patrouilles de chaque côté, le même soir. Sinon, une dernière chance le lendemain. Parlez-vous sur la radio !'],
      ['Défi en duo', 'deux zones proches au classement reçoivent le même feuilleton : réussi des deux côtés, +2 de réputation et +6 PS chacun.'],
      ['Appel du district', 'une zone en difficulté prise dans un orage appelle à l’aide automatiquement : le renfort y est payé ×1,5 (réputation, PS, points et indemnité).'],
      ['Il se souvient', 'l’indic payé revient avec un plus gros tuyau, la journaliste prend ta défense (ou en rajoute) lors d’une plainte, le sponsor du combi finit par faire parler de lui.'],
      ['Il lit ta façon de jouer', 'la même répartition plusieurs jours de suite finit par se voir ; l’argent qui dort attire du matériel fédéral à prix cassé ; une Proximité délaissée, des pétitions.'],
      ['Témoin tardif', 'si le district piétine sur l’enquête en fin de semaine, les zones à la traîne reçoivent une déposition qui permet d’écarter quelqu’un.'],
      ['Le parquet surveille', 'un dossier fait surtout des pièces des autres zones (au moins 6 reçues et 70 % du dossier) coûte 2 k€ et 1 de réputation par soir, et la moitié du mérite si tu identifies l’auteur. Avertissement dès 60 %. Ceux qui partagent ne sont jamais visés.'],
      ['Bon retour', 'après quelques jours d’absence, ton retour est salué et suivi de deux jours d’éclaircie.'],
      ['Pour le maître du jeu', 'l’écran « Maître du jeu » montre le ciel de chaque zone et ce que le Directeur prépare, règle son intensité et le nombre de feuilletons, et lance un événement du district.'],
    ]],
    ['Un meurtre à Mons (la prochaine affaire)', [
      ['Des pièces en photo', 'image de caméra horodatée, ticket de caisse, billet de train, agenda, machine à café, scellés : l’indice se lit dans l’image.'],
      ['La scène à fouiller', 'touche la photo de la scène au tableau : dix plots numérotés dans l’arrière-boutique, à examiner un par un. Rien n’est souligné.'],
      ['Réentendre un suspect', 'une fois par soir (1 k€), mets-lui une pièce sous les yeux : le journal, un PV, une vérification, même sa propre audition. Certaines le font changer de version.'],
      ['La chronologie', 'une frise de 20:00 à minuit, une ligne par suspect : place toi-même les événements que ton dossier t’a appris et vois où les versions ne tiennent pas.'],
      ['Des visages plus vrais', 'les portraits des suspects ressemblent désormais à des photos d’identité : modelé, regard, rides selon l’âge, grain photo.'],
      ['Une affaire écrite à la main', 'un antiquaire tué dans sa boutique, rue de la Clef. Cinq proches, et chacun ment sur quelque chose : un seul pour cacher le meurtre. Découvrir le secret d’un innocent explique son mensonge et le blanchit.'],
      ['Rien n’est signalé', 'certains indices sont sous les yeux de tous (dans le journal, dans un PV, dans une audition), d’autres sont des leurres. Lis tout, croise tout.'],
      ['La vraie ville', 'le plan est celui du centre de Mons. Touche un lieu : l’itinéraire à pied s’ouvre dans Google Maps. Une estimation suffit toujours. La boutique, la brasserie, le café et toutes les personnes sont inventés.'],
      ['Les démarches', 'légiste et labo, caméras et machines, bureau de la victime : chacune livre ses résultats un par un. Sur les suspects : vérifier l’alibi, téléphone et comptes, et la perquisition, que le juge n’autorise qu’avec une pièce sérieuse contre la personne au dossier.'],
      ['La confrontation', 'à la place de l’accusation : choisis un suspect et trois éléments à lui opposer (pièces de ton dossier, journal, PV). Bons éléments : aveux, l’affaire est résolue (pas de traque). Mauvais éléments : il nie et repart libre, tu recommences un autre jour (−1 de réputation). Mauvaise personne : le parquet te retire l’affaire.'],
    ]],
    ['Le dossier complet (affaires suivantes)', [
      ['Le journal du lendemain', 'à l’ouverture, La Gazette du Delta s’ouvre en plein écran : la nuit du vol, l’histoire des lieux, la victime, ce que l’on sait, le quartier sur un extrait du plan et les brèves du jour (lis-les : un pont fermé pour travaux change les trajets). Le journal reste punaisé au tableau, touche-le pour le relire.'],
      ['Des PV dans le dossier', 'le PV de premières constatations remplace le récit, et la boîte contient le PV d’audition de chaque suspect : son lien avec la victime, où il dit avoir été, comment il se déplace, ce qu’il répond aux rumeurs. Les vérifications arrivent en petits PV numérotés, signés par la zone qui les a obtenus.'],
      ['Un vrai plan routier', 'des rues nommées, trois ponts routiers, deux passerelles et la zone piétonne de la Grand-Place réservées aux vélos et aux piétons, une échelle. Les temps de trajet ne sont plus écrits : touche un lieu pour tracer l’itinéraire le plus court jusqu’à la scène, en voiture ou deux-roues, à vélo ou à pied, ou mesure n’importe quel trajet depuis le plan.'],
      ['Le véhicule compte', 'plus de suspects sans voiture : un trou de 15 minutes dans un alibi suffit en voiture, pas forcément à vélo ni à pied. Une camionnette louée (vérification des moyens) compte pour la soirée.'],
    ]],
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
      ['Ton équipe sur le terrain', 'chaque figure de « Mon équipe » encadre son service : +3 % sans surnom, +8 %, +14 %, puis +20 % au 3e surnom. Dans tes ordres (section « Mon équipe »), envoie-en une en mission chaque jour : mener l’assaut sur un secteur de la zone de non-droit (force +bonus, blessures divisées par deux) ou encadrer ton renfort chez un collègue (un agent de plus dans son dispositif). Son service perd son bonus ce jour-là.'],
      ['Équipe et trophées séparés', 'deux cartes sur l’HP : « Mon équipe » et « Mes trophées ».'],
      ['Dossiers en retard', 'sous la ligne Recherche des ordres, tes dossiers avec leur âge ; dès 5 jours, ils sont signalés (et sur l’HP). Tes enquêteurs traitent toujours les plus vieux d’abord.'],
      ['Messages codés abîmés', 'dès le niveau 2, des lettres du message sont effacées par des taches d’encre : il ne suffit plus de tourner le disque, il faut reconstituer les mots. Plus il y a de taches, plus le niveau est élevé.'],
      ['Ce que te donnent tes bâtiments', 'touche l’image de ton commissariat : chaque bâtiment montre ce qu’il te donne aujourd’hui et ce que t’apporterait le niveau suivant, et les annexes construites rappellent leur effet. La tuile Véhicules ouvre directement ton parc automobile.'],
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
      ['Dossier de rattrapage', 'une zone qui rejoint l’enquête en cours de semaine reçoit autant de pièces que la moyenne des autres zones, moins une : les constatations de la scène d’abord, puis des pièces au hasard sur les suspects. Jamais d’indice de planque.'],
      ['Photos à mémoriser', 'au niveau 5 des « deux photos » (la photo 1 disparaît), le changement est désormais franc : une voiture partie, arrivée ou d’une tout autre couleur, sur 12 places au lieu de 16. Plus de barres de toit ni de teinte voisine à retenir de mémoire.'],
      ['Résultats terrain', 'le bilan des points compte moins (×2 au lieu de ×2,5) et la composante pèse 25 % de l’IPZ au lieu de 30 % ; le moral passe de 15 % à 20 %. Correction : un appareil resté sur une ancienne version ne peut plus calculer le tour de 20:00 avec les anciennes règles (c’est ce qui avait donné un « 87 » incompréhensible au tour 5).'],
      ['Matériel Roulage', 'il ne donne plus +12 % d’amendes, qui faisait double emploi avec l’efficacité (plus d’efficacité = déjà plus d’amendes). À la place, chaque niveau repousse de 5 % des effectifs le seuil de la « chasse aux PV ». Former ou équiper ? Écrit en tête de chaque onglet : former = +20 %, gardé d’une saison à l’autre ; équiper = +8 % et un effet propre, immédiat, perdu en fin de saison.'],
      ['Le moral compte vraiment', 'au-dessus de 67, chaque point de moral vaut 2,5 fois plus qu’avant : 113 % d’efficacité à 75, 120 % à 80, 150 % à 100 (au lieu de 105 %, 108 % et 120 %). En contrepartie, un moral haut redescend plus vite chaque soir : 5 % de l’écart vers 60 entre 60 et 70, 10 % de 70 à 80, 15 % de 80 à 90, 20 % au-delà (au lieu de 8 % partout). Sous 67, rien ne change.'],
      ['Matériel utile', 'chaque matériel a maintenant son propre effet, par niveau : Intervention −15 % de risque de blessure, Roulage seuil de la « chasse aux PV » repoussé, Recherche +15 % de chances de pièce d’enquête, Proximité +0,5 de satisfaction par jour, Accueil +10 % de tracas internes évités. Le gain d’efficacité passe de 15 % à 8 % par niveau. La formation (+20 %, conservée d’une saison à l’autre) reste l’investissement de long terme, le matériel le coup de pouce immédiat et ciblé.'],
      ['Résultats terrain', 'nouveau calcul : 45 × part des incidents traités + 2,5 × bilan. Tes points (Recherche, flagrants, zone de non-droit, opérations) font davantage la différence. Tous les IPZ baissent un peu, de la même façon pour tout le monde.'],
      ['Moins de hasard', 'la Recherche rapporte des points chaque jour, au fil du travail sur les dossiers ; le flagrant délit suit une jauge qui se remplit avec tes patrouilles libres ; le bilan garde la moitié de celui de la veille.'],
      ['L’argent qui dort', 'au-delà de 75 k€ en caisse, la composante Budget de l’IPZ perd 1 point par k€ en plus (jusqu’à 50). Garde une réserve de 35 à 75 k€ et investis le reste. L’HP te prévient.'],
      ['Bonus de moral', 'énigmes, incident réussi, prime au personnel : plein effet sous 70 de moral, moitié de 70 à 85, +1 au-delà.'],
      ['Recrues', 'elles sortent de l’académie le soir et sont dans tes ordres dès le lendemain.'],
      ['Délinquance déplacée', 'quand tu concentres beaucoup d’agents sur un quartier, la délinquance qui part chez tes voisins compte vraiment chez eux.'],
    ]],
    ['Confort', [
      ['Crochetage sur ordinateur', 'à la souris, on ne pouvait pas tenir la tension et crocheter en même temps. Maintenant : souris sur Tension et Espace pour crocheter, ou clavier seul (flèches pour doser la tension, qui reste engagée toute seule, et Espace). En difficile, crans un peu plus larges, tension un peu plus stable, un tap raté secoue moins et 50 s au lieu de 45 : ça reste le niveau le plus exigeant.'],
      ['Ordres plus lisibles', 'chaque service affiche son résultat estimé sous son nom (incidents couverts, amendes, paperasse, dossiers), la réserve est une ligne de l’affectation, le rythme tient sur une ligne, et zone de non-droit, équipe, décision et dépenses sont regroupées dans une seule carte. Le bouton Valider reste visible tant que les ordres ne sont pas validés.'],
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
