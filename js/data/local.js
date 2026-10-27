// MODE DÉMO : toute la partie est stockée sur l'appareil, avec des zones robots.
// Même interface que le mode Firebase, pour pouvoir tester le jeu sans rien installer.
import { createGame, buildJoinZone } from '../engine/resolve.js';
import { BOT_PROFILES, botOrders } from '../engine/bots.js';
import { newZone } from '../engine/zone.js';
import { nextResolutionAfter } from '../engine/time.js';
import { makeRng } from '../engine/rng.js';
import { MAX_ZONES, partieComplete } from '../engine/constants.js';
import { codeDejaPris, MSG_CODE_PRIS } from './codes.js';

const KEY = 'mazp-demo-v3';
const ME = 'moi';

const RADIO_BOTS = [
  'Quelqu’un aurait vu notre combi ? Il n’est jamais revenu du car-wash.',
  'Quelqu’un a du monde pour le non-droit ce soir ? On monte à la gare.',
  'Qui envoie du monde pour l’événement ? On ne va pas tout porter seuls.',
  'Notre paperasse atteint le plafond. Littéralement.',
  'Félicitations à la zone gagnante d’hier soir, bien joué.',
  'Petit rappel : la Gazette sort à 20:00. Préparez vos excuses.',
  'Recrues fraîches à l’académie, on revient plus forts.',
];

function load() {
  try { const raw = globalThis.localStorage && localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function save(db) {
  try { globalThis.localStorage && localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* stockage indisponible : la partie reste en mémoire */ }
}

export function createLocalBackend(config) {
  let db = load();
  const listeners = { state: new Set(), radio: new Set(), prive: new Set(), auth: new Set() };
  const emit = (k, v) => listeners[k].forEach((cb) => { try { cb(v); } catch (e) { console.error(e); } });
  const hour = config.resolutionHour ?? 20;

  function freshPartie(id, nom, code) {
    const now = Date.now();
    const state = createGame({ seed: `${config.seed}-demo-${id}`, turnDeadline: nextResolutionAfter(now, hour) });
    // La démo ouvre directement sur l'affaire de meurtre écrite à la main, pour pouvoir la tester.
    // Avec « ?demo=rampe », elle ouvre sur la seconde (« Le notaire de la Rampe »).
    if (id === 'demo') {
      // Avec « ?demo=corbeau », sur la troisième (« Le corbeau de la rue d'Havré »).
      const q = typeof location !== 'undefined' ? (location.search || '') : '';
      const rampe = /(^|[?&])demo=rampe\b/.test(q), corbeau = /(^|[?&])demo=corbeau\b/.test(q);
      const medaillon = /(^|[?&])demo=medaillon\b/.test(q);
      // « ?demo=vol » : une affaire de vol générée (constatations, planques, traque).
      if (/(^|[?&])demo=vol\b/.test(q)) { state.meurtreDes = -1; state.meurtre2Des = -2; state.corbeauDes = -3; } else if (medaillon) { state.meurtreDes = -1; state.meurtre2Des = -2; state.corbeauDes = 0; state.medaillonDes = 1; } else if (corbeau) { state.meurtreDes = -1; state.meurtre2Des = 0; state.corbeauDes = 1; } else if (rampe) { state.meurtreDes = 0; state.meurtre2Des = 1; } else state.meurtreDes = 1;
      // L'histoire d'origine par défaut ; « &variante=b » pour jouer la variante (voir state.variantes, enquete.js).
      state.variantes = { 1: (/[?&]variante=b\b/.test(q) ? 'b' : 'a') };
    }
    const players = {};
    for (const b of BOT_PROFILES) {
      players[b.uid] = { code: b.code, nom: b.nom, couleur: b.couleur, pseudo: b.pseudo, bot: true, style: b.style };
      state.zones[b.uid] = newZone({ uid: b.uid, code: b.code, nom: b.nom, couleur: b.couleur }, 1);
    }
    return { meta: { id, nom, code, owner: ME, createdAt: now, variante: id === 'demo' ? ((typeof location !== 'undefined' && (location.search || '').match(/[?&]demo=([a-z]+)/)) || [])[1] || 'clef' : undefined }, state, players, orders: {}, quests: {}, gazettes: {}, radio: [
      { id: 'r1', uid: 'bot-canal', texte: 'Bienvenue au District Delta. Ici, la Gazette ne pardonne rien.', at: now - 3600e3 },
    ] };
  }
  function fresh() {
    return { parties: { demo: freshPartie('demo', 'Partie de démonstration', 'DEMO24') }, mesParties: ['demo'], current: 'demo', signedIn: false };
  }
  if (!db || !db.parties) { db = fresh(); save(db); }
  // La démo suit le lien : « ?demo=vol », « ?demo=corbeau »… repartent sur une partie neuve quand on change d'affaire,
  // et « &neuf » remet la démo à zéro (le paramètre est retiré de l'adresse pour ne pas tout effacer à chaque rechargement).
  {
    const q = typeof location !== 'undefined' ? (location.search || '') : '';
    const variante = (q.match(/[?&]demo=([a-z]+)/) || [])[1] || 'clef';
    const neuf = /[?&]neuf\b/.test(q);
    const d0 = db.parties.demo;
    if (neuf || (d0 && (d0.meta.variante || 'clef') !== variante)) {
      db.parties.demo = freshPartie('demo', 'Partie de démonstration', 'DEMO24');
      db.parties.demo.meta.variante = variante;
      if (neuf) { db.signedIn = false; db.current = 'demo'; }
      save(db);
      if (neuf && typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', location.pathname + q.replace(/[?&]neuf\b/, '').replace(/^&/, '?') + location.hash);
    }
  }
  // Raccourcis vers la partie ouverte.
  const P = () => db.parties[db.current];
  const self = { get state() { return P().state; }, set state(v) { P().state = v; }, get players() { return P().players; }, set players(v) { P().players = v; }, get orders() { return P().orders; }, get quests() { return P().quests; }, get gazettes() { return P().gazettes; }, get radio() { return P().radio; }, get prives() { return (P().prives ||= []); } };

  const persist = () => save(db);
  const key = (s, t) => `${s}-${t}`;

  return {
    mode: 'demo',
    async init() { return db.signedIn ? { uid: ME, email: 'demo@ma-zp.local', displayName: 'Toi' } : null; },
    onAuth(cb) { listeners.auth.add(cb); return () => listeners.auth.delete(cb); },
    async signInDemo() { db.signedIn = true; persist(); const u = { uid: ME, email: 'demo@ma-zp.local' }; emit('auth', u); return u; },
    async signInGoogle() { return this.signInDemo(); },
    async signInEmail() { return this.signInDemo(); },
    async signUpEmail() { return this.signInDemo(); },
    async resetPassword() { return true; },
    async signOut() { db.signedIn = false; persist(); emit('auth', null); },
    isAdmin() { return true; },
    isMaster() { return true; },
    isSuperAdmin() { return true; },
    maxParties: config.maxPartiesParJoueur ?? 3,
    gameId() { return db.current; },
    gameMeta() { return P() ? P().meta : null; },
    async useGame(id) { if (!db.parties[id]) return null; db.current = id; persist(); return P().meta; },
    async listMyParties() { return db.mesParties.filter((id) => db.parties[id]).map((id) => db.parties[id].meta); },
    async createParty(uid, nom) {
      const n = Object.values(db.parties).filter((x) => x.meta.owner === ME && x.meta.id !== 'demo').length;
      if (n >= this.maxParties) throw new Error(`Tu as déjà créé ${this.maxParties} parties : c’est le maximum.`);
      const id = `p${Date.now().toString(36)}`;
      const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      db.parties[id] = freshPartie(id, String(nom).slice(0, 40), code);
      db.mesParties.push(id); db.current = id; persist();
      return id;
    },
    async joinByCode(uid, code) {
      const p = Object.values(db.parties).find((x) => x.meta.code === String(code).toUpperCase().trim());
      if (!p) throw new Error('Aucune partie ne correspond à ce code.');
      if (!db.mesParties.includes(p.meta.id)) db.mesParties.push(p.meta.id);
      persist(); return p.meta.id;
    },
    async leaveList(uid, id) { db.mesParties = db.mesParties.filter((x) => x !== id); persist(); },
    async listAllParties() { return Object.values(db.parties).map((x) => x.meta); },

    async getState() { return JSON.parse(JSON.stringify(self.state)); },
    subscribeState(cb) { listeners.state.add(cb); cb(JSON.parse(JSON.stringify(self.state))); return () => listeners.state.delete(cb); },

    // Carnet d'enquête « en ligne » : en démo, une copie à part sur l'appareil (même chemin que Firebase).
    async getCarnet(uid) { try { return JSON.parse(localStorage.getItem(`mazp-demo-carnet-${uid}`)); } catch (e) { return null; } },
    async saveCarnet(uid, data) { try { localStorage.setItem(`mazp-demo-carnet-${uid}`, JSON.stringify(data)); } catch (e) { /* rien */ } },
    async getPlayer(uid) { return self.players[uid] || null; },
    async getPlayers() { return JSON.parse(JSON.stringify(self.players)); },
    async compterEntrainement(uid, plus) {
      const p = self.players[uid]; if (!p) return;
      const e = (p.entrainement ||= {});
      for (const [k, v] of Object.entries(plus)) if (v) e[k] = (e[k] || 0) + v;
      e.dernier = Date.now(); persist();
    },
    async touchPlayer(uid) { if (self.players[uid]) { self.players[uid].vuLe = Date.now(); persist(); } },
    async savePlayer(uid, profile) {
      self.players[uid] = { ...(self.players[uid] || {}), ...profile };
      if (self.state.zones[uid]) { self.state.zones[uid].nom = profile.nom ?? self.state.zones[uid].nom; self.state.zones[uid].code = profile.code ?? self.state.zones[uid].code; self.state.zones[uid].couleur = profile.couleur ?? self.state.zones[uid].couleur; }
      persist(); emit('state', JSON.parse(JSON.stringify(self.state)));
    },
    async joinGame(uid, profile) {
      if (self.state.zones[uid]) return;
      if (partieComplete(self.state, uid)) throw new Error(`Cette partie est complète (${MAX_ZONES} zones).`);
      if (profile && codeDejaPris(self.state, profile.code, uid)) throw new Error(MSG_CODE_PRIS(profile.code));
      self.state.zones[uid] = buildJoinZone(self.state, uid, profile, self.state.turn);
      persist(); emit('state', JSON.parse(JSON.stringify(self.state)));
    },

    async saveOrders(uid, season, turn, orders) { (self.orders[key(season, turn)] ||= {})[uid] = orders; persist(); },
    async getOrders(uid, season, turn) { return (self.orders[key(season, turn)] || {})[uid] || null; },
    async getAllOrders(season, turn) {
      const mine = { ...(self.orders[key(season, turn)] || {}) };
      // Les robots décident au moment de la résolution (leur journée d'enquête en direct est rangée à part).
      const enq = (P().enqueteBots ||= {})[key(season, turn)] = {};
      for (const [uid, p] of Object.entries(self.players)) {
        if (!p.bot || !self.state.zones[uid]) continue;
        const o = botOrders(self.state.zones[uid], self.state, p.style);
        if (o) { mine[uid] = o; enq[uid] = o.actionsEnquete || []; }
      }
      // Les robots coopératifs répondent aux appels à renfort du jour.
      const appels = self.radio.filter((m) => m.renfort && m.renfort.season === season && m.renfort.turn === turn && !String(m.uid).startsWith('bot'));
      if (appels.length) {
        const occupe = (z) => z.operation && z.operation.tourDebut <= turn && turn < z.operation.tourDebut + z.operation.duree;
        const aidants = Object.entries(self.players).filter(([u, p]) => p.bot && p.style !== 'agressif' && mine[u] && self.state.zones[u] && !occupe(self.state.zones[u])).slice(0, 2);
        for (const [u] of aidants) mine[u] = { ...mine[u], renfort: { cible: appels[appels.length - 1].uid, agents: 2 } };
      }
      return mine;
    },
    // Enquête en direct : actions horodatées par l'appareil en démo (par le serveur avec Firebase).
    async saveEnqueteAction(uid, season, turn, action) {
      ((P().enquete ||= {})[key(season, turn)] ||= []).push({ ...JSON.parse(JSON.stringify(action)), uid, at: Date.now() });
      persist();
    },
    async getMesActionsEnquete(uid, season, turn) {
      return (((P().enquete || {})[key(season, turn)]) || []).filter((a) => a.uid === uid).map(({ uid: u0, ...a }) => a);
    },
    async getEnqueteActions(season, turn) {
      const out = {};
      for (const { uid, ...a } of ((P().enquete || {})[key(season, turn)]) || []) (out[uid] ||= []).push(a);
      for (const [u, l] of Object.entries(((P().enqueteBots || {})[key(season, turn)]) || {})) out[u] = [...(out[u] || []), ...l];
      return out;
    },
    async saveQuest(uid, season, turn, slot, data) {
      const t = (self.quests[key(season, turn)] ||= {});
      const arr = Array.isArray(t[uid]) ? t[uid] : [null, null, null];
      arr[slot] = { ...data, slot };
      t[uid] = arr; persist();
    },
    async getQuests(uid, season, turn) {
      const v = (self.quests[key(season, turn)] || {})[uid];
      return Array.isArray(v) ? v : [null, null, null];
    },
    async getAllQuests(season, turn) { return JSON.parse(JSON.stringify(self.quests[key(season, turn)] || {})); },
    /** Toutes les réponses aux énigmes de la partie (pour le classement des énigmes). */
    async listQuestResults() {
      const out = [];
      for (const [k, parUid] of Object.entries(self.quests || {})) {
        const [season, turn] = k.split(/[^0-9]+/).filter(Boolean).map(Number);
        for (const [uid, arr] of Object.entries(parUid || {})) (Array.isArray(arr) ? arr : [arr]).forEach((q, slot) => { if (q) out.push({ uid, season, turn, statut: q.statut, type: q.type, slot: q.slot ?? slot }); });
      }
      return out;
    },

    async commitResolution(prev, next, gazette) {
      if (self.state.turn !== prev.turn || self.state.season !== prev.season) return false;
      self.state = next;
      self.gazettes[key(prev.season, prev.turn)] = gazette;
      // Un robot commente parfois sur la radio.
      const rng = makeRng(`radio:${prev.season}:${prev.turn}`);
      if (rng.chance(0.6)) {
        const bot = rng.pick(BOT_PROFILES);
        self.radio.push({ id: `r${Date.now()}`, uid: bot.uid, texte: rng.pick(RADIO_BOTS), at: Date.now() });
        emit('radio', self.radio.slice(-100));
      }
      // Ménage : on garde les ordres des 3 derniers tours.
      for (const k of Object.keys(self.orders)) { const [s, t] = k.split('-').map(Number); if (s < prev.season || t < prev.turn - 3) delete self.orders[k]; }
      for (const tab of [P().enquete || {}, P().enqueteBots || {}]) for (const k of Object.keys(tab)) { const [s, t] = k.split('-').map(Number); if (s < prev.season || t < prev.turn - 3) delete tab[k]; }
      persist();
      emit('state', JSON.parse(JSON.stringify(self.state)));
      return true;
    },
    async getGazette(season, turn) { return self.gazettes[key(season, turn)] || null; },
    async listGazettes(max = 20) {
      return Object.values(self.gazettes).sort((a, b) => (b.season - a.season) || (b.turn - a.turn)).slice(0, max);
    },

    subscribePrives(uid, cb) { const f = (l) => cb(l.filter((m) => m.participants.includes(uid))); const w = (l) => f(l); listeners.prive.add(w); f(self.prives); return () => listeners.prive.delete(w); },
    async sendPrive(de, a, texte, extra = {}) {
      self.prives.push({ ...extra, id: `p${Date.now()}`, de, a, participants: [de, a], texte: String(texte).slice(0, 500), at: Date.now() });
      persist(); emit('prive', self.prives.slice());
      // En démo, la zone robot répond quelques secondes plus tard.
      if (String(a).startsWith('bot') && !extra.reponse) {
        const rep = ['Bien reçu. On en reparle après 20:00.', 'Intéressant… Qu’est-ce que tu proposes en échange ?', 'Ça marche, compte sur moi.', 'Je regarde ça et je te redis.', 'Pas cette fois, désolé.'];
        setTimeout(() => { self.prives.push({ id: `p${Date.now()}`, de: a, a: de, participants: [a, de], texte: rep[Math.floor(Math.random() * rep.length)], at: Date.now() }); persist(); emit('prive', self.prives.slice()); }, 2500);
      }
    },
    subscribeRadio(cb) { listeners.radio.add(cb); cb(self.radio.slice(-100)); return () => listeners.radio.delete(cb); },
    async sendRadio(uid, texte, extra = {}) {
      self.radio.push({ ...extra, id: `r${Date.now()}`, uid, texte: String(texte).slice(0, 280), at: Date.now() });
      persist(); emit('radio', self.radio.slice(-100));
    },

    // Maître du jeu
    async adminDirecteur(champs) { self.state.dir = { ...(self.state.dir || {}), ...JSON.parse(JSON.stringify(champs)) }; persist(); emit('state', JSON.parse(JSON.stringify(self.state))); },
    async adminModifierEtat(modifier) { const cur = JSON.parse(JSON.stringify(self.state)); const r = modifier(cur); if (r == null) return null; self.state = cur; persist(); emit('state', JSON.parse(JSON.stringify(self.state))); return r; },
    async adminPauseEnquete(pause, minClientVersion) { self.state.enquete = null; self.state.enquetePause = JSON.parse(JSON.stringify(pause)); self.state.minClientVersion = minClientVersion; persist(); emit('state', JSON.parse(JSON.stringify(self.state))); },
    async adminFinSaison(mode) { if (mode) self.state.finSaison = mode; else delete self.state.finSaison; persist(); emit('state', JSON.parse(JSON.stringify(self.state))); },
    async adminVariantesEcrites(v) { self.state.variantesEcrites = !!v; persist(); emit('state', JSON.parse(JSON.stringify(self.state))); },
    async adminPasserTour() { self.state.turn += 1; self.state.nextDeadline = Date.now() + 86400000; persist(); emit('state', JSON.parse(JSON.stringify(self.state))); },
    async adminForceResolution() { self.state.nextDeadline = Date.now() - 1000; persist(); },
    async adminReset() { const m = P().meta; db.parties[m.id] = freshPartie(m.id, m.nom, m.code); persist(); emit('state', JSON.parse(JSON.stringify(self.state))); },
    async adminRemovePlayer(uid) { delete self.state.zones[uid]; if (self.players[uid]) self.players[uid].retire = true; persist(); emit('state', JSON.parse(JSON.stringify(self.state))); },
    async adminCreateGame() { return this.adminReset(); },
    async adminExport() { return JSON.parse(JSON.stringify({ app: 'ma-zp', exportedAt: Date.now(), state: self.state, players: self.players })); },
    async adminImport(data) {
      self.state = data.state; self.players = { ...self.players, ...(data.players || {}) };
      persist(); emit('state', JSON.parse(JSON.stringify(self.state)));
    },
  };
}

