// Quatrième affaire écrite à la main : « Quatre-vingt-quatorze secondes » (Mons). Pas de meurtre : un médaillon.
// Bible complète (vérité, chronologie, personnages, révélations) : hors dépôt (projet Claude « MA ZP »).
// NE PAS résumer l'intrigue ici : le maître du jeu veut jouer cette affaire.
// Même moteur que les autres affaires écrites (meurtre: true) : confrontation, recoupements, déclic, hypothèse, mobile.
// Les rues et les monuments sont réels ; la salle, l'association, l'atelier, l'objet et les personnes sont fictifs.

const hm = (h, m) => h * 60 + m;

// Lieux du plan (coordonnées du plan 880 × 900) et adresse pour l'itinéraire Google Maps.
export const LIEUX_MEDAILLON = {
  scene: { nom: 'La Salle du Cercle', sous: 'derrière l’hôtel de ville · la soirée', x: 476, y: 352, adresse: 'Jardin du Mayeur, 7000 Mons' },
  parking: { nom: 'Le parking arrière', sous: 'derrière la salle · entrée de service', x: 506, y: 330, adresse: 'Jardin du Mayeur, 7000 Mons' },
  banque: { nom: 'L’agence bancaire', sous: 'Grand-Place · le coffre du médaillon', x: 430, y: 420, adresse: 'Grand-Place, 7000 Mons' },
  grandplace: { nom: 'Grand-Place', x: 449, y: 412, adresse: 'Grand-Place, 7000 Mons', repere: true },
  beffroi: { nom: 'Beffroi', x: 370, y: 384, adresse: 'Beffroi de Mons', repere: true },
  collegiale: { nom: 'Collégiale Sainte-Waudru', x: 262, y: 500, adresse: 'Collégiale Sainte-Waudru, Mons', repere: true },
  gare: { nom: 'Gare de Mons', x: 40, y: 416, adresse: 'Gare de Mons, 7000 Mons', repere: true },
  hyon: { nom: 'Hyon ↘', sous: 'l’atelier de Mireille Cauchie, à 3 km', x: 800, y: 830, adresse: 'Hyon, 7020 Mons', horsPlan: true },
  ghlin: { nom: '↖ Ghlin', sous: 'chez Georges Lemmens, à 5 km', x: 60, y: 120, adresse: 'Ghlin, 7011 Mons', horsPlan: true },
  symphorien: { nom: 'Saint-Symphorien →', sous: 'chez Séverine Wattiez, à 6 km', x: 840, y: 420, adresse: 'Saint-Symphorien, 7030 Mons', horsPlan: true },
  cuesmes: { nom: '↙ Cuesmes', sous: 'chez Damien Hallez, à 4 km', x: 70, y: 700, adresse: 'Cuesmes, 7033 Mons', horsPlan: true },
  anvers: { nom: '↑ Anvers', sous: 'à 85 km', x: 600, y: 60, adresse: 'Anvers, Belgique', horsPlan: true },
};

const SUSPECTS = [
  {
    nom: 'Mireille Cauchie', photo: 'img/medaillon/p0.webp', prenom: 'Mireille', f: true, age: 58, role: 'restauratrice d’orfèvrerie', roleDetail: 'atelier à Hyon ; a restauré le médaillon au printemps', proche: false,
    vehicule: { t: 'le bus (pas de permis)', mode: 'pied', rien: true },
    alibi: { type: 'couvre', pos: 'scene', lieu: 'à la soirée, dans la salle, sans s’éloigner de la vitrine', ditDe: hm(19, 30), ditA: hm(22, 0) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit être arrivée « vers sept heures et demie » et être restée dans la salle pendant la coupure, près de la vitrine.', rumeur: 'Rumeur : elle a eu le médaillon entre les mains tout le printemps, et elle tournait autour de la vitrine toute la soirée, « comme une mère poule ».' },
  },
  {
    nom: 'Camille Ronveaux', photo: 'img/medaillon/p1.webp', prenom: 'Camille', f: true, age: 31, role: 'photographe engagée pour la soirée', roleDetail: 'indépendante, habite le centre', proche: false,
    vehicule: { t: 'un scooter', mode: 'moteur' },
    alibi: { type: 'couvre', pos: 'scene', lieu: 'à la soirée, derrière son appareil', ditDe: hm(18, 50), ditA: hm(22, 0) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir photographié la soirée du début à la fin, et n’avoir « protégé que son matériel » pendant la coupure.', rumeur: 'Rumeur : seule à avoir photographié la vitrine de près, avant tout le monde. Et on l’a vue fouiller son sac dans le noir.' },
  },
  {
    nom: 'Georges Lemmens', photo: 'img/medaillon/p2.webp', prenom: 'Georges', f: false, age: 66, role: 'collectionneur, ancien négociant en vins', roleDetail: 'habite Ghlin ; a voulu racheter le médaillon l’an dernier', proche: false,
    vehicule: { t: 'une berline grise', mode: 'moteur' },
    alibi: { type: 'couvre', pos: 'scene', lieu: 'à la soirée, arrivé « vers sept heures et demie »', ditDe: hm(19, 30), ditA: hm(22, 0) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit être arrivé « vers sept heures et demie » et n’avoir « pas bougé d’un centimètre » pendant la coupure.', rumeur: 'Rumeur : l’association a refusé de lui vendre le médaillon l’an dernier. Il est resté collé à la vitrine toute la soirée.' },
  },
  {
    nom: 'Damien Hallez', photo: 'img/medaillon/p3.webp', prenom: 'Damien', f: false, age: 41, role: 'trésorier de l’association', roleDetail: 'électricien de métier ; habite Cuesmes', proche: true,
    vehicule: { t: 'une camionnette d’artisan', mode: 'moteur' },
    alibi: { type: 'couvre', pos: 'scene', lieu: 'à la soirée, au bar avec le traiteur', ditDe: hm(18, 15), ditA: hm(22, 0) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir aidé le traiteur au bar toute la soirée, et être « resté avec les invités » pendant la coupure.', rumeur: 'Rumeur : c’est l’électricien de la bande. Une coupure de 94 secondes, juste quand il faut, « ça ne tombe pas du ciel ».' },
  },
  {
    nom: 'Séverine Wattiez', photo: 'img/medaillon/p4.webp', prenom: 'Séverine', f: true, age: 49, role: 'secrétaire générale de l’association, organisatrice de la soirée', roleDetail: 'habite Saint-Symphorien ; a donné l’alerte', proche: true,
    vehicule: { t: 'une petite citadine bleue', mode: 'moteur' },
    alibi: { type: 'couvre', pos: 'scene', lieu: 'à la soirée, qu’elle organisait, près de l’entrée pendant la coupure', ditDe: hm(18, 30), ditA: hm(22, 0) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir réceptionné le médaillon, l’avoir installé, et être restée près de l’entrée pour rassurer les invités pendant la coupure.', rumeur: 'Rumeur : c’est elle qui a vu la première que ce n’était plus le bon. « Elle connaît ce médaillon mieux que personne », dit la présidente.' },
  },
];
const COUPABLE = 4;

const AUDITIONS = [
  [
    ['Quel est votre lien avec le médaillon ?', 'Je l’ai restauré en avril : un nettoyage, rien de plus. Un bel objet. Fragile, l’émail.'],
    ['À quelle heure êtes-vous arrivée ?', 'Vers sept heures et demie. Le bus, vous savez.'],
    ['Où étiez-vous pendant la coupure ?', 'Dans la salle. Près de la vitrine. Je n’ai pas bougé.'],
    ['On vous a vue tourner autour de la vitrine.', 'Une restauratrice regarde toujours son travail. C’est un réflexe, pas un crime.'],
    ['Avez-vous quelque chose à ajouter ?', 'Cherchez quelqu’un qui sait ouvrir cette cloche. Ce n’est pas sorcier : quatre vis.'],
  ],
  [
    ['Quel était votre travail ce soir-là ?', 'Les photos officielles : la vitrine avant l’ouverture, puis l’ambiance, le discours, les petits fours.'],
    ['Quand avez-vous photographié la vitrine ?', 'À sept heures six, juste après l’installation. C’était le seul moment sans personne devant.'],
    ['Où étiez-vous pendant la coupure ?', 'Je protégeais mon matériel. Un flash, ça coûte cher.'],
    ['On vous a vue fouiller votre sac dans le noir.', 'J’ai changé de carte mémoire. Ça arrive.'],
    ['Avez-vous quelque chose à ajouter ?', 'Mes fichiers sont à votre disposition. Les fichiers bruts, même : en pleine résolution.'],
  ],
  [
    ['Quel est votre intérêt pour ce médaillon ?', 'Esthétique. Historique. J’ai fait une offre l’an dernier, très correcte. Refusée. Je ne suis pas rancunier.'],
    ['À quelle heure êtes-vous arrivé ?', 'Vers sept heures et demie, comme tout le monde.'],
    ['Où étiez-vous pendant la coupure ?', 'Je n’ai pas bougé d’un centimètre. À mon âge, dans le noir, on reste où on est.'],
    ['On vous a vu collé à la vitrine.', 'Quand on aime un objet, on le regarde. Vous préférez qu’on regarde les petits fours ?'],
    ['Avez-vous quelque chose à ajouter ?', 'Une copie, dites-vous ? Alors l’original est quelque part. Et ce n’est pas chez moi.'],
  ],
  [
    ['Quel était votre rôle ce soir-là ?', 'Le bar, avec le traiteur. Et je suis le trésorier : les comptes, les assurances, les factures.'],
    ['Où étiez-vous pendant la coupure ?', 'Avec les invités. J’ai rassuré tout le monde.'],
    ['Vous êtes électricien.', 'Et alors ? Une salle de 1900, des fils de 1960 : ça saute tout seul.'],
    ['À quelle heure êtes-vous arrivé ?', 'Six heures et quart, pour monter le bar.'],
    ['Avez-vous quelque chose à ajouter ?', 'La présidente voulait une expertise demain matin. Si j’étais vous, je me demanderais à qui ça faisait peur.'],
  ],
  [
    ['Racontez-nous la réception du médaillon.', 'Le convoyeur de la banque me l’a remis à six heures et demie. Je l’ai monté au bureau, j’ai vérifié, et je l’ai installé dans la vitrine juste avant la photo.'],
    ['Où étiez-vous pendant la coupure ?', 'Près de l’entrée. Soixante personnes dans le noir : il fallait rassurer.'],
    ['Comment avez-vous vu que c’était une copie ?', 'Je le connais par cœur. Vingt ans que je m’occupe de cette association.'],
    ['Qui pouvait ouvrir la vitrine ?', 'N’importe qui avec le tournevis du loueur : il était dans le tiroir du socle. Quatre vis, une minute.'],
    ['Avez-vous quelque chose à ajouter ?', 'Mireille Cauchie a restauré le médaillon au printemps. Je ne veux accuser personne. Mais demandez-lui ce qui s’est passé dans son atelier.'],
  ],
];

const TEXTES = {
  // Scène : l'objet et la vitrine.
  'c:vitrine': 'La vitrine : une cloche de verre posée sur un socle de bois, fixée par quatre vis à empreinte spéciale. L’outil, fourni par le loueur, est dans le tiroir du socle, qui ne ferme pas à clé. Le labo chronomètre : dévisser, ouvrir, revisser, une soixantaine de secondes pour quelqu’un qui sait où est l’outil. Aucune empreinte exploitable sur les vis ni sur le verre, à part des traces de doigts d’invités sur le haut de la cloche. Photo du labo à 21:40, sous la cloche : la bélière tournée vers deux heures, un pli en Z dans le velours à gauche, et un fil blanc de deux centimètres juste sous le médaillon.',
  'c:copie': 'Examen de l’objet saisi dans la vitrine : une reproduction de bonne qualité. Ø 46,0 mm, laiton doré à l’or fin, émail « à froid » (une résine bleue, pas de l’émail cuit). L’émail est d’un bleu égal sur toute la surface, sans la moindre reprise. Au revers, la gravure « M·17 » est nette, le dernier trait complet. Travail d’atelier de reproduction, fait d’après des photographies : aucune marque d’atelier.',
  'c:archive': 'Fiche d’expertise de l’assureur, mars 2024, avec photos rapprochées : Ø 46,1 mm, or 18 carats, émail bleu cuit, « état de conservation remarquable, émail intact ». Au revers, gravure « M·17 » : le dernier trait est interrompu sur 0,8 mm, « défaut d’origine, permet d’authentifier la pièce ». La fiche est conservée au secrétariat de l’association ; une copie chez l’assureur.',
  // Scène : la soirée en images.
  'c:photo': 'La photo officielle de la vitrine, fichier de Camille Ronveaux, horodaté 19:06:12 par l’appareil : le médaillon au centre du velours, pris à 2,40 m, éclairé par deux spots. On ne distingue ni l’émail en détail ni le revers ; on voit la bélière, tournée vers deux heures, un pli en Z dans le velours à gauche, et un petit fil blanc sous le médaillon. Camille : « Séverine l’a descendu du bureau à 19:03, la caisse déjà ouverte, elle l’avait vérifié là-haut. Elle l’a posé, revissé la cloche, et m’a dit : vas-y, fais ta photo. »',
  'c:coupure': 'Journal du tableau électrique : le circuit C-4 (appliques de la salle, et la prise de service derrière le rideau) disjoncte à 20:41:00 et se réarme à 20:42:34, soit 94 secondes. L’éclairage de secours ne couvre que les sorties. Sur le tableau, scotchée, une fiche d’intervention manuscrite : « Plancha traiteur sur prise de service — D. Hallez — 20:37 ».',
  'c:discours': 'Vidéo du discours de la présidente, Monique Druart, filmée par un invité, 20:29 à 20:34 : « … et pour que tout soit parfait avant la presse, l’expert de notre assureur examinera le médaillon demain matin, à neuf heures. Je l’ai décidé cet après-midi, je ne l’ai encore dit à personne. » Applaudissements. Au premier rang, Séverine Wattiez pose son verre sur une table. Georges Lemmens, à côté de la vitrine, applaudit.',
  // Scène : les témoins.
  'c:convoyeur': 'Fabio Maes, convoyeur de la banque : « J’ai sorti la caisse du coffre à 18:10. Scellé SR-0448 intact. Remise à 18:32 à Mme Wattiez, à l’entrée de service ; elle a signé. Je lui ai demandé si elle voulait vérifier le contenu devant moi. Elle m’a dit : “je vérifierai là-haut”. La case “contenu vérifié” est restée vide. »',
  'c:gardien': 'Ahmed Bouzid, gardien de la salle : « Le badge du bureau B-2 ne s’ouvre qu’avec les badges du secrétariat. Vers 19:12, Mme Wattiez est sortie par l’entrée de service avec une enveloppe rigide, crème, sous le bras. Elle est allée vers le parking arrière et elle est revenue quatre minutes après, les mains vides. Les invités sont entrés par la grande porte à partir de 19:25 ; là, je ne note pas les noms. »',
  'c:expert': 'Pierre-Yves Lauwers, expert-conservateur, appelé à 21:12 : « Il m’a fallu la loupe et la fiche de 2024 pour en être sûr : l’émail, la gravure du revers. Le travail est bon. À deux mètres, sous ces spots, avec la cloche ? Je ne pourrais pas le dire. Personne ne pourrait. Il faut l’avoir en main. »',
  // Mireille (0).
  'occ:0': 'Mireille Cauchie : jeudi, un client a payé un nettoyage d’argenterie à son atelier de Hyon à 19:18 (terminal de paiement). Carte de bus validée à 19:26 à Hyon, arrivée à la salle à 19:44 (le gardien s’en souvient : « elle s’est trompée de porte »). Pendant la coupure, Inès Vasseur, son assistante, la voit sortir dans le couloir, le téléphone à l’oreille.',
  'mob:0': 'GSM de Mireille Cauchie : jeudi, de 20:41 à 20:44, appel à son assureur en responsabilité professionnelle. En avril, trois appels au même assureur, puis aucun. Un courriel d’avril à Séverine Wattiez, retrouvé dans sa boîte d’envoi : « J’ai fait un éclat dans l’émail, à sept heures, en démontant la bélière. Je l’ai repris. Si la photo de référence ressort, je suis finie. N’en parle à personne. »',
  'moy:0': 'Perquisition à l’atelier de Mireille Cauchie, Hyon : le carnet de restauration, deux lignes du 14 avril réécrites à l’encre plus sombre (« reprise du bleu, bord inférieur »). Une photo prise par son assistante le 14 avril : un éclat de 1,4 mm dans l’émail, à sept heures. Un pot d’émail bleu, « teinte approchante ». Pas de médaillon, pas de moule, pas de résine.',
  // Camille (1).
  'occ:1': 'Ahmed Bouzid, le gardien : Camille Ronveaux est arrivée à 18:50 et ils ont réglé ensemble les deux spots de la vitrine jusqu’à 19:03, le socle vide. Puis Séverine Wattiez est descendue avec la caisse. Pendant la coupure, un invité la voit accroupie près de son sac, à l’autre bout de la salle, la lampe du téléphone allumée.',
  'mob:1': 'GSM de Camille Ronveaux : 37 messages échangés avec Damien Hallez entre 18:00 et 20:00, effacés de son côté, retrouvés chez l’opérateur. Ton intime. Un message de 20:43 : « J’ai changé la carte. Rien ne sort. »',
  'moy:1': 'Perquisition chez Camille Ronveaux : deux cartes mémoire, dont une de photos privées (elle et Damien Hallez). Et le fichier brut de la photo de 19:06, en pleine résolution : agrandi, l’émail du médaillon est d’un bleu parfaitement égal, sans aucune reprise plus sombre à sept heures.',
  // Georges (2).
  'occ:2': 'Parking arrière : le ticket de Georges Lemmens est entré à 19:27. Le serveur du traiteur le voit au vestiaire à 19:31. Pendant toute la coupure, son voisin, un viticulteur de Ghlin, a gardé la lampe de son téléphone braquée sur la vitrine « par réflexe » : personne n’a touché la cloche, Georges Lemmens non plus. Il a seulement glissé « quelque chose » dans la poche intérieure de sa veste.',
  'mob:2': 'Comptes et GSM de Georges Lemmens : le 12 octobre à 11:02, retrait de 6 000 € en liquide au guichet de l’agence de la Grand-Place. Un message à Séverine Wattiez, mardi : « Samedi comme convenu. Le reste en liquide, à la remise. » Il appelle un antiquaire de Bruges deux fois par mois.',
  'moy:2': 'Perquisition chez Georges Lemmens, Ghlin : une collection sous vitrines, en ordre. Un reliquaire en argent sans aucun papier de provenance (ce qu’il cachait dans sa veste jeudi : il venait de le récupérer d’un vendeur, à la soirée). Dans le bureau, un certificat de vente vierge, préparé à l’avance : « Médaillon d’Aulne, or et émail, cédé par… ». Pas de médaillon.',
  // Damien (3).
  'occ:3': 'Le traiteur et ses deux serveurs : Damien Hallez a monté le bar avec eux de 18:15 à 19:20, sans s’absenter. Badge du local technique à 20:36. Pendant la coupure, le badge du bureau B-1 (comptabilité, pas le secrétariat) s’ouvre à 20:41:40 avec le sien.',
  'mob:3': 'Comptes de Damien Hallez et de l’association : depuis juin, 2 400 € retirés de la caisse de l’association en liquide, avec des reçus « frais de salle » qu’aucun loueur n’a émis. Les 37 messages avec Camille Ronveaux.',
  'moy:3': 'Perquisition chez Damien Hallez, Cuesmes : dans sa camionnette, une enveloppe de reçus de l’association, repris jeudi au bureau B-1. Une rallonge électrique noircie. Pas de médaillon.',
  // Séverine (4).
  'occ:4': 'Journal de la serrure à badge du bureau B-2 (secrétariat, premier étage) : jeudi, entrée à 18:34 avec le badge de Séverine Wattiez, sortie à 18:59. Aucun autre badge de 17:00 à 21:30. Le convoyeur l’a vue monter avec la caisse. Pendant la coupure, plusieurs invités la situent près de l’entrée, le téléphone à la main.',
  'mob:4': 'Comptes et GSM de Séverine Wattiez : une saisie sur salaire depuis juin (anciennes dettes de la société de son ex-mari). Le 12 octobre à 11:40, dépôt de 6 000 € en liquide au guichet de l’agence de la Grand-Place. Un message de Georges Lemmens, mardi : « Samedi comme convenu. Le reste en liquide, à la remise. » Elle a aussi, depuis août, un second numéro : une carte prépayée, rechargée en liquide.',
  'moy:4': 'Perquisition chez Séverine Wattiez, Saint-Symphorien : dans une boîte à biscuits, au fond d’une armoire de cuisine, une enveloppe rigide crème. Dedans, un médaillon d’or et d’émail : Ø 46,1 mm, un éclat repris d’un bleu plus sombre à sept heures, et au revers « M·17 », le dernier trait interrompu. L’original. Dans un tiroir, le bon de commande d’un atelier d’Anvers, août : « reproduction médaillon émaillé Ø 46, d’après photos, 1 450 € payés en liquide ».',
  // Rebondissements.
  'r:presidente': 'Monique Druart, la présidente, au commissariat : « L’expertise de demain, je l’ai décidée jeudi à cinq heures, au téléphone avec l’assureur : il la demandait avant l’ouverture au public. Je ne l’ai dite à personne avant mon discours, je voulais faire la surprise à la presse. Séverine ? Elle n’était pas au courant, non. Elle aurait dû l’être, c’est la secrétaire. »',
  'r:ines': 'Inès Vasseur, l’assistante de Mireille Cauchie, se présente avec une clé USB : « Je ne peux plus me taire. En avril, Mireille a fait un éclat dans l’émail en démontant la bélière. Elle l’a repris, et elle a réécrit le carnet. Voici la photo que j’ai prise ce jour-là. Elle avait une peur bleue de l’expertise. »',
  'r:assureur': 'L’assureur de l’association répond : le contrat exige une expertise annuelle ; la dernière date de mars 2024 (fiche avec photos). En juin 2025, un collectionneur, Georges Lemmens, a offert 15 000 € ; le conseil d’administration a refusé, et la secrétaire lui a envoyé la fiche de 2024 « pour qu’il comprenne la valeur de l’objet ». La police d’assurance couvre le vol, pas la faute d’un restaurateur.',
  'r:anvers': 'L’Atelier Replica, à Anvers, a vu la photo dans la presse et appelle : en août, une reproduction d’un « médaillon émaillé bleu, Ø 46 mm », faite d’après des photographies envoyées par courriel. Commande et retrait en personne, payée 1 450 € en liquide. Le client a laissé un numéro de GSM : une carte prépayée. L’atelier communique le numéro.',
  // Recoupements.
  'x:savait': 'Recoupement : à 21:05, Séverine Wattiez s’approche à deux mètres de la vitrine, regarde trois secondes et déclare : « C’est une copie. » À 21:12, l’expert a besoin de la loupe, de la fiche de 2024 et de l’objet en main pour l’affirmer : « À deux mètres, personne ne pourrait. » Elle n’a pas vu que c’était une copie. Elle le savait.',
  'x:garde': 'Recoupement : le médaillon remis scellé à 18:32 est monté au bureau B-2 ; de 18:34 à 18:59, aucun autre badge que celui de Séverine Wattiez. Elle redescend à 19:03, la caisse déjà ouverte, et installe elle-même l’objet dans la vitrine avant la photo de 19:06. Pendant ces trente minutes, personne d’autre n’a eu la caisse en main.',
  'x:anvers': 'Recoupement : le GSM laissé par le client de l’atelier d’Anvers est la carte prépayée de Séverine Wattiez, son second numéro, rechargé en liquide depuis août.',
  'x:modele': 'Recoupement : la copie a un émail bleu égal, sans reprise ; l’original porte depuis avril un éclat repris d’un bleu plus sombre. La copie reproduit le médaillon tel qu’il était en mars 2024, sur les photos de la fiche, pas tel qu’il était cette année. Celui qui l’a fait faire ne travaillait pas d’après l’objet : il avait les photos de 2024. Mireille Cauchie, qui l’a eu en main tout le printemps, aurait copié son propre éclat.',
  'x:avant': 'Recoupement : à 19:06, sur la photo officielle, et à 21:40, sur celle du labo, tout est identique sous la cloche, au millimètre : la bélière tournée vers deux heures, le pli en Z du velours, le fil blanc. Personne n’a ouvert la cloche après 19:06, pas même pendant la coupure. Le médaillon photographié à 19:06, avant le premier invité, était donc déjà la copie (le fichier brut de la photographe, agrandi, le confirme : un émail d’un bleu égal, sans la reprise de l’original). La coupure de 20:41 n’a rien à voir avec l’échange.',
  'x:acompte': 'Recoupement : le 12 octobre, Georges Lemmens retire 6 000 € en liquide à 11:02 ; à 11:40, Séverine Wattiez dépose 6 000 € en liquide, au même guichet. Mardi, il lui écrit : « Samedi comme convenu. Le reste en liquide, à la remise. » Une vente du médaillon, en secret de l’association.',
  'x:annonce': 'Recoupement : l’expertise de vendredi 9:00 a été décidée jeudi à 17:00, et annoncée à 20:30 seulement, pendant le discours. Séverine Wattiez ne la connaissait pas avant. Elle pose son verre. Onze minutes plus tard, la coupure ; trente-cinq minutes plus tard, elle crie au vol.',
  'x:plancha': 'Recoupement : la coupure de 20:41 vient de la plancha du traiteur, branchée par Damien Hallez sur la prise de service du circuit des appliques à 20:37 : un appareil de 3 500 W sur un circuit de 16 A. Un accident, pas un plan. Pendant ces 94 secondes, lui-même filait au bureau B-1.',
  // Déclic.
  'd:mireille': 'Lettre manuscrite de Mireille Cauchie, déposée au commissariat : « Vous allez trouver mon carnet et ma photo. Oui, j’ai abîmé le médaillon en avril, et je l’ai caché. J’en ai honte. Mais regardez la copie : elle n’a pas mon erreur. Celui qui l’a fait faire n’a jamais eu le médaillon entre les mains cette année. Cherchez qui avait les photos de 2024. »',
};

// Réauditions : clé = suspect, puis pièce opposée → [code de la nouvelle pièce, sa réponse].
export const REACTIONS = {
  0: {
    'moy:0': ['Ra', 'Oui. L’éclat, c’est moi. En avril, la bélière a résisté, l’outil a glissé. Je l’ai repris, j’ai réécrit le carnet. Vingt-cinq ans de métier, et une seconde d’inattention. Mais je n’ai pas touché à cette vitrine.'],
    'r:ines': ['Ra', 'Oui. L’éclat, c’est moi. En avril, la bélière a résisté, l’outil a glissé. Je l’ai repris, j’ai réécrit le carnet. Vingt-cinq ans de métier, et une seconde d’inattention. Mais je n’ai pas touché à cette vitrine.'],
    'occ:0': ['Rb', 'D’accord, je suis sortie dans le couloir pendant la coupure. J’appelais mon assureur : j’avais peur que l’expertise de demain trouve l’éclat. Je ne suis arrivée qu’à 19:44, vous l’avez vu.'],
    'c:copie': ['Rc', 'Montrez-moi… Non. Ce n’est pas mon médaillon. Celui que j’ai eu en main a mon éclat, à sept heures. Celle-ci est parfaite. C’est une copie de la fiche de 2024.'],
  },
  1: {
    'occ:1': ['Ra', 'Pendant la coupure, j’ai changé de carte mémoire. Il y avait des photos… privées. De moi et de quelqu’un. Je ne voulais pas qu’elles restent sur la carte de la soirée.'],
    'mob:1': ['Rb', 'Damien et moi, oui. Il est marié. Vous comprenez pourquoi je n’ai rien dit ?'],
    'c:photo': ['Rc', 'La photo de 19:06 ? Mon fichier brut fait vingt-quatre millions de pixels. Agrandissez : on voit l’émail. Je vous le donne quand vous voulez.'],
  },
  2: {
    'occ:2': ['Ra', 'Dans ma poche ? Un reliquaire. Un monsieur me l’a remis à la soirée, j’avais payé la semaine dernière. Les papiers suivront, paraît-il. Rien à voir avec votre médaillon.'],
    'mob:2': ['Rb', 'Bon. Séverine m’a proposé le médaillon, en juin. Dix-huit mille, six mille d’acompte. Elle disait que l’association le vendrait de toute façon, que ce serait « régularisé ». Je devais le recevoir samedi. Je ne l’ai pas reçu.'],
    'x:acompte': ['Rb', 'Bon. Séverine m’a proposé le médaillon, en juin. Dix-huit mille, six mille d’acompte. Elle disait que l’association le vendrait de toute façon, que ce serait « régularisé ». Je devais le recevoir samedi. Je ne l’ai pas reçu.'],
    'r:assureur': ['Rc', 'Oui, j’ai la fiche de 2024. Séverine me l’a envoyée. Vous croyez que je fais fabriquer des copies d’après des photos ? Je collectionne des originaux, monsieur.'],
  },
  3: {
    'c:coupure': ['Ra', 'La plancha, c’est moi. Le traiteur n’avait plus de prise, j’ai branché sur celle de service. J’aurais dû savoir. Et pendant le noir… je suis allé au bureau B-1 reprendre des reçus. Des reçus qui n’auraient pas dû y être.'],
    'occ:3': ['Ra', 'La plancha, c’est moi. Le traiteur n’avait plus de prise, j’ai branché sur celle de service. J’aurais dû savoir. Et pendant le noir… je suis allé au bureau B-1 reprendre des reçus. Des reçus qui n’auraient pas dû y être.'],
    'mob:3': ['Rb', 'Deux mille quatre cents euros. Je comptais les remettre. Séverine le savait, elle me tenait avec ça depuis l’été. Mais un médaillon ? Je ne sais même pas ouvrir cette cloche.'],
  },
  4: {
    'occ:4': ['Ra', 'J’ai monté la caisse au bureau, je l’ai ouverte, j’ai vérifié. C’est mon travail. Vingt-cinq minutes ? J’ai aussi répondu à des mails. L’enveloppe crème ? Des papiers de l’association, pour ma voiture.'],
    'c:gardien': ['Ra', 'J’ai monté la caisse au bureau, je l’ai ouverte, j’ai vérifié. C’est mon travail. Vingt-cinq minutes ? J’ai aussi répondu à des mails. L’enveloppe crème ? Des papiers de l’association, pour ma voiture.'],
    'c:expert': ['Rb', 'Je le connais par cœur, je vous dis. Je l’ai vu cent fois. Je… je ne sais pas comment je l’ai vu. Je l’ai vu, c’est tout.'],
    'x:savait': ['Rb', 'Je le connais par cœur, je vous dis. Je l’ai vu cent fois. Je… je ne sais pas comment je l’ai vu. Je l’ai vu, c’est tout.'],
    'mob:4': ['Rc', 'Les six mille euros ? Un remboursement de ma sœur. Georges ? Il voulait acheter, je lui ai dit que ce n’était pas possible. Le message ? Un dîner, samedi.'],
    'c:discours': ['Rd', 'L’expertise ? Une bonne idée. Monique aurait pu m’en parler, c’est tout. J’ai posé mon verre parce que j’avais fini.'],
  },
};
for (const [i, t] of Object.entries(REACTIONS)) for (const [code, r] of Object.values(t)) TEXTES[`${code}:${i}`] = r;
const NOMS_R = SUSPECTS.map((s) => s.nom);

const TITRES0 = {
  'c:vitrine': 'Labo · la vitrine', 'c:copie': 'Labo · l’objet saisi', 'c:archive': 'La fiche d’expertise de 2024',
  'c:photo': 'La photo officielle de 19:06', 'c:coupure': 'Le tableau électrique', 'c:discours': 'La vidéo du discours',
  'c:convoyeur': 'Le convoyeur de la banque', 'c:gardien': 'Le gardien de la salle', 'c:expert': 'L’expert de 21:12',
  'r:presidente': 'La présidente au commissariat', 'r:ines': 'L’assistante de la restauratrice', 'r:assureur': 'La réponse de l’assureur', 'r:anvers': 'Un atelier d’Anvers appelle',
  'x:savait': 'Elle savait', 'x:garde': 'La garde de la caisse', 'x:anvers': 'Le client d’Anvers', 'x:modele': 'La copie a un modèle',
  'x:avant': 'Déjà là à 19:06', 'x:acompte': 'L’acompte', 'x:annonce': 'L’annonce de 20:30', 'x:plancha': 'La plancha',
  'd:mireille': 'Une lettre de la restauratrice',
};
const OPPOSE = {
  'c:vitrine': 'la vitrine', 'c:copie': 'l’examen de la copie', 'c:archive': 'la fiche de 2024', 'c:photo': 'la photo de 19:06',
  'c:coupure': 'le tableau électrique', 'c:discours': 'la vidéo du discours', 'c:convoyeur': 'le convoyeur', 'c:gardien': 'le gardien',
  'c:expert': 'l’expert', 'r:ines': 'l’assistante', 'r:assureur': 'la réponse de l’assureur', 'x:savait': 'ce qu’a dit l’expert', 'x:acompte': 'l’acompte',
};
const quoiOppose = (f, i) => (OPPOSE[f] || (f.startsWith('A:') ? 'sa propre audition'
  : Number(f.split(':')[1]) === Number(i) ? { occ: 'son emploi du temps vérifié', mob: 'sa téléphonie', moy: 'sa perquisition' }[f.split(':')[0]]
  : `${{ occ: 'l’emploi du temps', mob: 'la téléphonie', moy: 'la perquisition' }[f.split(':')[0]]} de ${NOMS_R[Number(f.split(':')[1])].split(' ')[0]}`));
const titresAvec = (reactions) => {
  const t = { ...TITRES0 };
  for (const [i, r] of Object.entries(reactions)) for (const [f, [code]] of Object.entries(r)) if (!t[`${code}:${i}`]) t[`${code}:${i}`] = `Réaudition · ${NOMS_R[i]} · face à ${quoiOppose(f, i)}`.replace('face à le ', 'face au ').replace('face à les ', 'face aux ').replace(/ de (?=[AEIOUÉH])/g, ' d’');
  return t;
};
const TITRES = titresAvec(REACTIONS);
const RESUMES = {
  'c:vitrine': 'Quatre vis, une minute', 'c:copie': 'Une bonne copie, d’après photos', 'c:archive': 'L’original en 2024',
  'c:photo': 'La vitrine à 19:06', 'c:coupure': '94 secondes, circuit C-4', 'c:discours': 'Une expertise demain à 9:00',
  'c:convoyeur': 'Remis scellé à 18:32', 'c:gardien': 'Une enveloppe crème à 19:12', 'c:expert': 'La loupe et la fiche',
};

// Recoupements : deux pièces opposées l'une à l'autre (un par soir). Chaque paire possible mène au résultat.
export const RECOUPEMENTS = [
  { f: 'x:savait', paires: [['c:expert', 'doc:pvc'], ['c:expert', 'A:4']] },
  { f: 'x:garde', paires: [['occ:4', 'c:convoyeur'], ['occ:4', 'c:photo'], ['Ra:4', 'c:convoyeur']] },
  { f: 'x:anvers', paires: [['r:anvers', 'mob:4']] },
  { f: 'x:modele', paires: [['c:copie', 'moy:0'], ['c:copie', 'r:ines'], ['c:copie', 'mob:0'], ['c:copie', 'Ra:0']] },
  { f: 'x:avant', paires: [['c:photo', 'c:vitrine'], ['moy:1', 'c:copie'], ['moy:1', 'r:ines'], ['moy:1', 'moy:0'], ['Rc:1', 'c:copie']] },
  { f: 'x:acompte', paires: [['mob:4', 'mob:2'], ['Rb:2', 'mob:4']] },
  { f: 'x:annonce', paires: [['c:discours', 'mob:4'], ['c:discours', 'A:4'], ['r:presidente', 'A:4'], ['r:presidente', 'c:discours']] },
  { f: 'x:plancha', paires: [['c:coupure', 'occ:3'], ['c:coupure', 'A:3']] },
];
// Déclic : quand le dossier d'une zone contient toutes les pièces `si`, la pièce `f` arrive le soir même.
export const DECLICS = [
  { si: ['c:copie', 'c:expert', 'r:ines'], f: 'd:mireille', rapport: 'une lettre manuscrite arrive à ton commissariat' },
];
// Relectures : une pièce prend un autre sens quand une autre est connue (affiché sous la pièce, sans conclure).
export const RELECTURES = {
  'c:coupure': [{ si: 'x:avant', t: 'À 19:06, la copie était déjà dans la vitrine : la coupure n’a servi à rien.' }],
  'c:photo': [{ si: 'x:avant', t: 'Sur le fichier brut, c’est déjà la copie.' }],
  'c:gardien': [{ si: 'moy:4', t: 'Une enveloppe rigide crème : celle de la boîte à biscuits.' }],
  'c:discours': [{ si: 'x:acompte', t: 'Le médaillon devait changer de mains samedi. L’expert passait vendredi à 9:00.' }],
  'mob:4': [{ si: 'r:anvers', t: 'Une carte prépayée, depuis août : le mois de la commande à Anvers.' }],
  'moy:0': [{ si: 'c:copie', t: 'L’original a un éclat repris ; la copie n’en a pas.' }],
  'c:vitrine': [{ si: 'x:avant', t: 'Une minute suffisait pour ouvrir la cloche. Mais à 19:06, il n’y avait déjà plus rien à voler.' }],
};

// Coups de pouce : trois niveaux par fil, débloqués avec les jours. Jamais la solution, toujours une direction.
export const COUPS_DE_POUCE = [
  { fil: 'Les 94 secondes', niveaux: [[2, 'Tout le monde a menti sur ces 94 secondes. Mais le vol a-t-il vraiment eu lieu dans le noir ?'], [4, 'Une photo a été prise avant le premier invité. Que montre-t-elle, en pleine résolution ?'], [6, 'Compare le fichier brut de la photographe avec l’examen de la copie.']] },
  { fil: 'Le chemin du médaillon', niveaux: [[2, 'Suis le médaillon depuis le coffre de la banque, minute par minute.'], [4, 'Qui l’a eu en main, seul, avant qu’il arrive dans la vitrine ?'], [6, 'Un badge garde l’heure ; un convoyeur, ce qu’on lui a dit.']] },
  { fil: 'L’alerte', niveaux: [[2, 'Relis le PV : qui a vu le premier que c’était une copie, et comment ?'], [4, 'Combien de temps l’expert a-t-il mis, et avec quoi ?'], [6, 'Recoupe ce que dit l’expert avec le PV de 21:05.']] },
  { fil: 'La copie', niveaux: [[2, 'Une copie se fait d’après quelque chose : l’objet, ou des photos.'], [4, 'La copie ressemble-t-elle au médaillon de cette année, ou à celui d’avant ?'], [6, 'Compare la copie avec ce que l’atelier de la restauratrice a gardé du printemps.']] },
  { fil: 'Pourquoi ce soir ?', niveaux: [[2, 'Pourquoi crier au vol ce soir, et pas un autre jour ?'], [4, 'Qu’a-t-on appris à 20:30 que certains ignoraient ?'], [6, 'Recoupe la vidéo du discours avec l’audition de celle qui a donné l’alerte.']] },
  { fil: 'Les menteurs', niveaux: [[2, 'Chacun ment pour cacher autre chose : cherche quoi.'], [4, 'Une coupure de courant peut être un accident. Regarde le tableau électrique.'], [6, 'Une restauratrice qui cache une faute n’est pas forcément une voleuse.']] },
];

// Hypothèse soumise au juge d'instruction (une par soir) : qui a échangé le médaillon, et dans quel créneau.
export const CRENEAUX = ['avant 18:32, pendant le transport', 'entre 18:32 et 19:06', 'entre 19:06 et 20:41', 'pendant la coupure (20:41-20:43)', 'après la coupure'];
// Chaque règle : (i, s, K) → 1 (appuie), −1 (contredit) ou 0. K(f) : la pièce f est-elle au dossier ?
const REGLES = {
  'c:convoyeur': (i, s) => (s === 0 ? -1 : 0), // scellé intact à la remise
  'c:photo': (i, s) => (s === 1 ? (i === 4 ? 1 : 0) : 0),
  'c:expert': (i, s) => (i === 4 ? 1 : 0),
  'x:avant': (i, s) => (s === 1 ? 1 : -1),
  'x:garde': (i, s) => (s === 1 ? (i === 4 ? 1 : -1) : 0),
  'x:savait': (i) => (i === 4 ? 1 : 0),
  'x:anvers': (i) => (i === 4 ? 1 : -1),
  'x:modele': (i) => (i === 0 ? -1 : 0),
  'x:plancha': (i, s) => (i === 3 && s === 3 ? -1 : 0),
  'x:acompte': (i) => (i === 4 || i === 2 ? 1 : 0),
  'x:annonce': (i) => (i === 4 ? 1 : 0),
  'occ:0': (i, s) => (i === 0 && s <= 1 ? -1 : 0), // arrivée 19:44
  'occ:1': (i, s) => (i === 1 && s <= 1 ? -1 : 0), // avec le gardien
  'occ:2': (i, s) => (i === 2 && s <= 1 ? -1 : 0), // parking 19:27
  'occ:3': (i, s) => (i === 3 && s <= 1 ? -1 : 0), // au bar
  'occ:4': (i, s) => (i === 4 && s === 1 ? 1 : 0),
  'moy:0': (i) => (i === 0 ? -1 : 0),
  'moy:2': (i) => (i === 2 ? -1 : 0),
  'moy:4': (i) => (i === 4 ? 1 : -1),
  'mob:0': (i, s) => (i === 0 && s === 3 ? 1 : 0), // un appel pendant la coupure
  'Ra:0': (i) => (i === 0 ? -1 : 0),
  'Rc:0': (i) => (i === 0 ? -1 : 0),
  'Ra:3': (i) => (i === 3 ? -1 : 0),
  'Rb:4': (i) => (i === 4 ? 1 : 0),
};
function evaluerAvec(regles) {
  return (connus, i, s) => {
    const K = (f) => connus.has(f);
    const pour = [], contre = [];
    for (const [f, r] of Object.entries(regles)) {
      if (!K(f)) continue;
      const v = r(i, s, K);
      if (v > 0) pour.push(f); else if (v < 0) contre.push(f);
    }
    return { pour, contre };
  };
}
/** Hypothèse « suspect i, créneau s » face aux pièces connues : { pour: [f], contre: [f] }. */
export const evaluerHypotheseMedaillon = evaluerAvec(REGLES);

// Le vrai mobile, à nommer pendant la confrontation (bonus).
export const MOBILES = ['Cacher la faute commise sur l’émail au printemps', 'Vendre l’original en secret pour payer ses dettes', 'Se venger de la présidente', 'Avoir l’original sans payer le reste du prix'];
export const MOBILE_VRAI = 1;

const JOURNAL = {
  numero: 4247, date: 'Vendredi matin', surtitre: 'Faits divers · Mons',
  titre: 'Le médaillon a disparu dans le noir',
  chapo: 'Jeudi soir, pendant une coupure de courant de 94 secondes, le médaillon d’Aulne a été remplacé par une copie sous les yeux de soixante invités, derrière l’hôtel de ville. Le parquet a ouvert une enquête pour vol.',
  legende: 'La Salle du Cercle, jeudi vers 22:00. La vitrine a été saisie dans la nuit.',
  corps: [
    'Ils étaient une soixantaine, jeudi soir, à la Salle du Cercle, pour la présentation privée du médaillon d’Aulne, or et émail bleu de la fin du XVIIᵉ siècle, propriété de l’association Mons, Mémoire & Patrimoine. L’objet, sorti pour l’occasion du coffre d’une banque de la Grand-Place, devait être présenté à la presse ce vendredi.',
    'À 20:41, en plein cocktail, la lumière s’éteint. « Une minute et demie de noir complet, des cris, des verres cassés », raconte un invité. Quand l’éclairage revient, le médaillon est toujours sous sa cloche. Ce n’est que vers 21:05 que l’organisatrice, Séverine Wattiez, donne l’alerte : l’objet exposé n’est plus l’original.',
    '« Quatre vis et un tournevis dans un tiroir », soupire un membre du conseil d’administration. « Une minute suffisait. » Un expert appelé sur place a confirmé la substitution. La copie, « de très bonne facture », a été saisie.',
    '« Je suis effondrée », confie la présidente, Monique Druart, 77 ans. « Ce médaillon, c’est la mémoire d’un échevin montois. Nous le confions à des professionnels depuis trente ans. » Dans la salle, des noms circulent déjà : la restauratrice qui a soigné l’objet au printemps, un collectionneur éconduit l’an dernier.',
    'La police a entendu les personnes présentes et saisi les images de la soirée. « Toutes les pistes sont ouvertes », indique le commissaire divisionnaire Marc Dewinter.',
  ],
  encadre: [['Où', 'Salle du Cercle, derrière l’hôtel de ville'], ['Quand', 'Jeudi, coupure de 20:41 à 20:43'], ['Quoi', 'Le médaillon d’Aulne, remplacé par une copie'], ['Valeur', 'Estimée entre 15 000 et 20 000 €'], ['Témoins', 'Une soixantaine d’invités']],
  second: { titre: 'Cinq personnes entendues', texte: 'Seront entendus : la restauratrice Mireille Cauchie, qui a travaillé sur le médaillon au printemps ; la photographe de la soirée, Camille Ronveaux ; le collectionneur Georges Lemmens ; le trésorier de l’association, Damien Hallez, électricien de métier ; et l’organisatrice, Séverine Wattiez, qui a donné l’alerte.' },
  breve: ['Patrimoine', 'Les expertises d’objets d’art se multiplient avant les expositions : les assureurs les exigent désormais chaque année. « Un contrôle, c’est dix minutes et une loupe », explique un expert montois.'],
  breve2: ['Mons', 'Le Jardin du Mayeur restera fermé le soir jusqu’à la fin des travaux d’éclairage, annonce la Ville. Les riverains se plaignent des coupures de courant à répétition dans les vieux bâtiments du centre.'],
};
const PVC = {
  titre: 'Premières constatations',
  lignes: [
    'Le jeudi, à 21:09, nous, INP Cordier et INP Baetens, sommes requis par le dispatching : vol d’un objet d’art lors d’une réception, Salle du Cercle, derrière l’hôtel de ville. Arrivés à 21:16.',
    'Une soixantaine d’invités sont présents. La présidente de l’association Mons, Mémoire & Patrimoine, Mme Monique Druart, nous expose qu’une coupure de courant a plongé la salle dans le noir de 20:41 à 20:43, et que le médaillon d’Aulne exposé sous une cloche de verre a été remplacé par une copie.',
    'Mme Séverine Wattiez, secrétaire générale, organisatrice, nous déclare : « À 21:05, je passais devant la vitrine. Je me suis arrêtée, à deux mètres à peu près, et je l’ai vu tout de suite : ce n’est pas l’original, c’est une copie. » Elle précise ne pas s’être approchée davantage « pour ne toucher à rien ».',
    'À 21:12, M. Pierre-Yves Lauwers, expert-conservateur, appelé par la présidente, examine l’objet et confirme qu’il s’agit d’une reproduction.',
    'La vitrine (cloche de verre vissée sur un socle) ne présente aucune trace d’effraction. L’outil de démontage se trouve dans le tiroir du socle, non verrouillé. La copie est saisie. Les invités sont identifiés avant de quitter les lieux.',
    'Le parquet est avisé. Le labo est requis. Dont procès-verbal.',
  ],
};

// Chronologie : les événements que l'on peut placer sur la frise, chacun débloqué par une pièce (ou public).
export const EVENEMENTS = [
  { id: 'coupure', f: 'doc:pvc', de: hm(20, 41), a: hm(20, 43), qui: null, t: 'La coupure de courant' },
  { id: 'alerte', f: 'doc:pvc', de: hm(21, 5), qui: null, t: 'Séverine donne l’alerte (le PV)' },
  ...[0, 1, 2, 3, 4].map((i) => ({ id: `dit${i}`, f: `A:${i}`, de: SUSPECTS[i].alibi.ditDe, a: SUSPECTS[i].alibi.ditA, qui: i, dit: true, t: `${SUSPECTS[i].prenom} dit : ${SUSPECTS[i].alibi.lieu}` })),
  { id: 'remise', f: 'c:convoyeur', de: hm(18, 32), qui: 4, t: 'Le convoyeur remet la caisse à Séverine' },
  { id: 'photo', f: 'c:photo', de: hm(19, 6), qui: 1, t: 'La photo officielle de la vitrine' },
  { id: 'installe', f: 'c:photo', de: hm(19, 3), qui: 4, t: 'Séverine installe le médaillon (Camille)' },
  { id: 'discours', f: 'c:discours', de: hm(20, 30), qui: null, t: 'La présidente annonce l’expert pour 9:00' },
  { id: 'plancha', f: 'c:coupure', de: hm(20, 37), qui: 3, t: 'Fiche : plancha branchée (D. Hallez)' },
  { id: 'enveloppe', f: 'c:gardien', de: hm(19, 12), a: hm(19, 16), qui: 4, t: 'Séverine au parking, une enveloppe crème' },
  { id: 'expert', f: 'c:expert', de: hm(21, 12), qui: null, t: 'L’expert : loupe et fiche' },
  { id: 'b2', f: 'occ:4', de: hm(18, 34), a: hm(18, 59), qui: 4, t: 'Badge du bureau B-2 : Séverine seule' },
  { id: 'mireille', f: 'occ:0', de: hm(19, 44), qui: 0, t: 'Mireille arrive à la salle' },
  { id: 'spots', f: 'occ:1', de: hm(18, 50), a: hm(19, 3), qui: 1, t: 'Camille règle les spots avec le gardien' },
  { id: 'georges', f: 'occ:2', de: hm(19, 27), qui: 2, t: 'Georges entre au parking' },
  { id: 'bar', f: 'occ:3', de: hm(18, 15), a: hm(19, 20), qui: 3, t: 'Damien monte le bar avec le traiteur' },
  { id: 'avant', f: 'x:avant', de: hm(19, 6), qui: null, t: 'À 19:06, c’est déjà la copie' },
];

const RECIT_FINAL = [
  'Séverine Wattiez, la secrétaire générale, celle qui a donné l’alerte, a échangé le médaillon. Jeudi à 18:32, le convoyeur lui remet la caisse scellée ; elle refuse de vérifier devant lui et la monte au bureau B-2. Seule pendant vingt-cinq minutes, elle remplace l’original par une copie commandée en août à Anvers, d’après les photos de la fiche de 2024. À 19:03, elle descend la caisse déjà ouverte et installe elle-même la copie, trois minutes avant la photo officielle. À 19:12, l’original part dans sa voiture, dans une enveloppe crème.',
  'Pourquoi ? Une saisie sur salaire, et un acheteur : Georges Lemmens, le collectionneur éconduit, à qui elle avait promis l’original pour 18 000 €, 6 000 € d’acompte versés en liquide. La copie devait rester des années sous sa cloche. Mais à 20:30, la présidente annonce l’expertise de l’assureur pour le lendemain, 9:00 : la copie serait découverte sous sa garde. Onze minutes plus tard, une plancha fait sauter le courant. Séverine tient son vol « dans le noir », soixante suspects et une restauratrice qui a quelque chose à cacher.',
  'Son erreur : à 21:05, elle reconnaît la copie d’un regard, à deux mètres. L’expert, lui, a eu besoin d’une loupe et de la fiche de 2024. Elle ne l’a pas vu : elle le savait.',
  'Mireille Cauchie avait bien abîmé l’émail en avril, et réécrit son carnet. Mais elle n’est arrivée qu’à 19:44, et la copie n’avait pas son éclat : elle a été faite d’après des photos, pas d’après l’objet.',
  'Damien Hallez a causé la coupure en branchant la plancha du traiteur, et en a profité pour reprendre au bureau B-1 des reçus qui couvraient 2 400 € pris dans la caisse de l’association.',
  'Camille Ronveaux, pendant la coupure, a retiré la carte mémoire de ses photos avec Damien. Son fichier brut de 19:06 montrait déjà la copie.',
  'Georges Lemmens a payé un acompte pour un objet qui n’était pas à vendre. Ce qu’il a caché dans sa veste, c’est un reliquaire sans papiers.',
].join('\n');

/**
 * L'affaire, au format des affaires écrites (mêmes champs que les meurtres : confrontation, recoupements…).
 * `variante` : 'a' (l'histoire d'origine, par défaut) ou 'b' (voir VARIANTES_MEDAILLON plus bas).
 */
export function affaireMedaillon(n, variante = 'a') {
  const suspects = SUSPECTS.map((s, i) => ({
    ...s, coupable: i === COUPABLE, tech: false,
    statut: { mob: true, moy: true, occ: i === COUPABLE },
    moy: {}, mob: {},
  }));
  const sceneSeq = { labo: ['c:vitrine', 'c:copie', 'c:archive'], cam: ['c:photo', 'c:coupure', 'c:discours'], temoin: ['c:convoyeur', 'c:expert', 'c:gardien'] };
  const reponses = [...new Set(Object.entries(REACTIONS).flatMap(([i, t]) => Object.values(t).map(([code]) => `${code}:${i}`)))];
  const faits = [
    ...Object.values(sceneSeq).flat(),
    ...suspects.flatMap((_, i) => [`occ:${i}`, `mob:${i}`, `moy:${i}`]),
    ...reponses,
    ...RECOUPEMENTS.map((r) => r.f), ...DECLICS.map((d) => d.f),
  ];
  const aff = {
    n, id: `aff${n}`, meurtre: true, genre: 'medaillon', cas: 'medaillon', ville: 'mons', carte: true, prof: true, travaux: null,
    pos: 'scene', titre: 'Quatre-vingt-quatorze secondes', texte: 'Un médaillon ancien remplacé par une copie, pendant une réception derrière l’hôtel de ville, au cours d’une coupure de courant.',
    butin: 'le médaillon d’Aulne', lieu: 'la Salle du Cercle', pres: 'de la Salle du Cercle',
    vic: 'l’association Mons, Mémoire & Patrimoine', aVic: 'à l’association', deVic: 'de l’association',
    libVictime: 'plaignante', faitsNom: 'l’échange du médaillon', lieuScene: 'la Salle du Cercle', lieuxInventes: 'la salle, l’association, l’atelier',
    pieceHeure: 'x:avant', texteHeure: 'Le médaillon : échangé avant la photo de 19:06.',
    req: {}, heure: hm(18, 32), fin: hm(19, 6), annonce: hm(21, 5), jourSemaine: 'jeudi', soiree: 'La soirée de jeudi',
    frise: { de: hm(18, 0), a: hm(21, 30) },
    suspects, coupable: COUPABLE, planques: [], planque: -1,
    faits, textes: { ...TEXTES }, titres: { ...TITRES }, resumes: { ...RESUMES }, reactions: REACTIONS,
    lieux: LIEUX_MEDAILLON, ruesPlan: [], evenements: EVENEMENTS,
    recoupements: RECOUPEMENTS, declics: DECLICS, relectures: RELECTURES, coupsDePouce: COUPS_DE_POUCE,
    hypothese: true, creneaux: CRENEAUX, mobiles: MOBILES, mobileVrai: MOBILE_VRAI, evaluer: evaluerHypotheseMedaillon,
    recit: 'Jeudi soir, derrière l’hôtel de ville, soixante invités, une coupure de courant de 94 secondes, et un médaillon ancien remplacé par une copie. Cinq personnes seront entendues. Toutes ont menti sur ces 94 secondes ; une seule a pris le médaillon.',
    sceneSeq,
    fiches: {
      occ: { titre: 'L’objet et la vitrine', dem: 'labo' },
      moy: { titre: 'La soirée en images', dem: 'cam' },
      mob: { titre: 'Les témoins', dem: 'temoin' },
    },
    dem: {
      labo: { nom: 'Labo : l’objet et la vitrine', motif: 'Le labo examine la vitrine, la copie saisie et la documentation du médaillon.', dit: 'comment, et d’après quoi' },
      cam: { nom: 'La soirée en images', motif: 'Les photos de la photographe, le tableau électrique et les vidéos des invités.', dit: 'ce qui s’est passé, et quand' },
      temoin: { nom: 'Les témoins', motif: 'Deux enquêteurs entendent le convoyeur, l’expert et le personnel de la salle.', dit: 'qui a eu le médaillon en main' },
      alibi: { nom: 'Vérifier l’emploi du temps', dit: 'où il ou elle était vraiment' },
      moyens: { nom: 'Perquisition', motif: 'Sur mandat du juge : il faut une pièce sérieuse contre la personne.', dit: 'ce que cache son domicile' },
      banque: { nom: 'Téléphonie et comptes', dit: 'son GSM et son argent' },
    },
    libres: suspects.flatMap((_, i) => [`occ:${i}`, `mob:${i}`]),
    constatsBase: ['c:vitrine', 'c:photo', 'c:convoyeur'],
    // Mandat de perquisition (et réaudition) : au moins une de ces pièces au dossier.
    charges: {
      0: ['r:ines', 'mob:0', 'c:archive'],
      1: ['mob:1', 'occ:1', 'c:photo'],
      2: ['r:assureur', 'mob:2', 'x:acompte'],
      3: ['c:coupure', 'mob:3', 'x:plancha'],
      4: ['x:savait', 'x:garde', 'x:anvers', 'c:expert', 'c:gardien'],
    },
    // Ce qui écarte un innocent.
    // Trois emplois du temps suffisent : pas là avant 19:06, et loin de la cloche pendant la coupure.
    // Le collectionneur : un voisin a éclairé la cloche pendant toute la coupure, et il n'est arrivé qu'à 19:27.
    innocente: {
      0: ['occ:0', 'x:modele'],
      1: ['occ:1'],
      2: ['occ:2'],
      3: ['occ:3'],
    },
    // Confrontation : trois pièces accablantes, dont au moins deux décisives (obtenues par l'enquête).
    confront: {
      decisives: ['moy:4', 'x:savait', 'x:garde', 'x:anvers'],
      accablantes: ['moy:4', 'x:savait', 'x:garde', 'x:anvers', 'occ:4', 'mob:4', 'A:4', 'doc:pvc', 'Ra:4', 'Rb:4', 'Rc:4', 'Rd:4',
        'x:acompte', 'x:annonce', 'x:avant', 'x:modele', 'c:expert', 'c:photo', 'c:discours', 'c:gardien', 'c:convoyeur', 'c:copie', 'c:archive',
        'r:anvers', 'r:presidente', 'd:mireille', 'mob:2', 'Rb:2', 'Rc:2', 'Rc:0', 'moy:1', 'Rc:1', 'Rb:3'],
    },
    rebonds: {
      2: { f: 'r:presidente', titre: 'La présidente au commissariat', texte: 'Monique Druart, la présidente de l’association, est venue expliquer l’expertise qu’elle avait annoncée pour vendredi matin.' },
      3: { f: 'r:ines', titre: 'L’assistante de la restauratrice parle', texte: 'Inès Vasseur, l’assistante de Mireille Cauchie, se présente avec une photo prise en avril.' },
      4: { f: 'r:assureur', titre: 'L’assureur répond', texte: 'L’assureur de l’association a envoyé le contrat, l’historique des expertises et un courrier sur une offre de rachat.' },
      5: { f: 'r:anvers', titre: 'Un atelier d’Anvers appelle', texte: 'Un atelier de reproductions d’Anvers a reconnu la photo du médaillon dans la presse.' },
    },
    recit3: {
      victime: 'Monique Druart', scene: 'medaillon', valeur: '', journal: JOURNAL,
      pvc: { numero: 'DD.55.L3.091684/26', ...PVC }, plainte: null,
      auditions: SUSPECTS.map((s, i) => ({ numero: `DD.55.L3.0917${String(20 + i * 6)}/26`, qui: `${s.nom}, ${s.age} ans`, role: s.role.charAt(0).toUpperCase() + s.role.slice(1), heure: `Vendredi, ${['09:40', '11:15', '13:30', '15:05', '08:20'][i]}`, qr: AUDITIONS[i] })),
    },
    recitFinal: RECIT_FINAL,
    accroche: 'Quatre-vingt-quatorze secondes de noir, soixante invités, cinq menteurs : un seul voleur.',
  };
  return variante === 'b' ? varianteB(aff) : aff;
}

// ─────────────────────────────── Variante b ───────────────────────────────
// Même départ, mêmes documents du premier jour, même scène. Ce qui change : qui a fait l'échange (voir la bible).
export const VARIANTES_MEDAILLON = ['a', 'b'];
const COUPABLE_B = 2;

const TEXTES_B = {
  // Georges (2) : le coupable.
  'occ:2': 'Parking arrière : le ticket de Georges Lemmens est entré à 18:21, pas « vers sept heures et demie ». Personne ne le voit dans la salle avant 19:31, au vestiaire. Le serveur du traiteur se souvient d’un « monsieur en veste de tweed » qui montait l’escalier de service avec Mme Wattiez vers 18:40. Pendant toute la coupure, son voisin, un viticulteur de Ghlin, a gardé la lampe de son téléphone braquée sur la vitrine « par réflexe » : personne n’a touché la cloche, Georges Lemmens non plus. Il a seulement glissé « quelque chose » dans la poche intérieure de sa veste.',
  'mob:2': 'Comptes et GSM de Georges Lemmens : le 12 octobre à 11:02, retrait de 6 000 € en liquide au guichet de l’agence de la Grand-Place. Mardi, à Séverine Wattiez : « Samedi comme convenu. Le reste en liquide, à la remise. » Jeudi soir, un message envoyé à 20:50, effacé de son téléphone. Depuis août, il a aussi une carte prépayée, rechargée en liquide.',
  'moy:2': 'Perquisition chez Georges Lemmens, Ghlin : dans le coffre du bureau, un écrin. Dedans, un médaillon d’or et d’émail : Ø 46,1 mm, un éclat repris d’un bleu plus sombre à sept heures, et au revers « M·17 », le dernier trait interrompu. L’original. Dans un classeur, la facture d’un atelier d’Anvers, août : « reproduction médaillon émaillé Ø 46, d’après photos, 1 450 € payés en liquide ». Et un reliquaire sans papiers.',
  // Séverine (4) : innocente de l'échange, coupable de la vente.
  'occ:4': 'Journal de la serrure à badge du bureau B-2 (secrétariat, premier étage) : jeudi, entrée à 18:34 avec le badge de Séverine Wattiez, sortie à 18:59. Aucun autre badge de 17:00 à 21:30. Le badge n’enregistre que celui qui ouvre la porte, pas ceux qui entrent avec lui. Pendant la coupure, plusieurs invités la situent près de l’entrée, le téléphone à la main.',
  'mob:4': 'Comptes et GSM de Séverine Wattiez : une saisie sur salaire depuis juin. Le 12 octobre à 11:40, dépôt de 6 000 € en liquide à l’agence de la Grand-Place. Mardi, de Georges Lemmens : « Samedi comme convenu. Le reste en liquide, à la remise. » Jeudi à 20:50, de Georges Lemmens : « Inutile de me l’apporter samedi. Je l’ai déjà. Merci pour l’acompte. » Elle l’a lu à 20:51.',
  'moy:4': 'Perquisition chez Séverine Wattiez, Saint-Symphorien : dans sa voiture, une enveloppe rigide crème : les papiers de provenance du médaillon et la fiche de 2024, qu’elle devait remettre avec l’objet. 4 800 € en liquide dans un tiroir. Pas de médaillon.',
  // Recoupements dont la conclusion change.
  'x:savait': 'Recoupement : à 21:05, Séverine Wattiez s’approche à deux mètres de la vitrine, regarde trois secondes et déclare : « C’est une copie. » À 21:12, l’expert a besoin de la loupe, de la fiche de 2024 et de l’objet en main pour l’affirmer : « À deux mètres, personne ne pourrait. » Elle n’a pas vu que c’était une copie. Elle le savait, ou quelqu’un le lui avait dit.',
  'x:garde': 'Recoupement : le médaillon remis scellé à 18:32 est monté au bureau B-2 ; de 18:34 à 18:59, seul le badge de Séverine Wattiez a ouvert la porte. Mais un badge ne compte que celui qui ouvre : il ne dit pas qui est entré avec elle. Elle redescend à 19:03 et installe l’objet avant la photo de 19:06.',
  'x:anvers': 'Recoupement : le GSM laissé par le client de l’atelier d’Anvers est la carte prépayée de Georges Lemmens, rechargée en liquide depuis août.',
  'x:acompte': 'Recoupement : le 12 octobre, Georges Lemmens retire 6 000 € en liquide à 11:02 ; à 11:40, Séverine Wattiez dépose 6 000 € au même guichet. Mardi : « Samedi comme convenu. » Jeudi, 20:50 : « Inutile de me l’apporter samedi. Je l’ai déjà. » Le médaillon devait être vendu en secret ; il n’a pas attendu samedi.',
};
const REACTIONS_B = {
  0: REACTIONS[0],
  1: REACTIONS[1],
  2: {
    'occ:2': ['Ra', 'Je suis arrivé tôt, et alors ? Séverine m’a montré le médaillon, là-haut, c’est vrai. Dix minutes, elle est descendue voir le traiteur. Je l’ai regardé. Seulement regardé.'],
    'mob:2': ['Rb', 'Ce message ? Une plaisanterie. Je voulais lui faire peur, à cette femme qui vend ce qui ne lui appartient pas.'],
    'r:assureur': ['Rc', 'Oui, j’ai la fiche de 2024. Séverine me l’a envoyée. Vous croyez que je fais fabriquer des copies d’après des photos ? Je collectionne des originaux, monsieur.'],
    'moy:2': ['Rd', 'Six mille euros pour un médaillon que l’association refusait de vendre, et qu’elle me vendait quand même. Qui volait qui ? Elle ne pouvait pas porter plainte. J’ai pris l’original, j’ai laissé ma copie. Personne ne regarde un médaillon.'],
    'x:anvers': ['Rd', 'Six mille euros pour un médaillon que l’association refusait de vendre, et qu’elle me vendait quand même. Qui volait qui ? Elle ne pouvait pas porter plainte. J’ai pris l’original, j’ai laissé ma copie. Personne ne regarde un médaillon.'],
  },
  3: REACTIONS[3],
  4: {
    'occ:4': ['Ra', 'Georges est monté avec moi au bureau. Il voulait le voir, avant samedi. Je suis descendue dix minutes pour le traiteur. Je l’ai laissé seul avec. J’ai été bête.'],
    'c:expert': ['Rb', 'Je ne l’ai pas vu, non. À 20:50, Georges m’a écrit : « Je l’ai déjà. » J’ai compris qu’il m’avait volée. Alors, quand la lumière est revenue, j’ai crié au vol. C’était la seule chose que je pouvais faire sans tout avouer.'],
    'x:savait': ['Rb', 'Je ne l’ai pas vu, non. À 20:50, Georges m’a écrit : « Je l’ai déjà. » J’ai compris qu’il m’avait volée. Alors, quand la lumière est revenue, j’ai crié au vol. C’était la seule chose que je pouvais faire sans tout avouer.'],
    'mob:4': ['Rc', 'Oui, je lui vendais le médaillon. Mes dettes. Mais l’échange, ce n’est pas moi : je devais le lui remettre samedi, le vrai. C’est lui qui a mis sa copie.'],
    'c:discours': REACTIONS[4]['c:discours'],
  },
};
const TITRES_B = titresAvec(REACTIONS_B);
const RECOUPEMENTS_B = RECOUPEMENTS.map((r) => (r.f === 'x:anvers' ? { ...r, paires: [['r:anvers', 'mob:2']] }
  : r.f === 'x:garde' ? { ...r, paires: [...r.paires, ['occ:4', 'occ:2']] } : r));
const RELECTURES_B = {
  ...RELECTURES,
  'mob:4': [{ si: 'x:savait', t: 'À 20:51, elle a lu : « Je l’ai déjà. »' }],
  'mob:2': [{ si: 'r:anvers', t: 'Une carte prépayée, depuis août : le mois de la commande à Anvers.' }],
  'c:gardien': [{ si: 'moy:4', t: 'Une enveloppe rigide crème : les papiers du médaillon, retrouvés dans sa voiture.' }],
};
const COUPS_DE_POUCE_B = COUPS_DE_POUCE.map((c) => (c.fil === 'Le chemin du médaillon'
  ? { ...c, niveaux: [c.niveaux[0], c.niveaux[1], [6, 'Un badge garde l’heure de celui qui ouvre la porte. Et ceux qui entrent avec lui ?']] }
  : c.fil === 'L’alerte' ? { ...c, niveaux: [c.niveaux[0], c.niveaux[1], [6, 'Savoir, ce n’est pas forcément avoir fait. Qui a pu le lui dire ?']] } : c));
const REGLES_B = {
  ...REGLES,
  'c:photo': () => 0,
  'c:expert': () => 0,
  'x:garde': (i, s) => (s === 1 ? (i === 4 || i === 2 ? 1 : -1) : 0),
  'x:savait': () => 0,
  'x:anvers': (i) => (i === 2 ? 1 : -1),
  'occ:2': (i, s) => (i === 2 && s === 1 ? 1 : 0),
  'occ:4': () => 0,
  'moy:2': (i) => (i === 2 ? 1 : -1),
  'moy:4': (i) => (i === 4 ? -1 : 0),
  'mob:2': (i) => (i === 2 ? 1 : 0),
  'Rb:4': (i) => (i === 4 ? -1 : i === 2 ? 1 : 0),
  'Ra:4': (i) => (i === 2 ? 1 : 0),
  'x:annonce': () => 0,
};
export const evaluerHypotheseMedaillonB = evaluerAvec(REGLES_B);
const EVENEMENTS_B = [
  ...EVENEMENTS.filter((e) => e.id !== 'georges'),
  { id: 'georges', f: 'occ:2', de: hm(18, 21), qui: 2, t: 'Georges entre au parking' },
  { id: 'escalier', f: 'occ:2', de: hm(18, 40), qui: 2, t: 'Georges monte au bureau avec Séverine (le serveur)' },
  { id: 'sms', f: 'mob:4', de: hm(20, 50), qui: 2, t: 'Georges à Séverine : « Je l’ai déjà. »' },
];
const RECIT_FINAL_B = [
  'Georges Lemmens, le collectionneur, a échangé le médaillon. Séverine Wattiez le lui avait vendu en secret, 18 000 €, 6 000 € d’acompte. Jeudi, il arrive à 18:21 par l’entrée de service. Elle le fait monter au bureau B-2 pour lui montrer l’objet, et le laisse seul dix minutes avec la caisse ouverte. Il remplace l’original par une copie commandée en août à Anvers, d’après les photos de la fiche de 2024 que Séverine elle-même lui avait envoyée.',
  'Pourquoi ? Pour voler la voleuse : l’original pour 6 000 € au lieu de 18 000, et une vendeuse qui ne pourrait jamais porter plainte sans avouer la vente. À 20:50, il le lui écrit : « Je l’ai déjà. Merci pour l’acompte. »',
  'C’est pour cela que Séverine Wattiez a reconnu la copie d’un regard, à deux mètres : elle ne l’avait pas vue, elle le savait. Elle a crié au vol à 21:05 par rage, en profitant de la coupure. Elle répondra de la vente d’un objet qui n’était pas à elle.',
  'Mireille Cauchie avait bien abîmé l’émail en avril, et réécrit son carnet. Mais elle n’est arrivée qu’à 19:44, et la copie n’avait pas son éclat.',
  'Damien Hallez a causé la coupure en branchant la plancha du traiteur, et a repris au bureau B-1 des reçus qui couvraient 2 400 € pris dans la caisse de l’association.',
  'Camille Ronveaux, pendant la coupure, a retiré la carte mémoire de ses photos avec Damien. Son fichier brut de 19:06 montrait déjà la copie.',
].join('\n');
export const MOBILE_VRAI_B = 3;

/** Variante b, construite sur l'affaire d'origine : seules changent les pièces de l'enquête et ce qui en découle. */
function varianteB(a) {
  const textes = Object.fromEntries(Object.entries(a.textes).filter(([f]) => !/^R[a-z]:\d$/.test(f)));
  Object.assign(textes, TEXTES_B);
  for (const [i, t] of Object.entries(REACTIONS_B)) for (const [code, r] of Object.values(t)) textes[`${code}:${i}`] = r;
  const reponses = [...new Set(Object.entries(REACTIONS_B).flatMap(([i, t]) => Object.values(t).map(([code]) => `${code}:${i}`)))];
  return {
    ...a,
    variante: 'b',
    suspects: a.suspects.map((s, i) => ({ ...s, coupable: i === COUPABLE_B, statut: { ...s.statut, occ: i === COUPABLE_B } })),
    coupable: COUPABLE_B,
    faits: [...a.faits.filter((f) => !/^R[a-z]:\d$/.test(f) && !f.startsWith('x:') && !f.startsWith('d:')), ...reponses, ...RECOUPEMENTS_B.map((r) => r.f), ...DECLICS.map((d) => d.f)],
    textes, titres: { ...TITRES_B }, reactions: REACTIONS_B,
    evenements: EVENEMENTS_B, recoupements: RECOUPEMENTS_B, relectures: RELECTURES_B, coupsDePouce: COUPS_DE_POUCE_B, evaluer: evaluerHypotheseMedaillonB,
    mobileVrai: MOBILE_VRAI_B,
    charges: { ...a.charges, 2: ['r:assureur', 'x:acompte', 'x:anvers', 'Rb:4', 'Ra:4'], 4: ['x:savait', 'x:garde', 'mob:4', 'c:expert', 'c:gardien'] },
    innocente: { 0: a.innocente[0], 1: a.innocente[1], 3: a.innocente[3], 4: ['Rb:4', 'mob:4'] },
    confront: {
      decisives: ['moy:2', 'x:anvers', 'occ:2', 'Rb:4'],
      accablantes: ['moy:2', 'x:anvers', 'occ:2', 'Rb:4', 'mob:2', 'A:2', 'Ra:2', 'Rb:2', 'Rc:2', 'Rd:2', 'Ra:4', 'Rc:4', 'mob:4', 'x:acompte', 'x:garde',
        'x:savait', 'x:avant', 'x:modele', 'c:copie', 'c:archive', 'c:photo', 'c:expert', 'r:anvers', 'r:assureur', 'd:mireille', 'moy:1', 'Rc:1', 'Rc:0', 'doc:pvc'],
    },
    recitFinal: RECIT_FINAL_B,
  };
}
