// Analyse d'usage (oct. 2026, temporaire) : lecture seule des parties, puis uniquement des CHIFFRES ANONYMES
// (joueurs notés J1, J2… ; aucun pseudo, nom, texte ni identifiant). Rien n'est écrit dans Firestore.
import { writeFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const vide = (v) => v == null || v === false || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
const jour = (ms) => new Date(ms + 3600e3).toISOString().slice(5, 10);
const res = { at: Date.now(), parties: [] };
for (const p of (await db.collection('parties').get()).docs) {
  const base = p.ref;
  const st = (await base.collection('state').doc('current').get()).data();
  if (!st || Object.keys(st.zones || {}).length < 3) continue;
  const lire = async (n) => (await base.collection(n).get()).docs.map((d) => d.data());
  const [players, orders, quests, central, radio, prives] = await Promise.all(['players', 'orders', 'quests', 'central', 'radio', 'prives'].map(lire));
  const uids = [...new Set([...Object.keys(st.zones || {}), ...players.map((x) => x.uid).filter(Boolean)])];
  const premier = (u) => Math.min(...orders.filter((o) => o.uid === u).map((o) => (o.season || 0) * 1000 + (o.turn || 0)), 1e9);
  uids.sort((a, b) => premier(a) - premier(b));
  const T = (x) => `${x.season || 0}.${x.turn || 0}`;
  const joueurs = [];
  for (const u of uids) {
    const z = (st.zones || {})[u] || {};
    const os = orders.filter((o) => o.uid === u).sort((a, b) => (a.season - b.season) || (a.turn - b.turn));
    const k = {}; const prev = {}; let dem = 0, conf = 0, acc = 0, reaud = 0, recoup = 0; const rythmes = {};
    for (const o0 of os) {
      const o = o0.orders && typeof o0.orders === 'object' ? o0.orders : o0;
      for (const [c, v] of Object.entries(o)) {
        if (['uid', 'season', 'turn', 'at', 'id', 'maj'].includes(c)) continue;
        const s = JSON.stringify(v);
        const e = (k[c] ||= [0, 0]);
        if (!vide(v)) e[0]++;
        if (prev[c] !== undefined && prev[c] !== s) e[1]++;
        prev[c] = s;
      }
      if (typeof o.rythme === 'string') rythmes[o.rythme] = (rythmes[o.rythme] || 0) + 1;
      dem += Array.isArray(o.demarches) ? o.demarches.length : 0;
      if (Array.isArray(o.confront) && o.confront.length) conf++;
      if (o.accusation != null) acc++;
      if (o.reaud) reaud++;
      if (o.recoup && !vide(o.recoup)) recoup++;
    }
    const en = {}, enT = {};
    for (const q of quests.filter((q) => q.uid === u)) {
      const t = T(q), ok = q.statut === 'ok' ? 1 : 0;
      (en[t] ||= [0, 0])[0]++; en[t][1] += ok;
      (enT[q.type || '?'] ||= [0, 0])[0]++; enT[q.type || '?'][1] += ok;
    }
    const ce = {}, ceK = {};
    for (const c of central.filter((c) => c.uid === u)) { ce[T(c)] = (ce[T(c)] || 0) + 1; ceK[c.k] = (ceK[c.k] || 0) + 1; }
    const r = {}; for (const m of radio.filter((m) => m.uid === u)) { const d = jour(m.at || 0); r[d] = (r[d] || 0) + 1; }
    joueurs.push({ t: os.map(T), k, rythmes, dem, conf, acc, reaud, recoup, en, enT, ce, ceK, r,
      pv: prives.filter((x) => (x.participants || []).includes(u)).length,
      z: { joined: z.joinedTurn ?? null, arrivee: z.arrivee ? jour(z.arrivee) : null, sansOrdres: z.toursSansOrdres ?? null, ipz: z.ipz ?? null, agents: z.agents ?? null, ps: z.ps ?? null,
        trophees: Array.isArray(z.trophees) ? z.trophees.length : null, retire: !!(players.find((x) => x.uid === u) || {}).retire, stats: z.stats || null } });
  }
  res.parties.push({ saison: st.season, tour: st.turn, deadline: st.nextDeadline, nZones: uids.length, n: { ordres: orders.length, enigmes: quests.length, central: central.length, radio: radio.length, prives: prives.length }, joueurs });
}
// En base64 (GitHub masque les accolades, lignes du secret JSON, dans la sortie), par morceaux de 3 500 caractères
// (taille gardée d'une annotation) ; 10 annotations « notice » au plus par étape (fichiers m1, m2…).
const txt = Buffer.from(JSON.stringify(res)).toString('base64');
const L = 3500, n = Math.ceil(txt.length / L);
console.log(`taille ${txt.length}, ${n} morceaux`);
if (n > 50) throw new Error('trop gros');
for (let i = 0; i < n; i++) writeFileSync(`m${i + 1}`, `::notice title=usage-${i + 1}-${n}::${txt.slice(i * L, (i + 1) * L)}\n`);
