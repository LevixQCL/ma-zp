// Les voitures animées (animateMotion rotate="auto") ne doivent jamais être parcourues à rebours
// via keyPoints="1;0" : l'orientation suit alors le tracé d'origine et la voiture roule en marche
// arrière, phares à l'arrière. Pour le sens inverse, il faut inverser le tracé lui-même.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const fichiers = [];
const parcourir = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) parcourir(p); else if (/\.(m?js|html)$/.test(n) && !n.endsWith('.min.js')) fichiers.push(p); } };
['js', 'minijeux'].forEach(parcourir);

let pb = 0;
for (const p of fichiers) {
  const s = readFileSync(p, 'utf8');
  for (const m of s.matchAll(/<animateMotion[^>]*>/g)) {
    const t = m[0];
    if (/rotate="auto/.test(t) && /keyPoints=/.test(t) && /1;0|'1;0'|"1;0"/.test(t)) { pb++; console.error(`✗ ${p} : animateMotion rotate="auto" parcouru à rebours (keyPoints 1;0)`); }
  }
}
if (pb) { console.error(`${pb} problème(s)`); process.exit(1); }
console.log(`✓ voitures-sens : ${fichiers.length} fichiers, aucune voiture en marche arrière`);
