// Onglet « Brigade » (oct. 2026) : l'ancien onglet Chef, avec deux vues. « Chef » : l'écran du chef de corps, inchangé.
// « Équipe » : les cinq figures à la tête de leur service, leurs agents et leurs galons à attribuer.
import { S, esc, myZone } from './common.js';
import { SERVICE_LABELS, bonusChef } from '../engine/constants.js';
import { roleDe, intitule, surnomDe, creerEquipe, appliquerNoms, GALONS, galonsDe, galonsLibres } from '../engine/equipe.js';
import { COULEUR_ROLE, initiales, echelleBonus } from './equipe.js';
import { appelDuJour, optionsAppel, intentionBrigade, APPROCHES, CTX, enRodage, BRIGADE, adjointsDe, placesFigures, prochainePlace, peutSortir } from '../engine/brigade.js';
import { psDispo } from '../engine/decor.js';
import { materielAFaire } from './materiel.js';

/** Carte « Appel du jour » : le même dans toutes les zones ; ta brigade agit seule si tu ne choisis rien. */
function appelHtml(z) {
  const st = S.state, a = appelDuJour(st), opts = optionsAppel(z, a), it = intentionBrigade(z, a);
  const ch = S.draft && Number.isInteger(S.draft.appel) ? S.draft.appel : null;
  const boutons = opts.map((op, i) => {
    const prevu = ch == null ? op === it.op : ch === i;
    return `<button type="button" class="galon${prevu ? ' pris' : ''}" data-action="appel-choix" data-i="${i}" style="--k:${op.reservee || op.materiel ? 'var(--amber)' : 'var(--blue, #63B0FF)'}" aria-pressed="${ch === i}">
      <span class="galon-k">${op.materiel ? `<img src="img/materiel/${op.materiel}.webp" alt="" style="width:18px;height:18px;border-radius:5px;vertical-align:-4px"> ton matériel` : `${APPROCHES[op.app].ico} ${op.reservee ? 'réservée' : esc(APPROCHES[op.app].nom)}`}</span><b>${esc(op.label)}</b><span>${op.p >= 0.75 ? 'plutôt sûr' : op.p >= 0.55 ? 'risqué' : 'très risqué'}</span></button>`;
  }).join('');
  const hier = Object.values(st.zones || {}).filter((x) => x.appelHier && x.appelHier.t === st.turn - 1);
  const hierHtml = hier.length ? `<div class="col" style="gap:4px"><span class="tiny muted" style="font-weight:700">Hier, sur « ${esc(hier[0].appelHier.titre)} »</span>${hier.map((x) => `<span class="tiny">${x.uid === z.uid ? '<b>Ta brigade</b>' : esc(x.nom || '?')} : ${APPROCHES[x.appelHier.app].ico} ${esc(x.appelHier.label.toLowerCase())} ${x.appelHier.ok ? '<span style="color:var(--green)">✓</span>' : '<span style="color:var(--red)">✗</span>'}${x.appelHier.seule ? ' <span class="muted">(seule)</span>' : ''}</span>`).join('')}</div>` : '';
  return `<section class="card" style="gap:8px;border-color:var(--amber-line)">
    <span class="row" style="justify-content:space-between;gap:8px"><b>Appel du jour</b><span class="tiny muted">le même dans toutes les zones · résolu à 20:00</span></span>
    <span style="font-weight:700">${esc(a.titre)}</span><span class="tiny muted">${esc(CTX[a.ctx].nom)}</span>
    <span class="tiny">${ch == null ? `Sans consigne, ta brigade fera : <b>${esc(it.op.label.toLowerCase())}</b> (${esc(it.pourquoi)}).` : `Ta consigne : <b>${esc(opts[ch] ? opts[ch].label.toLowerCase() : '?')}</b>. Ta brigade retient ce choix pour les fois où tu ne seras pas là.`}</span>
    <div class="galons-choix">${boutons}</div>
    ${ch != null ? '<button type="button" class="btn small ghost" data-action="appel-choix" data-i="-1">Laisser ma brigade décider</button>' : ''}
    ${hierHtml}
  </section>`;
}

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
/** Une recrue formée peut sortir du rang ce soir (et ce n'est pas encore demandé). */
export const rangAFaire = () => { const z = myZone(); return !!(z && S.state && peutSortir(z, S.state.turn) && !(S.draft && S.draft.sortirRang)); };

export function segBrigadeHtml() {
  const v = ['equipe', 'materiel'].includes(S.brigadeVue) ? S.brigadeVue : 'chef';
  const g = galonsAFaire(), r = rangAFaire(), n = g || r, mt = materielAFaire();
  return `<div class="seg seg2" role="tablist" aria-label="Vue de la brigade" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:12px">
    <button type="button" role="tab" aria-selected="${v === 'chef'}" data-action="brigade-vue" data-v="chef"><span class="t">Chef</span></button>
    <button type="button" role="tab" aria-selected="${v === 'equipe'}" data-action="brigade-vue" data-v="equipe"><span class="t">Équipe${n ? ' ·' : ''}</span>${n ? `<span class="tiny" style="color:var(--amber)">${g ? 'galon à attribuer' : 'sortie du rang possible'}</span>` : ''}</button>
    <button type="button" role="tab" aria-selected="${v === 'materiel'}" data-action="brigade-vue" data-v="materiel"><span class="t">Matériel${mt ? ' ·' : ''}</span>${mt ? '<span class="tiny" style="color:var(--amber)">à commander</span>' : ''}</button>
  </div>`;
}

/** Adjoints sortis du rang, et la place suivante avec sa candidate ou son candidat. */
function rangHtml(z, equipe) {
  const T = S.state.turn, adj = adjointsDe(z), places = placesFigures(z), c = z.candidat, nom = (m) => `${m.prenom} ${m.nom}`;
  const cartes = adj.map((a) => {
    const r = roleDe(a), col = COULEUR_ROLE[a.role], fig = equipe.find((m) => m.role === a.role);
    const surnom = a.niveau > 0 ? r.surnoms[Math.min(a.niveau, 3) - 1] : null;
    return `<section class="card fig-brigade" style="border-left:4px dashed ${col};gap:6px">
      <div class="fig-h" style="cursor:default"><span class="avatar" style="background:${col};opacity:.8" aria-hidden="true">${esc(initiales(a))}</span>
        <span class="col grow" style="gap:1px;min-width:0"><span style="font-weight:700">${esc(nom(a))}${surnom ? ` <span class="surnom">« ${esc(surnom)} »</span>` : ''}</span>
        <span class="tiny muted">Adjoint${a.f ? 'e' : ''} · ${esc(SERVICE_LABELS[r.service])} · formé${a.f ? 'e' : ''} par ${esc(a.mentor || (fig ? nom(fig) : '?'))}</span></span>
        <span class="tiny muted">+${Math.round(bonusChef(a.niveau) * 100)} %</span></div>
      <span class="tiny">Prend le service quand ${esc((fig ? fig.prenom : 'sa figure'))} part en mission ou encadre ailleurs. En binôme sur l’appel du jour ${esc(CTX[Object.keys(CTX).find((k) => CTX[k].role === a.role)].nom.toLowerCase())} (+5 %).</span>
    </section>`;
  }).join('');
  let place = '';
  const libre = 5 + adj.length < places, hp = prochainePlace(z);
  const demande = !!(S.draft && S.draft.sortirRang);
  if (c) {
    const pret = c.pret <= T, r = roleDe(c);
    place = `<section class="card place-rang" style="gap:6px;border-style:dashed">
      <b>${libre ? `${5 + adj.length + 1}e figure : place ouverte` : `${5 + adj.length + 1}e figure : place à l’hôtel de police niveau ${hp}`}</b>
      <span class="tiny">Candidat${c.f ? 'e' : ''} : <b>${esc(nom(c))}</b>, ${esc(SERVICE_LABELS[r.service])}, formé${c.f ? 'e' : ''} par ${esc(c.mentor)}. ${pret ? `${c.f ? 'Elle' : 'Il'} a fini sa formation.` : `En formation encore ${c.pret - T} jour${c.pret - T > 1 ? 's' : ''}.`}</span>
      ${libre && pret ? (demande ? `<span class="tiny" style="color:var(--amber)">${esc(c.prenom)} sort du rang ce soir à 20:00.</span><button type="button" class="btn small ghost" data-action="sortir-rang">Annuler</button>`
        : `<button type="button" class="btn small" data-action="sortir-rang">Faire sortir ${esc(c.prenom)} du rang</button>`) : ''}
    </section>`;
  } else if (5 + adj.length < 7) {
    place = `<section class="card place-rang" style="gap:4px;border-style:dashed"><b>${5 + adj.length + 1}e figure</b>
      <span class="tiny muted">${libre ? 'Place ouverte.' : `Place ouverte à l’hôtel de police niveau ${hp}.`} La prochaine promotion de l’académie désignera une recrue, formée par ta figure la plus expérimentée (ton tuteur d’abord) : elle pourra sortir du rang à la fin de sa formation.</span></section>`;
  }
  return cartes + place;
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
          <span class="tiny muted">${esc(intitule(m))} · ${esc(SERVICE_LABELS[r.service])} · ${n} agent${n > 1 ? 's' : ''}${m.spec ? ' · <span style="color:var(--amber)">spécialiste</span>' : ''}</span>
        </span>
        ${libres ? `<span class="pastille-galon">${libres} galon${libres > 1 ? 's' : ''}</span>` : `<span class="tiny muted">${liste.length}/3</span>`}
      </button>
      <div class="row" style="gap:3px;flex-wrap:wrap" aria-hidden="true">${pions}</div>
      ${ouvert ? `<div class="col" style="gap:8px">
        <div class="row" style="gap:8px;flex-wrap:wrap"><span class="tiny muted">Encadrement de son service</span>${echelleBonus(m, { xp: true })}</div>
        <p class="tiny muted" style="margin:0">Un galon par surnom gagné. À chaque palier, deux choix : <b style="color:var(--blue, #63B0FF)">Terrain</b> (une nouvelle façon d’agir sur les appels) ou <b style="color:var(--green, #3DD39A)">Service</b> (un effet durable). Prendre l’un ferme l’autre.</p>
        ${paliers}
        ${galonsDe(m).length ? (S.draft && S.draft.galonsReset === m.role ? '<span class="tiny" style="color:var(--amber)">Galons rendus ce soir à 20:00 (' + BRIGADE.reaffecter + ' PS).</span>' : `<button type="button" class="btn small ghost" data-action="galon-reset" data-role="${m.role}" ${psDispo(z) < BRIGADE.reaffecter ? 'disabled' : ''}>Réaffecter ses galons (${BRIGADE.reaffecter} PS${psDispo(z) < BRIGADE.reaffecter ? ', pas assez' : ''})</button>`) : ''}
      </div>` : `<span class="tiny ${libres ? '' : 'muted'}" style="${libres ? 'color:var(--amber)' : ''}">${libres ? 'Touche pour attribuer son galon.' : liste.length ? `Galons : ${liste.map((g, i) => GALONS[m.role][i][g === 'A' ? 0 : 1].nom).join(' · ')}` : 'Premier galon à son premier surnom.'}</span>`}
    </section>`;
  }).join('');
  const rod = enRodage(z, S.state.turn);
  return `<section class="col" style="gap:10px" aria-label="Ton équipe">
    ${appelHtml(z)}
    <p class="tiny muted" style="margin:0">${total} agents répartis dans tes services aujourd’hui${rod ? `, dont ${rod} recrue${rod > 1 ? 's' : ''} en formation (à mi-efficacité)` : ''}. Chaque figure encadre le sien. Les galons « terrain » ouvrent des approches réservées sur l’appel du jour, les galons « service » agissent chaque soir.</p>
    ${cartes}
    ${rangHtml(z, equipe)}
    <p class="tiny muted" style="margin:0">Renommer une figure : carte « Mon équipe » de l’HP.</p>
  </section>`;
}
