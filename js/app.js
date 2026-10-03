// Point d'entrée de l'application « Ma ZP ».
import { CONFIG } from './config.js';
import { installerCadenas } from './ui/cadenas.js';
import { installerEnigmes } from './ui/enigmes.js';
import { createBackend } from './data/backend.js';
import { resolvePending, completerDepuisGazette } from './data/resolver.js';
import { S, toast, myZone, esc, cielDuMoment } from './ui/common.js';
import { renderLogin, renderInscription } from './ui/auth.js';
import { renderHP, renderProfil } from './ui/hp.js';
import { ouvrirAide } from './ui/aide.js';
import { monAppel } from './ui/renfort.js';
import { maCandidature } from './ui/affaires.js';
import { renderTerrain } from './ui/terrain.js';
import { installerAntiTriche } from './ui/antitriche.js';
import { lireInvitationUrl, oublierInvitation, partager, copier, afficherQr } from './ui/invitation.js';
import { ouvrirBudget, ouvrirVehicule, ouvrirLogistique, rafraichirLogistique, ouvrirDecor, ouvrirHpVoisin } from './ui/logistique.js';
import { DECOR, decorDebloque, conditionDecor, decorValide } from './engine/decor.js';
import { cabossesChoisis } from './engine/parc.js';
import { ouvrirNouveautes, nouveautesAuBesoin, noteCourte } from './ui/nouveautes.js';
import { tutoAuBesoin, lancerTuto } from './ui/tutoriel.js';
import { rouletteAuBesoin, lancerRoulette } from './ui/roulette.js';
import { operationActive, effetsOperation } from './engine/zone.js';
import { carteQuartiers } from './engine/quartiers.js';
import { renderPrive, majPastilleRadio } from './ui/prive.js';
import { renderOrdres, initDraft, updateOrdresLive, estimations, agentsHorsServices } from './ui/ordres.js';
import { renderQuete } from './ui/quete.js';
import { renderGuide } from './ui/guide.js';
import { offreApres } from './ui/encheres.js';
import { renderDiplomatie, ongletsRadio } from './ui/diplomatie.js';
import { renderParties } from './ui/parties.js';
import { renderEnquete, lireCarnet, ecrireCarnet, synchroCarnet } from './ui/enquete.js';
import { affaire } from './engine/enquete.js';
import { monterTableau, ouvrirVolet, sortirPiece, completerFiche, remettrePiece, tableauZoom, tableauEnsemble, marquerTutoVu } from './ui/tableau.js';
import { renderCarte, renderRadio } from './ui/carte.js';
import { renderGazette, renderClassement, renderAdmin } from './ui/gazette.js';
import { questsFor, checkAnswer, dossierNoir, generateQuest, QUEST_TYPES } from './quests/quests.js';
import { formatCountdown, weekdayBe } from './engine/time.js';
import { SERVICES, COULEURS_ZONE, SERVICE_LABELS, RENFORT, DEFAULT_ALLOC, ND } from './engine/constants.js';
import { nomSecteur } from './engine/nondroit.js';
import { agentsND } from './ui/nondroit.js';
import { lancerIncident, lancerAppui, ouvrirMiniJeu, majComptesIncidents, signatureIncidents } from './ui/incidents.js';
import { migrateState, isOutdated } from './engine/resolve.js';

const app = document.getElementById('app');
const ROUTES = ['hp', 'ordres', 'enquete', 'guide', 'diplomatie', 'parties', 'quete', 'carte', 'radio', 'prive', 'terrain', 'gazette', 'classement', 'profil', 'admin'];
let unsubState = null, unsubRadio = null, unsubPrive = null, lastTurnKey = null;

function route() {
  const h = (location.hash || '#hp').slice(1);
  if (h.startsWith('guide')) { S.guideSection = h.split('-')[1] || null; return 'guide'; }
  // Lien vers un bloc précis de l'HP (ex. #hp-fipa) : on ouvre l'HP et on y descend.
  if (h.startsWith('hp-')) { S.ancre = h; return 'hp'; }
  // Lien vers un bloc des ordres (ex. #ordres-decision) : on ouvre ce bloc.
  if (h.startsWith('ordres-')) { S.ordOpen = { ...(S.ordOpen || {}), [h.slice(7)]: true }; S.ordAncre = h.slice(7); return 'ordres'; }
  return ROUTES.includes(h) ? h : 'hp';
}

// Chargement avec garde-fou : si rien ne se passe en 20 secondes, on affiche la cause au lieu de tourner sans fin.
let chargementDepuis = 0, garde = null;
function loading(msg = 'Chargement…') {
  const cur = app.querySelector('.loader .loader-msg');
  if (cur) { cur.textContent = msg; return; } // garde l'animation en cours, change seulement le texte
  app.innerHTML = `<main class="center-screen loader" aria-busy="true"><div class="loader-halo" aria-hidden="true"></div><div class="lightbar" aria-hidden="true"><span class="lb-blue"></span><span class="lb-amber"></span></div><h1 class="brand brand-xl">Ma ZP</h1><p class="loader-tag">Gère ta zone · Démasque le coupable</p><div class="loader-bar" aria-hidden="true"><span></span></div><p class="loader-msg" role="status">${esc(msg)}</p></main>`;
  if (!chargementDepuis) chargementDepuis = Date.now();
  clearTimeout(garde);
  garde = setTimeout(() => { if (app.querySelector('[aria-busy="true"]')) bloque(); }, 20000);
}
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
  if (S.state && isOutdated(S.state)) banner += '<div class="demo-banner" role="alert" style="display:flex;gap:10px;align-items:center;justify-content:center">Une nouvelle version du jeu est disponible. <button class="btn small primary" data-action="reload">Mettre à jour</button></div>';
  let html;
  if (!S.user) html = renderLogin();
  else if (S.noParty || S.route === 'parties') html = renderParties();
  else if (S.state === undefined) { loading(); return; }
  else if (!S.state) html = renderInscription({ gameExists: false, isAdmin: S.backend.isMaster(S.user) });
  else if (S.player && S.player.retire) html = `<main class="center-screen"><h1 class="brand">Ma ZP</h1><div class="card"><h2 class="card-title">Tu as été retiré de la partie</h2><p class="small muted" style="margin:0">Contacte le maître du jeu si c’est une erreur.</p></div><button class="btn ghost" data-action="logout">Se déconnecter</button></main>`;
  else if (!myZone()) {
    if (S.player && S.joinErreur) html = `<main class="center-screen"><h1 class="brand">Ma ZP</h1><div class="card"><h2 class="card-title">Ta zone n’a pas pu être créée</h2><p class="small muted" style="margin:0">${esc(S.joinErreur)}</p></div><button class="btn primary" data-action="join-retry">Réessayer</button><a class="btn ghost" href="#parties">Retour aux parties</a></main>`;
    else if (S.player) { loading('Création de ta zone…'); ensureZone(); return; }
    else html = renderInscription({ gameExists: true });
  } else {
    if (!S.draft) initDraft();
    if (!S.quests) loadQuest();
    switch (S.route) {
      case 'ordres': html = renderOrdres(); break;
      case 'quete': html = renderQuete(); break;
      case 'enquete': html = renderEnquete(); break;
      case 'guide': html = renderGuide(); if (S.guideSection === 'debut') { S.premiersPasVus = true; try { localStorage.setItem('mazp-premiers-pas-vus', '1'); } catch (e) { /* pas de stockage */ } } break;
      case 'diplomatie': html = renderDiplomatie(); break;
      case 'carte': html = renderCarte(); break;
      case 'radio': html = renderRadio(); break;
      case 'prive': html = renderPrive(); break;
      case 'terrain': html = renderTerrain(); break;
      case 'gazette': html = renderGazette(); break;
      case 'classement':
        // Lecture de toutes les réponses aux énigmes : seulement sur l'onglet Énigmes, au plus toutes les 5 minutes.
        if (S.classTab === 'enigmes' && (!S.questStatsAt || Date.now() - S.questStatsAt > 300000)) {
          S.questStatsAt = Date.now();
          Promise.resolve(S.backend.listQuestResults ? S.backend.listQuestResults() : [])
            .then((r) => { S.questStats = r; S.questStatsErreur = false; })
            .catch((e) => { console.warn(e); S.questStatsErreur = true; })
            .then(() => { if (S.route === 'classement') rerender(); });
        }
        html = renderClassement(); break;
      case 'profil': html = renderProfil(); break;
      case 'admin': html = S.backend.isMaster(S.user) ? renderAdmin() : renderHP(); break;
      default: html = renderHP();
    }
  }
  // Barre de validation commune à tous les écrans quand des choix ne sont pas encore validés.
  if (S.ordersDirty && S.state && myZone() && !['parties', 'guide'].includes(S.route)) {
    html += `<div class="savebar" role="status"><span class="small" style="font-weight:600">Modifications non validées</span><span class="row" style="gap:6px"><button class="btn ghost small" data-action="cancel-orders">Annuler</button><button class="btn primary small" data-action="save-orders">Valider</button></span></div>`;
  }
  const scroll = window.scrollY;
  app.innerHTML = banner + html;
  if (S.route === 'hp' && S.state && myZone() && !tutoAuBesoin() && !rouletteAuBesoin()) nouveautesAuBesoin();
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
  if (['radio', 'prive', 'diplomatie'].includes(S.route)) {
    const o = document.querySelector('.onglets-flottants');
    if (o) { const t = document.createElement('div'); t.innerHTML = ongletsRadio(S.route); o.replaceWith(t.firstElementChild); }
  }
}
const champActif = (id) => document.activeElement && document.activeElement.id === id && document.activeElement.value;

const rerender = () => { S.keepScroll = true; render(); };

async function ensureZone() {
  if (S.joining || S.joinErreur) return;
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
  S.quests = questsFor({ seed: CONFIG.seed, uid: S.user.uid, season: st.season, turn: st.turn, weekday: weekdayBe(st.nextDeadline), rerolls: [...rerolls].slice(0, 1) });
  S.noir = dossierNoir({ seed: CONFIG.seed, uid: S.user.uid, season: st.season, turn: st.turn });
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
    lire(S.backend.listGazettes(10), [], 'gazettes'),
  ]);
  S.savedOrders = orders; S.ordersDirty = false; S.draft = null; S.decisionOpen = false;
  S.questResults = (quest || [null, null, null]).slice(0, 3); S.noirResult = (quest && quest[3]) || null; S.quests = null; S.questPick = null;
  S.questIdx = Math.max(0, (S.questResults || []).findIndex((r) => !r || (r.statut !== 'ok' && r.statut !== 'rate')));
  // Tri par saison et tour : l'ordre d'écriture dépend de l'horloge de l'appareil qui a calculé le tour.
  S.gazettes = (gazettes || []).slice().sort((x, y) => (y.season - x.season) || (y.turn - x.turn)); S.gazetteIndex = 0; S.rapportIdx = 0;
  completerDepuisGazette(S.state, S.gazettes);
  if (isNew) toast(`Tour ${st.turn} : la Gazette est parue !`);
  render();
}
async function afterAuth() {
  if (!S.user) { if (unsubState) unsubState(); unsubState = null; S.state = undefined; lastTurnKey = null; render(); return; }
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
  Object.assign(S, { noParty: false, state: undefined, draft: null, quests: null, savedOrders: null, ordersDirty: false, gazettes: [], radio: [], prives: [], priveAvec: null, vu: null, signup: null, joinErreur: null, questResults: [null, null, null] });
  lastTurnKey = null;
  const jeton = ++ouvertures; // si le joueur change de partie pendant le chargement, on abandonne celle-ci
  render();
  const partie = await S.backend.useGame(id);
  if (jeton !== ouvertures) return;
  S.partie = partie;
  try { localStorage.setItem(`mazp-partie-${S.user.uid}`, id); } catch (e) { /* stockage indisponible */ }
  let player = null, players = {};
  try { player = await S.backend.getPlayer(S.user.uid); } catch (e) { player = null; }
  try { players = await S.backend.getPlayers(); } catch (e) { players = {}; }
  if (jeton !== ouvertures) return;
  S.player = player; S.players = players;
  reprendreEntrainementLocal();
  if (!unsubState) {
    unsubState = S.backend.subscribeState(async (state) => {
      S.state = migrateState(state);
      if (state && S.user && state.zones[S.user.uid]) { try { await loadTurnData(); } catch (e) { console.error(e); S.lastError = e; } }
      if (S.state) completerDepuisGazette(S.state, S.gazettes);
      render();
    }, (e) => { S.lastError = e; if (S.state === undefined) bloque(e); });
  }
  if (!unsubRadio) unsubRadio = S.backend.subscribeRadio((msgs) => { S.radio = msgs; if (S.route === 'radio') rerender(); else majPastilles(); });
  if (!unsubPrive && S.backend.subscribePrives) unsubPrive = S.backend.subscribePrives(S.user.uid, (msgs) => { S.prives = msgs; if (S.route === 'prive' && !champActif('prive-msg')) rerender(); else majPastilles(); });
  render();
  tick(true);
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
    const n = await resolvePending(S.backend, { hour: CONFIG.resolutionHour, state: force ? null : S.state });
    if (n > 0) { attenteTick = 15000; S.players = await S.backend.getPlayers(); }
    else attenteTick = Math.min(240000, attenteTick * 2);
  } catch (e) { console.warn(e); attenteTick = Math.min(240000, attenteTick * 2); }
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
      case 'diplo-open': { const k = el.dataset.k; const cur = S.diploOpen && k in S.diploOpen ? S.diploOpen[k] : !!document.querySelector(`section[data-k="${k}"]`); S.diploOpen = { ...(S.diploOpen || {}), [k]: !cur }; rerender(); break; }
      case 'aide': ouvrirAide(el.dataset.k); break;
      case 'incident': { const err = lancerIncident(el.dataset.id, () => rerender()); if (err) { toast(err); rerender(); } break; }
      case 'appui-jouer': { const err = lancerAppui(() => rerender()); if (err) { toast(err); rerender(); } break; }
      case 'appui-demande': { const k = el.dataset.k; S.draft.appui = S.draft.appui === k ? null : k; S.ordersDirty = true; rerender(); break; }
      case 'mj-train': ouvrirMiniJeu(el.dataset.j, { mode: 'train', onEntrainement: noterEntrainement }); break;
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
      case 'logistique': ouvrirLogistique(); break;
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
        rerender(); ouvrirLogistique(); break;
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
        if (location.hash !== '#terrain') { location.hash = '#terrain'; await new Promise((ok) => setTimeout(ok, 60)); } else rerender();
        const cible = document.getElementById(`nd-${el.dataset.c}`);
        if (cible) { cible.scrollIntoView({ block: 'center', behavior: 'smooth' }); cible.classList.add('surligne-bloc'); setTimeout(() => cible.classList.remove('surligne-bloc'), 1600); }
        break;
      }
      case 'nd': {
        const k = el.dataset.c, dd = Number(el.dataset.d);
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
        await b.sendRadio(S.user.uid, `🚔 Zone de non-droit : ${z.nom} (ZP ${z.code}) envoie ${n} agent${n > 1 ? 's' : ''} à ${nomSecteur(k)} ce soir. Plus on est nombreux, plus ça tombe vite : qui vient ?`);
        toast('Message envoyé sur la radio.'); rerender(); break;
      }
      case 'quartier': {
        S.quartierSel = el.dataset.c;
        const dansCarte = !!el.closest('svg');
        rerender();
        if (dansCarte) document.getElementById(`q-${el.dataset.c}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        break;
      }
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
        S.signup = { code: f.code.value, nom: f.nom.value, couleur: el.dataset.color }; rerender(); break;
      }
      case 'pick-color-profil': S.profilColor = el.dataset.color; rerender(); break;
      case 'rename': S.editingName = true; rerender(); setTimeout(() => document.getElementById('nom-zone')?.focus(), 0); break;
      case 'toggle-rapport': S.showRapport = !S.showRapport; S.rapportIdx = 0; rerender(); break;
      case 'rapport-nav': S.rapportIdx = Math.max(0, (S.rapportIdx || 0) + Number(el.dataset.d)); rerender(); break;
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
      case 'dep-toggle': {
        const dd = (S.draft.depenses ||= { reserve: 0, reserveService: 'intervention' });
        const zk = S.state.zones[S.user.uid];
        if (el.dataset.k === 'carrosserie' && Array.isArray(dd.carrosserie) && cabossesChoisis(zk, dd.carrosserie).length < (zk.cabosses || []).length) dd.carrosserie = true;
        else dd[el.dataset.k] = !dd[el.dataset.k];
        S.ordersDirty = true;
        if (el.dataset.fermer) toast(dd[el.dataset.k] ? 'Révision prévue ce soir. Valide tes ordres.' : 'Révision annulée.');
        rerender(); if (el.dataset.fermer) ouvrirLogistique(); break;
      }
      case 'class-tab': S.classTab = el.dataset.t; rerender(); break;
      case 'enq-tab': S.enqTab = el.dataset.t; rerender(); break;
      case 'tab-vue': S.enqVue = el.dataset.v; S.tabSheet = null; try { localStorage.setItem('mazp-enq-vue', S.enqVue); } catch (err) { /* pas de stockage */ } window.scrollTo(0, 0); render(); break;
      case 'tab-volet': S.tabSheet = S.tabSheet && S.tabSheet.k === el.dataset.k ? null : { k: el.dataset.k, id: el.dataset.k }; S.tabMode = 'main'; S.tabFrom = null; rerender(); break;
      case 'tab-ouvrir': S.tabMode = 'main'; S.tabFrom = null; ouvrirVolet(el.dataset.tid, rerender); break;
      case 'tab-fermer': S.tabSheet = null; rerender(); break;
      case 'tab-sortir': sortirPiece(el.dataset.f); S.tabSheet = null; rerender(); toast('Glisse la pièce où tu veux sur le tableau.'); break;
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
        S.draft.demarches = dm.includes(k) ? dm.filter((x) => x !== k) : [...dm, k].slice(0, 2);
        S.ordersDirty = true; rerender(); break;
      }
      case 'accuser': {
        const aff = affaire(S.state, S.state.enquete.n);
        const s = aff.suspects[Number(el.dataset.i)];
        if (await askConfirm(`Accuser ${s.nom} ? L’accusation part au parquet à 20:00. Une seule accusation par affaire : si tu te trompes, tu es écarté de l’affaire.`, 'Accuser')) {
          S.draft.accusation = Number(el.dataset.i); S.ordersDirty = true; rerender();
        }
        break;
      }
      case 'piste': { const i = Number(el.dataset.i); S.draft.piste = S.draft.piste === i ? null : i; S.ordersDirty = true; rerender(); break; }
      case 'accuser-annuler': S.draft.accusation = null; S.ordersDirty = true; rerender(); break;
      case 'partage': {
        const p = (S.draft.partages ||= []);
        if (p.length < 3) p.push({ f: el.dataset.f, a: el.dataset.a });
        S.ordersDirty = true; rerender(); break;
      }
      case 'partage-annuler': S.draft.partages = (S.draft.partages || []).filter((p) => p.f !== el.dataset.f); S.ordersDirty = true; rerender(); break;
      case 'traque-planque': {
        const n = Number(el.dataset.n), i = Number(el.dataset.i);
        const ag = S.draft.traque && S.draft.traque.n === n ? S.draft.traque.agents : Math.min(4, S.draft.alloc.intervention || 0);
        S.draft.traque = { n, planque: i, agents: ag }; S.ordersDirty = true; rerender(); break;
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
      case 'duel-rep': S.draft.duelReponse = { id: el.dataset.id, accepte: el.dataset.v === '1' }; S.ordersDirty = true; rerender(); break;
      case 'duel-ind': S.draft.duel = { ...(S.draft.duel || {}), ind: el.dataset.v }; S.ordersDirty = true; rerender(); break;
      case 'aide-n': {
        const ad = (S.draft.aide ||= { cible: '', budget: 0, agents: 0 });
        const k = el.dataset.k, max = k === 'budget' ? 10 : 3;
        ad[k] = Math.max(0, Math.min(max, (ad[k] || 0) + Number(el.dataset.d))); S.ordersDirty = true; rerender(); break;
      }
      case 'man-type': S.draft.manoeuvre = { ...(S.draft.manoeuvre || { cible: '' }), type: el.dataset.v }; S.ordersDirty = true; rerender(); break;
      case 'man-annuler': S.draft.manoeuvre = null; S.ordersDirty = true; rerender(); break;
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
      case 'ventilation': S.ventilation = !S.ventilation; rerender(); break;
      case 'rapatrier': {
        const k = el.dataset.k, d = S.draft;
        const lib = (key) => {
          if (key.startsWith('eng:')) {
            const id = key.slice(4), eg = d.engagements[id];
            if (eg && eg.acceptes && eg.acceptes.length) eg.agents = 0; else delete d.engagements[id];
          } else if (key.startsWith('nd:')) { if (d.secteurs) delete d.secteurs[key.slice(3)]; }
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
      case 'ord-open': S.ordOpen = { ...(S.ordOpen || {}), [el.dataset.k]: !(S.ordOpen && S.ordOpen[el.dataset.k]) }; rerender(); break;
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
        const st = S.state;
        await b.saveOrders(S.user.uid, st.season, st.turn, S.draft);
        S.savedOrders = JSON.parse(JSON.stringify(S.draft)); S.ordersDirty = false;
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
      case 'quest-mode': S.questMode = el.dataset.v; if (S.questMode === 'train' && !S.train) nouvelEntrainement(); S.questPick = null; rerender(); break;
      case 'train-vue': S.trainVue = el.dataset.v; if (S.trainVue === 'enigmes' && !S.train) nouvelEntrainement(); rerender(); window.scrollTo(0, 0); break;
      case 'train-type': S.trainType = el.dataset.v; nouvelEntrainement(); rerender(); break;
      case 'train-diff': S.trainDiff = Number(el.dataset.v); nouvelEntrainement(); rerender(); break;
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
      case 'gazette-nav': S.gazetteIndex = Math.max(0, Math.min(S.gazettes.length - 1, S.gazetteIndex + Number(el.dataset.d))); render(); break;
      case 'admin-create': await b.adminCreateGame(); toast('Partie lancée !'); break;
      case 'equipe-edit': S.equipeEdit = el.dataset.role || null; S.ouverts = { ...(S.ouverts || {}), equipe: true }; rerender(); break;
      case 'equipe-origine': {
        const noms = { ...((S.player && S.player.equipeNoms) || {}), [el.dataset.role]: null };
        await b.savePlayer(S.user.uid, { ...(S.player || {}), equipeNoms: noms });
        S.player = { ...(S.player || {}), equipeNoms: noms }; S.equipeEdit = null;
        toast('Nom d’origine rétabli.'); rerender(); break;
      }
      case 'admin-vus': S.players = await b.getPlayers(); toast('Connexions actualisées.'); rerender(); break;
      case 'admin-force': await b.adminForceResolution(); await tick(true); toast('Tour résolu.'); break;
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
function takeAgent() {
  if (estimations().reste > 0) return true;
  const s = SERVICES.slice().sort((x, y) => S.draft.alloc[y] - S.draft.alloc[x])[0];
  if (S.draft.alloc[s] <= 0) { toast('Plus aucun agent disponible.'); return false; }
  S.draft.alloc[s] -= 1;
  return true;
}

/** Énigme affichée : entraînement, dossier noir ou énigme du jour. */
function questCourante() { return S.questMode === 'train' ? S.train : (S.questIdx || 0) === 3 ? S.noir : S.quests[S.questIdx || 0]; }

/** Statistiques d'entraînement, gardées sur l'appareil. */
function compterEntrainement(type, ok) {
  let st = {};
  try { st = JSON.parse(localStorage.getItem('mazp-entrainement') || '{}'); } catch (e) { /* rien */ }
  const x = (st[type] ||= { ok: 0, n: 0 }); x.n++; if (ok) x.ok++;
  try { localStorage.setItem('mazp-entrainement', JSON.stringify(st)); } catch (e) { /* rien */ }
  noterEntrainement({ enigmes: 1, reussies: ok ? 1 : 0 });
}

/** Compteurs d'entraînement envoyés au serveur, pour le classement du maître du jeu. */
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
  S.train = { ...generateQuest(type, `train:${S.user.uid}:${Date.now()}:${Math.random()}`, diff), id: `train-${Date.now()}` };
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
  const q = S.quests[i];
  const r = S.questResults[i] || { statut: null, tentatives: 0 };
  if (r.statut === 'ok' || r.statut === 'rate') return;
  // Une seule réponse possible : on demande confirmation, puis c'est définitif.
  if (!(await askConfirm('Valider cette réponse ? Tu n\u2019as qu\u2019une seule chance.', 'Valider'))) return;
  const ok = checkAnswer(q, reponse);
  S.questResults[i] = { ...r, tentatives: 1, statut: ok ? 'ok' : 'rate', type: q.type, reponse: String(reponse).slice(0, 60), ...(q.variante ? { variante: 1 } : {}) };
  S.questPick = null;
  await S.backend.saveQuest(S.user.uid, st.season, st.turn, i, S.questResults[i]);
  toast(ok ? 'Bonne réponse !' : 'Mauvaise réponse.');
  const suivante = S.questResults.findIndex((x) => !x || (x.statut !== 'ok' && x.statut !== 'rate'));
  S.questNext = suivante;
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
      await b.sendRadio(S.user.uid, texte);
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
  if (el.dataset.change === 'train-type') { S.trainType = el.value; nouvelEntrainement(); rerender(); }
  if (el.dataset.change === 'quest-capacite' && el.value) await saveQuestBonus('capacite', el.value);
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
  if (el.dataset.change === 'duel-cible') { S.draft.duel = el.value ? { ind: 'satisfaction', ...(S.draft.duel || {}), cible: el.value } : null; S.ordersDirty = true; rerender(); }
  if (el.dataset.change === 'aide-cible') { S.draft.aide = el.value ? { budget: 0, agents: 0, ...(S.draft.aide || {}), cible: el.value } : null; S.ordersDirty = true; rerender(); }
  if (el.dataset.change === 'man-cible') { S.draft.manoeuvre = { ...(S.draft.manoeuvre || {}), cible: el.value }; S.ordersDirty = true; rerender(); }
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
  loading();
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
