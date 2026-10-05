// Écran « Terrain » : tout ce qui se passe chez moi, chez les voisins et dans le district,
// avec de quoi agir directement.
import { S, esc, icon, tabbar, myZone, zoneName } from './common.js';
import { operationActive } from '../engine/zone.js';
import { appelsRenfort, renfortCtrl, renfortPrevu } from './renfort.js';
import { candidaturesRecues, candidatureCtrl, maCandidature, postulerCtrl, placesRestantes, chefDe } from './affaires.js';
import { psEvenement } from '../engine/constants.js';
import { carteAffaire } from './ordres.js';
import { nonDroitHtml, secteursEnDanger } from './nondroit.js';

/** Nombre de choses qui attendent une action sur le Terrain (pour la pastille). */
export function terrainAFaire() {
  const st = S.state, z = myZone();
  if (!st || !z || !S.draft) return 0;
  let n = 0;
  n += st.affaires.filter((a) => a.zone === z.uid && !(S.draft.engagements[a.id] && S.draft.engagements[a.id].agents)).length;
  n += candidaturesRecues().filter((c) => c.statut === 'attente').length;
  n += appelsRenfort().filter((a) => !renfortPrevu(a.uid)).length;
  if (st.evenement && st.evenement.tour === st.turn && !S.draft.evenement) n += 1;
  n += secteursEnDanger().length;
  return n;
}

function bloc(titre, contenu, { kicker = '', cls = '', couleur = '' } = {}) {
  return `<section class="card ${cls}" style="gap:8px">${kicker ? `<span class="kicker" ${couleur ? `style="color:${couleur}"` : ''}>${kicker}</span>` : ''}${titre ? `<h2 class="card-title" style="font-size:15px">${titre}</h2>` : ''}${contenu}</section>`;
}

export function renderTerrain() {
  const st = S.state, z = myZone(), T = st.turn, d = S.draft;
  const nom = (uid) => (st.zones[uid] ? zoneName(st.zones[uid]) : 'Une zone');
  const chezMoi = [], voisins = [], district = [];

  // ───── Chez moi ─────
  // La situation du jour, l'opération d'envergure (et l'appel à renfort) se règlent dans les Ordres, la FIPA sur l'HP :
  // ici, seulement ce qui se joue avec les autres zones.
  for (const a of st.affaires.filter((x) => x.zone === z.uid)) {
    chezMoi.push(`<section class="col" style="gap:4px"><span class="kicker">Affaire disputée chez toi · tu diriges</span>${carteAffaire(a)}</section>`);
  }

  // ───── Chez les voisins ─────
  for (const a of appelsRenfort()) {
    voisins.push(bloc(`${nom(a.uid)} appelle du renfort`, `<p class="small muted" style="margin:0">« ${esc(a.op.titre)} » · ${a.agents} agents demandés ce soir</p>${renfortCtrl(a)}`, { kicker: a.op.appel ? 'Appel du district · renfort payé ×1,5' : 'Appel à renfort', cls: 'red', couleur: 'var(--red-soft)' }));
  }
  for (const a of st.affaires.filter((x) => x.zone !== z.uid)) {
    voisins.push(`<section class="col" style="gap:4px"><span class="kicker">${maCandidature(a) ? 'Ta candidature' : 'Affaire disputée · postuler'}</span>${carteAffaire(a)}</section>`);
  }
  const autresOps = Object.values(st.zones).filter((x) => x.uid !== z.uid && operationActive(x, T) && !appelsRenfort().some((a) => a.uid === x.uid));
  for (const x of autresOps) {
    const o = operationActive(x, T);
    voisins.push(`<div class="list-row"><span class="bullet" style="background:var(--red)"></span><span class="col grow" style="gap:1px"><span style="font-weight:600">${zoneName(x)} · ${esc(o.titre)}</span><span class="small muted">Opération en cours · pas d’appel à renfort pour l’instant</span></span></div>`);
  }
  const perils = Object.values(st.zones).filter((x) => (x.peril || x.tutelle) && x.uid !== z.uid);
  if (perils.length) voisins.push(`<a class="list-row" href="#pactes" style="background:var(--red-bg);border-color:var(--red-line)"><span class="bullet" style="background:var(--red)"></span>
    <span class="col grow" style="gap:1px"><span style="font-weight:600">${perils.map((x) => esc(x.nom)).join(', ')} en difficulté</span><span class="small muted">Coup de main (Carte › Pactes) : budget ou agents, jusqu’à +7 de réputation</span></span>${icon('chevron', 16)}</a>`);

  // ───── District ─────
  const ev = st.evenement;
  if (ev) {
    const requis = Math.max(3, Math.round((ev.parZone || 3) * Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length));
    const ceSoir = ev.tour === T;
    const fan = ev.fantome && st.dir && st.dir.fantome;
    district.push(bloc(esc(ev.titre), `<p class="small muted" style="margin:0">${ceSoir ? 'Ce soir' : `Dernier soir de la saison, dans ${ev.tour - T} tour${ev.tour - T > 1 ? 's' : ''}`} · environ ${requis} agents pour tout le district. Réussite : +${ev.gain ?? 8} de satisfaction pour tous${ev.pts ? ` et +${ev.pts} pts pour ceux qui envoient des agents` : ''} ; échec : −${ev.perte ?? 10} pour tous.</p>
      ${fan ? `<p class="small" style="margin:0">Dossier sur ${esc(fan.nom)} : <strong>${fan.dossier || 0} pièce${(fan.dossier || 0) > 1 ? 's' : ''}</strong>. Chaque fois qu’une zone le serre de près (3 patrouilles là où il est aperçu), il faut moins d’agents le soir de l’opération.</p>` : ''}
      ${ceSoir ? `<div class="renfort-ctrl"><div class="between"><span class="small" style="font-weight:600">Tes agents sur l’événement</span>
        <span class="stepper"><button type="button" data-action="ev" data-d="-1" aria-label="Un agent de moins" ${(d.evenement || 0) <= 0 ? 'disabled' : ''}>−</button><span class="n">${d.evenement || 0}</span><button type="button" data-action="ev" data-d="1" aria-label="Un agent de plus">+</button></span></div>
        <span class="tiny muted">Environ 3 agents par zone. Tes PS et ta réputation suivent le nombre d’agents envoyés (${psEvenement(d.evenement || 0)} PS pour ${d.evenement || 0} agent${(d.evenement || 0) > 1 ? 's' : ''}). Ne rien envoyer compte comme « passager clandestin ». Pense à valider tes ordres.</span></div>` : '<span class="tiny muted">Tu pourras y envoyer des agents le jour même, depuis cet écran.</span>'}`,
      { kicker: 'Grand événement du district' }));
  }

  const section = (titre, items, vide) => `<section class="col" aria-label="${titre}" style="gap:8px"><h2 class="section">${titre}</h2>${items.length ? items.join('') : `<p class="small muted" style="margin:0">${vide}</p>`}</section>`;
  return `<main class="screen">
    <header class="col" style="gap:3px"><h1 class="big">Terrain</h1><p class="sub">La zone de non-droit à reprendre ensemble, les affaires disputées et là où tu peux aider. Ta situation du jour et ton opération se règlent dans les <a href="#ordres">Ordres</a>. Tout se joue à 20:00.</p></header>
    ${chezMoi.length ? section('Chez moi', chezMoi, '') : ''}
    ${nonDroitHtml()}
    ${section('Chez les voisins', voisins, 'Aucune demande d’aide pour l’instant.')}
    ${district.length ? section('District', district, '') : ''}
  </main>${tabbar('terrain')}`;
}
