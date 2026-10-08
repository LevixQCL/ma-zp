// Troisième affaire écrite à la main : « Le corbeau de la rue d'Havré » (Mons). Pas de meurtre : un corbeau.
// Bible complète (vérité, chronologie, personnages, révélations) : hors dépôt (projet Claude « MA ZP », gardée privée).
// En bref : trois semaines de lettres en ruban d'étiqueteuse, puis six affiches accusant le président du comité de
// quartier, posées jeudi soir pendant sa réunion. On croit à un règlement de comptes ; en réalité, tout servait à cacher
// une seule lettre, pour une vieille dame malvoyante que le président dépouillait et dont il triait le courrier.
// Le casse-tête : des films électrostatiques (trente secondes par vitrine) posés après l'averse, pendant que toute la rue
// était dans la même salle ; une absence de huit minutes suffisait. Le détail sous les yeux : à 8:15, la plaignante
// parle de « sept affiches » ; la septième n'a été trouvée qu'à 9:40.
// Même moteur que les meurtres écrits (meurtre: true) : confrontation, recoupements, déclic, hypothèse au juge, mobile.
// Les rues et les monuments sont réels ; commerces, comité, plateformes et personnes sont fictifs.

const hm = (h, m) => h * 60 + m;

// Lieux du plan (coordonnées du plan 880 × 900) et adresse pour l'itinéraire Google Maps.
export const LIEUX_CORBEAU = {
  scene: { nom: 'Les vitrines de la rue d’Havré', sous: 'rue d’Havré · la scène', x: 606, y: 432, adresse: 'Rue d’Havré, 7000 Mons' },
  comptoir: { nom: 'Le Comptoir d’Havré', sous: 'rue d’Havré · la réunion du comité', x: 626, y: 444, adresse: 'Rue d’Havré, 7000 Mons' },
  imprimerie: { nom: 'Imprim’Havré', sous: 'rue d’Havré · chez Maxime Delcourt', x: 566, y: 440, adresse: 'Rue d’Havré, 7000 Mons' },
  cour: { nom: 'La cour du n° 40', sous: 'chez Odile Hautecœur', x: 656, y: 412, adresse: 'Rue d’Havré 40, 7000 Mons' },
  grandplace: { nom: 'Grand-Place', x: 449, y: 412, adresse: 'Grand-Place, 7000 Mons', repere: true },
  beffroi: { nom: 'Beffroi', x: 370, y: 384, adresse: 'Beffroi de Mons', repere: true },
  collegiale: { nom: 'Collégiale Sainte-Waudru', x: 262, y: 500, adresse: 'Collégiale Sainte-Waudru, Mons', repere: true },
  gare: { nom: 'Gare de Mons', x: 40, y: 416, adresse: 'Gare de Mons, 7000 Mons', repere: true },
  jemappes: { nom: '← Jemappes', sous: 'chez Jordan Lambotte, à 5 km', x: 48, y: 300, adresse: 'Jemappes, 7012 Mons', horsPlan: true },
  cuesmes: { nom: '↙ Cuesmes', sous: 'la partie de cartes, à 4 km', x: 70, y: 700, adresse: 'Cuesmes, 7033 Mons', horsPlan: true },
  nimy: { nom: '↑ Nimy', sous: 'livraisons de Jordan', x: 600, y: 60, adresse: 'Nimy, 7020 Mons', horsPlan: true },
  hyon: { nom: 'Hyon ↘', sous: 'livraisons de Jordan', x: 800, y: 830, adresse: 'Hyon, 7020 Mons', horsPlan: true },
};

const SUSPECTS = [
  {
    nom: 'Bernard Vanderhaegen', photo: 'img/corbeau/p0.webp', prenom: 'Bernard', f: false, age: 63, role: 'président du comité de quartier, la cible des affiches', roleDetail: 'ancien comptable, il fait les courses de quatre personnes âgées de la rue', proche: true,
    vehicule: { t: 'à pied (habite la rue d’Havré)', mode: 'pied', rien: true },
    alibi: { type: 'couvre', pos: 'comptoir', lieu: 'à la réunion du comité, au Comptoir d’Havré, qu’il présidait', ditDe: hm(19, 45), ditA: hm(22, 45) },
    rumeur: 'vengeance',
    fiche: { declaration: 'Dit avoir présidé la réunion du comité, au Comptoir d’Havré, de 20:00 à la fin.', rumeur: 'Rumeur : le corbeau, ce serait lui. Il garde les archives du comité, voit Odile Hautecœur tous les jours, et s’accuse lui-même pour passer pour une victime.' },
  },
  {
    nom: 'Maxime Delcourt', photo: 'img/corbeau/p1.webp', prenom: 'Maxime', f: false, age: 34, role: 'imprimeur, rue d’Havré', roleDetail: 'tient Imprim’Havré et habite au-dessus ; pas membre du comité', proche: false,
    vehicule: { t: 'une camionnette blanche', mode: 'moteur' },
    alibi: { type: 'mensonge', pos: 'imprimerie', lieu: 'chez lui, au-dessus de l’imprimerie, seul', ditDe: hm(19, 0), ditA: hm(24, 30) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir passé la soirée chez lui, au-dessus de l’imprimerie, seul.', rumeur: 'Rumeur : seul à savoir imprimer de grandes affiches dans la rue. Au comptoir, il a lancé : « Ce corbeau, je lui imprime son affiche en A0. »' },
  },
  {
    nom: 'Nathalie Brasseur', photo: 'img/corbeau/p2.webp', prenom: 'Nathalie', f: true, age: 47, role: 'fleuriste, rue d’Havré', roleDetail: 'tient Le Jardin d’Havré ; membre du comité, venue avec son mari', proche: true,
    vehicule: { t: 'une camionnette de livraison', mode: 'moteur' },
    alibi: { type: 'couvre', pos: 'comptoir', lieu: 'à la réunion du comité, sans quitter sa chaise', ditDe: hm(19, 45), ditA: hm(22, 45) },
    rumeur: 'vengeance',
    fiche: { declaration: 'Dit avoir assisté à toute la réunion du comité, avec son mari, sans quitter sa chaise.', rumeur: 'Rumeur : elle a acheté une étiqueteuse en septembre, et elle accuse partout le président d’être lui-même le corbeau.' },
  },
  {
    nom: 'Jordan Lambotte', photo: 'img/corbeau/p3.webp', prenom: 'Jordan', f: false, age: 24, role: 'étudiant en architecture, petit-neveu d’Odile Hautecœur', roleDetail: 'appelle sa grand-tante tous les soirs ; habite Jemappes', proche: true,
    vehicule: { t: 'un vélo', mode: 'pied' },
    alibi: { type: 'mensonge', pos: 'jemappes', lieu: 'chez lui, à Jemappes, sur une maquette', ditDe: hm(19, 0), ditA: hm(24, 30) },
    rumeur: 'vengeance',
    fiche: { declaration: 'Dit avoir passé la soirée chez lui, à Jemappes, à finir une maquette.', rumeur: 'Rumeur : le président l’a écarté de sa tante, « il vient pour son argent ». Il a juré de le lui faire payer.' },
  },
  {
    nom: 'Hélène Dufrasne', photo: 'img/corbeau/p4.webp', prenom: 'Hélène', f: true, age: 52, role: 'libraire, secrétaire du comité, la plaignante', roleDetail: 'tient la Librairie Dufrasne, à côté du café, point relais colis', proche: true,
    vehicule: { t: 'à pied (habite au-dessus de la librairie)', mode: 'pied', rien: true },
    alibi: { type: 'couvre', pos: 'comptoir', lieu: 'à la réunion du comité, à la table du bureau', ditDe: hm(19, 45), ditA: hm(22, 45) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir pris les notes de la réunion, à la droite du président, et n’être sortie que deux minutes chercher des photocopies.', rumeur: 'Rumeur : elle a reçu une lettre, elle aussi, et a porté plainte la première. On la dit « toujours fourrée chez la vieille Odile, le dimanche ».' },
  },
];
const COUPABLE = 4;

const AUDITIONS = [
  [
    ['Depuis quand recevez-vous des lettres ?', 'Une seule, fin septembre. « Président, combien coûtent des colis de Noël qu’on ne distribue pas ? » L’an dernier, on a manqué de bénévoles, voilà tout. Je l’ai jetée.'],
    ['Où étiez-vous jeudi soir ?', 'Je présidais la réunion, de huit heures à la fin. Trente personnes peuvent vous le dire, et Fabrice filmait.'],
    ['Qui peut vous en vouloir à ce point ?', 'Quand on s’occupe des autres, on dérange. Je fais les courses de quatre personnes âgées de la rue. Certains neveux n’aiment pas qu’on s’occupe de leur tante.'],
    ['Vous gérez le courrier de Mme Hautecœur ?', 'Je le trie, oui, elle n’y voit plus. Des factures, des publicités. Rien d’intéressant.'],
    ['On dit que le corbeau, c’est vous.', 'Nathalie Brasseur dit ça. Je serais assez fou pour m’accuser moi-même sur six vitrines ? Cherchez plutôt qui avait le temps de coller tout ça pendant la nuit.'],
  ],
  [
    ['Où étiez-vous jeudi soir ?', 'Chez moi, au-dessus de l’imprimerie. Seul. Je ne suis pas membre du comité : les réunions, ce n’est pas mon truc.'],
    ['Vous avez reçu une lettre ?', 'Oui. « Le fisc sait-il combien tu encaisses en liquide ? » Comme tous les commerçants de la rue, j’ai des clients qui paient en liquide. Ce n’est pas un secret, c’est la vie.'],
    ['Vous avez dit que vous imprimeriez son affiche en A0.', 'C’était une blague, au comptoir. Et franchement, ses affiches, c’est du beau travail. Pas du travail d’amateur.'],
    ['Vous savez imprimer ce genre d’affiche ?', 'Ça dépend de quoi elles sont faites. Je n’ai pas pu les voir de près : vos collègues avaient tout enlevé quand je suis descendu, vendredi.'],
    ['Que pensez-vous de Bernard Vanderhaegen ?', 'Il m’a fait la morale parce que je ne mettais pas de guirlande. Pour le reste, il compte bien : c’est son métier.'],
  ],
  [
    ['Où étiez-vous jeudi soir ?', 'À la réunion, du début à la fin, avec mon mari. Je n’ai pas bougé de ma chaise.'],
    ['Votre lettre ?', '« Tes couronnes ont-elles déjà servi au cimetière ? » Une fois. Une couronne reprise, refleurie. Une fois ! Et quelqu’un le savait.'],
    ['Vous accusez Bernard Vanderhaegen d’être le corbeau.', 'Il a les archives du comité, il sait tout sur tout le monde, il passe ses journées chez la vieille Odile qui sait le reste. Et le voilà « victime ». Ça ne vous paraît pas commode ?'],
    ['Vous avez acheté une étiqueteuse en septembre.', 'Pour mes plantes. Vous allez arrêter tous les gens qui ont une étiqueteuse ?'],
    ['Avez-vous quelque chose à ajouter ?', 'Le jour où la rue saura qui c’est, je ne voudrais pas être à sa place.'],
  ],
  [
    ['Où étiez-vous jeudi soir ?', 'Chez moi, à Jemappes. J’avais une maquette à finir pour l’atelier.'],
    ['Quel est votre lien avec la rue d’Havré ?', 'Ma grand-tante, Odile Hautecœur, au 40. Je l’appelle tous les soirs. Je passais la voir le samedi, avant que M. Vanderhaegen décide que je venais « pour son argent ».'],
    ['Votre lettre ?', '« Livreur, sous quel nom roules-tu ? » Je… je ne vois pas de quoi il parle.'],
    ['Que pensez-vous de Bernard Vanderhaegen ?', 'Qu’il prend beaucoup de place chez ma tante. Elle signe ce qu’il lui tend. Elle ne voit plus rien, vous savez.'],
    ['Avez-vous quelque chose à ajouter ?', 'Les affiches, je ne les ai même pas vues. Je n’ai pas mis les pieds rue d’Havré jeudi.'],
  ],
  [
    ['Vous avez porté plainte. Racontez.', 'Trois semaines que la rue vit dans la peur. Et jeudi, sept vitrines salies, pendant notre réunion, vous vous rendez compte ? Il fallait bien que quelqu’un fasse quelque chose.'],
    ['Où étiez-vous jeudi soir ?', 'À la réunion, à la droite de Bernard : je suis la secrétaire, je prenais les notes. Je ne suis sortie que deux minutes, chercher les photocopies du budget à la librairie, à côté.'],
    ['Votre lettre ?', '« Libraire, tes clients savent-ils où dort ton fils ? » Mon fils… je ne sais même pas ce qu’il veut dire. C’est ça, un corbeau : il salit au hasard.'],
    ['Qui pourrait savoir tant de choses sur la rue ?', 'Quelqu’un qui est partout. Qui a les archives du comité, les clés de la moitié des vieux… Je ne veux accuser personne.'],
    ['Et ce que disent les affiches ?', 'Je suis secrétaire, pas trésorière. Bernard tient les comptes seul. Je n’ai jamais vu un relevé.'],
  ],
];

const TEXTES = {
  // Scène : le labo (affiches, lettres, enveloppes).
  'c:labo1': 'Les six affiches saisies, format A2. Ce n’est pas du papier : un film plastique électrostatique, qui tient sur une vitre sans colle ni adhésif et se pose en une trentaine de secondes. Impression latex, d’une imprimerie industrielle (au dos, les repères d’un rouleau de 1,60 m). Aucune empreinte exploitable (gants). Sous chaque film, la vitre est propre et sèche ; tout autour, le reste de la vitrine garde les traces de calcaire de la pluie. Un film électrostatique ne tient pas sur une vitre mouillée.',
  'c:labo2': 'Les dix lettres remises par leurs destinataires : des mots imprimés à l’étiqueteuse, collés sur une feuille A4 blanche. Ruban de 12 mm, fond blanc, texte noir, police Helvetica : une étiqueteuse à transfert thermique, du modèle qu’on trouve dans les bureaux et les commerces pour étiqueter rayons et prix. Particularité de ces appareils : la cassette garde, sur son ruban encreur, le négatif de tout ce qui a été imprimé. Aucune empreinte, timbres autocollants.',
  'c:labo3': 'Les enveloppes : kraft C5 « Bürokraft », toutes du même paquet. À Mons, cette marque n’est vendue que par deux commerces : Imprim’Havré et la Librairie Dufrasne. Adresses imprimées au ruban, elles aussi. Cachets de la poste : Mons X, du jeudi 24 septembre au mardi 6 octobre, une lettre par jour ouvrable ou presque, toutes postées dans la boîte de la Grand-Place.',
  // Scène : le direct et les caméras.
  'c:direct': 'Le direct de la réunion, publié sur la page du comité par Fabrice Lenoir, patron du café : téléphone sur pied au fond de la salle, on voit la table du bureau et une trentaine de chaises. Bernard Vanderhaegen préside, à l’écran de 20:02 à 22:31 sans quitter sa chaise ; Hélène Dufrasne, à sa droite, prend les notes. Sorties et retours :\n20:47 · Fabrice Lenoir, vers le bar (une minute).\n21:31 · le mari de Nathalie Brasseur, vers les toilettes ; retour 21:35.\n21:44 · Nathalie Brasseur, en bottes vertes, vers la cour fumeurs, au fond ; retour 22:06.\n21:49 · Hélène Dufrasne : « Je vais chercher les photocopies du budget. » Elle sort par la porte de la rue. Retour 21:57, une pile de feuilles à la main.\n22:31 · Paul Delbecq, le boulanger, part le premier et revient aussitôt : « Venez voir la vitrine du comité ! » Tout le monde se lève. Fin du direct à 22:33.\nAbsents : Maxime Delcourt et Jordan Lambotte (ni l’un ni l’autre n’est membre).',
  'c:camville': 'Caméra communale CAM 12, à l’angle de la Grand-Place et de la rue d’Havré. Elle ne filme que les vingt premiers mètres de la rue, côté Grand-Place ; les vitrines sont plus loin, et l’autre bout de la rue, vers le boulevard, n’est pas filmé.\n21:31 · un homme sous un parapluie remonte vers la Grand-Place.\nDe 21:40 à 22:09 · personne.\n22:10 · un cycliste en veste jaune de livreur, un grand tube noir en bandoulière, descend la rue sans s’arrêter. Le vélo et la veste sont ceux de Jordan Lambotte.\n22:34 · une dizaine de personnes sortent du café et marchent vers les vitrines.\nEntre la fin de l’averse et 22:10, personne n’est entré dans la rue par la Grand-Place.',
  'c:sonnette': 'La sonnette vidéo de la pharmacie d’Havré, déclenchée par le mouvement, filme le trottoir de haut en bas : on ne voit que des jambes.\n21:52:14 · des jambes passent de gauche à droite : pantalon sombre, chaussures plates à semelle claire. Une main tient un rouleau blanc. Quatre secondes d’arrêt devant la vitrine, puis les jambes repartent.\n22:10:31 · une roue de vélo.\n22:34:05 · plusieurs paires de jambes.\nAucun autre mouvement entre la fin de l’averse et 22:34.',
  // Scène : les destinataires.
  'c:dest': 'Les dix destinataires, dans l’ordre des cachets de la poste. Chacun a dit aux enquêteurs, en privé, si le secret était vrai.\n24/9 · Bernard Vanderhaegen : « Président, combien coûtent des colis de Noël qu’on ne distribue pas ? » Nie.\n25/9 · Nathalie Brasseur : « Tes couronnes ont-elles déjà servi au cimetière ? » Reconnaît.\n28/9 · Maxime Delcourt : « Le fisc sait-il combien tu encaisses en liquide ? » Reconnaît à demi-mot.\n29/9 · Paul Delbecq, boulanger : « Ta farine bio vient-elle du supermarché ? » Reconnaît, en riant jaune.\n30/9 · Fabrice Lenoir, café : « Ton vin maison sort de quel carton ? » Reconnaît.\n1/10 · Sabine Cornez, pharmacienne : « La pharmacie est-elle à toi, ou à ton ex-mari ? » Reconnaît.\n2/10 · Hélène Dufrasne : « Libraire, tes clients savent-ils où dort ton fils ? » Dit ne pas comprendre.\n2/10 · Jordan Lambotte (à Jemappes) : « Livreur, sous quel nom roules-tu ? » Refuse de répondre.\n5/10 · Gérard Petit, agence Évasion : « Tes clients savent-ils que tu n’as jamais pris l’avion ? » Reconnaît.\n6/10 · Rosine Delplace : « Bijou a-t-il vraiment un pedigree ? » Reconnaît.\nOdile Hautecœur, au 40, n’a reçu aucune lettre.',
  'c:rosine': 'Rosine Delplace, 70 ans, promène son teckel, Bijou, tous les soirs dans la rue d’Havré : « Je suis sortie dès que l’averse s’est arrêtée, à 21:42 à l’horloge de la pharmacie. Les vitrines ruisselaient encore et il n’y avait rien dessus, j’en suis sûre : Bijou s’arrête devant chaque porte. J’ai fait le tour par la rue du Gouvernement et je suis repassée vers 22:20 : il y avait de grandes affiches partout. J’ai cru à une publicité. Je n’ai croisé personne. »',
  'c:septieme': 'Vendredi à 9:40, en déposant le courrier au fond de la cour du n° 40, le facteur a trouvé une septième affiche, sur la porte d’Odile Hautecœur, 84 ans, invisible depuis la rue. Même film électrostatique. Mais posée bas, à 1,40 m du sol, en lettres de 9 cm de haut, bien plus grosses que sur les six autres : « MADAME ODILE. NE SIGNEZ RIEN LUNDI. CELUI QUI VOUS AIDE VOUS VOLE. » Pas de signature. Mme Hautecœur, très malvoyante, ne l’avait pas vue. Jeudi soir, la patrouille avait constaté six affiches.',
  // Bernard (0).
  'occ:0': 'Le direct de la réunion, image par image : Bernard Vanderhaegen préside à la table du bureau de 20:02 à 22:31. Il ne quitte pas sa chaise une seule fois ; il fait même passer les feuilles du budget de main en main sans se lever. Il n’a pas pu poser une seule affiche.',
  'mob:0': 'Comptes de Bernard Vanderhaegen : une pension confortable et, chaque mois depuis avril 2025, un virement de 600 € du compte d’Odile Hautecœur, communication « courses ». Il détient la carte du compte du comité. Agenda de son GSM : lundi 10:00, « Banque — Odile — procuration ». Aucun appel jeudi soir.',
  'moy:0': 'Perquisition chez Bernard Vanderhaegen : dans le tiroir de son bureau, la clé de la boîte aux lettres d’Odile Hautecœur ; une enveloppe de 3 100 € en billets ; un formulaire de procuration générale déjà rempli ; et une lettre du corbeau, ouverte. Enveloppe kraft sans timbre ni cachet : « Madame Odile Hautecœur — en main propre ». Dedans, au ruban d’étiqueteuse : « MADAME ODILE. NE SIGNEZ RIEN LUNDI. CELUI QUI VOUS AIDE VOUS VOLE. UNE AMIE. »',
  // Maxime (1).
  'occ:1': 'Bornes du GSM de Maxime Delcourt : à Cuesmes, à 4 km, de 20:20 à 00:15. À 21:58, il retire 200 € au distributeur de la place de Cuesmes. Il n’était pas chez lui, au-dessus de l’imprimerie, comme il l’a dit.',
  'mob:1': 'Comptes de Maxime Delcourt : l’imprimerie doit deux trimestres de TVA. En juin, achat de deux rouleaux de film électrostatique de 1,37 m de large (« commande client »). GSM, jeudi 17:12, d’un numéro inconnu : « Table à 20h30. Liquide uniquement. »',
  'moy:1': 'Perquisition à Imprim’Havré : la grande imprimante est en panne depuis lundi (ticket du technicien : « tête d’impression HS, pièce commandée ») ; c’est une machine à encre solvant, pas latex, pour des rouleaux de 1,37 m. Un rouleau de film électrostatique entamé. Pas d’étiqueteuse. Dans un tiroir : des jetons de poker et 2 400 € en liquide.',
  // Nathalie (2).
  'occ:2': 'Le serveur du Comptoir d’Havré : « Mme Brasseur était dans la cour fumeurs, au fond, de 21:45 à 22:05 à peu près, au téléphone. Trois cigarettes. Je la voyais par la vitre du bar. » La cour est fermée par une grille cadenassée, la clé est chez le patron : on n’en sort que par la salle, sous la caméra du direct. Elle n’est pas allée dans la rue.',
  'mob:2': 'GSM de Nathalie Brasseur : jeudi, de 21:46 à 22:03, appel avec sa sœur, à Lille. Comptes : le 12 septembre, achat d’une étiqueteuse et de trois rubans dans une grande surface de Jemappes. Mardi, un virement à un cabinet d’avocats montois.',
  'moy:2': 'Perquisition au Jardin d’Havré : l’étiqueteuse, qui sert aux étiquettes des pots. Ses rubans font 9 mm de large, transparents, texte noir. Les lettres du corbeau sont sur ruban de 12 mm, fond blanc. Dans le bureau, un courrier d’avocat : « Requête en divorce, projet ».',
  // Jordan (3).
  'occ:3': 'Plateforme de livraison : le compte est au nom de Ryan Lambotte, son frère, mais les selfies de contrôle montrent Jordan. GPS du vélo jeudi soir : en mouvement de 21:30 à 22:45. 21:41, retrait d’un repas à Nimy ; 21:53, livraison à Hyon ; 22:04, retrait à la Grand-Place ; 22:10, il traverse la rue d’Havré à 18 km/h sans s’arrêter ; 22:16, livraison boulevard Dolez. Pas un arrêt de plus de deux minutes ailleurs qu’aux adresses de livraison.',
  'mob:3': 'GSM de Jordan Lambotte : il appelle Odile Hautecœur chaque soir vers 19:00 (jeudi : 19:02, onze minutes). Le 22 septembre, à un ami : « ce Vanderhaegen, je vais finir par lui faire bouffer ses colis de Noël ». Comptes : des virements réguliers de son frère Ryan.',
  'moy:3': 'Perquisition chez Jordan Lambotte, à Jemappes : un tube à plans noir, avec trois plans d’atelier en A1 (« Logements rue de la Halle »), une veste jaune de livreur, des cutters de maquettiste, et la lettre du corbeau, gardée. Ni étiqueteuse, ni film.',
  // Hélène (4).
  'occ:4': 'Le direct : Hélène Dufrasne sort à 21:49 (« Je vais chercher les photocopies du budget ») et revient à 21:57, une pile de feuilles à la main. Sa librairie est à côté du café, à quinze mètres. Journal de son imprimante : les 40 photocopies du budget ont été imprimées à 18:20.',
  'mob:4': 'Comptes d’Hélène Dufrasne : la librairie survit de justesse. Depuis 2021, 300 € par mois versés à Bernard Vanderhaegen (une reconnaissance de dette de 20 000 €, « prêt Covid »). La librairie est point relais Colis-Point ; registre de la semaine : quatre colis, dont, mardi, un colis d’AfficheExpress (Gand) pour « M. Odon », remis à 18:41. GSM : rien d’utile jeudi soir.',
  'moy:4': 'Perquisition à la Librairie Dufrasne : l’étiqueteuse des prix, à transfert thermique, ruban de 12 mm, fond blanc. Dans le bac à papier à recycler, une cassette usagée du même modèle. Le labo déroule son ruban encreur, qui garde le négatif de tout ce qui a été imprimé : on y lit, à l’envers, les mots des dix lettres du corbeau. Et tout au début du ruban, avant tous les autres : « MADAME ODILE. NE SIGNEZ RIEN LUNDI. »',
  // Rebondissements.
  'r:odile': 'Odile Hautecœur, 84 ans, s’est fait conduire au commissariat par une voisine : « On m’a dit qu’il y avait une affiche pour moi. Pour moi ! Je n’ai jamais reçu de lettre : c’est Bernard qui ouvre mon courrier, mes yeux ne lisent plus que les gros titres, à la loupe. Lundi, oui, je devais signer à la banque ; Bernard m’accompagne, c’est plus simple. Qui le savait ? Bernard, bien sûr. Mon petit-neveu Jordan, qui m’appelle tous les soirs : je lui raconte tout, Bernard dit que j’ai tort. Et la petite Hélène, qui me lit la Gazette le dimanche. Les secrets de la rue ? Évidemment que je les connais : j’ai tenu la mercerie quarante-deux ans. Les gens racontent tout à leur mercière. Et moi, je raconte tout à ceux qui viennent me voir. »',
  'r:relais': 'AfficheExpress, imprimerie en ligne à Gand, répond à la réquisition : mercredi 30 septembre, commande de sept films électrostatiques A2, dont un avec un autre texte, en très gros caractères. Client : « M. Odon », payé par carte prépayée. Livraison : mardi 6 octobre, au point relais Colis-Point « Librairie Dufrasne, rue d’Havré ». Statut : « remis au destinataire ».',
  // Recoupements.
  'x:fenetre': 'Recoupement : les films ont été posés sur des vitres sèches. L’averse a cessé à 21:40, et les vitrines ruisselaient encore à 21:42 ; à 22:20, les affiches étaient en place. Un film électrostatique se pose en trente secondes : six vitrines sur cent cinquante mètres, c’est cinq ou six minutes, marche comprise. Pas besoin de la nuit, ni de colle : une courte absence de la réunion suffisait.',
  'x:sept': 'Recoupement : vendredi à 8:15, au commissariat, Hélène Dufrasne parle des « sept affiches ». À cette heure-là, la patrouille en avait compté six ; la septième, au fond de la cour du 40, n’a été découverte par le facteur qu’à 9:40. Personne ne pouvait savoir qu’il y en avait sept. Sauf qui les avait posées.',
  'x:premiere': 'Recoupement : la lettre trouvée chez Bernard Vanderhaegen n’a pas été postée : ni timbre ni cachet, « en main propre ». Même ruban, même papier, mêmes enveloppes que les dix autres. Bernard l’a prise dans la boîte d’Odile Hautecœur le samedi 19 septembre, cinq jours avant la première lettre postée. Le corbeau a d’abord écrit à une seule personne. Les dix autres lettres ne sont venues qu’après, quand celle-ci est restée sans effet : pour qu’on ne remarque pas la seule qui comptait.',
  'x:secrets': 'Recoupement : chaque secret des dix lettres, Odile Hautecœur le connaissait : on le lui avait confié à la mercerie, ou elle l’avait deviné. Neuf sont vrais. Un seul est faux : le fils d’Hélène Dufrasne, Arnaud, est ingénieur à Gand, casier vierge, et Odile reçoit ses cartes postales. Le corbeau connaissait tout ce que raconte Odile, et s’est inventé un secret pour lui-même.',
  'x:caisse': 'Recoupement : les affiches disaient vrai. Compte du comité (carte au nom de Bernard Vanderhaegen, président et trésorier) : 14 200 € retirés en liquide en dix-huit mois, aucun colis de Noël l’an dernier. Compte d’Odile Hautecœur : 600 € par mois virés à Bernard « pour les courses » ; elle en dépense environ 150. Lundi, il devait lui faire signer une procuration générale. Le parquet ouvre un dossier pour abus de faiblesse. Mais jeudi soir, Bernard n’a pas quitté sa chaise.',
  'x:relais': 'Recoupement : le colis d’AfficheExpress, les sept films, a été remis au point relais de la Librairie Dufrasne mardi à 18:41. La librairie ferme à 18:30 et Hélène Dufrasne y travaille seule. Personne du nom d’Odon n’est connu à Mons. Le colis n’a jamais quitté la librairie.',
  // Déclic : une lettre en ruban arrive au commissariat de la zone quand son dossier tient le bon fil.
  'd:lettre': 'Lettre anonyme déposée dans la boîte du commissariat, sans timbre, au ruban d’étiqueteuse : « VOUS COMPTEZ LES LETTRES ? IL EN MANQUE UNE. LA PREMIÈRE. LE PRÉSIDENT SAIT OÙ ELLE EST. »',
};

// Réauditions : clé = suspect, puis pièce opposée → [code de la nouvelle pièce, sa réponse].
export const REACTIONS = {
  0: {
    'moy:0': ['Ra', 'Cette lettre… Je l’ai trouvée dans la boîte d’Odile, un samedi de septembre, avant toutes les autres. Pas de timbre. Je l’ai gardée pour ne pas l’affoler. Elle a quatre-vingt-quatre ans, vous voulez qu’elle fasse une attaque ?'],
    'x:caisse': ['Rb', 'Des comptes, ça se lit de travers quand on ne sait pas les lire. Je ne dirai plus rien sans mon avocat.'],
    'mob:0': ['Rc', 'Six cents euros, c’est ce que coûtent les courses, le pharmacien, le coiffeur. Elle ne se rend pas compte. Lundi, la procuration, c’était pour la protéger.'],
    'r:odile': ['Rc', 'Six cents euros, c’est ce que coûtent les courses, le pharmacien, le coiffeur. Elle ne se rend pas compte. Lundi, la procuration, c’était pour la protéger.'],
    'c:septieme': ['Rd', '« Celui qui vous aide »… C’est moi qu’on vise, évidemment : je l’aide depuis deux ans. Et qui d’autre irait lui parler de lundi ? Ce corbeau la connaît bien, croyez-moi.'],
  },
  1: {
    'occ:1': ['Ra', 'Bon. J’étais à Cuesmes, dans l’arrière-salle d’un café, à une table de poker. Pas déclarée, la table. Je ne vous donnerai pas les noms. Mais je n’ai pas mis un pied rue d’Havré avant minuit.'],
    'c:labo1': ['Rb', 'Du film électrostatique imprimé en latex sur un rouleau de 1,60 m ? C’est de l’imprimerie industrielle, commandé en ligne. Ma machine fait du solvant, en 1,37 m, et elle est en panne depuis lundi. Demandez au technicien.'],
    'mob:1': ['Rc', 'Le film de juin, c’était pour la vitrine d’un opticien de Jemappes. Allez voir, elle y est encore.'],
  },
  2: {
    'occ:2': ['Ra', 'D’accord, je suis sortie. Dans la cour, pour fumer : j’ai promis à mon mari d’arrêter. Et j’appelais ma sœur… pour lui parler de mon divorce. Mon mari était dans la salle. Vous comprenez pourquoi je ne l’ai pas dit ?'],
    'c:direct': ['Ra', 'D’accord, je suis sortie. Dans la cour, pour fumer : j’ai promis à mon mari d’arrêter. Et j’appelais ma sœur… pour lui parler de mon divorce. Mon mari était dans la salle. Vous comprenez pourquoi je ne l’ai pas dit ?'],
    'mob:2': ['Rb', 'Mon étiqueteuse ? Ruban transparent de 9 mm, pour mes pots. Comparez donc avec les lettres. Et mon avocat, ce n’est pas votre affaire.'],
  },
  3: {
    'occ:3': ['Ra', 'Oui, je livrais. Sur le compte de mon frère : avec ma bourse, je n’ai pas le droit de travailler autant. Je suis passé rue d’Havré vers dix heures, sans m’arrêter. Le tube, c’est mes plans d’atelier : je sortais de l’école.'],
    'c:camville': ['Ra', 'Oui, je livrais. Sur le compte de mon frère : avec ma bourse, je n’ai pas le droit de travailler autant. Je suis passé rue d’Havré vers dix heures, sans m’arrêter. Le tube, c’est mes plans d’atelier : je sortais de l’école.'],
    'c:dest': ['Rb', '« Sous quel nom roules-tu »… Je ne l’ai dit qu’à une personne, en août : ma tante Odile. Elle répète tout, elle ne s’en rend pas compte. Votre corbeau, c’est quelqu’un qui l’écoute.'],
    'mob:3': ['Rc', 'Les colis de Noël ? L’an dernier, ma tante n’en a pas eu. Personne n’en a eu : c’est elle qui me l’a dit. J’ai écrit une bêtise à un copain, je n’ai rien fait.'],
  },
  4: {
    'occ:4': ['Ra', 'Huit minutes… J’ai fumé une cigarette devant la librairie. J’avais besoin d’air : Bernard nous avait fait vingt minutes sur le budget des guirlandes.'],
    'c:septieme': ['Rb', 'Neuf centimètres… À un mètre quarante, elle n’a pas besoin de se pencher, et avec sa loupe… Elle l’a lue ? Dites-moi qu’elle l’a lue.'],
    'moy:0': ['Rc', 'Il l’a ouverte. Il l’a gardée dans son tiroir. Trois semaines qu’il lit son courrier à sa place…'],
    'mob:4': ['Rd', 'Oui, je dois de l’argent à Bernard, il le rappelle à chaque réunion. Ce n’est pas un crime d’avoir des dettes. Les colis du point relais ? J’en reçois trente par semaine, je ne connais pas tous les noms.'],
    'x:secrets': ['Re', 'Mon fils va très bien, merci. Le corbeau s’est trompé sur moi, voilà tout. Ça arrive, même aux corbeaux.'],
    'c:sonnette': ['Rf', 'Des chaussures plates ? La moitié des femmes de la rue en portent. Et des hommes aussi.'],
  },
};
for (const [i, t] of Object.entries(REACTIONS)) for (const [code, r] of Object.values(t)) TEXTES[`${code}:${i}`] = r;
const NOMS_R = SUSPECTS.map((s) => s.nom);

const TITRES0 = {
  'c:labo1': 'Labo · les affiches', 'c:labo2': 'Labo · les lettres en ruban', 'c:labo3': 'Labo · enveloppes et cachets',
  'c:direct': 'Le direct de la réunion', 'c:camville': 'La caméra communale', 'c:sonnette': 'La sonnette de la pharmacie',
  'c:dest': 'Les dix destinataires', 'c:rosine': 'La promeneuse', 'c:septieme': 'La septième affiche',
  'r:odile': 'Odile Hautecœur se présente', 'r:relais': 'La réponse d’AfficheExpress',
  'x:fenetre': 'Quelques minutes suffisent', 'x:sept': 'Elle savait pour la septième', 'x:premiere': 'La première lettre',
  'x:secrets': 'Ce que savait Odile', 'x:caisse': 'Les affiches disaient vrai', 'x:relais': 'Le point relais',
  'd:lettre': 'Une lettre au commissariat',
};
const OPPOSE = {
  'c:labo1': 'les affiches', 'c:labo2': 'les lettres en ruban', 'c:labo3': 'les enveloppes', 'c:direct': 'le direct de la réunion',
  'c:camville': 'la caméra communale', 'c:sonnette': 'la sonnette de la pharmacie', 'c:dest': 'la liste des destinataires',
  'c:rosine': 'la promeneuse', 'c:septieme': 'la septième affiche', 'r:odile': 'Odile Hautecœur', 'r:relais': 'la réponse d’AfficheExpress',
  'x:caisse': 'les comptes du comité', 'x:secrets': 'ce que savait Odile', 'x:sept': 'l’heure de sa plainte', 'x:premiere': 'la première lettre',
};
const quoiOppose = (f, i) => (OPPOSE[f] || (/^R[a-z]:\d$/.test(f) ? `la nouvelle version de ${NOMS_R[Number(f.split(':')[1])].split(' ')[0]}` : f === 'doc:journal' ? 'le journal' : f === 'doc:pvc' ? 'le PV de constatations' : f.startsWith('A:') ? 'sa propre audition'
  : Number(f.split(':')[1]) === Number(i) ? { occ: 'son alibi vérifié', mob: 'sa téléphonie', moy: 'sa perquisition' }[f.split(':')[0]]
  : `${{ occ: 'la vérification d’alibi', mob: 'la téléphonie', moy: 'la perquisition' }[f.split(':')[0]]} de ${NOMS_R[Number(f.split(':')[1])].split(' ')[0]}`));
const TITRES = { ...TITRES0 };
for (const [i, t] of Object.entries(REACTIONS)) for (const [f, [code]] of Object.entries(t)) if (!TITRES[`${code}:${i}`]) TITRES[`${code}:${i}`] = `Réaudition · ${NOMS_R[i]} · face à ${quoiOppose(f, i)}`.replace('face à le ', 'face au ').replace('face à les ', 'face aux ');
const RESUMES = {
  'c:labo1': 'Du film, pas de colle', 'c:labo2': 'Ruban de 12 mm', 'c:labo3': 'Deux commerces vendent ces enveloppes',
  'c:direct': 'Qui sort, et quand', 'c:camville': 'Un livreur à 22:10', 'c:sonnette': 'Des jambes à 21:52',
  'c:dest': 'Dix lettres, dix secrets', 'c:rosine': 'Rien à 21:42, tout à 22:20', 'c:septieme': 'Une affiche pour Odile',
};

// Recoupements : deux pièces opposées l'une à l'autre (un par soir). Chaque paire possible mène au résultat.
export const RECOUPEMENTS = [
  { f: 'x:fenetre', paires: [['c:labo1', 'doc:journal'], ['c:labo1', 'c:rosine'], ['c:labo1', 'c:direct'], ['c:labo1', 'occ:4'], ['c:labo1', 'occ:2']] },
  { f: 'x:sept', paires: [['c:septieme', 'doc:pvc'], ['c:septieme', 'A:4']] },
  { f: 'x:premiere', paires: [['moy:0', 'c:dest'], ['moy:0', 'c:labo2'], ['moy:0', 'c:labo3'], ['Ra:0', 'c:dest'], ['moy:0', 'r:odile']] },
  { f: 'x:secrets', paires: [['r:odile', 'c:dest'], ['r:odile', 'c:labo2'], ['Rb:3', 'r:odile']] },
  { f: 'x:caisse', paires: [['mob:0', 'c:labo1'], ['mob:0', 'doc:pvc'], ['mob:0', 'r:odile'], ['moy:0', 'mob:0'], ['mob:0', 'c:septieme']] },
  { f: 'x:relais', paires: [['r:relais', 'mob:4'], ['r:relais', 'Rd:4']] },
];
// Déclic : quand le dossier d'une zone contient toutes les pièces `si`, la pièce `f` arrive le soir même.
export const DECLICS = [
  { si: ['c:dest', 'c:septieme', 'c:direct'], f: 'd:lettre', rapport: 'une lettre en ruban arrive à ton commissariat' },
];
// Relectures : une pièce prend un autre sens quand une autre est connue (affiché sous la pièce, sans conclure).
export const RELECTURES = {
  'c:direct': [{ si: 'x:fenetre', t: 'Quelques minutes suffisaient pour poser les affiches : une courte sortie compte.' }],
  'occ:4': [{ si: 'x:fenetre', t: 'Huit minutes dehors, entre 21:49 et 21:57 : en plein dans la fenêtre de pose.' }],
  'c:labo2': [{ si: 'x:premiere', t: 'La première lettre n’a pas été postée : elle a été déposée à la main chez Odile Hautecœur, le 19 septembre.' }, { si: 'moy:4', t: 'La cassette retrouvée à la Librairie Dufrasne garde le texte de toutes les lettres.' }],
  'c:dest': [{ si: 'x:secrets', t: 'Un seul secret est faux : celui de la lettre reçue par Hélène Dufrasne.' }],
  'c:septieme': [{ si: 'x:sept', t: 'À 8:15, Hélène Dufrasne parlait déjà de sept affiches ; celle-ci n’a été trouvée qu’à 9:40.' }],
  'c:labo1': [{ si: 'x:caisse', t: 'Ce que disent les affiches est vrai. Mais Bernard Vanderhaegen ne les a pas écrites.' }],
  'mob:4': [{ si: 'r:relais', t: 'AfficheExpress est l’imprimerie qui a fabriqué les affiches.' }],
};

// Coups de pouce : trois niveaux par fil, débloqués avec les jours. Jamais la solution, toujours une direction.
export const COUPS_DE_POUCE = [
  { fil: 'Le temps de pose', niveaux: [[2, 'Coller six grandes affiches prend du temps. Mais ont-elles été collées ?'], [4, 'Le labo dit comment tiennent les affiches ; une brève du journal dit quand les vitres étaient mouillées.'], [6, 'Recoupe l’analyse des affiches avec la météo ou avec la promeneuse : la fenêtre se resserre, et il ne faut que quelques minutes.']] },
  { fil: 'Les sorties de la réunion', niveaux: [[2, 'Toute la rue était dans la même salle. Le direct montre qui sort, et quand.'], [4, 'Une sortie courte n’est pas forcément une sortie innocente.'], [6, 'Combien de temps faut-il pour aller chercher une pile de feuilles déjà imprimées, à quinze mètres ?']] },
  { fil: 'Le vrai destinataire', niveaux: [[2, 'Relis le PV jusqu’au bout, et compte.'], [4, 'Une lettre n’est jamais arrivée. Qui trie le courrier d’Odile Hautecœur ?'], [6, 'Compare la lettre trouvée chez le président avec les cachets des dix autres.']] },
  { fil: 'Ce que savait le corbeau', niveaux: [[2, 'Les secrets des lettres viennent de quelqu’un qui connaît la rue depuis longtemps.'], [4, 'Odile Hautecœur sait tout de tout le monde. À qui le raconte-t-elle ?'], [6, 'Un des dix secrets est faux. Recoupe la liste des destinataires avec ce que dit Odile.']] },
  { fil: 'Les menteurs', niveaux: [[2, 'Chacun ment pour cacher autre chose : cherche quoi.'], [4, 'Une étiqueteuse n’en vaut pas une autre : regarde la largeur du ruban.'], [6, 'Le GPS d’un livreur ne s’arrête pas pour coller des affiches.']] },
];

// Hypothèse soumise au juge d'instruction (une par soir) : qui a posé les affiches, et dans quel créneau.
export const CRENEAUX = ['entre 21:00 et 21:40', 'entre 21:40 et 22:00', 'entre 22:00 et 22:30', 'entre 22:30 et minuit', 'dans la nuit, après minuit'];
const MEMBRES = (i) => i === 0 || i === 2 || i === 4; // à la réunion
// Chaque règle : (i, s, K) → 1 (appuie), −1 (contredit) ou 0. K(f) : la pièce f est-elle au dossier ?
const REGLES = {
  'doc:pvc': (i, s) => (s >= 3 ? -1 : 0), // les affiches sont découvertes à 22:31
  'c:labo1': (i, s) => (s === 0 ? -1 : 0), // vitres sèches : après l'averse
  'c:rosine': (i, s) => (s === 0 || s >= 3 ? -1 : s === 1 ? 1 : 0),
  'c:sonnette': (i, s) => (s === 1 ? 1 : -1), // des jambes et un rouleau à 21:52, rien d'autre jusqu'à 22:34
  'c:camville': (i, s, K) => (i === 3 && !K('occ:3') ? (s === 2 ? 1 : 0) : 0),
  'x:fenetre': (i, s) => (s === 1 ? 1 : s === 2 ? 0 : -1),
  // Le direct, lu naïvement (sans savoir qu'il suffit de quelques minutes) : une sortie courte ne laisse pas le temps.
  'c:direct': (i, s, K) => {
    if (i === 0) return -1;
    if (!MEMBRES(i)) return 0;
    if (i === 4) return s === 1 ? (K('x:fenetre') ? 1 : -1) : -1;
    return s === 1 || s === 2 ? (K('occ:2') ? -1 : 1) : -1; // Nathalie, dehors de 21:44 à 22:06
  },
  'occ:0': (i) => (i === 0 ? -1 : 0),
  'occ:1': (i) => (i === 1 ? -1 : 0),
  'occ:2': (i) => (i === 2 ? -1 : 0),
  'occ:3': (i) => (i === 3 ? -1 : 0),
  'occ:4': (i, s) => (i !== 4 ? 0 : s === 1 ? 1 : -1),
  'mob:1': (i) => (i === 1 ? 1 : 0),
  'moy:1': (i) => (i === 1 ? -1 : 0),
  'mob:2': (i, s, K) => (i === 2 && !K('moy:2') ? 1 : 0),
  'moy:2': (i) => (i === 2 ? -1 : 0),
  'mob:3': (i) => (i === 3 ? 1 : 0),
  'moy:0': (i, s, K) => (i === 0 && !K('x:premiere') && !K('occ:0') ? 1 : 0),
  'x:premiere': (i) => (i === 0 ? -1 : 0),
  'x:caisse': (i) => (i === 0 ? -1 : 0),
  'mob:4': (i) => (i === 4 ? 1 : 0),
  'moy:4': (i) => (i === 4 ? 1 : 0),
  'x:sept': (i) => (i === 4 ? 1 : 0),
  'x:secrets': (i) => (i === 4 ? 1 : 0),
  'x:relais': (i) => (i === 4 ? 1 : 0),
  'Rb:4': (i) => (i === 4 ? 1 : 0),
  'Ra:4': (i, s) => (i === 4 && s === 1 ? 1 : 0),
  'Ra:1': (i) => (i === 1 ? -1 : 0),
  'Ra:2': (i) => (i === 2 ? -1 : 0),
  'Ra:3': (i) => (i === 3 ? -1 : 0),
};
/** Hypothèse « suspect i, créneau s » face aux pièces connues : { pour: [f], contre: [f] }. */
export function evaluerHypotheseCorbeau(connus, i, s) {
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
export const MOBILES = ['Se venger de Bernard Vanderhaegen, à qui elle doit de l’argent', 'Faire baisser le prix des commerces de la rue', 'Protéger Odile Hautecœur de celui qui la vole', 'Faire chanter les commerçants de la rue'];
export const MOBILE_VRAI = 2;

const JOURNAL = {
  numero: 4239, date: 'Vendredi matin', surtitre: 'Faits divers · Mons',
  titre: 'Le corbeau de la rue d’Havré passe aux affiches',
  chapo: 'Après trois semaines de lettres anonymes, six vitrines de la rue d’Havré ont été couvertes jeudi soir d’affiches visant le président du comité de quartier. Le parquet a ouvert une enquête pour harcèlement.',
  legende: 'Une des vitrines de la rue d’Havré, jeudi vers 23:00. Les affiches ont été saisies dans la nuit.',
  corps: [
    'Ils étaient une trentaine, jeudi soir, au Comptoir d’Havré, pour la réunion mensuelle du comité de quartier Havré-Centre. À l’ordre du jour : le budget, les illuminations de fin d’année… et le corbeau. Depuis la fin septembre, une dizaine d’habitants et de commerçants de la rue ont reçu des lettres anonymes, faites de mots imprimés à l’étiqueteuse. Chacune révèle un petit secret de son destinataire.',
    'Vers 22:30, en partant, le boulanger découvre une grande affiche sur la vitrine du local du comité, juste en face du café. Il y en a six, sur six vitrines. Le même texte, en grosses lettres : le président du comité « se sert dans la caisse des colis de Noël ».',
    '« C’est de la calomnie, et c’est lâche », réagit Bernard Vanderhaegen, 63 ans, ancien comptable, président du comité depuis neuf ans. « Je donne mon temps à ce quartier, et à nos aînés. » Dans la rue, on rappelle qu’il « fait les courses de la moitié des personnes âgées ».',
    '« Le corbeau était peut-être assis parmi nous », souffle une commerçante. Une autre préfère accuser « quelqu’un qui connaît trop bien la rue, et qui a eu tout le temps de coller ça pendant qu’on était au café ».',
    'La police a saisi les affiches et demandé aux destinataires de remettre leurs lettres. « Nous prenons ces faits très au sérieux », indique le commissaire divisionnaire Marc Dewinter.',
  ],
  encadre: [['Où', 'Rue d’Havré, entre la Grand-Place et le boulevard'], ['Quand', 'Jeudi soir, découvert vers 22:30'], ['Quoi', 'Six affiches, dix lettres anonymes'], ['Cible', 'Le président du comité de quartier'], ['Signature', '« Le corbeau d’Havré »']],
  second: { titre: 'Une réunion filmée en direct', texte: 'Fabrice Lenoir, patron du café, filmait la réunion en direct sur la page du quartier. Seront entendus : le président Bernard Vanderhaegen ; la libraire Hélène Dufrasne, secrétaire du comité, qui a porté plainte ; la fleuriste Nathalie Brasseur, qui accuse ouvertement le président d’être lui-même le corbeau ; l’imprimeur Maxime Delcourt, absent jeudi ; et Jordan Lambotte, petit-neveu de l’ancienne mercière de la rue, Odile Hautecœur.' },
  breve: ['Météo', 'Grosse drache jeudi soir sur le centre de Mons : 14 litres au mètre carré entre 21:05 et 21:40, selon l’IRM. Des caves inondées rue de la Halle. Retour du sec vendredi.'],
  breve2: ['Commerce', 'Les points relais colis se multiplient dans le centre : on en compte onze, de la gare au boulevard Dolez, dans des librairies, des night-shops et même chez un cordonnier. « C’est du passage », sourit une libraire de la rue d’Havré.'],
};
const PVC = {
  titre: 'Premières constatations',
  lignes: [
    'Le jeudi, à 22:41, nous, INP Cordier et INP Baetens, sommes requis par le dispatching : affiches injurieuses sur des vitrines, rue d’Havré. Arrivés à 22:52.',
    'Une trentaine de personnes, sorties d’une réunion du comité de quartier au Comptoir d’Havré, sont rassemblées sur le trottoir. Nous constatons six affiches identiques, format A2, sur six vitrines : Imprim’Havré, la Librairie Dufrasne, la boulangerie Delbecq, la pharmacie d’Havré, l’agence de voyages Évasion et le local du comité, en face du café. Texte : « LE PRÉSIDENT SE SERT DANS LA CAISSE DES COLIS DE NOËL. ET DANS LES COMPTES DE CEUX QU’IL “AIDE”. — LE CORBEAU D’HAVRÉ »',
    'Les affiches sont parfaitement lisses, sans bulle ni coulure. Elles se retirent d’un geste. Saisies pour le labo. Aucun témoin de la pose.',
    'M. Bernard Vanderhaegen, président du comité, très éprouvé, déclare être la cible d’un « corbeau » qui adresse depuis trois semaines des lettres anonymes aux habitants de la rue. Plusieurs personnes présentes confirment en avoir reçu.',
    'Le vendredi, à 08:15, se présente au commissariat Mme Hélène Dufrasne, 52 ans, libraire, secrétaire du comité, qui dépose plainte pour harcèlement au nom du comité et en son nom propre : « Trois semaines de lettres, et maintenant les sept affiches. Toute la rue a honte. » Elle remet la lettre anonyme qu’elle a reçue.',
    'Le parquet est avisé. Le labo est requis pour les affiches et pour les lettres, que les destinataires doivent remettre. Dont procès-verbal.',
  ],
};

// Chronologie : les événements que l'on peut placer sur la frise, chacun débloqué par une pièce (ou public).
export const EVENEMENTS = [
  { id: 'drache', f: 'doc:journal', de: hm(21, 5), a: hm(21, 40), qui: null, t: 'Drache sur le centre' },
  { id: 'decouverte', f: 'doc:pvc', de: hm(22, 31), qui: null, t: 'Les affiches sont découvertes' },
  ...[0, 1, 2, 3, 4].map((i) => ({ id: `dit${i}`, f: `A:${i}`, de: SUSPECTS[i].alibi.ditDe < hm(20, 0) ? hm(20, 0) : SUSPECTS[i].alibi.ditDe, a: Math.min(SUSPECTS[i].alibi.ditA, hm(24, 30)), qui: i, dit: true, t: `${SUSPECTS[i].prenom} dit : ${SUSPECTS[i].alibi.lieu}` })),
  { id: 'preside', f: 'c:direct', de: hm(20, 2), a: hm(22, 31), qui: 0, t: 'Bernard préside, à l’écran (le direct)' },
  { id: 'natOut', f: 'c:direct', de: hm(21, 44), a: hm(22, 6), qui: 2, t: 'Nathalie sort vers la cour fumeurs (le direct)' },
  { id: 'helOut', f: 'c:direct', de: hm(21, 49), a: hm(21, 57), qui: 4, t: 'Hélène sort chercher les photocopies (le direct)' },
  { id: 'rosine1', f: 'c:rosine', de: hm(21, 42), qui: null, t: 'Rosine : rien sur les vitrines' },
  { id: 'rosine2', f: 'c:rosine', de: hm(22, 20), qui: null, t: 'Rosine : des affiches partout' },
  { id: 'jambes', f: 'c:sonnette', de: hm(21, 52), qui: null, t: 'Sonnette de la pharmacie : des jambes, un rouleau' },
  { id: 'velo', f: 'c:camville', de: hm(22, 10), qui: null, t: 'Caméra communale : un livreur à vélo, un tube' },
  { id: 'fenetre', f: 'x:fenetre', de: hm(21, 40), a: hm(22, 20), qui: null, t: 'Pose des affiches (vitres sèches, avant Rosine)' },
  { id: 'poker', f: 'occ:1', de: hm(20, 20), a: hm(24, 15), qui: 1, t: 'Maxime à Cuesmes (GSM)' },
  { id: 'atm', f: 'occ:1', de: hm(21, 58), qui: 1, t: 'Maxime retire 200 € à Cuesmes' },
  { id: 'cour', f: 'occ:2', de: hm(21, 45), a: hm(22, 5), qui: 2, t: 'Nathalie dans la cour fermée (le serveur)' },
  { id: 'soeur', f: 'mob:2', de: hm(21, 46), a: hm(22, 3), qui: 2, t: 'Nathalie au téléphone avec sa sœur' },
  { id: 'gps', f: 'occ:3', de: hm(21, 30), a: hm(22, 45), qui: 3, t: 'Jordan livre sans s’arrêter (GPS)' },
  { id: 'traverse', f: 'occ:3', de: hm(22, 10), qui: 3, t: 'Jordan traverse la rue d’Havré à 18 km/h' },
];

/** L'affaire, au format des affaires écrites (mêmes champs que les meurtres : confrontation, recoupements…). */
export function affaireCorbeau(n) {
  const suspects = SUSPECTS.map((s, i) => ({
    ...s, coupable: i === COUPABLE, tech: false,
    statut: { mob: true, moy: true, occ: i === COUPABLE },
    moy: {}, mob: {},
  }));
  const sceneSeq = { labo: ['c:labo1', 'c:labo2', 'c:labo3'], cam: ['c:direct', 'c:camville', 'c:sonnette'], temoin: ['c:dest', 'c:septieme', 'c:rosine'] };
  const reponses = [...new Set(Object.entries(REACTIONS).flatMap(([i, t]) => Object.values(t).map(([code]) => `${code}:${i}`)))];
  const faits = [
    ...Object.values(sceneSeq).flat(),
    ...suspects.flatMap((_, i) => [`occ:${i}`, `mob:${i}`, `moy:${i}`]),
    ...reponses,
    ...RECOUPEMENTS.map((r) => r.f), ...DECLICS.map((d) => d.f),
  ];
  return {
    n, id: `aff${n}`, meurtre: true, genre: 'corbeau', cas: 'corbeau', ville: 'mons', carte: true, prof: true, travaux: null,
    pos: 'scene', titre: 'Le corbeau de la rue d’Havré', texte: 'Lettres anonymes, puis six vitrines couvertes d’affiches, rue d’Havré, pendant la réunion du comité de quartier.',
    butin: 'des lettres anonymes', lieu: 'la rue d’Havré', pres: 'de la rue d’Havré',
    vic: 'Hélène Dufrasne', aVic: 'à Hélène Dufrasne', deVic: 'd’Hélène Dufrasne',
    // Libellés propres à une affaire sans meurtre.
    libVictime: 'plaignante', faitsNom: 'les lettres et les affiches du corbeau', lieuScene: 'la rue d’Havré', lieuxInventes: 'les commerces, le comité, le café',
    pieceHeure: 'x:fenetre', texteHeure: 'Les affiches : posées entre 21:40 et 22:20.',
    req: {}, heure: hm(21, 40), fin: hm(22, 20), annonce: hm(21, 40), jourSemaine: 'jeudi', soiree: 'La soirée de jeudi',
    suspects, coupable: COUPABLE, planques: [], planque: -1,
    faits, textes: { ...TEXTES }, titres: { ...TITRES }, resumes: { ...RESUMES }, reactions: REACTIONS,
    lieux: LIEUX_CORBEAU, ruesPlan: [], evenements: EVENEMENTS,
    recoupements: RECOUPEMENTS, declics: DECLICS, relectures: RELECTURES, coupsDePouce: COUPS_DE_POUCE,
    hypothese: true, creneaux: CRENEAUX, mobiles: MOBILES, mobileVrai: MOBILE_VRAI, evaluer: evaluerHypotheseCorbeau,
    recit: 'Depuis trois semaines, un corbeau écrit aux habitants de la rue d’Havré. Jeudi soir, pendant la réunion du comité de quartier, six vitrines se sont couvertes d’affiches accusant le président. Cinq personnes seront entendues. Chacune cache quelque chose : une seule a écrit.',
    sceneSeq,
    fiches: {
      occ: { titre: 'Les affiches et les lettres', dem: 'labo' },
      moy: { titre: 'Le direct et les caméras', dem: 'cam' },
      mob: { titre: 'Les destinataires', dem: 'temoin' },
    },
    dem: {
      labo: { nom: 'Labo : affiches et lettres', motif: 'Le labo examine les affiches saisies et les lettres remises par les destinataires.', dit: 'comment, avec quoi, et quand' },
      cam: { nom: 'Le direct et les caméras', motif: 'La vidéo de la réunion, la caméra communale et celles des commerces.', dit: 'qui est sorti, qui est passé' },
      temoin: { nom: 'Les destinataires', motif: 'Deux enquêteurs font le tour de la rue : destinataires, voisins, facteur.', dit: 'à qui le corbeau écrivait' },
      alibi: { nom: 'Vérifier l’alibi', dit: 'où il ou elle était vraiment' },
      moyens: { nom: 'Perquisition', motif: 'Sur mandat du juge : il faut une pièce sérieuse contre la personne.', dit: 'ce que cache son domicile' },
      banque: { nom: 'Téléphonie et comptes', dit: 'son GSM et son argent' },
    },
    libres: suspects.flatMap((_, i) => [`occ:${i}`, `mob:${i}`]),
    constatsBase: ['c:labo1', 'c:direct', 'c:dest'],
    // Mandat de perquisition (et réaudition) : au moins une de ces pièces au dossier.
    charges: {
      0: ['mob:0', 'd:lettre', 'r:odile', 'x:caisse', 'c:septieme'],
      1: ['mob:1', 'c:labo1', 'occ:1'],
      2: ['mob:2', 'occ:2', 'c:direct'],
      3: ['c:camville', 'mob:3', 'occ:3'],
      4: ['occ:4', 'x:sept', 'x:secrets', 'x:relais'],
    },
    // Ce qui écarte un innocent du rôle de corbeau.
    innocente: {
      0: ['occ:0'],
      1: ['occ:1', ['moy:1', 'c:labo1']],
      2: ['occ:2'],
      3: ['occ:3'],
    },
    // Confrontation : trois pièces accablantes, dont au moins deux décisives (obtenues par l'enquête).
    confront: {
      decisives: ['moy:4', 'x:sept', 'x:relais', 'Rb:4'],
      accablantes: ['moy:4', 'x:sept', 'x:relais', 'Rb:4', 'occ:4', 'mob:4', 'A:4', 'doc:pvc', 'Ra:4', 'Rc:4', 'Rd:4', 'Re:4', 'Rf:4',
        'x:fenetre', 'x:secrets', 'x:premiere', 'x:caisse', 'c:septieme', 'c:direct', 'c:sonnette', 'c:labo1', 'c:labo2', 'c:labo3',
        'c:dest', 'r:odile', 'r:relais', 'moy:0', 'Ra:0', 'Rd:0', 'd:lettre', 'Rb:3'],
    },
    rebonds: {
      3: { f: 'r:odile', titre: 'Odile Hautecœur au commissariat', texte: 'L’ancienne mercière de la rue d’Havré, 84 ans, a appris qu’une affiche lui était destinée.' },
      5: { f: 'r:relais', titre: 'L’imprimerie en ligne répond', texte: 'AfficheExpress, à Gand, a retrouvé la commande des affiches.' },
    },
    recit3: {
      victime: 'Hélène Dufrasne', scene: 'corbeau', valeur: '', journal: JOURNAL,
      pvc: { numero: 'DD.55.L3.091206/26', ...PVC }, plainte: null,
      auditions: SUSPECTS.map((s, i) => ({ numero: `DD.55.L3.0913${String(10 + i * 7)}/26`, qui: `${s.nom}, ${s.age} ans`, role: s.role.charAt(0).toUpperCase() + s.role.slice(1), heure: `Vendredi, ${['10:20', '11:45', '14:10', '16:30', '08:15'][i]}`, qr: AUDITIONS[i] })),
    },
    recitFinal: [
      'Hélène Dufrasne, la libraire, la plaignante, était le corbeau. Jeudi à 21:49, pendant la réunion qu’elle consignait à la droite du président, elle est sortie « chercher les photocopies du budget », imprimées depuis 18:20. En sept minutes, elle a posé sept films électrostatiques, commandés à Gand et livrés à son propre point relais : six sur les vitrines de la rue, la septième au fond de la cour du 40, sur la porte d’Odile Hautecœur, à hauteur de ses yeux. Pendant ce temps, toute la rue était dans la même salle. Vendredi à 8:15, elle a porté plainte pour « les sept affiches ». La septième n’a été trouvée qu’à 9:40.',
      'Pourquoi ? Pour une seule lettre. Le 19 septembre, Hélène avait glissé dans la boîte d’Odile : « Ne signez rien lundi. Celui qui vous aide vous vole. » Mais c’est Bernard Vanderhaegen qui trie le courrier d’Odile : il l’a ouverte et gardée. Alors Hélène a écrit à toute la rue, dix lettres, dix secrets qu’Odile lui racontait le dimanche, et un faux pour elle-même, pour qu’on ne remarque pas la seule qui comptait. Elle ne pouvait pas accuser Bernard à visage découvert : elle lui doit 20 000 €.',
      'Ce que personne n’avait compris : les affiches disaient vrai. Le président dévoué, la « victime », prenait 600 € par mois sur le compte d’Odile et avait vidé la caisse des colis de Noël. Lundi, il devait lui faire signer une procuration générale. Le parquet le poursuit pour abus de faiblesse. Odile, elle, n’a lu ni la lettre ni l’affiche.',
      'Nathalie Brasseur avait menti sur ses vingt-deux minutes dehors : elle fumait en cachette dans la cour fermée, au téléphone avec sa sœur, à propos de son divorce. Son étiqueteuse imprime sur du 9 mm transparent.',
      'Maxime Delcourt n’était pas chez lui mais à une table de poker clandestine, à Cuesmes ; et sa machine, en panne, n’imprime pas ce genre de film.',
      'Jordan Lambotte livrait au noir, sur le compte de son frère, et n’a fait que traverser la rue à vélo, ses plans d’atelier dans le dos.',
      'Bernard Vanderhaegen avait caché la première lettre du corbeau pour protéger son vol. Il n’a pas quitté sa chaise de la soirée.',
    ].join('\n'),
    accroche: 'Dix lettres, six affiches, une rue qui se regarde de travers : un seul corbeau.',
  };
}
