# Ma ZP — consignes de travail

- `index.html` charge `js/app.min.js`, construit à partir de `js/` par `node outils/construire.mjs` (esbuild).
  **Après toute modification d'un fichier de `js/`, relancer la construction et committer `js/app.min.js` avec le reste**, sinon les joueurs ne voient pas le changement. `node test/construit.test.mjs` vérifie que le fichier est à jour.
- Parcours complet en navigateur : servir le dossier (ex. `http-server -p 8765 -c-1 .`) puis `node test/browser.mjs <dossier-captures> "http://127.0.0.1:8765/?demo"`.
