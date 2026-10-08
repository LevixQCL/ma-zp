// Cartes « Mon équipe » (le trombinoscope) et « Mes trophées » de l'HP.
import { S, esc, icon, myZone } from './common.js';
import { ROLES_EQUIPE, SEUILS_EQUIPE, TROPHEES, roleDe, intitule, surnomDe, creerEquipe, appliquerNoms } from '../engine/equipe.js';
import { SERVICE_LABELS, ROLE_SERVICE, bonusChef } from '../engine/constants.js';

export const initiales = (m) => `${m.prenom[0]}${m.nom[0]}`.toUpperCase();
/**
 * Échelle du bonus d'une figure selon ses surnoms (sans surnom, 1er, 2e, 3e), le palier actuel en évidence,
 * avec l'expérience qui manque pour le suivant.
 */
export function echelleBonus(m, { xp = true } = {}) {
  const suiv = SEUILS_EQUIPE[m.niveau + 1];
  const paliers = [0, 1, 2, 3].map((n) => `<span class="ech-p${n === m.niveau ? ' on' : n < m.niveau ? ' passe' : ''}" title="${n ? `${n}${n === 1 ? 'er' : 'e'} surnom` : 'sans surnom'}">+${Math.round(bonusChef(n) * 100)} %</span>`).join('<span class="ech-f" aria-hidden="true">›</span>');
  return `<span class="echelle" aria-label="Bonus de service : +${Math.round(bonusChef(m.niveau) * 100)} % maintenant${suiv ? `, +${Math.round(bonusChef(m.niveau + 1) * 100)} % au prochain surnom (encore ${suiv - m.xp} points d’expérience)` : ', bonus maximum'}">${paliers}</span>${!xp ? '' : suiv ? `<span class="tiny muted">prochain palier dans ${suiv - m.xp} pts d’expérience (${m.xp} / ${suiv})</span>` : '<span class="tiny ok">bonus maximum atteint</span>'}`;
}

export const COULEUR_ROLE = { inter: '#FF6E6A', rech: '#63B0FF', prox: '#3DD39A', roul: '#FFB23F', admin: '#C084FC' };

import { vignetteEquipe, vignetteTrophees } from './vignettes-hp.js';
export function equipeHtml() {
  const z = myZone();
  // Les noms choisis s'affichent tout de suite (ils sont recopiés dans la partie à 20:00).
  const equipe = appliquerNoms(JSON.parse(JSON.stringify(z.equipe || creerEquipe(z.uid))), z.uid, (S.player && S.player.equipeNoms) || null);
  const membres = equipe.map((m) => {
    const r = roleDe(m);
    const suiv = SEUILS_EQUIPE[m.niveau + 1];
    const prec = SEUILS_EQUIPE[m.niveau];
    const pct = suiv ? Math.round(100 * (m.xp - prec) / (suiv - prec)) : 100;
    if (S.equipeEdit === m.role) {
      return `<form class="membre col" data-form="equipe-nom" data-role="${m.role}" style="align-items:stretch;gap:8px">
        <span class="tiny muted">${esc(roleDe(m).m)} · ${esc(SERVICE_LABELS[r.service])} : surnoms et expérience conservés</span>
        <div class="row" style="gap:8px"><label class="field grow" style="margin:0">Prénom<input class="text" name="prenom" maxlength="20" required value="${esc(m.prenom)}"></label>
          <label class="field grow" style="margin:0">Nom<input class="text" name="nom" maxlength="20" required value="${esc(m.nom)}"></label></div>
        <label class="field" style="margin:0">Intitulé<select class="text" name="f" style="min-height:44px;font-size:14px"><option value="0" ${m.f ? '' : 'selected'}>${esc(roleDe(m).m)}</option><option value="1" ${m.f ? 'selected' : ''}>${esc(roleDe(m).f)}</option></select></label>
        <div class="row" style="gap:8px"><button type="button" class="btn small ghost grow" data-action="equipe-edit" data-role="">Annuler</button>
          <button type="submit" class="btn small primary grow">Enregistrer</button></div>
      </form>`;
    }
    return `<div class="membre membre-v">
      <div class="membre-h">
        <span class="avatar" style="background:${COULEUR_ROLE[m.role]}" aria-hidden="true">${esc(initiales(m))}</span>
        <span class="col grow" style="gap:1px;min-width:0">
          <span style="font-weight:700">${esc(m.prenom)} ${esc(m.nom)}${surnomDe(m) ? ` <span class="surnom">« ${esc(surnomDe(m))} »</span>` : ''}</span>
          <span class="tiny muted">${esc(intitule(m))} · ${esc(SERVICE_LABELS[r.service])}</span>
        </span>
        <button type="button" class="iconbtn" data-action="equipe-edit" data-role="${m.role}" aria-label="Renommer ${esc(m.prenom)} ${esc(m.nom)}" style="width:36px;height:36px;color:var(--faint)">${icon('pencil', 15)}</button>
      </div>
      <span class="xp" role="img" aria-label="${suiv ? `${m.xp} points d’expérience sur ${suiv} pour le prochain surnom` : 'dernier surnom atteint'}"><i style="width:${Math.max(3, Math.min(100, pct))}%;background:${COULEUR_ROLE[m.role]}"></i></span>
      <span class="tiny muted">${suiv ? `prochain surnom « ${esc(r.surnoms[m.niveau])} » dans ${suiv - m.xp} pts d’expérience (${m.xp} / ${suiv})` : 'légende de la zone : tous les surnoms gagnés'}</span>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:2px"><span class="tiny muted">Bonus ${esc(SERVICE_LABELS[r.service])}</span>${echelleBonus(m, { xp: false })}</div>
    </div>`;
  }).join('');
  const nbSurnoms = equipe.filter((m) => m.niveau > 0).length;
  return `<details class="card repli" aria-label="Mon équipe" data-k="equipe" ${S.ouverts && S.ouverts.equipe ? 'open' : ''}>
    <summary><span class="vign">${vignetteEquipe(z.couleur)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Mon équipe</span>
      <span class="tiny muted">${equipe.length} figures · ${nbSurnoms} surnom${nbSurnoms > 1 ? 's' : ''} gagné${nbSurnoms > 1 ? 's' : ''}</span></span>${icon('chevron', 16)}</summary>
    <div class="col" style="gap:8px">
      <p class="tiny muted" style="margin:0">Chaque figure encadre son service et le rend plus efficace (de +3 % à +20 %, selon ses surnoms). Dans tes ordres, tu peux en envoyer une en mission chaque jour : mener l’assaut en zone de non-droit (plus de force, deux fois moins de blessés) ou encadrer ton renfort chez un collègue. Elles gagnent de l’expérience avec le travail de leur service et restent d’une saison à l’autre. Tu peux les renommer (des collègues, par exemple).</p>
      ${membres}
    </div></details>`;
}

/** Carte « Mes trophées » de l'HP. */
export function tropheesHtml() {
  const z = myZone();
  const acquis = new Map((z.trophees || []).map((t) => [t.id, t]));
  const trophees = TROPHEES.map((t) => {
    const a = acquis.get(t.id);
    return `<div class="trophee ${a ? 'on' : ''}" title="${esc(t.texte)}">${icon('trophy', 18)}<span class="n">${esc(t.nom)}</span><span class="d">${esc(t.texte)}</span>${a ? `<span class="d gagne">${icon('check', 12)} gagné · saison ${a.s}, tour ${a.t}</span>` : ''}</div>`;
  }).join('');
  const nb = acquis.size;
  return `<details class="card repli" aria-label="Mes trophées" data-k="trophees" ${S.ouverts && S.ouverts.trophees ? 'open' : ''}>
    <summary><span class="vign">${vignetteTrophees(nb)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Mes trophées</span>
      <span class="tiny muted">${nb} sur ${TROPHEES.length}</span></span>${icon('chevron', 16)}</summary>
    <div class="trophees">${trophees}</div></details>`;
}

export { ROLES_EQUIPE };
