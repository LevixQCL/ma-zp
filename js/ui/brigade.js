// Onglet « Brigade » (oct. 2026) : l'ancien onglet Chef, avec deux vues. « Chef » : l'écran du chef de corps, inchangé.
// « Équipe » : les cinq figures à la tête de leur service, leurs agents et leurs galons à attribuer.
import { S, esc, myZone } from './common.js';
import { SERVICE_LABELS, bonusChef } from '../engine/constants.js';
import { roleDe, intitule, surnomDe, creerEquipe, appliquerNoms, GALONS, galonsDe, galonsLibres } from '../engine/equipe.js';
import { COULEUR_ROLE, initiales, echelleBonus } from './equipe.js';

/** Choix de galons d'une figure, en tenant compte de ce qui part avec les ordres de ce soir. */
function choixDe(m) {
  const d = S.draft && S.draft.galons && S.draft.galons[m.role];
  const cur = galonsDe(m);
  if (Array.isArray(d) && d.length > cur.length && cur.every((g, i) => d[i] === g)) return { liste: d.slice(0, Math.min(3, m.niveau || 0)), envoyes: d.length - cur.length };
  return { liste: cur, envoyes: 0 };
}
/** Une figure a un galon en attente (pastille de l'onglet). */
export function galonsAFaire() {
  const z = myZone();
  return !!(z && (z.equipe || []).some((m) => galonsLibres(m, choixDe(m).liste) > 0));
}

export function segBrigadeHtml() {
  const v = S.brigadeVue === 'equipe' ? 'equipe' : 'chef';
  const n = galonsAFaire();
  return `<div class="seg seg2" role="tablist" aria-label="Vue de la brigade" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
    <button type="button" role="tab" aria-selected="${v === 'chef'}" data-action="brigade-vue" data-v="chef"><span class="t">Chef</span></button>
    <button type="button" role="tab" aria-selected="${v === 'equipe'}" data-action="brigade-vue" data-v="equipe"><span class="t">Équipe${n ? ' ·' : ''}</span>${n ? '<span class="tiny" style="color:var(--amber)">galon à attribuer</span>' : ''}</button>
  </div>`;
}

export function equipeVueHtml() {
  const z = myZone();
  const equipe = appliquerNoms(JSON.parse(JSON.stringify(z.equipe || creerEquipe(z.uid))), z.uid, (S.player && S.player.equipeNoms) || null);
  const alloc = (S.draft && S.draft.alloc) || (z.dernierOrdre && z.dernierOrdre.alloc) || {};
  const total = Object.values(alloc).reduce((a, b) => a + (Number(b) || 0), 0);
  const cartes = equipe.map((m) => {
    const r = roleDe(m), col = COULEUR_ROLE[m.role], n = Number(alloc[r.service]) || 0;
    const { liste, envoyes } = choixDe(m);
    const libres = galonsLibres(m, liste);
    const ouvert = S.figureOuverte === m.role;
    const pions = Array.from({ length: Math.min(n, 30) }, () => `<i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${col};opacity:.85"></i>`).join('');
    const paliers = GALONS[m.role].map((p, i) => {
      const fait = i < liste.length, dispo = !fait && i === liste.length && i < Math.min(3, m.niveau || 0);
      const etat = fait ? (i >= liste.length - envoyes ? 'choisi, appliqué ce soir à 20:00' : 'attribué') : dispo ? 'à choisir' : `au ${i + 1}${i ? 'e' : 'er'} surnom`;
      const btn = (k, j) => {
        const g = p[j], pris = fait && liste[i] === k, ecarte = fait && liste[i] !== k;
        const coul = k === 'A' ? 'var(--blue, #63B0FF)' : 'var(--green, #3DD39A)';
        return `<button type="button" class="galon${pris ? ' pris' : ''}${ecarte ? ' ecarte' : ''}" ${dispo ? `data-action="galon" data-role="${m.role}" data-k="${k}"` : 'disabled'} style="--k:${coul}" aria-pressed="${pris}">
          <span class="galon-k">${k === 'A' ? 'Terrain' : 'Service'}</span><b>${esc(g.nom)}</b><span>${esc(g.texte)}</span></button>`;
      };
      return `<div class="col" style="gap:5px"><span class="row tiny muted" style="justify-content:space-between"><b style="color:var(--text)">Palier ${i + 1}</b><span>${etat}</span></span>
        <div class="galons-choix">${btn('A', 0)}${btn('B', 1)}</div></div>`;
    }).join('');
    return `<section class="card fig-brigade" style="border-left:4px solid ${col};gap:8px">
      <button type="button" class="fig-h" data-action="figure-ouvrir" data-role="${m.role}" aria-expanded="${ouvert}">
        <span class="avatar" style="background:${col}" aria-hidden="true">${esc(initiales(m))}</span>
        <span class="col grow" style="gap:1px;min-width:0;text-align:left">
          <span style="font-weight:700">${esc(m.prenom)} ${esc(m.nom)}${surnomDe(m) ? ` <span class="surnom">« ${esc(surnomDe(m))} »</span>` : ''}</span>
          <span class="tiny muted">${esc(intitule(m))} · ${esc(SERVICE_LABELS[r.service])} · ${n} agent${n > 1 ? 's' : ''}</span>
        </span>
        ${libres ? `<span class="pastille-galon">${libres} galon${libres > 1 ? 's' : ''}</span>` : `<span class="tiny muted">${liste.length}/3</span>`}
      </button>
      <div class="row" style="gap:3px;flex-wrap:wrap" aria-hidden="true">${pions}</div>
      ${ouvert ? `<div class="col" style="gap:8px">
        <div class="row" style="gap:8px;flex-wrap:wrap"><span class="tiny muted">Encadrement de son service</span>${echelleBonus(m, { xp: true })}</div>
        <p class="tiny muted" style="margin:0">Un galon par surnom gagné. À chaque palier, deux choix : <b style="color:var(--blue, #63B0FF)">Terrain</b> (une nouvelle façon d’agir sur les appels) ou <b style="color:var(--green, #3DD39A)">Service</b> (un effet durable). Prendre l’un ferme l’autre.</p>
        ${paliers}
      </div>` : `<span class="tiny ${libres ? '' : 'muted'}" style="${libres ? 'color:var(--amber)' : ''}">${libres ? 'Touche pour attribuer son galon.' : liste.length ? `Galons : ${liste.map((g, i) => GALONS[m.role][i][g === 'A' ? 0 : 1].nom).join(' · ')}` : 'Premier galon à son premier surnom.'}</span>`}
    </section>`;
  }).join('');
  return `<section class="col" style="gap:10px" aria-label="Ton équipe">
    <p class="tiny muted" style="margin:0">${total} agents répartis dans tes services aujourd’hui. Chaque figure encadre le sien. Les galons sont une première étape : tes choix sont enregistrés dès ce soir, leurs effets en jeu arrivent avec la brigade en direct.</p>
    ${cartes}
    <p class="tiny muted" style="margin:0">Renommer une figure : carte « Mon équipe » de l’HP.</p>
  </section>`;
}
