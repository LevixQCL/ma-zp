// Visite guidée de la première connexion : les onglets et le fil rouge de la journée.
// Une bulle qui suit l'écran réel, un projecteur sur l'élément dont on parle, et trois petits
// gestes à faire soi-même (ouvrir la Gestion, déplacer un agent, valider). On peut la quitter
// à tout moment et la relancer depuis le Guide ; les anciens joueurs peuvent la zapper.
import { S, esc, myZone } from './common.js';
import { ENQ, affaire } from '../engine/enquete.js';
import { marquerTutoVu } from './tableau.js';

const CLE = 'mazp-tuto';            // 'fait' ou 'zappe' une fois terminée ou refusée
const CLE_ETAPE = 'mazp-tuto-etape'; // étape en cours (reprise après un rechargement)
const lire = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const ecrire = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* pas de stockage */ } };

const zoneNom = () => { const z = myZone(); return z ? `ZP ${esc(z.code)} ${esc(z.nom)}` : 'ta zone'; };
const alloc = () => JSON.stringify((S.draft && S.draft.alloc) || {});

/**
 * Étapes. `route` : onglet affiché ; `cible` : sélecteur de l'élément mis en lumière (sinon bulle centrée) ;
 * `geste` : ce que le joueur fait lui-même, avec `fait()` qui dit quand c'est réussi.
 * `onglet` : première étape d'un onglet. On ne change pas d'écran à la place du joueur : on éclaire
 * l'onglet dans la barre du bas et on lui demande de le toucher (le texte donné sert d'accroche).
 */
const ONGLETS = { hp: 'Accueil', ordres: 'Gestion', enquete: 'Enquête', quete: 'Énigmes', carte: 'Carte', radio: 'Radio' };
/** Étape « onglet » dont l'écran n'est pas encore ouvert : le joueur doit toucher l'onglet. */
const attendOnglet = (e) => !!(e.onglet && e.route && S.route !== e.route);
/** L'affaire en cours se conclut-elle par une confrontation (meurtre) plutôt qu'une accusation ? */
const corbeau = () => { try { const n = S.state && S.state.enquete && S.state.enquete.n; return !!(n && affaire(S.state, n).genre === 'corbeau'); } catch (e) { return false; } };
const meurtre = () => { try { const n = S.state && S.state.enquete && S.state.enquete.n; return !!(n && affaire(S.state, n).meurtre); } catch (e) { return false; } };

export const ETAPES = [
  {
    id: 'bienvenue', route: 'hp',
    titre: () => `Bienvenue, chef de la ${zoneNom()} !`,
    texte: () => `<p>Tu diriges une zone de police du District Delta, aux côtés d’autres chefs de zone. En trois minutes : les <strong>six onglets</strong> et ce qu’il y a à faire chaque jour.</p>
      <p class="tuto-note">Tu peux quitter à tout moment : la visite se relance depuis le Guide du joueur.</p>`,
  },
  {
    id: 'fil-rouge', route: 'hp', cible: 'section[aria-label="Prochain tour"]',
    titre: 'Les ordres du soir',
    texte: () => (`<p>Tes <strong>ordres</strong> sont résolus à 20:00, pour toutes les zones en même temps : jouer tôt ne donne aucun avantage. L’<strong>enquête</strong>, elle, se joue en direct dans la journée. Une icône par partie de tes ordres : elle passe au vert quand c’est réglé. Le bouton t’emmène à la prochaine.</p>
      <p>Le <strong>ciel</strong> annonce ta journée : clair, chargé, orage ou éclaircie. Touche sa pastille pour comprendre.</p>`),
  },
  {
    id: 'incidents', route: 'hp', cible: ['#hp-incidents', 'section[aria-label="À régler ce soir"]'],
    titre: () => ('Incidents du jour'),
    texte: () => (`<p>Une ou deux fois par jour, à une heure imprévue, un <strong>incident</strong> tombe sur un de tes services : colis suspect, porte à crocheter, parking à débloquer, rapport à corriger.</p>
      <p>Tu as <strong>12 heures</strong> pour jouer le mini-jeu, avec <strong>un seul essai</strong>. Si tu réussis : des PS, un bonus, et ta jauge de skins monte. Si tu rates : jamais pire que si tu n’y étais pas allé.</p>
      <p>Plus bas, « <strong>À régler ce soir</strong> » regroupe les dilemmes et les alertes, une ligne chacun.</p>`),
  },
  {
    id: 'zone', route: 'hp', cible: 'section[aria-label="Ma zone"]',
    titre: 'Ta zone en un coup d’œil',
    texte: () => (`<p>L’<strong>IPZ</strong> est ta note du jour, sur 100 ; c’est la moyenne de la saison qui compte au classement (les derniers jours comptent plus).</p>
      <p>Surveille la <strong>satisfaction</strong> (le plus gros poids) et le <strong>moral</strong>, qui règle l’efficacité de tous tes agents. Touche une jauge pour voir le calcul avec tes chiffres. Touche ton hôtel de police, en haut, pour voir ce que te rapportent tes bâtiments, et le pinceau pour le personnaliser.</p>`),
  },
  {
    id: 'classement', route: 'hp', cible: '.hud-ipz',
    titre: 'Les classements',
    texte: `<p>Ton <strong>IPZ</strong>, en haut, ouvre les <strong>classements</strong> du district : IPZ de la saison, enquête, énigmes et grades. Ton rang s’affiche à côté.</p>
      <p>On n’est classé qu’après <strong>5 soirs joués</strong> dans la saison : c’est la régularité qui paie.</p>`,
  },
  {
    id: 'rapport', route: 'hp', cible: ['section[aria-label="Mes raccourcis"]', '[data-action="toggle-rapport"]'],
    titre: 'Chaque soir : rapport et Gazette',
    texte: () => (`<p>Après 20:00, ton adjoint te résume la nuit dans une bulle. Ton <strong>rapport</strong> dit tout ce qui s’est passé chez toi, la <strong>Gazette</strong> raconte la soirée du district.</p>
      <p>Tes <strong>raccourcis</strong> sont à toi : touche « Modifier » pour choisir les quatre que tu veux voir (rapport, Gazette, trophées, classement, Challenge).</p>`),
  },
  {
    id: 'affectation', route: 'ordres', onglet: 'L’onglet le plus important de la journée : c’est là que tu décides où travaillent tes agents.',
    cible: 'section[aria-label="Affectation des agents"]',
    titre: 'Cinq services à équilibrer',
    texte: () => (`<p>Chaque capsule est un service, avec ses agents dedans : une silhouette en pointillé, c’est une place à pourvoir. La <strong>lumière</strong> dit l’effectif : capsule éclairée, c’est couvert ; lueur ambre, il manque un agent ; dans le noir avec l’alarme, il en manque plusieurs. Touche une capsule pour tout son détail.</p>
      <p><strong>Intervention</strong> traite les incidents · <strong>Proximité</strong> calme les quartiers · <strong>Recherche</strong> élucide les dossiers et nourrit l’enquête · <strong>Roulage</strong> rapporte des amendes · <strong>Accueil</strong> vide la paperasse. Aucun ne suffit seul.</p>`),
  },
  {
    id: 'proxi', route: 'ordres', cible: '[data-action="alloc"][data-s="proximite"][data-d="1"]', parent: '.col-etage',
    titre: 'À toi : ajoute un agent en Proximité',
    texte: '<p>S’il n’y a plus d’agent libre, il est pris au service le plus fourni.</p>',
    geste: { consigne: 'Touche le <strong>+</strong> de la capsule <strong>Proximité</strong>.', avant: () => { S.tutoAlloc = alloc(); }, fait: () => alloc() !== S.tutoAlloc },
  },
  {
    id: 'rythme', route: 'ordres', cible: 'section[aria-label="Rythme"]',
    titre: 'Le rythme de travail',
    texte: `<p><strong>Renforcé</strong> : +35 % d’efficacité, mais le moral baisse et les heures sup’ coûtent. Plusieurs jours de suite, attention à l’épuisement.</p>
      <p><strong>Allégé</strong> : l’inverse, pour remonter le moral. Dans le doute, reste en <strong>Normal</strong>.</p>`,
  },
  {
    id: 'specialite', route: 'ordres', cible: '#ord-spe',
    titre: 'La spécialité de ta zone',
    texte: `<p>Choisis où ta zone excelle : <strong>Routière</strong>, <strong>De quartier</strong>, <strong>Judiciaire</strong> ou <strong>D’intervention</strong>. Elle monte de palier en palier avec les jours joués, et te suit de saison en saison.</p>
      <p>Tu peux en changer quand tu veux, mais elle repart du premier palier.</p>`,
  },
  {
    id: 'decision', route: 'ordres', cible: ['#ord-decision', '#ord-arm'],
    titre: 'Décision, dépenses et armurerie',
    texte: () => (`<p>Tes ordres se lisent en parties numérotées. La <strong>grande décision</strong> (recruter, former, équiper, acheter un véhicule, construire) : <strong>une seule par tour</strong>. Puis les <strong>dépenses</strong> du jour et les agents de réserve.</p>
      <p>L’<strong>armurerie</strong> : un achat par soir, gardé pour de bon. Une partie réglée se replie sur une ligne qui la résume.</p>`),
  },
  {
    id: 'valider', route: 'ordres', cible: ['.savebar [data-action="save-orders"]', 'main .card.green', 'main [data-action="save-orders"]'],
    titre: 'À toi : valide tes ordres',
    texte: `<p>Tant que tu n’as pas validé, rien n’est enregistré. Tu peux encore changer d’avis <strong>jusqu’à 20:00</strong>.</p>
      <p>Un jour sans ordres ? Ton <strong>adjoint</strong> tient la zone selon la consigne laissée dans ton Profil.</p>`,
    geste: { consigne: 'Touche <strong>Valider</strong>.', fait: () => !!S.savedOrders && !S.ordersDirty },
  },
  {
    id: 'enquete2', route: 'enquete', onglet: 'L’affaire en cours, commune à toutes les zones. Elle se joue en direct.', cible: ['.e2-hero', '.e2-cta'], union: true,
    avant: () => { S.tabTuto = null; marquerTutoVu(); },
    titre: 'Ton enquête',
    texte: () => `<p>Une affaire à la fois (<strong>${ENQ.dureeMax} jours</strong> au plus), la même pour toutes les zones, mais chacune a son dossier. Le gros bouton te dit quoi faire ensuite.</p>
      <p>Tes pièces arrivent <strong>sous enveloppe</strong> dès que la recherche est finie : ouvre-les une à une.</p>`,
  },
  {
    id: 'mur2', route: 'enquete', cible: ['.e2-mur'],
    titre: 'Le mur des suspects',
    texte: () => (meurtre()
      ? `<p>En haut, ce que dit la scène. Dessous, les suspects : touche un visage pour lire ce qu’on sait, vérifier son alibi ou le réentendre. Note tes ✓ et ✕ : ils s’affichent en tampons.</p><p>${corbeau() ? 'Un seul suspect est le corbeau' : 'Un seul suspect a tué'} : quand tu es sûr, <strong>confronte-le</strong> avec trois éléments du dossier.</p>`
      : `<p>En haut, les trois constatations : quelle heure, quel moyen, quel mobile comptent. Dessous, les suspects : touche un visage pour vérifier son alibi, ses moyens ou son mobile.</p><p>Le coupable est le <strong>seul</strong> à réunir les trois ✓. Quand tu es sûr, <strong>convoque-le</strong> : le verdict tombe en direct. Ensuite, toutes les zones le traquent.</p>`),
  },
  {
    id: 'soir2', route: 'enquete', cible: ['.e2-soir'],
    titre: 'Aujourd’hui',
    texte: `<p>Tes <strong>démarches</strong> partent tout de suite : chacune affiche son prix et son temps de recherche. Deux à la fois au plus ; tes agents de Recherche d’hier les accélèrent. La <strong>piste</strong> oriente l’enquête de voisinage, l’<strong>appui fédéral</strong> (labo ou RCCU) arrive le lendemain.</p>
      <p>Le coût est débité à 20:00. Le grand liège et l’affichage en liste sont dans le menu <strong>⋯</strong>.</p>`,
  },
  {
    id: 'enigmes', route: 'quete', onglet: 'Quatre casse-tête par jour, cinq minutes de réflexion.', cible: ['[aria-label="Énigmes du jour"]', '[data-action="alt-vue"]'], union: true,
    titre: 'Trois énigmes par jour',
    texte: `<p>Quatre casse-tête à manipuler chaque jour, <strong>une seule réponse</strong> chacun. Dès deux bonnes réponses, tu choisis un bonus (un indice, du moral, du budget…). Le <strong>dossier noir</strong> est facultatif et vraiment difficile.</p>
      <p>Pas le temps ou pas l’envie ? Un <strong>quiz express</strong> ou un <strong>agent</strong> qui planche à ta place peuvent aussi décrocher le bonus. L’<strong>Entraînement</strong> permet de s’exercer aux énigmes sans enjeu, et l’onglet <strong>Records</strong> aux mini-jeux d’incident.</p>`,
  },
  {
    id: 'carte-v2', route: 'carte', onglet: 'Ta ville en maquette : ta zone en direct, la zone de non-droit et tout le district.', cible: ['#mes-quartiers', '.cx-tete'], avant: () => { S.carteCalque = 'mazone'; },
    titre: 'La carte : Ma zone et Non-droit',
    texte: `<p><strong>Ma zone</strong> (l’écran qui s’ouvre d’abord) : le central en direct. Les appels tombent toute la journée : envoie la bonne équipe, sinon ton adjoint s’en charge au bout de 10 minutes.</p>
      <p><strong>Non-droit</strong> : le centre de la ville, à reprendre ensemble. Touche un secteur rouge et place tes agents dans un rôle : <strong>repérage</strong> (Recherche, révèle la faille du milieu), <strong>descente</strong> (Intervention, fait tomber l’emprise) ou <strong>bouclage</strong> (Roulage et Proximité, plus de saisies). À plusieurs le même soir, c’est bien plus fort ; seul et trop léger, gare aux blessés.</p>
      <p>Tes agents de <strong>Proximité</strong> calment tous tes quartiers : plus ils sont nombreux, plus la tension baisse.</p>`,
  },
  {
    id: 'radio2', route: 'radio', onglet: 'Pour parler avec les autres chefs de zone.', cible: '[aria-label="Fréquences"]',
    titre: 'La radio : deux fréquences et le privé',
    texte: `<p><strong>F1 · Discussion</strong> : le canal commun, comme une messagerie. On y négocie, on échange des pièces, on se donne rendez-vous.</p>
      <p><strong>F2 · Renforts &amp; ops</strong> : le tableau des appels de ce soir (renforts, non-droit, opérations), avec un bouton pour répondre présent. <strong>Privé</strong> : en tête-à-tête, pour échanger une pièce ou préparer une descente.</p>`,
  },
  {
    id: 'fin2', route: 'hp',
    titre: 'Ta journée type',
    texte: `<ol class="tuto-liste">
        <li>Lis la <strong>Gazette</strong> (touche pour avancer) et ton <strong>rapport</strong>.</li>
        <li>Règle et <strong>valide tes ordres</strong> dans Gestion.</li>
        <li>Avance l’<strong>enquête</strong> quand tu as un moment : lance tes démarches, reviens ouvrir les enveloppes.</li>
        <li>Fais tes <strong>énigmes</strong>, ou le quiz express.</li>
        <li>Quand un <strong>incident</strong> tombe (entre 7 h et 19 h), tu as 12 heures pour le jouer.</li>
        <li>Coup d’œil à la <strong>Carte</strong> (non-droit) et à la <strong>Radio</strong> : on avance mieux à plusieurs.</li>
      </ol>
      <p class="tuto-note">Le détail est dans le <strong>Guide du joueur</strong> (roue dentée en haut de l’Accueil), d’où tu peux aussi relancer cette visite. Bon service !</p>`,
  },
];

// ───────────────────────── État et cycle de vie ─────────────────────────

let layer = null, raf = 0, derniereCible = null, dernierIndex = -1;

export const tutoActif = () => S.tuto != null;
// Saison 2 : la visite est refaite pour les nouveaux écrans ; elle est reproposée une fois à tout le monde.
const CLE2 = 'mazp-tuto-s2';
export const tutoFait = () => (['fait', 'zappe'].includes(lire(CLE2)) || !!(S.player && S.player.tuto2));

/** Marque la visite comme terminée ou refusée, sur l'appareil et dans le profil du joueur. */
function marquer(v) {
  ecrire(CLE, v); ecrire(CLE2, v); ecrire(CLE_ETAPE, null);
  if (S.player && (!S.player.tuto || !S.player.tuto2) && S.backend && S.backend.savePlayer && S.user) {
    const p = { ...S.player, tuto: S.player.tuto || v, tuto2: v };
    S.player = p;
    Promise.resolve(S.backend.savePlayer(S.user.uid, p)).catch((e) => console.warn('tuto', e));
  }
}

export function lancerTuto(i = 0, mini = false) {
  S.tutoMini = !!mini;
  ecrire('mazp-tuto-mini', mini ? '1' : null);
  document.querySelector('.aide-wrap')?.remove();
  S.tuto = Math.max(0, Math.min(ETAPES.length - 1, sauterAbsentes(i, 1)));
  ecrire(CLE_ETAPE, String(S.tuto));
  dernierIndex = -1;
  monter();
}

function quitter(v = 'fait') {
  S.tuto = null; marquer(v);
  cancelAnimationFrame(raf); raf = 0;
  layer?.remove(); layer = null;
  document.removeEventListener('keydown', clavier);
}

/** Étape suivante (ou précédente) de la visite en cours (complète ou mini). */
function sauterAbsentes(i, sens) {
  while (i >= 0 && i < ETAPES.length && !presente(ETAPES[i])) i += sens;
  return i;
}

function aller(i) {
  i = sauterAbsentes(i, i >= (S.tuto ?? 0) ? 1 : -1);
  if (i >= ETAPES.length) { quitter('fait'); if (S.route !== 'hp') location.hash = '#hp'; return; }
  S.tuto = Math.max(0, i);
  ecrire(CLE_ETAPE, String(S.tuto));
}

const clavier = (e) => {
  if (!tutoActif()) return;
  if (e.key === 'Escape') quitter('fait');
};

// ───────────────────────── Affichage ─────────────────────────

function monter() {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'tuto';
    layer.innerHTML = '<div class="tuto-bloc"></div><div class="tuto-spot" aria-hidden="true"></div><div class="tuto-bulle card" role="dialog" aria-modal="false" aria-live="polite"></div>';
    layer.addEventListener('click', onClic);
    document.body.appendChild(layer);
    document.addEventListener('keydown', clavier);
  }
  if (!raf) boucle();
}

const valeur = (v) => (typeof v === 'function' ? v() : v);

/** Étapes de la visite en cours (complète ou mini) : rang affiché et total. */
const presente = (x) => !!x.mini === !!S.tutoMini;
function etapeHtml(e) {
  const vis = ETAPES.filter(presente), n = vis.length;
  const i = Math.max(0, vis.indexOf(e));
  if (attendOnglet(e)) {
    const nom = ONGLETS[e.route] || e.route;
    return `<div class="between" style="gap:8px"><span class="kicker">Visite guidée · ${i + 1} / ${n}</span>
      <button type="button" class="tuto-x" data-tuto="quitter" aria-label="Quitter la visite guidée">Quitter</button></div>
    <div class="tuto-prog" aria-hidden="true"><span style="width:${Math.round((i + 1) / n * 100)}%"></span></div>
    <h2 class="tuto-titre">À toi : ouvre l’onglet ${nom}</h2>
    <div class="tuto-texte"><p>${e.onglet}</p></div>
    <div class="tuto-geste"><span class="tuto-coche" aria-hidden="true">→</span><span>Touche l’onglet <strong>${nom}</strong>, éclairé en bas de l’écran.</span></div>
    <div class="tuto-nav">
      ${i > 0 ? '<button type="button" class="btn ghost small" data-tuto="prec">Précédent</button>' : '<span></span>'}
      <button type="button" class="btn ghost small" data-tuto="retour">Passer</button>
    </div>`;
  }
  const g = e.geste, ok = g ? g.fait() : true;
  const surPlace = !e.route || S.route === e.route;
  return `<div class="between" style="gap:8px"><span class="kicker">Visite guidée · ${i + 1} / ${n}</span>
      <button type="button" class="tuto-x" data-tuto="quitter" aria-label="Quitter la visite guidée">Quitter</button></div>
    <div class="tuto-prog" aria-hidden="true"><span style="width:${Math.round((i + 1) / n * 100)}%"></span></div>
    <h2 class="tuto-titre">${valeur(e.titre)}</h2>
    <div class="tuto-texte">${valeur(e.texte)}</div>
    ${g ? `<div class="tuto-geste ${ok ? 'ok' : ''}"><span class="tuto-coche" aria-hidden="true">${ok ? '✓' : '→'}</span><span>${ok ? 'Bien joué !' : g.consigne}</span></div>` : ''}
    ${!surPlace ? `<button type="button" class="btn small block" data-tuto="retour">Revenir à l’écran de cette étape</button>` : ''}
    <div class="tuto-nav">
      ${i > 0 ? '<button type="button" class="btn ghost small" data-tuto="prec">Précédent</button>' : '<span></span>'}
      ${g && !ok ? '<button type="button" class="btn ghost small" data-tuto="suiv">Passer</button>'
        : `<button type="button" class="btn primary small" data-tuto="suiv">${i === 0 ? 'C’est parti' : i === n - 1 ? 'Terminer' : 'Suivant'}</button>`}
    </div>`;
}

function onClic(ev) {
  const b = ev.target.closest('[data-tuto]');
  if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const i = S.tuto;
  switch (b.dataset.tuto) {
    case 'quitter': quitter('fait'); break;
    case 'prec': aller(i - 1); break;
    case 'suiv': aller(i + 1); break;
    case 'retour': { const r = ETAPES[i].route; if (r) location.hash = `#${r}`; break; }
    default: break;
  }
}

/** Rectangle à éclairer : un élément, ou l'union de plusieurs (étapes `union`). */
function rectCible(e, el) {
  if (!e.union) return el.getBoundingClientRect();
  let r = null;
  for (const sel of [].concat(e.cible)) {
    const x = document.querySelector(sel);
    if (!x) continue;
    const b = x.getBoundingClientRect();
    r = r ? { top: Math.min(r.top, b.top), left: Math.min(r.left, b.left), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { top: b.top, left: b.left, right: b.right, bottom: b.bottom };
  }
  return { ...r, width: r.right - r.left, height: r.bottom - r.top };
}

function trouverCible(e) {
  if (!e.cible) return null;
  for (const sel of [].concat(e.cible)) {
    let el = null;
    try { el = document.querySelector(sel); } catch (err) { continue; }
    if (el) return e.parent ? (el.closest(e.parent) || el) : el;
  }
  return null;
}

/** Referme les voiles plein écran de l'enquête ; renvoie true si quelque chose a été refermé. */
function fermerVoiles() {
  let ferme = false;
  if (S.journalOuvert != null) { S.journalOuvert = undefined; ferme = true; }
  if (S.e2Lire) { S.e2Lire = false; ferme = true; }
  if (S.sceneOuverte != null) { S.sceneOuverte = null; S.sceneZoom = null; ferme = true; }
  if (S.tabSheet != null) { S.tabSheet = null; ferme = true; }
  return ferme;
}

let signature = '';
function boucle() {
  raf = requestAnimationFrame(boucle);
  if (!tutoActif() || !layer) return;
  const i = S.tuto, e = ETAPES[i];
  // Changement d'étape : on va sur le bon écran et on prépare le geste.
  if (i !== dernierIndex) {
    dernierIndex = i; derniereCible = null;
    if (e.route && S.route !== e.route && !e.onglet) location.hash = `#${e.route}`;
    if (e.avant) e.avant();
    if (e.geste && e.geste.avant) e.geste.avant();
  }
  const attente = attendOnglet(e);
  // L'onglet à toucher doit rester touchable : on referme les voiles plein écran ouverts pendant la visite
  // (journal de l'affaire, lecture des pièces, scène, volet). Le journal jamais lu se rouvrira après la visite.
  if (attente && fermerVoiles()) document.dispatchEvent(new CustomEvent('mazp:rerender'));
  const surPlace = !e.route || S.route === e.route;
  const cible = attente ? document.querySelector(`nav.tabs a[href="#${e.route}"]`) : surPlace ? trouverCible(e) : null;
  if (cible && cible !== derniereCible) {
    derniereCible = cible;
    const r = attente ? cible.getBoundingClientRect() : rectCible(e, cible);
    const fixe = getComputedStyle(cible).position === 'fixed' || cible.closest('nav.tabs, .savebar');
    if (!fixe && (r.top < 70 || r.bottom > innerHeight * 0.55)) window.scrollTo({ top: Math.max(0, scrollY + r.top - 70), behavior: 'smooth' });
  }
  // Contenu de la bulle : redessiné seulement s'il change (geste réussi, écran quitté…).
  const g = e.geste;
  const sig = `${i}|${g ? g.fait() : ''}|${surPlace}|${attente}`;
  const bulle = layer.querySelector('.tuto-bulle');
  if (sig !== signature) { signature = sig; bulle.innerHTML = etapeHtml(e, i); }
  // Projecteur et position de la bulle.
  const spot = layer.querySelector('.tuto-spot'), bloc = layer.querySelector('.tuto-bloc');
  // Pendant un geste, l'écran reste utilisable ; sinon on bloque les clics hors de la bulle.
  bloc.style.pointerEvents = attente || (g && !g.fait()) ? 'none' : 'auto';
  if (cible) {
    const r = attente ? cible.getBoundingClientRect() : rectCible(e, cible), m = 6;
    const top = Math.max(4, r.top - m), bottom = Math.min(innerHeight - 4, r.bottom + m);
    Object.assign(spot.style, { display: 'block', top: `${top}px`, left: `${Math.max(4, r.left - m)}px`, width: `${Math.min(innerWidth - 8, r.width + 2 * m)}px`, height: `${Math.max(0, bottom - top)}px` });
    layer.classList.remove('centre');
    const centre = (top + bottom) / 2;
    const enBas = centre < innerHeight * 0.5;
    bulle.classList.toggle('bas', enBas); bulle.classList.toggle('haut', !enBas);
  } else {
    spot.style.display = 'none';
    layer.classList.add('centre');
    bulle.classList.remove('bas', 'haut');
  }
}

// ───────────────────────── Déclenchement ─────────────────────────

/** Fenêtre d'invitation (première connexion, ou joueur déjà en place qui ne l'a jamais vue). */
function inviter() {
  const z = myZone();
  const ancien = z && z.toursJoues > 0;
  // Ancien joueur qui découvre la saison 2 : on lui présente la nouvelle visite.
  const s2 = ancien || (S.player && S.player.tuto) || ['fait', 'zappe'].includes(lire(CLE));
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card tuto-invite" role="dialog" aria-modal="true" aria-labelledby="tuto-inv-titre">
    <span class="kicker">${s2 ? 'Saison 2' : ancien ? 'Nouveau' : 'Prise de fonction'}</span>
    <h2 id="tuto-inv-titre" class="aide-titre">${s2 ? 'La visite guidée de la saison 2' : ancien ? 'Une visite guidée du jeu' : `Bienvenue à la ${zoneNom()} !`}</h2>
    <p class="aide-intro">${s2 ? 'Doctrine, chef de corps, nouvelle carte, enquête sous enveloppe, radio à deux fréquences : beaucoup de choses ont changé. La mini-visite ne montre que les nouveautés, en une minute.' : ancien ? 'Les sept onglets et ce qu’il y a à faire chaque jour, en trois minutes. Utile pour revoir les bases… ou pour la montrer à un collègue.' : 'Avant de prendre ton service : une visite guidée de trois minutes pour découvrir les onglets et ce qu’il faut faire chaque jour.'}</p>
    <div class="col" style="gap:8px">
      ${s2 ? '<button type="button" class="btn primary block" data-inv="mini">Ce qui a changé (1 minute)</button><button type="button" class="btn ghost block" data-inv="go">La visite complète (3 minutes)</button>'
        : `<button type="button" class="btn primary block" data-inv="go">${ancien ? 'Faire la visite' : 'Commencer la visite'}</button>`}
      ${ancien || s2 ? '' : '<button type="button" class="btn ghost block" data-inv="plus-tard">Plus tard</button>'}
      <button type="button" class="btn ghost block" data-inv="non">${s2 ? 'Non merci' : ancien ? 'Non merci, je connais le jeu' : 'Je connais déjà le jeu'}</button>
    </div>
    <p class="tiny muted" style="margin:0">Tu pourras toujours la lancer depuis le Guide du joueur.</p>
  </div>`;
  wrap.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-inv]');
    if (!b) return;
    ev.stopPropagation();
    wrap.remove();
    if (b.dataset.inv === 'go') lancerTuto(0);
    else if (b.dataset.inv === 'mini') lancerTuto(0, true);
    else if (b.dataset.inv === 'non') marquer('zappe');
    else { try { sessionStorage.setItem('mazp-tuto-plus-tard', '1'); } catch (e) { /* pas de stockage */ } }
  });
  document.body.appendChild(wrap);
  (wrap.querySelector('[data-inv="mini"]') || wrap.querySelector('[data-inv="go"]')).focus();
}

/**
 * À appeler après chaque affichage de l'HP. Reprend une visite interrompue, sinon propose la visite
 * une fois (nouveau joueur, ou ancien joueur qui ne l'a jamais vue). Renvoie true si quelque chose s'affiche.
 */
export function tutoAuBesoin() {
  if (tutoActif()) return true;
  if (S.tutoPropose || tutoFait()) return false;
  const reprise = lire(CLE_ETAPE);
  S.tutoPropose = true;
  if (reprise != null) { lancerTuto(Number(reprise) || 0, lire('mazp-tuto-mini') === '1'); return true; }
  try { if (sessionStorage.getItem('mazp-tuto-plus-tard')) return false; } catch (e) { /* pas de stockage */ }
  if (document.querySelector('.aide-wrap')) return false;
  setTimeout(inviter, 400);
  return true;
}
