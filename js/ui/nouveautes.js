// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';
import { fondateurAVoir, ouvrirFondateur } from './fondateurs.js';

export const NOTE_MAJ = {
  id: '2026-11-saison-4',
  titre: '🚔 Saison 4',
  action: { label: 'Ouvrir l’enquête', ouvrir: () => { location.hash = '#enquete'; } },
  // Pop-up à l'ouverture : seulement ce que le joueur va découvrir et aimer.
  essentiel: [
    ['🔎', 'L’enquête en direct', 'lance une démarche quand tu veux : la pièce arrive après son temps de recherche, sans attendre 20:00. Convoque le suspect quand tu es sûr : le verdict tombe sous tes yeux, étape par étape.'],
    ['🗂️', 'Ton dossier, ton rythme', 'chaque zone a son propre dossier, partager reste un choix. Un échec ne coûte plus la journée : le suspect est relâché quelques heures, tu peux revenir à la charge.'],
    ['🧭', 'Une spécialité qui grandit', 'Routière, De quartier, Judiciaire ou D’intervention : trois paliers gagnés en jouant, une jauge au dernier. Elle te suit de saison en saison.'],
    ['🦺', 'L’armurerie', 'cinq achats clairs, gardés pour de bon : gilets, tasers, bodycams, casques et boucliers, radios. Un par soir, utile dès le lendemain.'],
    ['🧹', 'Un jeu plus léger', 'six onglets, une Gestion plus courte et plus de temps pour l’enquête, la carte et les énigmes.'],
  ],

  sections: [
    ['L’enquête en direct', [
      ['Démarches', 'jusqu’à 5 par jour, 2 en cours en même temps (3 avec 8 enquêteurs ou plus). Chacune rend sa pièce après 1 h 30 à 3 h ; tes agents de Recherche d’hier et la spécialité judiciaire les accélèrent. Le coût est débité à 20:00.'],
      ['Réaudition et recoupement', 'un de chaque par jour, en plus des démarches.'],
      ['Confrontation', 'choisis le suspect et les pièces à lui opposer. Le verdict arrive en 45 minutes : audition, interrogatoire, parquet. Le parquet ferme 45 minutes avant 20:00.'],
      ['Si ça rate', 'dossier incomplet : refusé sans pénalité. Le suspect nie : −1 de réputation, et il est relâché 6 heures. Un innocent accusé : −3, et tu ne peux plus accuser sur l’affaire.'],
      ['La découverte', 'annoncée à 20:00 dans la Gazette, partagée entre toutes les zones qui ont vu juste le même jour. Une affaire dure 10 jours au plus.'],
    ]],
    ['Ta zone', [
      ['Spécialité', 'dans Gestion. Palier 1 tout de suite, palier 2 après 3 jours joués, palier 3 après 7. En changer la fait repartir du palier 1.'],
      ['Armurerie', 'dans Gestion. L’ancien matériel encore valide est repris : gilets, tasers, bodycams, casques.'],
      ['Ton adjoint', 'il tient la zone les jours sans ordres, selon ta consigne (prudente, équilibrée, offensive), réglée dans ton Profil. À ton retour, il te laisse un mot.'],
      ['Trophées', 'ils restent acquis. Ceux qui ne se gagnent plus sont marqués « ancien ».'],
    ]],
    ['Ce qui part', [
      ['Simplifié', 'le chef de corps, la brigade, les pactes et défis, le Conseil, les FIPA, la salle des ventes, les crises, les relèves, les coups de filet, les tuyaux, les patrouilles ciblées et le point chaud. Ce que tu avais gagné (PS, grades, trophées, skins, bâtiments) reste.'],
    ]],
    ['Ce qui reste', [
      ['Tout le reste', 'la carte et la zone de non-droit à plusieurs, les renforts, le Central, les énigmes, les mini-jeux, le Challenge, la Gazette, la répartition, le rythme, les dépenses, la grande décision, les bâtiments et la flotte.'],
    ]],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return '📣 Saison 4 à la ZP ! L’enquête se joue en direct : lance tes démarches quand tu veux, la pièce arrive après son temps de recherche, et le verdict de la confrontation tombe sous tes yeux. Nouvelle spécialité à paliers et armurerie simple dans Gestion. Un jeu plus léger, six onglets. Bon jeu !';
}


const cle = () => `mazp-maj-vue-${NOTE_MAJ.id}`;
const avantSaison2 = () => false;
const SECTION_S2 = /^(Saison 2|La Gazette en cartes|L’enquête en dossier|La zone de non-droit en rôles|La nouvelle carte et l’onglet Chef|Les énigmes en dossier|Le nouvel HP)/;
const pasPret = () => !!(NOTE_MAJ.pret && !NOTE_MAJ.pret(S.state));
export function noteVue() { if (avantSaison2() || pasPret()) return true; try { return !!localStorage.getItem(cle()); } catch (e) { return true; } }

/** Fenêtre « Nouveautés » : l'essentiel (à l'ouverture du jeu) ou la liste complète (menu de l'HP). */
export function ouvrirNouveautes({ complet = true } = {}) {
  const avant = avantSaison2();
  if (avant || pasPret()) complet = true;
  else try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ }
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  const corps = complet
    ? NOTE_MAJ.sections.filter(([titre]) => (!avant || !SECTION_S2.test(titre)) && !(pasPret() && NOTE_MAJ.sectionPret && NOTE_MAJ.sectionPret.test(titre))).map(([titre, pts]) => `<h3 class="kicker" style="margin:6px 0 0">${esc(titre)}</h3>
      <ul class="aide-liste">${pts.map(([t, x]) => `<li><strong>${esc(t)}</strong> : ${esc(x)}</li>`).join('')}</ul>`).join('')
    : `<div class="col" style="gap:10px">${NOTE_MAJ.essentiel.map(([ico, t, x]) => `<div class="row" style="gap:10px;align-items:flex-start">
        <span aria-hidden="true" style="font-size:22px;line-height:1.1">${ico}</span>
        <span class="small" style="line-height:1.4"><strong>${esc(t)}</strong><br><span class="muted">${esc(x)}</span></span></div>`).join('')}</div>`;
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="maj-titre">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="kicker">Nouveautés</span><h2 id="maj-titre" class="aide-titre">${esc(complet ? 'Toutes les nouveautés' : NOTE_MAJ.titre)}</h2></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    ${corps}
    ${complet ? '<p class="tiny muted" style="margin:0">Le guide du joueur est à jour. Bon jeu !</p>' : ''}
    ${!complet && NOTE_MAJ.action ? `<button class="btn primary block" data-go>${esc(NOTE_MAJ.action.label)}</button>` : ''}
    <button class="btn ${!complet && NOTE_MAJ.action ? 'ghost' : 'primary'} block" data-close>C’est parti</button>
    ${complet ? '' : '<button class="btn ghost small block" data-tout>Voir toutes les nouveautés</button>'}
  </div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-go]')) { e.stopPropagation(); fermer(); NOTE_MAJ.action.ouvrir(); return; }
    if (e.target.closest('[data-tout]')) { e.stopPropagation(); fermer(); ouvrirNouveautes({ complet: true }); return; }
    if (e.target === wrap || e.target.closest('[data-close]')) { e.stopPropagation(); fermer(); }
  });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
}

/** À appeler après l'affichage de l'HP : montre la note une fois par appareil. */
export function nouveautesAuBesoin() {
  // Zone fondatrice : l'annonce passe d'abord (une seule fois), puis les nouveautés s'enchaînent.
  if (!S.majMontree && S.tuto == null && !document.querySelector('.aide-wrap') && fondateurAVoir()) {
    S.majMontree = true;
    setTimeout(() => ouvrirFondateur(() => { S.majMontree = false; nouveautesAuBesoin(); }), 400);
    return;
  }
  if (S.majMontree || noteVue() || S.tuto != null || document.querySelector('.aide-wrap')) return;
  if (!S.state) return;
  S.majMontree = true;
  // Nouveau joueur : les « nouveautés » ne le concernent pas, il découvre tout en même temps.
  const z = S.state && S.user && S.state.zones[S.user.uid];
  // (au changement de saison, toursJoues repart à 0 : un ancien joueur a alors un héritage ou un bilan de saison.)
  if (z && !z.toursJoues && !z.heritage && !z.bilan) { try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ } return; }
  setTimeout(() => ouvrirNouveautes({ complet: false }), 400);
}
