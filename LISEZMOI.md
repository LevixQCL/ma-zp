# Ma ZP — District Delta (version 1)

Jeu de gestion de zone de police fictive, entre collègues. Un tour par jour, résolu à 20:00.

## Contenu du dossier

| Élément | Rôle |
| --- | --- |
| `index.html` | Page du jeu |
| `js/config.js` | **Le seul fichier à modifier** : configuration Firebase et adresse du maître du jeu |
| `firestore.rules` | Règles de sécurité à coller dans la console Firebase (remplacer l'adresse e-mail) |
| `js/engine/` | Moteur du jeu (règles, résolution des tours, équilibrage dans `constants.js`) |
| `js/quests/` | Générateurs des énigmes du jour |
| `js/data/` | Stockage : mode démo (sur l'appareil) ou Firebase (en ligne) |
| `js/ui/` | Écrans |
| `minijeux/` | Mini-jeux des incidents du jour (pages ouvertes en plein écran) ; sources et script de construction dans `minijeux/src/` |
| `css/`, `icons/`, `manifest.webmanifest` | Apparence, icônes et installation sur téléphone |
| `js/app.min.js` | **Fichier construit** : tout le code de `js/` en un seul fichier compacté (c'est lui que charge `index.html`). À reconstruire après chaque modification de `js/` : `node outils/construire.mjs` (le test `test/construit.test.mjs` signale s'il est en retard) |
| `sw.js` | Service worker : revérifie chaque fichier auprès du serveur (pas de mélange d'anciens et de nouveaux fichiers après une mise à jour) et sert la dernière copie hors connexion |

## Mode démo

Tant que `apiKey` est vide dans `js/config.js`, le jeu tourne en mode démo, sur l'appareil, avec 5 zones robots.
Une fois Firebase configuré, ajoutez `?demo` à l'adresse pour retrouver la démo.

## Mise en ligne

Suivez le guide « Ma ZP — Guide de mise en ligne ».

## Ajuster l'équilibrage

Toutes les valeurs chiffrées (budget, coûts, effets) sont dans `js/engine/constants.js` et `js/engine/resolve.js`.
Les textes (affaires, événements, aléas) sont dans `js/engine/contenu.js`.

## Nombre de joueurs

Il n'y a pas de limite fixe. Le monde de base accueille environ 25 zones autour de la zone de non-droit ; au-delà, la carte s'agrandit d'une couronne de quartiers à la fois, sans déplacer les zones déjà installées. La vraie limite est la taille du document « état » dans Firestore (1 Mo) : environ 5,5 Ko par zone (le rapport du soir, le journal des jauges et le relevé du budget sont rangés dans la Gazette du tour, pas dans l'état), soit environ 570 Ko à 100 zones. Les inscriptions sont donc fermées à 100 zones (`MAX_ZONES` dans `js/engine/constants.js`, et la même valeur dans `firestore.rules`).

Pour que les grandes parties restent équitables à l'enquête, chaque zone ne traite que 2 pièces partagées par soir (`ENQ.maxRecus` dans `js/engine/enquete.js`), et la résistance du milieu dans la zone de non-droit suit le nombre de zones actives (`ND` dans `js/engine/constants.js`).
