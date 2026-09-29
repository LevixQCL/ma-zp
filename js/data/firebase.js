// MODE EN LIGNE : Firebase Authentication + Cloud Firestore.
// Le SDK Firebase est chargé depuis le CDN officiel de Google, sans étape de compilation.
import { buildJoinZone, createGame } from '../engine/resolve.js';
import { nextResolutionAfter } from '../engine/time.js';

const V = '10.12.2';
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
  // Connexion en « long polling » : plus lente de quelques millisecondes, mais elle passe
  // à travers les réseaux d'entreprise et les proxys qui bloquent les flux Firestore.
  let fs;
  try { fs = F.initializeFirestore(app, { experimentalForceLongPolling: true }); } catch (e) { fs = F.getFirestore(app); }
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

    async getPlayer(uid) { try { const s = await F.getDoc(docIn('players', uid)); return s.exists() ? s.data() : null; } catch (e) { return null; } },
    async getPlayers() {
      let snap;
      try { snap = await F.getDocs(col('players')); } catch (e) { return {}; }
      const out = {}; snap.forEach((d) => { out[d.id] = d.data(); }); return out;
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
      const snaps = await Promise.all([0, 1, 2].map((slot) => F.getDoc(docIn('quests', `${id3(season, turn, uid)}_${slot}`))));
      return snaps.map((s) => (s.exists() ? s.data() : null));
    },
    async getAllQuests(season, turn) {
      const q = F.query(col('quests'), F.where('season', '==', season), F.where('turn', '==', turn));
      const snap = await F.getDocs(q);
      const out = {};
      snap.forEach((d) => { const v = d.data(); (out[v.uid] ||= [null, null, null])[v.slot ?? 0] = v; });
      return out;
    },

    /** Toutes les réponses aux énigmes de la partie (pour le classement des énigmes). */
    async listQuestResults() {
      const snap = await F.getDocs(col('quests'));
      return snap.docs.map((d) => { const v = d.data(); return { uid: v.uid, season: v.season, turn: v.turn, statut: v.statut, type: v.type }; });
    },

    async commitResolution(prev, next, gazette) {
      try {
        return await F.runTransaction(fs, async (tx) => {
          const s = await tx.get(stateRef());
          const cur = s.data();
          if (!cur || cur.turn !== prev.turn || cur.season !== prev.season) return false;
          tx.set(stateRef(), plain(next));
          tx.set(docIn('gazettes', `${prev.season}_${prev.turn}`), plain({ ...gazette, createdAt: Date.now() }));
          return true;
        });
      } catch (e) { console.warn('Résolution déjà faite ou refusée :', e.message); return false; }
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
      const q = F.query(col('radio'), F.orderBy('at', 'desc'), F.limit(40));
      return F.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()), (e) => console.error(e));
    },
    async sendRadio(uid, texte) {
      await F.addDoc(col('radio'), { uid, texte: String(texte).slice(0, 280), at: Date.now() });
    },

    // Messages privés : lisibles uniquement par les deux zones concernées.
    subscribePrives(uid, cb) {
      const q = F.query(col('prives'), F.where('participants', 'array-contains', uid));
      return F.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.at - b.at)), (e) => console.error(e));
    },
    async sendPrive(de, a, texte) {
      await F.addDoc(col('prives'), { de, a, participants: [de, a], texte: String(texte).slice(0, 500), at: Date.now() });
    },

    // Maître du jeu
    async adminCreateGame() {
      const state = createGame({ seed: `${config.seed}-${gid}-${Date.now()}`, turnDeadline: nextResolutionAfter(Date.now(), hour) });
      await F.setDoc(stateRef(), plain(state));
    },
    async adminReset() { return this.adminCreateGame(); },
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
