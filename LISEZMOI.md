# Ma ZP — District Delta (version 1)

Jeu de gestion de zone de police fictive, entre collègues. Un tour par jour, résolu à 20:00.

## Contenu du dossier

| Élément | Rôle |
| --- | --- |
| `index.html` | Page du jeu |
| `js/config.js` | **Le seul fichier à modifier** : configuration Firebase et adresse du maître du jeu |
| `firestore.rules` | Règles de sécurité à coller dans la console Firebase (remplacer l'adresse e-mail) |
| `js/engine/` | Moteur du jeu (règles, résolution des tours, équilibrage dans `constants.js`) |
| `js/quests/` | Générateurs des quêtes du jour |
| `js/data/` | Stockage : mode démo (sur l'appareil) ou Firebase (en ligne) |
| `js/ui/` | Écrans |
| `css/`, `icons/`, `manifest.webmanifest`, `sw.js` | Apparence, icônes et installation sur téléphone |

## Mode démo

Tant que `apiKey` est vide dans `js/config.js`, le jeu tourne en mode démo, sur l'appareil, avec 5 zones robots.
Une fois Firebase configuré, ajoutez `?demo` à l'adresse pour retrouver la démo.

## Mise en ligne

Suivez le guide « Ma ZP — Guide de mise en ligne ».

## Ajuster l'équilibrage

Toutes les valeurs chiffrées (budget, coûts, effets) sont dans `js/engine/constants.js` et `js/engine/resolve.js`.
Les textes (affaires, événements, aléas) sont dans `js/engine/contenu.js`.
