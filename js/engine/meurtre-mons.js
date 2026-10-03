// Affaire écrite à la main : « Meurtre rue de la Clef » (Mons).
// Tout le monde ment, un seul pour le meurtre : chaque innocent cache un secret (liaison, travail au noir,
// une amie qu'on couvre) qui explique son mensonge ; le découvrir le blanchit. Les indices sont posés sans
// être signalés (une brève du journal, un parapluie dans l'entrée, un détail que seul l'assassin connaît),
// et les leurres sont nombreux (lettre de menace, dette, initiales, empreintes, alibis qui tombent).
// Les lieux sont de vraies rues de Mons ; la boutique, la brasserie, le café et toutes les personnes sont fictifs.
// Les trajets se mesurent à pied sur Google Maps : les écarts sont larges, une estimation suffit.

const hm = (h, m) => h * 60 + m;

// Lieux du plan (coordonnées du plan 880 × 900) et adresse pour l'itinéraire Google Maps.
export const LIEUX_MONS = {
  scene: { nom: 'Delattre Antiquités', sous: 'rue de la Clef · la scène', x: 506, y: 503, adresse: 'Rue de la Clef, 7000 Mons' },
  carillon: { nom: 'Brasserie Le Carillon', sous: 'rue de la Clef, à 40 m', x: 540, y: 528, adresse: 'Rue de la Clef, 7000 Mons' },
  grandplace: { nom: 'Grand-Place', x: 449, y: 402, adresse: 'Grand-Place, 7000 Mons', repere: true },
  beffroi: { nom: 'Beffroi', x: 370, y: 384, adresse: 'Beffroi de Mons', repere: true },
  collegiale: { nom: 'Collégiale Sainte-Waudru', x: 300, y: 456, adresse: 'Collégiale Sainte-Waudru, Mons', repere: true },
  gare: { nom: 'Gare de Mons', x: 40, y: 416, adresse: 'Gare de Mons, 7000 Mons' },
  leopold: { nom: 'Place Léopold', x: 112, y: 446, adresse: 'Place Léopold, 7000 Mons' },
  nimy: { nom: 'Café des Arts', sous: 'rue de Nimy · le concert', x: 556, y: 250, adresse: 'Rue de Nimy, 7000 Mons' },
  capucins: { nom: 'Chez Thierry Gobert', sous: 'rue des Capucins', x: 282, y: 602, adresse: 'Rue des Capucins, 7000 Mons' },
  dolez: { nom: 'Cabinet Mertens', sous: 'boulevard Dolez', x: 706, y: 560, adresse: 'Boulevard Dolez, 7000 Mons' },
  jemappes: { nom: '← Jemappes', sous: 'chez Sophie Willaert, à 5 km', x: 48, y: 300, adresse: 'Jemappes, 7012 Mons', horsPlan: true },
};
/** Lien d'itinéraire à pied dans Google Maps. */
export const lienItineraire = (a, b) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(LIEUX_MONS[a].adresse)}&destination=${encodeURIComponent(LIEUX_MONS[b].adresse)}&travelmode=walking`;

const SUSPECTS = [
  {
    nom: 'Claire Delattre', prenom: 'Claire', f: true, age: 34, role: 'fille et associée de la victime', roleDetail: 'gère la boutique avec lui depuis cinq ans', proche: true,
    vehicule: { t: 'à pied (habite le centre)', mode: 'pied', rien: true },
    alibi: { type: 'mensonge', pos: 'nimy', lieu: 'au concert du Café des Arts, rue de Nimy', ditDe: hm(21, 0), ditA: hm(24, 15) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir été au concert du Café des Arts, rue de Nimy, avec Sophie, de 21:00 à 00:15.', rumeur: 'Rumeur : elle hérite de la boutique.' },
  },
  {
    nom: 'Jean-Marc Lemaître', prenom: 'Jean-Marc', f: false, age: 52, role: 'patron de la brasserie voisine', roleDetail: 'a découvert le corps', proche: true,
    vehicule: { t: 'à pied (travaille à côté)', mode: 'pied', rien: true },
    alibi: { type: 'couvre', pos: 'carillon', lieu: 'à sa brasserie, Le Carillon', ditDe: hm(18, 0), ditA: hm(23, 40) },
    rumeur: 'vengeance',
    fiche: { declaration: 'Dit ne pas avoir quitté sa brasserie, à 40 m, de toute la soirée.', rumeur: 'Rumeur : il est en procès avec la victime pour un mur mitoyen.' },
  },
  {
    nom: 'Julien Mertens', prenom: 'Julien', f: false, age: 41, role: 'expert en objets d’art', roleDetail: 'certifiait les pièces de la boutique', proche: true,
    vehicule: { t: 'à pied, puis le train', mode: 'pied', rien: true },
    alibi: { type: 'mensonge', pos: 'gare', lieu: 'dans le train de 22:13 pour Bruxelles', ditDe: hm(21, 48), ditA: hm(23, 5) },
    rumeur: 'commande',
    fiche: { declaration: 'Dit avoir acheté son billet à la gare à 21:48 et pris le train de 22:13 pour Bruxelles.', rumeur: 'Rumeur : on ne lui connaît aucun différend avec la victime.' },
  },
  {
    nom: 'Sophie Willaert', prenom: 'Sophie', f: true, age: 29, role: 'apprentie restauratrice', roleDetail: 'travaille à l’atelier, derrière la boutique', proche: true,
    vehicule: { t: 'le bus (habite Jemappes)', mode: 'pied', rien: true },
    alibi: { type: 'mensonge', pos: 'nimy', lieu: 'au concert du Café des Arts, rue de Nimy, avec Claire', ditDe: hm(21, 0), ditA: hm(24, 15) },
    rumeur: 'vengeance',
    fiche: { declaration: 'Dit avoir été au concert du Café des Arts, rue de Nimy, avec Claire, de 21:00 à 00:15.', rumeur: 'Rumeur : le patron la faisait travailler tard et mal payée.' },
  },
  {
    nom: 'Thierry Gobert', prenom: 'Thierry', f: false, age: 47, role: 'brocanteur', roleDetail: 'achetait et revendait des pièces à la victime', proche: false,
    vehicule: { t: 'une camionnette', mode: 'moteur', gros: true },
    alibi: { type: 'seul', pos: 'capucins', lieu: 'chez lui, rue des Capucins', solitaire: 'seul chez lui, rue des Capucins', ditDe: hm(20, 0), ditA: hm(24, 0) },
    rumeur: 'argent',
    fiche: { declaration: 'Dit avoir passé la soirée seul chez lui, rue des Capucins.', rumeur: 'Rumeur : il devait de l’argent à la victime.' },
  },
];
const COUPABLE = 2;

const AUDITIONS = [
  [
    ['Quel est votre lien avec la victime ?', 'C’est mon père. Je tiens la boutique avec lui depuis cinq ans : je m’occupe des ventes en ligne et de la comptabilité.'],
    ['Où étiez-vous mardi soir ?', 'Je suis passée faire la bise à papa vers 20:30, à la brasserie d’à côté. Ensuite, j’ai rejoint Sophie au Café des Arts, rue de Nimy, pour le concert. On y est restées jusqu’à minuit et quart.'],
    ['Comment vous êtes-vous déplacée ?', 'À pied. J’habite le centre.'],
    ['Votre père avait-il des soucis ces derniers temps ?', 'Il était tendu depuis quelques semaines. Il passait ses soirées à ressortir de vieux certificats, sans vouloir m’en parler.'],
    ['Vous héritez de la boutique.', 'Vous croyez vraiment que je pense à ça aujourd’hui ?'],
  ],
  [
    ['Quel est votre lien avec la victime ?', 'Je suis son voisin depuis douze ans. On est en procès pour le mur mitoyen : ma terrasse le gênait.'],
    ['Où étiez-vous mardi soir ?', 'Je n’ai pas quitté la brasserie : service jusqu’à 23:15, puis rangement. Henri a mangé chez moi vers 20:15, une carbonnade, comme souvent. Sa fille est passée lui faire la bise vers 20:30, dans son imperméable jaune.'],
    ['Étiez-vous seul pour le service ?', 'Oui, seul en cuisine et en salle. Le mardi, c’est calme.'],
    ['Avez-vous une caméra ?', 'Une, en cuisine. Elle est en panne depuis un mois.'],
    ['Racontez-nous la découverte.', 'À 23:35, en sortant mes poubelles, j’ai vu de la lumière chez lui et la porte entrouverte. Je l’ai trouvé derrière son bureau. J’ai appelé tout de suite.'],
  ],
  [
    ['Quel est votre lien avec la victime ?', 'Je certifie des pièces pour plusieurs antiquaires, dont Henri, depuis six ans. Je suis aussi l’expert du Salon des antiquaires de Namur. Un homme exigeant ; on s’entendait bien.'],
    ['Où étiez-vous mardi soir ?', 'J’ai travaillé tard à mon cabinet, boulevard Dolez, puis je suis allé à la gare. J’ai acheté mon billet à 21:48 et j’ai pris le train de 22:13 pour Bruxelles : je dormais chez ma sœur, j’avais un rendez-vous tôt mercredi.'],
    ['Comment vous êtes-vous déplacé ?', 'À pied jusqu’à la gare, puis le train.'],
    ['Quand l’avez-vous vu pour la dernière fois ?', 'Lundi, à la boutique. Il voulait faire réexpertiser quelques pièces ; rien d’inhabituel dans notre métier.'],
    ['Avez-vous quelque chose à ajouter ?', 'C’est un choc. Henri ne se séparait jamais de son Saint Georges en bronze… Tuer un homme pour une statuette, vous vous rendez compte ?'],
  ],
  [
    ['Quel est votre lien avec la victime ?', 'Je restaure les meubles et je nettoie les bronzes, à l’atelier derrière la boutique. Je travaille pour Monsieur Delattre depuis deux ans.'],
    ['Où étiez-vous mardi soir ?', 'Avec Claire, au concert du Café des Arts, rue de Nimy, de 21:00 à minuit passé.'],
    ['Comment vous êtes-vous déplacée ?', 'En bus depuis Jemappes, où j’habite.'],
    ['Comment était Monsieur Delattre ces derniers jours ?', 'Nerveux. Lundi, il m’a fait mettre six objets de côté dans la réserve, avec une étiquette « Ne pas vendre ».'],
    ['Avez-vous quelque chose à ajouter ?', 'Claire est effondrée. Laissez-la tranquille.'],
  ],
  [
    ['Quel est votre lien avec la victime ?', 'Je lui achetais et je lui revendais des pièces. On se croisait aussi chaque année au Salon des antiquaires de Namur, où j’ai un stand.'],
    ['Où étiez-vous mardi soir ?', 'Chez moi, rue des Capucins. Seul : ma femme était chez sa mère, à Namur. La télé, puis au lit.'],
    ['Comment vous déplacez-vous ?', 'En camionnette d’habitude. Mardi, je ne suis pas sorti.'],
    ['Vous lui deviez de l’argent ?', 'Huit mille euros, oui. Je rembourse comme je peux. Ça ne fait pas de moi un assassin.'],
    ['Avez-vous quelque chose à ajouter ?', 'Je n’ai rien vu, rien entendu. Avec l’orage, de toute façon…'],
  ],
];

const TEXTES = {
  // Scène : légiste et labo.
  'c:legiste1': 'Décès survenu entre 21:30 et 23:30. Un seul coup, très violent, à la tempe gauche, porté par un objet lourd à arête vive, compatible avec le socle d’une statuette. Aucune trace de défense : la victime ne se méfiait pas de son visiteur.',
  'c:legiste2': 'Autopsie : un repas complet (viande en sauce, frites) pris une heure et demie à deux heures avant la mort. Le ticket retrouvé dans le portefeuille de la victime (Le Carillon, 20:16, carbonnade, frites, café) situe le décès entre 22:10 et 22:40.',
  'c:labo': 'Tasses : la tasse sale porte l’ADN de la victime ; la tasse rincée est inexploitable. Socle vide : nombreuses empreintes de Sophie Willaert, et celles de la victime. La poignée intérieure de la porte a été essuyée.',
  // Scène : caméras et machines.
  'c:cafe': 'Journal de la machine à expresso de la boutique : deux cafés coulés à 22:07, à trente secondes d’intervalle. Le précédent datait de 16:40.',
  'c:cam': 'Caméra communale, angle Grand-Place et rue de la Clef. 22:04 : une silhouette en manteau long, sous un grand parapluie noir, s’engage dans la rue de la Clef. 22:24 : la même silhouette remonte vers la Grand-Place, sans parapluie, tête baissée sous l’averse, un sac serré contre elle. Le visage n’est jamais visible.',
  // Scène : bureau de la victime.
  'c:agenda': 'Agenda de la victime, mardi : « 10 h banque · 14 h livraison Namur · 22 h J.M. (certificats !) ». Le mot « certificats » est souligné deux fois.',
  'c:courriel': 'Ordinateur de la victime : un brouillon de courriel jamais envoyé, écrit lundi à 23:02, sans destinataire : « Je sais tout pour les certificats. Six pièces, six faux. Tu as jusqu’à mardi soir pour t’expliquer, sinon je préviens l’assureur et le parquet. »',
  'c:dette': 'Tiroir du bureau : une reconnaissance de dette signée Thierry Gobert, 8 000 €, « à rembourser au plus tard le 30 septembre ». Agrafé dessus, un post-it de la main de la victime : « Relancer T.G. — dernier délai ».',
  // Claire (0).
  'occ:0': 'Café des Arts, rue de Nimy : le gérant connaît bien Claire Delattre mais ne l’a pas vue mardi. Sur les 46 photos du concert publiées par le café, ni elle ni Sophie Willaert n’apparaissent. Leur alibi ne tient pas.',
  'mob:0': 'Téléphone de Claire Delattre : de 20:52 à 00:41, il borne sur l’antenne qui couvre la rue des Capucins et ses environs, jamais du côté de la rue de Nimy. Comptes : sains. Elle hérite de la moitié de la boutique et d’une assurance-vie de 50 000 €.',
  'moy:0': 'Perquisition chez Claire Delattre : des lettres signées « T. », et une réservation d’hôtel à Bruges pour deux, au nom de Thierry Gobert. Confrontée, elle reconnaît une liaison avec lui depuis un an : mardi, elle a passé la soirée chez lui, rue des Capucins. Elle avait demandé à Sophie de la couvrir.',
  // Jean-Marc (1).
  'occ:1': 'Caisse de la brasserie : tiroir ouvert avec le code personnel de Jean-Marc Lemaître à 22:04, 22:19, 22:33 et 22:51. Entre deux passages en caisse, quinze minutes au plus… et la boutique de la victime est à quarante mètres.',
  'mob:1': 'Comptes : sains. Courrier saisi chez la victime : une lettre de Jean-Marc Lemaître datée de septembre : « Retire ta plainte pour le mur, ou tu vas le regretter. » Téléphone : à la brasserie toute la soirée.',
  'moy:1': 'Perquisition à la brasserie : l’enregistreur de la caméra de la cuisine, « en panne », fonctionne. Elle filme la cuisine et le passe-plat du comptoir : Jean-Marc Lemaître y va et vient sans interruption de 21:30 à 23:20, jamais plus de trois minutes hors champ, et ne sort pas par la rue… Elle filme aussi un commis déclaré nulle part. Il a menti pour cacher du travail au noir.',
  // Julien (2).
  'occ:2': 'Gare de Mons : billet Mons → Bruxelles-Central acheté à l’automate à 21:48 (un billet de train vaut pour n’importe quel train de la journée). Caméra du quai 3 : Julien Mertens y arrive à 22:39, sans parapluie, cheveux et manteau trempés, et monte dans le train de 22:43.',
  'mob:2': 'Téléphone de Julien Mertens : éteint de 21:51 à 22:46. Comptes : le 2 septembre, un virement de 15 000 € à Henri Delattre, libellé « remboursement pièces ».',
  'moy:2': 'Perquisition chez Julien Mertens, boulevard Dolez : un manteau long qui sèche encore dans la salle de bains, la manche droite fraîchement rincée. Dans son bureau, six certificats d’authenticité à son cachet ; leurs numéros sont ceux des six pièces que la victime avait fait mettre de côté.',
  // Sophie (3).
  'occ:3': 'Café des Arts : personne n’a vu Sophie Willaert mardi soir. Confrontée, elle reconnaît avoir menti « pour rendre service à Claire », sans dire pourquoi. Elle dit être restée chez elle, à Jemappes.',
  'mob:3': 'Téléphone de Sophie Willaert : un appel vidéo ininterrompu de 21:58 à 22:52, borné à Jemappes, avec un numéro canadien. Sa sœur, à Montréal, le confirme. Comptes : modestes, rien d’anormal.',
  'moy:3': 'Perquisition chez Sophie Willaert : une promesse d’embauche d’un atelier de restauration bruxellois, signée la semaine dernière. Elle comptait démissionner et n’osait pas l’annoncer. Rien qui vienne de la boutique.',
  // Thierry (4).
  'occ:4': 'Personne ne confirme qu’il était seul. Une voisine de la rue des Capucins a vu « une femme en imperméable jaune » entrer chez lui vers 21:00 ; elle n’est ressortie qu’après minuit. Il n’en a rien dit.',
  'mob:4': 'Comptes : à découvert ; la dette de 8 000 € envers la victime n’est pas remboursée. Téléphone : éteint de 21:05 à 00:20.',
  'moy:4': 'Perquisition chez Thierry Gobert : deux verres, une écharpe de femme, un mot sur la table : « Merci pour ce soir. C. » Il finit par reconnaître sa liaison avec Claire Delattre : elle était chez lui de 21:00 à minuit passé. Sa femme n’en sait rien.',
  // Rebondissements.
  'r:statue': 'La statuette en bronze « Saint Georges terrassant le dragon » a été retrouvée mercredi matin dans une poubelle de la place Léopold, face à la gare, enveloppée dans un sac de toile. Essuyée : aucune empreinte. Du sang de la victime au creux du socle.',
  'r:temoin': 'Une étudiante qui loge rue de la Clef se manifeste : vers 22:25, de sa fenêtre, elle a vu un homme sans parapluie remonter la rue vers la Grand-Place sous l’averse, « en serrant un sac contre lui ». Grand, manteau long. Elle ne l’a pas vu de face.',
};
// Réauditions : on oppose une pièce (ou le journal, un PV) à un suspect ; certaines le font parler.
// clé = suspect, puis pièce opposée → [code de la nouvelle pièce, sa réponse]. Ailleurs : « rien à ajouter ».
export const REACTIONS = {
  0: {
    'occ:0': ['Ra', 'Bon. Je n’étais pas au concert. J’étais ailleurs, avec quelqu’un. Ça n’a rien à voir avec mon père, et je ne vous dirai pas avec qui.'],
    'mob:0': ['Rb', 'Rue des Capucins… Oui. J’étais chez Thierry Gobert. On est ensemble depuis un an ; sa femme ne sait rien. Je suis arrivée vers 21:00, repartie après minuit. J’ai demandé à Sophie de me couvrir.'],
    'occ:4': ['Rb', 'Rue des Capucins… Oui. J’étais chez Thierry Gobert. On est ensemble depuis un an ; sa femme ne sait rien. Je suis arrivée vers 21:00, repartie après minuit. J’ai demandé à Sophie de me couvrir.'],
    'doc:pvc': ['Rc', 'Ce parapluie n’est pas à papa. Il détestait les parapluies publicitaires : il avait un vieux parapluie anglais à manche de bois, toujours accroché derrière la porte de chez lui.'],
    'c:agenda': ['Rd', '« J.M. » ? Jean-Marc, je suppose, le voisin. Ils se disputaient sans arrêt pour ce mur.'],
  },
  1: {
    'occ:1': ['Ra', 'Quinze minutes ? J’allais et venais entre la caisse et la cuisine, pas chez Henri. Regardez la caméra de la cuisine… Bon. Elle marche. Mais vous allez y voir quelqu’un que je n’ai pas déclaré.'],
    'mob:1': ['Rb', 'Cette lettre, je l’ai écrite un soir de colère. Je le regrette. Je n’aurais jamais levé la main sur Henri.'],
    'c:agenda': ['Rc', '« J.M. », moi ? Henri ne m’a jamais appelé comme ça : sur ses papiers, j’étais « le voisin ». Et ses certificats, je n’y connais rien.'],
  },
  2: {
    'doc:journal': ['Ra', 'Supprimé ? … Oui, c’est vrai, maintenant que vous le dites. J’ai attendu le suivant au buffet de la gare, au chaud, avec un journal.'],
    'occ:2': ['Rb', 'Trempé ? J’étais sorti fumer devant la gare. Avec cet orage, deux minutes suffisaient.'],
    'doc:pvc': ['Rc', 'Des parapluies du Salon de Namur ? On en a distribué des centaines. Thierry Gobert en a un, il y tient un stand chaque année.'],
    'c:courriel': ['Rd', 'Henri voyait des faux partout ces derniers temps. Ce brouillon n’a pas de destinataire : il ne parle pas de moi.'],
    'moy:2': ['Re', 'Mon manteau ? L’averse, en allant à la gare. Et ces certificats sont des doubles de mon travail : un expert garde ses doubles.'],
    'c:cafe': ['Rf', 'Deux cafés à 22:07 ? Il recevait souvent le soir. Demandez à ses clients.'],
    'A:2': ['Rg', 'La statuette ? Je… Claire a dû m’en parler. Ou c’était dans la presse.'],
  },
  3: {
    'occ:3': ['Ra', 'Oui, j’ai menti, pour Claire : elle m’a demandé de dire qu’on était ensemble au concert. Moi, j’étais chez moi, à Jemappes, en appel vidéo avec ma sœur.'],
    'c:labo': ['Rb', 'Évidemment qu’il y a mes empreintes sur le socle : lundi après-midi, Monsieur Delattre m’a fait nettoyer le Saint Georges, à l’atelier.'],
    'c:agenda': ['Rc', '« S. : 6 pièces de côté », c’est moi. Lundi, il m’a fait mettre six objets de côté. Tous achetés avec des certificats de Monsieur Mertens, je les avais rangés moi-même.'],
  },
  4: {
    'c:dette': ['Ra', 'Il m’avait accordé un délai jusqu’à fin octobre, on s’était serré la main. Ce post-it date d’avant.'],
    'occ:4': ['Rb', 'La femme en imperméable jaune… C’était Claire. On est ensemble. Je voulais la protéger, et protéger mon mariage.'],
    'doc:pvc': ['Rc', 'Le parapluie du Salon de Namur ? J’ai le même. Il est dans ma camionnette, venez le voir : il est sec, je ne suis pas sorti.'],
  },
};
for (const [i, t] of Object.entries(REACTIONS)) for (const [code, r] of Object.values(t)) TEXTES[`${code}:${i}`] = r;
const NOMS_R = ['Claire Delattre', 'Jean-Marc Lemaître', 'Julien Mertens', 'Sophie Willaert', 'Thierry Gobert'];

const TITRES0 = {
  'c:legiste1': 'Légiste · premier examen', 'c:legiste2': 'Légiste · autopsie', 'c:labo': 'Labo · tasses et empreintes',
  'c:cafe': 'La machine à café', 'c:cam': 'Caméra de la rue de la Clef',
  'c:agenda': 'L’agenda de la victime', 'c:courriel': 'Un brouillon de courriel', 'c:dette': 'Une reconnaissance de dette',
  'r:statue': 'La statuette retrouvée', 'r:temoin': 'Un témoin à sa fenêtre',
};
const quoiOppose = (f) => (f === 'doc:journal' ? 'le journal' : f === 'doc:pvc' ? 'le PV de constatations' : f.startsWith('A:') ? 'sa propre audition'
  : TITRES0[f] ? TITRES0[f].replace(/^[^·]*· /, '').toLowerCase() : { occ: 'la vérification d’alibi', mob: 'la téléphonie', moy: 'la perquisition' }[f.split(':')[0]] + (Number(f.split(':')[1]) >= 0 ? ` de ${NOMS_R[Number(f.split(':')[1])].split(' ')[0]}` : ''));
const TITRES = { ...TITRES0 };
for (const [i, t] of Object.entries(REACTIONS)) for (const [f, [code]] of Object.entries(t)) if (!TITRES[`${code}:${i}`]) TITRES[`${code}:${i}`] = `Réaudition · ${NOMS_R[i]} · face à ${quoiOppose(f)}`.replace('face à le ', 'face au ').replace('tasses et empreintes', 'ses empreintes');
// Résumé court sur les fiches de la scène (la dernière pièce connue de chaque série).
const RESUMES = {
  'c:legiste1': 'Entre 21:30 et 23:30, un seul coup', 'c:legiste2': 'Entre 22:10 et 22:40', 'c:labo': 'Tasse rincée, socle essuyé',
  'c:cafe': 'Deux cafés à 22:07', 'c:cam': 'Entré 22:04, ressorti 22:24',
  'c:agenda': '« 22 h J.M. (certificats !) »', 'c:courriel': '« Six pièces, six faux »', 'c:dette': 'Thierry lui devait 8 000 €',
};

const JOURNAL = {
  numero: 4213, date: 'Mercredi matin', surtitre: 'Faits divers · Mons',
  titre: 'Un antiquaire tué dans sa boutique, rue de la Clef',
  chapo: 'Henri Delattre, 61 ans, figure du commerce montois, a été retrouvé mort mardi soir dans l’arrière-boutique de son magasin. Le parquet parle d’un homicide.',
  legende: 'La boutique de la rue de la Clef, au lendemain du drame.',
  corps: [
    'Il était 23:35 quand Jean-Marc Lemaître, patron de la brasserie voisine, a remarqué de la lumière et la porte entrouverte chez son voisin. Il a découvert l’antiquaire derrière son bureau. Les secours n’ont pu que constater le décès.',
    'Selon nos informations, la victime a été frappée à la tête avec un objet lourd. Aucune trace d’effraction : Henri Delattre connaissait-il son agresseur ?',
    'Installé rue de la Clef depuis 1991, il était connu de tous les amateurs d’art de la région. « Un puriste : il refusait de vendre une pièce sans certificat », se souvient un confrère.',
    'Dans la rue, la consternation. « Avec l’orage, il n’y avait personne dehors mardi soir », souffle une riveraine.',
    'Le parquet a ouvert une information judiciaire. « Nous ne négligeons aucune piste », indique le commissaire divisionnaire Paul Verbeke.',
  ],
  encadre: [['Où', 'Rue de la Clef, à deux pas de la Grand-Place'], ['Quand', 'Mardi soir, découverte à 23:35'], ['Victime', 'Henri Delattre, 61 ans, antiquaire'], ['Cause', 'Un coup à la tête'], ['Effraction', 'Aucune']],
  second: { titre: 'Cinq proches entendus', texte: 'Sa fille et associée Claire, son apprentie Sophie Willaert, son voisin Jean-Marc Lemaître, le brocanteur Thierry Gobert et l’expert Julien Mertens, qui certifiait ses pièces, seront entendus dès mercredi.' },
  breve: ['Rail', 'Mardi soir, un dérangement de signalisation a entraîné la suppression du train de 22:13 de Mons vers Bruxelles. Les voyageurs ont été invités à prendre le suivant, à 22:43.'],
  breve2: ['Météo', 'Violent orage sur Mons mardi soir : des trombes d’eau entre 21:50 et 22:40, puis une nuit plus calme. De nouvelles averses sont attendues jeudi.'],
};
const PVC = {
  titre: 'Premières constatations',
  lignes: [
    'Le mardi, à 23:37, nous, INP Hubert et INP Massart, sommes requis par le dispatching : M. Jean-Marc Lemaître, patron de la brasserie « Le Carillon », signale avoir découvert son voisin inanimé dans sa boutique, rue de la Clef.',
    'Arrivés à 23:44. La porte vitrée est entrouverte, sans trace d’effraction. M. Henri Delattre, 61 ans, gît derrière son bureau, dans l’arrière-boutique. Le médecin du SMUR constate le décès à 23:52 : plaie à la tempe gauche.',
    'Sur le bureau : l’agenda ouvert à la date du jour et deux tasses à expresso. L’une est sale ; l’autre a été rincée et posée à l’envers sur l’égouttoir.',
    'Dans le porte-parapluie de l’entrée : un parapluie noir encore mouillé, au logo du « Salon des antiquaires de Namur ». Selon M. Lemaître, la victime a dîné chez lui vers 20:15 et a regagné sa boutique ; il ne pleuvait pas encore.',
    'Sur une console, un socle vide : la statuette en bronze « Saint Georges terrassant le dragon » (environ 4 kg) a disparu. Arme probable. Information non communiquée à la presse ni à la famille.',
    'Le laboratoire et le médecin légiste sont requis. Le magistrat de garde est avisé. Dont procès-verbal.',
  ],
};

// Chronologie : les événements que l'on peut placer sur la frise, chacun débloqué par une pièce (ou public).
// qui : index du suspect concerné (sa ligne sur la frise), null = la scène. a : fin, pour une durée.
export const EVENEMENTS = [
  { id: 'diner', f: 'doc:pvc', de: hm(20, 15), qui: null, t: 'La victime dîne au Carillon et regagne sa boutique' },
  { id: 'decouverte', f: 'doc:pvc', de: hm(23, 35), qui: null, t: 'Jean-Marc découvre le corps' },
  { id: 'orage', f: 'doc:journal', de: hm(21, 50), a: hm(22, 40), qui: null, t: 'Orage : trombes d’eau sur Mons' },
  { id: 'train13', f: 'doc:journal', de: hm(22, 13), qui: null, t: 'Train de 22:13 pour Bruxelles supprimé' },
  { id: 'train43', f: 'doc:journal', de: hm(22, 43), qui: null, t: 'Train suivant pour Bruxelles' },
  { id: 'bise', f: 'A:1', de: hm(20, 30), qui: 0, t: 'Claire passe faire la bise à son père, au Carillon' },
  ...[0, 1, 2, 3, 4].map((i) => ({ id: `dit${i}`, f: `A:${i}`, de: SUSPECTS[i].alibi.ditDe, a: Math.min(SUSPECTS[i].alibi.ditA, hm(24, 30)), qui: i, dit: true, t: `${SUSPECTS[i].prenom} dit : ${SUSPECTS[i].alibi.lieu}` })),
  { id: 'deces1', f: 'c:legiste1', de: hm(21, 30), a: hm(23, 30), qui: null, t: 'Décès (premier examen du légiste)' },
  { id: 'ticket', f: 'c:legiste2', de: hm(20, 16), qui: null, t: 'Ticket du Carillon : carbonnade, frites, café' },
  { id: 'deces2', f: 'c:legiste2', de: hm(22, 10), a: hm(22, 40), qui: null, t: 'Décès (autopsie)' },
  { id: 'cafes', f: 'c:cafe', de: hm(22, 7), qui: null, t: 'Deux cafés coulés dans la boutique' },
  { id: 'camIn', f: 'c:cam', de: hm(22, 4), qui: null, t: 'Silhouette avec parapluie entre rue de la Clef' },
  { id: 'camOut', f: 'c:cam', de: hm(22, 24), qui: null, t: 'Silhouette sans parapluie repart, un sac contre elle' },
  { id: 'rdv', f: 'c:agenda', de: hm(22, 0), qui: null, t: 'Agenda : « 22 h J.M. (certificats !) »' },
  { id: 'caisse', f: 'occ:1', de: hm(22, 4), a: hm(22, 51), qui: 1, t: 'Tiroir-caisse ouvert à 22:04, 22:19, 22:33, 22:51' },
  { id: 'cuisine', f: 'moy:1', de: hm(21, 30), a: hm(23, 20), qui: 1, t: 'Caméra de cuisine : Jean-Marc aux fourneaux' },
  { id: 'billet', f: 'occ:2', de: hm(21, 48), qui: 2, t: 'Julien achète son billet à l’automate' },
  { id: 'quai', f: 'occ:2', de: hm(22, 39), qui: 2, t: 'Julien arrive trempé sur le quai, monte dans le 22:43' },
  { id: 'telJ', f: 'mob:2', de: hm(21, 51), a: hm(22, 46), qui: 2, t: 'Téléphone de Julien éteint' },
  { id: 'bornC', f: 'mob:0', de: hm(20, 52), a: hm(24, 30), qui: 0, t: 'Téléphone de Claire : borne rue des Capucins' },
  { id: 'jaune', f: 'occ:4', de: hm(21, 0), a: hm(24, 15), qui: 4, t: 'Une femme en imperméable jaune chez Thierry' },
  { id: 'telT', f: 'mob:4', de: hm(21, 5), a: hm(24, 20), qui: 4, t: 'Téléphone de Thierry éteint' },
  { id: 'video', f: 'mob:3', de: hm(21, 58), a: hm(22, 52), qui: 3, t: 'Sophie en appel vidéo avec Montréal, depuis Jemappes' },
  { id: 'temoin', f: 'r:temoin', de: hm(22, 25), qui: null, t: 'Un homme sans parapluie remonte vers la Grand-Place' },
];

/** L'affaire, au format des affaires générées (champs supplémentaires : meurtre, sceneSeq, charges, confront…). */
export function affaireMeurtre(n) {
  const suspects = SUSPECTS.map((s, i) => ({
    ...s, coupable: i === COUPABLE, tech: false,
    statut: { mob: true, moy: true, occ: i === COUPABLE },
    moy: {}, mob: {},
  }));
  const faits = [
    'c:legiste1', 'c:legiste2', 'c:labo', 'c:cafe', 'c:cam', 'c:agenda', 'c:courriel', 'c:dette',
    ...suspects.flatMap((_, i) => [`occ:${i}`, `mob:${i}`, `moy:${i}`]),
    ...[...new Set(Object.entries(REACTIONS).flatMap(([i, t]) => Object.values(t).map(([code]) => `${code}:${i}`)))],
  ];
  return {
    n, id: `aff${n}`, meurtre: true, ville: 'mons', carte: true, prof: true, travaux: null,
    pos: 'scene', titre: 'Meurtre rue de la Clef', texte: 'Un antiquaire a été tué dans sa boutique, à deux pas de la Grand-Place de Mons.',
    butin: 'une statuette en bronze', lieu: 'la boutique de la rue de la Clef', pres: 'de la boutique de la rue de la Clef',
    vic: 'Henri Delattre', aVic: 'à Henri Delattre', deVic: 'd’Henri Delattre',
    req: {}, heure: hm(22, 10), fin: hm(22, 40), annonce: hm(22, 0), jourSemaine: 'mardi',
    suspects, coupable: COUPABLE, planques: [], planque: -1,
    faits, textes: { ...TEXTES }, titres: { ...TITRES }, resumes: { ...RESUMES }, reactions: REACTIONS,
    recit: 'Mardi soir, l’antiquaire Henri Delattre a été tué d’un coup à la tête dans l’arrière-boutique de son magasin, rue de la Clef. Aucune effraction. Cinq proches seront entendus. Chacun ment sur quelque chose : un seul pour cacher le meurtre.',
    // Démarches de la scène : chacune livre ses pièces dans l'ordre, une par démarche.
    sceneSeq: { labo: ['c:legiste1', 'c:legiste2', 'c:labo'], cam: ['c:cafe', 'c:cam'], temoin: ['c:agenda', 'c:courriel', 'c:dette'] },
    fiches: {
      occ: { titre: 'Heure de la mort', dem: 'labo' },
      moy: { titre: 'Le visiteur du soir', dem: 'cam' },
      mob: { titre: 'Le bureau de la victime', dem: 'temoin' },
    },
    dem: {
      labo: { nom: 'Légiste et labo', motif: 'Le médecin légiste examine le corps, le labo relève tasses et empreintes.', dit: 'l’heure de la mort, puis l’autopsie et les traces' },
      cam: { nom: 'Caméras et machines', motif: 'Images de la ville et appareils de la boutique.', dit: 'qui est venu, et quand' },
      temoin: { nom: 'Bureau de la victime', motif: 'Deux enquêteurs fouillent l’agenda, l’ordinateur et les tiroirs.', dit: 'ce qui inquiétait la victime' },
      alibi: { nom: 'Vérifier l’alibi', dit: 'où il ou elle était vraiment' },
      moyens: { nom: 'Perquisition', motif: 'Sur mandat du juge : il faut une pièce sérieuse contre la personne.', dit: 'ce que cache son domicile' },
      banque: { nom: 'Téléphonie et comptes', dit: 'son téléphone et son argent' },
    },
    // Pièces libres (voisinage, énigmes, appui, rattrapage) : jamais une perquisition, jamais la scène.
    libres: suspects.flatMap((_, i) => [`occ:${i}`, `mob:${i}`]),
    constatsBase: ['c:legiste1', 'c:cafe', 'c:agenda'],
    // Mandat de perquisition : au moins une de ces pièces au dossier.
    charges: { 0: ['occ:0', 'mob:0'], 1: ['c:agenda', 'occ:1', 'mob:1'], 2: ['c:agenda', 'occ:2', 'mob:2'], 3: ['occ:3', 'c:labo'], 4: ['c:dette', 'occ:4', 'mob:4'] },
    // Pièces qui expliquent le mensonge d'un innocent (et le blanchissent).
    innocente: { 0: ['moy:0', 'occ:4', 'moy:4', 'Rb:0', 'Rb:4'], 1: ['moy:1'], 3: ['mob:3'], 4: ['moy:4', 'moy:0', 'occ:4', 'Rb:0', 'Rb:4'] },
    // Confrontation : trois pièces accablantes, dont au moins deux qui contredisent vraiment sa version.
    confront: {
      decisives: ['doc:journal', 'doc:pvc', 'occ:2', 'moy:2', 'Rg:2'],
      accablantes: ['doc:journal', 'doc:pvc', 'occ:2', 'moy:2', 'mob:2', 'Ra:2', 'Rb:2', 'Re:2', 'Rg:2', 'Rc:3', 'c:cam', 'c:cafe', 'c:courriel', 'c:agenda', 'c:legiste2', 'r:statue', 'r:temoin'],
    },
    rebonds: {
      3: { f: 'r:statue', titre: 'La statuette retrouvée près de la gare', texte: 'Le « Saint Georges » de l’antiquaire, qui avait disparu de son socle, a été retrouvé dans une poubelle de la place Léopold.' },
      5: { f: 'r:temoin', titre: 'Un témoin à sa fenêtre', texte: 'Une étudiante de la rue de la Clef a vu un homme remonter vers la Grand-Place sous l’averse, vers 22:25.' },
    },
    recit3: {
      victime: 'Henri Delattre', scene: 'vitrine', valeur: '', journal: JOURNAL,
      pvc: { numero: 'DD.55.L3.071542/26', ...PVC }, plainte: null,
      auditions: SUSPECTS.map((s, i) => ({ numero: `DD.55.L3.0716${String(10 + i * 7)}/26`, qui: `${s.nom}, ${s.age} ans`, role: s.role.charAt(0).toUpperCase() + s.role.slice(1), heure: `Mercredi, ${['09:30', '10:15', '11:00', '13:30', '14:30'][i]}`, qr: AUDITIONS[i] })),
    },
    recitFinal: [
      'Julien Mertens, l’expert, avait écoulé par la boutique six pièces accompagnées de faux certificats. Démasqué, il est venu s’expliquer mardi soir : billet de train acheté à 21:48 pour se faire un alibi, quinze minutes à pied jusqu’à la rue de la Clef, deux cafés à 22:07, puis le coup de statuette. Il a rincé sa tasse mais oublié son parapluie du Salon de Namur. Reparti à 22:24 sous l’orage, il a jeté le Saint Georges place Léopold et pris le train de 22:43 : celui de 22:13 avait été supprimé. Dans son audition, il parlait d’une statuette dont personne n’avait parlé.',
      'Claire Delattre, la fille, héritait de tout et avait menti sur sa soirée : de quoi faire une coupable parfaite. Mais elle n’était pas au concert de la rue de Nimy : elle passait la soirée rue des Capucins, chez son amant, Thierry Gobert. Le « J.M. » de l’agenda, elle ne l’a compris qu’en lisant le dossier : son père attendait l’expert, pas le voisin.',
      'Thierry Gobert, le brocanteur, devait 8 000 € à la victime, n’avait personne pour confirmer sa soirée « seul devant la télé » et avait coupé son téléphone. Il protégeait sa liaison avec Claire : sa femme était à Namur, chez sa mère. Les deux verres et le mot « Merci pour ce soir. C. » l’ont blanchi… et ont ruiné son mariage.',
      'Sophie Willaert, l’apprentie, avait ses empreintes partout sur le socle vide et un patron qui la payait mal. Elle a menti pour couvrir Claire, sans savoir pourquoi ; elle-même passait la soirée à Jemappes, en appel vidéo avec sa sœur à Montréal, pour fêter la promesse d’embauche bruxelloise qu’elle n’osait pas annoncer. Les empreintes ? Elle avait nettoyé la statuette lundi.',
      'Jean-Marc Lemaître, le voisin, avait menacé la victime par écrit à cause du mur mitoyen, découvert le corps et déclaré une caméra « en panne ». La caméra marchait : elle le montre derrière ses fourneaux toute la soirée… et un commis que l’ONSS ne connaît pas. C’est ce travail au noir qu’il cachait, pas un meurtre.',
    ].join('\n'),
    accroche: 'Cinq proches, cinq mensonges : un seul cache le meurtre.',
  };
}
