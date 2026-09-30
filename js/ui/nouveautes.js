// Note de mise à jour : affichée une fois sur chaque appareil après une nouvelle version,
// et consultable ensuite depuis l'HP. Le maître du jeu peut aussi l'envoyer en message privé.
import { S, esc } from './common.js';

export const NOTE_MAJ = {
  id: '2026-09-30d',
  titre: 'Mise à jour du 30 septembre : chaque service compte double',
  points: [
    ['Accidents de véhicules', 'tes véhicules peuvent avoir un accident, surtout s’ils sont usés, en rythme renforcé ou avec des équipages entassés. Accrochage : le véhicule roule cabossé et ternit ton image tant qu’il ne passe pas en carrosserie (nouvelle dépense). Sinistre : véhicule perdu, à racheter, avec une indemnité si le tiers est en tort. Détails dans le guide, rubrique Imprévus.'],
    ['Renforts : l’effort compte', 'grand événement du district, renfort sur une opération, affaire disputée, entraide : ce que tu gagnes (PS, réputation) suit désormais le nombre d’agents ou le budget que tu envoies. Un seul agent « pour la forme » rapporte peu ; l’entraide affiche la réputation prévue.'],
    ['Recherche et enquête', 'tes agents de Recherche rapportent bien plus de pièces pour l’enquête de la semaine. Nouveau : la piste prioritaire (fiche d’un suspect) concentre leurs recherches. Le pourcentage du soir est affiché dans l’Enquête.'],
    ['Intervention', 'les patrouilles restées libres après les incidents peuvent faire un flagrant délit : points, PS et un quartier apaisé.'],
    ['Accueil = assurance', 'chaque agent d’Accueil au-delà de 2 évite 15 % des tracas internes (panne, dégât des eaux, grève, papiers égarés, plainte…).'],
    ['Nouveaux imprévus', 'dégât des eaux (pièces d’enquête retardées d’un tour), grève sauvage, agent cloué au lit. Et sur les affaires disputées, une grosse équipe risque davantage un blessé.'],
    ['Carte : zones chaudes', 'tes six quartiers ont chacun leur tension, en couleur sur la carte (calme, à surveiller, tendu, chaud), avec les quartiers voisins à ta frontière en pointillés.'],
    ['Patrouilles', 'touche un quartier pour y envoyer des agents de Proximité. Plus tu concentres, plus la tension baisse à cet endroit ; à partir de 4 agents, la délinquance se déplace vers les voisins, même chez la zone d’à côté.'],
    ['Point chaud du jour', 'presque chaque jour, un quartier est signalé la veille. 2 agents sur place le désamorcent, sinon la tension y grimpe. Il apparaît dans les choses à faire de l’HP.'],
  ],
};

/** Version courte (moins de 500 caractères) pour un message privé. */
export function noteCourte() {
  return `📣 Mise à jour de Ma ZP ! Nouveau sur la Carte : tes 6 quartiers ont leur tension (zones chaudes), un point chaud est annoncé chaque jour (2 agents sur place le désamorcent) et tu peux envoyer des patrouilles de Proximité quartier par quartier. Attention, trop d'agents au même endroit repoussent la délinquance chez le voisin ! Recharge la page si besoin.`;
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
