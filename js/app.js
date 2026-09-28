// Point d'entrée de l'application « Ma ZP ».
import { CONFIG } from './config.js';
import { createBackend } from './data/backend.js';
import { resolvePending } from './data/resolver.js';
import { S, toast, myZone, esc } from './ui/common.js';
import { renderLogin, renderInscription } from './ui/auth.js';
import { renderHP, renderProfil } from './ui/hp.js';
import { renderOrdres, initDraft, updateOrdresLive, estimations } from './ui/ordres.js';
import { renderQuete } from './ui/quete.js';
import { renderGuide } from './ui/guide.js';
import { renderDiplomatie } from './ui/diplomatie.js';
import { renderParties } from './ui/parties.js';
import { renderEnquete, lireCarnet, ecrireCarnet } from './ui/enquete.js';
import { genererAffaire } from './engine/enquete.js';
import { renderCarte, renderRadio } from './ui/carte.js';
import { renderGazette, renderClassement, renderAdmin } from './ui/gazette.js';
import { questsFor, checkAnswer } from './quests/quests.js';
import { formatCountdown, weekdayBe } from './engine/time.js';
import { SERVICES, COULEURS_ZONE, SERVICE_LABELS } from './engine/constants.js';
import { migrateState, isOutdated } from './engine/resolve.js';

const app = document.getElementById('app');
const ROUTES = ['hp', 'ordres', 'enquete', 'guide', 'diplomatie', 'parties', 'quete', 'carte', 'radio', 'gazette', 'classement', 'profil', 'admin'];
let unsubState = null, unsubRadio = null, lastTurnKey = null;

function route() {
  const h = (location.hash || '#hp').slice(1);
  if (h.startsWith('guide')) { S.guideSection = h.split('-')[1] || null; return 'guide'; }
  return ROUTES.includes(h) ? h : 'hp';
}

function loading(msg = 'Chargement…') {
  app.innerHTML = `<main class="center-screen" aria-busy="true"><h1 class="brand">Ma ZP</h1><p class="sub">${esc(msg)}</p></main>`;
}

function render() {
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
    if (S.player) { loading('Création de ta zone…'); ensureZone(); return; }
    html = renderInscription({ gameExists: true });
  } else {
    if (!S.draft) initDraft();
    if (!S.quests) loadQuest();
    switch (S.route) {
      case 'ordres': html = renderOrdres(); break;
      case 'quete': html = renderQuete(); break;
      case 'enquete': html = renderEnquete(); break;
      case 'guide': html = renderGuide(); break;
      case 'diplomatie': html = renderDiplomatie(); break;
      case 'carte': html = renderCarte(); break;
      case 'radio': html = renderRadio(); S.radioSeen = S.radio.length; break;
      case 'gazette': html = renderGazette(); break;
      case 'classement': html = renderClassement(); break;
      case 'profil': html = renderProfil(); break;
      case 'admin': html = S.backend.isMaster(S.user) ? renderAdmin() : renderHP(); break;
      default: html = renderHP();
    }
  }
  // Barre de validation commune à tous les écrans quand des choix ne sont pas encore validés.
  if (S.ordersDirty && S.state && myZone() && !['parties', 'guide'].includes(S.route)) {
    html += `<div class="savebar" role="status"><span class="small" style="font-weight:600">Modifications non validées</span><button class="btn primary small" data-action="save-orders">Valider</button></div>`;
  }
  const scroll = window.scrollY;
  app.innerHTML = banner + html;
  if (S.keepScroll) window.scrollTo(0, scroll);
  S.keepScroll = false;
  if (S.route === 'guide' && S.guideSection && !S.keepScrollGuide) { const g = document.getElementById(`g-${S.guideSection}`); if (g) g.scrollIntoView({ block: 'start' }); }
  if (S.route === 'radio') { const l = document.getElementById('radio-list'); if (l && l.lastElementChild) l.lastElementChild.scrollIntoView({ block: 'nearest' }); }
}

const rerender = () => { S.keepScroll = true; render(); };

async function ensureZone() {
  if (S.joining) return;
  S.joining = true;
  try { await S.backend.joinGame(S.user.uid, S.player); }
  catch (e) { toast(e.message || 'Impossible de créer la zone.'); }
  finally { S.joining = false; }
}

function loadQuest() {
  const st = S.state;
  S.quests = questsFor({ seed: CONFIG.seed, uid: S.user.uid, season: st.season, turn: st.turn, weekday: weekdayBe(st.nextDeadline) });
}

async function loadTurnData() {
  const st = S.state, uid = S.user.uid;
  if (!st || !st.zones[uid]) return;
  const key = `${st.season}-${st.turn}`;
  if (key === lastTurnKey) return;
  const isNew = lastTurnKey !== null;
  lastTurnKey = key;
  const [orders, quest, gazettes] = await Promise.all([
    S.backend.getOrders(uid, st.season, st.turn),
    S.backend.getQuests(uid, st.season, st.turn),
    S.backend.listGazettes(10),
  ]);
  S.savedOrders = orders; S.ordersDirty = false; S.draft = null; S.decisionOpen = false;
  S.questResults = quest || [null, null, null]; S.quests = null; S.questPick = null;
  S.questIdx = Math.max(0, (S.questResults || []).findIndex((r) => !r || (r.statut !== 'ok' && r.statut !== 'rate')));
  S.gazettes = gazettes; S.gazetteIndex = 0;
  if (isNew) toast(`Tour ${st.turn} : la Gazette est parue !`);
  render();
}

async function afterAuth() {
  if (!S.user) { if (unsubState) unsubState(); unsubState = null; S.state = undefined; lastTurnKey = null; render(); return; }
  try { S.parties = await S.backend.listMyParties(S.user.uid); } catch (e) { console.warn(e); S.parties = []; }
  let id = null;
  try { id = localStorage.getItem(`mazp-partie-${S.user.uid}`); } catch (e) { /* stockage indisponible */ }
  if (!S.parties.some((p) => p.id === id)) id = S.parties[0] ? S.parties[0].id : null;
  if (!id) { S.noParty = true; S.state = null; render(); return; }
  await openParty(id);
}

/** Ouvre une partie : on se désabonne de l'ancienne et on recharge tout. */
async function openParty(id) {
  if (unsubState) unsubState();
  if (unsubRadio) unsubRadio();
  unsubState = null; unsubRadio = null;
  Object.assign(S, { noParty: false, state: undefined, draft: null, quests: null, savedOrders: null, ordersDirty: false, gazettes: [], radio: [], radioSeen: 0, signup: null, questResults: [null, null, null] });
  lastTurnKey = null;
  render();
  S.partie = await S.backend.useGame(id);
  try { localStorage.setItem(`mazp-partie-${S.user.uid}`, id); } catch (e) { /* stockage indisponible */ }
  try { S.player = await S.backend.getPlayer(S.user.uid); } catch (e) { S.player = null; }
  try { S.players = await S.backend.getPlayers(); } catch (e) { S.players = {}; }
  if (!unsubState) {
    unsubState = S.backend.subscribeState(async (state) => {
      S.state = migrateState(state);
      if (state && S.user && state.zones[S.user.uid]) await loadTurnData();
      render();
    });
  }
  if (!unsubRadio) unsubRadio = S.backend.subscribeRadio((msgs) => { S.radio = msgs; if (S.route === 'radio') rerender(); });
  render();
  tick(true);
}

let lastTick = 0;
async function tick(force = false) {
  if (!S.user || !S.state) return;
  if (!force && Date.now() - lastTick < 15000) return;
  lastTick = Date.now();
  try {
    const n = await resolvePending(S.backend, { hour: CONFIG.resolutionHour });
    if (n > 0) S.players = await S.backend.getPlayers();
  } catch (e) { console.warn(e); }
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
      case 'nuit-ok': {
        const z = myZone();
        const k = `mazp-nuit-${b.gameId ? b.gameId() : ''}-${S.state.season}-${S.state.turn}-${z.uid}`;
        S.nuitVue = k; try { localStorage.setItem(k, '1'); } catch (e2) { /* rien */ }
        rerender(); break;
      }
      case 'party-open': await openParty(el.dataset.id); location.hash = '#hp'; break;
      case 'reload': location.reload(); break;
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
      case 'toggle-rapport': S.showRapport = !S.showRapport; rerender(); break;
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
        const cur = S.draft.engagements[id] || { agents: 0, partenaire: null };
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
      case 'dep-toggle': {
        const dd = (S.draft.depenses ||= { reserve: 0, reserveService: 'intervention' });
        dd[el.dataset.k] = !dd[el.dataset.k]; S.ordersDirty = true; rerender(); break;
      }
      case 'enq-tab': S.enqTab = el.dataset.t; rerender(); break;
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
        const aff = genererAffaire(S.state.seed, S.state.enquete.n);
        const s = aff.suspects[Number(el.dataset.i)];
        if (await askConfirm(`Accuser ${s.nom} ? L’accusation part au parquet à 20:00. Une seule accusation par affaire : si tu te trompes, tu es écarté de l’affaire.`, 'Accuser')) {
          S.draft.accusation = Number(el.dataset.i); S.ordersDirty = true; rerender();
        }
        break;
      }
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
      case 'ord-open': S.ordOpen = { ...(S.ordOpen || {}), [el.dataset.k]: !(S.ordOpen && S.ordOpen[el.dataset.k]) }; rerender(); break;
      case 'toggle-decision': S.decisionOpen = !S.decisionOpen; rerender(); break;
      case 'decision': S.draft.decision = JSON.parse(el.dataset.json); S.ordOpen = { ...(S.ordOpen || {}), decision: false }; S.ordersDirty = true; rerender(); break;
      case 'save-orders': {
        const st = S.state;
        await b.saveOrders(S.user.uid, st.season, st.turn, S.draft);
        S.savedOrders = JSON.parse(JSON.stringify(S.draft)); S.ordersDirty = false;
        toast('C’est validé ! Tu peux encore modifier jusqu’à 20:00.'); rerender(); break;
      }
      case 'quest-pick': S.questPick = el.dataset.v; rerender(); break;
      case 'quest-tab': S.questIdx = Number(el.dataset.i); S.questPick = null; render(); break;
      case 'roue': { const id = S.quests[S.questIdx || 0].id; S.roue = { ...(S.roue || {}), [id]: ((S.roue || {})[id] || 0) + Number(el.dataset.d) }; rerender(); break; }
      case 'grille-mark': case 'grille-reset': {
        const q = S.quests[S.questIdx || 0];
        const m = { ...((S.grilleMarks || {})[q.id] || {}) };
        if (el.dataset.action === 'grille-reset') Object.keys(m).forEach((k) => delete m[k]);
        else { const k = el.dataset.k; m[k] = !m[k] ? '✗' : m[k] === '✗' ? '✓' : ''; if (!m[k]) delete m[k]; }
        S.grilleMarks = { ...(S.grilleMarks || {}), [q.id]: m };
        try { localStorage.setItem(`mazp-grille-${q.id}`, JSON.stringify(m)); } catch { /* stockage indisponible */ }
        rerender(); break;
      }
      case 'quest-submit': await submitQuest(S.questPick); break;
      case 'quest-bonus': await saveQuestBonus(el.dataset.v); break;
      case 'gazette-nav': S.gazetteIndex = Math.max(0, Math.min(S.gazettes.length - 1, S.gazetteIndex + Number(el.dataset.d))); render(); break;
      case 'admin-create': await b.adminCreateGame(); toast('Partie lancée !'); break;
      case 'admin-force': await b.adminForceResolution(); await tick(true); toast('Tour résolu.'); break;
      case 'admin-remove': if (await askConfirm('Retirer ce joueur de la partie ?', 'Retirer')) { await b.adminRemovePlayer(el.dataset.uid); toast('Joueur retiré.'); } break;
      case 'admin-reset': if (await askConfirm('Recommencer la partie ? Toutes les zones repartent de zéro.', 'Recommencer')) { await b.adminReset(); lastTurnKey = null; toast('Nouvelle partie lancée.'); location.hash = '#hp'; } break;
      default: break;
    }
  } catch (err) {
    console.error(err);
    toast(messageErreur(err));
    if (a === 'demo-next') rerender();
  }
}

/** Fenêtre de confirmation intégrée à la page (confirm() n'est pas disponible partout). */
function askConfirm(message, okLabel = 'Confirmer') {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,12,.7);display:flex;align-items:center;justify-content:center;padding:16px;z-index:30';
    wrap.innerHTML = `<div class="card" style="max-width:360px;width:100%"><p style="margin:0;font-size:15px;line-height:1.4">${esc(message)}</p>
      <div class="row"><button class="btn grow" data-c="0">Annuler</button><button class="btn primary grow" data-c="1">${esc(okLabel)}</button></div></div>`;
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

async function submitQuest(reponse) {
  if (reponse == null || reponse === '') return;
  const st = S.state;
  const i = S.questIdx || 0;
  const q = S.quests[i];
  const r = S.questResults[i] || { statut: null, tentatives: 0 };
  if (r.statut === 'ok' || r.statut === 'rate') return;
  // Une seule réponse possible : on demande confirmation, puis c'est définitif.
  if (!(await askConfirm('Valider cette réponse ? Tu n\u2019as qu\u2019une seule chance.', 'Valider'))) return;
  const ok = checkAnswer(q, reponse);
  S.questResults[i] = { ...r, tentatives: 1, statut: ok ? 'ok' : 'rate', type: q.type, reponse: String(reponse).slice(0, 60) };
  S.questPick = null;
  await S.backend.saveQuest(S.user.uid, st.season, st.turn, i, S.questResults[i]);
  toast(ok ? 'Bonne réponse !' : 'Mauvaise réponse.');
  const suivante = S.questResults.findIndex((x) => !x || (x.statut !== 'ok' && x.statut !== 'rate'));
  S.questNext = suivante;
  rerender();
}

async function saveQuestBonus(bonus, service) {
  const st = S.state;
  // Le bonus est enregistré sur la dernière quête réussie.
  const i = S.questResults.map((r, k) => (r && r.statut === 'ok' ? k : -1)).filter((k) => k >= 0).pop();
  if (i === undefined) return;
  S.questResults[i] = { ...S.questResults[i], bonus, ...(service ? { service } : {}) };
  await S.backend.saveQuest(S.user.uid, st.season, st.turn, i, S.questResults[i]);
  toast('Bonus enregistré.');
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
      const nom = form.nom.value.trim().slice(0, 24);
      const code = form.code ? form.code.value.trim() : z.code;
      if (!nom || !/^\d{4}$/.test(code)) { toast('Nom requis et code à 4 chiffres.'); return; }
      const pseudo = form.pseudo ? form.pseudo.value.trim().slice(0, 24) : ((S.player && S.player.pseudo) || '');
      const profile = { code, nom, couleur: S.profilColor || z.couleur, pseudo };
      await b.savePlayer(S.user.uid, profile);
      S.player = { ...(S.player || {}), ...profile };
      z.nom = nom; z.code = code; z.couleur = profile.couleur;
      S.players = { ...(S.players || {}), [S.user.uid]: { ...((S.players || {})[S.user.uid] || {}), ...profile } };
      S.editingName = false; S.profilColor = null;
      toast(kind === 'rename' ? 'Zone renommée.' : 'Profil enregistré.');
      rerender();
    } else if (kind === 'quest-text') {
      await submitQuest(form.reponse.value);
    } else if (kind === 'radio') {
      const texte = form.texte.value.trim();
      if (!texte) return;
      await b.sendRadio(S.user.uid, texte);
      form.texte.value = '';
    }
  } catch (err) {
    console.error(err);
    toast(messageErreur(err));
  }
}

function onInput(e) {
  if (e.target.id === 'guide-q') {
    S.guideQuery = e.target.value; S.keepScrollGuide = true; S.guideSection = null;
    render();
    const i = document.getElementById('guide-q');
    if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    S.keepScrollGuide = false;
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
  const reste = estimations().reste;
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

function messageErreur(err) {
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
  loading();
  S.config = CONFIG;
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
  document.addEventListener('submit', onSubmit);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  window.addEventListener('hashchange', () => { S.route = route(); window.scrollTo(0, 0); render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(true); });
  setInterval(() => {
    const el = document.getElementById('countdown');
    if (el && S.state) el.textContent = formatCountdown(S.state.nextDeadline - Date.now());
    if (S.state && Date.now() >= S.state.nextDeadline) tick();
  }, 1000);
  setInterval(tick, 60000);
  await afterAuth();

  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (e) { console.warn('Service worker non installé', e); }
  }
}

boot();
