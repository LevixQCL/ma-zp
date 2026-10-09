// Point d'entrée de l'application « Ma ZP ».
import { basculerPiste, cibler } from './ui/pistes.js';
import { appliquerRegles } from './engine/regles.js';
import { CONFIG } from './config.js';
import { installerCadenas } from './ui/cadenas.js';
import { installerEnigmes } from './ui/enigmes.js';
import { createBackend } from './data/backend.js';
import { codeDejaPris, MSG_CODE_PRIS } from './data/codes.js';
import { installerEuros } from './ui/euros.js';
import { installerGazetteStories } from './ui/gazette-stories.js';
import { resolvePending, completerDepuisGazette, etatResolution } from './data/resolver.js';
import { S, toast, myZone, esc, cielDuMoment, tabbar, pseudoParDefaut, slotsJour, questDuSlot } from './ui/common.js';
import { renderLogin, renderInscription } from './ui/auth.js';
import { renderHP, renderProfil, mesTuiles, MAX_TUILES } from './ui/hp.js';
import { renderBureau, renderChef, chefAFaire, promotionAuBesoin, brancherPanneauChef } from './ui/chef.js';
import { paraSuivant } from './ui/chef-onglet.js';
import { ouvrirPromo } from './ui/fondateurs.js';
import { courriersDuJour } from './engine/parapheur.js';
import { creerChef } from './engine/chef.js';
import { brancherChefTab } from './ui/common.js';
brancherChefTab(chefAFaire);
import { ouvrirPanneau as ouvrirPanneauL } from './ui/logistique.js';
brancherPanneauChef(ouvrirPanneauL);
import { ouvrirAide } from './ui/aide.js';
import { monAppel } from './ui/renfort.js';
import { maCandidature } from './ui/affaires.js';
import { renderTerrain } from './ui/terrain.js';
import { installerAntiTriche } from './ui/antitriche.js';
import { installerInvitationAppli } from './ui/installer.js';
import { lireInvitationUrl, oublierInvitation, partager, copier, afficherQr } from './ui/invitation.js';
import { ouvrirBudget, ouvrirVehicule, ouvrirLogistique, ouvrirParc, rafraichirLogistique, ouvrirDecor, ouvrirHpVoisin } from './ui/logistique.js';
import { DECOR, decorDebloque, conditionDecor, decorValide } from './engine/decor.js';
import { cabossesChoisis } from './engine/parc.js';
import { ouvrirNouveautes, nouveautesAuBesoin, noteCourte } from './ui/nouveautes.js';
import { actuAuBesoin, ouvrirActu, EVT_ACTU, marquerEvtJoue } from './ui/actu.js';
import { tutoAuBesoin, lancerTuto, tutoFait } from './ui/tutoriel.js';
import { lancerRoulette } from './ui/roulette.js';
import { editionHtml, marquerEditionVue, editionVue } from './ui/edition.js';
import { operationActive, effetsOperation } from './engine/zone.js';
import { carteQuartiers } from './engine/quartiers.js';
import { renderPrive, majPastilleRadio } from './ui/prive.js';
import { renderOrdres, initDraft, updateOrdresLive, estimations, agentsHorsServices, minimumsDuSoir } from './ui/ordres.js';
import { prochaineRelance, mesRelances, relancesDuJour } from './ui/ventes.js';
import { VENTE } from './engine/ventes.js';
import { renderQuete, formesVisibles } from './ui/quete.js';
import { demarrerQuiz, repondreQuiz, suivanteQuiz, quizLocal, bonnesReponses, arreterMinuteur } from './ui/quiz.js';
import { renderGuide } from './ui/guide.js';
import { offreApres } from './ui/encheres.js';
import { renderPactes } from './ui/pactes.js';
import { PACTES, PACTE, DEFI, DEFI_INDICATEURS } from './engine/pactes.js';
import { ongletsRadio } from './ui/prive.js';
import { renderParties } from './ui/parties.js';
import { renderEnquete, lireCarnet, ecrireCarnet, synchroCarnet, synchroCarnetMaintenant, restaurerCarnet, choisirVueEnquete, vueEnquete } from './ui/enquete.js';
import { piecesNonLues, marquerLues } from './ui/enquete-dossier.js';
import { affaire, dossierDe, maxDemarchesDe } from './engine/enquete.js';
import { choisirRecoup, retournerPouce } from './ui/enquete-plus.js';
import { marquerJournalVu } from './ui/journal.js';
import { monterTableau, ouvrirVolet, sortirPiece, toutSortir, rangerTableau, basculerFixe, basculerFrise, completerFiche, remettrePiece, tableauZoom, tableauEnsemble, marquerTutoVu } from './ui/tableau.js';
import { renderCarte, renderRadio } from './ui/carte.js';
import { renderRadioV2 } from './ui/radio-v2.js';
import { reglesV2 } from './engine/regles.js';
import { previsionCourte } from './ui/prevision.js';
import { renderCarteV2, calqueTerrain } from './ui/carte-v2.js';
import { renderGazette, renderClassement, renderAdmin } from './ui/gazette.js';
import { renderDebrief } from './ui/debrief.js';
import { questsFor, checkAnswer, dossierNoir, generateQuest, QUEST_TYPES, FORMES, formesPourTour, quatrePourTour, enquetePourTour } from './quests/quests.js';
import { niveauEnigmes } from './engine/directeur.js';
import { formatCountdown, weekdayBe } from './engine/time.js';
import { SERVICES, COULEURS_ZONE, SERVICE_LABELS, RENFORT, DEFAULT_ALLOC, ND, LOTS } from './engine/constants.js';
import { nomSecteur } from './engine/nondroit.js';
import { agentsND, monAnnonceND, suggestionND, placeND, rolesActifs, rolesDe, texteRoles, roleManquant } from './ui/nondroit.js';
import { lancerIncident, lancerAppui, ouvrirMiniJeu, majComptesIncidents, signatureIncidents, ouvrirJaugeSkins } from './ui/incidents.js';
import { migrateState, isOutdated } from './engine/resolve.js';
import { actionReleve } from './ui/releve.js';
import { actionBilan } from './ui/bilan.js';
import { actionCrise } from './ui/crise.js';
import { chargeurHtml, avancerChargeur, sortirChargeur } from './ui/chargeur.js';

const app = document.getElementById('app');
const ROUTES = ['hp', 'ordres', 'enquete', 'guide', 'pactes', 'parties', 'quete', 'carte', 'radio', 'prive', 'terrain', 'gazette', 'classement', 'profil', 'admin', 'debrief', 'bureau', 'chef'];
let unsubState = null, unsubRadio = null, unsubPrive = null, lastTurnKey = null;

function route() {
  const h = (location.hash || '#hp').slice(1);
  if (h.startsWith('guide')) { S.guideSection = h.split('-')[1] || null; return 'guide'; }
  // Lien vers un bloc précis de l'HP (ex. #hp-fipa) : on ouvre l'HP et on y descend.
  if (h.startsWith('hp-')) { S.ancre = h; return 'hp'; }
  // Ancien écran Diplomatie : ses liens mènent aux Pactes de la Carte.
  if (h === 'diplomatie') return 'pactes';
  // Saison 2 : le Terrain est un calque de la Carte.
  if (h === 'terrain' && S.state && reglesV2(S.state) && S.draft) { S.carteCalque = calqueTerrain(); history.replaceState(null, '', '#carte'); return 'carte'; }
  // Lien vers un bloc des ordres (ex. #ordres-decision) : on ouvre ce bloc.
  if (h.startsWith('ordres-')) { S.ordOpen = { ...(S.ordOpen || {}), [h.slice(7)]: true }; S.ordAncre = h.slice(7); return 'ordres'; }
  return ROUTES.includes(h) ? h : 'hp';
}

// Chargement avec garde-fou : si rien ne se passe en 20 secondes, on affiche la cause au lieu de tourner sans fin.
let chargementDepuis = 0, garde = null;
function loading(msg, pct) {
  const cur = app.querySelector('.loader .loader-msg');
  if (cur) { // garde l'animation en cours ; une étape déjà dépassée ne fait pas reculer le texte
    const b = app.querySelector('.loader-bar span'), deja = b ? parseFloat(b.style.width) || 0 : 0;
    if (msg && !(pct && pct < deja)) cur.textContent = msg;
    if (pct) avancerChargeur(app, pct);
    return;
  }
  app.innerHTML = chargeurHtml(esc(msg || 'Chargement…'), pct || 6);
  if (!chargementDepuis) chargementDepuis = Date.now();
  clearTimeout(garde);
  garde = setTimeout(() => { if (app.querySelector('[aria-busy="true"]')) bloque(); }, 20000);
}
/** Étape du chargement : n'agit que si l'écran de chargement est affiché (sinon on ne touche pas au jeu). */
function etape(msg, pct) { if (app.querySelector('main.loader')) loading(msg, pct); }
function bloque(err = S.lastError) {
  const msg = err ? String(err.code || '') + ' ' + String(err.message || err) : 'aucune réponse du serveur';
  let conseil = 'Vérifie ta connexion, puis réessaie.';
  if (/permission/i.test(msg)) conseil = 'La base refuse l’accès : vérifie que les règles de firestore.rules ont bien été publiées (Firestore › Règles › Publier).';
  else if (/offline|unavailable|backend|network|failed to fetch/i.test(msg)) conseil = 'Le jeu n’arrive pas à joindre la base Firestore. Vérifie que la base existe (Databases & Storage › Firestore) et qu’elle s’appelle « (default) ». Un réseau d’entreprise ou un bloqueur de publicités peut aussi bloquer la connexion : essaie depuis le partage de connexion de ton téléphone.';
  else if (/not.?found|does not exist/i.test(msg)) conseil = 'La base Firestore « (default) » est introuvable : crée-la dans Databases & Storage › Firestore, en édition Standard.';
  app.innerHTML = `<main class="center-screen"><h1 class="brand">Ma ZP</h1><div class="card red" style="max-width:420px">
    <h2 class="card-title">Le chargement n’aboutit pas</h2>
    <p class="small" style="margin:0">${esc(conseil)}</p>
    <p class="tiny muted mono" style="margin:0;word-break:break-word">Détail : ${esc(msg.trim())}</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" data-action="reload">Réessayer</button><button class="btn ghost" data-action="logout">Se déconnecter</button></div>
  </div></main>`;
}
window.addEventListener('error', (e) => { S.lastError = e.error || e.message; });
window.addEventListener('unhandledrejection', (e) => { S.lastError = e.reason; });

function render() {
  signalerPresence();
  chargementDepuis = 0; clearTimeout(garde);
  const demo = S.backend && S.backend.mode === 'demo';
  let banner = demo ? '<div class="demo-banner">Mode démo · la partie tourne sur cet appareil avec des zones robots</div>' : '';
  if (S.state && etatResolution.erreur && Date.now() > S.state.nextDeadline) banner += `<div class="demo-banner" role="alert" style="background:#7a2230;color:#fff;text-align:left;word-break:break-word">Le tour n’a pas pu être calculé sur cet appareil. Fais une capture de ce message pour le maître du jeu.<br><span class="tiny mono">${esc(etatResolution.erreur.slice(0, 400))}</span></div>`;
  if (S.state && isOutdated(S.state)) banner += '<div class="demo-banner" role="alert" style="display:flex;gap:10px;align-items:center;justify-content:center">Une nouvelle version du jeu est disponible. <button class="btn small primary" data-action="reload">Mettre à jour</button></div>';
  let html;
  if (!S.user) html = renderLogin();
  else if (S.noParty || S.route === 'parties') html = renderParties();
  else if (S.state === undefined) { loading('Ouverture de ta partie…', 45); return; }
  else if (!S.state) html = renderInscription({ gameExists: false, isAdmin: S.backend.isMaster(S.user) });
  else if (S.player && S.player.retire) html = `<main class="center-screen"><h1 class="brand">Ma ZP</h1><div class="card"><h2 class="card-title">Tu as été retiré de la partie</h2><p class="small muted" style="margin:0">Contacte le maître du jeu si c’est une erreur.</p></div><button class="btn ghost" data-action="logout">Se déconnecter</button></main>`;
  else if (!myZone()) {
    if (S.player && S.joinErreur) html = `<main class="center-screen"><h1 class="brand">Ma ZP</h1><div class="card"><h2 class="card-title">Ta zone n’a pas pu être créée</h2><p class="small muted" style="margin:0">${esc(S.joinErreur)}</p></div><button class="btn primary" data-action="join-retry">Réessayer</button><a class="btn ghost" href="#parties">Retour aux parties</a></main>`;
    else if (S.player) { loading('Création de ta zone…', 85); ensureZone(); return; }
    else html = renderInscription({ gameExists: true });
  } else {
    try {
    if (!S.draft) initDraft();
    if (!S.quests) loadQuest();
    switch (S.route) {
      case 'ordres': html = renderOrdres(); break;
      case 'quete': html = renderQuete(); break;
      case 'enquete': html = renderEnquete(); break;
      case 'guide': html = renderGuide(); if (S.guideSection === 'debut') { S.premiersPasVus = true; try { localStorage.setItem('mazp-premiers-pas-vus', '1'); } catch (e) { /* pas de stockage */ } } break;
      case 'pactes': html = renderPactes(); break;
      case 'carte': html = reglesV2(S.state) ? renderCarteV2() : renderCarte(); break;
      case 'radio': html = reglesV2(S.state) ? renderRadioV2() : renderRadio(); break;
      case 'prive': html = renderPrive(); break;
      case 'terrain': html = reglesV2(S.state) ? renderCarteV2(calqueTerrain()) : renderTerrain(); break;
      case 'gazette': html = renderGazette(); if (S.gazetteIndex === 0) marquerGazetteLue(); break;
      case 'debrief': html = renderDebrief(); break;
      case 'classement':
        html = renderClassement(); break;
      case 'profil': html = renderProfil(); break;
      case 'bureau': html = renderBureau(); break;
      case 'chef': html = renderChef(); break;
      case 'admin': html = S.backend.isMaster(S.user) ? renderAdmin() : renderHP(); break;
      default:
        // Première ouverture : tant que les Gazettes ne sont pas lues, on n'affiche pas l'HP (ni ses pop-up),
        // pour pouvoir ouvrir directement la Gazette du soir si elle n'a pas encore été lue (6 s au plus).
        if (!S.gazettesChargees && Date.now() - (S.ouvertureA ||= Date.now()) < 6000) { loading('Arrivée de la Gazette…', 92); setTimeout(() => { if (!S.gazettesChargees) render(); }, 6100); return; }
        html = renderHP();
    }
    } catch (err) {
      // Un écran qui plante ne doit pas bloquer le jeu : on affiche l'erreur (à transmettre) et une sortie.
      console.error(err);
      html = `<main class="screen"><section class="card red" role="alert"><span class="kicker" style="color:var(--red-soft)">Cet écran a rencontré un problème</span>
        <p class="small" style="margin:0">Fais une capture de ce message et envoie-la au maître du jeu : <code style="word-break:break-word">${esc(S.route)} · ${esc((err && err.message) || String(err))}</code></p>
        <button class="btn primary block" data-action="ecran-reset">Réessayer</button><a class="btn block" href="#hp">Revenir à l’HP</a></section></main>${tabbar(S.route)}`;
    }
  }
  // Édition spéciale de la Gazette (enquête en pause) : une fois sur chaque appareil, puis relisible depuis l'Enquête.
  if (S.state && myZone() && S.route !== 'parties') { try { html += editionHtml(); } catch (err) { console.error(err); } }
  // Barre de validation commune à tous les écrans quand des choix ne sont pas encore validés.
  if (S.ordersDirty && S.state && myZone() && !['parties', 'guide'].includes(S.route)) {
    html += `<div class="savebar" role="status"><span class="small" style="font-weight:600">Modifications non validées</span><span class="row" style="gap:6px"><button class="btn ghost small" data-action="cancel-orders">Annuler</button><button class="btn primary small" data-action="save-orders">Valider</button></span></div>`;
  } else if (S.route === 'ordres' && S.state && myZone() && S.draft && !S.savedOrders) {
    // Écran Ordres pas encore validés : le bouton reste à portée de main, avec le coût de la soirée.
    let cout = 0;
    try { cout = estimations().coutTotal; } catch (e) { /* brouillon incomplet */ }
    html += `<div class="savebar calme" role="status"><span class="col" style="gap:1px"><span class="small" style="font-weight:700">Ordres pas encore validés</span><span class="tiny muted">${reglesV2(S.state) ? `<span id="prev-court">${previsionCourte()}</span> · ` : ''}coût ce soir : ${String(Math.round(cout * 10) / 10).replace('.', ',')} k€</span></span><button class="btn primary small" data-action="save-orders">Valider</button></div>`;
  }
  const scroll = window.scrollY;
  sortirChargeur(app.querySelector('main.loader')); // le logo remonte et s'efface par-dessus le jeu
  app.innerHTML = banner + html;
  // La roulette « Early birds » n'est plus proposée (les skins déjà gagnés restent acquis).
  // Événement d'actualité (une fois par appareil) avant la note de nouveautés.
  if (S.route === 'hp' && S.state && myZone() && !tutoAuBesoin() && !actuAuBesoin(lancerActu) && !promotionAuBesoin()) nouveautesAuBesoin();
  if (S.route === 'ordres' && S.ordAncre) {
    const cible = document.querySelector(`[data-action="ord-open"][data-k="${S.ordAncre}"]`);
    S.ordAncre = null;
    if (cible) { cible.scrollIntoView({ block: 'start' }); S.keepScroll = false; }
  }
  if (S.route === 'hp' && S.ancre) {
    const cible = document.getElementById(S.ancre);
    S.ancre = null;
    if (cible) { cible.scrollIntoView({ block: 'start' }); cible.classList.add('surligne'); setTimeout(() => cible.classList.remove('surligne'), 1800); S.keepScroll = false; }
  }
  if (S.keepScroll) window.scrollTo(0, scroll);
  S.keepScroll = false;
  if (S.route === 'guide' && S.guideSection && !S.keepScrollGuide) { const g = document.getElementById(`g-${S.guideSection}`); if (g) g.scrollIntoView({ block: 'start' }); }
  if (S.route === 'prive') { const l = document.getElementById('prive-list'); if (l && l.lastElementChild) l.lastElementChild.scrollIntoView({ block: 'nearest' }); }
  if (S.route === 'radio') { const l = document.getElementById('radio-list'); if (l && l.lastElementChild) l.lastElementChild.scrollIntoView({ block: 'nearest' }); }
  document.body.classList.toggle('sans-defil', !!document.getElementById('tb-vp'));
  if (S.route === 'enquete') { monterTableau(rerender); if (S.state && S.state.enquete && myZone()) synchroCarnet(rerender); }
}

/** Pastilles « nouveau » sans redessiner l'écran (une saisie en cours n'est pas perdue). */
function majPastilles() {
  majPastilleRadio();
  if (['radio', 'prive'].includes(S.route)) {
    const o = document.querySelector('.onglets-flottants');
    if (o) { const t = document.createElement('div'); t.innerHTML = ongletsRadio(S.route); o.replaceWith(t.firstElementChild); }
  }
}
const champActif = (id) => document.activeElement && document.activeElement.id === id && document.activeElement.value;

const rerender = () => { S.keepScroll = true; render(); };

async function ensureZone() {
  if (S.joining || S.joinErreur) return;
  // Profil dont le code est déjà pris par une autre zone de la partie : on repasse par l'inscription pour en choisir un autre.
  if (S.player && S.state && codeDejaPris(S.state, S.player.code, S.user.uid)) {
    const p = S.player;
    S.signup = { pseudo: p.pseudo || '', nom: p.nom || '', code: '', couleur: p.couleur || COULEURS_ZONE[0] };
    S.player = null; toast(MSG_CODE_PRIS(p.code)); render(); return;
  }
  S.joining = true;
  try { await S.backend.joinGame(S.user.uid, S.player); }
  catch (e) { S.joinErreur = e.message || 'Impossible de créer la zone.'; toast(S.joinErreur); render(); }
  finally { S.joining = false; }
}

const cleReroll = () => `mazp-reroll-${S.backend.gameId ? S.backend.gameId() : ''}-${S.user.uid}-${S.state.season}-${S.state.turn}`;
function loadQuest() {
  const st = S.state;
  // Énigme changée : mémorisée sur l'appareil, et dans la réponse une fois donnée (pour les autres appareils).
  const rerolls = new Set((S.questResults || []).map((r, k) => (r && r.variante ? k : -1)).filter((k) => k >= 0));
  try { const v = localStorage.getItem(cleReroll()); if (v !== null && !(S.questResults || []).some((r) => r && r.variante)) rerolls.add(Number(v)); } catch (e) { /* pas de stockage */ }
  S.quests = questsFor({ seed: CONFIG.seed, uid: S.user.uid, season: st.season, turn: st.turn, weekday: weekdayBe(st.nextDeadline), rerolls: [...rerolls].slice(0, 1), ajust: niveauEnigmes(st.zones && st.zones[S.user.uid]), formes: formesPourTour(st.nextDeadline), quatre: quatrePourTour(st.nextDeadline), enquete: enigmeEnquete(st) });
  S.noir = dossierNoir({ seed: CONFIG.seed, uid: S.user.uid, season: st.season, turn: st.turn, exclure: S.quests.map((q) => q.type), garder: S.noirResult && S.noirResult.type, formes: formesPourTour(st.nextDeadline) });
}

async function loadTurnData() {
  const st = S.state, uid = S.user.uid;
  if (!st || !st.zones[uid]) return;
  const key = `${st.season}-${st.turn}`;
  if (key === lastTurnKey) return;
  const isNew = lastTurnKey !== null;
  lastTurnKey = key;
  // Chaque lecture est indépendante : si l'une échoue, les autres s'affichent quand même.
  const lire = (p, defaut, quoi) => p.catch((e) => { console.warn(`Lecture impossible (${quoi}) :`, e.message); return defaut; });
  const [orders, quest, gazettes] = await Promise.all([
    lire(S.backend.getOrders(uid, st.season, st.turn), null, 'ordres'),
    lire(S.backend.getQuests(uid, st.season, st.turn), null, 'énigmes'),
    lire(S.backend.listGazettes(3), [], 'gazettes'), // les 3 derniers soirs ; les plus anciens à la demande (chargerArchivesGazette)
  ]);
  S.savedOrders = orders; S.ordersDirty = false; S.draft = null; S.decisionOpen = false;
  // Réponses rangées par emplacement : 0, 1, 2 (et 4 avec la 4e énigme) ; le 3 est le dossier noir, gardé à part.
  S.questResults = [0, 1, 2, 3, 4].map((k) => (k === 3 ? null : (quest && quest[k]) || null)); S.noirResult = (quest && quest[3]) || null; S.quests = null; S.questPick = null;
  S.questIdx = slotsJour().find((k) => { const r = S.questResults[k]; return !r || (r.statut !== 'ok' && r.statut !== 'rate'); }) ?? 0;
  // Tri par saison et tour : l'ordre d'écriture dépend de l'horloge de l'appareil qui a calculé le tour.
  S.gazettes = (gazettes || []).slice().sort((x, y) => (y.season - x.season) || (y.turn - x.turn)); S.gazetteIndex = 0; S.rapportIdx = 0; S.gazettesArchives = false;
  completerDepuisGazette(S.state, S.gazettes);
  S.gazettesChargees = true;
  if (isNew) toast(`Tour ${st.turn} : la Gazette est parue !`);
  else if (gazetteAOuvrir()) { S.route = 'gazette'; location.hash = '#gazette'; render(); return; } // première ouverture depuis la parution : on lit la Gazette
  render();
}
// Gazette du jour : à la première ouverture du jeu après sa parution (une fois par numéro et par appareil),
// le jeu s'ouvre sur la Gazette plutôt que sur l'HP. Pas pendant la visite guidée ni sous l'édition spéciale.
const cleGazette = (g) => `mazp-gazette-lue-${S.state && S.state.seed}-${g.season}_${g.turn}`;
function gazetteLue(g) { try { return localStorage.getItem(cleGazette(g)) === '1'; } catch (e) { return true; } }
function marquerGazetteLue() {
  const g = S.gazettes && S.gazettes[0];
  if (g) { try { localStorage.setItem(cleGazette(g), '1'); } catch (e) { /* pas de stockage */ } }
}
function gazetteAOuvrir() {
  const g = S.gazettes && S.gazettes[0];
  if (!g || gazetteLue(g) || S.route !== 'hp' || S.ancre) return false;
  if (!myZone() || S.tuto != null || !tutoFait()) return false; // nouveau joueur : la visite guidée d'abord
  if (S.state.enquetePause && !editionVue()) return false;
  return true;
}
async function afterAuth() {
  if (!S.user) { if (unsubState) unsubState(); unsubState = null; S.state = undefined; lastTurnKey = null; render(); return; }
  etape('Contrôle du badge…', 34);
  try { S.parties = await S.backend.listMyParties(S.user.uid); } catch (e) { console.warn(e); S.lastError = e; S.parties = []; }
  // Arrivée par un lien d'invitation : on rejoint la partie directement.
  if (S.invitation && S.backend.joinByCode) {
    const code = S.invitation; S.invitation = null; oublierInvitation();
    try {
      const gid = await S.backend.joinByCode(S.user.uid, code);
      S.parties = await S.backend.listMyParties(S.user.uid);
      await openParty(gid); location.hash = '#hp';
      toast(`Bienvenue dans la partie « ${(S.partie && S.partie.nom) || code} » !`);
      return;
    } catch (e) { console.warn(e); toast(e.message || 'Lien d’invitation invalide.'); }
  }
  let id = null;
  try { id = localStorage.getItem(`mazp-partie-${S.user.uid}`); } catch (e) { /* stockage indisponible */ }
  if (!S.parties.some((p) => p.id === id)) id = S.parties[0] ? S.parties[0].id : null;
  if (!id) { S.noParty = true; S.state = null; render(); return; }
  try { await openParty(id); } catch (e) { console.error(e); S.lastError = e; bloque(e); }
}

/** Ouvre une partie : on se désabonne de l'ancienne et on recharge tout. */
let ouvertures = 0;
async function openParty(id) {
  if (unsubState) unsubState();
  if (unsubRadio) unsubRadio();
  if (unsubPrive) unsubPrive();
  unsubState = null; unsubRadio = null; unsubPrive = null;
  Object.assign(S, { noParty: false, state: undefined, draft: null, quests: null, savedOrders: null, ordersDirty: false, gazettes: [], radio: [], prives: [], priveAvec: null, vu: null, signup: null, joinErreur: null, questResults: [null, null, null], gazettesChargees: false, ouvertureA: 0 });
  lastTurnKey = null;
  const jeton = ++ouvertures; // si le joueur change de partie pendant le chargement, on abandonne celle-ci
  render();
  const partie = await S.backend.useGame(id);
  if (jeton !== ouvertures) return;
  S.partie = partie;
  etape('Rassemblement de l’équipe…', 58);
  try { localStorage.setItem(`mazp-partie-${S.user.uid}`, id); } catch (e) { /* stockage indisponible */ }
  let player = null, players = {};
  try { player = await S.backend.getPlayer(S.user.uid); } catch (e) { player = null; }
  try { players = await S.backend.getPlayers(); } catch (e) { players = {}; }
  if (jeton !== ouvertures) return;
  // Ancien compte sans pseudo : on en pose un (prénom du compte) pour que les badges affichent un nom de joueur.
  if (player && !player.pseudo && S.backend.mode !== 'demo') {
    const ps = pseudoParDefaut(S.user);
    if (ps) {
      player = { ...player, pseudo: ps };
      players = { ...players, [S.user.uid]: { ...(players[S.user.uid] || {}), pseudo: ps } };
      try { await S.backend.savePlayer(S.user.uid, player); } catch (e) { console.error(e); }
    }
  }
  S.player = player; S.players = players;
  reprendreEntrainementLocal();
  if (!unsubState) {
    unsubState = S.backend.subscribeState(async (state) => {
      S.state = migrateState(state); appliquerRegles(S.state);
      recalerJourSiBesoin();
      if (state && S.user && state.zones[S.user.uid]) { etape('Lecture des PV de la nuit…', 76); try { await loadTurnData(); } catch (e) { console.error(e); S.lastError = e; } }
      if (S.state) completerDepuisGazette(S.state, S.gazettes);
      render();
    }, (e) => { S.lastError = e; if (S.state === undefined) bloque(e); });
  }
  if (!unsubRadio) unsubRadio = S.backend.subscribeRadio((msgs) => {
    S.radio = msgs; if ((S.route === 'radio' && !champActif('radio-msg')) || (S.route === 'hp' && S.ouverts && S.ouverts.encheres && msgs.some((m) => m.enchere))) rerender(); else majPastilles();
    // Rattrapage, une fois : des agents déjà validés dans la zone de non-droit mais jamais annoncés à la radio.
    if (!rattrapageND) { rattrapageND = true; setTimeout(() => { if (S.savedOrders && !S.ordersDirty) annoncerNDAuto(true).catch((e) => console.warn(e)); }, 5000); }
  });
  if (!unsubPrive && S.backend.subscribePrives) unsubPrive = S.backend.subscribePrives(S.user.uid, (msgs) => { S.prives = msgs; if (S.route === 'prive' && !champActif('prive-msg')) rerender(); else majPastilles(); });
  render();
  tick(true);
}

let rattrapageND = false;

/** Maître du jeu : corrige une fois le jour de la Rampe ouverte à la main juste avant le calcul du 4 octobre. */
let recalageFait = false;
async function recalerJourSiBesoin() {
  if (recalageFait || !S.state || !S.user || !S.backend.isMaster(S.user) || !S.backend.adminModifierEtat) return;
  const { jourRampeARecaler, recalerJourRampe } = await import('./engine/enquete.js');
  if (!jourRampeARecaler(S.state)) return;
  recalageFait = true;
  try { await S.backend.adminModifierEtat((cur) => recalerJourRampe(cur)); } catch (e) { console.warn('Recalage du jour impossible :', e); }
}

let lastTick = 0, lastVu = 0;
/** Signale la présence du joueur (au plus toutes les 5 minutes, quand la page est visible). */
function signalerPresence() {
  if (!S.user || !S.player || !S.backend.touchPlayer || document.hidden) return;
  if (Date.now() - lastVu < 5 * 60 * 1000) return;
  lastVu = Date.now();
  S.backend.touchPlayer(S.user.uid).catch((e) => console.warn(e));
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) signalerPresence(); });

// Après l'échéance, on retente la résolution avec un délai qui s'allonge si elle échoue (15 s → 4 min).
let attenteTick = 15000;
async function tick(force = false) {
  signalerPresence();
  if (!S.user || !S.state) return;
  // Avant 20:00, ou sur une version dépassée, rien à calculer : pas de lecture inutile du document d'état.
  // (force : après « forcer la résolution », l'état local n'est pas encore à jour, on relit le serveur.)
  if (!force && (Date.now() < S.state.nextDeadline || isOutdated(S.state))) { attenteTick = 15000; return; }
  if (!force && Date.now() - lastTick < attenteTick) return;
  lastTick = Date.now();
  try {
    const avant = etatResolution.erreur;
    const n = await resolvePending(S.backend, { hour: CONFIG.resolutionHour, state: force ? null : S.state, sansDelai: force && S.backend.isMaster(S.user) });
    if (n > 0) { attenteTick = 15000; S.players = await S.backend.getPlayers(); }
    else attenteTick = Math.min(240000, attenteTick * 2);
    if (etatResolution.erreur !== avant) rerender();
  } catch (e) { console.warn(e); etatResolution.erreur = `Résolution : ${e && e.message ? e.message : e}`; rerender(); attenteTick = Math.min(240000, attenteTick * 2); }
}

// ───────── Actions ─────────
async function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const a = el.dataset.action;
  const b = S.backend;
  try {
    switch (a) {
      case 'demo-start': await b.signInDemo(); break;
      case 'admin-all-parties': S.allParties = await b.listAllParties(); rerender(); break;
      case 'aide': ouvrirAide(el.dataset.k); break;
      case 'incident': {
        // Meilleurs scores à jour avant d'ouvrir (l'urgence du jour les affiche).
        if (/-u$/.test(el.dataset.id || '')) { try { S.players = await b.getPlayers(); } catch (e) { /* hors ligne : on garde ceux connus */ } }
        const err = lancerIncident(el.dataset.id, () => rerender()); if (err) { toast(err); rerender(); } break;
      }
      case 'appui-jouer': { const err = lancerAppui(() => rerender()); if (err) { toast(err); rerender(); } break; }
      case 'releve': case 'releve-n': case 'releve-appui': case 'saisie': { if (actionReleve(a, el)) rerender(); break; }
      case 'bilan': case 'bilan-tout': { if (actionBilan(a, el)) rerender(); break; }
      case 'crise-vote': case 'crise-c': case 'crise-ouvrir': { if (actionCrise(a, el)) rerender(); break; }
      case 'dilemme': { const i = Number(el.dataset.i); S.draft.dilemme = S.draft.dilemme === i ? null : i; S.ordersDirty = true; rerender(); break; }
      case 'prime-choix': { const v = el.dataset.v; S.draft.prime = S.draft.prime === v ? null : v; S.ordersDirty = true; rerender(); break; }
      case 'actu-voir': ouvrirActu(lancerActu); break;
      case 'actu-jouer': lancerActu(); break;
      case 'jauge-skins': ouvrirJaugeSkins(); break;
      case 'jauge-apercu': ouvrirJaugeSkins(el.dataset.k); break;
      case 'appui-demande': { const k = el.dataset.k; S.draft.appui = S.draft.appui === k ? null : k; S.ordersDirty = true; rerender(); break; }
      case 'mj-train': {
        // Records du défi d'endurance à jour avant d'ouvrir (nominette et record à battre).
        try { S.players = await b.getPlayers(); } catch (e) { /* hors ligne : on garde ceux connus */ }
        ouvrirMiniJeu(el.dataset.j, { mode: 'train', onEntrainement: noterEntrainement, onFin: () => rerender() }); break;
      }
      case 'tuto': location.hash = '#hp'; setTimeout(() => lancerTuto(0), 50); break;
      case 'post-n': { const a = S.state.affaires.find((x) => x.id === el.dataset.id); const cur = (S.postuler && S.postuler[a.id]) || Math.min(3, a.agentsMax || 3); S.postuler = { ...(S.postuler || {}), [a.id]: Math.max(1, Math.min(a.agentsMax || 10, cur + Number(el.dataset.d))) }; rerender(); break; }
      case 'postuler': {
        const a = S.state.affaires.find((x) => x.id === el.dataset.id), n = Number(el.dataset.n), st = S.state;
        if (!a || !a.zone || maCandidature(a)) break;
        el.disabled = true;
        // D'abord la candidature (message privé) ; les agents ne sont réservés que si elle est bien partie.
        await b.sendPrive(S.user.uid, a.zone, `📋 Candidature sur « ${a.titre} » : je te propose ${n} agent${n > 1 ? 's' : ''}.`, { candidature: { aid: a.id, agents: n, season: st.season, turn: st.turn } });
        for (let k = 0; k < n; k++) if (!takeAgent()) break;
        S.draft.engagements[a.id] = { agents: n, acceptes: [] };
        S.ordersDirty = true;
        toast('Candidature envoyée. Valide tes ordres pour réserver tes agents.'); rerender(); break;
      }
      case 'cand-ok': case 'cand-non': {
        const a = S.state.affaires.find((x) => x.id === el.dataset.id), uid = el.dataset.uid, st = S.state, ok = el.dataset.action === 'cand-ok';
        if (!a) break;
        if (ok) {
          const e = S.draft.engagements[a.id] || { agents: 0, acceptes: [] };
          e.acceptes = [...new Set([...(e.acceptes || []), uid])];
          S.draft.engagements[a.id] = e; S.ordersDirty = true;
        }
        el.disabled = true;
        await b.sendPrive(S.user.uid, uid, ok ? `✅ Candidature acceptée sur « ${a.titre} ». Bienvenue dans l’équipe !` : `❌ Candidature refusée sur « ${a.titre} ».`, { reponse: { aid: a.id, accepte: ok, season: st.season, turn: st.turn } });
        toast(ok ? 'Candidature acceptée. Valide tes ordres.' : 'Candidature refusée.'); rerender(); break;
      }
      case 'budget': ouvrirBudget(); break;
      case 'vehicule': ouvrirVehicule(el.dataset.slot); break;
      case 'vente-veh': { const sl = Number(el.dataset.slot); const l = new Set(S.draft.ventes || []); if (l.has(sl)) l.delete(sl); else l.add(sl); S.draft.ventes = [...l]; S.ordersDirty = true; ouvrirVehicule(sl); rerender(); break; }
      case 'logistique': ouvrirLogistique(); break;
      case 'tab-restaurer': if (await askConfirm('Remettre ton tableau tel qu’il était sur cet appareil avant la dernière synchronisation ?', 'Restaurer')) { restaurerCarnet(S.state.enquete.n); toast('Tableau restauré.'); rerender(); } break;
      case 'tab-sync': S.carnetSync = 'encours'; rerender(); await synchroCarnetMaintenant(rerender); if (S.carnetSync === 'encours') S.carnetSync = 'ok'; rerender(); toast(S.carnetSync === 'ok' ? 'Tableau synchronisé avec tes autres appareils.' : 'Synchronisation impossible pour le moment.'); break;
      case 'ecran-reset': S.draft = null; S.help = {}; S.ordOpen = {}; S.ventilation = false; render(); break;
      case 'mission-qui': S.missionQui = S.missionQui === el.dataset.role ? null : el.dataset.role; rerender(); break;
      case 'mission-ou': { const m = { role: el.dataset.role, type: el.dataset.type, secteur: el.dataset.secteur || '' }; S.draft.missions = [...(S.draft.missions || []).filter((x) => x.role !== m.role), m]; S.draft.mission = S.draft.missions[0]; S.missionQui = null; S.ordersDirty = true; rerender(); break; }
      case 'poste-qui': S.posteQui = S.posteQui === el.dataset.role ? null : el.dataset.role; rerender(); break;
      case 'poste-choix': { const r = el.dataset.role, sv = el.dataset.s; const p = { ...(S.draft.postes || {}) }; if (sv === ({ inter: 'intervention', rech: 'recherche', prox: 'proximite', roul: 'roulage', admin: 'admin' })[r]) delete p[r]; else { for (const k of Object.keys(p)) if (p[k] === sv) delete p[k]; p[r] = sv; } S.draft.postes = p; S.posteQui = null; S.ordersDirty = true; rerender(); break; }
      case 'mission-annuler': S.draft.missions = (S.draft.missions || []).filter((x) => x.role !== el.dataset.role); S.draft.mission = S.draft.missions[0] || null; S.ordersDirty = true; rerender(); break;
      case 'parc': ouvrirParc(); break;
      case 'decor': ouvrirDecor(); break;
      case 'roulette-lancer': await lancerRoulette(b); rerender(); break;
      case 'skin-choix': {
        const z = S.state.zones[S.user.uid], cat = el.dataset.cat, id = el.dataset.id;
        const actuel = { ...((S.player && S.player.skinsChoix) || z.skinsChoix || {}) };
        if (actuel[cat] === id) delete actuel[cat]; else actuel[cat] = id;
        S.player = { ...(S.player || {}), skinsChoix: actuel };
        try { await b.savePlayer(S.user.uid, S.player); } catch (err) { console.warn(err); }
        rerender(); ouvrirDecor(); break;
      }
      case 'voir-hp': ouvrirHpVoisin(el.dataset.uid); break;
      case 'decor-choix': {
        const z = S.state.zones[S.user.uid], o = DECOR[el.dataset.cat] && DECOR[el.dataset.cat].options[el.dataset.id];
        if (!o) break;
        if (!decorDebloque(z, o)) { toast(`À débloquer : ${conditionDecor(o)}.`); break; }
        const decor = { ...decorValide(z, (S.player && S.player.decor) || z.decor), [el.dataset.cat]: el.dataset.id };
        S.player = { ...(S.player || {}), decor };
        try { await b.savePlayer(S.user.uid, S.player); } catch (err) { console.warn(err); }
        rerender(); ouvrirDecor(); break;
      }
      case 'carro-veh': {
        const dd = (S.draft.depenses ||= { reserve: 0, reserveService: 'intervention' });
        const z = S.state.zones[S.user.uid], i = Number(el.dataset.i);
        const choix = cabossesChoisis(z, dd.carrosserie);
        const garde = choix.includes(i) ? choix.filter((x) => x !== i) : [...choix, i];
        dd.carrosserie = garde.length ? garde : false;
        S.ordersDirty = true;
        toast(garde.includes(i) ? 'Réparation prévue ce soir. Valide tes ordres.' : 'Réparation annulée.');
        rerender(); ouvrirParc(); break;
      }
      case 'invite-share': { const r = await partager(el.dataset.code, el.dataset.nom); if (r === 'copié') toast('Lien copié : colle-le dans un message.'); break; }
      case 'invite-copy': await copier(el.dataset.code, el.dataset.nom); toast('Lien et message copiés.'); break;
      case 'invite-qr': afficherQr(el.dataset.code); break;
      case 'maj-voir': S.menuHp = false; ouvrirNouveautes(); rerender(); break;
      case 'menu-hp': S.menuHp = !S.menuHp; rerender(); break;
      case 'maj-envoyer': {
        const autres = Object.values(S.state.zones).filter((x) => x.uid !== S.user.uid && !(S.players[x.uid] && S.players[x.uid].bot));
        if (!autres.length) { toast('Aucun autre joueur dans la partie.'); break; }
        if (!(await askConfirm(`Envoyer la note de mise à jour en message privé à ${autres.length} joueur${autres.length > 1 ? 's' : ''} ?`, 'Envoyer'))) break;
        el.disabled = true;
        let ok = 0;
        for (const x of autres) { try { await b.sendPrive(S.user.uid, x.uid, noteCourte()); ok++; } catch (e) { console.warn(e); } }
        S.majEnvoyee = ok;
        toast(`Note envoyée à ${ok} joueur${ok > 1 ? 's' : ''}.`); rerender(); break;
      }
      case 'parties-ouvrir': S.ouverts = { ...(S.ouverts || {}), [el.dataset.k]: true }; location.hash = '#parties'; break;
      case 'annexe-voir': S.annexeSel = S.annexeSel === el.dataset.id ? null : el.dataset.id; rafraichirLogistique(); break;
      case 'annexe-construire': {
        const d0 = S.draft.decision, id = el.dataset.id;
        S.draft.decision = d0 && d0.type === 'construire' && d0.infra === id ? null : { type: 'construire', infra: id };
        S.draft.sansDecision = false; S.ordersDirty = true; rerender(); rafraichirLogistique(); break;
      }
      case 'agrandir': {
        const d0 = S.draft.decision;
        S.draft.decision = d0 && d0.type === 'agrandir' && d0.batiment === el.dataset.b ? null : { type: 'agrandir', batiment: el.dataset.b };
        S.ordersDirty = true; rerender(); rafraichirLogistique(); break;
      }
      case 'offre': {
        if (!S.state.enchere) break;
        const n = offreApres(Number(el.dataset.d));
        S.draft.offre = n ? { id: S.state.enchere.id, montant: n } : null;
        S.ordersDirty = true; rerender(); break;
      }
      case 'offre-retirer': S.draft.offre = null; S.ordersDirty = true; rerender(); break;
      case 'secteur': {
        // Secteur de la zone de non-droit : une ligne de la liste s'ouvre ou se referme ; un secteur touché sur une carte s'ouvre sur le Terrain.
        if (el.classList.contains('nd-row')) { S.secteurSel = S.secteurSel === el.dataset.c ? null : el.dataset.c; rerender(); break; }
        S.secteurSel = el.dataset.c;
        // Saison 2 : le non-droit est le premier écran de la Carte ; la fiche du secteur s'ouvre sous la carte.
        if (reglesV2(S.state)) {
          S.carteCalque = 'nondroit';
          if (S.route !== 'carte') { location.hash = '#carte'; await new Promise((ok) => setTimeout(ok, 60)); } else rerender();
          document.querySelector('.nd-fiche')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          break;
        }
        if (location.hash !== '#terrain') { location.hash = '#terrain'; await new Promise((ok) => setTimeout(ok, 60)); } else rerender();
        const cible = document.getElementById(`nd-${el.dataset.c}`);
        if (cible) { cible.scrollIntoView({ block: 'center', behavior: 'smooth' }); cible.classList.add('surligne-bloc'); setTimeout(() => cible.classList.remove('surligne-bloc'), 1600); }
        break;
      }
      case 'nd-role': {
        // Saison 2 : un agent de plus ou de moins dans un rôle ; il vient du service qui va avec (et y retourne).
        const k = el.dataset.c, r = el.dataset.r, dd = Number(el.dataset.d);
        if (!['rep', 'desc', 'bouc'].includes(r)) break;
        if (dd > 0 ? ajouterRoleND(k, r) : retirerRoleND(k, r)) { S.secteurSel = k; S.ordersDirty = true; }
        rerender(); break;
      }
      case 'nd': {
        const k = el.dataset.c, dd = Number(el.dataset.d);
        if (rolesActifs()) { if (dd > 0 ? ajouterRoleND(k, 'desc') : retirerRoleND(k, rolesDe(k).desc ? 'desc' : rolesDe(k).bouc ? 'bouc' : 'rep')) { S.secteurSel = k; S.ordersDirty = true; } rerender(); break; }
        const sect = (S.draft.secteurs ||= {});
        const cur = sect[k] || 0;
        if (dd > 0) {
          if (cur >= ND.maxParSecteur || agentsND() >= ND.maxTotal) { toast(`Au plus ${ND.maxParSecteur} agents par secteur et ${ND.maxTotal} en tout.`); break; }
          if (!takeAgent()) break;
          sect[k] = cur + 1;
        } else if (cur > 0) {
          if (cur - 1 > 0) sect[k] = cur - 1; else delete sect[k];
          S.draft.alloc.intervention += 1; // l'agent rendu retourne en Intervention
        }
        S.secteurSel = k; S.ordersDirty = true; rerender(); break;
      }
      case 'nd-appel': {
        const k = el.dataset.c, n = (S.draft.secteurs || {})[k] || 0, z = myZone();
        if (!n) break;
        el.disabled = true;
        const deja = monAnnonceND(k);
        await b.sendRadio(S.user.uid, rolesActifs()
          ? `🚔 Zone de non-droit : ${z.nom} (ZP ${z.code}) ${deja ? 'sera finalement' : 'sera ce soir'} à ${nomSecteur(k)} : ${texteRoles(rolesDe(k))}.${deja ? '' : ' Complétez ce qui manque !'}`
          : deja
          ? `🚔 Zone de non-droit : ${z.nom} (ZP ${z.code}) sera finalement à ${nomSecteur(k)} avec ${n} agent${n > 1 ? 's' : ''} ce soir.`
          : `🚔 Zone de non-droit : ${z.nom} (ZP ${z.code}) envoie ${n} agent${n > 1 ? 's' : ''} à ${nomSecteur(k)} ce soir. Plus on est nombreux, plus ça tombe vite : qui vient ?`,
        { nd: { season: S.state.season, turn: S.state.turn, secteur: String(k), agents: n, ...(rolesActifs() ? { roles: rolesDe(k) } : {}) } });
        toast('Annoncé sur la radio : les autres zones peuvent te rejoindre.'); rerender(); break;
      }
      case 'nd-rej-n': {
        const k = el.dataset.c, cur = (S.ndRejoindre && S.ndRejoindre[k]) || suggestionND(k);
        (S.ndRejoindre ||= {})[k] = Math.max(1, Math.min(placeND(k), cur + Number(el.dataset.d)));
        rerender(); break;
      }
      case 'nd-rejoindre': {
        // Depuis une annonce radio : j'envoie des agents sur le même secteur et je préviens la radio à mon tour.
        const k = el.dataset.c, voulu = Number(el.dataset.n) || 0, z = myZone();
        const sect = (S.draft.secteurs ||= {});
        let ajoutes = 0;
        for (let i = 0; i < voulu; i++) {
          if (rolesActifs()) { if (!ajouterRoleND(k, roleManquant(k))) break; ajoutes++; continue; }
          if ((sect[k] || 0) >= ND.maxParSecteur || agentsND() >= ND.maxTotal || !takeAgent()) break;
          sect[k] = (sect[k] || 0) + 1; ajoutes++;
        }
        if (!ajoutes) break;
        S.ordersDirty = true;
        el.disabled = true;
        const n = sect[k];
        try {
          await b.sendRadio(S.user.uid, rolesActifs() ? `🤝 ${z.nom} (ZP ${z.code}) rejoint ${nomSecteur(k)} : ${texteRoles(rolesDe(k))}.` : `🤝 ${z.nom} (ZP ${z.code}) rejoint ${nomSecteur(k)} avec ${n} agent${n > 1 ? 's' : ''} ce soir.`,
            { nd: { season: S.state.season, turn: S.state.turn, secteur: String(k), agents: n, ...(rolesActifs() ? { roles: rolesDe(k) } : {}) } });
        } catch (e2) { console.warn(e2); }
        toast(`${ajoutes} agent${ajoutes > 1 ? 's' : ''} pour ${nomSecteur(k)} ce soir. Valide tes ordres.`);
        rerender(); break;
      }
      case 'quartier': {
        S.quartierSel = el.dataset.c;
        const dansCarte = !!el.closest('svg');
        rerender();
        // Saison 2 : la fiche du quartier est juste sous la carte, on la montre sans quitter la carte des yeux.
        if (dansCarte && reglesV2(S.state)) document.querySelector('.cv-fiche')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        else if (dansCarte) document.getElementById(`q-${el.dataset.c}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        break;
      }
      case 'patrouille-n': { // saison 2 : toucher la n-ième case = n patrouilles (on passe par le même calcul que + / −)
        const cur = ((S.draft && S.draft.patrouilles) || {})[el.dataset.c] || 0;
        el.dataset.d = String(Number(el.dataset.n) - cur);
      }
      // falls through
      case 'patrouille': case 'point-chaud': {
        const d = S.draft; if (!d) break;
        const p = (d.patrouilles ||= {});
        const prox = effetsOperation(myZone(), d.alloc || {}, d.operation, S.state.turn).eff.proximite || 0;
        const total = Object.values(p).reduce((s2, x) => s2 + x, 0);
        const k = el.dataset.action === 'point-chaud' ? myZone().pointChaud && myZone().pointChaud.cell : el.dataset.c;
        if (k == null) break;
        const cible = Math.max(0, Math.min(prox, el.dataset.action === 'point-chaud' ? Math.max(2, p[k] || 0) : (p[k] || 0) + Number(el.dataset.d)));
        // Plus d'agent libre : on en reprend un sur une autre patrouille (la plus fournie, point chaud en dernier).
        let manque = total - (p[k] || 0) + cible - prox;
        const pcCell = myZone().pointChaud && String(myZone().pointChaud.cell);
        const repris = [];
        while (manque > 0) {
          const autre = Object.keys(p).filter((x) => x !== String(k) && p[x] > 0).sort((a, b) => ((a === pcCell) - (b === pcCell)) || p[b] - p[a])[0];
          if (!autre) break;
          p[autre]--; if (!p[autre]) delete p[autre]; manque--; repris.push(autre);
        }
        const n = Math.max(0, cible - Math.max(0, manque));
        if (n) p[k] = n; else delete p[k];
        if (repris.length) { const cq = carteQuartiers(S.state); toast(`Agent repris à ${[...new Set(repris)].map((x) => cq.nomDe(Number(x))).join(', ')}.`); }
        S.quartierSel = k; S.ordersDirty = true; rerender(); break;
      }
      case 'cv-nd': S.carteCalque = 'nondroit'; rerender(); document.getElementById('non-droit')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); break;
      case 'carte-calque': S.carteCalque = el.dataset.v; if (S.route !== 'carte') location.hash = '#carte'; else { rerender(); } break;
      case 'carte-zoom': S.carteZoom = el.dataset.v === '1'; rerender(); break;
      case 'renfort-n': {
        const cible = el.dataset.uid, dd = Number(el.dataset.d);
        const ancien = S.draft.renfort && S.draft.renfort.cible !== cible ? S.draft.renfort.agents : 0;
        const cur = S.draft.renfort && S.draft.renfort.cible === cible ? S.draft.renfort.agents : 0;
        const n = Math.max(0, Math.min(RENFORT.maxParZone, cur + dd));
        // Un seul renfort par tour : les agents d'un autre renfort prévu reviennent en Intervention.
        if (ancien) { S.draft.renfort = null; S.draft.alloc.intervention += ancien; }
        if (n > cur) { if (!takeAgent()) break; }
        else if (n < cur) S.draft.alloc.intervention += cur - n; // l'agent rendu retourne en Intervention
        S.draft.renfort = n ? { cible, agents: n } : null;
        S.ordersDirty = true; rerender(); break;
      }
      case 'renfort-dem': { const n = Number(el.closest('.renfort-ctrl').querySelector('[data-action="renfort-appel"]').dataset.n); S.renfortDemande = Math.max(1, Math.min(RENFORT.maxDemande, n + Number(el.dataset.d))); rerender(); break; }
      case 'renfort-appel': {
        const z = myZone(), st = S.state, op = operationActive(z, st.turn), n = Number(el.dataset.n);
        if (!op || monAppel()) break;
        el.disabled = true;
        await b.sendRadio(S.user.uid, `🚨 Appel à renfort : ${z.nom} (ZP ${z.code}) demande ${n} agent${n > 1 ? 's' : ''} pour « ${op.titre} » ce soir. Qui peut prêter du monde ?`, { renfort: { season: st.season, turn: st.turn, agents: n } });
        toast('Appel lancé sur la radio.'); rerender(); break;
      }
      case 'prive-ouvrir': S.priveAvec = el.dataset.uid; render(); window.scrollTo(0, document.body.scrollHeight); break;
      case 'ecrire-a': document.querySelector('.aide-wrap')?.remove(); S.priveAvec = el.dataset.uid; if (location.hash !== '#prive') location.hash = '#prive'; else render(); break;
      case 'prive-fermer': S.priveAvec = null; render(); window.scrollTo(0, 0); break;
      case 'nuit-ok': {
        const z = myZone();
        const k = `mazp-nuit-${b.gameId ? b.gameId() : ''}-${S.state.season}-${S.state.turn}-${z.uid}`;
        S.nuitVue = k; try { localStorage.setItem(k, '1'); } catch (e2) { /* rien */ }
        rerender(); break;
      }
      case 'party-open': await openParty(el.dataset.id); location.hash = '#hp'; break;
      case 'reload': location.reload(); break;
      case 'join-retry': S.joinErreur = null; render(); break;
      case 'admin-export': {
        const data = await b.adminExport();
        const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
        const a2 = document.createElement('a');
        a2.href = URL.createObjectURL(blob);
        a2.download = `ma-zp-sauvegarde-s${data.state.season}-t${data.state.turn}.json`;
        document.body.appendChild(a2); a2.click(); a2.remove();
        toast('Sauvegarde téléchargée.'); break;
      }
      case 'login-google': await b.signInGoogle(); break;
      case 'reset-password': {
        const email = document.querySelector('[data-form="login"] [name="email"]').value.trim();
        if (!email) { toast('Indique d’abord ton adresse e-mail.'); break; }
        await b.resetPassword(email); toast('E-mail de réinitialisation envoyé.'); break;
      }
      case 'logout': await b.signOut(); S.user = null; S.player = null; lastTurnKey = null; location.hash = '#hp'; afterAuth(); break;
      case 'pick-color': {
        const f = document.querySelector('[data-form="signup"]');
        S.signup = { pseudo: f.pseudo ? f.pseudo.value : undefined, code: f.code.value, nom: f.nom.value, couleur: el.dataset.color }; rerender(); break;
      }
      case 'pick-color-profil': S.profilColor = el.dataset.color; rerender(); break;
      case 'rename': S.editingName = true; rerender(); setTimeout(() => document.getElementById('nom-zone')?.focus(), 0); break;
      case 'toggle-rapport': S.showRapport = !S.showRapport; S.rapportIdx = 0; rerender(); break;
      // HP : raccourcis épinglés (une carte se déplie sous les tuiles) et leur choix.
      case 'hp-tuile': { const k = el.dataset.k; S.hpTuile = S.hpTuile === k ? null : k; if (S.hpTuile) S.ouverts = { ...(S.ouverts || {}), [k]: true }; rerender(); break; }
      case 'chef-plus-tard': S.chefPlusTard = true; try { sessionStorage.setItem('mazp-chef-plus-tard', '1'); } catch (e2) { /* rien */ } rerender(); window.scrollTo(0, 0); break;
      case 'chef-maintenant': S.chefPlusTard = false; try { sessionStorage.removeItem('mazp-chef-plus-tard'); } catch (e2) { /* rien */ } rerender(); window.scrollTo(0, 0); break;
      case 'hp-tuiles-edit': S.hpEdit = !S.hpEdit; rerender(); break;
      case 'hp-tuile-choix': {
        const k = el.dataset.k, l = mesTuiles().slice();
        const i = l.indexOf(k);
        if (i >= 0) { if (l.length <= 1) { toast('Garde au moins un raccourci.'); break; } l.splice(i, 1); }
        else { if (l.length >= MAX_TUILES) { toast(`${MAX_TUILES} raccourcis au plus : enlève-en un d’abord.`); break; } l.push(k); }
        S.player = { ...(S.player || {}), hpTuiles: l };
        rerender();
        try { await b.savePlayer(S.user.uid, S.player); } catch (err) { console.warn(err); }
        break;
      }
      case 'hp-challenge': S.questMode = 'train'; S.trainVue = 'minijeux'; S.questPick = null; location.hash = '#quete'; break;
      case 'hp-ciel': {
        const v = ['jour', 'crepuscule', 'nuit'].includes(el.dataset.v) ? el.dataset.v : null;
        S.player = { ...(S.player || {}), hpCiel: v };
        rerender(); ouvrirDecor();
        try { await b.savePlayer(S.user.uid, S.player); } catch (err) { console.warn(err); }
        break;
      }
      case 'rapport-nav': if (Number(el.dataset.d) > 0) chargerArchivesGazette(); S.rapportIdx = Math.max(0, (S.rapportIdx || 0) + Number(el.dataset.d)); rerender(); break;
      case 'voir-rapport': {
        // Depuis « Résultat de la nuit » : ouvre le rapport et descend jusqu'à lui.
        S.showRapport = true; S.rapportIdx = 0; rerender();
        const r = document.getElementById('rapport-complet');
        if (r) { r.scrollIntoView({ block: 'start', behavior: 'smooth' }); r.classList.add('surligne-bloc'); setTimeout(() => r.classList.remove('surligne-bloc'), 1800); }
        break;
      }
      case 'demo-next': {
        el.disabled = true; el.textContent = 'Résolution en cours…';
        await b.adminForceResolution(); await tick(true); break;
      }
      case 'rythme': S.draft.rythme = el.dataset.v; S.ordersDirty = true; rerender(); break;
      case 'ev': {
        const d = Number(el.dataset.d);
        if (d > 0) takeAgent();
        S.draft.evenement = Math.max(0, (S.draft.evenement || 0) + d); S.ordersDirty = true; rerender(); break;
      }
      case 'eng': {
        const id = el.dataset.id, d = Number(el.dataset.d);
        const cur = S.draft.engagements[id] || { agents: 0, acceptes: [] };
        if (d > 0 && !takeAgent()) break;
        cur.agents = Math.max(0, cur.agents + d);
        if (cur.agents === 0) delete S.draft.engagements[id]; else S.draft.engagements[id] = cur;
        S.ordersDirty = true; rerender(); break;
      }
      case 'help': S.help = { ...(S.help || {}), [el.dataset.s]: !(S.help && S.help[el.dataset.s]) }; rerender(); break;
      case 'op-niveau': S.draft.operation = el.dataset.v; S.ordersDirty = true; rerender(); break;
      case 'dep-reserve': {
        const dd = (S.draft.depenses ||= { reserve: 0, reserveService: 'intervention' });
        dd.reserve = Math.max(0, Math.min(4, (dd.reserve || 0) + Number(el.dataset.d)));
        S.ordersDirty = true; rerender(); break;
      }
      case 'reserve-libere': {
        // La réserve prend la place de mes agents dans le service : ils deviennent libres, à placer où je veux.
        const dd = S.draft.depenses || {}, s2 = dd.reserveService || 'intervention';
        const n = Math.min(dd.reserve || 0, S.draft.alloc[s2] || 0);
        if (!n) break;
        S.draft.alloc[s2] -= n;
        S.ordersDirty = true; toast(`${n} agent${n > 1 ? 's' : ''} libéré${n > 1 ? 's' : ''} : place-les dans la zone de non-droit (Terrain) ou dans un autre service.`); rerender(); break;
      }
      case 'vente-relance': {
        const v = S.state.vente, lot = v && v.lots.find((x) => x.k === el.dataset.k);
        if (!lot) break;
        const m = prochaineRelance(lot.k), z0 = myZone();
        if (mesRelances() >= VENTE.relancesJour) { toast('Plus de relance possible aujourd’hui.'); break; }
        { const eng = Object.entries(relancesDuJour().parZone[S.user.uid] || {}).reduce((t, [k, x]) => t + (k === lot.k ? 0 : x), 0);
          if (m + eng > z0.budget) { toast(eng ? 'Ton budget ne couvre pas cette relance en plus de celles déjà engagées.' : 'Ton budget ne couvre pas cette relance.'); break; } }
        await b.sendRadio(S.user.uid, `🔨 ZP ${z0.code} ${z0.nom} relance à ${String(Math.round(m * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')} € sur « ${LOTS[lot.id].nom} »`, { enchere: { vente: v.id, lot: lot.k, montant: m } });
        toast('Relance publiée : tout le district la voit.'); break;
      }
      case 'vente-expertise': S.draft.expertise = S.draft.expertise === el.dataset.k ? null : el.dataset.k; S.ordersDirty = true; rerender(); break;
      case 'vente-tuyau': S.draft.tuyau = S.draft.tuyau === el.dataset.k ? null : el.dataset.k; S.ordersDirty = true; rerender(); break;
      case 'vente-finale': {
        const k = el.dataset.k, f = { ...((S.draft.finales || {})[k] || {}) }, d0 = Number(el.dataset.d), p0 = Number(el.dataset.p || 0);
        let m = f.montant ? f.montant + d0 : d0 > 0 ? p0 : 0;
        // On ne descend jamais sous le plancher (mise à prix, ou sa relance d'hier) : au plancher, « − » retire l'offre.
        if (f.montant && m < p0) m = f.montant > p0 ? p0 : 0;
        m = Math.round(Math.min(VENTE.max, Math.max(0, m)) * 10) / 10;
        S.draft.finales = { ...(S.draft.finales || {}) };
        if (m > 0) S.draft.finales[k] = { ...f, montant: m }; else delete S.draft.finales[k];
        S.ordersDirty = true; rerender(); break;
      }
      case 'promo-photo': ouvrirPromo(); break;
      case 'bureau-ouvrir': S.bureauUid = el.dataset.u || null; S.bureauObj = null; if (document.querySelector('.aide-wrap')) document.querySelectorAll('.aide-wrap').forEach((x) => x.remove()); location.hash = !S.bureauUid && reglesV2(S.state) ? '#chef' : '#bureau'; break;
      case 'chef-front': S.draft.chefFront = el.dataset.v || null; S.ordersDirty = true; rerender(); break;
      case 'chef-reseau': S.draft.reseau = S.draft.reseau === el.dataset.v ? null : el.dataset.v; S.ordersDirty = true; rerender(); break;
      case 'chef-brevet': S.draft.brevet = S.draft.brevet === el.dataset.v ? null : el.dataset.v; S.ordersDirty = true; rerender(); break;
      case 'chef-detail': S.bureauObj = S.bureauObj === el.dataset.k ? null : el.dataset.k; rerender(); break;
      case 'ord-chef': S.ordOpen = { ...(S.ordOpen || {}), chef: true }; location.hash = '#ordres'; break;
      case 'feliciter': {
        const u = el.dataset.u, sn = S.state.season;
        S.player = { ...(S.player || {}), felicite: { ...((S.player && S.player.felicite) || {}), [u]: sn } };
        await b.savePlayer(S.user.uid, S.player); S.players = await b.getPlayers();
        toast('Félicitations envoyées : elles s’affichent dans son bureau.'); rerender(); break;
      }
      case 'adjoint-consigne': case 'chef-ruban': {
        const cle = el.dataset.action === 'adjoint-consigne' ? 'consigne' : 'ruban';
        const cur = (S.player && S.player.chef) || {};
        const v = cle === 'ruban' && cur.ruban === el.dataset.v ? null : el.dataset.v;
        S.player = { ...(S.player || {}), chef: { ...cur, [cle]: v } };
        await b.savePlayer(S.user.uid, S.player); S.players = await b.getPlayers();
        toast(cle === 'consigne' ? 'Consigne laissée à ton adjoint : elle compte dès ce soir si tu ne donnes pas d’ordres.' : v ? 'Ruban affiché sur ton portrait.' : 'Ruban retiré de ton portrait.'); rerender(); break;
      }
      case 'chef-carte': {
        const { partagerCarte } = await import('./ui/chef-semaine.js');
        toast('Préparation de la carte…');
        try { await partagerCarte(S.bureauUid || S.user.uid); } catch (e) { toast('Impossible de créer l’image sur cet appareil.'); }
        break;
      }
      case 'chef-modifier': S.chefEdit = true; S.chefBrouillon = { ...((S.player && S.player.chef) || {}) }; rerender(); break;
      case 'chef-portrait': S.chefBrouillon = { ...(S.chefBrouillon || {}), portrait: el.dataset.v }; rerender(); break;
      case 'chef-tous': S.chefTous = true; rerender(); break;
      case 'chef-parcours': S.chefBrouillon = { ...(S.chefBrouillon || {}), parcours: el.dataset.v }; rerender(); break;
      case 'chef-enregistrer': {
        const dv = document.getElementById('chef-devise');
        const chef = { ...((S.player && S.player.chef) || {}), ...(S.chefBrouillon || {}), devise: dv ? String(dv.value || '').trim().slice(0, 60) : '' };
        // Parcours déjà fixé sur la zone (nouvel appareil, profil sans parcours) : on le reprend.
        { const zc = myZone() && myZone().chef; if (!chef.parcours && zc && zc.parcours) chef.parcours = zc.parcours; }
        if (!chef.portrait || !chef.parcours) { toast(chef.portrait ? 'Choisis d’abord le parcours de ton chef.' : 'Choisis d’abord un portrait.'); break; }
        S.player = { ...(S.player || {}), chef };
        await b.savePlayer(S.user.uid, S.player);
        S.chefBrouillon = null; S.chefEdit = false; S.players = await b.getPlayers();
        toast('Ton chef prend ses fonctions. Son parcours compte dès ce soir.'); rerender(); break;
      }
      case 'chef-agenda': { const v = el.dataset.v; const cur = S.draft.agenda || {}; S.draft.agenda = v === 'terrain' ? { type: 'terrain', service: cur.service || 'intervention' } : v === 'voisin' ? { type: 'voisin', zone: cur.zone || null } : { type: v }; S.ordersDirty = true; rerender(); break; }
      case 'chef-agenda-svc': S.draft.agenda = { type: 'terrain', service: el.dataset.v }; S.ordersDirty = true; rerender(); break;
      case 'chef-agenda-voisin': S.draft.agenda = { type: 'voisin', zone: el.dataset.v }; S.ordersDirty = true; rerender(); break;
      case 'para-revoir': S.paraIdx = Number(el.dataset.v) || 0; S.paraAnim = null; rerender(); break;
      case 'para-choix': {
        const id = el.dataset.id, k = Number(el.dataset.v);
        S.draft.parapheur = { ...(S.draft.parapheur || {}), [id]: k }; S.ordersDirty = true;
        const liste = courriersDuJour(S.state, myZone().chef ? myZone() : { ...myZone(), chef: creerChef(S.player && S.player.chef) });
        const i = liste.indexOf(id); S.paraIdx = i; S.paraAnim = id; rerender();
        // Coup de tampon, puis la feuille s'en va et le courrier suivant arrive.
        setTimeout(() => {
          const f = document.querySelector(`.co-feuille[data-para="${id}"]`); if (f) f.classList.add('sort');
          setTimeout(() => { if (S.paraAnim !== id) return; S.paraAnim = null; S.paraIdx = paraSuivant(liste, S.draft && S.draft.parapheur, i); rerender(); }, 320);
        }, 650);
        break;
      }
      case 'chef-talent': {
        const z0 = myZone(); const cur = [...(S.draft.talents || (z0.chef && z0.chef.talents) || [])]; const v = el.dataset.v;
        S.draft.talents = cur.includes(v) ? cur.filter((t) => t !== v) : [...cur, v].slice(0, 4); S.ordersDirty = true; rerender(); break;
      }
      case 'doctrine': S.draft.doctrine = S.draft.doctrine === el.dataset.k ? null : el.dataset.k; S.ordersDirty = true; rerender(); break;
      case 'piste-toggle': basculerPiste(el.dataset.k); S.ordersDirty = true; rerender(); break;
      case 'dep-toggle': {
        const dd = (S.draft.depenses ||= { reserve: 0, reserveService: 'intervention' });
        const zk = S.state.zones[S.user.uid];
        if (el.dataset.k === 'carrosserie' && Array.isArray(dd.carrosserie) && cabossesChoisis(zk, dd.carrosserie).length < (zk.cabosses || []).length) dd.carrosserie = true;
        else dd[el.dataset.k] = !dd[el.dataset.k];
        S.ordersDirty = true;
        if (el.dataset.fermer) toast(dd[el.dataset.k] ? 'Révision prévue ce soir. Valide tes ordres.' : 'Révision annulée.');
        rerender(); if (el.dataset.fermer) ouvrirParc(); break;
      }
      case 'class-tab': S.classTab = el.dataset.t; rerender(); break;
      case 'enq-tab': S.enqTab = el.dataset.t; rerender(); break;
      case 'edition-fermer': marquerEditionVue(); render(); break;
      case 'edition-ouvrir': S.editionOuverte = true; render(); break;
      case 'debrief-ouvrir': S.debriefId = el.dataset.id; if (location.hash !== '#debrief') location.hash = '#debrief'; else render(); break;
      case 'admin-affaire-maintenant': {
        const { ouvrirAffaireMaintenant, AFFAIRES_ECRITES, affaire } = await import('./engine/enquete.js');
        const { APP_VERSION } = await import('./engine/constants.js');
        const def = AFFAIRES_ECRITES.find((a) => a.cas === el.dataset.cas);
        if (!def) break;
        const st = S.state;
        const enCours = st.enquete ? `« ${affaire(st, st.enquete.n).titre} » (jour ${st.enquete.jour || 1}) sera retirée et ses pièces perdues. ` : '';
        if (!(await askConfirm(`Ouvrir « ${def.titre} » maintenant ? ${enCours}Les traques continuent. Tous les joueurs voient la nouvelle affaire tout de suite.`, 'Ouvrir l’affaire'))) break;
        const r = await b.adminModifierEtat((cur) => {
          const t = ouvrirAffaireMaintenant(cur, def.cas);
          if (t == null) return null;
          cur.minClientVersion = Math.max(cur.minClientVersion || 0, APP_VERSION);
          return t;
        });
        if (r == null) { toast('Cette affaire n’est plus disponible dans cette partie.'); break; }
        try { if (b.sendRadio) await b.sendRadio(S.user.uid, `🚨 Le parquet ouvre une nouvelle affaire : « ${def.titre} ». Le dossier est dans l’onglet Enquête.`); } catch (e) { /* message facultatif */ }
        toast(`« ${def.titre} » est ouverte.`);
        location.hash = '#enquete';
        break;
      }
      case 'admin-pause-enquete': {
        const st = S.state;
        if (!st.enquete || st.enquetePause) break;
        if (!(await askConfirm('Retirer l’affaire en cours ? Les pièces déjà reçues sur cette affaire sont perdues. Les traques continuent. Une édition spéciale de la Gazette s’affiche chez tout le monde, et la nouvelle affaire s’ouvre au prochain 20:00.', 'Retirer l’affaire'))) break;
        const { affaire } = await import('./engine/enquete.js');
        const { APP_VERSION } = await import('./engine/constants.js');
        await b.adminPauseEnquete({ id: `${st.season}-${st.turn}-${st.enquete.n}`, n: st.enquete.n, titre: affaire(st, st.enquete.n).titre, tour: st.turn, reprise: st.nextDeadline }, Math.max(st.minClientVersion || 0, APP_VERSION));
        toast('Affaire retirée : l’édition spéciale s’affiche chez tout le monde.');
        break;
      }
      case 'tb-ban-fermer': S.banTraqueVue = S.state.turn; render(); break;
      case 'tb-prime-fermer': S.banPrimeVue = S.state.turn; render(); break;
      case 'tb-prime-ouvrir': S.banPrimeVue = null; render(); break;
      case 'traque-voir': if (reglesV2(S.state) && vueEnquete() === 'dossier') { S.tabSheet = null; S.banTraqueVue = S.state.turn; render(); requestAnimationFrame(() => { const t = document.getElementById('traque'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); break; }
        S.enqVue = 'liste'; S.tabSheet = null; try { localStorage.setItem('mazp-enq-vue', 'liste'); } catch (err) { /* pas de stockage */ } render(); requestAnimationFrame(() => { const t = document.getElementById('traque'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); break;
      case 'tab-vue': choisirVueEnquete(el.dataset.v); S.tabSheet = null; S.e2Lire = false; window.scrollTo(0, 0); render(); break;
      // Saison 2 : écran Enquête en dossier.
      case 'e2-onglet': S.e2Onglet = el.dataset.t; S.tabSheet = null; rerender(); break;
      case 'e2-choix': S.tabSheet = { k: 'choix', id: 'choix' }; rerender(); break;
      case 'e2-ancre': { const t = document.getElementById(el.dataset.id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
      case 'e2-lire': { const aff = affaire(S.state, S.state.enquete.n); S.e2LireTotal = piecesNonLues(aff, dossierDe(S.state, myZone())).length; S.e2Lire = true; S.tabSheet = null; rerender(); break; }
      case 'e2-lire-fin': S.e2Lire = false; rerender(); break;
      case 'e2-suivante': {
        const n = S.state.enquete.n; marquerLues(n, [el.dataset.f]);
        const reste = piecesNonLues(affaire(S.state, n), dossierDe(S.state, myZone())).length;
        if (!reste) { S.e2Lire = false; S.e2Onglet = 'pieces'; toast('Tout est classé au dossier.'); }
        rerender(); break;
      }
      case 'e2-tout-classer': { const n = S.state.enquete.n; marquerLues(n, piecesNonLues(affaire(S.state, n), dossierDe(S.state, myZone())).map((p) => p.f)); S.e2Lire = false; S.e2Onglet = 'pieces'; rerender(); break; }
      case 'e2-lire-partager': { const n = S.state.enquete.n; marquerLues(n, [el.dataset.f]); S.e2Lire = false; ouvrirVolet(el.dataset.f, rerender, { partage: true }); break; }
      case 'tab-partager': ouvrirVolet(el.dataset.f, rerender, { partage: true }); break;
      case 'e2-marque': {
        const n = S.state.enquete.n, c = lireCarnet(n), k = `${el.dataset.i}:${el.dataset.e}`;
        c.g = { ...(c.g || {}), [k]: Number(el.dataset.v) || 0 }; ecrireCarnet(n, c); rerender(); break;
      }
      case 'tab-volet': S.tabSheet = S.tabSheet && S.tabSheet.k === el.dataset.k ? null : { k: el.dataset.k, id: el.dataset.k }; S.tabMode = 'main'; S.tabFrom = null; rerender(); break;
      case 'tab-ouvrir': S.tabMode = 'main'; S.tabFrom = null; ouvrirVolet(el.dataset.tid, rerender); break;
      case 'tab-fermer': S.tabSheet = null; rerender(); break;
      case 'tab-route': S.tabRoute = { n: S.state.enquete.n, a: el.dataset.a, b: el.dataset.b, mode: el.dataset.m }; rerender(); break;
      case 'tab-route-effacer': S.tabRoute = null; rerender(); break;
      case 'scene-pt': {
        const d0 = document.querySelector('.sf-zoom-defil'), x0 = d0 ? d0.scrollLeft : null;
        S.scenePt = el.dataset.k; S.scenePtsVus = [...new Set([...(S.scenePtsVus || []), el.dataset.k])]; rerender();
        if (x0 !== null) requestAnimationFrame(() => { const d1 = document.querySelector('.sf-zoom-defil'); if (d1) d1.scrollLeft = x0; });
        break;
      }
      case 'scene-zoom': S.sceneZoom = true; rerender(); requestAnimationFrame(() => { const d1 = document.querySelector('.sf-zoom-defil'); if (d1) d1.scrollLeft = (d1.scrollWidth - d1.clientWidth) / 2; }); break;
      case 'scene-dezoom': S.sceneZoom = false; rerender(); break;
      case 'scene-fermer': S.sceneOuverte = null; S.sceneZoom = false; rerender(); break;
      case 'frise-ev': basculerFrise(el.dataset.id); rerender(); break;
      case 'reaud-piece': S.draft.reaud = { i: Number(el.dataset.i), f: el.dataset.f }; S.ordersDirty = true; rerender(); break;
      case 'reaud-annuler': S.draft.reaud = null; S.ordersDirty = true; rerender(); break;
      case 'recoup-piece': { const aff = affaire(S.state, S.state.enquete.n); if (choisirRecoup(aff, dossierDe(S.state, myZone()), el.dataset.a, el.dataset.b)) { S.ordersDirty = true; toast('Recoupement prévu ce soir. Pense à valider tes ordres.'); } rerender(); break; }
      case 'recoup-annuler': S.draft.recoup = null; S.ordersDirty = true; rerender(); break;
      case 'hypo-choix': { const h = { ...(S.draft.hypo || {}) }; if (el.dataset.i !== undefined) h.i = Number(el.dataset.i); if (el.dataset.s !== undefined) h.s = Number(el.dataset.s); S.draft.hypo = h; S.ordersDirty = true; rerender(); break; }
      case 'hypo-annuler': S.draft.hypo = null; S.ordersDirty = true; rerender(); break;
      case 'mobile-choix': { const m = Number(el.dataset.m); S.draft.mobile = S.draft.mobile === m ? null : m; S.ordersDirty = true; rerender(); break; }
      case 'pouce-voir': retournerPouce(affaire(S.state, S.state.enquete.n), el.dataset.k); rerender(); break;
      case 'confront-piece': { const c = S.draft.confront || []; const f = el.dataset.f; S.draft.confront = c.includes(f) ? c.filter((x) => x !== f) : [...c, f].slice(0, 3); S.ordersDirty = true; rerender(); break; }
      case 'confront-valider': {
        const s = affaire(S.state, S.state.enquete.n).suspects[Number(el.dataset.i)];
        if (await askConfirm(`Confronter ${s.nom} à 20:00 avec ces trois éléments ? Si c’est la mauvaise personne, le parquet te retire l’affaire.`, 'Confronter')) { S.draft.accusation = Number(el.dataset.i); S.ordersDirty = true; S.tabSheet = null; rerender(); }
        break;
      }
      case 'tab-confront': S.enqVue = 'tableau'; S.tabSheet = { k: 'confront', id: `X:${el.dataset.i}` }; render(); break;
      case 'journal-ouvrir': S.journalOuvert = S.state.enquete.n; S.tabSheet = null; rerender(); break;
      case 'journal-fermer': marquerJournalVu(affaire(S.state, S.state.enquete.n)); S.journalOuvert = null; rerender(); break;
      case 'tab-sortir': sortirPiece(el.dataset.f); S.tabSheet = null; rerender(); toast('Glisse la pièce où tu veux sur le tableau.'); break;
      case 'tab-tout-sortir': { const k = toutSortir(); S.tabSheet = null; rerender(); tableauEnsemble(); toast(`${k} élément${k > 1 ? 's' : ''} punaisé${k > 1 ? 's' : ''} dans les coins libres : range-les comme tu veux.`); break; }
      case 'tab-ranger': { if (!confirm('Ranger le tableau ? Chaque suspect reçoit sa colonne autour du plan, ses pièces en dessous ; les documents et les planques vont sous le plan. Les éléments épinglés ne bougent pas, les ficelles suivent.')) break; const k = rangerTableau(); S.tabSheet = null; rerender(); tableauEnsemble(); toast(k ? 'Tableau rangé autour du plan.' : 'Aucune pièce punaisée à ranger.'); break; }
      case 'tab-fixer': { const f = basculerFixe(el.dataset.tid); rerender(); toast(f ? 'Épinglée : elle ne bougera plus quand tu fais défiler. Les ficelles marchent toujours.' : 'Libérée : tu peux de nouveau la déplacer.'); break; }
      case 'tab-fiche': completerFiche(el.dataset.e); S.tabSheet = null; ouvrirVolet(`c:${el.dataset.e}`, rerender); break;
      case 'tab-remettre': remettrePiece(el.dataset.f); S.tabSheet = null; rerender(); break;
      case 'tab-mode': S.tabMode = el.dataset.v; S.tabFrom = null; if (S.tabMode === 'fil') S.tabSheet = null; rerender(); break;
      case 'tab-zoom': tableauZoom(Number(el.dataset.d)); break;
      case 'tab-fit': tableauEnsemble(); break;
      case 'tab-tuto': S.tabTuto = 0; S.tabSheet = null; rerender(); break;
      case 'tab-tuto-suite': S.tabTuto += 1; rerender(); break;
      case 'tab-tuto-fin': S.tabTuto = null; marquerTutoVu(); rerender(); break;
      case 'enq-filtre': S.enqFiltre = el.dataset.v; rerender(); break;
      case 'pieces-filtre': S.piecesFiltre = el.dataset.v; rerender(); break;
      case 'enq-open': S.enqOpen = { ...(S.enqOpen || {}), [el.dataset.i]: !(S.enqOpen || {})[el.dataset.i] }; rerender(); break;
      case 'mmo-mark': {
        const n = S.state.enquete.n, c = lireCarnet(n), k = `${el.dataset.i}:${el.dataset.e}`;
        c.g = { ...(c.g || {}), [k]: ((c.g || {})[k] || 0) + 1 === 3 ? 0 : ((c.g || {})[k] || 0) + 1 }; ecrireCarnet(n, c); rerender(); break;
      }
      case 'carnet-mark': {
        const n = S.state.enquete.n, c = lireCarnet(n), t = el.dataset.t, i = el.dataset.i;
        c[t] = c[t] || {}; c[t][i] = ((c[t][i] || 0) + 1) % 4; ecrireCarnet(n, c); rerender(); break;
      }
      case 'dem-toggle': {
        const k = el.dataset.k, dm = (S.draft.demarches ||= []);
        S.draft.demarches = dm.includes(k) ? dm.filter((x) => x !== k) : [...dm, k].slice(0, maxDemarchesDe(S.state, myZone()));
        S.ordersDirty = true; rerender(); break;
      }
      case 'accuser': {
        const aff = affaire(S.state, S.state.enquete.n);
        const s = aff.suspects[Number(el.dataset.i)];
        // Deux complices : le bouton porte les deux noms (data-j).
        const j = el.dataset.j !== undefined ? Number(el.dataset.j) : null, s2 = j !== null ? aff.suspects[j] : null;
        if (await askConfirm(s2 ? `Accuser ${s.nom} et ${s2.nom}, ensemble ? L’accusation part au parquet à 20:00. Une seule accusation par affaire : si tu te trompes, tu es écarté de l’affaire.` : `Accuser ${s.nom} ? L’accusation part au parquet à 20:00. Une seule accusation par affaire : si tu te trompes, tu es écarté de l’affaire.`, 'Accuser')) {
          S.draft.accusation = Number(el.dataset.i); S.draft.accusation2 = s2 ? j : null; S.ordersDirty = true; rerender();
        }
        break;
      }
      case 'piste': { const i = Number(el.dataset.i); S.draft.piste = S.draft.piste === i ? null : i; S.ordersDirty = true; rerender(); break; }
      case 'accuser-annuler': S.draft.accusation = null; S.draft.accusation2 = null; S.draft.confront = []; S.draft.mobile = null; S.ordersDirty = true; rerender(); break;
      case 'partage': {
        const p = (S.draft.partages ||= []);
        if (p.length < 3) p.push({ f: el.dataset.f, a: el.dataset.a });
        S.ordersDirty = true; rerender(); break;
      }
      case 'partage-annuler': S.draft.partages = (S.draft.partages || []).filter((p) => p.f !== el.dataset.f); S.ordersDirty = true; rerender(); break;
      case 'traque-planque': {
        const n = Number(el.dataset.n), i = Number(el.dataset.i);
        const ag = S.draft.traque && S.draft.traque.n === n ? S.draft.traque.agents : Math.min(4, S.draft.alloc.intervention || 0);
        const p2 = S.draft.traque && S.draft.traque.n === n && S.draft.traque.planque2 !== i ? S.draft.traque.planque2 : undefined;
        S.draft.traque = { n, planque: i, agents: ag, ...(p2 != null ? { planque2: p2 } : {}) }; S.ordersDirty = true; rerender(); break;
      }
      case 'traque-planque2': {
        const t = S.draft.traque; if (!t) break;
        const i = Number(el.dataset.i);
        if (t.planque2 === i || i === t.planque) delete t.planque2; else t.planque2 = i;
        S.ordersDirty = true; rerender(); break;
      }
      case 'traque-agents': {
        const t = S.draft.traque; if (!t) break;
        t.agents = Math.max(0, Math.min(S.draft.alloc.intervention || 0, t.agents + Number(el.dataset.d))); S.ordersDirty = true; rerender(); break;
      }
      case 'traque-annuler': S.draft.traque = null; S.ordersDirty = true; rerender(); break;
      case 'fipa-n': {
        const f = (S.state.fipas || []).find((x) => x.id === el.dataset.id); if (!f) break;
        const o = S.draft.fipa && S.draft.fipa.id === f.id ? S.draft.fipa : { id: f.id, invite: '', moi: Math.ceil(f.besoin / 2), lui: Math.floor(f.besoin / 2) };
        o[el.dataset.k] = Math.max(2, Math.min(8, o[el.dataset.k] + Number(el.dataset.d)));
        S.draft.fipa = o; S.ordersDirty = true; rerender(); break;
      }
      case 'fipa-rep': S.draft.fipaReponse = { id: el.dataset.id, accepte: el.dataset.v === '1' }; S.ordersDirty = true; rerender(); break;
      case 'fipa-choix': S.draft.fipaChoix = { id: el.dataset.id, choix: el.dataset.v }; S.ordersDirty = true; rerender(); break;
      case 'vote': S.draft.votes = { ...(S.draft.votes || {}), [el.dataset.m]: Number(el.dataset.i) }; S.ordersDirty = true; rerender(); break;
      case 'motion-chef': S.draft.motionChef = S.draft.motionChef === el.dataset.v ? null : el.dataset.v; S.ordersDirty = true; rerender(); break;
      // Pactes et défis amicaux (onglet Pactes de la Carte).
      case 'pacte-form': S.pacteForm = el.dataset.type ? { type: el.dataset.type } : {}; rerender(); if (el.dataset.type) requestAnimationFrame(() => { const f = document.querySelector('.pacte-form'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); break;
      case 'pacte-form-fermer': S.pacteForm = null; rerender(); break;
      case 'pacte-cible': S.pacteForm = { ...(S.pacteForm || {}), cible: el.dataset.v }; rerender(); break;
      case 'pacte-type': S.pacteForm = { ...(S.pacteForm || {}), type: el.dataset.v }; rerender(); break;
      case 'pacte-proposer': {
        if (!(S.pacteForm && S.pacteForm.cible && S.pacteForm.type)) { rerender(); break; }
        // La proposition part tout de suite en message privé (l'autre peut accepter aujourd'hui) et dans les ordres, validés d'office.
        const { cible, type } = S.pacteForm, st = S.state;
        S.draft.pacte = { cible, type }; S.pacteForm = null;
        await b.sendPrive(S.user.uid, cible, `🤝 Je te propose un ${PACTES[type].nom.toLowerCase()} pour ${PACTE.duree} jours : ${PACTES[type].court.toLowerCase()}. Réponds dans Carte › Pactes ; si tu acceptes avant 20:00, il est signé ce soir.`, { pacte: { type, season: st.season, turn: st.turn } });
        await validerOrdres();
        toast(`Proposition envoyée à ${st.zones[cible].nom}. S’il accepte avant 20:00, le pacte est signé ce soir.`); rerender(); break;
      }
      case 'pacte-accepter': {
        const de = el.dataset.de, type = el.dataset.type, ok = el.dataset.v === '1', st = S.state;
        S.draft.pacteAccepte = (S.draft.pacteAccepte || []).filter((x) => x.de !== de);
        if (ok) S.draft.pacteAccepte.push({ de, type });
        await b.sendPrive(S.user.uid, de, ok ? `✅ J’accepte ton ${PACTES[type].nom.toLowerCase()} : signature ce soir à 20:00.` : `Merci pour ta proposition de ${PACTES[type].nom.toLowerCase()}, mais pas cette fois.`, { pacteRep: { type, ok, season: st.season, turn: st.turn } });
        await validerOrdres();
        toast(ok ? 'Accepté : le pacte sera signé ce soir à 20:00.' : 'Réponse envoyée.'); rerender(); break;
      }
      case 'pacte-annuler': S.draft.pacte = null; await validerOrdres(); toast('Proposition annulée.'); rerender(); break;
      case 'pacte-rep': S.draft.pacteReponse = { id: el.dataset.id, accepte: el.dataset.v === '1' }; S.ordersDirty = true; rerender(); break;
      case 'pacte-frag': S.draft.fragment = S.draft.fragment === el.dataset.id ? null : el.dataset.id; S.ordersDirty = true; rerender(); break;
      case 'pacte-rompre': {
        if (S.draft.pacteRompre === el.dataset.id) { S.draft.pacteRompre = null; S.ordersDirty = true; rerender(); break; }
        if (!(await askConfirm('Rompre ce pacte ce soir ? La Gazette l’annoncera et tu ne pourras pas signer de nouveau pacte pendant 3 tours.', 'Rompre', 'Garder'))) break;
        S.draft.pacteRompre = el.dataset.id; S.ordersDirty = true; rerender(); break;
      }
      case 'defi-form': S.defiForm = { mise: 0 }; rerender(); break;
      case 'defi-form-fermer': S.defiForm = null; rerender(); break;
      case 'defi-cible': S.defiForm = { ...(S.defiForm || {}), cible: el.dataset.v }; rerender(); break;
      case 'defi-ind': S.defiForm = { ...(S.defiForm || {}), ind: el.dataset.v }; rerender(); break;
      case 'defi-mise': S.defiForm = { ...(S.defiForm || {}), mise: Number(el.dataset.v) }; rerender(); break;
      case 'defi-lancer': {
        if (!(S.defiForm && S.defiForm.cible && S.defiForm.ind)) { rerender(); break; }
        const { cible, ind } = S.defiForm, mise = S.defiForm.mise || 0, st = S.state;
        S.draft.defi = { cible, ind, mise }; S.defiForm = null;
        await b.sendPrive(S.user.uid, cible, `🏁 Je te lance un défi amical : ${DEFI_INDICATEURS[ind].nom.toLowerCase()} pendant ${DEFI.duree} jours${mise ? `, ${mise} k€ misés chacun` : ', sans mise'}. Réponds dans Carte › Pactes ; refuser ne coûte rien.`, { defi: { ind, mise, season: st.season, turn: st.turn } });
        await validerOrdres();
        toast(`Défi envoyé à ${st.zones[cible].nom}. S’il accepte avant 20:00, il démarre ce soir.`); rerender(); break;
      }
      case 'defi-accepter': {
        const de = el.dataset.de, ind = el.dataset.ind, mise = Number(el.dataset.mise) || 0, ok = el.dataset.v === '1', st = S.state;
        S.draft.defiAccepte = (S.draft.defiAccepte || []).filter((x) => x.de !== de);
        if (ok) S.draft.defiAccepte.push({ de, ind, mise });
        await b.sendPrive(S.user.uid, de, ok ? '✅ Défi relevé : on démarre ce soir à 20:00.' : 'Pas cette fois pour le défi, merci quand même !', { defiRep: { ind, mise, ok, season: st.season, turn: st.turn } });
        await validerOrdres();
        toast(ok ? 'Défi relevé : il démarre ce soir à 20:00.' : 'Réponse envoyée.'); rerender(); break;
      }
      case 'defi-annuler': S.draft.defi = null; await validerOrdres(); toast('Défi annulé.'); rerender(); break;
      case 'defi-rep': S.draft.defiReponse = { id: el.dataset.id, accepte: el.dataset.v === '1' }; S.ordersDirty = true; rerender(); break;
      case 'aide-cible': S.draft.aide = S.draft.aide && S.draft.aide.cible === el.dataset.v ? null : { budget: 0, agents: 0, cible: el.dataset.v }; S.ordersDirty = true; rerender(); break;
      case 'aide-n': {
        const ad = (S.draft.aide ||= { cible: '', budget: 0, agents: 0 });
        const k = el.dataset.k, max = k === 'budget' ? 10 : 3;
        ad[k] = Math.max(0, Math.min(max, (ad[k] || 0) + Number(el.dataset.d))); S.ordersDirty = true; rerender(); break;
      }
      case 'pick-blason': await b.savePlayer(S.user.uid, { ...(S.player || {}), blason: el.dataset.v }); S.player = { ...(S.player || {}), blason: el.dataset.v }; S.players = await b.getPlayers(); toast('Blason enregistré.'); rerender(); break;
      case 'toggle-consigne': {
        const cs = { ...((S.player && S.player.consignes) || {}) };
        const k = el.dataset.k;
        if (k === 'alloc') cs.alloc = cs.alloc ? null : { ...S.draft.alloc }; else cs[k] = !cs[k];
        await b.savePlayer(S.user.uid, { ...(S.player || {}), consignes: cs }); S.player = { ...(S.player || {}), consignes: cs };
        toast('Consignes du pilote enregistrées.'); rerender(); break;
      }
      case 'alloc': {
        const k = el.dataset.s, dd = Number(el.dataset.d);
        const al = S.draft.alloc;
        if (dd < 0) { if (al[k] > 0) al[k]--; }
        else {
          if (estimations().reste <= 0) {
            const donneur = SERVICES.filter((x) => x !== k && al[x] > 0).sort((x, y) => al[y] - al[x])[0];
            if (!donneur) break;
            al[donneur]--; toast(`1 agent pris en ${SERVICE_LABELS[donneur]}`);
          }
          al[k]++;
        }
        S.ordersDirty = true; rerender(); break;
      }
      case 'radio-canal': S.radioCanal = el.dataset.v === 'ops' ? 'ops' : 'parole'; if (location.hash === '#prive') location.hash = '#radio'; else rerender(); break;
      case 'radio-echanges': S.radioEchanges = !S.radioEchanges; rerender(); break;
      case 'radio-rapide': {
        const t = String(el.dataset.t || '').slice(0, 280);
        if (!t || !b.sendRadio) break;
        await b.sendRadio(S.user.uid, t, { canal: 'ops' });
        S.radioEchanges = true; rerender(); break;
      }
      case 'ventilation': S.ventilation = !S.ventilation; rerender(); break;
      case 'rapatrier': {
        const k = el.dataset.k, d = S.draft;
        const lib = (key) => {
          if (key.startsWith('eng:')) {
            const id = key.slice(4), eg = d.engagements[id];
            if (eg && eg.acceptes && eg.acceptes.length) eg.agents = 0; else delete d.engagements[id];
          } else if (key.startsWith('nd:')) { if (d.secteurs) delete d.secteurs[key.slice(3)]; if (d.roles) delete d.roles[key.slice(3)]; }
          else if (key === 'ev') d.evenement = 0;
          else if (key === 'renfort') d.renfort = null;
        };
        if (k === 'tout') agentsHorsServices().forEach((h) => lib(h.k)); else lib(k);
        S.ordersDirty = true; toast('Agents rapatriés : ils sont libres, à réaffecter.'); rerender(); break;
      }
      case 'repartir': {
        // Les agents libres rejoignent les services, selon la répartition de base.
        const al = S.draft.alloc; const n = estimations().reste; if (n <= 0) break;
        const poids = SERVICES.map((s2) => [s2, DEFAULT_ALLOC[s2]]);
        const tot = poids.reduce((s2, [, p]) => s2 + p, 0);
        const parts = poids.map(([s2, p]) => ({ s: s2, n: Math.floor((n * p) / tot), r: ((n * p) / tot) % 1 }));
        let reste = n - parts.reduce((s2, x) => s2 + x.n, 0);
        parts.sort((x, y) => y.r - x.r).forEach((x) => { if (reste > 0) { x.n++; reste--; } al[x.s] += x.n; });
        S.ordersDirty = true; toast(`${n} agent${n > 1 ? 's' : ''} réparti${n > 1 ? 's' : ''} dans les services.`); rerender(); break;
      }
      case 'ord-aller': {
        // Pastilles des ordres (saison 2) : ouvre la section et descend jusqu'à elle.
        const k = el.dataset.k;
        if (k === 'chef') { location.hash = '#chef'; break; }
        if (['decision', 'pistes', 'depenses', 'equipe', 'nondroit', 'affaires', 'reserve'].includes(k)) S.ordOpen = { [k]: true };
        rerender();
        const c = document.getElementById(`ord-${k}`) || document.querySelector(`[data-action="ord-open"][data-k="${k}"]`);
        if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); c.classList.add('surligne-bloc'); setTimeout(() => c.classList.remove('surligne-bloc'), 1600); }
        break;
      }
      case 'ord-open': { const k = el.dataset.k, was = !!(S.ordOpen && S.ordOpen[k]); S.ordOpen = reglesV2(S.state) && el.closest('.ord-tuiles') ? { [k]: !was } : { ...(S.ordOpen || {}), [k]: !was }; rerender(); if (!was && reglesV2(S.state) && el.closest('.ord-tuiles')) requestAnimationFrame(() => { const c = document.getElementById(`ord-${k}`); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }); break; };
      case 'toggle-decision': S.decisionOpen = !S.decisionOpen; rerender(); break;
      case 'decision': S.draft.decision = JSON.parse(el.dataset.json); S.draft.sansDecision = el.dataset.aucune === '1'; S.ordersDirty = true; rerender(); break;
      case 'dec-cat': S.decCat = el.dataset.v; rerender(); break;
      case 'cancel-orders': {
        // Revient aux derniers choix validés (ou aux ordres par défaut si rien n'a encore été validé).
        if (!(await askConfirm('Effacer les modifications non validées et revenir à tes derniers choix validés ?', 'Oui, effacer', 'Non, garder'))) break;
        S.draft = null; initDraft(); S.ordersDirty = false;
        toast('Modifications annulées.'); rerender(); break;
      }
      case 'save-orders': {
        await validerOrdres();
        toast('C’est validé ! Tu peux encore modifier jusqu’à 20:00.'); rerender(); break;
      }
      case 'memo-voir': {
        const q = questCourante();
        S.memoVu = { ...(S.memoVu || {}), [q.id]: true };
        if (!String(q.id).startsWith('train')) try { localStorage.setItem(`mazp-memo-${q.id}`, 'true'); } catch { /* stockage indisponible */ }
        rerender(); break;
      }
      case 'quest-pick': S.questPick = el.dataset.v; rerender(); break;
      case 'quest-tab': S.questIdx = Number(el.dataset.i); S.questMode = 'jour'; S.questPick = null; render(); break;
      case 'roue': { const q = questCourante(); const id = (q.cles || 1) > 1 ? `${q.id}:${el.dataset.i || 0}` : q.id; S.roue = { ...(S.roue || {}), [id]: ((S.roue || {})[id] || 0) + Number(el.dataset.d) }; rerender(); break; }
      case 'grille-mark': case 'grille-reset': {
        const q = questCourante();
        const m = { ...((S.grilleMarks || {})[q.id] || {}) };
        if (el.dataset.action === 'grille-reset') Object.keys(m).forEach((k) => delete m[k]);
        else { const k = el.dataset.k; m[k] = !m[k] ? '✗' : m[k] === '✗' ? '✓' : ''; if (!m[k]) delete m[k]; }
        S.grilleMarks = { ...(S.grilleMarks || {}), [q.id]: m };
        try { localStorage.setItem(`mazp-grille-${q.id}`, JSON.stringify(m)); } catch { /* stockage indisponible */ }
        rerender(); break;
      }
      case 'quest-submit': await submitQuest(S.questPick); break;
      case 'quest-mode': {
        // Trois onglets : énigmes du jour, Challenge (mini-jeux), entraînement aux énigmes.
        const v = el.dataset.v;
        S.questMode = v === 'jour' ? 'jour' : 'train'; S.questPick = null;
        if (v === 'challenge') S.trainVue = 'minijeux';
        else if (v === 'train') { S.trainVue = 'enigmes'; if (!S.train) nouvelEntrainement(); }
        rerender(); window.scrollTo(0, 0);
        if (v === 'challenge' && Date.now() - (S.playersLus || 0) > 60000) {
          S.playersLus = Date.now();
          try { S.players = await b.getPlayers(); if (S.route === 'quete' && S.trainVue === 'minijeux') rerender(); } catch (e) { /* hors ligne : on garde ceux connus */ }
        }
        break;
      }
      case 'train-vue': {
        S.trainVue = el.dataset.v; if (S.trainVue === 'enigmes' && !S.train) nouvelEntrainement(); rerender(); window.scrollTo(0, 0);
        // Onglet Challenge : records des autres relus (au plus une fois par minute), puis nominettes redessinées.
        if (S.trainVue === 'minijeux' && Date.now() - (S.playersLus || 0) > 60000) {
          S.playersLus = Date.now();
          try { S.players = await b.getPlayers(); if (S.route === 'quete' && S.trainVue === 'minijeux') rerender(); } catch (e) { /* hors ligne : on garde ceux connus */ }
        }
        break;
      }
      case 'train-type': S.trainType = el.dataset.v; S.trainChoix = false; nouvelEntrainement(); rerender(); window.scrollTo(0, 0); break;
      case 'train-choix': S.trainChoix = S.trainChoix === false; rerender(); window.scrollTo(0, 0); break;
      case 'train-diff': S.trainDiff = Number(el.dataset.v); nouvelEntrainement(); rerender(); break;
      case 'train-forme': S.trainForme = el.dataset.v; nouvelEntrainement(); rerender(); break;
      case 'train-new': nouvelEntrainement(); rerender(); window.scrollTo(0, 0); break;
      case 'quest-reroll': {
        const i = S.questIdx || 0;
        const r = (S.questResults || [])[i];
        if ((r && r.statut) || (S.quests || []).some((q) => q.variante)) break;
        if (!(await askConfirm('Remplacer cette énigme par une énigme d’un autre type ? Tu ne pourras le faire qu’une fois aujourd’hui.', 'Changer'))) break;
        try { localStorage.setItem(cleReroll(), String(i)); } catch (e) { /* pas de stockage */ }
        loadQuest(); S.questPick = null; rerender(); break;
      }
      case 'quest-bonus': await saveQuestBonus(el.dataset.v); break;
      case 'bonus-changer': S.bonusChanger = true; rerender(); break;
      case 'bonus-sheet': S.bonusChanger = false; S.bonusSheetFerme = true; rerender(); break;
      case 'alt-vue': S.altVue = el.dataset.v || null; rerender(); break;
      case 'quiz-start': {
        if ((S.questResults || []).some((r) => r && r.statut)) break;
        if (!(await askConfirm('Lancer le quiz express ? Un seul essai, et les énigmes du jour se ferment.', 'C\u2019est parti'))) break;
        demarrerQuiz(); S.altVue = null; rerender(); window.scrollTo(0, 0); break;
      }
      case 'quiz-rep': repondreQuiz(Number(el.dataset.v)); rerender(); break;
      case 'quiz-suivante': if (suivanteQuiz()) await enregistrerQuiz(); rerender(); break;
      case 'quiz-enregistrer': await enregistrerQuiz(); rerender(); break;
      case 'quiz-bonus': await saveQuizBonus(el.dataset.v); break;
      case 'delegue-changer': S.delegueChanger = true; rerender(); break;
      case 'quest-delegue': await saveDelegue(el.dataset.v); break;
      case 'gazette-rapport': S.showRapport = true; S.rapportIdx = 0; location.hash = '#hp'; break;
      case 'gazette-nav': if (Number(el.dataset.d) > 0) chargerArchivesGazette();
        S.gazetteIndex = Math.max(0, Math.min(S.gazettes.length - 1, S.gazetteIndex + Number(el.dataset.d))); render(); break;
      case 'admin-create': await b.adminCreateGame(); toast('Partie lancée !'); break;
      case 'equipe-edit': S.equipeEdit = el.dataset.role || null; S.ouverts = { ...(S.ouverts || {}), equipe: true }; rerender(); break;
      case 'equipe-origine': {
        const noms = { ...((S.player && S.player.equipeNoms) || {}), [el.dataset.role]: null };
        await b.savePlayer(S.user.uid, { ...(S.player || {}), equipeNoms: noms });
        S.player = { ...(S.player || {}), equipeNoms: noms }; S.equipeEdit = null;
        toast('Nom d’origine rétabli.'); rerender(); break;
      }
      case 'dir-reglage': { const r = { ...((S.state.dir && S.state.dir.reglages) || {}), [el.dataset.k]: el.dataset.v }; await b.adminDirecteur({ reglages: r }); toast('Réglage du Directeur enregistré : il s’applique dès la prochaine nuit.'); break; }
      case 'dir-forcer': await b.adminDirecteur({ forcer: el.dataset.id }); toast('Demandé : annoncé à la prochaine nuit, le district le vivra le surlendemain.'); break;
      case 'admin-vus': S.players = await b.getPlayers(); toast('Connexions actualisées.'); rerender(); break;
      case 'admin-fin-saison': { const m = el.dataset.mode || null; await b.adminFinSaison(m); toast(m === 'enquete' ? 'La saison se terminera le soir où l’affaire en cours se clôt.' : m === 'soir' ? 'La saison se termine ce soir à 20:00.' : 'Fin anticipée annulée.'); break; }
      case 'admin-variantes': await b.adminVariantesEcrites(!S.state.variantesEcrites); toast(!S.state.variantesEcrites ? 'Les prochaines affaires écrites pourront tirer une autre version.' : 'Retour au scénario d’origine pour les prochaines affaires écrites.'); break;
      case 'admin-passer-tour': if (await askConfirm(`Passer le tour ${S.state.turn} sans le calculer ? Aucune zone n’avance ce soir.`)) { await b.adminPasserTour(); toast('Tour passé.'); } break;
      case 'admin-force': await b.adminForceResolution(); await tick(true); toast(etatResolution.erreur ? 'Le tour n’a pas pu être résolu (détail en haut de l’écran).' : 'Tour résolu.'); break;
      case 'admin-remove': if (await askConfirm('Retirer ce joueur de la partie ?', 'Retirer')) { await b.adminRemovePlayer(el.dataset.uid); toast('Joueur retiré.'); } break;
      case 'admin-reset': if (await askConfirm('Recommencer la partie ? Toutes les zones repartent de zéro.', 'Recommencer')) { await b.adminReset(); lastTurnKey = null; toast('Nouvelle partie lancée.'); location.hash = '#hp'; } break;
      default: break;
    }
  } catch (err) {
    console.error(err);
    toast(['postuler', 'cand-ok', 'cand-non'].includes(a) ? messageErreur(err, 'prive') : messageErreur(err));
    if (a === 'demo-next' || a === 'postuler') rerender();
  }
}

/** Énigme d'enquête du jour : seulement pendant un vol (les affaires écrites ont leurs propres outils). */
function enigmeEnquete(st) {
  if (!enquetePourTour(st.nextDeadline) || !st.enquete || st.enquetePause) return null;
  const a = affaire(st, st.enquete.n);
  return a && !a.meurtre ? { titre: a.titre } : null;
}

/** Anciens numéros de la Gazette (rapports archivés) : lus seulement quand on remonte le temps, une fois. */
function chargerArchivesGazette() {
  if (S.gazettesArchives || !S.backend.listGazettes) return;
  S.gazettesArchives = true;
  S.backend.listGazettes(10).then((l) => {
    const cle = (g) => `${g.season}_${g.turn}`, deja = new Set((S.gazettes || []).map(cle));
    S.gazettes = [...(S.gazettes || []), ...(l || []).filter((g) => !deja.has(cle(g)))].sort((x, y) => (y.season - x.season) || (y.turn - x.turn));
    rerender();
  }).catch((e) => { console.warn(e); S.gazettesArchives = false; });
}

/** Fenêtre de confirmation intégrée à la page (confirm() n'est pas disponible partout). */
function askConfirm(message, okLabel = 'Confirmer', koLabel = 'Annuler') {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,12,.7);display:flex;align-items:center;justify-content:center;padding:16px;z-index:30';
    wrap.innerHTML = `<div class="card" style="max-width:360px;width:100%"><p style="margin:0;font-size:15px;line-height:1.4">${esc(message)}</p>
      <div class="row"><button class="btn grow" data-c="0">${esc(koLabel)}</button><button class="btn primary grow" data-c="1">${esc(okLabel)}</button></div></div>`;
    const done = (v) => { wrap.remove(); resolve(v); };
    wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { e.stopPropagation(); done(b.dataset.c === '1'); } else if (e.target === wrap) done(false); });
    document.body.appendChild(wrap);
    wrap.querySelector('[data-c="0"]').focus();
  });
}

/** Libère un agent pour un engagement : pris dans le service le plus fourni si personne n'est libre. */
/** Rôles (saison 2) : le service d'où vient un agent selon son rôle, dans l'ordre de préférence. */
const SOURCES_ROLE = { rep: ['recherche'], desc: ['intervention'], bouc: ['roulage', 'proximite'] };
function ajouterRoleND(k, r) {
  const d = S.draft, sect = (d.secteurs ||= {}), roles = (d.roles ||= {});
  const cur = rolesDe(k);
  if ((sect[k] || 0) >= ND.maxParSecteur || agentsND() >= ND.maxTotal) { toast(`Au plus ${ND.maxParSecteur} agents par secteur et ${ND.maxTotal} en tout.`); return false; }
  if (estimations().reste <= 0) {
    const src = SOURCES_ROLE[r].find((x) => d.alloc[x] > 0);
    if (src) d.alloc[src] -= 1; else if (!takeAgent()) return false;
  }
  cur[r] += 1; roles[k] = cur; sect[k] = cur.rep + cur.desc + cur.bouc;
  return true;
}
function retirerRoleND(k, r) {
  const d = S.draft, cur = rolesDe(k);
  if (!cur[r]) return false;
  cur[r] -= 1;
  const n = cur.rep + cur.desc + cur.bouc;
  (d.roles ||= {})[k] = cur; (d.secteurs ||= {})[k] = n;
  if (!n) { delete d.secteurs[k]; delete d.roles[k]; }
  d.alloc[SOURCES_ROLE[r][0]] += 1; // l'agent retourne dans son service
  return true;
}

function takeAgent() {
  if (estimations().reste > 0) return true;
  // On ne vide pas un service sous le minimum demandé ce soir (évasion : 8 en Intervention…) s'il y a une autre source.
  const mins = minimumsDuSoir(myZone()), marge = (x) => S.draft.alloc[x] - (mins[x] || 0);
  const s = SERVICES.slice().sort((x, y) => (marge(y) > 0) - (marge(x) > 0) || S.draft.alloc[y] - S.draft.alloc[x])[0];
  if (S.draft.alloc[s] <= 0) { toast('Plus aucun agent disponible.'); return false; }
  S.draft.alloc[s] -= 1;
  return true;
}

/** Énigme affichée : entraînement, dossier noir ou énigme du jour. */
function questCourante() { return S.questMode === 'train' ? S.train : (S.questIdx || 0) === 3 ? S.noir : questDuSlot(S.questIdx || 0); }

/** Statistiques d'entraînement, gardées sur l'appareil. */
function compterEntrainement(type, ok) {
  let st = {};
  try { st = JSON.parse(localStorage.getItem('mazp-entrainement') || '{}'); } catch (e) { /* rien */ }
  const x = (st[type] ||= { ok: 0, n: 0 }); x.n++; if (ok) x.ok++;
  try { localStorage.setItem('mazp-entrainement', JSON.stringify(st)); } catch (e) { /* rien */ }
  noterEntrainement({ enigmes: 1, reussies: ok ? 1 : 0 });
}

/** Enregistre les ordres du brouillon (comme le bouton Valider). */
async function validerOrdres() {
  const st = S.state;
  await S.backend.saveOrders(S.user.uid, st.season, st.turn, S.draft);
  S.savedOrders = JSON.parse(JSON.stringify(S.draft)); S.ordersDirty = false;
  await annoncerNDAuto();
  await annoncerRenfortAuto();
}

/** Saison 2 — à la validation : la radio F2 annonce les agents prêtés en renfort, pour que la zone qui appelle
 *  (et les autres) voient les places se remplir sur le tableau des appels. Un message seulement si ça change. */
async function annoncerRenfortAuto() {
  const st = S.state, z = myZone(), d = S.draft;
  if (!st || !z || !d || !reglesV2(st) || !S.backend.sendRadio) return;
  let der = null;
  for (const m of S.radio || []) if (m.renfortRep && m.uid === z.uid && m.renfortRep.season === st.season && m.renfortRep.turn === st.turn && (!der || der.at < m.at)) der = m;
  const avant = der ? der.renfortRep : null;
  const cible = d.renfort && d.renfort.agents > 0 ? d.renfort.cible : null, n = cible ? d.renfort.agents : 0;
  if ((avant ? avant.cible : null) === cible && (avant ? avant.agents : 0) === n) return;
  if (!cible && (!avant || !avant.agents)) return;
  const zc = st.zones[cible || avant.cible];
  if (!zc) return;
  const texte = n ? `🤝 ${z.nom} (ZP ${z.code}) prête ${n} agent${n > 1 ? 's' : ''} à ${zc.nom} ce soir.` : `📻 ${z.nom} (ZP ${z.code}) ne prête finalement pas d’agents à ${zc.nom}.`;
  try { await S.backend.sendRadio(S.user.uid, texte, { renfortRep: { season: st.season, turn: st.turn, cible: zc.uid, agents: n } }); } catch (e) { console.warn('Annonce renfort non envoyée', e); }
}

/** À la validation : la radio suit les agents réellement envoyés dans la zone de non-droit, sans bouton à toucher.
 *  Sinon les autres zones ne voyaient pas qu'on y allait (seul notre propre écran l'affichait). */
async function annoncerNDAuto(rattrapage = false) {
  const st = S.state, z = myZone();
  const ordres = rattrapage ? S.savedOrders : S.draft;
  if (!st || !z || !st.nonDroit || !ordres || !S.backend.sendRadio) return;
  const sect = ordres.secteurs || {};
  const cles = new Set([...Object.keys(sect), ...Object.keys(st.nonDroit.secteurs || {})]);
  for (const k of cles) {
    if (!st.nonDroit.secteurs[k]) continue;
    const n = sect[k] || 0, deja = monAnnonceND(k);
    if (n === deja || (rattrapage && !n)) continue;
    const texte = !n
      ? `📻 ${z.nom} (ZP ${z.code}) ne va finalement pas à ${nomSecteur(k)} ce soir.`
      : deja
        ? `🚔 Zone de non-droit : ${z.nom} (ZP ${z.code}) sera finalement à ${nomSecteur(k)} avec ${n} agent${n > 1 ? 's' : ''} ce soir.`
        : `🚔 Zone de non-droit : ${z.nom} (ZP ${z.code}) envoie ${n} agent${n > 1 ? 's' : ''} à ${nomSecteur(k)} ce soir.`;
    const roles = n && rolesActifs() ? rolesDe(k, ordres) : null;
    const texte2 = roles ? `🚔 Zone de non-droit : ${z.nom} (ZP ${z.code}) ${deja ? 'sera finalement' : 'sera ce soir'} à ${nomSecteur(k)} : ${texteRoles(roles)}.` : texte;
    try { await S.backend.sendRadio(S.user.uid, texte2, { nd: { season: st.season, turn: st.turn, secteur: String(k), agents: n, ...(roles ? { roles } : {}) } }); } catch (e) { console.warn('Annonce radio non envoyée', e); }
  }
}

/** Compteurs d'entraînement envoyés au serveur, pour le classement du maître du jeu. */
/** Événement d'actualité : lance son mini-jeu (Challenge) avec le scénario du jour. */
async function lancerActu() {
  try { S.players = await S.backend.getPlayers(); } catch (e) { /* hors ligne */ }
  ouvrirMiniJeu(EVT_ACTU.jeu, { mode: 'train', evt: EVT_ACTU.id, onEntrainement: (x) => { noterEntrainement(x); marquerEvtJoue(); }, onFin: () => rerender() });
}
function noterEntrainement(plus) {
  if (!S.user || !S.backend || !S.backend.compterEntrainement) return;
  // Une seule fois par appareil : on y ajoute les énigmes comptées sur cet appareil avant le classement.
  const att = `mazp-entr-attente-${S.user.uid}`;
  let avant = null;
  try { avant = JSON.parse(localStorage.getItem(att) || 'null'); } catch (e) { /* rien */ }
  const total = { ...plus };
  if (avant) for (const [k, v] of Object.entries(avant)) total[k] = (total[k] || 0) + v;
  S.backend.compterEntrainement(S.user.uid, total)
    .then(() => { if (avant) try { localStorage.removeItem(att); } catch (e) { /* rien */ } })
    .catch((e) => console.warn('Entraînement non compté', e));
}

/** Au chargement : met de côté (une fois) les énigmes déjà comptées sur cet appareil, puis les envoie si le profil existe. */
function reprendreEntrainementLocal() {
  if (!S.user) return;
  try {
    const cle = `mazp-entr-repris-${S.user.uid}`;
    if (!localStorage.getItem(cle)) {
      const st = JSON.parse(localStorage.getItem('mazp-entrainement') || '{}');
      const enigmes = Object.values(st).reduce((a, x) => a + (x.n || 0), 0), reussies = Object.values(st).reduce((a, x) => a + (x.ok || 0), 0);
      localStorage.setItem(cle, '1');
      if (enigmes) localStorage.setItem(`mazp-entr-attente-${S.user.uid}`, JSON.stringify({ enigmes, reussies }));
    }
    if (S.player && localStorage.getItem(`mazp-entr-attente-${S.user.uid}`)) noterEntrainement({});
  } catch (e) { /* stockage indisponible */ }
}

function nouvelEntrainement() {
  const type = S.trainType || 'quiment', diff = S.trainDiff || 3;
  if (type.startsWith('mj:')) { S.train = null; S.trainRes = null; S.questPick = null; return; }
  const fs = formesVisibles() && FORMES[type];
  const forme = fs && fs.some((f) => f.id === S.trainForme) ? S.trainForme : 'classique';
  S.train = { ...generateQuest(type, `train:${S.user.uid}:${Date.now()}:${Math.random()}`, diff, forme), id: `train-${Date.now()}` };
  S.trainRes = null; S.questPick = null;
}

async function submitQuest(reponse) {
  if (reponse == null || reponse === '') return;
  const st = S.state;
  const i = S.questIdx || 0;
  // Entraînement : correction immédiate, rien n'est enregistré dans la partie.
  if (S.questMode === 'train') {
    const q = S.train;
    if (!q || S.trainRes) return;
    const ok = checkAnswer(q, reponse);
    S.trainRes = { ok, reponse: String(reponse).slice(0, 60) };
    compterEntrainement(q.type, ok);
    S.questPick = null; rerender(); return;
  }
  // Dossier noir : 4e emplacement, sans pénalité.
  if (i === 3) {
    const q = S.noir, r = S.noirResult || { statut: null, tentatives: 0 };
    if (!q || r.statut === 'ok' || r.statut === 'rate') return;
    if (!(await askConfirm('Valider ta réponse au dossier noir ? Une seule chance, mais aucune pénalité en cas d\u2019erreur.', 'Valider'))) return;
    const ok = checkAnswer(q, reponse);
    S.noirResult = { ...r, tentatives: 1, statut: ok ? 'ok' : 'rate', type: q.type, reponse: String(reponse).slice(0, 60) };
    S.questPick = null;
    await S.backend.saveQuest(S.user.uid, st.season, st.turn, 3, S.noirResult);
    toast(ok ? 'Dossier noir résolu. Chapeau !' : 'Raté, sans conséquence.');
    rerender(); return;
  }
  const q = questDuSlot(i);
  const r = S.questResults[i] || { statut: null, tentatives: 0 };
  if (r.statut === 'ok' || r.statut === 'rate') return;
  // Une seule réponse possible : on demande confirmation, puis c'est définitif.
  if (!(await askConfirm('Valider cette réponse ? Tu n\u2019as qu\u2019une seule chance.', 'Valider'))) return;
  const ok = checkAnswer(q, reponse);
  S.questResults[i] = { ...r, tentatives: 1, statut: ok ? 'ok' : 'rate', type: q.type, reponse: String(reponse).slice(0, 60), ...(q.variante ? { variante: 1 } : {}), ...(q.enquete ? { enquete: 1 } : {}) };
  S.questPick = null;
  await S.backend.saveQuest(S.user.uid, st.season, st.turn, i, S.questResults[i]);
  toast(ok ? 'Bonne réponse !' : 'Mauvaise réponse.');
  const suivante = slotsJour().find((k) => { const x = S.questResults[k]; return !x || (x.statut !== 'ok' && x.statut !== 'rate'); }) ?? -1;
  S.questNext = suivante;
  rerender();
}

/** Énigmes du jour confiées à un agent (aucune réponse donnée) : enregistré sur l'énigme 1, définitif pour la journée. */
async function saveDelegue(bonus, service) {
  const st = S.state;
  if ((S.questResults || []).some((r) => r && (r.statut === 'ok' || r.statut === 'rate'))) return;
  const deja = (S.questResults || [])[0];
  const dejaDelegue = !!(deja && deja.statut === 'delegue');
  if (!dejaDelegue && !(await askConfirm('Confier les énigmes du jour à un agent ? Tu ne pourras plus y répondre aujourd\u2019hui.', 'Confier'))) return;
  const data = { statut: 'delegue', tentatives: 0, bonus, service: service || null };
  try { await S.backend.saveQuest(S.user.uid, st.season, st.turn, 0, data); }
  catch (e) { console.warn(e); toast('Enregistrement impossible. Réessaie.'); return; }
  S.questResults[0] = data; S.questIdx = 0; S.altVue = null; S.delegueChanger = false;
  toast(dejaDelegue ? 'Bonus visé modifié.' : 'Énigmes confiées. Verdict ce soir à 20:00.');
  rerender();
}

/** Résultat du quiz express : sur l'énigme 1, bonnes réponses dans « tentatives » (non modifiable ensuite). */
async function enregistrerQuiz() {
  const st = S.state, p = quizLocal();
  if (!p || (S.questResults[0] && S.questResults[0].statut)) return;
  const data = { statut: 'quiz', tentatives: bonnesReponses(p), bonus: null, service: null };
  try { await S.backend.saveQuest(S.user.uid, st.season, st.turn, 0, data); S.questResults[0] = data; arreterMinuteur(); }
  catch (e) { console.warn(e); toast('Résultat non enregistré. Réessaie.'); }
}
async function saveQuizBonus(bonus, service) {
  const st = S.state, r = S.questResults[0];
  if (!r || r.statut !== 'quiz') return;
  const data = { ...r, bonus, service: service || null };
  try { await S.backend.saveQuest(S.user.uid, st.season, st.turn, 0, data); S.questResults[0] = data; S.bonusChanger = false; toast('Bonus enregistré. Tu peux encore le changer jusqu’à 20:00.'); }
  catch (e) { console.warn(e); toast('Enregistrement impossible. Réessaie.'); }
  rerender();
}

async function saveQuestBonus(bonus, service) {
  const st = S.state;
  // Le bonus est enregistré sur la dernière énigme réussie.
  const i = S.questResults.map((r, k) => (r && r.statut === 'ok' ? k : -1)).filter((k) => k >= 0).pop();
  if (i === undefined) return;
  // Un seul bonus par jour : on retire un éventuel choix précédent posé sur une autre énigme.
  for (let k = 0; k < S.questResults.length; k++) {
    const r = S.questResults[k];
    if (k !== i && r && r.bonus) { const { bonus: _b, service: _s, ...reste } = r; S.questResults[k] = reste; await S.backend.saveQuest(S.user.uid, st.season, st.turn, k, { ...reste, bonus: null, service: null }); }
  }
  const { service: _ancien, ...base } = S.questResults[i];
  S.questResults[i] = { ...base, bonus, ...(service ? { service } : {}) };
  await S.backend.saveQuest(S.user.uid, st.season, st.turn, i, { ...S.questResults[i], ...(service ? {} : { service: null }) });
  S.bonusChanger = false;
  toast('Bonus enregistré. Tu peux encore le changer jusqu’à 20:00.');
  rerender();
}

async function onSubmit(e) {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const b = S.backend;
  const kind = form.dataset.form;
  try {
    if (kind === 'login') {
      const mode = e.submitter ? e.submitter.value : 'login';
      const email = form.email.value.trim(), pw = form.password.value;
      if (mode === 'signup') await b.signUpEmail(email, pw); else await b.signInEmail(email, pw);
    } else if (kind === 'signup') {
      const code = form.code.value.trim(), nom = form.nom.value.trim();
      if (!/^\d{4}$/.test(code)) { toast('Le code doit comporter 4 chiffres.'); return; }
      if (!nom) { toast('Donne un nom à ta zone.'); return; }
      if (codeDejaPris(S.state, code, S.user.uid)) { toast(MSG_CODE_PRIS(code)); return; }
      const couleur = (S.signup && S.signup.couleur) || COULEURS_ZONE[0];
      const pseudo = (form.pseudo ? form.pseudo.value.trim() : '').slice(0, 24);
      if (!pseudo) { toast('Indique ton prénom ou ton pseudo.'); return; }
      const profile = { code, nom: nom.slice(0, 24), couleur, pseudo };
      await b.savePlayer(S.user.uid, profile);
      S.player = profile;
      await b.joinGame(S.user.uid, profile);
      S.players = await b.getPlayers();
      if (b.mode !== 'demo') await openParty(b.gameId());
      toast('Bienvenue au District Delta !');
    } else if (kind === 'party-create') {
      const nom = form.nom.value.trim();
      if (!nom) return;
      const id = await b.createParty(S.user.uid, nom);
      S.parties = await b.listMyParties(S.user.uid);
      await openParty(id); location.hash = '#hp';
      toast('Partie créée ! Partage son code avec tes collègues.');
    } else if (kind === 'party-join') {
      const id = await b.joinByCode(S.user.uid, form.code.value);
      S.parties = await b.listMyParties(S.user.uid);
      await openParty(id); location.hash = '#hp';
    } else if (kind === 'rename' || kind === 'profil') {
      const z = myZone();
	const champ = (n) => { const el = form.elements.namedItem(n); return el && typeof el.value === 'string' ? el.value : null; };
	const nom = String(champ('nom') ?? z.nom ?? '').trim().slice(0, 24);
	const code = String(champ('code') ?? z.code ?? '').trim();
      if (!nom || !/^\d{4}$/.test(code)) { toast('Nom requis et code à 4 chiffres.'); return; }
      if (code !== String(z.code || '') && codeDejaPris(S.state, code, S.user.uid)) { toast(MSG_CODE_PRIS(code)); return; }
      const pseudo = String(champ('pseudo') ?? (S.player && S.player.pseudo) ?? '').trim().slice(0, 24);
      const profile = { code, nom, couleur: S.profilColor || z.couleur, pseudo };
      await b.savePlayer(S.user.uid, profile);
      S.player = { ...(S.player || {}), ...profile };
      z.nom = nom; z.code = code; z.couleur = profile.couleur;
      S.players = { ...(S.players || {}), [S.user.uid]: { ...((S.players || {})[S.user.uid] || {}), ...profile } };
      S.editingName = false; S.profilColor = null;
      toast(kind === 'rename' ? 'Zone renommée.' : 'Profil enregistré.');
      rerender();
    } else if (kind === 'equipe-nom') {
      const role = form.dataset.role;
      const prenom = form.prenom.value.replace(/[<>]/g, '').trim().slice(0, 20), nom = form.nom.value.replace(/[<>]/g, '').trim().slice(0, 20);
      if (!prenom || !nom) { toast('Prénom et nom requis.'); return; }
      const noms = { ...((S.player && S.player.equipeNoms) || {}), [role]: { prenom, nom, f: form.f.value === '1' ? 1 : 0 } };
      await b.savePlayer(S.user.uid, { ...(S.player || {}), equipeNoms: noms });
      S.player = { ...(S.player || {}), equipeNoms: noms }; S.equipeEdit = null;
      toast(`${prenom} ${nom} rejoint ton équipe. La Gazette et les rapports suivront dès 20:00.`); rerender();
    } else if (kind === 'quest-text') {
      await submitQuest(form.reponse.value);
    } else if (kind === 'radio') {
      const texte = form.texte.value.trim();
      if (!texte) return;
      await b.sendRadio(S.user.uid, texte, { canal: form.dataset.canal === 'ops' ? 'ops' : 'parole' });
      form.texte.value = '';
    } else if (kind === 'prive') {
      const texte = form.texte.value.trim();
      if (!texte || !S.priveAvec) return;
      await b.sendPrive(S.user.uid, S.priveAvec, texte);
      form.texte.value = '';
      rerender();
      const i = document.getElementById('prive-msg'); if (i) i.focus();
    }
  } catch (err) {
    console.error(err);
    toast(messageErreur(err, form && form.dataset.form === 'prive' ? 'prive' : ''));
  }
}

let rechercheGuide = null;
function onInput(e) {
  if (e.target.id === 'guide-q') {
    // Recherche dans le guide : on attend une courte pause de frappe avant de tout redessiner.
    S.guideQuery = e.target.value;
    clearTimeout(rechercheGuide);
    rechercheGuide = setTimeout(() => {
      S.keepScrollGuide = true; S.guideSection = null;
      render();
      const i = document.getElementById('guide-q');
      if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
      S.keepScrollGuide = false;
    }, 150);
    return;
  }
  if (e.target.dataset && e.target.dataset.qnote !== undefined) {
    try { localStorage.setItem(`mazp-qnote-${e.target.dataset.qnote}`, JSON.stringify(e.target.value)); } catch { /* stockage indisponible */ }
    return;
  }
  if (e.target.dataset && e.target.dataset.notes) {
    const n = Number(e.target.dataset.notes), c = lireCarnet(n);
    c.notes = e.target.value; ecrireCarnet(n, c); return;
  }
  const sl = e.target.closest('[data-slider]');
  if (!sl) return;
  const s = sl.dataset.slider;
  S.draft.alloc[s] = Number(sl.value);
  const reste = estimations().resteBase;
  if (reste < 0) { S.draft.alloc[s] = Math.max(0, S.draft.alloc[s] + reste); sl.value = S.draft.alloc[s]; }
  S.ordersDirty = true;
  if (S.savedOrders) {
    const btnZone = document.querySelector('.card.green');
    if (btnZone) { rerender(); return; }
  }
  updateOrdresLive();
}

async function onChange(e) {
  if (e.target.id === 'import-file' && e.target.files && e.target.files[0]) {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!data || !data.state || !data.state.zones) throw new Error('Ce fichier n\u2019est pas une sauvegarde de Ma ZP.');
      if (await askConfirm(`Restaurer la sauvegarde (saison ${data.state.season}, tour ${data.state.turn}) ? L\u2019état actuel sera remplacé.`, 'Restaurer')) {
        await S.backend.adminImport(data); lastTurnKey = null; toast('Sauvegarde restaurée.');
      }
    } catch (err) { toast(messageErreur(err)); }
    e.target.value = '';
    return;
  }
  const el = e.target.closest('[data-change]');
  if (!el) return;
  if (el.dataset.change === 'partner') {
    const eg = S.draft.engagements[el.dataset.id];
    if (eg) eg.partenaire = el.value || null;
    S.ordersDirty = true; rerender();
  }
  if (el.dataset.change === 'vente-partenaire' && S.draft) { const k = el.dataset.k; S.draft.finales = { ...(S.draft.finales || {}) }; const f = { ...(S.draft.finales[k] || {}) }; if (el.value) f.partenaire = el.value; else delete f.partenaire; if (f.montant) S.draft.finales[k] = f; else toast('Fixe d’abord ton offre, puis choisis ton partenaire.'); S.ordersDirty = true; rerender(); }
  if (el.dataset.change === 'chef-service' && S.draft) { S.draft.agenda = { type: 'terrain', service: el.value }; S.ordersDirty = true; rerender(); }
  if (el.dataset.change === 'chef-voisin' && S.draft) { S.draft.agenda = { type: 'voisin', zone: el.value || null }; S.ordersDirty = true; rerender(); }
  if (el.dataset.change === 'chef-parrainer' && S.draft) { S.draft.parrainer = el.value || null; S.ordersDirty = true; rerender(); }
  if (el.dataset.change === 'demolir' && S.draft) { S.draft.demolir = el.value || null; S.ordersDirty = true; rerender(); }
  if (el.dataset.change === 'piste-cible') { cibler(el.dataset.k, el.value); S.ordersDirty = true; rerender(); }
  if (el.dataset.change === 'train-type') { S.trainType = el.value; nouvelEntrainement(); rerender(); }
  if (el.dataset.change === 'quest-capacite' && el.value) await saveQuestBonus('capacite', el.value);
  if (el.dataset.change === 'quest-delegue-capacite' && el.value) await saveDelegue('capacite', el.value);
  if (el.dataset.change === 'quiz-capacite' && el.value) await saveQuizBonus('capacite', el.value);
  if ((el.dataset.change === 'tab-route-a' || el.dataset.change === 'tab-route-b') && S.state && S.state.enquete) {
    const r = S.tabRoute && S.tabRoute.n === S.state.enquete.n ? S.tabRoute : { n: S.state.enquete.n, a: null, b: null, mode: 'moteur' };
    S.tabRoute = { ...r, [el.dataset.change.slice(-1)]: el.value || null };
    if (!S.tabRoute.a || !S.tabRoute.b) S.tabRoute = { ...S.tabRoute };
    rerender();
  }
  if (el.dataset.change === 'partage-zone' && el.value) {
    const p = (S.draft.partages ||= []);
    if (p.length < 3) p.push({ f: el.dataset.f, a: el.value });
    S.ordersDirty = true; rerender();
  }
  if (el.dataset.change === 'fipa-invite') {
    const f = (S.state.fipas || []).find((x) => x.id === el.dataset.id);
    if (f) {
      const o = S.draft.fipa && S.draft.fipa.id === f.id ? S.draft.fipa : { id: f.id, invite: '', moi: Math.ceil(f.besoin / 2), lui: Math.floor(f.besoin / 2) };
      o.invite = el.value; S.draft.fipa = o; S.ordersDirty = true; rerender();
    }
  }
  if (el.dataset.change === 'dep-service') { S.draft.depenses.reserveService = el.value; S.ordersDirty = true; rerender(); }
}

function messageErreur(err, contexte = '') {
  if (contexte === 'prive' && String((err && (err.code || err.message)) || '').includes('permission')) return 'Message privé refusé par la base de données : les règles Firestore de la partie ne sont sans doute pas à jour (le maître du jeu doit les recopier dans la console Firebase).';
  const c = err && err.code ? String(err.code) : '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Adresse e-mail ou mot de passe incorrect.';
  if (c.includes('email-already-in-use')) return 'Un compte existe déjà avec cette adresse : connecte-toi.';
  if (c.includes('weak-password')) return 'Mot de passe trop court (6 caractères minimum).';
  if (c.includes('popup')) return 'Fenêtre de connexion fermée ou bloquée.';
  if (c.includes('permission-denied')) return 'Action refusée : l’heure limite est peut-être passée. Recharge la page.';
  if (c.includes('unavailable') || c.includes('network')) return 'Pas de connexion. Réessaie dans un instant.';
  return (err && err.message) || 'Une erreur est survenue.';
}

// ───────── Démarrage ─────────
async function boot() {
  window.__mazpBoot = true; // les modules sont chargés : le filet de sécurité de index.html se retire
  installerGazetteStories();
  installerEuros(document.body); // le moteur compte en k€ : tout ce qui s'affiche est converti en euros
  installerInvitationAppli(); // bandeau « installe Ma ZP » (iPhone et Android), seulement hors appli installée
  loading('Connexion au central…', 18);
  S.config = CONFIG;
  S.invitation = lireInvitationUrl();
  S.route = route();
  try {
    S.backend = await createBackend(CONFIG);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<main class="center-screen"><h1 class="brand">Ma ZP</h1><div class="card red"><h2 class="card-title">Connexion impossible</h2><p class="small" style="margin:0">Le jeu n’a pas pu joindre le serveur. Vérifie ta connexion puis recharge la page.</p></div></main>`;
    return;
  }
  S.user = await S.backend.init();
  S.backend.onAuth((u) => {
    const changed = (u && u.uid) !== (S.user && S.user.uid);
    S.user = u;
    if (changed) afterAuth();
  });
  document.addEventListener('click', onClick);
  installerAntiTriche();
  installerCadenas();
  installerEnigmes();
  document.addEventListener('mazp:rerender', () => rerender());
  // Sections repliables : on se souvient de celles qui sont ouvertes.
  // (seulement quand le joueur clique : un <details> affiché ouvert déclenche aussi « toggle »)
  let clicResume = 0;
  document.addEventListener('click', (e) => { if (e.target.closest('summary')) clicResume = Date.now(); }, true);
  document.addEventListener('toggle', (e) => { const d = e.target; if (d && d.tagName === 'DETAILS' && d.dataset.k && Date.now() - clicResume < 800) S.ouverts = { ...(S.ouverts || {}), [d.dataset.k]: d.open }; }, true);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  window.addEventListener('mazp-quiz-temps', () => { if (S.route === 'quete') { repondreQuiz(-1); rerender(); } });
  window.addEventListener('hashchange', () => { S.menuHp = false; S.route = route(); if (S.route !== 'prive') S.priveAvec = null; window.scrollTo(0, 0); render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastTick = 0; tick(); } });
  setInterval(() => {
    const el = document.getElementById('countdown');
    if (el && S.state) el.textContent = formatCountdown(S.state.nextDeadline - Date.now());
    const ciel = el && el.closest('.soir');
    if (ciel && new Date().getSeconds() === 0) { const c = cielDuMoment(); ciel.style.setProperty('--crep', c.crep); ciel.style.setProperty('--nuit', c.nuit); }
    // Incidents du jour : comptes à rebours, et HP redessinée quand un incident tombe ou se ferme.
    if (S.state && S.user && myZone()) {
      majComptesIncidents();
      const sig = signatureIncidents();
      if (S.sigIncidents !== undefined && sig !== S.sigIncidents && S.route === 'hp' && !document.querySelector('.mj-wrap, .aide-wrap') && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) rerender();
      S.sigIncidents = sig;
    }
    if (S.state && Date.now() >= S.state.nextDeadline) tick();
  }, 1000);
  setInterval(tick, 60000);
  await afterAuth();

  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (e) { console.warn('Service worker non installé', e); }
  }
}

boot();
