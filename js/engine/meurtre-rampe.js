// Deuxième affaire de meurtre écrite à la main : « Le notaire de la Rampe » (Mons).
// Bible complète (vérité, chronologie, personnages, révélations) : docs/bible-affaire-rampe.md.
// En bref : un vieux notaire retrouvé au pied de son escalier. On croit à une chute, puis à un héritage ;
// en réalité son filleul l'a tué parce qu'il venait de comprendre que sa fille cachée, noyée le soir du Doudou 1999,
// n'était pas morte par accident. Deux pièges d'horloge : la caméra d'en face est restée à l'heure d'été (une heure
// d'avance) et un SMS envoyé du GSM de la victime, à 22:41, la fait croire vivante pendant que l'assassin est à table.
// Nouveautés de cette affaire (absentes de la première) : recoupements de deux pièces, relectures d'indices,
// déclics (pièces qui arrivent quand le dossier progresse), coups de pouce par jour, hypothèse soumise au juge,
// et le vrai mobile à nommer pendant la confrontation.
// Les rues, monuments et traditions sont réels ; l'étude, la brasserie, le café, le Cercle et les personnes sont fictifs.

const hm = (h, m) => h * 60 + m;

// Lieux du plan (coordonnées du plan 880 × 900) et adresse pour l'itinéraire Google Maps.
export const LIEUX_RAMPE = {
  scene: { nom: 'L’ancienne étude Dusart', sous: 'Rampe Sainte-Waudru · la scène', x: 352, y: 448, adresse: 'Rampe Sainte-Waudru, 7000 Mons' },
  echevins: { nom: 'Brasserie des Échevins', sous: 'Grand-Place · le dîner du Cercle', x: 516, y: 404, adresse: 'Grand-Place, 7000 Mons' },
  jardin: { nom: 'Jardin du Mayeur', sous: 'derrière l’hôtel de ville', x: 470, y: 336, adresse: 'Jardin du Mayeur, 7000 Mons' },
  ropieur: { nom: 'Café « Le Ropieur »', sous: 'rue de la Chaussée · Bruno Lheureux', x: 408, y: 486, adresse: 'Rue de la Chaussée, 7000 Mons' },
  dolez: { nom: 'Brasseur Développement', sous: 'boulevard Dolez · Olivier et Jérôme', x: 706, y: 560, adresse: 'Boulevard Dolez, 7000 Mons' },
  grandplace: { nom: 'Grand-Place', x: 449, y: 412, adresse: 'Grand-Place, 7000 Mons', repere: true },
  beffroi: { nom: 'Beffroi', x: 370, y: 384, adresse: 'Beffroi de Mons', repere: true },
  collegiale: { nom: 'Collégiale Sainte-Waudru', x: 262, y: 500, adresse: 'Collégiale Sainte-Waudru, Mons', repere: true },
  gare: { nom: 'Gare de Mons', x: 40, y: 416, adresse: 'Gare de Mons, 7000 Mons', repere: true },
  jemappes: { nom: '← Jemappes', sous: 'chez Nathalie Dusart, à 5 km', x: 48, y: 300, adresse: 'Jemappes, 7012 Mons', horsPlan: true },
  cuesmes: { nom: '↙ Cuesmes', sous: 'chez Margaux Lefrancq, à 3 km', x: 70, y: 700, adresse: 'Cuesmes, 7033 Mons', horsPlan: true },
  nimy: { nom: '↑ Nimy · le canal', sous: 'chez Olivier Brasseur · et 1999', x: 600, y: 60, adresse: 'Grand Large, 7020 Nimy', horsPlan: true },
  hyon: { nom: 'Hyon ↘', sous: 'résidence Les Charmilles', x: 800, y: 830, adresse: 'Hyon, 7020 Mons', horsPlan: true },
};
/** Rue en plus sur le plan du centre (absente du plan de la première affaire). */
export const RUES_RAMPE = [['Rampe Sainte-Waudru', [[440, 548], [420, 538], [400, 532], [372, 540]]]];

const SUSPECTS = [
  {
    nom: 'Nathalie Dusart', prenom: 'Nathalie', f: true, age: 41, role: 'fille de la victime, pharmacienne', roleDetail: 'tient une pharmacie à Jemappes', proche: true,
    vehicule: { t: 'une Peugeot grise', mode: 'moteur' },
    alibi: { type: 'mensonge', pos: 'jemappes', lieu: 'chez elle, à Jemappes, seule', ditDe: hm(19, 0), ditA: hm(24, 30) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir passé la soirée chez elle, à Jemappes, seule.', rumeur: 'Rumeur : elle hérite de la maison, et sa pharmacie va mal.' },
  },
  {
    nom: 'Olivier Brasseur', prenom: 'Olivier', f: false, age: 47, role: 'filleul de la victime, promoteur immobilier', roleDetail: 'dirige Brasseur Développement, boulevard Dolez', proche: true,
    vehicule: { t: 'une berline noire', mode: 'moteur' },
    alibi: { type: 'couvre', pos: 'dolez', lieu: 'au bureau avec Jérôme Cambier jusqu’à 22:10, puis au dîner du Cercle Saint-Georges', ditDe: hm(19, 0), ditA: hm(24, 30) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir travaillé au bureau avec Jérôme Cambier jusqu’à 22:10, puis rejoint le dîner du Cercle Saint-Georges à la Brasserie des Échevins.', rumeur: 'Rumeur : il voulait racheter la maison de la Rampe pour un projet immobilier.' },
  },
  {
    nom: 'Bruno Lheureux', prenom: 'Bruno', f: false, age: 58, role: 'patron du café « Le Ropieur », locataire de la victime', roleDetail: 'tient son café rue de la Chaussée depuis 1994', proche: false,
    vehicule: { t: 'à pied (habite au-dessus du café)', mode: 'pied', rien: true },
    alibi: { type: 'seul', pos: 'ropieur', lieu: 'derrière son comptoir, rue de la Chaussée', solitaire: 'derrière son comptoir', ditDe: hm(17, 0), ditA: hm(24, 30) },
    rumeur: 'vengeance',
    fiche: { declaration: 'Dit avoir tenu son café, rue de la Chaussée, toute la soirée.', rumeur: 'Rumeur : la victime refusait de renouveler son bail.' },
  },
  {
    nom: 'Margaux Lefrancq', prenom: 'Margaux', f: true, age: 36, role: 'aide-ménagère de la victime', roleDetail: 'trois matinées par semaine, en titres-services ; elle a les clés', proche: true,
    vehicule: { t: 'le bus (habite Cuesmes)', mode: 'pied', rien: true },
    alibi: { type: 'mensonge', pos: 'cuesmes', lieu: 'chez elle, à Cuesmes', ditDe: hm(18, 0), ditA: hm(24, 30) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir passé la soirée chez elle, à Cuesmes. A découvert le corps vendredi à 8:30.', rumeur: 'Rumeur : un objet de valeur aurait disparu de la maison.' },
  },
  {
    nom: 'Jérôme Cambier', prenom: 'Jérôme', f: false, age: 52, role: 'ancien clerc de l’étude, agent immobilier', roleDetail: 'clerc de 1994 à 2005, travaille aujourd’hui avec Olivier Brasseur', proche: true,
    vehicule: { t: 'une petite citadine', mode: 'moteur' },
    alibi: { type: 'couvre', pos: 'dolez', lieu: 'au bureau du boulevard Dolez, avec Olivier Brasseur jusqu’à 22:10', ditDe: hm(18, 30), ditA: hm(22, 25) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir travaillé au bureau, boulevard Dolez, avec Olivier Brasseur jusqu’à 22:10, puis être rentré chez lui.', rumeur: 'Rumeur : il touchait une commission si la maison de la Rampe était vendue.' },
  },
];
const COUPABLE = 1;

const AUDITIONS = [
  [
    ['Quel est votre lien avec la victime ?', 'C’est mon père. On se voyait le dimanche. Il n’était pas du genre à téléphoner.'],
    ['Où étiez-vous jeudi soir ?', 'Chez moi, à Jemappes. Seule. J’ai corrigé des commandes et je me suis couchée tôt.'],
    ['Quand l’avez-vous vu pour la dernière fois ?', 'Dimanche, pour le dîner. Il était bizarre, absent. Il relisait de vieux papiers.'],
    ['Votre père avait-il des ennemis ?', 'Il avait des dossiers. Sur tout le monde. C’était sa manière d’aimer les gens : savoir de quoi ils avaient honte.'],
    ['Il voyait Me Petit lundi, pour son testament.', 'Je l’ai appris. Je ne sais pas ce qu’il voulait changer. Vous croyez que je le saurais ?'],
  ],
  [
    ['Quel est votre lien avec la victime ?', 'C’est mon parrain. Il était le notaire de mon père, et son ami. Je suis candidat à sa succession à la tête du Cercle Saint-Georges.'],
    ['Où étiez-vous jeudi soir ?', 'Au bureau, boulevard Dolez, avec Jérôme Cambier, jusqu’à 22:10. Puis j’ai rejoint le dîner du comité du Cercle à la Brasserie des Échevins, sur la Grand-Place, jusqu’à minuit et demi.'],
    ['Quand avez-vous eu des nouvelles de lui pour la dernière fois ?', 'Jeudi midi, au téléphone. Il allait bien. Et il était encore en vie à onze heures moins vingt : il paraît qu’il a écrit à Nathalie. Alors ne cherchez pas du côté de ceux qui étaient à table avec moi.'],
    ['Vous vouliez racheter sa maison.', 'Pour en faire des logements, oui. Il refusait. On en parlait sans se fâcher : on ne se fâchait pas avec Paul-Henri, on attendait.'],
    ['Avez-vous quelque chose à ajouter ?', 'Cet escalier… Je lui avais dit cent fois de faire poser une main courante.'],
  ],
  [
    ['Quel est votre lien avec la victime ?', 'C’était mon propriétaire. Le café est à lui depuis trente ans. Il ne voulait plus renouveler le bail : décembre, dehors.'],
    ['Où étiez-vous jeudi soir ?', 'Derrière mon comptoir, comme tous les soirs, jusqu’à la fermeture. Avec le brouillard, il n’y avait que les habitués.'],
    ['Vous a-t-il appelé, ces derniers jours ?', 'Non. Pourquoi il m’aurait appelé ? On se parlait par lettres recommandées.'],
    ['Vous lui en vouliez ?', 'Évidemment. Mais on ne tue pas un homme pour un bail. On boit un verre de plus et on cherche un autre local.'],
    ['Avez-vous quelque chose à ajouter ?', 'Le Ropieur, c’est trente ans de Doudou. En nonante-neuf, j’avais déjà la moitié du Cercle au comptoir. Ça ne vous dit rien, je sais.'],
  ],
  [
    ['Quel est votre lien avec la victime ?', 'Je fais son ménage trois matins par semaine, en titres-services, depuis deux ans. J’ai les clés.'],
    ['Racontez-nous vendredi matin.', 'Je suis arrivée à 8:30. La porte était fermée, j’ai ouvert avec ma clé. Monsieur était en bas de l’escalier. J’ai appelé tout de suite.'],
    ['Où étiez-vous jeudi soir ?', 'Chez moi, à Cuesmes. Avec mes enfants.'],
    ['Comment était-il, ces derniers temps ?', 'Il fermait le bureau à clé quand j’arrivais. Il y avait des papiers partout, de vieilles photos. Une fois, il m’a demandé si je connaissais le canal de Nimy.'],
    ['Manquait-il quelque chose dans la maison ?', 'Je ne sais pas. Je ne touche pas à ses affaires.'],
  ],
  [
    ['Quel est votre lien avec la victime ?', 'J’ai été son clerc de 1994 à 2005. Aujourd’hui, je suis agent immobilier et je travaille avec Olivier Brasseur sur le projet de la Rampe.'],
    ['Où étiez-vous jeudi soir ?', 'Au bureau, boulevard Dolez, avec Olivier, jusqu’à 22:10. Il est parti à son dîner, j’ai fini un dossier et je suis rentré.'],
    ['Pourquoi avez-vous quitté l’étude en 2005 ?', 'Une divergence de vues. Maître Dusart n’oubliait rien. Jamais.'],
    ['Vous connaissez bien Olivier Brasseur ?', 'Depuis toujours. On a fait le Lumeçon ensemble en nonante-neuf : on était douze hommes de feuilles, lui et moi compris.'],
    ['Avez-vous quelque chose à ajouter ?', 'Si la maison se vend, je touche une commission, oui. Comme sur toutes les maisons. Ce n’est pas un mobile, c’est un métier.'],
  ],
];

const TEXTES = {
  // Scène : légiste et labo.
  'c:legiste1': 'Décès entre 21:00 et 23:30. Deux plaies à la tête. À l’arrière du crâne, une plaie contre l’arête d’une marche, qui a très peu saigné. À la tempe gauche, une plaie ronde, nette, d’environ 4 cm, portée par un objet lourd. La chute dans l’escalier n’explique pas la tempe.',
  'c:legiste2': 'Autopsie : un repas léger (soupe, vol-au-vent) pris deux heures et demie à trois heures avant la mort. Le ticket du traiteur trouvé dans la cuisine indique une livraison à 19:08. Décès entre 21:45 et 22:20. Dans la plaie de la tempe, une empreinte nette, comme un cachet dans la cire : des lettres, « …SART », et une petite étoile.',
  'c:labo': 'Au salon, deux verres de porto : l’un porte les empreintes de Nathalie Dusart et du rouge à lèvres, l’autre celles de la victime. Dans la cuisine, un troisième verre à porto, lavé, encore humide, sans aucune empreinte. Sur la troisième marche, les lunettes de la victime, intactes, posées verres vers le haut.',
  // Scène : caméras et téléphonie.
  'c:cam': 'Caméra de porte du cabinet de kinésithérapie d’en face (Mme Annick Leroy), heures de l’enregistreur. Brouillard : visages jamais visibles.\n22:04 · une femme, manteau sombre, cheveux longs, entre chez la victime.\n22:31 · la même femme ressort en hâte et descend la Rampe.\n22:46 · un homme grand, capuche, monte la Rampe et sonne.\n23:09 · le même homme ressort, un dossier serré sous le manteau.\n23:36 · une femme en ciré clair entre avec une clé.\n23:39 · elle ressort en courant.',
  'c:tel1': 'Relevé de l’opérateur, GSM de la victime, jeudi :\n21:47 · appel sortant vers Bruno Lheureux, messagerie, 41 s.\n22:33 · appel entrant de Bruno Lheureux, non décroché.\n22:41 · SMS sortant vers Nathalie Dusart.\n22:42 · appel entrant de Nathalie Dusart, rejeté.\n22:44 · GSM éteint. Depuis, plus aucun signal. L’appareil n’a pas été retrouvé dans la maison.',
  'c:tel2': 'Box internet de la maison : le GSM de la victime est connecté au wifi tout l’après-midi et toute la soirée… jusqu’à 22:09, heure à laquelle il quitte le réseau. Il ne s’y reconnecte plus.',
  // Scène : bureau de la victime.
  'c:agenda': 'Agenda de la victime. Jeudi : « 9 h Margaux · 15 h banque · 21 h 45 — le n° 7. Enfin. » Mardi, dans la marge : « Montre de Père ?? — M. » Lundi suivant : « 10 h Me Petit — testament (L.) ». Vendredi : « Échevins, Cercle ». Plus haut dans la semaine, rayé : « Jérôme — non, non et non. »',
  'c:lettres': 'Dans le tiroir de gauche, ouvert : une chemise cartonnée vide, étiquetée à la main « L. M. — 1999 ». Dessous, trois lettres anonymes tapées à la machine, reçues en septembre et octobre :\n« Le soir du Doudou 1999, Lucie n’est pas tombée toute seule dans le canal. »\n« Demandez-vous pourquoi Jacques Brasseur m’a prêté de l’argent en juillet 99. Vous étiez là, Maître. »\n« Le n° 7 n’a jamais été inquiété. Moi, je dors mal depuis vingt-sept ans. »',
  'c:acte': 'Classeur des vieux actes, sorti sur le bureau. Un acte de prêt du 2 juillet 1999, passé devant Me P.-H. Dusart : Jacques Brasseur prête 600 000 francs, sans intérêts, à Bruno Lheureux. Une chemise « J.C. — 2004 » : un relevé de 31 000 € de frais détournés, remboursés, « affaire close, sans plainte ». Et le double d’une lettre à Bruno Lheureux : le bail du café ne sera pas renouvelé.',
  // Nathalie (0).
  'occ:0': 'Caméra de lecture de plaques du boulevard : la Peugeot grise de Nathalie Dusart entre dans le centre à 20:58 et en ressort à 21:36, direction Jemappes. Son GSM borne chez elle, à Jemappes, à partir de 21:55. Elle n’était pas chez elle toute la soirée.',
  'mob:0': 'Comptes de Nathalie Dusart : la pharmacie doit 38 000 € ; la banque a refusé un crédit le 2 octobre. Elle hérite de la maison de la Rampe. GSM : à 22:42, un SMS reçu du numéro de son père, « Reviens. Il faut qu’on parle. Papa. », effacé à 22:50. À 22:42, elle a rappelé ce numéro : rejeté.',
  'moy:0': 'Perquisition chez Nathalie Dusart : le refus de crédit de la banque ; une note de sa main, « Papa — 40 000 — dernière chance » ; et, dans son sac, un faire-part de décès jauni : « Lucie Mahieu, 1980-1999 ». Elle dit que son père le lui a mis dans les mains jeudi soir.',
  // Olivier (1).
  'occ:1': 'Brasserie des Échevins : Olivier Brasseur arrive au dîner du comité à 22:20, « retenu par un client ». Il reste jusqu’à 00:30. Le serveur : il s’est absenté aux toilettes de 22:38 à 22:47 environ. Un convive : « Vers 22:35, un GSM a vibré longtemps dans sa poche ; il ne l’a pas sorti. » Jérôme Cambier confirme qu’ils étaient ensemble au bureau jusqu’à 22:10.',
  'mob:1': 'GSM d’Olivier Brasseur : éteint de 20:58 à 22:18 (« batterie à plat », dit-il). Vendredi, 10:14 : appel de 6 minutes vers Jérôme Cambier. Comptes : Brasseur Développement doit 1,2 million à sa banque ; le projet de la Rampe, qui suppose le rachat de la maison Dusart, conditionne le prêt.',
  'moy:1': 'Perquisition chez Olivier Brasseur, à Nimy : dans la cheminée, des cendres fraîches. Un fragment de papier à en-tête du Cercle Saint-Georges a échappé au feu : « …euilles · n° 7 : O. Bras… ». Un coin de photo, du lierre sur un bras. Dans sa voiture, un ticket de pressing de vendredi, 8:05 : « manteau trois-quarts noir, à capuche ».',
  // Bruno (2).
  'occ:2': 'Terminal de paiement du Ropieur : 37 paiements jeudi, de 20:58 à 23:41, tous saisis avec le code de Bruno Lheureux. Trois habitués le confirment derrière le comptoir toute la soirée. Il n’a pas quitté son café.',
  'mob:2': 'GSM de Bruno Lheureux : un message vocal reçu à 21:47, du numéro de la victime, écouté à 22:30 et effacé à 22:31. Récupéré par le labo : « Bruno, c’est Paul-Henri Dusart. J’ai la liste du Cercle. Tu avais raison pour le n° 7… [on entend une sonnette, deux coups brefs] Ah, le voilà. Je te rappelle. » À 22:33, Bruno a rappelé la victime. Comptes : le café perd de l’argent depuis deux ans.',
  'moy:2': 'Perquisition chez Bruno Lheureux, au-dessus du café : une machine à écrire Olivetti dont les caractères correspondent à ceux des lettres anonymes. Dans une boîte à cigares, des négatifs du Doudou 1999 et un tirage : pendant le Lumeçon, une jeune fille rit, un crin du dragon à la main ; à côté d’elle, un homme de feuilles, le visage caché sous le lierre, brassard n° 7.',
  // Margaux (3).
  'occ:3': 'Carte de bus de Margaux Lefrancq : validée jeudi à 22:14 à Cuesmes, vers Mons, puis à 22:52 au départ du centre de Mons, vers Cuesmes. Elle n’est pas restée chez elle. Sa voisine garde ses enfants « certains soirs ».',
  'mob:3': 'Comptes de Margaux Lefrancq : le 13 octobre, 700 € reçus d’un comptoir de prêt sur gages ; jeudi 16:10, 735 € payés au même comptoir. GSM : à 22:40, un appel de 3 minutes à sa sœur. La sœur : « Elle pleurait, elle ne voulait pas dire pourquoi. »',
  'moy:3': 'Perquisition chez Margaux Lefrancq : un ciré clair à capuche ; le reçu n° 4471 du prêt sur gages (« montre de gousset, or ») ; et une lettre jamais envoyée : « Monsieur Dusart, je vous ai rapporté votre montre jeudi soir. Je suis entrée avec ma clé à 10 h 35 passées. Vous étiez déjà en bas de l’escalier. J’ai eu peur. Pardon. »',
  // Jérôme (4).
  'occ:4': 'Badges de l’immeuble du boulevard Dolez : Jérôme Cambier entre à 18:40 et sort à 22:25 ; Olivier Brasseur sort à 20:55 et ne revient pas. La caméra du couloir montre Jérôme seul à son bureau de 21:00 à 22:25. Olivier Brasseur n’était pas avec lui.',
  'mob:4': 'Comptes de Jérôme Cambier : un mandat de vente, signé avec Brasseur Développement, lui promet 5 % du prix de la maison de la Rampe (environ 40 000 €). GSM : vendredi à 10:14, un appel d’Olivier Brasseur, 6 minutes, cinq heures avant que la police ne l’entende.',
  'moy:4': 'Perquisition chez Jérôme Cambier : le mandat de vente de la maison de la Rampe, et une lettre de la victime, datée du 20 septembre : « Je n’ai rien oublié de 2004, Jérôme. Ne revenez plus me parler de vendre. P.-H. »',
  // Rebondissements.
  'r:tel': 'Samedi matin, un jardinier communal a retrouvé un GSM dans le bassin de la fontaine du Jardin du Mayeur, derrière l’hôtel de ville : celui de la victime, éteint, la puce intacte. Quelqu’un l’a jeté par-dessus la grille. Le labo peut l’exploiter.',
  'r:mireille': 'Mireille Mahieu, 72 ans, ancienne secrétaire de l’étude, s’est présentée au commissariat : « Paul-Henri est venu me voir dimanche, à la résidence. Il m’a dit : “Ce n’était pas un accident, Mireille. J’ai le numéro. Je vais réparer.” Lucie était sa fille. Il ne l’a jamais reconnue. Elle sortait avec un garçon de bonne famille, cette année-là ; elle l’appelait “mon homme de lierre”. »',
  // Recoupements : deux pièces opposées l'une à l'autre.
  'x:heure': 'Recoupement : la caméra d’en face retarde-t-elle ou avance-t-elle ? Mme Leroy n’a jamais remis son enregistreur à l’heure d’hiver, dimanche dernier : il affiche une heure de plus que l’heure réelle. Heures réelles : 21:04 · 21:31 · 21:46 · 22:09 · 22:36 · 22:39.',
  'x:wifi': 'Recoupement : le labo exploite le GSM retrouvé. Le SMS « Reviens. Il faut qu’on parle. Papa. » a été tapé et envoyé à 22:41 alors que le téléphone était connecté au wifi « Echevins-Clients », celui de la Brasserie des Échevins : un réseau qu’il connaissait, la victime y dînant souvent. Connexion de 22:39 à 22:44. Tous les autres SMS de la victime sont signés « P.-H. ».',
  'x:liste': 'Recoupement : le Cercle Saint-Georges garde la liste de ses acteurs. Combat de 1999, hommes de feuilles : douze noms. Brassard n° 7 : Olivier Brasseur, 22 ans. (Jérôme Cambier portait le n° 11.)',
  'x:pv1999': 'Recoupement : le dossier de 1999 est ressorti des archives du parquet. Lucie Mahieu, 19 ans, retrouvée dans le canal à Nimy le lendemain du Doudou ; « noyade accidentelle, forte alcoolémie », classé sans suite. Un seul témoin : Bruno Lheureux, qui déclarait alors qu’Olivier Brasseur et ses amis étaient restés à son café « jusqu’à deux heures du matin ». Son prêt est signé trois semaines plus tard.',
  'x:petit': 'Recoupement : Me Sandrine Petit, qui a repris l’étude, explique le rendez-vous de lundi. La victime voulait reconnaître Lucie Mahieu à titre posthume et créer une bourse à son nom. La part de Nathalie ne changeait pas. Il avait laissé chez Me Petit une lettre « pour Nathalie, s’il m’arrivait quelque chose » : « Tu avais une sœur. Je n’ai pas su l’aimer à voix haute. Quelqu’un m’a menti pendant vingt-sept ans, et je l’ai aidé sans le savoir. »',
  // Déclic : une lettre anonyme arrive au commissariat de la zone quand son dossier s'approche du corbeau.
  'd:corbeau': 'Lettre anonyme reçue au commissariat, tapée à la machine : « Vous cherchez qui il attendait jeudi ? Demandez au Cercle Saint-Georges qui portait le brassard n° 7 en 1999. Et demandez à celui qui a pris la photo ce qu’il a vu ce soir-là. »',
};

// Réauditions : on oppose une pièce (ou le journal, un PV) à un suspect ; certaines le font parler.
// clé = suspect, puis pièce opposée → [code de la nouvelle pièce, sa réponse].
export const REACTIONS = {
  0: {
    'occ:0': ['Ra', 'D’accord. J’y suis allée. J’ai sonné vers neuf heures, on a bu un porto, je lui ai demandé quarante mille euros pour la pharmacie. Il a refusé. Il m’a parlé d’une sœur que je n’ai jamais eue, et je suis partie en claquant la porte, vers neuf heures et demie. Il était vivant. Il était vivant !'],
    'mob:0': ['Rb', 'Oui, il m’a écrit « Reviens ». Je n’y suis pas allée, j’étais trop en colère. Et puis… Papa ne signait jamais « Papa ». Jamais. Même à moi, il écrivait « P.-H. ». J’ai trouvé ça bizarre, puis j’ai eu peur, et je l’ai effacé.'],
    'c:legiste2': ['Rc', 'Des lettres à l’envers, une étoile… C’est le sceau de l’étude. Le gros sceau en laiton, qui était toujours sur son socle, sur le bureau. Il n’y est plus ?'],
    'c:agenda': ['Rd', '« Testament (L.) »… Lucie. Il m’a dit jeudi que j’avais eu une sœur, Lucie, morte en 1999. Je ne savais rien. Je croyais qu’il voulait tout lui laisser, à elle, à une morte.'],
    'c:labo': ['Re', 'Mon verre, oui. Le troisième ? Il ne lavait jamais rien, papa. Quelqu’un est venu après moi et a bu avec lui.'],
  },
  1: {
    'mob:0': ['Ra', 'Le SMS de Nathalie ? Je… On m’en a parlé. Au dîner, sans doute. Ou c’était dans le journal. Tout se sait, à Mons.'],
    'occ:4': ['Rb', 'Bon. Je n’étais pas au bureau. J’étais chez une femme, rue de Nimy. Je ne dirai pas son nom : ma femme n’en sait rien. J’ai demandé à Jérôme de me couvrir, c’est tout.'],
    'x:liste': ['Rc', 'Le n° 7, oui, c’était moi. On était douze. Lucie, je la connaissais, comme tout le monde. Cette nuit-là, j’étais au café de Bruno jusqu’à deux heures : il l’a dit à l’époque.'],
    'x:wifi': ['Rd', 'Le wifi de la brasserie… Je ne répondrai plus sans mon avocat.'],
    'moy:2': ['Re', 'Une photo de jeunesse. On était tous en lierre, ce jour-là. Ça ne prouve rien.'],
    'Rb:2': ['Rf', 'Bruno ment. Il a toujours menti. Mon père l’a aidé à garder son café, et voilà comment il le remercie.'],
  },
  2: {
    'mob:2': ['Ra', 'Oui, il m’a laissé un message. Je l’ai effacé. Parce que c’est moi qui lui écrivais les lettres, voilà. Je voulais qu’il fasse ce que je n’ai jamais eu le courage de faire. Je ne voulais pas qu’on me mêle à ça.'],
    'c:acte': ['Rb', 'Jacques Brasseur m’a prêté six cent mille francs en juillet nonante-neuf, pour que je dise à la police que son fils et ses copains étaient au café jusqu’à deux heures, la nuit où la petite Mahieu s’est noyée. C’est faux. Olivier est parti avec elle vers onze heures. Je ne l’ai jamais revu de la nuit.'],
    'moy:2': ['Rc', 'C’est moi qui ai pris cette photo, au Lumeçon. Lucie, avec le crin que le n° 7 venait de lui glisser. Tout le monde savait qu’ils sortaient ensemble. Personne ne l’a dit aux gendarmes.'],
    'c:lettres': ['Ra', 'Oui, il m’a laissé un message. Je l’ai effacé. Parce que c’est moi qui lui écrivais les lettres, voilà. Je voulais qu’il fasse ce que je n’ai jamais eu le courage de faire. Je ne voulais pas qu’on me mêle à ça.'],
  },
  3: {
    'occ:3': ['Ra', 'Oui, je suis venue. J’avais mis la montre de son père au clou, pour le loyer. Il s’en était rendu compte. Je l’ai récupérée jeudi et je suis venue la remettre, le soir, avec ma clé. Il était en bas de l’escalier. Il ne bougeait pas. Il y avait de la lumière dans le bureau, un tiroir ouvert, et son GSM n’était plus sur le sous-main, où il le pose toujours. J’ai lâché la montre et je suis partie. Le matin, j’ai fait comme si…'],
    'c:cam': ['Ra', 'Oui, je suis venue. J’avais mis la montre de son père au clou, pour le loyer. Il s’en était rendu compte. Je l’ai récupérée jeudi et je suis venue la remettre, le soir, avec ma clé. Il était en bas de l’escalier. Il ne bougeait pas. Il y avait de la lumière dans le bureau, un tiroir ouvert, et son GSM n’était plus sur le sous-main, où il le pose toujours. J’ai lâché la montre et je suis partie. Le matin, j’ai fait comme si…'],
    'mob:3': ['Ra', 'Oui, je suis venue. J’avais mis la montre de son père au clou, pour le loyer. Il s’en était rendu compte. Je l’ai récupérée jeudi et je suis venue la remettre, le soir, avec ma clé. Il était en bas de l’escalier. Il ne bougeait pas. Il y avait de la lumière dans le bureau, un tiroir ouvert, et son GSM n’était plus sur le sous-main, où il le pose toujours. J’ai lâché la montre et je suis partie. Le matin, j’ai fait comme si…'],
    'c:agenda': ['Rb', '« M. », c’est moi, oui. Il me soupçonnait, il avait raison. Je l’ai rendue. Je vous jure que je l’ai rendue.'],
  },
  4: {
    'occ:4': ['Rb', 'D’accord. Olivier n’était pas avec moi. Il est parti vers neuf heures moins cinq. Il m’a demandé de dire qu’il était au bureau jusqu’à dix heures, « une histoire de femme, ne pose pas de questions ». Vendredi matin, avant que vous m’appeliez, il m’a téléphoné pour qu’on dise la même chose. J’ai cru à une maîtresse.'],
    'mob:4': ['Rb', 'D’accord. Olivier n’était pas avec moi. Il est parti vers neuf heures moins cinq. Il m’a demandé de dire qu’il était au bureau jusqu’à dix heures, « une histoire de femme, ne pose pas de questions ». Vendredi matin, avant que vous m’appeliez, il m’a téléphoné pour qu’on dise la même chose. J’ai cru à une maîtresse.'],
    'c:acte': ['Ra', '2004… J’ai remboursé chaque euro. Maître Dusart a gardé le dossier pour lui. C’était sa façon de nous tenir, tous : il ne dénonçait personne, il rangeait.'],
  },
};
for (const [i, t] of Object.entries(REACTIONS)) for (const [code, r] of Object.values(t)) TEXTES[`${code}:${i}`] = r;
const NOMS_R = SUSPECTS.map((s) => s.nom);

const TITRES0 = {
  'c:legiste1': 'Légiste · premier examen', 'c:legiste2': 'Légiste · autopsie', 'c:labo': 'Labo · les verres et les lunettes',
  'c:cam': 'La caméra d’en face', 'c:tel1': 'Le relevé de l’opérateur', 'c:tel2': 'La box de la maison',
  'c:agenda': 'L’agenda de la victime', 'c:lettres': 'Les lettres anonymes', 'c:acte': 'Les vieux actes',
  'r:tel': 'Le GSM retrouvé', 'r:mireille': 'Mireille Mahieu se présente',
  'x:heure': 'L’heure de l’enregistreur', 'x:wifi': 'Le GSM parle', 'x:liste': 'La liste du Cercle', 'x:pv1999': 'Le dossier de 1999', 'x:petit': 'Le rendez-vous de lundi',
  'd:corbeau': 'Une lettre au commissariat',
};
const quoiOppose = (f) => (/^R[a-z]:\d$/.test(f) ? `la nouvelle version de ${NOMS_R[Number(f.split(':')[1])].split(' ')[0]}` : f === 'doc:journal' ? 'le journal' : f === 'doc:pvc' ? 'le PV de constatations' : f.startsWith('A:') ? 'sa propre audition'
  : TITRES0[f] ? TITRES0[f].replace(/^[^·]*· /, '').toLowerCase() : { occ: 'la vérification d’alibi', mob: 'la téléphonie', moy: 'la perquisition' }[f.split(':')[0]] + (Number(f.split(':')[1]) >= 0 ? ` de ${NOMS_R[Number(f.split(':')[1])].split(' ')[0]}` : ''));
const TITRES = { ...TITRES0 };
for (const [i, t] of Object.entries(REACTIONS)) for (const [f, [code]] of Object.entries(t)) if (!TITRES[`${code}:${i}`]) TITRES[`${code}:${i}`] = `Réaudition · ${NOMS_R[i]} · face à ${quoiOppose(f)}`.replace('face à le ', 'face au ');
// Résumé court sur les fiches de la scène (la dernière pièce connue de chaque série).
const RESUMES = {
  'c:legiste1': 'Pas une simple chute', 'c:legiste2': 'Entre 21:45 et 22:20', 'c:labo': 'Trois verres, l’un lavé',
  'c:cam': 'Six passages devant la porte', 'c:tel1': 'Un SMS à 22:41', 'c:tel2': 'Le GSM part à 22:09',
  'c:agenda': '« 21 h 45 — le n° 7 »', 'c:lettres': 'Un corbeau, et 1999', 'c:acte': 'Un prêt de juillet 1999',
};

// Recoupements : deux pièces opposées l'une à l'autre (une fois par soir). Chaque paire possible mène au résultat.
// Les pièces publiques (journal, PV, auditions) comptent aussi.
export const RECOUPEMENTS = [
  { f: 'x:heure', paires: [['c:cam', 'doc:journal'], ['c:cam', 'occ:0'], ['c:cam', 'c:tel2'], ['c:cam', 'occ:3'], ['c:cam', 'mob:2']] },
  { f: 'x:wifi', paires: [['r:tel', 'mob:0'], ['r:tel', 'c:tel1'], ['r:tel', 'c:tel2'], ['r:tel', 'Rb:0']] },
  { f: 'x:liste', paires: [['moy:2', 'c:agenda'], ['moy:2', 'c:lettres'], ['moy:2', 'r:mireille'], ['Rc:2', 'c:agenda'], ['d:corbeau', 'moy:2'], ['d:corbeau', 'A:4'], ['c:agenda', 'A:4'], ['mob:2', 'A:4']] },
  { f: 'x:pv1999', paires: [['c:acte', 'c:lettres'], ['c:acte', 'Ra:2'], ['c:acte', 'r:mireille'], ['c:lettres', 'r:mireille']] },
  { f: 'x:petit', paires: [['moy:0', 'c:agenda'], ['Rd:0', 'c:agenda'], ['r:mireille', 'c:agenda'], ['Ra:0', 'c:agenda']] },
];
// Déclics : quand le dossier d'une zone contient toutes les pièces `si`, la pièce `f` arrive le soir même.
export const DECLICS = [
  { si: ['c:lettres', 'c:tel1'], f: 'd:corbeau', rapport: 'une lettre anonyme arrive à ton commissariat' },
];
// Relectures : une pièce prend un autre sens quand une autre est connue (affiché sous la pièce, sans conclure).
export const RELECTURES = {
  'c:cam': [{ si: 'x:heure', t: 'Heures réelles : 21:04 · 21:31 · 21:46 · 22:09 · 22:36 · 22:39.' }],
  'moy:2': [{ si: 'x:liste', t: 'Brassard n° 7 : Olivier Brasseur, d’après la liste du Cercle.' }],
  'c:tel1': [{ si: 'x:wifi', t: 'Le SMS de 22:41 a été tapé sur le wifi de la Brasserie des Échevins.' }, { si: 'c:tel2', t: 'À 22:41, le GSM avait quitté la maison depuis 32 minutes.' }],
  'mob:0': [{ si: 'x:wifi', t: 'Ce SMS a été tapé à la Brasserie des Échevins.' }],
  'c:acte': [{ si: 'x:pv1999', t: 'Le prêt est signé trois semaines après le faux témoignage de Bruno Lheureux.' }],
  'c:labo': [{ si: 'Rc:0', t: 'Le sceau de l’étude a disparu de son socle.' }],
};

// Coups de pouce : trois niveaux par fil, débloqués avec les jours. Jamais la solution, toujours une direction.
export const COUPS_DE_POUCE = [
  { fil: 'Les heures', niveaux: [[2, 'Toutes les heures du dossier ne viennent pas d’horloges fiables.'], [4, 'Une brève du journal parle d’une heure qui a changé dimanche dernier.'], [6, 'Compare une heure de la caméra d’en face avec une heure sûre (une plaque lue, une box wifi) : recoupe-les.']] },
  { fil: 'Le SMS de 22:41', niveaux: [[2, 'Un mort n’écrit pas de SMS. Qui avait son GSM ?'], [4, 'Sa fille trouve que ce message ne ressemble pas à son père.'], [6, 'Quand le GSM sera retrouvé, recoupe-le avec ce SMS : il dira où il a été tapé.']] },
  { fil: 'Le visiteur', niveaux: [[2, 'Écoute le message vocal jusqu’au bout : on y entend plus qu’une voix.'], [4, '« Ah, le voilà » : il attendait un homme, et il savait qui.'], [6, 'L’agenda donne rendez-vous à quelqu’un qui portait un numéro.']] },
  { fil: 'Le n° 7', niveaux: [[2, 'À Mons, une fête met des numéros sur des bras.'], [4, 'Une photo du Lumeçon de 1999 existe. Qui l’a prise ?'], [6, 'Recoupe la photo de 1999 avec l’agenda : le Cercle Saint-Georges garde la liste de ses acteurs.']] },
  { fil: 'Les menteurs', niveaux: [[2, 'Chacun ment pour protéger quelque chose : cherche quoi.'], [4, 'Un alibi confirmé par un autre ne vaut que ce que vaut cet autre.'], [6, 'Les badges de l’immeuble du boulevard Dolez disent qui y était vraiment.']] },
];

// Hypothèse soumise au juge d'instruction (une par soir) : qui, et dans quel créneau.
// Le juge la compare au dossier de la zone : pièces qui l'appuient, pièces qui la contredisent (lecture naïve des pièces
// trompeuses tant que ce qui les explique n'est pas au dossier). Jamais un « vrai / faux ».
export const CRENEAUX = ['entre 21:00 et 21:30', 'entre 21:30 et 22:00', 'entre 22:00 et 22:30', 'entre 22:30 et 23:00', 'après 23:00'];
const HOMME = (i) => i === 1 || i === 2 || i === 4;
// Chaque règle : (i, s, K) → 1 (appuie), −1 (contredit) ou 0. K(f) : la pièce f est-elle au dossier ?
const REGLES = {
  'c:legiste2': (i, s) => (s === 1 || s === 2 ? 1 : -1),
  'c:labo': (i) => (i === 0 ? 1 : 0),
  'c:cam': (i, s, K) => {
    if (K('x:heure')) return s === 4 ? -1 : (s === 1 || s === 2) && HOMME(i) ? 1 : s === 0 && i === 0 ? 1 : 0;
    if (s <= 1) return -1;
    if (s === 2) return HOMME(i) ? -1 : 1;
    return 1;
  },
  'c:tel1': (i, s, K) => (K('x:wifi') || K('c:tel2') || K('Rb:0') ? (s <= 2 ? 1 : -1) : s <= 2 ? -1 : 1),
  'c:tel2': (i, s) => (s <= 2 ? 1 : -1),
  'mob:2': (i, s) => (s === 0 || !HOMME(i) ? -1 : s <= 2 ? 1 : 0),
  'occ:0': (i, s) => (i !== 0 ? 0 : s <= 1 ? 1 : -1),
  'Ra:0': (i, s) => (i !== 0 ? 0 : s <= 1 ? 1 : -1),
  'mob:0': (i, s, K) => (i !== 0 || K('x:wifi') ? 0 : 1),
  'moy:0': (i) => (i === 0 ? 1 : 0),
  'occ:1': (i, s, K) => (i !== 1 ? 0 : K('occ:4') || K('Rb:4') ? (s >= 3 ? -1 : 0) : -1),
  'mob:1': (i, s) => (i === 1 && s <= 2 ? 1 : 0),
  'moy:1': (i) => (i === 1 ? 1 : 0),
  'occ:2': (i) => (i === 2 ? -1 : 0),
  'occ:3': (i, s) => (i !== 3 ? 0 : s === 3 ? 1 : s <= 1 ? -1 : 0),
  'mob:3': (i) => (i === 3 ? 1 : 0),
  'moy:3': (i, s) => (i === 3 ? -1 : s <= 2 ? 1 : 0),
  'Ra:3': (i, s) => (i === 3 ? -1 : s <= 2 ? 1 : 0),
  'occ:4': (i, s) => (i === 4 ? -1 : i === 1 && s <= 2 ? 1 : 0),
  'mob:4': (i) => (i === 4 ? 1 : 0),
  'moy:4': (i) => (i === 4 ? 1 : 0),
  'Rb:4': (i, s) => (i === 4 ? -1 : i === 1 && s <= 2 ? 1 : 0),
  'Rb:1': (i) => (i === 1 ? 1 : 0),
  'Ra:1': (i) => (i === 1 ? 1 : 0),
  'Rc:1': (i) => (i === 1 ? 1 : 0),
  'x:wifi': (i, s) => (s >= 3 ? -1 : i === 1 ? 1 : 0),
  'x:liste': (i) => (i === 1 ? 1 : 0),
  'x:pv1999': (i) => (i === 1 ? 1 : 0),
  'Rb:2': (i) => (i === 1 ? 1 : 0),
  'x:petit': (i) => (i === 0 ? -1 : 0),
  'c:agenda': (i, s) => (s === 1 || s === 2 ? 1 : 0),
  'c:acte': (i) => (i === 2 || i === 4 ? 1 : 0),
};
/** Hypothèse « suspect i, créneau s » face aux pièces connues : { pour: [f], contre: [f] }. */
export function evaluerHypothese(connus, i, s) {
  const K = (f) => connus.has(f);
  const pour = [], contre = [];
  for (const [f, r] of Object.entries(REGLES)) {
    if (!K(f)) continue;
    const v = r(i, s, K);
    if (v > 0) pour.push(f); else if (v < 0) contre.push(f);
  }
  return { pour, contre };
}

// Le vrai mobile, à nommer pendant la confrontation (bonus).
export const MOBILES = ['L’héritage de la maison', 'Le projet immobilier de la Rampe', 'Faire taire ce qui s’est passé en 1999', 'Une dette d’argent'];
export const MOBILE_VRAI = 2;

const JOURNAL = {
  numero: 4227, date: 'Samedi matin', surtitre: 'Faits divers · Mons',
  titre: 'Un notaire retrouvé mort au pied de son escalier, Rampe Sainte-Waudru',
  chapo: 'Me Paul-Henri Dusart, 66 ans, figure du notariat montois et du folklore local, a été découvert sans vie vendredi matin. Le parquet a saisi un juge d’instruction.',
  legende: 'La maison de l’ancienne étude, à mi-pente de la Rampe, vendredi midi.',
  corps: [
    'C’est son aide-ménagère qui l’a découvert, vendredi vers 8:30, au pied de l’escalier qui mène à l’étage. Les secours n’ont pu que constater le décès. La porte n’avait pas été forcée.',
    'Une chute ? « Rien n’est exclu », se borne-t-on à dire au parquet, qui a pourtant demandé une autopsie et saisi un juge d’instruction dès vendredi après-midi.',
    'Notaire de 1979 à 2012, président d’honneur du Cercle Saint-Georges, Paul-Henri Dusart était de toutes les fêtes du Doudou et de tous les conseils d’administration. « Il savait tout sur tout le monde, et il ne disait jamais rien », résume un ancien confrère.',
    'Jeudi soir, un brouillard épais était tombé sur le centre. « On ne voyait pas le Beffroi depuis la Grand-Place », raconte un riverain.',
    'Ses proches seront entendus. « Nous ne négligeons aucune piste », indique le commissaire divisionnaire Paul Verbeke.',
  ],
  encadre: [['Où', 'Rampe Sainte-Waudru, sous la Collégiale'], ['Quand', 'Découvert vendredi vers 8:30'], ['Victime', 'Paul-Henri Dusart, 66 ans, notaire honoraire'], ['Cause', 'À l’autopsie'], ['Effraction', 'Aucune']],
  second: { titre: 'Le Cercle Saint-Georges cherche un président', texte: 'Le comité dînait jeudi soir à la Brasserie des Échevins pour préparer l’élection. Favori : le promoteur Olivier Brasseur, filleul du défunt et ancien homme de feuilles du Lumeçon. Les autres proches entendus : sa fille Nathalie, son aide-ménagère, son ancien clerc Jérôme Cambier et son locataire, le cafetier Bruno Lheureux.' },
  breve: ['Heure d’hiver', 'Lundi, au service population de l’hôtel de ville, une bonne dizaine de Montois se sont présentés avec une heure d’avance à leur rendez-vous. « Comme chaque année, on a gagné une heure de sommeil et perdu une heure de file », sourit-on au guichet. Pensez à vos fours, vos voitures et vos caméras.'],
  breve2: ['Météo', 'Brouillard givrant jeudi soir sur le Hainaut : visibilité réduite à cinquante mètres à Mons entre 20:00 et minuit. Les bus du TEC ont roulé au pas. Retour d’une petite drache dimanche.'],
};
const PVC = {
  titre: 'Premières constatations',
  lignes: [
    'Le vendredi, à 08:41, nous, INP Delmotte et INP Carlier, sommes requis par le dispatching : Mme Margaux Lefrancq, aide-ménagère, signale avoir découvert son employeur inanimé à son domicile, Rampe Sainte-Waudru.',
    'Arrivés à 08:52. La porte d’entrée, fermée, a été ouverte par Mme Lefrancq avec sa clé. Aucune trace d’effraction. M. Paul-Henri Dusart, 66 ans, gît au pied de l’escalier qui mène à l’étage. Le médecin constate le décès : deux plaies à la tête.',
    'Dans l’étude, au rez-de-chaussée, la lampe du bureau est allumée et un tiroir est ouvert. Le portefeuille et les clés de la victime sont dans la poche de son pardessus. Son GSM est introuvable.',
    'Sur la console de l’entrée : une montre de gousset en or, une petite étiquette cartonnée attachée à la chaîne (« 4471 »). Mme Lefrancq dit ne l’avoir jamais vue là.',
    'En face, au-dessus de la porte d’un cabinet de kinésithérapie, une caméra donne sur la Rampe.',
    'Le laboratoire et le médecin légiste sont requis. Le magistrat de garde est avisé. Dont procès-verbal.',
  ],
};

// Chronologie : les événements que l'on peut placer sur la frise, chacun débloqué par une pièce (ou public).
// Les heures de la caméra sont celles de l'enregistreur ; les heures réelles arrivent avec le recoupement.
export const EVENEMENTS = [
  { id: 'brouillard', f: 'doc:journal', de: hm(20, 0), a: hm(24, 0), qui: null, t: 'Brouillard épais sur le centre' },
  ...[0, 1, 2, 3, 4].map((i) => ({ id: `dit${i}`, f: `A:${i}`, de: SUSPECTS[i].alibi.ditDe < hm(20, 0) ? hm(20, 0) : SUSPECTS[i].alibi.ditDe, a: Math.min(SUSPECTS[i].alibi.ditA, hm(24, 30)), qui: i, dit: true, t: `${SUSPECTS[i].prenom} dit : ${SUSPECTS[i].alibi.lieu}` })),
  { id: 'deces1', f: 'c:legiste1', de: hm(21, 0), a: hm(23, 30), qui: null, t: 'Décès (premier examen du légiste)' },
  { id: 'deces2', f: 'c:legiste2', de: hm(21, 45), a: hm(22, 20), qui: null, t: 'Décès (autopsie)' },
  { id: 'camA', f: 'c:cam', de: hm(22, 4), qui: null, t: 'Caméra : une femme entre (heure de l’enregistreur)' },
  { id: 'camB', f: 'c:cam', de: hm(22, 31), qui: null, t: 'Caméra : la femme ressort en hâte (heure de l’enregistreur)' },
  { id: 'camC', f: 'c:cam', de: hm(22, 46), qui: null, t: 'Caméra : un homme à capuche sonne (heure de l’enregistreur)' },
  { id: 'camD', f: 'c:cam', de: hm(23, 9), qui: null, t: 'Caméra : l’homme ressort avec un dossier (heure de l’enregistreur)' },
  { id: 'camE', f: 'c:cam', de: hm(23, 36), qui: null, t: 'Caméra : une femme en ciré clair entre avec une clé (heure de l’enregistreur)' },
  { id: 'camF', f: 'c:cam', de: hm(23, 39), qui: null, t: 'Caméra : elle ressort en courant (heure de l’enregistreur)' },
  { id: 'reelA', f: 'x:heure', de: hm(21, 4), a: hm(21, 31), qui: null, t: 'Caméra, heure réelle : la femme en manteau sombre' },
  { id: 'reelC', f: 'x:heure', de: hm(21, 46), a: hm(22, 9), qui: null, t: 'Caméra, heure réelle : l’homme à capuche' },
  { id: 'reelE', f: 'x:heure', de: hm(22, 36), a: hm(22, 39), qui: null, t: 'Caméra, heure réelle : la femme en ciré clair' },
  { id: 'appel', f: 'c:tel1', de: hm(21, 47), qui: null, t: 'La victime appelle Bruno (messagerie, 41 s)' },
  { id: 'rappelB', f: 'c:tel1', de: hm(22, 33), qui: 2, t: 'Bruno rappelle la victime : pas de réponse' },
  { id: 'sms', f: 'c:tel1', de: hm(22, 41), qui: null, t: 'SMS du GSM de la victime à Nathalie' },
  { id: 'off', f: 'c:tel1', de: hm(22, 44), qui: null, t: 'Le GSM de la victime s’éteint' },
  { id: 'box', f: 'c:tel2', de: hm(22, 9), qui: null, t: 'Le GSM de la victime quitte le wifi de la maison' },
  { id: 'echevinsWifi', f: 'x:wifi', de: hm(22, 39), a: hm(22, 44), qui: 1, t: 'Le GSM de la victime sur le wifi des Échevins' },
  { id: 'plaque', f: 'occ:0', de: hm(20, 58), a: hm(21, 36), qui: 0, t: 'La voiture de Nathalie dans le centre (plaque lue)' },
  { id: 'smsN', f: 'mob:0', de: hm(22, 42), a: hm(22, 50), qui: 0, t: 'Nathalie reçoit « Reviens », rappelle, efface' },
  { id: 'visiteN', f: 'Ra:0', de: hm(21, 0), a: hm(21, 30), qui: 0, t: 'Nathalie chez son père (ses aveux)' },
  { id: 'echevins', f: 'occ:1', de: hm(22, 20), a: hm(24, 30), qui: 1, t: 'Olivier au dîner des Échevins' },
  { id: 'toilettes', f: 'occ:1', de: hm(22, 38), a: hm(22, 47), qui: 1, t: 'Olivier aux toilettes' },
  { id: 'vibre', f: 'occ:1', de: hm(22, 35), qui: 1, t: 'Un GSM vibre longtemps dans la poche d’Olivier' },
  { id: 'telO', f: 'mob:1', de: hm(20, 58), a: hm(22, 18), qui: 1, t: 'GSM d’Olivier éteint' },
  { id: 'badgeO', f: 'occ:4', de: hm(20, 55), qui: 1, t: 'Olivier quitte l’immeuble du boulevard Dolez (badge)' },
  { id: 'caisse', f: 'occ:2', de: hm(20, 58), a: hm(23, 41), qui: 2, t: 'Bruno encaisse au Ropieur' },
  { id: 'messagerie', f: 'mob:2', de: hm(22, 30), a: hm(22, 31), qui: 2, t: 'Bruno écoute le message, puis l’efface' },
  { id: 'bus', f: 'occ:3', de: hm(22, 14), a: hm(22, 52), qui: 3, t: 'Margaux en bus vers Mons, puis retour' },
  { id: 'soeur', f: 'mob:3', de: hm(22, 40), qui: 3, t: 'Margaux appelle sa sœur en pleurant' },
  { id: 'badgeJ', f: 'occ:4', de: hm(20, 0), a: hm(22, 25), qui: 4, t: 'Jérôme seul au bureau (badges, caméra du couloir)' },
];

/** L'affaire, au format des affaires générées (champs supplémentaires : meurtre, sceneSeq, charges, confront…). */
export function affaireMeurtreRampe(n) {
  const suspects = SUSPECTS.map((s, i) => ({
    ...s, coupable: i === COUPABLE, tech: false,
    statut: { mob: true, moy: true, occ: i === COUPABLE },
    moy: {}, mob: {},
  }));
  const reponses = [...new Set(Object.entries(REACTIONS).flatMap(([i, t]) => Object.values(t).map(([code]) => `${code}:${i}`)))];
  const faits = [
    'c:legiste1', 'c:legiste2', 'c:labo', 'c:cam', 'c:tel1', 'c:tel2', 'c:agenda', 'c:lettres', 'c:acte',
    ...suspects.flatMap((_, i) => [`occ:${i}`, `mob:${i}`, `moy:${i}`]),
    ...reponses,
    ...RECOUPEMENTS.map((r) => r.f), ...DECLICS.map((d) => d.f),
  ];
  return {
    n, id: `aff${n}`, meurtre: true, cas: 'rampe', ville: 'mons', carte: true, prof: true, travaux: null,
    pos: 'scene', titre: 'Le notaire de la Rampe', texte: 'Un notaire honoraire a été retrouvé mort au pied de son escalier, Rampe Sainte-Waudru, sous la Collégiale.',
    butin: 'un dossier', lieu: 'la maison de la Rampe Sainte-Waudru', pres: 'de la Rampe Sainte-Waudru',
    vic: 'Paul-Henri Dusart', aVic: 'à Paul-Henri Dusart', deVic: 'de Paul-Henri Dusart',
    req: {}, heure: hm(21, 45), fin: hm(22, 20), annonce: hm(21, 45), jourSemaine: 'jeudi', soiree: 'La soirée de jeudi',
    suspects, coupable: COUPABLE, planques: [], planque: -1,
    faits, textes: { ...TEXTES }, titres: { ...TITRES }, resumes: { ...RESUMES }, reactions: REACTIONS,
    lieux: LIEUX_RAMPE, ruesPlan: RUES_RAMPE, evenements: EVENEMENTS,
    recoupements: RECOUPEMENTS, declics: DECLICS, relectures: RELECTURES, coupsDePouce: COUPS_DE_POUCE,
    hypothese: true, creneaux: CRENEAUX, mobiles: MOBILES, mobileVrai: MOBILE_VRAI,
    recit: 'Vendredi matin, Me Paul-Henri Dusart, 66 ans, a été retrouvé mort au pied de l’escalier de sa maison, Rampe Sainte-Waudru. Une chute, peut-être. Cinq proches seront entendus. Chacun ment sur quelque chose : un seul pour cacher un meurtre.',
    // Démarches de la scène : chacune livre ses pièces dans l'ordre, une par démarche.
    sceneSeq: { labo: ['c:legiste1', 'c:legiste2', 'c:labo'], cam: ['c:cam', 'c:tel1', 'c:tel2'], temoin: ['c:agenda', 'c:lettres', 'c:acte'] },
    fiches: {
      occ: { titre: 'Comment il est mort', dem: 'labo' },
      moy: { titre: 'Les allées et venues', dem: 'cam' },
      mob: { titre: 'Le bureau du notaire', dem: 'temoin' },
    },
    dem: {
      labo: { nom: 'Légiste et labo', motif: 'Le médecin légiste examine le corps, le labo relève verres et traces.', dit: 'comment il est mort, et quand' },
      cam: { nom: 'Caméras et téléphonie', motif: 'La caméra d’en face, l’opérateur et la box de la maison.', dit: 'qui est venu, et ce qu’a fait son GSM' },
      temoin: { nom: 'Bureau de la victime', motif: 'Deux enquêteurs fouillent l’agenda, les tiroirs et les archives de l’étude.', dit: 'ce qui occupait la victime' },
      alibi: { nom: 'Vérifier l’alibi', dit: 'où il ou elle était vraiment' },
      moyens: { nom: 'Perquisition', motif: 'Sur mandat du juge : il faut une pièce sérieuse contre la personne.', dit: 'ce que cache son domicile' },
      banque: { nom: 'Téléphonie et comptes', dit: 'son GSM et son argent' },
    },
    // Pièces libres (voisinage, énigmes, appui, rattrapage) : jamais une perquisition, jamais la scène.
    libres: suspects.flatMap((_, i) => [`occ:${i}`, `mob:${i}`]),
    constatsBase: ['c:legiste1', 'c:cam', 'c:agenda'],
    // Mandat de perquisition (et réaudition) : au moins une de ces pièces au dossier.
    charges: {
      0: ['occ:0', 'mob:0', 'c:labo'],
      1: ['occ:4', 'mob:1', 'x:liste', 'x:wifi', 'Rb:2', 'x:pv1999', 'Rb:4'],
      2: ['mob:2', 'c:tel1', 'c:acte'],
      3: ['c:agenda', 'occ:3', 'mob:3'],
      4: ['c:acte', 'occ:4', 'mob:4'],
    },
    // Ce qui blanchit un innocent : une pièce, ou un groupe de pièces qui ne valent qu'ensemble.
    innocente: {
      // Nathalie : sortie du centre à 21:36 (plaque) et chez elle à 21:55 ; or la victime vit encore à 21:47 (« le voilà »),
      // le légiste la dit morte après 21:45 et son GSM quitte la maison à 22:09.
      0: [['occ:0', 'mob:2'], ['Ra:0', 'mob:2'], ['occ:0', 'c:legiste2'], ['occ:0', 'c:tel2']],
      2: ['occ:2'],
      3: ['Ra:3', 'moy:3', ['occ:3', 'x:heure', 'c:legiste2']],
      4: ['occ:4'],
    },
    // Confrontation : trois pièces accablantes, dont au moins deux décisives (obtenues par l'enquête).
    confront: {
      decisives: ['x:wifi', 'moy:1', 'Rb:4', 'x:liste', 'Ra:1', 'Rb:1', 'Rd:1'],
      accablantes: ['doc:journal', 'A:1', 'x:wifi', 'moy:1', 'Rb:4', 'x:liste', 'Ra:1', 'Rd:1', 'Rb:1', 'Rc:1', 'Re:1', 'Rf:1',
        'occ:4', 'mob:4', 'occ:1', 'mob:1', 'c:cam', 'x:heure', 'mob:2', 'Ra:2', 'Rb:2', 'Rc:2', 'mob:0', 'Rb:0', 'c:agenda', 'c:lettres',
        'moy:2', 'x:pv1999', 'c:tel1', 'c:tel2', 'r:tel', 'c:legiste2', 'Rc:0', 'Ra:3', 'r:mireille', 'd:corbeau', 'c:labo', 'Re:0'],
    },
    rebonds: {
      3: { f: 'r:tel', titre: 'Le GSM du notaire retrouvé au Jardin du Mayeur', texte: 'Un jardinier communal l’a repêché dans le bassin de la fontaine, derrière l’hôtel de ville. Éteint, la puce intacte.' },
      5: { f: 'r:mireille', titre: 'Une vieille dame au commissariat', texte: 'Mireille Mahieu, ancienne secrétaire de l’étude, dit savoir pourquoi le notaire est mort.' },
    },
    recit3: {
      victime: 'Paul-Henri Dusart', scene: 'rampe', valeur: '', journal: JOURNAL,
      pvc: { numero: 'DD.55.L3.084417/26', ...PVC }, plainte: null,
      auditions: SUSPECTS.map((s, i) => ({ numero: `DD.55.L3.0845${String(20 + i * 9)}/26`, qui: `${s.nom}, ${s.age} ans`, role: s.role.charAt(0).toUpperCase() + s.role.slice(1), heure: `${i < 3 ? 'Vendredi' : 'Samedi'}, ${['15:10', '16:30', '18:00', '09:15', '10:40'][i]}`, qr: AUDITIONS[i] })),
    },
    recitFinal: [
      'Olivier Brasseur, le filleul, avait tué Paul-Henri Dusart jeudi vers 21:58, d’un coup du sceau de l’étude. Il avait éteint son GSM et demandé à Jérôme Cambier de le couvrir avant même de partir. Il a maquillé une chute au pied de l’escalier, lavé son verre, emporté le dossier « L. M. — 1999 », le sceau et le GSM de la victime. À 22:41, depuis les toilettes de la Brasserie des Échevins, il a envoyé à Nathalie « Reviens. Il faut qu’on parle. Papa. » pour faire vivre le mort pendant qu’il était à table. Le GSM, lui, s’était connecté au wifi de la brasserie. Dans son audition, il parlait d’un SMS que personne ne connaissait.',
      'Pourquoi ? Le soir du Doudou 1999, Olivier, 22 ans, homme de feuilles n° 7, était parti au bord du canal avec Lucie Mahieu, 19 ans. Elle était tombée à l’eau pendant une dispute ; il était rentré chez lui sans appeler personne. Son père, Jacques Brasseur, avait acheté le témoignage de Bruno Lheureux. Vingt-sept ans plus tard, Paul-Henri Dusart avait tout compris, et lui donnait jusqu’à jeudi soir.',
      'Ce que personne n’avait compris : Lucie était la fille cachée du notaire. Le vieil homme aux « petits dossiers » n’enquêtait pas pour tenir quelqu’un : il voulait, lundi, la reconnaître enfin. Et l’acte de prêt de juillet 1999, celui qui avait payé le silence, c’est lui qui l’avait rédigé et signé. « Vous étiez là, Maître », écrivait le corbeau.',
      'Nathalie Dusart avait menti sur sa soirée : elle était venue à 21:04 demander 40 000 € pour sa pharmacie, et repartie à 21:31, furieuse, en apprenant qu’elle avait eu une sœur. Son verre au salon, le SMS effacé, une caméra qui la montrait ressortir « à 22:31 » : la coupable idéale. Mais la caméra d’en face était restée à l’heure d’été, et à 21:47 son père était vivant, au téléphone, et ouvrait la porte à un homme.',
      'Bruno Lheureux avait effacé le dernier message de la victime parce qu’il était le corbeau : celui qui avait menti pour les Brasseur en 1999 et qui, menacé d’expulsion, voulait que le notaire fasse ce qu’il n’avait jamais osé faire. Il n’a pas quitté son comptoir de la soirée.',
      'Margaux Lefrancq avait mis au clou la montre de gousset du père de la victime. Elle l’avait rachetée jeudi et était venue la remettre en cachette, à 22:36. Elle a trouvé le corps, lâché la montre sur la console et fui ; le lendemain, elle a « découvert » le corps. Elle a vu ce que personne d’autre n’a vu : le GSM n’était déjà plus sur le bureau, avant le SMS de 22:41.',
      'Jérôme Cambier avait couvert Olivier en croyant à une maîtresse. Son vieux dossier de 2004 et sa commission en faisaient un suspect commode ; les badges de l’immeuble le montrent seul à son bureau toute la soirée.',
    ].join('\n'),
    accroche: 'Cinq proches, cinq mensonges, une vieille histoire de Doudou : un seul a tué.',
  };
}
