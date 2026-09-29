// Carte « Mon équipe » de l'HP : le trombinoscope et les trophées.
import { S, esc, icon, myZone } from './common.js';
import { ROLES_EQUIPE, SEUILS_EQUIPE, TROPHEES, roleDe, intitule, surnomDe, creerEquipe } from '../engine/equipe.js';
import { SERVICE_LABELS } from '../engine/constants.js';

const initiales = (m) => `${m.prenom[0]}${m.nom[0]}`.toUpperCase();
const COULEUR_ROLE = { inter: '#F0736A', rech: '#5AB0F0', prox: '#4CC38A', roul: '#F2B544', admin: '#C084FC' };

export function equipeHtml() {
  const z = myZone();
  const equipe = z.equipe || creerEquipe(z.uid);
  const acquis = new Map((z.trophees || []).map((t) => [t.id, t]));
  const membres = equipe.map((m) => {
    const r = roleDe(m);
    const suiv = SEUILS_EQUIPE[m.niveau + 1];
    const prec = SEUILS_EQUIPE[m.niveau];
    const pct = suiv ? Math.round(100 * (m.xp - prec) / (suiv - prec)) : 100;
    return `<div class="membre">
      <span class="avatar" style="background:${COULEUR_ROLE[m.role]}" aria-hidden="true">${esc(initiales(m))}</span>
      <span class="col grow" style="gap:2px;min-width:0">
        <span style="font-weight:700">${esc(m.prenom)} ${esc(m.nom)}${surnomDe(m) ? ` <span class="surnom">« ${esc(surnomDe(m))} »</span>` : ''}</span>
        <span class="tiny muted">${esc(intitule(m))} · ${esc(SERVICE_LABELS[r.service])}</span>
        <span class="xp" role="img" aria-label="${suiv ? `${m.xp} points d’expérience sur ${suiv} pour le prochain surnom` : 'dernier surnom atteint'}"><i style="width:${Math.max(3, Math.min(100, pct))}%;background:${COULEUR_ROLE[m.role]}"></i></span>
        <span class="tiny muted">${suiv ? `prochain surnom : « ${esc(r.surnoms[m.niveau])} »` : 'légende de la zone'}</span>
      </span></div>`;
  }).join('');
  const trophees = TROPHEES.map((t) => {
    const a = acquis.get(t.id);
    return `<div class="trophee ${a ? 'on' : ''}" title="${esc(t.texte)}">${icon('trophy', 18)}<span class="n">${esc(t.nom)}</span><span class="d">${a ? `saison ${a.s}, tour ${a.t}` : esc(t.texte)}</span></div>`;
  }).join('');
  const nb = acquis.size;
  return `<details class="card repli" aria-label="Mon équipe" data-k="equipe" ${S.ouverts && S.ouverts.equipe ? 'open' : ''}>
    <summary><span style="color:var(--amber)">${icon('shield', 20)}</span><span class="col grow" style="gap:0"><span style="font-weight:600">Mon équipe et mes trophées</span>
      <span class="tiny muted">${equipe.filter((m) => m.niveau > 0).length} surnom${equipe.filter((m) => m.niveau > 0).length > 1 ? 's' : ''} gagné${equipe.filter((m) => m.niveau > 0).length > 1 ? 's' : ''} · ${nb} trophée${nb > 1 ? 's' : ''} sur ${TROPHEES.length}</span></span>${icon('chevron', 16)}</summary>
    <div class="col" style="gap:8px">
      <p class="tiny muted" style="margin:0">Les figures de ta zone gagnent de l’expérience avec le travail de leur service, et des surnoms au fil des tours. Elles restent d’une saison à l’autre.</p>
      ${membres}
      <h3 class="compta-t">Trophées</h3>
      <div class="trophees">${trophees}</div>
    </div></details>`;
}

export { ROLES_EQUIPE };
