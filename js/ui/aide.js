// Aides rapides (bouton « ? ») : l'essentiel d'une jauge en quelques lignes, sans ouvrir le guide.
import { esc } from './common.js';
import { IPZ_POIDS, START, ECONOMIE } from '../engine/constants.js';
import { PERIL } from '../engine/rivalites.js';

const pc = (w) => `${Math.round(w * 100)} %`;

export const AIDES = {
  ipz: {
    titre: 'IPZ · Indice de performance de zone',
    intro: 'Ton score du jour, sur 100, recalculé à chaque tour à 20:00. La moyenne de tes IPZ fait ton classement de la saison (dès 5 tours joués).',
    lignes: [
      `<strong>Satisfaction</strong> citoyenne : ${pc(IPZ_POIDS.satisfaction)}`,
      `<strong>Résultats</strong> : ${pc(IPZ_POIDS.affaires)} (part des incidents traités + points gagnés dans la journée)`,
      `<strong>Moral</strong> : ${pc(IPZ_POIDS.moral)}`,
      `<strong>Budget</strong> : ${pc(IPZ_POIDS.budget)} (0 k€ = 50/100, chaque k€ en plus ou en moins compte)`,
      `<strong>Réputation</strong> : ${pc(IPZ_POIDS.reputation)}`,
    ],
    conseil: 'Le levier principal : traiter tous les incidents et garder les citoyens contents.',
    guide: 'guide-zone',
  },
  moral: {
    titre: 'Moral des troupes',
    intro: 'La jauge qui pèse sur tout : elle multiplie l’efficacité de tous tes agents.',
    lignes: [
      '<strong>Efficacité</strong> : de 60 % (moral 0) à 120 % (moral 100)',
      '<strong>Sous 40</strong> : 10 % des agents restent absents',
      '<strong>Sous 20</strong> : un agent démissionne à chaque tour',
      `<strong>Sous ${PERIL.moral}</strong> : ta zone passe en péril (risque de faillite)`,
      `<strong>IPZ</strong> : compte pour ${pc(IPZ_POIDS.moral)} · au-dessus de 70, moins de grippes et de débauchages`,
    ],
    monte: 'rythme allégé, prime, salle de sport, succès',
    baisse: 'rythme renforcé, incidents ratés, budget négatif, erreurs aux énigmes, coups durs',
    guide: 'guide-zone',
  },
  satisfaction: {
    titre: 'Satisfaction citoyenne',
    intro: 'Ce que la population pense de ta zone. C’est la plus grosse part de ton IPZ.',
    lignes: [
      `<strong>IPZ</strong> : compte pour ${pc(IPZ_POIDS.satisfaction)}, le poids le plus lourd`,
      '<strong>Chaque incident raté</strong> : −1,8',
      '<strong>Criminalité au-dessus de 55</strong> : elle baisse chaque jour',
      '<strong>Roulage au-delà de 25 % des effectifs</strong> : « chasse aux PV », −2',
    ],
    monte: 'incidents traités, Proximité, dossiers élucidés, opérations et FIPA réussies, arrestations',
    baisse: 'incidents ratés, criminalité élevée, vieux dossiers, fiascos, FIPA ratées',
    guide: 'guide-zone',
  },
  reputation: {
    titre: 'Réputation auprès des collègues',
    intro: 'Ce que les autres zones pensent de toi. C’est la jauge de la coopération.',
    lignes: [
      `<strong>IPZ</strong> : compte pour ${pc(IPZ_POIDS.reputation)}`,
      '<strong>Au-dessus de 60</strong> : moins de plaintes contre ta zone',
      '<strong>Duels</strong> : le perdant cède de la réputation au gagnant',
      '<strong>Manœuvres</strong> : chacune coûte de la réputation, réussie ou non',
    ],
    monte: 'partager des indices, aider une zone en péril, FIPA partagées, affaires gagnées à deux, arrestations',
    baisse: 'fausses accusations, manœuvres, blâme du Conseil, fiascos',
    guide: 'guide-zone',
  },
  budget: {
    titre: 'Budget',
    intro: `Tu reçois ${ECONOMIE.dotation} k€ par tour. Les salaires et l’entretien sont prélevés chaque nuit.`,
    lignes: [
      `<strong>Salaires</strong> : ${String(ECONOMIE.salaire).replace('.', ',')} k€ par agent et par tour`,
      `<strong>Entretien</strong> : ${String(ECONOMIE.entretienVehicule).replace('.', ',')} k€ par véhicule et par tour`,
      '<strong>Deux tours de suite en négatif</strong> : Inspection générale, 5 k€ d’amende et −5 de satisfaction',
      `<strong>Sous ${PERIL.budget} k€</strong> : ta zone passe en péril`,
    ],
    guide: 'guide-zone',
  },
};

/** Petit bouton « ? » qui ouvre l'aide rapide. */
export function aideBtn(k, label) {
  return `<button type="button" class="help" data-action="aide" data-k="${k}" aria-label="${esc(label || `Aide : ${AIDES[k].titre}`)}">?</button>`;
}

/** Fenêtre d'aide, posée en haut de l'écran. */
export function ouvrirAide(k) {
  const a = AIDES[k];
  if (!a) return;
  document.querySelector('.aide-wrap')?.remove();
  const retour = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="aide-titre">
    <div class="between" style="align-items:flex-start"><h2 id="aide-titre" class="aide-titre">${a.titre}</h2>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <p class="aide-intro">${a.intro}</p>
    <ul class="aide-liste">${a.lignes.map((l) => `<li>${l}</li>`).join('')}</ul>
    ${a.monte ? `<div class="aide-sens"><span class="up">▲ Monte</span><span>${a.monte}</span><span class="down">▼ Baisse</span><span>${a.baisse}</span></div>` : ''}
    ${a.conseil ? `<p class="aide-conseil">${a.conseil}</p>` : ''}
    <a class="small" href="#${a.guide}" data-close>Tout le détail dans le guide</a>
  </div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); if (retour && retour.focus) retour.focus(); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) { fermer(); return; }
    const c = e.target.closest('[data-close]');
    if (c) { e.stopPropagation(); if (c.tagName !== 'A') e.preventDefault(); fermer(); }
  });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
  wrap.querySelector('[data-close]').focus();
}
