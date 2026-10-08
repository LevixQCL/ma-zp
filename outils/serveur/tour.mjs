// Calcul du tour de 20:00 par la tâche planifiée GitHub (.github/workflows/tour.yml).
// Utilise exactement le moteur du jeu (js/engine) et la même boucle que les appareils (js/data/resolver.js),
// avec un compte de service Firebase : l'état de la partie n'est plus écrit que par ici (les appareils en secours).
//
// Variable d'environnement : FIREBASE_SERVICE_ACCOUNT = le contenu JSON de la clé du compte de service.
// Option : --partie <id> pour ne traiter qu'une partie ; --essai pour lire sans rien écrire.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolvePending } from '../../js/data/resolver.js';
import { CONFIG } from '../../js/config.js';

const brut = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!brut) { console.log('FIREBASE_SERVICE_ACCOUNT absent : rien à faire (les appareils calculent le tour).'); process.exit(0); }
const args = process.argv.slice(2);
const seule = args.includes('--partie') ? args[args.indexOf('--partie') + 1] : null;
const essai = args.includes('--essai');

initializeApp({ credential: cert(JSON.parse(brut)) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const plain = (o) => JSON.parse(JSON.stringify(o));

function backendAdmin(gid) {
  const base = db.collection('parties').doc(gid);
  const stateRef = base.collection('state').doc('current');
  const col = (n) => base.collection(n);
  return {
    mode: 'serveur',
    derniereErreur: null,
    async getState() { const s = await stateRef.get(); return s.exists ? s.data() : null; },
    async getAllOrders(season, turn) {
      const snap = await col('orders').where('season', '==', season).where('turn', '==', turn).get();
      const out = {}; snap.forEach((d) => { const v = d.data(); out[v.uid] = v.orders; }); return out;
    },
    async getAllQuests(season, turn) {
      const snap = await col('quests').where('season', '==', season).where('turn', '==', turn).get();
      const out = {}; snap.forEach((d) => { const v = d.data(); (out[v.uid] ||= [null, null, null, null, null])[v.slot ?? 0] = v; }); return out;
    },
    async getPlayers() {
      const snap = await col('players').get();
      const out = {}; snap.forEach((d) => { out[d.id] = d.data(); }); return out;
    },
    async listEncheres(venteId) {
      const snap = await col('radio').where('enchere.vente', '==', venteId).get();
      return snap.docs.map((d) => { const v = d.data(); return { uid: v.uid, at: v.at, ...v.enchere }; });
    },
    async listQuestResults() {
      const snap = await col('quests').get();
      return snap.docs.map((d) => { const v = d.data(); return { uid: v.uid, season: v.season, turn: v.turn, statut: v.statut, type: v.type, slot: v.slot ?? 0 }; });
    },
    async commitResolution(prev, next, gazette) {
      if (essai) { console.log(`  [essai] tour ${prev.season}-${prev.turn} calculé, rien d'écrit.`); return false; }
      try {
        return await db.runTransaction(async (tx) => {
          const s = await tx.get(stateRef);
          const cur = s.data();
          if (!cur || cur.turn !== prev.turn || cur.season !== prev.season) return false;
          tx.set(stateRef, plain(next));
          tx.set(col('gazettes').doc(`${prev.season}_${prev.turn}`), plain({ ...gazette, createdAt: Date.now() }));
          return true;
        });
      } catch (e) { this.derniereErreur = e.message; console.error('  Enregistrement refusé :', e.message); return false; }
    },
  };
}

const parties = seule ? [seule] : (await db.collection('parties').get()).docs.map((d) => d.id);
let erreurs = 0;
for (const gid of parties) {
  try {
    const n = await resolvePending(backendAdmin(gid), { hour: CONFIG.resolutionHour ?? 20, serveur: true, maxTurns: 10 });
    console.log(`Partie ${gid} : ${n} tour${n > 1 ? 's' : ''} calculé${n > 1 ? 's' : ''}.`);
  } catch (e) { erreurs++; console.error(`Partie ${gid} : erreur`, e); }
}
const { etatResolution } = await import('../../js/data/resolver.js');
if (etatResolution.erreur) { console.error('Dernière erreur de calcul :', etatResolution.erreur); erreurs++; }
process.exit(erreurs ? 1 : 0);
