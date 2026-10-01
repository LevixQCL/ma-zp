// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-10-01b',
  titre: 'Mise à jour du 1er octobre : la zone de non-droit',
  points: [
    ['Le centre de la ville est aux mains du milieu', 'huit secteurs hachurés de rouge et un QG au milieu. Les zones ont été redessinées une fois pour toutes autour de lui : tes quartiers ont changé de place sur la carte.'],
    ['Sans candidature', 'chacun envoie ses agents où il veut depuis le Terrain. Les forces du soir s’additionnent, +20 % par zone en plus : seul on n’y arrive pas, à trois ça tombe en quelques soirs. Une zone qui ne joue pas ne bloque plus personne.'],
    ['Ce que ça rapporte', 'à la reprise, chaque zone présente reçoit la même part fixe (points, satisfaction, réputation, moral) ; ensuite, chaque nuit tant que le secteur tient. Il faut y laisser 2 ou 3 agents de garde, sinon le milieu le reprend.'],
    ['Le QG', 'il s’ouvre quand trois secteurs sont tenus en même temps, rapporte deux fois et demie plus et donne le trophée « Libérateur ».'],
    ['Fin des affaires disputées', 'plus besoin d’attendre qu’une zone accepte ta candidature : la zone de non-droit les remplace. Le Terrain montre qui y était hier soir, et un bouton prévient la radio.'],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Mise à jour de Ma ZP : la zone de non-droit ! Le centre de la ville est aux mains du milieu. Envoie tes agents depuis le Terrain, sans candidature : les forces s'additionnent, +20 % par zone en plus. Chaque zone présente touche la même part à la reprise, puis chaque nuit tant que le secteur tient. Les affaires disputées disparaissent. Les zones ont été redessinées autour du centre.`;
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
