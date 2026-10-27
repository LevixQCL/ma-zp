// Analyse d'usage (oct. 2026, temporaire) : lecture seule des parties, puis uniquement des CHIFFRES ANONYMES
// (joueurs notés J1, J2… ; aucun pseudo, nom, texte ni identifiant). Rien n'est écrit dans Firestore.
import { writeFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const vide = (v) => v == null || v === false || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
// Forme d'une valeur sans son contenu textuel : nombres et booléens gardés, textes réduits à leur longueur.
const forme = (v, d = 0) => {
  if (v == null || typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') return `s${v.length}`;
  if (Array.isArray(v)) return d >= 1 ? `a${v.length}` : { n: v.length };
  if (d >= 1) return `o${Object.keys(v).length}`;
  const o = {}; for (const [k, x] of Object.entries(v)) o[k] = forme(x, d + 1); return o;
};
const res = { at: Date.now(), parties: [] };
for (const p of (await db.collection('parties').get()).docs) {
  const base = p.ref;
  const st = (await base.collection('state').doc('current').get()).data();
  if (!st) continue;
  const lire = async (n) => (await base.collection(n).get()).docs.map((d) => d.data());
  const [players, orders, quests, central, radio, prives] = await Promise.all(['players', 'orders', 'quests', 'central', 'radio', 'prives'].map(lire));
  // Anonymisation : ordre d'arrivée dans la partie.
  const uids = [...new Set([...Object.keys(st.zones || {}), ...players.map((x) => x.uid).filter(Boolean)])];
  const premier = (u) => Math.min(...orders.filter((o) => o.uid === u).map((o) => (o.season || 0) * 1000 + (o.turn || 0)), 1e9);
  uids.sort((a, b) => premier(a) - premier(b));
  const J = Object.fromEntries(uids.map((u, i) => [u, `J${i + 1}`]));
  const T = (x) => `${x.season || 0}.${x.turn || 0}`;
  const joueurs = {};
  for (const u of uids) {
    const z = (st.zones || {})[u] || null;
    const os = orders.filter((o) => o.uid === u).sort((a, b) => (a.season - b.season) || (a.turn - b.turn));
    const cles = {}; let allocChange = 0, prev = null;
    const parTour = {};
    for (const o0 of os) {
      const o = o0.orders && typeof o0.orders === 'object' ? { ...o0.orders, season: o0.season, turn: o0.turn } : o0;
      const t = T(o0); parTour[t] = { cles: [] };
      for (const [k, v] of Object.entries(o)) if (!['uid', 'season', 'turn', 'at', 'id', 'maj'].includes(k) && !vide(v)) { cles[k] = (cles[k] || 0) + 1; parTour[t].cles.push(k); }
      if (o.demarches) parTour[t].dem = o.demarches.length;
      if (o.accusation != null) parTour[t].acc = 1;
      if (o.confront && o.confront.length) parTour[t].conf = o.confront.length;
      const a = JSON.stringify(o.alloc || {}); if (prev !== null && a !== prev) allocChange++; prev = a;
    }
    const qs = quests.filter((q) => q.uid === u);
    const qParTour = {}; for (const q of qs) { const t = T(q); (qParTour[t] ||= []).push(`${q.type || '?'}:${q.statut || '?'}`); }
    const cs = central.filter((c) => c.uid === u);
    const cParTour = {}; for (const c of cs) { const t = T(c); (cParTour[t] ||= {})[c.k] = ((cParTour[t] || {})[c.k] || 0) + 1; }
    const pl = players.find((x) => x.uid === u) || {};
    joueurs[J[u]] = {
      ordres: os.length, toursOrdres: os.map(T), cles, allocChange, parTour,
      enigmes: qs.length, enigmesParTour: qParTour, central: cs.length, centralParTour: cParTour,
      radio: radio.filter((m) => m.uid === u).length, radioDerniers: radio.filter((m) => m.uid === u).map((m) => m.at || 0).sort().slice(-5),
      prives: prives.filter((x) => (x.participants || []).includes(u)).length,
      profil: forme(Object.fromEntries(Object.entries(pl).filter(([k]) => !['uid', 'nom', 'pseudo', 'email', 'code'].includes(k)))),
      zone: z ? forme(Object.fromEntries(Object.entries(z).filter(([k]) => !['uid', 'nom', 'pseudo', 'code', 'rapport'].includes(k)))) : null,
    };
  }
  const etat = forme(Object.fromEntries(Object.entries(st).filter(([k]) => k !== 'zones')));
  res.parties.push({ p: res.parties.length + 1, saison: st.season, tour: st.turn, nZones: uids.length, ordres: orders.length, enigmes: quests.length, central: central.length, radio: radio.length, radioSansUid: radio.filter((m) => !m.uid).length, prives: prives.length, etat, joueurs });
}
// Sortie en annotations (lisibles par l'API GitHub), par morceaux.
// En base64 : GitHub masque les accolades (lignes du secret JSON) dans la sortie.
const txt = Buffer.from(JSON.stringify(res)).toString('base64');
const n = Math.ceil(txt.length / 60000);
console.log(`taille ${txt.length}, ${n} morceaux`);
if (n > 40) throw new Error('trop gros');
// GitHub garde au plus 10 annotations « notice » par étape : chaque étape de la tâche en affiche 10 (fichiers m1, m2…).
for (let i = 0; i < n; i++) writeFileSync(`m${i + 1}`, `::notice title=usage-${i + 1}-${n}::${txt.slice(i * 60000, (i + 1) * 60000).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}\n`);
