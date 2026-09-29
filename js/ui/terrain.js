// Écran « Terrain » : tout ce qui se passe chez moi, chez les voisins et dans le district,
// avec de quoi agir directement.
import { S, esc, icon, tabbar, myZone, zoneName } from './common.js';
import { operationActive } from '../engine/zone.js';
import { siteDe } from '../engine/sites.js';
import { iconeSite } from './plan.js';
import { demandeRenfortHtml, appelsRenfort, renfortCtrl, renfortPrevu } from './renfort.js';
import { candidaturesRecues, candidatureCtrl, maCandidature, postulerCtrl, placesRestantes, chefDe } from './affaires.js';
import { fipaPour } from '../engine/fipa.js';
import { SERVICE_LABELS } from '../engine/constants.js';

/** Nombre de choses qui attendent une action sur le Terrain (pour la pastille). */
export function terrainAFaire() {
  const st = S.state, z = myZone();
  if (!st || !z || !S.draft) return 0;
  let n = 0;
  n += st.affaires.filter((a) => a.zone === z.uid && !(S.draft.engagements[a.id] && S.draft.engagements[a.id].agents)).length;
  n += candidaturesRecues().filter((c) => c.statut === 'attente').length;
  n += appelsRenfort().filter((a) => !renfortPrevu(a.uid)).length;
  if (st.evenement && st.evenement.tour === st.turn && !S.draft.evenement) n += 1;
  return n;
}

function bloc(titre, contenu, { kicker = '', cls = '', couleur = '' } = {}) {
  return `<section class="card ${cls}" style="gap:8px">${kicker ? `<span class="kicker" ${couleur ? `style="color:${couleur}"` : ''}>${kicker}</span>` : ''}${titre ? `<h2 class="card-title" style="font-size:15px">${titre}</h2>` : ''}${contenu}</section>`;
}

export function renderTerrain() {
  const st = S.state, z = myZone(), T = st.turn, d = S.draft;
  const nom = (uid) => (st.zones[uid] ? zoneName(st.zones[uid]) : 'Une zone');
  const site = siteDe(z);
  const chezMoi = [], voisins = [], district = [];

  // ───── Chez moi ─────
  const op = operationActive(z, T);
  if (op) chezMoi.push(bloc(esc(op.titre), `<p class="small" style="margin:0;color:var(--text2)">${esc(op.texte)}</p>
    <p class="small" style="margin:0"><strong>Dispositif :</strong> ${Object.entries(op.besoins).map(([s2, n]) => `${n} en ${SERVICE_LABELS[s2]}`).join(' · ')} · <a href="#ordres">régler dans tes ordres</a></p>${demandeRenfortHtml()}`,
    { kicker: `Opération d’envergure${op.duree > 1 ? ` · jour ${T - op.tourDebut + 1} sur ${op.duree}` : ''}${op.site && site ? ` · ${esc(site.nom)}` : ''}`, cls: 'red', couleur: 'var(--red-soft)' }));
  for (const p of z.pressions || []) {
    const s = p.site ? siteDe({ site: p.site }) : null;
    chezMoi.push(`<div class="list-row" style="${s ? `border-color:${s.couleur}55` : ''}">${s ? iconeSite(s.id, s.couleur, 26) : `<span class="bullet" style="background:var(--amber)"></span>`}
      <span class="col grow" style="gap:1px"><span style="font-weight:600">${esc(p.titre)}</span><span class="small muted">${esc(p.texte)}</span></span></div>`);
  }
  for (const a of st.affaires.filter((x) => x.zone === z.uid)) {
    const e = d.engagements[a.id] || { agents: 0 };
    const recues = candidaturesRecues().filter((c) => c.aid === a.id);
    chezMoi.push(bloc(esc(a.titre), `<p class="tiny muted" style="margin:0">Tu diriges · ${a.recompense} pts à 100 % · force minimale ${a.forceMin} (60 %), conseillée ${a.forceConseillee} (100 %), ${Math.round(a.forceConseillee * 15) / 10} et plus (130 %) · places restantes ${placesRestantes(a)} sur ${a.agentsMax}</p>
      <a class="btn small block" href="#ordres">${e.agents ? `${e.agents} agent${e.agents > 1 ? 's' : ''} engagé${e.agents > 1 ? 's' : ''} · ajuster` : 'Lancer l’affaire : engager tes agents'}</a>
      ${recues.map((c) => `<div class="col" style="gap:4px"><span class="small" style="font-weight:600">${nom(c.uid)} postule avec ${c.agents} agent${c.agents > 1 ? 's' : ''}</span>${candidatureCtrl(c)}</div>`).join('')}`,
      { kicker: 'Affaire disputée chez toi' }));
  }
  for (const f of fipaPour(st, z.uid)) {
    chezMoi.push(`<a class="list-row" href="#hp-fipa" style="border-color:var(--amber-line)"><span class="bullet" style="background:var(--amber)"></span>
      <span class="col grow" style="gap:1px"><span style="font-weight:600">FIPA · ${esc(f.titre)}</span><span class="small muted">${f.etape === 'demande' ? 'choisis une zone partenaire' : f.etape === 'invite' ? (f.partenaire === z.uid ? `${nom(f.demandeur)} t’invite · réponds` : 'invitation envoyée') : 'le jour J approche'} · sur l’HP</span></span>${icon('chevron', 16)}</a>`);
  }

  // ───── Chez les voisins ─────
  for (const a of appelsRenfort()) {
    voisins.push(bloc(`${nom(a.uid)} appelle du renfort`, `<p class="small muted" style="margin:0">« ${esc(a.op.titre)} » · ${a.agents} agents demandés ce soir</p>${renfortCtrl(a)}`, { kicker: 'Appel à renfort', cls: 'red', couleur: 'var(--red-soft)' }));
  }
  for (const a of st.affaires.filter((x) => x.zone !== z.uid)) {
    const chef = chefDe(a);
    voisins.push(bloc(esc(a.titre), `<p class="tiny muted" style="margin:0">Chez ${chef ? zoneName(chef) : '?'} · ${a.recompense} pts à 100 % (de 60 % à 130 % selon la force de l’équipe) · force conseillée ${a.forceConseillee} · ${a.agentsMax} agents max</p>${postulerCtrl(a)}`,
      { kicker: maCandidature(a) ? 'Ta candidature' : 'Affaire disputée · postuler' }));
  }
  const autresOps = Object.values(st.zones).filter((x) => x.uid !== z.uid && operationActive(x, T) && !appelsRenfort().some((a) => a.uid === x.uid));
  for (const x of autresOps) {
    const o = operationActive(x, T);
    voisins.push(`<div class="list-row"><span class="bullet" style="background:var(--red)"></span><span class="col grow" style="gap:1px"><span style="font-weight:600">${zoneName(x)} · ${esc(o.titre)}</span><span class="small muted">Opération en cours · pas d’appel à renfort pour l’instant</span></span></div>`);
  }
  const perils = Object.values(st.zones).filter((x) => (x.peril || x.tutelle) && x.uid !== z.uid);
  if (perils.length) voisins.push(`<a class="list-row" href="#diplomatie" style="background:var(--red-bg);border-color:var(--red-line)"><span class="bullet" style="background:var(--red)"></span>
    <span class="col grow" style="gap:1px"><span style="font-weight:600">${perils.map((x) => esc(x.nom)).join(', ')} en difficulté</span><span class="small muted">Entraide : budget ou agents, +5 de réputation</span></span>${icon('chevron', 16)}</a>`);

  // ───── District ─────
  const ev = st.evenement;
  if (ev) {
    const requis = 3 * Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length;
    const ceSoir = ev.tour === T;
    district.push(bloc(esc(ev.titre), `<p class="small muted" style="margin:0">${ceSoir ? 'Ce soir' : `Dans ${ev.tour - T} tour${ev.tour - T > 1 ? 's' : ''}`} · environ ${requis} agents pour tout le district. Réussite : +8 de satisfaction pour tous ; échec : −10 pour tous.</p>
      ${ceSoir ? `<div class="renfort-ctrl"><div class="between"><span class="small" style="font-weight:600">Tes agents sur l’événement</span>
        <span class="stepper"><button type="button" data-action="ev" data-d="-1" aria-label="Un agent de moins" ${(d.evenement || 0) <= 0 ? 'disabled' : ''}>−</button><span class="n">${d.evenement || 0}</span><button type="button" data-action="ev" data-d="1" aria-label="Un agent de plus">+</button></span></div>
        <span class="tiny muted">Environ 3 agents par zone. Ne rien envoyer compte comme « passager clandestin ». Pense à valider tes ordres.</span></div>` : '<span class="tiny muted">Tu pourras y envoyer des agents le jour même, depuis cet écran.</span>'}`,
      { kicker: 'Grand événement du district' }));
  }

  const section = (titre, items, vide) => `<section class="col" aria-label="${titre}" style="gap:8px"><h2 class="section">${titre}</h2>${items.length ? items.join('') : `<p class="small muted" style="margin:0">${vide}</p>`}</section>`;
  return `<main class="screen">
    <header class="col" style="gap:3px"><h1 class="big">Terrain</h1><p class="sub">Ce qui se passe chez toi, là où tu peux aider, et les grands rendez-vous du district. Tout se joue à 20:00.</p></header>
    ${section('Chez moi', chezMoi, 'Calme plat dans ta zone aujourd’hui.')}
    ${section('Chez les voisins', voisins, 'Aucune demande d’aide pour l’instant.')}
    ${district.length ? section('District', district, '') : ''}
  </main>${tabbar('terrain')}`;
}
