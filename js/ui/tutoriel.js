// Visite guidée de la première connexion : les onglets et le fil rouge de la journée.
// Une bulle qui suit l'écran réel, un projecteur sur l'élément dont on parle, et trois petits
// gestes à faire soi-même (ouvrir les Ordres, déplacer un agent, valider). On peut la quitter
// à tout moment et la relancer depuis le Guide ; les anciens joueurs peuvent la zapper.
import { S, esc, myZone } from './common.js';
import { ENQ } from '../engine/enquete.js';

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
const ONGLETS = { hp: 'HP', ordres: 'Ordres', terrain: 'Terrain', enquete: 'Enquête', quete: 'Énigmes', carte: 'Carte', radio: 'Radio' };
/** Étape « onglet » dont l'écran n'est pas encore ouvert : le joueur doit toucher l'onglet. */
const attendOnglet = (e) => !!(e.onglet && e.route && S.route !== e.route);
export const ETAPES = [
  {
    id: 'bienvenue', route: 'hp',
    titre: () => `Bienvenue, chef de la ${zoneNom()} !`,
    texte: () => `<p>Tu diriges une zone de police du District Delta, face à d’autres chefs de zone. En trois minutes, on fait le tour des <strong>sept onglets</strong> et du <strong>fil rouge</strong> de ta journée.</p>
      <p class="tuto-note">Tu peux quitter à tout moment : la visite se relance depuis le Guide du joueur.</p>`,
  },
  {
    id: 'fil-rouge', route: 'hp', cible: 'section[aria-label="Prochain tour"]',
    titre: 'Le fil rouge de ta journée',
    texte: `<p><strong>Tout se joue à 20:00</strong>, pour toutes les zones en même temps : personne n’est avantagé parce qu’il a joué plus tôt.</p>
      <p>Cette liste te dit ce qu’il reste à faire aujourd’hui : <strong>ordres, grande décision, enquête, énigmes</strong>. Cinq minutes par jour suffisent. Un point rouge sur un onglet signale aussi qu’il t’attend.</p>`,
  },
  {
    id: 'incidents', route: 'hp', cible: 'section[aria-label="Incidents du jour"]',
    titre: 'Les incidents du jour',
    texte: `<p>Une ou deux fois par jour, tôt le matin, un <strong>incident</strong> tombe sur un de tes services : colis suspect, porte à crocheter, voiture à dégager, dossier à relire. Un compte à rebours t’annonce le prochain.</p>
      <p>Tu as <strong>12 heures</strong> pour jouer le mini-jeu, avec <strong>un seul essai</strong>. Réussi : des PS, un bonus pour ta zone et ta jauge de skins monte. Raté : −1 de moral, pas plus. Pas joué : ton équipe se débrouille seule. Chaque mini-jeu a son tuto, et tu peux t’entraîner dans l’écran Énigmes.</p>`,
  },
  {
    id: 'zone', route: 'hp', cible: 'section[aria-label="Ma zone"]',
    titre: 'Ta zone en un coup d’œil',
    texte: `<p>L’<strong>IPZ</strong> est ta note du jour, sur 100. La moyenne de tes IPZ fait ton classement de la saison.</p>
      <p>Surveille surtout la <strong>satisfaction</strong> des citoyens (le plus gros poids), le <strong>moral</strong> (il multiplie l’efficacité de tous tes agents), le budget et la réputation. Chaque <strong>?</strong> explique une jauge en quelques lignes.</p>`,
  },
  {
    id: 'rapport', route: 'hp', cible: '[data-action="toggle-rapport"]', parent: 'section',
    titre: 'Chaque soir : rapport et Gazette',
    texte: `<p>Après 20:00, ton <strong>rapport</strong> détaille ce qui s’est passé chez toi, et la <strong>Gazette</strong> raconte la soirée du district.</p>
      <p>C’est là que tu comprends ce qui a marché… ou pas. Le classement et le guide complet sont juste à côté.</p>`,
  },
  {
    id: 'affectation', route: 'ordres', onglet: 'L’onglet le plus important de la journée : c’est là que tu décides où travaillent tes agents.',
    cible: 'section[aria-label="Affectation des agents"]',
    titre: 'Cinq services à équilibrer',
    texte: `<p><strong>Intervention</strong> traite les incidents du jour · <strong>Proximité</strong> calme les quartiers · <strong>Recherche</strong> élucide les dossiers et nourrit l’enquête · <strong>Roulage</strong> rapporte des amendes · <strong>Accueil</strong> vide la paperasse.</p>
      <p>Aucun service ne suffit seul : un incident raté ou une pile de dossiers se paie vite. Chaque <strong>?</strong> détaille un service.</p>`,
  },
  {
    id: 'proxi', route: 'ordres', cible: '[data-action="alloc"][data-s="proximite"][data-d="1"]', parent: '.between',
    titre: 'À toi : ajoute un agent en Proximité',
    texte: '<p>S’il n’y a plus d’agent libre, il est pris au service le plus fourni.</p>',
    geste: { consigne: 'Touche le <strong>+</strong> de la ligne <strong>Proximité</strong>.', avant: () => { S.tutoAlloc = alloc(); }, fait: () => alloc() !== S.tutoAlloc },
  },
  {
    id: 'rythme', route: 'ordres', cible: 'section[aria-label="Rythme"]',
    titre: 'Le rythme de travail',
    texte: `<p><strong>Renforcé</strong> : +20 % d’efficacité, mais le moral baisse et les heures sup’ coûtent. Plusieurs jours de suite, gare à l’épuisement… et aux accidents de véhicules.</p>
      <p><strong>Allégé</strong> : l’inverse, pour remonter le moral. Dans le doute, reste en <strong>Normal</strong>.</p>`,
  },
  {
    id: 'decision', route: 'ordres', cible: 'section[aria-label="Grande décision"]',
    titre: 'Une grande décision par jour',
    texte: `<p>Recruter, former un service, acheter du matériel ou un véhicule, construire une annexe, agrandir un bâtiment : <strong>une seule par tour</strong>, alors choisis bien.</p>
      <p>Juste en dessous, les <strong>dépenses du jour</strong> (réserve, prime, prévention, révision des véhicules…) se cumulent avec elle.</p>`,
  },
  {
    id: 'valider', route: 'ordres', cible: ['.savebar [data-action="save-orders"]', 'main .card.green', 'main [data-action="save-orders"]'],
    titre: 'À toi : valide tes ordres',
    texte: `<p>Tant que ce n’est pas validé, rien n’est enregistré. Tu peux encore changer d’avis <strong>jusqu’à 20:00</strong>.</p>
      <p>Un jour sans ordres ? Le <strong>pilote automatique</strong> reprend ta dernière répartition, mais ce tour ne compte pas pour ton classement.</p>`,
    geste: { consigne: 'Touche <strong>Valider</strong>.', fait: () => !!S.savedOrders && !S.ordersDirty },
  },
  {
    id: 'terrain', route: 'terrain', onglet: 'Ce qui se passe chez toi et chez tes voisins.', cible: ['section[aria-label="Chez moi"]', 'section[aria-label="Chez les voisins"]'], union: true,
    titre: 'Terrain : chez toi, chez les voisins',
    texte: `<p><strong>Chez moi</strong> : tes opérations d’envergure et les pressions du jour.</p><p><strong>Zone de non-droit</strong> : le centre de la ville, à reprendre au milieu avec les autres zones. Envoie des agents sur un secteur, sans rien demander à personne : plus on est nombreux le même soir, plus ça tombe vite.</p>
      <p><strong>Chez les voisins</strong> : les appels à renfort et les zones en difficulté. Prêter des agents ou du budget rapporte de la réputation, à la mesure de ce que tu envoies.</p>
      <p><strong>District</strong> : les grands événements où chaque zone doit envoyer du monde.</p>`,
  },
  {
    id: 'enquete', route: 'enquete', onglet: 'L’affaire de la semaine, commune à toutes les zones.', cible: ['main.screen > header', 'main.screen .kicker'],
    titre: 'L’enquête : le fil rouge de la semaine',
    texte: () => `<p>Une affaire à la fois, <strong>${ENQ.dureeMax} jours au maximum</strong>. Cinq suspects : le coupable est le <strong>seul</strong> à réunir un <strong>mobile</strong>, un <strong>moyen</strong> et l’<strong>occasion</strong>. Chaque innocent coince sur au moins un point.</p>
      <p>C’est la partie coopérative du jeu : toutes les zones enquêtent sur la même affaire.</p>`,
  },
  {
    id: 'demarches', route: 'enquete', cible: 'section[aria-label="Aujourd’hui"]',
    titre: 'Deux démarches par jour',
    texte: `<p>Chaque jour, lance jusqu’à <strong>deux démarches</strong> : d’abord les constatations sur la scène, puis des vérifications sur les suspects. Les résultats arrivent à 20:00.</p>
      <p>Tes agents de <strong>Recherche</strong> rapportent aussi des pièces gratuites le soir. Et tu peux <strong>partager</strong> tes pièces avec les autres zones : ça rapporte des PS et de la réputation.</p>`,
  },
  {
    id: 'synthese', route: 'enquete', cible: '.synthese',
    titre: 'Ton tableau, ton raisonnement',
    texte: () => `<p>Pour chaque suspect, touche <strong>Mobile · Moyen · Occasion</strong> pour noter ✓ établi ou ✕ exclu. Le jeu ne coche rien à ta place.</p>
      <p>Quand tu es sûr : <strong>une seule accusation</strong> par affaire. Plus tu trouves tôt, plus ça rapporte ; une fausse accusation coûte de la réputation. Ensuite, toutes les zones ont ${ENQ.traqueTours} tours pour <strong>arrêter</strong> le coupable dans sa planque.</p>`,
  },
  {
    id: 'enigmes', route: 'quete', onglet: 'Trois casse-tête par jour, cinq minutes de réflexion.', cible: '[aria-label="Énigmes du jour"]',
    titre: 'Trois énigmes par jour',
    texte: `<p>Trois petits casse-tête chaque jour, <strong>une seule réponse</strong> chacun. Dès deux bonnes réponses, tu choisis un bonus (un indice, du moral…).</p>
      <p>Le <strong>dossier noir</strong> est facultatif et vraiment difficile. Pour t’exercer sans enjeu : le mode <strong>Entraînement</strong>, qui contient aussi les quatre <strong>mini-jeux d’incident</strong>.</p>`,
  },
  {
    id: 'carte', route: 'carte', onglet: 'Tes quartiers et tout le district.', cible: '#mes-quartiers',
    titre: 'La carte et tes quartiers',
    texte: `<p>Chacun de tes quartiers a sa <strong>tension</strong>. Envoie des patrouilles de <strong>Proximité</strong> là où ça chauffe, surtout sur le <strong>point chaud</strong> annoncé la veille.</p>
      <p>La carte montre aussi la zone de non-droit (au centre, hachurée de rouge) et les autres zones du district.</p>`,
  },
  {
    id: 'radio', route: 'radio', onglet: 'Pour parler avec les autres chefs de zone.', cible: '[aria-label="Radio, messages privés et diplomatie"]',
    titre: 'Radio, privé et diplomatie',
    texte: `<p><strong>Radio</strong> : le canal commun à tous les chefs de zone. Demande des pièces, propose les tiennes, négocie.</p>
      <p><strong>Privé</strong> : les messages en tête-à-tête. <strong>Diplomatie</strong> : entraide, duels, Conseil de police… et manœuvres contre les autres zones, à tes risques.</p>`,
  },
  {
    id: 'fin', route: 'hp',
    titre: 'Ta journée type',
    texte: `<ol class="tuto-liste">
        <li>Lis ton <strong>rapport</strong> et la <strong>Gazette</strong> d’hier soir.</li>
        <li>Règle et <strong>valide tes ordres</strong>.</li>
        <li>Avance l’<strong>enquête</strong> : deux démarches, un partage.</li>
        <li>Résous tes <strong>trois énigmes</strong>.</li>
        <li>Quand un <strong>incident</strong> tombe, interviens dans les 12 heures.</li>
        <li>Jette un œil au <strong>Terrain</strong> et à la <strong>Radio</strong>.</li>
      </ol>
      <p class="tuto-note">Tout le détail est dans le <strong>Guide du joueur</strong> (roue dentée en haut de l’HP), d’où tu peux aussi relancer cette visite. Bon service !</p>`,
  },
];

// ───────────────────────── État et cycle de vie ─────────────────────────

let layer = null, raf = 0, derniereCible = null, dernierIndex = -1;

export const tutoActif = () => S.tuto != null;
export const tutoFait = () => ['fait', 'zappe'].includes(lire(CLE)) || !!(S.player && S.player.tuto);

/** Marque la visite comme terminée ou refusée, sur l'appareil et dans le profil du joueur. */
function marquer(v) {
  ecrire(CLE, v); ecrire(CLE_ETAPE, null);
  if (S.player && !S.player.tuto && S.backend && S.backend.savePlayer && S.user) {
    const p = { ...S.player, tuto: v };
    S.player = p;
    Promise.resolve(S.backend.savePlayer(S.user.uid, p)).catch((e) => console.warn('tuto', e));
  }
}

export function lancerTuto(i = 0) {
  document.querySelector('.aide-wrap')?.remove();
  S.tuto = Math.max(0, Math.min(ETAPES.length - 1, i));
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

function aller(i) {
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

function etapeHtml(e, i) {
  const n = ETAPES.length;
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

let signature = '';
function boucle() {
  raf = requestAnimationFrame(boucle);
  if (!tutoActif() || !layer) return;
  const i = S.tuto, e = ETAPES[i];
  // Changement d'étape : on va sur le bon écran et on prépare le geste.
  if (i !== dernierIndex) {
    dernierIndex = i; derniereCible = null;
    if (e.route && S.route !== e.route && !e.onglet) location.hash = `#${e.route}`;
    if (e.geste && e.geste.avant) e.geste.avant();
  }
  const attente = attendOnglet(e);
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
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card tuto-invite" role="dialog" aria-modal="true" aria-labelledby="tuto-inv-titre">
    <span class="kicker">${ancien ? 'Nouveau' : 'Prise de fonction'}</span>
    <h2 id="tuto-inv-titre" class="aide-titre">${ancien ? 'Une visite guidée du jeu' : `Bienvenue à la ${zoneNom()} !`}</h2>
    <p class="aide-intro">${ancien ? 'Les sept onglets et le fil rouge de la journée, en trois minutes. Utile pour revoir les bases… ou pour la montrer à un collègue.' : 'Avant de prendre ton service : une visite guidée de trois minutes pour découvrir les onglets et ce qu’il faut faire chaque jour.'}</p>
    <div class="col" style="gap:8px">
      <button type="button" class="btn primary block" data-inv="go">${ancien ? 'Faire la visite' : 'Commencer la visite'}</button>
      ${ancien ? '' : '<button type="button" class="btn ghost block" data-inv="plus-tard">Plus tard</button>'}
      <button type="button" class="btn ghost block" data-inv="non">${ancien ? 'Non merci, je connais le jeu' : 'Je connais déjà le jeu'}</button>
    </div>
    <p class="tiny muted" style="margin:0">Tu pourras toujours la lancer depuis le Guide du joueur.</p>
  </div>`;
  wrap.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-inv]');
    if (!b) return;
    ev.stopPropagation();
    wrap.remove();
    if (b.dataset.inv === 'go') lancerTuto(0);
    else if (b.dataset.inv === 'non') marquer('zappe');
    else { try { sessionStorage.setItem('mazp-tuto-plus-tard', '1'); } catch (e) { /* pas de stockage */ } }
  });
  document.body.appendChild(wrap);
  wrap.querySelector('[data-inv="go"]').focus();
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
  if (reprise != null) { lancerTuto(Number(reprise) || 0); return true; }
  try { if (sessionStorage.getItem('mazp-tuto-plus-tard')) return false; } catch (e) { /* pas de stockage */ }
  if (document.querySelector('.aide-wrap')) return false;
  setTimeout(inviter, 400);
  return true;
}
