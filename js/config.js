// ─────────────────────────────────────────────────────────────
//  CONFIGURATION DE « MA ZP »
//  C'est le seul fichier à modifier pour la mise en ligne.
//  Le guide de mise en ligne explique où trouver chaque valeur.
// ─────────────────────────────────────────────────────────────

export const CONFIG = {
  // Collez ici la configuration de votre projet Firebase
  // (Console Firebase → Paramètres du projet → Vos applications → Config).
  // Tant que apiKey est vide, le jeu tourne en MODE DÉMO (sur l'appareil, avec des zones robots).
  firebase: {
  apiKey: "AIzaSyChG10hCqcHNwST2Nz_HPrWXYsOB7CVRak",

  authDomain: "ma-zp-f31fb.firebaseapp.com",

  projectId: "ma-zp-f31fb",

  appId: "1:779779456090:web:898166c6e7d3bdc03e6c63",

  },

  // Adresse(s) e-mail du super-administrateur : maître du jeu de toutes les parties.
  // Doit correspondre à l'adresse utilisée pour se connecter au jeu, et à celle des règles Firestore.
  adminEmails: ['houben.bryan@gmail.com'],

  // Nombre de parties qu'un joueur peut créer (le même nombre que dans firestore.rules).
  maxPartiesParJoueur: 3,

  // Heure de résolution des tours (heure belge).
  resolutionHour: 20,

  // Graine du hasard : changez-la pour obtenir d'autres affaires et d'autres énigmes.
  seed: 'district-delta',
};
