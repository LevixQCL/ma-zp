// Publie firestore.rules dans Firebase (règles de sécurité Firestore), sans passer par la console.
// Lancé par .github/workflows/regles.yml à chaque push qui modifie firestore.rules (ou à la main).
// 1. crée un jeu de règles (Firebase vérifie la syntaxe : une erreur arrête tout, l'ancien reste en place) ;
// 2. le met en service pour Firestore.
import { readFileSync } from 'node:fs';
import { cert } from 'firebase-admin/app';

const brut = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!brut) { console.log('FIREBASE_SERVICE_ACCOUNT absent : rien à faire.'); process.exit(0); }
const sa = JSON.parse(brut), projet = sa.project_id;
const { access_token: jeton } = await cert(sa).getAccessToken();
const api = async (methode, chemin, corps) => {
  const r = await fetch(`https://firebaserules.googleapis.com/v1/${chemin}`, { method: methode, headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });
  const t = await r.text();
  if (!r.ok) { console.error(`${methode} ${chemin} : ${r.status}\n${t}`); process.exit(1); }
  return JSON.parse(t || '{}');
};
const source = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const rs = await api('POST', `projects/${projet}/rulesets`, { source: { files: [{ name: 'firestore.rules', content: source }] } });
console.log(`Règles vérifiées et enregistrées : ${rs.name}`);
const nom = `projects/${projet}/releases/cloud.firestore`;
await api('PATCH', nom, { release: { name: nom, rulesetName: rs.name } });
console.log('Règles Firestore en service.');
