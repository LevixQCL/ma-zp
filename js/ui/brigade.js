// Onglet « Brigade » (oct. 2026) : l'ancien onglet Chef, avec deux vues. « Chef » : l'écran du chef de corps, inchangé.
// « Équipe » : les cinq figures à la tête de leur service, leurs agents et leurs galons à attribuer.
import { S, esc, myZone } from './common.js';
import { SERVICE_LABELS, bonusChef } from '../engine/constants.js';
import { roleDe, intitule, surnomDe, creerEquipe, appliquerNoms, GALONS, galonsDe, galonsLibres } from '../engine/equipe.js';
import { COULEUR_ROLE, initiales, echelleBonus } from './equipe.js';
import { appelDuJour, optionsAppel, intentionBrigade, APPROCHES, CTX, enRodage, BRIGADE, adjointsDe, placesFigures, prochainePlace, peutSortir } from '../engine/brigade.js';
import { psDispo } from '../engine/decor.js';
import { materielAFaire } from './materiel.js';

/** Icône d'une approche de l'appel : matériel, approche réservée (galon) ou approche de base. */
const icoOp = (op) => (op.materiel ? `img/materiel/${op.materiel}.webp` : op.reservee ? 'img/brigade/reservee.webp' : `img/brigade/${op.app}.webp`);
/** Risque en trois crans (vert, ambre, rouge). */
function risqueHtml(p) {
  const n = p >= 0.75 ? 1 : p >= 0.55 ? 2 : 3, c = ['var(--green)', 'var(--amber)', 'var(--red)'][n - 1];
  return `<span class="ap-risque" title="${['plutôt sûr', 'risqué', 'très risqué'][n - 1]}" aria-label="${['plutôt sûr', 'risqué', 'très risqué'][n - 1]}">${[0, 1, 2].map((i) => `<i${i < n ? ` style="background:${c}"` : ''}></i>`).join('')}</span>`;
}
/** Ce que rapporte une réussite, en court. */
function gainHtml(ok) {
  const l = [];
  if (ok.pts) l.push(`+${ok.pts} pt${ok.pts > 1 ? 's' : ''}`);
  if (ok.sat) l.push(`satisf. ${ok.sat > 0 ? '+' : ''}${ok.sat}`);
  if (ok.rep) l.push(`réput. +${ok.rep}`);
  return l.length ? `<span class="ap-gain">${l.join(' · ')}</span>` : '';
}

/** Carte « Appel du jour » (oct. 2026, version illustrée) : une scène par appel, les approches en tuiles,
 *  le risque en jauge, et hier résumé en une barre. Le même dans toutes les zones ; ta brigade agit seule si tu ne choisis rien. */
function appelHtml(z) {
  const st = S.state, a = appelDuJour(st), opts = optionsAppel(z, a), it = intentionBrigade(z, a);
  const ch = S.draft && Number.isInteger(S.draft.appel) ? S.draft.appel : null;
  const tuiles = opts.map((op, i) => {
    const prevu = ch == null ? op === it.op : ch === i;
    const badge = ch === i ? '<span class="ap-badge">ta consigne</span>' : ch == null && op === it.op ? '<span class="ap-badge"><img src="img/brigade/brigade.webp" alt="">ta brigade</span>' : '';
    return `<button type="button" class="ap-op${prevu ? ' on' : ''}${op.reservee || op.materiel ? ' plus' : ''}" data-action="appel-choix" data-i="${i}" aria-pressed="${ch === i}">${badge}
      <img src="${icoOp(op)}" alt=""><span class="ap-op-t"><span class="ap-k">${op.materiel ? 'ton matériel' : op.reservee ? 'réservée' : esc(APPROCHES[op.app].nom)}</span><b>${esc(op.label)}</b><span class="ap-meta">${risqueHtml(op.p)}${gainHtml(op.ok || {})}</span></span></button>`;
  }).join('');
  const hier = Object.values(st.zones || {}).filter((x) => x.appelHier && x.appelHier.t === st.turn - 1);
  let hierHtml = '';
  if (hier.length) {
    const nb = {}; for (const x of hier) nb[x.appelHier.app] = (nb[x.appelHier.app] || 0) + 1;
    const ok = hier.filter((x) => x.appelHier.ok).length, moi = hier.find((x) => x.uid === z.uid);
    const COUL_APP = { dialogue: 'rgba(99,176,255,.28)', force: 'rgba(255,110,106,.28)', procedure: 'rgba(180,155,255,.28)', prudence: 'rgba(61,211,154,.25)' };
    const barre = Object.entries(nb).sort((x, y) => y[1] - x[1]).map(([k, n]) => `<div style="flex:${n};background:${COUL_APP[k] || 'var(--surface3)'}" title="${esc(APPROCHES[k].nom)} : ${n}"><img src="img/brigade/${k}.webp" alt="${esc(APPROCHES[k].nom)}">${n}</div>`).join('');
    const memes = moi ? hier.filter((x) => x !== moi && x.appelHier.app === moi.appelHier.app).length : 0;
    hierHtml = `<div class="ap-hier">
      <div class="ap-hier-t"><span>Hier · ${esc(hier[0].appelHier.titre)}</span><b style="color:var(--green)">${ok}/${hier.length} réussi${ok > 1 ? 's' : ''}</b></div>
      <div class="ap-barre">${barre}</div>
      ${moi ? `<span class="tiny"><b>Ta brigade</b> : ${esc(moi.appelHier.label.toLowerCase())} ${moi.appelHier.ok ? '<b style="color:var(--green)">✓</b>' : '<b style="color:var(--red)">✗</b>'}${memes ? `, comme ${memes} autre${memes > 1 ? 's' : ''} zone${memes > 1 ? 's' : ''}` : ', seule à ce choix'}${moi.appelHier.seule ? ' <span class="muted">(sans consigne)</span>' : ''}</span>` : ''}
      ${S.hierOuvert ? `<div class="ap-liste">${hier.map((x) => `<span>${x.uid === z.uid ? '<b>Ta brigade</b>' : esc(x.nom || '?')} · ${esc(x.appelHier.label.toLowerCase())} ${x.appelHier.ok ? '<b style="color:var(--green)">✓</b>' : '<b style="color:var(--red)">✗</b>'}</span>`).join('')}</div>` : ''}
      <button type="button" class="ap-lien" data-action="appel-hier">${S.hierOuvert ? 'Replier' : `Voir les ${hier.length} zones ›`}</button></div>`;
  }
  return `<section class="ap" aria-label="Appel du jour">
    <div class="ap-scene" style="background-image:url(img/appels/${a.ctx}-${a.i % 2}.webp)"><div>
      <span class="ap-tags"><span class="ap-tag a">Appel du jour</span><span class="ap-tag">${esc(CTX[a.ctx].nom)}</span><span class="ap-tag">le même partout · 20:00</span></span>
      <h2 class="ap-titre">${esc(a.titre)}</h2></div></div>
    <div class="ap-corps">
      <div class="ap-choix">${tuiles}</div>
      <div class="ap-consigne"><img src="img/brigade/brigade.webp" alt=""><span>${ch == null ? `Sans consigne, ta brigade choisit <b>${esc(it.op.label.toLowerCase())}</b> <span class="muted">(${esc(it.pourquoi)})</span>.` : `Ta consigne : <b>${esc(opts[ch] ? opts[ch].label.toLowerCase() : '?')}</b>. Ta brigade s’en souviendra. <button type="button" class="ap-lien" data-action="appel-choix" data-i="-1">Laisser ma brigade décider</button>`}</span></div>
      ${hierHtml}
    </div>
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
    const sprite = ['inter', 'rech', 'prox', 'roul', 'admin'].includes(m.role) ? m.role : 'recrue';
    const tuile = `<button type="button" class="fg${ouvert ? ' on' : ''}" data-action="figure-ouvrir" data-role="${m.role}" style="--c:${col}" aria-expanded="${ouvert}" aria-label="${esc(m.prenom)} ${esc(m.nom)}">
      ${libres ? `<span class="fg-gal">+${libres}</span>` : ''}<span class="fg-av"><img src="img/agents/${sprite}.webp" alt=""></span>
      <b>${esc(m.prenom)}</b><small>${esc(r.service === 'admin' ? 'Accueil' : SERVICE_LABELS[r.service])}</small>
      <span class="fg-pts">${Array.from({ length: Math.min(n, 8) }, () => '<i></i>').join('')}</span><span class="fg-et">${'★'.repeat(liste.length) || '&nbsp;'}</span></button>`;
    const tiroir = ouvert ? `<div class="bs-voile" data-action="figure-ouvrir" data-role="${m.role}" aria-hidden="true"></div>
      <section class="bs fg-bs${S.figNeuf ? '' : ' fixe'}" role="dialog" aria-modal="true" aria-label="${esc(m.prenom)} ${esc(m.nom)}"><span class="bs-poignee" aria-hidden="true"></span>
        <div class="fg-tete" style="--c:${col}"><span class="fg-av grand"><img src="img/agents/${sprite}.webp" alt=""></span>
          <span class="col grow" style="gap:2px;min-width:0"><b class="fg-nom">${esc(m.prenom)} ${esc(m.nom)}${surnomDe(m) ? ` <span class="surnom">« ${esc(surnomDe(m))} »</span>` : ''}</b>
          <span class="tiny muted">${esc(intitule(m))} · ${esc(SERVICE_LABELS[r.service])} · ${n} agent${n > 1 ? 's' : ''}${m.spec ? ' · <span style="color:var(--amber)">spécialiste</span>' : ''}</span></span>
          <button type="button" class="fg-fermer" data-action="figure-ouvrir" data-role="${m.role}" aria-label="Fermer">×</button></div>
        <div class="row" style="gap:8px;flex-wrap:wrap"><span class="tiny muted">Encadrement de son service</span>${echelleBonus(m, { xp: true })}</div>
        <p class="tiny muted" style="margin:0">Un galon par surnom : <b style="color:var(--blue, #63B0FF)">Terrain</b> (une approche réservée sur l’appel du jour) ou <b style="color:var(--green, #3DD39A)">Service</b> (un effet chaque soir).</p>
        ${paliers}
        ${galonsDe(m).length ? (S.draft && S.draft.galonsReset === m.role ? '<span class="tiny" style="color:var(--amber)">Galons rendus ce soir à 20:00 (' + BRIGADE.reaffecter + ' PS).</span>' : `<button type="button" class="btn small ghost" data-action="galon-reset" data-role="${m.role}" ${psDispo(z) < BRIGADE.reaffecter ? 'disabled' : ''}>Réaffecter ses galons (${BRIGADE.reaffecter} PS${psDispo(z) < BRIGADE.reaffecter ? ', pas assez' : ''})</button>`) : ''}
      </section>` : '';
    return { tuile, tiroir };
  });
  S.figNeuf = false;
  const rod = enRodage(z, S.state.turn);
  return `<section class="col" style="gap:10px" aria-label="Ton équipe">
    ${appelHtml(z)}
    <h2 class="mt-h">Tes figures · ${total} agents aujourd’hui${rod ? `, dont ${rod} recrue${rod > 1 ? 's' : ''} à ½` : ''}</h2>
    <div class="fg-row">${cartes.map((c) => c.tuile).join('')}</div>
    ${rangHtml(z, equipe)}
    <p class="tiny muted" style="margin:0">Renommer une figure : carte « Mon équipe » de l’HP.</p>
  </section>${cartes.map((c) => c.tiroir).join('')}`;
}
