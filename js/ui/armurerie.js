// Gestion (saison 4) : la spécialité de la zone et son armurerie.
// Deux sections courtes, chacune avec un effet qu'on voit : rien à entretenir au quotidien.
import { S, esc, myZone } from './common.js';
import { ARMURERIE, IDS_ARMURERIE, possede, achatImpossible, entretienArmurerie } from '../engine/materiel.js';
import { SPECIALITES, IDS_SPECIALITES, PALIERS_SPE, palierSpe } from '../engine/constants.js';

const IMG_SPE = new Set(['quartier', 'judiciaire', 'intervention']);
const SPRITE = { intervention: 'inter', proximite: 'prox', recherche: 'rech', roulage: 'roul', admin: 'admin' };
const keur = (v) => `${String(Math.round(v * 10) / 10).replace('.', ',')} k€`;

/** Pions des agents d'un service : un taser sur les agents d'Intervention quand l'armurerie en a. */
export function agentsService(s) {
  const z = myZone();
  const taser = s === 'intervention' && possede(z, 'taser');
  return (i) => ({
    img: `img/agents/${taser ? 'inter_taser' : SPRITE[s]}.webp`,
    cls: i % 2 ? ' m' : '',
    bdg: taser ? '<span class="ag-b y">⚡</span>' : '',
    titre: taser ? 'taser en service' : '',
    info: taser ? '⚡ Part avec un taser (armurerie).' : '',
  });
}

/** Ce que l'armurerie apporte à l'Intervention, en une ligne de puces. */
export function resumeArmurerie() {
  const z = myZone();
  const l = IDS_ARMURERIE.filter((x) => possede(z, x));
  if (!l.length) return '<div class="ag-resume"><span class="ag-chip">armurerie vide</span><button type="button" class="ag-lien" data-action="op-part" data-k="arm">Armurerie ›</button></div>';
  return `<div class="ag-resume">${l.map((x) => `<span class="ag-chip">${ARMURERIE[x].ico} ${esc(ARMURERIE[x].nom.toLowerCase())}</span>`).join('')}</div>`;
}

/** Achat du soir (un seul) : le toucher à nouveau l'annule. Renvoie true si le brouillon a changé. */
export function acheterArme(k) {
  const d = S.draft, z = myZone();
  if (!d || !z || !Object.hasOwn(ARMURERIE, k)) return false;
  const actuel = d.materiel && d.materiel.acheter;
  if (actuel === k) { d.materiel = { acheter: null }; return true; }
  if (achatImpossible(z, k)) return false;
  d.materiel = { acheter: k };
  return true;
}

export function resumeArmurerieOrdres(z, d) {
  const k = d.materiel && d.materiel.acheter;
  const n = IDS_ARMURERIE.filter((x) => possede(z, x)).length;
  if (k && ARMURERIE[k]) return `achat ce soir : ${esc(ARMURERIE[k].nom.toLowerCase())} · ${keur(ARMURERIE[k].prix)}`;
  return n ? `${n} équipement${n > 1 ? 's' : ''} sur ${IDS_ARMURERIE.length}` : 'vide · un achat par soir';
}

export function armurerieHtml(z, d) {
  const voulu = d.materiel && d.materiel.acheter;
  const ent = entretienArmurerie(z);
  return `<div class="arm-grille">${IDS_ARMURERIE.map((x) => {
    const A = ARMURERIE[x], a = possede(z, x), on = voulu === x, refus = a ? null : achatImpossible(z, x);
    const bloque = !a && !on && (refus || (voulu && voulu !== x));
    return `<button type="button" class="arm-c ${a ? 'a' : ''} ${on ? 'on' : ''}" data-action="arm-acheter" data-k="${x}" aria-pressed="${on}" ${a || bloque ? 'disabled' : ''}>
      <span class="arm-i" aria-hidden="true"><img src="img/s4/arm-${x}.webp" alt="" loading="lazy" width="48" height="48"></span>
      <span class="arm-t"><b>${esc(A.nom)}</b><span>${esc(A.effet)}</span></span>
      <span class="arm-p">${a ? 'en service' : on ? 'livré à 20:00' : `${keur(A.prix)}${A.entretien ? ` <i>+${keur(A.entretien)}/j</i>` : ''}`}</span></button>`;
  }).join('')}</div>
    <p class="tiny muted" style="margin:0">Un achat par soir, gardé pour de bon (même d’une saison à l’autre)${ent ? ` · entretien actuel ${keur(ent)} par jour` : ''}. ${voulu ? 'Touche-le à nouveau pour annuler.' : ''}</p>`;
}

export function resumeSpecialite(z, d) {
  const id = d.specialite || (z.specialite && z.specialite.id);
  const S2 = id && SPECIALITES[id];
  if (!S2) return 'à choisir';
  if (d.specialite && (!z.specialite || d.specialite !== z.specialite.id)) return `${S2.ico} ${esc(S2.nom)} · à partir de ce soir`;
  const p = palierSpe(z);
  return `${S2.ico} ${esc(S2.nom)} · palier ${p} sur 3`;
}

/** Choix de la spécialité, avec les trois paliers et la jauge du palier 3. */
export function specialiteHtml(z, d) {
  const actuelle = z.specialite && z.specialite.id;
  const choisie = d.specialite || actuelle;
  const p = palierSpe(z), jours = (z.specialite && Number(z.specialite.jours)) || 0;
  const suivant = p > 0 && p < 3 ? PALIERS_SPE[p] - jours : 0;
  const jauge = actuelle && p >= 3 ? SPECIALITES[actuelle].jauge : null;
  return `${actuelle ? `<p class="small" style="margin:0">${SPECIALITES[actuelle].ico} <b>${esc(SPECIALITES[actuelle].nom)}</b>, palier ${p} sur 3${suivant > 0 ? ` · le suivant dans ${suivant} jour${suivant > 1 ? 's' : ''} joué${suivant > 1 ? 's' : ''}` : ''}.</p>` : '<p class="small" style="margin:0">Choisis où ta zone excelle. Elle monte par paliers avec les jours joués et te suit d’une saison à l’autre.</p>'}
    ${jauge ? `<div class="jg-inter jg-solo"><div class="jg-i"><span class="jg-n">${jauge.ico} ${esc(jauge.nom)}</span><i class="jg-b"><b style="width:${Math.round(Math.min(1, z.jaugeSpe || 0) * 100)}%"></b></i><span class="jg-v">${Math.round(Math.min(1, z.jaugeSpe || 0) * 100)} %</span></div></div>` : ''}
    <div class="spe-l">${IDS_SPECIALITES.map((k) => { const x = SPECIALITES[k], on = choisie === k, ici = actuelle === k;
      return `<button type="button" class="spe-c ${on ? 'on' : ''}" data-action="specialite" data-k="${k}" aria-pressed="${on}">
        <span class="spe-h"><span class="spe-i" aria-hidden="true">${IMG_SPE.has(k) ? `<img src="img/s4/spe-${k}.webp" alt="" loading="lazy" width="40" height="40">` : x.ico}</span><b>${esc(x.nom)}</b>${ici ? '<span class="pill">en cours</span>' : ''}</span>
        <ol class="spe-p">${x.paliers.map((pl, i) => `<li class="${ici && p > i ? 'ok' : ''}"><span>${i + 1}</span>${esc(pl.t)}</li>`).join('')}</ol></button>`; }).join('')}</div>
    ${actuelle && choisie !== actuelle ? '<p class="tiny warn" style="margin:0">Changer de spécialité la fait repartir du palier 1 et vide sa jauge.</p>' : ''}
    <a class="tiny" href="#guide-specialite">Le guide des spécialités</a>`;
}
