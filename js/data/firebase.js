// MODE EN LIGNE : Firebase Authentication + Cloud Firestore.
// Le SDK Firebase est chargé depuis le CDN officiel de Google, sans étape de compilation.
import { buildJoinZone, createGame } from '../engine/resolve.js';
import { nextResolutionAfter } from '../engine/time.js';
import { MAX_ZONES, partieComplete } from '../engine/constants.js';
import { codeDejaPris, MSG_CODE_PRIS } from './codes.js';

const V = '10.12.2'; // si tu changes de version : mets aussi à jour les « modulepreload » de index.html
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

const plain = (o) => JSON.parse(JSON.stringify(o));

export async function createFirebaseBackend(config) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  const app = initializeApp(config.firebase);
  const auth = A.getAuth(app);
  // Détection automatique : flux rapide quand le réseau le permet, « long polling » derrière
  // les réseaux d'entreprise et les proxys qui bloquent les flux Firestore.
  let fs;
  try { fs = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); } catch (e) { fs = F.getFirestore(app); }
  // Chaque partie a ses propres données : parties/{id}/state, players, orders, quests, gazettes, radio, prives.
  let gid = null, meta = null;
  const stateRef = () => F.doc(fs, 'parties', gid, 'state', 'current');
  const col = (name) => F.collection(fs, 'parties', gid, name);
  const docIn = (name, id) => F.doc(fs, 'parties', gid, name, id);
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const nouveauCode = () => Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  const maxParties = config.maxPartiesParJoueur ?? 3;
  const id3 = (s, t, uid) => `${s}_${t}_${uid}`;
  const hour = config.resolutionHour ?? 20;
  const admins = (config.adminEmails || []).map((e) => e.toLowerCase());
  let currentUser = null;

  const isStandalone = () => globalThis.matchMedia && matchMedia('(display-mode: standalone)').matches;

  // Termine une éventuelle connexion Google par redirection (appli installée).
  try { await A.getRedirectResult(auth); } catch (e) { console.warn(e); }

  const backend = {
    mode: 'firebase',
    init() {
      return new Promise((resolve) => {
        const unsub = A.onAuthStateChanged(auth, (u) => { currentUser = u; unsub(); resolve(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null); });
      });
    },
    onAuth(cb) { return A.onAuthStateChanged(auth, (u) => { currentUser = u; cb(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null); }); },
    async signInGoogle() {
      const provider = new A.GoogleAuthProvider();
      if (isStandalone()) return A.signInWithRedirect(auth, provider);
      return A.signInWithPopup(auth, provider);
    },
    signInEmail: (email, pw) => A.signInWithEmailAndPassword(auth, email, pw),
    signUpEmail: (email, pw) => A.createUserWithEmailAndPassword(auth, email, pw),
    resetPassword: (email) => A.sendPasswordResetEmail(auth, email),
    signOut: () => A.signOut(auth),
    isSuperAdmin(user) { return !!user && !!user.email && admins.includes(user.email.toLowerCase()); },
    /** Maître du jeu de la partie ouverte : son créateur, ou un super-administrateur. */
    isMaster(user) { return this.isSuperAdmin(user) || (!!user && !!meta && meta.owner === user.uid); },
    isAdmin(user) { return this.isMaster(user); },
    maxParties,

    // ───── Parties ─────
    gameId() { return gid; },
    gameMeta() { return meta; },
    async useGame(id) {
      gid = id;
      const s = await F.getDoc(F.doc(fs, 'parties', id));
      meta = s.exists() ? { id, ...s.data() } : null;
      return meta;
    },
    async listMyParties(uid) {
      const u = await F.getDoc(F.doc(fs, 'users', uid));
      const ids = u.exists() ? (u.data().parties || []) : [];
      const metas = await Promise.all(ids.map(async (id) => { const d = await F.getDoc(F.doc(fs, 'parties', id)); return d.exists() ? { id, ...d.data() } : null; }));
      return metas.filter(Boolean);
    },
    async createParty(uid, nom) {
      const userRef = F.doc(fs, 'users', uid);
      const id = F.doc(F.collection(fs, 'parties')).id;
      await F.runTransaction(fs, async (tx) => {
        const u = await tx.get(userRef);
        const possedees = u.exists() ? (u.data().possedees || 0) : 0;
        if (possedees >= maxParties) throw new Error(`Tu as déjà créé ${maxParties} parties : c’est le maximum.`);
        let code = nouveauCode();
        for (let i = 0; i < 5; i++) { const c = await tx.get(F.doc(fs, 'codes', code)); if (!c.exists()) break; code = nouveauCode(); }
        const parties = u.exists() ? (u.data().parties || []) : [];
        tx.set(userRef, { possedees: possedees + 1, parties: [...parties, id] }, { merge: true });
        tx.set(F.doc(fs, 'parties', id), { nom: String(nom).slice(0, 40), code, owner: uid, ownerEmail: currentUser && currentUser.email || '', createdAt: Date.now() });
        tx.set(F.doc(fs, 'codes', code), { gid: id, owner: uid });
      });
      await this.useGame(id);
      const state = createGame({ seed: `${config.seed}-${id}`, turnDeadline: nextResolutionAfter(Date.now(), hour) });
      await F.setDoc(stateRef(), plain(state));
      return id;
    },
    async joinByCode(uid, code) {
      const c = await F.getDoc(F.doc(fs, 'codes', String(code).toUpperCase().trim()));
      if (!c.exists()) throw new Error('Aucune partie ne correspond à ce code.');
      const id = c.data().gid;
      // Partie complète : on refuse avant même de l'ajouter à la liste du joueur.
      try {
        const st = await F.getDoc(F.doc(fs, 'parties', id, 'state', 'current'));
        if (st.exists() && partieComplete(st.data(), uid)) throw new Error(`Cette partie est complète (${MAX_ZONES} zones). Demande au maître du jeu d’en créer une autre.`);
      } catch (e) { if (/complète/.test(e.message)) throw e; }
      await F.setDoc(F.doc(fs, 'users', uid), { parties: F.arrayUnion(id) }, { merge: true });
      return id;
    },
    async leaveList(uid, id) { await F.setDoc(F.doc(fs, 'users', uid), { parties: F.arrayRemove(id) }, { merge: true }); },
    async listAllParties() {
      const snap = await F.getDocs(F.collection(fs, 'parties'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getState() { const s = await F.getDoc(stateRef()); return s.exists() ? s.data() : null; },
    subscribeState(cb, onErr) { return F.onSnapshot(stateRef(), (s) => cb(s.exists() ? s.data() : null), (e) => { console.error(e); if (onErr) onErr(e); }); },

    // Carnet d'enquête (tableau, marques, notes) : une fiche par joueur, lisible et modifiable par lui seul.
    // Chaque affaire est rangée en texte JSON : Firestore refuse les listes de listes (les ficelles [a, b])
    // et les valeurs « undefined ». On relit aussi l'ancien format (objet).
    async getCarnet(uid) {
      const d = await F.getDoc(docIn('carnets', uid));
      if (!d.exists()) return null;
      const data = d.data(), affaires = {};
      for (const [k, v] of Object.entries(data.affaires || {})) { try { affaires[k] = typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { /* fiche illisible : ignorée */ } }
      return { ...data, affaires };
    },
    async saveCarnet(uid, data) {
      const affaires = Object.fromEntries(Object.entries(data.affaires || {}).map(([k, v]) => [k, JSON.stringify(v)]));
      await F.setDoc(docIn('carnets', uid), { affaires, maj: data.maj || Date.now() });
    },
    async getPlayer(uid) { try { const s = await F.getDoc(docIn('players', uid)); return s.exists() ? s.data() : null; } catch (e) { return null; } },
    async getPlayers({ strict = false } = {}) {
      let snap;
      try { snap = await F.getDocs(col('players')); } catch (e) { if (strict) throw e; return {}; }
      const out = {}; snap.forEach((d) => { out[d.id] = d.data(); }); return out;
    },
    /** Dernière connexion du joueur (pour la page du maître du jeu). */
    async touchPlayer(uid) {
      await F.updateDoc(docIn('players', uid), { vuLe: Date.now() });
    },
    /** Compteurs d'entraînement (classement du maître du jeu) : { enigmes: 1, reussies: 1, minijeux: 0 }. */
    async compterEntrainement(uid, plus) {
      const maj = { 'entrainement.dernier': Date.now() };
      for (const [k, v] of Object.entries(plus)) if (v) maj[`entrainement.${k}`] = F.increment(v);
      await F.updateDoc(docIn('players', uid), maj);
    },
    async savePlayer(uid, profile) {
      await F.setDoc(docIn('players', uid), plain({ ...profile, updatedAt: Date.now() }), { merge: true });
    },
    async joinGame(uid, profile) {
      await F.runTransaction(fs, async (tx) => {
        const s = await tx.get(stateRef());
        if (!s.exists()) throw new Error('La partie n’a pas encore été lancée par le maître du jeu.');
        const state = s.data();
        if (state.zones && state.zones[uid]) return;
        if (partieComplete(state, uid)) throw new Error(`Cette partie est complète (${MAX_ZONES} zones). Demande au maître du jeu d’en créer une autre.`);
        if (profile && codeDejaPris(state, profile.code, uid)) throw new Error(MSG_CODE_PRIS(profile.code));
        const zone = buildJoinZone(state, uid, profile, state.turn);
        tx.update(stateRef(), new F.FieldPath('zones', uid), plain(zone));
      });
    },

    async saveOrders(uid, season, turn, orders) {
      await F.setDoc(docIn('orders', id3(season, turn, uid)), plain({ uid, season, turn, orders, at: Date.now() }));
    },
    async getOrders(uid, season, turn) {
      const s = await F.getDoc(docIn('orders', id3(season, turn, uid)));
      return s.exists() ? s.data().orders : null;
    },
    async getAllOrders(season, turn) {
      const q = F.query(col('orders'), F.where('season', '==', season), F.where('turn', '==', turn));
      const snap = await F.getDocs(q);
      const out = {}; snap.forEach((d) => { const v = d.data(); out[v.uid] = v.orders; }); return out;
    },
    async saveQuest(uid, season, turn, slot, data) {
      await F.setDoc(docIn('quests', `${id3(season, turn, uid)}_${slot}`), plain({ ...data, uid, season, turn, slot, at: Date.now() }));
    },
    async getQuests(uid, season, turn) {
      const snaps = await Promise.all([0, 1, 2, 3, 4].map((slot) => F.getDoc(docIn('quests', `${id3(season, turn, uid)}_${slot}`))));
      return snaps.map((s) => (s.exists() ? s.data() : null));
    },
    async getAllQuests(season, turn) {
      const q = F.query(col('quests'), F.where('season', '==', season), F.where('turn', '==', turn));
      const snap = await F.getDocs(q);
      const out = {};
      snap.forEach((d) => { const v = d.data(); (out[v.uid] ||= [null, null, null, null, null])[v.slot ?? 0] = v; });
      return out;
    },

    /** Toutes les réponses aux énigmes de la partie (pour le classement des énigmes). */
    async listQuestResults(season = null) {
      const snap = await F.getDocs(season ? F.query(col('quests'), F.where('season', '==', season)) : col('quests'));
      return snap.docs.map((d) => { const v = d.data(); return { uid: v.uid, season: v.season, turn: v.turn, statut: v.statut, type: v.type, slot: v.slot ?? 0 }; });
    },

    async commitResolution(prev, next, gazette) {
      try {
        const r = await F.runTransaction(fs, async (tx) => {
          const s = await tx.get(stateRef());
          const cur = s.data();
          if (!cur || cur.turn !== prev.turn || cur.season !== prev.season) return false;
          tx.set(stateRef(), plain(next));
          tx.set(docIn('gazettes', `${prev.season}_${prev.turn}`), plain({ ...gazette, createdAt: Date.now() }));
          return true;
        });
        this.derniereErreur = null;
        return r;
      } catch (e) {
        console.warn('Résolution déjà faite ou refusée :', e.message);
        this.derniereErreur = `${e.code || ''} ${e.message || e}`.trim();
        return false;
      }
    },
    async getGazette(season, turn) {
      const s = await F.getDoc(docIn('gazettes', `${season}_${turn}`));
      return s.exists() ? s.data() : null;
    },
    async listGazettes(max = 20) {
      const q = F.query(col('gazettes'), F.orderBy('createdAt', 'desc'), F.limit(max));
      const snap = await F.getDocs(q);
      return snap.docs.map((d) => d.data());
    },

    subscribeRadio(cb) {
      // Les 80 derniers messages (les deux fréquences), plus toutes les annonces de la zone de non-droit / renforts des 30 dernières heures :
      // sans ça, une annonce du matin sortait de la fenêtre des 40 et les autres zones ne la voyaient plus.
      let recents = [], jour = [];
      const envoyer = () => {
        const par = new Map();
        for (const m of [...jour, ...recents]) par.set(m.id, m);
        cb([...par.values()].sort((a, b) => (a.at || 0) - (b.at || 0)));
      };
      const lire = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const u1 = F.onSnapshot(F.query(col('radio'), F.orderBy('at', 'desc'), F.limit(80)), (snap) => { recents = lire(snap); envoyer(); }, (e) => console.error(e));
      const u2 = F.onSnapshot(F.query(col('radio'), F.where('at', '>=', Date.now() - 30 * 3600 * 1000)),
        (snap) => { jour = lire(snap).filter((m) => m.nd || m.renfort); envoyer(); }, (e) => console.error(e));
      return () => { u1(); u2(); };
    },
    async sendRadio(uid, texte, extra = {}) {
      await F.addDoc(col('radio'), { ...extra, uid, texte: String(texte).slice(0, 280), at: Date.now() });
    },

    // Messages privés : lisibles uniquement par les deux zones concernées.
    subscribePrives(uid, cb) {
      const q = F.query(col('prives'), F.where('participants', 'array-contains', uid));
      return F.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.at - b.at)), (e) => console.error(e));
    },
    async sendPrive(de, a, texte, extra = {}) {
      await F.addDoc(col('prives'), { ...extra, de, a, participants: [de, a], texte: String(texte).slice(0, 500), at: Date.now() });
    },

    // Maître du jeu
    async adminCreateGame() {
      const state = createGame({ seed: `${config.seed}-${gid}-${Date.now()}`, turnDeadline: nextResolutionAfter(Date.now(), hour) });
      await F.setDoc(stateRef(), plain(state));
    },
    async adminReset() {
      // Les ordres, énigmes et gazettes de l'ancienne partie portent les mêmes identifiants (saison_tour_joueur)
      // que ceux de la nouvelle : on les efface d'abord, sinon ils se mélangeraient.
      for (const name of ['orders', 'quests', 'gazettes']) {
        const snap = await F.getDocs(col(name));
        for (let i = 0; i < snap.docs.length; i += 400) {
          const b = F.writeBatch(fs);
          for (const d of snap.docs.slice(i, i + 400)) b.delete(d.ref);
          await b.commit();
        }
      }
      return this.adminCreateGame();
    },
    /** Réglages du Directeur (intensité, feuilletons) et événement de district demandé : rangés dans l'état. */
    async adminDirecteur(champs) { await F.updateDoc(stateRef(), Object.fromEntries(Object.entries(champs).map(([k, v]) => [`dir.${k}`, v]))); },
    async adminModifierEtat(modifier) {
      return F.runTransaction(fs, async (tx) => {
        const cur = (await tx.get(stateRef())).data();
        if (!cur) return null;
        const r = modifier(cur);
        if (r == null) return null;
        tx.set(stateRef(), plain(cur));
        return r;
      });
    },
    async adminPauseEnquete(pause, minClientVersion) { await F.updateDoc(stateRef(), { enquete: null, enquetePause: pause, minClientVersion }); },
    async adminForceResolution() { await F.updateDoc(stateRef(), { nextDeadline: Date.now() - 1000 }); },
    async adminExport() {
      const [state, players] = await Promise.all([this.getState(), this.getPlayers()]);
      return { app: 'ma-zp', exportedAt: Date.now(), state, players };
    },
    async adminImport(data) {
      await F.setDoc(stateRef(), plain(data.state));
      for (const [uid, p] of Object.entries(data.players || {})) await F.setDoc(docIn('players', uid), plain(p), { merge: true });
    },
    async adminRemovePlayer(uid) {
      await F.updateDoc(stateRef(), new F.FieldPath('zones', uid), F.deleteField());
      await F.setDoc(docIn('players', uid), { retire: true }, { merge: true });
    },
  };
  return backend;
}
