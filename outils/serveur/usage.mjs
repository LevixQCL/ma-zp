// Analyse d'usage (oct. 2026, temporaire) : copie en lecture seule des données de toutes les parties dans usage.json.
// Le fichier est chiffré par la tâche GitHub avant d'être déposé (voir .github/workflows/usage.yml). Rien n'est écrit dans Firestore.
import { writeFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const sans = (o) => { if (o && typeof o === 'object') { delete o.email; delete o.ownerEmail; } return o; };
const out = { at: Date.now(), parties: [] };
for (const p of (await db.collection('parties').get()).docs) {
  const base = p.ref;
  const st = await base.collection('state').doc('current').get();
  const lire = async (n) => (await base.collection(n).get()).docs.map((d) => sans({ id: d.id, ...d.data() }));
  const [players, orders, quests, central, radio, prives, carnets] = await Promise.all(['players', 'orders', 'quests', 'central', 'radio', 'prives', 'carnets'].map(lire));
  const gazettes = (await base.collection('gazettes').select().get()).size;
  out.parties.push({ id: p.id, meta: sans(p.data()), state: st.exists ? st.data() : null, players, orders, quests, central, radio,
    prives: prives.map((x) => ({ id: x.id, participants: x.participants, n: Array.isArray(x.messages) ? x.messages.length : null, at: x.at || x.maj || null })),
    carnets: carnets.map((c) => ({ id: c.id, taille: JSON.stringify(c).length, cles: Object.keys(c) })), gazettes });
}
writeFileSync('usage.json', JSON.stringify(out));
console.log('parties :', out.parties.length);
