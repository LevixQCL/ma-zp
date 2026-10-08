// Dossier complet (affaires ouvertes depuis la version « dossier complet ») : le journal du lendemain,
// le PV de premières constatations et les PV d'audition des cinq suspects.
// Du décor narratif tiré d'une graine à part : rien ici ne dit la façon d'entrer, le mobile, l'heure exacte
// ni qui ment. Les auditions reprennent ce que chaque suspect déclare (public dès l'ouverture), à la première personne.
import { makeRng, hashString } from './rng.js';
import { recitAffaire } from './recit.js';
import { hm, JE_ALIBI } from './enquete.js';
import { nomTroncon, LIEUX } from './carte3.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const lendemain = (j) => JOURS[(JOURS.indexOf(j) + 1) % 7];

// Un peu d'histoire pour chaque lieu (pour le journal).
const HISTOIRE = {
  tanneurs: 'Installé depuis 1987 dans une ancienne tannerie au bout de la rue des Tanneurs, le dépôt fournit en matériel informatique la moitié des écoles et des administrations du district.',
  bijouterie: 'Sous les arcades de la Grand-Place depuis trois générations, la bijouterie est une institution : on y achète ses alliances de père en fils.',
  portesud: 'L’entrepôt de la Porte Sud, coincé entre la voie rapide et les jardins ouvriers, alimente en parfums les boutiques de toute la province.',
  beguinage: 'Le restaurant du Béguinage, une étoile au guide depuis six ans, est réputé pour sa cave voûtée du XVIIe siècle, que le chef fait visiter aux habitués.',
  filatures: 'Dans l’ancienne filature réhabilitée, l’atelier de vélos électriques est devenu en quatre ans le symbole de la reconversion du quartier.',
  moulins: 'Le musée des Moulins, installé dans la minoterie restaurée au bord du canal, accueillait depuis trois semaines une exposition de pièces prêtées par des collectionneurs privés.',
  petitpont: 'La pharmacie du Petit-Pont, au pied de la passerelle, est la seule du centre ouverte tard le soir ; tout le quartier y a ses habitudes.',
  hautspres: 'Le chantier des Hauts-Prés doit livrer 48 logements au printemps ; le promoteur y a déjà subi deux tentatives de vol cette année.',
  ventes: 'La salle des ventes de la rue de la Vente organise chaque mois une vacation très courue des antiquaires de la région.',
  gare: 'Face à la gare, la boutique de téléphonie voit passer chaque jour des centaines de navetteurs ; elle venait de recevoir sa livraison de la semaine.',
};
const TITRES = {
  tanneurs: ['Razzia nocturne au dépôt des Tanneurs', 'Le dépôt des Tanneurs vidé en une nuit'],
  bijouterie: ['Coup de froid sur la Grand-Place : la bijouterie dévalisée', 'La bijouterie de la Grand-Place visitée en pleine nuit'],
  portesud: ['Parfums envolés à la Porte Sud', 'L’entrepôt de la Porte Sud pillé'],
  beguinage: ['Les grands crus du Béguinage ont disparu', 'Nuit noire dans la cave du Béguinage'],
  filatures: ['Les vélos électriques des Filatures volatilisés', 'Coup dur pour l’atelier des Filatures'],
  moulins: ['Le musée des Moulins cambriolé', 'Vol au musée : l’exposition amputée'],
  petitpont: ['La pharmacie du Petit-Pont visitée', 'Cambriolage à la pharmacie du Petit-Pont'],
  hautspres: ['Le chantier des Hauts-Prés dépouillé', 'Encore un vol au chantier des Hauts-Prés'],
  ventes: ['La salle des ventes délestée à la veille des enchères', 'Lots volés à la salle des ventes'],
  gare: ['Smartphones envolés à la boutique de la gare', 'Vol éclair face à la gare'],
};
const COMMISSAIRES = ['la commissaire divisionnaire Anne Moulart', 'le commissaire divisionnaire Paul Verbeke', 'la commissaire divisionnaire Sylvie Dardenne'];
const POLICIERS = ['Leroy', 'Dumont', 'Pire', 'Wauters', 'Lemmens', 'Bastin', 'Collignon', 'Hubert', 'Massart', 'Doyen'];
const BREVES = [
  ['Football', 'Le RC Delta s’impose 2-1 face à Haut-Delta dans le derby. Les supporters ont fêté la victoire jusque tard sur la Grand-Place.'],
  ['Météo', 'Brouillard sur le canal au petit matin, éclaircies l’après-midi. Douze degrés au plus chaud de la journée.'],
  ['Culture', 'La bibliothèque communale allonge ses heures d’ouverture : jusqu’à 20 h le jeudi, dès le mois prochain.'],
  ['Commerce', 'Le marché du samedi s’agrandit : quinze nouveaux étals de producteurs locaux sur le quai Sud.'],
  ['Conseil communal', 'Le budget des plaines de jeux voté à l’unanimité. Les travaux commenceront au printemps.'],
];
const ALERTES = [
  { qui: 'le gardien de nuit', detail: 'le gardien de nuit, en faisant sa ronde, signale une porte ouverte', heure: 25 },
  { qui: 'un voisin insomniaque', detail: 'un riverain signale des allées et venues inhabituelles, puis une porte restée ouverte', heure: 35 },
  { qui: 'une patrouille', detail: 'une patrouille de passage remarque de la lumière et une porte entrebâillée', heure: 20 },
  { qui: 'la victime', detail: 'la victime, {prevenue} par un voisin, signale un vol sur ses lieux de travail', heure: 45 },
];
const DENIS = [
  'Je n’ai rien à voir avec ça. Je veux bien qu’on vérifie tout ce que j’ai dit.',
  'C’est ridicule. Je connais les lieux, c’est tout, et ça ne fait pas de moi un voleur.',
  'Je suis choqué{e} qu’on puisse penser ça de moi.',
  'Je n’ai rien à ajouter. Je suis à votre disposition.',
  'Vérifiez, vous verrez bien. Je n’ai rien fait.',
  'Je ne comprends pas pourquoi je suis ici. Faites votre travail, moi je n’ai rien à cacher.',
];
const REACTIONS = {
  argent: { q: 'On nous dit que vous avez des soucis d’argent.', r: ['Qui n’en a pas, en ce moment ?', 'Ça ne regarde que moi.', 'Les gens parlent trop. Je m’en sors très bien.', 'J’ai eu une passe difficile, comme tout le monde.'] },
  vengeance: { q: 'On nous dit que vous vous êtes disputé{e} avec {vic}.', r: ['Une dispute, ce n’est pas un crime.', 'C’est de l’histoire ancienne.', 'On a eu des mots, oui. Et alors ?', 'Qui vous a dit ça ? Ce n’est pas vrai.'] },
  commande: { q: 'On vous aurait vu{e} avec un revendeur connu.', r: ['Je connais beaucoup de monde dans ce quartier.', 'On m’a confondu{e} avec quelqu’un d’autre.', 'Je lui ai acheté un téléphone d’occasion, une fois.', 'Je ne vois pas de qui vous parlez.'] },
};
const LIEN = (s, aff) => {
  const lieu = aff.lieu;
  if (s.victime) return `C’est chez moi : je suis ${aff.vic}, c’est moi qui ai déposé plainte. Je ne vois pas ce que je fais ici.`;
  const r = s.role.replace(/^./, (c) => c.toLowerCase());
  if (/ancien employé|ancienne employée/.test(r)) return `J’ai travaillé pour ${aff.vic} pendant des années, à ${lieu}. Je suis parti${s.f ? 'e' : ''} il y a six mois.`;
  if (/entretien/.test(r)) return `Je fais le ménage à ${lieu}, trois soirs par semaine.`;
  if (/alarme/.test(r)) return `C’est moi qui ai installé le système d’alarme à ${lieu}, l’an dernier, pour ma société.`;
  if (/livr/.test(r)) return `Je livre ${aff.vic} tous les matins, avec la camionnette de la boîte.`;
  if (/associé/.test(r)) return `Je suis associé${s.f ? 'e' : ''} minoritaire. Je ne viens presque plus, on ne s’entend plus très bien sur la gestion.`;
  if (/voisin/.test(r)) return `J’habite juste au-dessus. Je connais ${aff.vic} depuis des années, comme voisin${s.f ? 'e' : ''}.`;
  if (/client/.test(r)) return `Je suis ${s.f ? 'une cliente régulière' : 'un client régulier'}, je passe presque chaque semaine.`;
  if (/concurrent/.test(r)) return `J’ai un commerce semblable, deux rues plus loin. Je connais ${aff.vic}, forcément, on se croise.`;
  if (/intérimaire/.test(r)) return `J’ai fait un remplacement de trois semaines le mois dernier, par une agence d’intérim.`;
  return `Je connais ${aff.vic}.`;
};

/** Numéro de PV fictif, stable pour un document. */
export const numeroPv = (seed, n, k) => `DD.55.L3.${String(10000 + (hashString(`${seed}:${n}:${k}`) % 89999)).padStart(6, '0')}/26`;

function declarationJe(s) {
  const a = s.alibi, e = s.f ? 'e' : '';
  if (a.type === 'seul') {
    const t = a.solitaire
      .replace(/^seule? chez (elle|lui)/, `seul${e} chez moi`).replace(/^couchée? tôt/, `couché${e} tôt`)
      .replace('sans son téléphone', 'sans mon téléphone').replace('se changer', 'me changer');
    return `J’étais ${t}, toute la soirée. Personne ne peut le confirmer, je suppose.`;
  }
  const lieu = JE_ALIBI[a.pos] ? (a.pos === 'parents' && /Haut-Delta/.test(a.lieu) ? 'chez mes parents, à Haut-Delta' : JE_ALIBI[a.pos]) : a.lieu;
  if (a.avecJe) return `J’étais ${lieu} avec ${a.avecJe}, de ${hm(a.ditDe)} à ${hm(a.ditA)}. ${/^[A-ZÀ-Ý]/.test(a.avecJe) ? 'Demandez-lui' : 'Vous pouvez vérifier'}. Ensuite, je suis rentré${e} directement chez moi.`;
  return `J’étais ${lieu}, de ${hm(a.ditDe)} à ${hm(a.ditA)}. Ensuite, je suis rentré${e} directement chez moi.`;
}

/**
 * Tout le récit d'une affaire « dossier complet » : journal, PV de premières constatations, auditions.
 * `aff` vient de genererAffaire(…, prof = true).
 */
export function dossierAffaire3(seed, aff) {
  if (aff.recit3) return { ...aff.recit3, travaux: null }; // affaire écrite à la main
  const rc = recitAffaire(seed, aff);
  const rng = makeRng(`${seed}:dossier3:${aff.n}`);
  const vF = /^la /.test(aff.vic), e = vF ? 'e' : '';
  const a0 = rng.pick(ALERTES);
  const alerte = { ...a0, detail: a0.detail.replace('{prevenue}', vF ? 'prévenue' : 'prévenu') };
  const hAlerte = Math.max(aff.fin + 10, 23 * 60 + 5 + 5 * rng.int(0, 6));
  const hArrivee = hAlerte + 6 + rng.int(0, 6);
  const hVictime = hArrivee + 18 + rng.int(0, 15);
  const [p1, p2] = rng.shuffle(POLICIERS);
  const commissaire = rng.pick(COMMISSAIRES);
  const demain = lendemain(aff.jourSemaine);
  const voisin = rng.pick([
    '« On se connaît tous, ici. Ça fait froid dans le dos », glisse un commerçant voisin.',
    '« Un quartier si calme… On n’a rien entendu », soupire une habitante de la rue.',
    '« Ils ont pris leur temps, ça se voit », lâche un riverain, qui préfère rester anonyme.',
  ]);
  const roles = aff.suspects.map((s) => s.role);
  const travaux = aff.travaux ? { k: aff.travaux, nom: nomTroncon(aff.travaux) } : null;

  const journal = {
    numero: 4100 + aff.n * 7 + rng.int(0, 6),
    date: `${cap(demain)} matin`,
    surtitre: 'Faits divers · District Delta',
    titre: rng.pick(TITRES[aff.pos] || [rc.une.titre]),
    chapo: `${cap(aff.butin)} volés dans la nuit de ${aff.jourSemaine} à ${demain}. Préjudice estimé : ${rc.valeur}. Cinq personnes de l’entourage vont être entendues.`,
    legende: rc.une.legende,
    corps: [
      `Il était ${hm(hAlerte)}, ${aff.jourSemaine} soir, quand ${alerte.detail}. Une patrouille est sur place quelques minutes plus tard : ${aff.lieu} a été visité${/^la /.test(aff.lieu) ? 'e' : ''}, et les voleurs sont déjà loin.`,
      HISTOIRE[aff.pos] || '',
      rc.une.corps[0],
      voisin,
      `Au commissariat, on reste discret. « Les constatations sont en cours. Plusieurs personnes de l’entourage seront entendues dans les prochains jours », confirme ${commissaire}. Selon nos informations, les faits ont eu lieu entre 21 heures et 23 heures.`,
    ].filter(Boolean),
    encadre: [
      ['Où', cap(aff.lieu)],
      ['Quand', `Nuit de ${aff.jourSemaine} à ${demain}, entre 21:00 et 23:00`],
      ['Butin', cap(aff.butin)],
      ['Préjudice', rc.valeur],
      ['Alerte', `${hm(hAlerte)}, par ${alerte.qui}`],
    ],
    second: {
      titre: 'Cinq noms dans le carnet des enquêteurs',
      texte: aff.variante === 'fraude'
        ? `D’après nos sources, la police entendra aussi ${aff.vic} : l’assureur trouve la plainte un peu trop commode. Sur la liste figurent encore ${roles.filter((r, i) => !aff.suspects[i].victime).join(', ').replace(/, ([^,]*)$/, ' et $1')}. « Chacun a une explication pour sa soirée ; à nous de vérifier », résume un enquêteur.`
        : `D’après nos sources, la police a dressé la liste des personnes qui gravitent autour ${aff.pres} : ${roles.slice(0, -1).join(', ')} et ${roles[roles.length - 1]}. Toutes seront entendues. « Chacun a une explication pour sa soirée ; à nous de vérifier », résume un enquêteur.`,
    },
    breve: travaux
      ? ['Circulation', `Travaux : le ${travaux.nom.replace(/^Pont/, 'pont')} reste fermé aux voitures et aux deux-roues motorisés toute la semaine. Déviation par les autres ponts. Cyclistes et piétons peuvent passer.`]
      : rng.pick(BREVES),
    breve2: rng.pick(BREVES.filter((b) => !travaux || b[0] !== 'Circulation')),
  };
  if (journal.breve2[0] === journal.breve[0]) journal.breve2 = BREVES.find((b) => b[0] !== journal.breve[0]);

  const pvc = {
    numero: numeroPv(seed, aff.n, 'pvc'),
    titre: 'Premières constatations',
    lignes: [
      `Le ${aff.jourSemaine}, à ${hm(hAlerte)}, nous, INP ${p1} et INP ${p2}, en patrouille, sommes requis par le dispatching : ${alerte.detail}.`,
      `Arrivés sur place à ${hm(hArrivee)}, constatons que ${rc.plainte ? rc.plainte.lignes[1].replace(/^En arrivant, j’ai constaté que /, '').replace(/\. Il manque.*$/, '') : 'les lieux ont été visités'}. Les lieux sont déserts. Nous ne touchons à rien et sécurisons le périmètre.`,
      `${rc.victime}, ${vF ? 'prévenue' : 'prévenu'} par nos soins, arrive à ${hm(hVictime)} et dresse la liste de ce qui manque : ${rc.plainte.lignes[1].split('Il manque ')[1].replace(/\.$/, '')}.`,
      'Aucun témoin direct n’est identifié à ce stade. Le laboratoire de police technique est requis pour les relevés ; les images des caméras de la rue sont demandées au service communal.',
      aff.variante === 'fraude'
        ? `Cinq personnes à entendre, dont ${vF ? 'la plaignante elle-même' : 'le plaignant lui-même'}, à la demande de l’assureur : ${aff.suspects.map((s) => s.nom).join(', ')}.`
        : `L’entourage de la victime compte cinq personnes à entendre : ${aff.suspects.map((s) => s.nom).join(', ')}.`,
      ...(aff.regle ? [`Note du magistrat : ${aff.regle}`] : []),
      'Le magistrat de garde est avisé. Dont procès-verbal.',
    ],
  };

  const auditions = aff.suspects.map((s, i) => {
    const r = makeRng(`${seed}:audition3:${aff.n}:${i}`);
    const e2 = s.f ? 'e' : '';
    const re = REACTIONS[s.rumeur];
    const fem = (t) => t.replace(/\{e\}/g, e2).replace('{vic}', aff.vic);
    const h = 9 * 60 + 30 * r.int(0, 14);
    const veh = s.vehicule.je || (s.vehicule.rien ? 'À vélo, je n’ai pas de voiture.' : `Avec ${s.vehicule.t.replace(/^une? /, (m) => (m === 'une ' ? 'ma ' : 'mon ')).replace(/^la camionnette/, 'la camionnette')}.`);
    const sol = s.alibi.type === 'seul' ? s.alibi.solitaire : '';
    const sortie = /chez|couch/.test(sol) ? `Je ne suis pas sorti${e2} de la soirée. D’habitude : ${veh.charAt(0).toLowerCase()}${veh.slice(1)}` : /promenade/.test(sol) ? 'À pied, je me promenais.' : '';
    return {
      numero: numeroPv(seed, aff.n, `A${i}`),
      qui: `${s.nom}, ${s.age} ans`,
      role: cap(s.role),
      heure: `${cap(demain)}, ${hm(h)}`,
      qr: [
        [`Quel est votre lien avec ${aff.lieu} ?`, LIEN(s, aff)],
        [`Où étiez-vous ${aff.jourSemaine} soir, entre 20:00 et minuit ?`, declarationJe(s)],
        ['Comment vous êtes-vous déplacé' + e2 + ' ce soir-là ?', sortie || veh],
        [fem(re.q), fem(r.pick(re.r))],
        ['Avez-vous quelque chose à ajouter ?', fem(r.pick(DENIS))],
      ],
    };
  });
  return { ...rc, journal, pvc, auditions, travaux };
}

/** Lieux du plan routier pour une affaire (scène et lieux déclarés), utile à l'écran. */
export const lieuPlan = (k) => LIEUX[k];
