// Construit js/app.min.js : tout le code du jeu (js/**) rassemblé en un seul fichier compacté.
// Pourquoi : chargés un par un, les ~60 modules partaient en cascade (13 niveaux d'imports), soit
// 13 allers-retours réseau successifs. Sur iPhone en 4G, le chargement dépassait parfois 25 s.
// Usage (à relancer après chaque modification de js/) : node outils/construire.mjs
// Nécessite esbuild : npx --yes esbuild@0.24.2 --version (ou npm i -g esbuild).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const racine = new URL('..', import.meta.url).pathname;
export const SORTIE = 'js/app.min.js';

/** Empreinte de toutes les sources (pour vérifier que le fichier construit est à jour). */
export function empreinteSources() {
  const fichiers = [];
  const parcourir = (d) => { for (const f of readdirSync(d).sort()) { const p = join(d, f); if (statSync(p).isDirectory()) parcourir(p); else if (p.endsWith('.js') && !p.endsWith('app.min.js')) fichiers.push(p); } };
  parcourir(join(racine, 'js'));
  const h = createHash('sha256');
  for (const f of fichiers) { h.update(relative(racine, f)); h.update(readFileSync(f)); }
  return h.digest('hex').slice(0, 16);
}

function trouverEsbuild() {
  const require = createRequire(import.meta.url);
  for (const p of ['esbuild', process.env.ESBUILD_PATH].filter(Boolean)) { try { return require(p); } catch {} }
  const global = execSync('npm root -g').toString().trim();
  try { return require(join(global, 'esbuild')); } catch {}
  throw new Error('esbuild introuvable : npm i -g esbuild@0.24.2 (ou ESBUILD_PATH=/chemin/vers/node_modules/esbuild)');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const esbuild = trouverEsbuild();
  const empreinte = empreinteSources();
  await esbuild.build({
    entryPoints: [join(racine, 'js/app.js')],
    outfile: join(racine, SORTIE),
    bundle: true, minify: true, format: 'esm', target: ['safari14', 'chrome90', 'firefox90'],
    external: ['https://*'],
    legalComments: 'none', charset: 'utf8',
    banner: { js: `/* Ma ZP — fichier construit par outils/construire.mjs, ne pas modifier à la main. sources:${empreinte} */` },
  });
  console.log(`${SORTIE} construit (${(statSync(join(racine, SORTIE)).size / 1024).toFixed(0)} Ko), sources:${empreinte}`);
}
