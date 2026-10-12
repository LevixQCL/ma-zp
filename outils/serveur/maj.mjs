// Pousse la mise à jour du jeu tout de suite (sans attendre le tour de 20:00) : relève la version minimale du client
// dans chaque partie. Les appareils encore sur une ancienne version voient aussitôt le bandeau « Mettre à jour ».
// Lancé à la main par .github/workflows/maj.yml. Ne touche à rien d'autre dans l'état de la partie.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { APP_VERSION } from '../../js/engine/constants.js';

const brut = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!brut) { console.log('FIREBASE_SERVICE_ACCOUNT absent : rien à faire.'); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(brut)) });
const db = getFirestore();
const parties = await db.collection('parties').listDocuments();
for (const p of parties) {
  const ref = p.collection('state').doc('current');
  const avant = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) return null;
    const v = s.data().minClientVersion || 0;
    if (v < APP_VERSION) tx.update(ref, { minClientVersion: APP_VERSION });
    return v;
  });
  console.log(`${p.id} : ${avant == null ? 'pas d’état' : avant < APP_VERSION ? `version minimale ${avant} → ${APP_VERSION}` : `déjà à ${avant}`}`);
}
