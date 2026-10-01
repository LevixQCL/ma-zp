// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-10-01a',
  titre: 'Mise à jour du 30 septembre : le district prend vie',
  points: [
    ['Affaires disputées mieux payées', 'une affaire résolue rapporte maintenant une prime en argent (environ 0,6 k€ par point annoncé, partagée selon les agents), en plus du moral, de la réputation et de la satisfaction. Le montant s’affiche sur chaque affaire.'],
    ['Early bird', 'merci d’être là depuis le début : une roulette t’attend sur l’HP pour gagner un skin exclusif (friterie, fort, base orbitale, grange, hangar à dirigeable, roulotte de cirque…).'],
    ['Champion de la semaine', 'le meilleur IPZ moyen de la semaine porte une étoile dorée sur son toit pendant 7 jours. Le podium de fin de saison reçoit une plaque à côté de son entrée, pour toujours.'],
    ['Décors d’événement', 'Halloween, Saint-Nicolas, Carnaval, Dragon de la Ducasse : pendant ces périodes, aide au grand événement ou fais une découverte dans l’enquête pour gagner un décor en édition limitée.'],
    ['Les manœuvres laissent des traces', 'affiches de recrutement, cartons de dossiers emportés, voiture de l’Inspection ou tente d’un poste avancé : tout le monde voit qui a été visé.'],
    ['20:00', 'à ta première visite après la résolution, tes combis sortent en patrouille, gyrophares allumés.'],
    ['Les zones du district', 'sur la Carte, fais défiler les commissariats de toutes les zones et touche-en un pour le visiter.'],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Mise à jour de Ma ZP ! Roulette Early bird pour gagner un skin exclusif, étoile du champion de la semaine, plaques du podium, décors d'événement en édition limitée (Halloween, Saint-Nicolas, Carnaval, Dragon de la Ducasse), traces des manœuvres, et tes combis qui partent en patrouille à 20:00.`;
}


const cle = () => `mazp-maj-vue-${NOTE_MAJ.id}`;
export function noteVue() { try { return !!localStorage.getItem(cle()); } catch (e) { return true; } }

/** Fenêtre « Nouveautés ». */
export function ouvrirNouveautes() {
  try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ }
  document.querySelector('.aide-wrap')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="maj-titre">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="kicker">Nouveautés</span><h2 id="maj-titre" class="aide-titre">${esc(NOTE_MAJ.titre)}</h2></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <ul class="aide-liste">${NOTE_MAJ.points.map(([t, x]) => `<li><strong>${esc(t)}</strong> : ${esc(x)}</li>`).join('')}</ul>
    <p class="tiny muted" style="margin:0">Le guide du joueur est à jour. Bon jeu !</p>
    <button class="btn primary block" data-close>C’est parti</button>
  </div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) { e.stopPropagation(); fermer(); } });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
}

/** À appeler après l'affichage de l'HP : montre la note une fois par appareil. */
export function nouveautesAuBesoin() {
  if (S.majMontree || noteVue() || S.tuto != null || document.querySelector('.aide-wrap')) return;
  S.majMontree = true;
  // Nouveau joueur : les « nouveautés » ne le concernent pas, il découvre tout en même temps.
  const z = S.state && S.user && S.state.zones[S.user.uid];
  if (z && !z.toursJoues) { try { localStorage.setItem(cle(), '1'); } catch (e) { /* pas de stockage */ } return; }
  setTimeout(ouvrirNouveautes, 400);
}
