// Carte du District Delta, Radio Delta.
import { portraitChef } from './chef.js';
import { S, esc, icon, tabbar, myZone, zoneName, gradeInfo, fmt1, bonusEnigme } from './common.js';
import { sceneVignette, estChampion } from './logistique.js';
import { moyenneIpz, operationActive } from '../engine/zone.js';
import { planVille, iconeSite } from './plan.js';
import { siteDe } from '../engine/sites.js';
import { chefDe, postulerCtrl } from './affaires.js';
import { hashString } from '../engine/rng.js';
import { fiabilite } from '../engine/fipa.js';
import { marquerRadioLue, ongletsRadio, canalRadio, nonLus } from './prive.js';
import { ongletsCarte } from './pactes.js';
import { appelsRenfort, renfortCtrl } from './renfort.js';
import { annoncesND, suggestionND, placeND, prevoirRejoindre } from './nondroit.js';
import { nomSecteur } from '../engine/nondroit.js';
import { secteurOuvert } from '../engine/constants.js';
import { GRADES, gradeFor, AFFAIRE, ND } from '../engine/constants.js';
import { blasonSvg, insigne } from './blasons.js';
import { tensionsDe, quartiersFrontaliers, niveauTension, prevoirTensions, carteQuartiers, QUARTIERS } from '../engine/quartiers.js';
import { capacite, effetsOperation } from '../engine/zone.js';
const gradeIdx = (ps) => GRADES.indexOf(gradeFor(ps));
const pseudoDe = (uid) => (S.players && S.players[uid] && S.players[uid].pseudo) || '';

/** Mes quartiers : zones chaudes, point chaud du jour et patrouilles ciblées. */
function quartiersHtml(st, me) {
  const d = S.draft;
  if (!d) return '';
  const c = carteQuartiers(st);
  const mesT = tensionsDe(st, me);
  const cells = Object.keys(mesT);
  if (!cells.length) return '';
  const pat = d.patrouilles || {};
  // Agents de Proximité vraiment disponibles : une opération d'envergure peut en réquisitionner.
  const opx = effetsOperation(me, d.alloc || {}, d.operation, st.turn);
  const prox = opx.eff.proximite || 0;
  const pris = (opx.pris && opx.pris.proximite) || 0;
  const cibles = Object.values(pat).reduce((s2, x) => s2 + x, 0);
  const capProx = capacite(me, 'proximite', prox, { rythme: d.rythme, turn: st.turn, bonus: bonusEnigme('proximite'), alloc: opx.eff });
  const prev = prevoirTensions(st, me, { patrouilles: pat, agentsProx: prox, capProx });
  const sel = S.quartierSel != null ? String(S.quartierSel) : null;
  const pc = me.pointChaud && me.pointChaud.cell in mesT ? me.pointChaud : null;
  const barre = (t, coul) => `<span class="qbar"><span style="width:${Math.round(t)}%;background:${coul}"></span></span>`;
  const fleche = (a, b) => { const dlt = b - a; return dlt <= -4 ? `<span class="good">↓ ${Math.round(b)}</span>` : dlt >= 4 ? `<span class="bad">↑ ${Math.round(b)}</span>` : `<span class="muted">→ ${Math.round(b)}</span>`; };
  const ligne = (k) => {
    const t = mesT[k], n = niveauTension(t), a = pat[k] || 0;
    const nom = esc(c.nomDe(Number(k)));
    return `<div class="qrow ${sel === k ? 'sel' : ''}" id="q-${k}">
      <button type="button" class="qnom" data-action="quartier" data-c="${k}" aria-label="Voir ${nom} sur la carte">
        <span class="row" style="gap:6px;min-width:0"><span class="bullet" style="background:${n.couleur}"></span><span class="qtitre">${nom}</span>${pc && pc.cell === k ? '<span aria-label="point chaud">🔥</span>' : ''}</span>
        <span class="qinfo">${barre(t, n.couleur)}<span><strong>${Math.round(t)}</strong> <span class="muted">${n.nom}</span></span></span>
        <span class="qsoir">ce soir ${fleche(t, prev[k])}</span></button>
      <span class="stepper"><button type="button" data-action="patrouille" data-c="${k}" data-d="-1" aria-label="Une patrouille de moins à ${nom}" ${a <= 0 ? 'disabled' : ''}>−</button><span class="n">${a}</span><button type="button" data-action="patrouille" data-c="${k}" data-d="1" aria-label="Une patrouille de plus à ${nom}" ${prox <= a ? 'disabled' : ''}>+</button></span>
    </div>`;
  };
  const ordre = cells.slice().sort((x, y) => mesT[y] - mesT[x]);
  const deplace = cells.filter((k) => (pat[k] || 0) >= QUARTIERS.seuilDeplacement);
  // Frontière : quartiers des voisins qui touchent les miens (lecture seule).
  const front = quartiersFrontaliers(st, me.uid).map((i) => ({ i, uid: c.proprio(i) })).filter((x) => st.zones[x.uid]);
  const frontHtml = front.length ? `<details class="card repli" data-k="frontiere" ${S.ouverts && S.ouverts.frontiere ? 'open' : ''}><summary><span class="col grow" style="gap:0"><span style="font-weight:600">À ta frontière</span><span class="tiny muted">${front.length} quartier${front.length > 1 ? 's' : ''} voisin${front.length > 1 ? 's' : ''} · en pointillés sur la carte</span></span>${icon('chevron', 16)}</summary><div class="col" style="gap:4px">
    <p class="tiny muted" style="margin:0">La tension passe d’un quartier à l’autre, et trop de patrouilles au même endroit repoussent la délinquance chez le voisin. Mieux vaut se coordonner.</p>
    ${front.sort((x, y) => tensionsDe(st, st.zones[y.uid])[y.i] - tensionsDe(st, st.zones[x.uid])[x.i]).map(({ i, uid }) => {
      const t = tensionsDe(st, st.zones[uid])[i], n = niveauTension(t);
      return `<div class="between" style="gap:8px;padding:4px 0"><button type="button" class="qnom" data-action="quartier" data-c="${i}" style="flex:1"><span class="row" style="gap:6px"><span class="bullet" style="background:${n.couleur}"></span><span style="font-weight:600">${esc(c.nomDe(i))}</span></span>
        <span class="row tiny" style="gap:8px">${barre(t, n.couleur)}<span class="muted">${n.nom} ${Math.round(t)} · ${zoneName(st.zones[uid])}</span></span></button>
        <button type="button" class="btn small ghost" data-action="ecrire-a" data-uid="${esc(uid)}" aria-label="Écrire à ${esc(st.zones[uid].nom)}">✉</button></div>`;
    }).join('')}</div></details>` : '';
  return `<section class="col" aria-label="Mes quartiers" style="gap:8px" id="mes-quartiers">
    <div class="between"><h2 class="section">Mes quartiers</h2><span class="tiny muted">${cibles} / ${prox} agent${prox > 1 ? 's' : ''} de Proximité ciblé${cibles > 1 ? 's' : ''}</span></div>
    ${pc ? `<section class="card red tight" style="gap:6px"><span class="kicker" style="color:var(--red-soft)">Point chaud ce soir · ${esc(c.nomDe(Number(pc.cell)))}</span>
      <span style="font-weight:700">${esc(pc.titre)}</span><span class="small" style="color:var(--text2)">${esc(pc.texte)}</span>
      ${(pat[pc.cell] || 0) >= QUARTIERS.agentsDesamorcer ? `<span class="small good" style="font-weight:600">${icon('check', 14)} ${pat[pc.cell]} agents sur place : il sera désamorcé à 20:00 (pense à valider).</span>`
        : `<span class="tiny muted">Sans ${QUARTIERS.agentsDesamorcer} agents sur place, la tension y grimpera de ${pc.force} ce soir. Avec eux : +1 de satisfaction.</span>
        ${prox >= QUARTIERS.agentsDesamorcer ? `<button type="button" class="btn small outline block" data-action="point-chaud">Envoyer ${QUARTIERS.agentsDesamorcer} agents à ${esc(c.nomDe(Number(pc.cell)))}</button>` : ''}
        ${prox < QUARTIERS.agentsDesamorcer ? `<span class="tiny bad">Il te faut au moins ${QUARTIERS.agentsDesamorcer} agents en Proximité (tu en as ${prox}) : <a href="#ordres">renforce la Proximité dans tes ordres</a>.</span>` : cibles - (pat[pc.cell] || 0) + QUARTIERS.agentsDesamorcer > prox ? '<span class="tiny muted">Les agents seront repris sur tes autres patrouilles.</span>' : ''}`}
    </section>` : ''}
    <p class="tiny muted" style="margin:0">${prox ? `Touche un quartier sur la carte ou ici. ${cibles >= prox ? 'Tous tes agents sont affectés : « + » en déplace un depuis un autre quartier.' : `Les agents non ciblés (${prox - cibles}) patrouillent partout.`} Plus tu concentres, plus la tension baisse à cet endroit ; au-delà de ${QUARTIERS.seuilDeplacement - 1} agents, la délinquance se déplace vers les voisins.` : 'Aucun agent en Proximité aujourd’hui : <a href="#ordres">règle-le dans tes ordres</a> pour envoyer des patrouilles.'}</p>
    ${pris ? `<p class="tiny" style="margin:0;color:var(--amber)">L’opération en cours réquisitionne ${pris} agent${pris > 1 ? 's' : ''} de Proximité : il en reste ${prox} pour les patrouilles.</p>` : ''}
    ${cibles > prox ? `<p class="tiny bad" style="margin:0">Plus assez d’agents pour toutes ces patrouilles : à 20:00, les moins utiles seront annulées (le point chaud reste prioritaire).</p>` : ''}
    ${deplace.length ? `<p class="tiny bad" style="margin:0">⚠ ${deplace.map((k) => esc(c.nomDe(Number(k)))).join(', ')} : trop de monde, la délinquance ira chez les voisins.</p>` : ''}
    <div class="card tight" style="gap:0;padding:4px 12px">${ordre.map(ligne).join('')}</div>
    ${frontHtml}
  </section>`;
}

export function renderCarte() {
  const st = S.state, me = myZone();
  const zones = Object.values(st.zones).sort((a, b) => a.code.localeCompare(b.code));
  const n = zones.length;
  const ev = st.evenement;
  const op = operationActive(me, st.turn);
  const monSite = siteDe(me);
  const legende = `<div class="row small muted" style="flex-wrap:wrap;gap:10px">
    <span class="row" style="gap:4px"><svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true"><defs><pattern id="lg-nd" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#3A1416"/><path d="M0 0V4" stroke="#B3363A" stroke-width="1.6"/></pattern></defs><rect width="14" height="12" rx="2" fill="url(#lg-nd)" stroke="#E0625A"/></svg>zone de non-droit</span>
    ${st.affaires.length ? '<span class="row" style="gap:4px"><svg width="12" height="14" viewBox="-8 -12 16 22" aria-hidden="true"><path d="M0 9c-5-5.5-8-8.6-8-12.4a8 8 0 0 1 16 0C8 .4 5 3.5 0 9z" fill="#FFB23F"/></svg>affaire disputée</span>' : ''}
    ${((st.vagues && st.vagues.liste) || []).some((v) => v.tour === st.turn) ? '<span class="row" style="gap:4px"><span style="width:12px;height:12px;border-radius:50%;background:#B4532A;display:inline-block"></span>vague de délinquance ce soir</span>' : ''}
    ${ev ? '<span>☆ événement</span>' : ''}${op ? '<span class="bad">◎ opération en cours</span>' : ''}
    <span class="row" style="gap:4px"><svg width="14" height="14" viewBox="-9 -9 18 18" aria-hidden="true"><circle r="8.5" fill="#0C1124" stroke="#FFB23F" stroke-width="1.5"/><path d="M0 -5l4.5 1.7v2.8c0 2.8-2 4.5-4.5 5.6-2.5-1.1-4.5-2.8-4.5-5.6v-2.8z" fill="#FFB23F"/></svg>ton HP</span>
    <span class="row" style="gap:4px"><span style="width:14px;height:0;border-top:2px solid var(--amber)"></span>ta zone</span></div>
    <div class="row tiny muted" style="flex-wrap:wrap;gap:10px">${['calme', 'à surveiller', 'tendu', 'chaud'].map((l, k) => `<span class="row" style="gap:4px"><span class="bullet" style="background:${['#4FBF8A', '#E2C04A', '#E8913A', '#E0625A'][k]}"></span>${l}</span>`).join('')}
      <span class="row" style="gap:4px"><span class="bullet" style="background:#63B0FF"></span>patrouille</span><span>pointillés : chez le voisin</span></div>`;
  const zoom = S.carteZoom !== false;
  return `<main class="screen">
    ${ongletsCarte('carte')}
    <header class="between" style="align-items:flex-end"><h1 class="big">District Delta</h1><span class="small muted">${n} zone${n > 1 ? 's' : ''}</span></header>
    <div class="seg2" role="group" aria-label="Cadrage de la carte">
      <button type="button" data-action="carte-zoom" data-v="0" aria-selected="${!zoom}">Tout le district</button>
      <button type="button" data-action="carte-zoom" data-v="1" aria-selected="${zoom}">Ma zone</button></div>
    <div class="plan-cadre">${planVille(st, me, { zoom })}</div>
    ${legende}
    ${quartiersHtml(st, me)}

    <section class="col" aria-label="Sur la carte"><div class="between"><h2 class="section">Sur la carte</h2><a class="small" href="#terrain">Agir sur le Terrain</a></div>
      ${st.nonDroit ? (() => { const sc = Object.values(st.nonDroit.secteurs); const r = sc.filter((x) => x.statut === 'repris').length; return `<a class="list-row" href="#terrain" style="border-color:var(--red-line)"><span style="width:26px;height:26px;border-radius:7px;background:#3A1416;border:1px solid #E0625A;flex-shrink:0"></span>
        <span class="col grow" style="gap:2px"><span style="font-weight:600">Zone de non-droit</span><span class="small muted">${r} secteur${r > 1 ? 's' : ''} repris sur ${sc.length} · à reprendre ensemble, sans candidature</span></span>${icon('chevron', 16)}</a>`; })() : ''}
      ${st.affaires.map((a, i) => {
        const chef = chefDe(a), moiChef = a.zone === me.uid;
        return `<a class="list-row" href="#terrain"><span class="badge-num">${i + 1}</span>
          <span class="col grow" style="gap:2px"><span style="font-weight:600">${esc(a.titre)}</span>
            <span class="small muted">${moiChef ? '<strong style="color:var(--amber)">Chez toi · tu diriges</strong>' : `Chez ${chef ? zoneName(chef) : '?'} · postuler`} · prime ≈ ${fmt1(a.recompense * AFFAIRE.prime)} k€</span></span>${icon('chevron', 16)}</a>`;
      }).join('')}
      ${ev ? `<a class="list-row" href="#terrain"><span style="width:26px;height:26px;border-radius:7px;background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon('star', 14)}</span>
        <span class="col grow" style="gap:2px"><span style="font-weight:600">${esc(ev.titre)}</span><span class="small muted">Événement collectif ${ev.tour === st.turn ? 'ce soir' : `dans ${ev.tour - st.turn} tours`} · ~${3 * Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length} agents requis</span></span></a>` : ''}

    </section>
    <section class="col" aria-label="Les zones du district" style="gap:8px"><div class="between"><h2 class="section" style="margin:0">Les zones du district</h2><span class="tiny muted">${n} · touche pour visiter</span></div>
      <div class="vitrine">${[me, ...zones.filter((z) => z.uid !== me.uid)].map((z) => `<button type="button" class="vitrine-item" data-action="voir-hp" data-uid="${esc(z.uid)}" aria-label="Voir le commissariat de ${esc(z.nom)}">
        ${sceneVignette(z)}
        <span class="vitrine-info">
          <span class="between" style="gap:6px"><span class="row" style="gap:6px;min-width:0">${S.players[z.uid] && S.players[z.uid].blason && gradeIdx(z.ps) >= 4 ? blasonSvg(S.players[z.uid].blason, z.couleur, 18) : `<span class="bullet" style="background:${esc(z.couleur)}"></span>`}<span class="vitrine-nom">${estChampion(z, st) ? '<span style="color:var(--amber)">★</span> ' : ''}${zoneName(z)} ${insigne(z.ps)}</span></span><span class="col" style="gap:0;align-items:flex-end;flex-shrink:0"><span class="mono small">IPZ ${fmt1(z.ipz)}</span><span class="tiny muted">moy. ${z.toursJoues ? fmt1(moyenneIpz(z)) : "—"}</span></span></span>
          <span class="tiny muted">${z.uid === me.uid ? 'toi · ' : pseudoDe(z.uid) ? `${esc(pseudoDe(z.uid))} · ` : ''}${gradeInfo(z.ps).g.nom}${(z.trophees || []).length ? ` · <span style="color:var(--amber-soft)">${(z.trophees || []).length} trophée${(z.trophees || []).length > 1 ? 's' : ''}</span>` : ''}${z.peril ? ' · <span class="bad">en péril</span>' : z.tutelle ? ' · <span class="bad">sous tutelle</span>' : z.toursSansOrdres >= 3 ? ' · en veille' : ''}</span>
          ${siteDe(z) ? `<span class="tiny row" style="gap:4px;color:${siteDe(z).couleur}">${iconeSite(siteDe(z).id, siteDe(z).couleur, 13)}${esc(siteDe(z).nom)}</span>` : ''}
        </span></button>`).join('')}</div></section>
    ${monSite ? `<details class="card repli" data-k="site" ${S.ouverts && S.ouverts.site ? 'open' : ''}><summary><span class="row grow" style="gap:8px">${iconeSite(monSite.id, monSite.couleur, 22)}<span class="col" style="gap:0"><span style="font-weight:600">Ton site sensible</span><span class="tiny muted">${esc(monSite.nom)} · ${esc(monSite.type)}</span></span></span>${icon('chevron', 16)}</summary>

      <p class="small muted" style="margin:0">Il peut provoquer des imprévus dans ta zone (environ un jour sur quatre), et plus rarement une opération d’envergure :</p>
      <ul class="aide-liste">${monSite.evenements.map((e) => `<li>${esc(e.titre)} <span class="muted">· ${esc(e.texte)}</span></li>`).join('')}<li><strong>${esc(monSite.operation.titre)}</strong> <span class="muted">· opération d’envergure</span></li></ul>
    </details>` : ''}
  </main>${tabbar('carte')}`;
}

export function renderRadio() {
  const st = S.state, me = myZone();
  const nameOf = (uid) => {
    const z = st.zones[uid] || S.players[uid];
    return z ? { nom: `${z.nom}${pseudoDe(uid) ? ` · ${pseudoDe(uid)}` : ''}`, code: z.code, couleur: z.couleur } : { nom: 'Ancienne zone', code: '', couleur: '#9FB0C0' };
  };
  const canal = S.radioCanal === 'ops' ? 'ops' : 'parole';
  const nl = nonLus();
  const tous = S.radio || [];
  const msgs = tous.filter((m) => canalRadio(m) === canal).slice(-50);
  marquerRadioLue(canal);
  const appels = appelsRenfort();
  // Annonces « zone de non-droit » de ce soir : seule la dernière de chaque secteur porte le bouton Rejoindre.
  const ann = annoncesND();
  const derniere = {};
  for (const m of msgs) if (m.nd && m.nd.season === st.season && m.nd.turn === st.turn && m.uid !== me.uid) { const c = String(m.nd.secteur); if (!derniere[c] || derniere[c] < m.at) derniere[c] = m.at; }
  const ndCtrl = (m) => {
    const k = String(m.nd.secteur), s = st.nonDroit && st.nonDroit.secteurs[k];
    if (!s || derniere[k] !== m.at || !secteurOuvert(st.nonDroit, k)) return '';
    const l = ann[k] || [];
    const mien = (S.draft && S.draft.secteurs && S.draft.secteurs[k]) || 0;
    const sug = suggestionND(k), place = placeND(k);
    const choisi = Math.max(1, Math.min(place, (S.ndRejoindre && S.ndRejoindre[k]) || sug));
    const qui = l.map((x) => `${x.moi ? '<strong>toi</strong>' : esc(st.zones[x.uid].nom)} (${x.n})`).join(', ');
    let effet = '';
    if (place) {
      const p = prevoirRejoindre(k, choisi);
      effet = s.statut === 'repris' ? `ta garde : emprise ${Math.round(s.emprise)} → ${Math.round(p.emprise)}`
        : p.emprise <= 0 ? '<span class="good">repris ce soir avec toi</span>'
        : `avec toi : ${Math.round(s.emprise)} → <strong>${Math.round(p.emprise)}</strong>${choisi < place && prevoirRejoindre(k, place).emprise <= 0 ? ' · encore un peu et il tombe' : ''}`;
    }
    return `<div class="nd-radio">
      <span class="tiny"><strong>${esc(nomSecteur(k))}</strong> · ${s.statut === 'repris' ? 'à garder' : `emprise du milieu ${Math.round(s.emprise)}`} · ce soir : ${qui}</span>
      ${mien ? `<div class="between" style="gap:8px"><span class="small ok" style="font-weight:700">✓ Tu y vas avec ${mien} agent${mien > 1 ? 's' : ''}</span><button type="button" class="btn small ghost" data-action="secteur" data-c="${k}">Ajuster</button></div>`
        : place ? `<div class="between" style="gap:8px"><span class="small">Combien d’agents ?</span>
            <span class="stepper"><button type="button" data-action="nd-rej-n" data-c="${k}" data-d="-1" aria-label="Un agent de moins" ${choisi <= 1 ? 'disabled' : ''}>−</button><span class="n">${choisi}</span><button type="button" data-action="nd-rej-n" data-c="${k}" data-d="1" aria-label="Un agent de plus" ${choisi >= place ? 'disabled' : ''}>+</button></span></div>
          <span class="tiny muted">${effet}${choisi === sug ? ' · nombre conseillé' : ''}</span>
          <div class="row" style="gap:8px"><button type="button" class="btn small primary grow" data-action="nd-rejoindre" data-c="${k}" data-n="${choisi}">🤝 Rejoindre avec ${choisi}</button><button type="button" class="btn small ghost" data-action="secteur" data-c="${k}">Voir</button></div>
          <span class="tiny muted">Pris d’abord parmi tes agents libres ; la radio est prévenue. Pense à valider tes ordres.</span>`
        : `<span class="tiny muted">Tu as déjà engagé tes ${ND.maxTotal} agents possibles dans la zone de non-droit.</span>`}
    </div>`;
  };
  const frequences = `    <div class="frequences" role="tablist" aria-label="Fréquences de la radio">
      <button type="button" role="tab" class="freq ${canal === 'parole' ? 'on' : ''}" data-action="radio-canal" data-v="parole" aria-selected="${canal === 'parole'}">
        <span class="freq-n">F1</span><span class="col" style="gap:0;min-width:0"><span class="freq-t">Discussion</span><span class="freq-s">les chefs de zone se parlent</span></span>${canal !== 'parole' && nl.radio ? `<span class="compteur">${nl.radio}</span>` : ''}</button>
      <button type="button" role="tab" class="freq ops ${canal === 'ops' ? 'on' : ''}" data-action="radio-canal" data-v="ops" aria-selected="${canal === 'ops'}">
        <span class="freq-n">F2</span><span class="col" style="gap:0;min-width:0"><span class="freq-t">Renforts & opérations</span><span class="freq-s">${appels.length ? `${appels.length} appel${appels.length > 1 ? 's' : ''} en cours` : 'appels, non-droit, annonces'}</span></span>${canal !== 'ops' && nl.ops ? `<span class="compteur">${nl.ops}</span>` : ''}</button>
    </div>`;
  return `<main class="screen">
    ${ongletsRadio('radio', frequences)}
    <header class="col" style="gap:3px"><h1 class="big">Radio Delta</h1></header>
    <p class="sub" style="margin:-4px 0 0">${canal === 'parole' ? 'Canal public de tout le district. Négociez, chambrez, mais restez corrects.' : 'Appels à renfort, zone de non-droit et annonces automatiques. Réponds ici pour coordonner.'}</p>
    <section class="col" aria-label="Messages" id="radio-list" style="gap:8px">
      ${msgs.length ? msgs.map((m) => { const w = nameOf(m.uid); const moi = m.uid === me.uid; const appel = m.renfort && appels.find((x) => x.uid === m.uid && x.at === m.at); const nd = m.nd && !moi ? ndCtrl(m) : ''; return `<div class="card tight" ${m.renfort ? 'style="border-color:var(--red-line);background:var(--red-bg)"' : nd ? 'style="border-color:var(--amber-line);background:var(--amber-bg, transparent)"' : moi ? 'style="border-color:var(--amber-line)"' : ''}>
        <div class="between"><span class="small row" style="font-weight:700;gap:6px;align-items:center;color:${esc(w.couleur)}">${st.zones[m.uid] && st.zones[m.uid].chef ? portraitChef(m.uid, 22, { galons: false }) : ''}ZP ${esc(w.code)} ${esc(w.nom)}${moi ? ' (toi)' : ''}</span><span class="tiny muted mono">${new Date(m.at).toLocaleString('fr-BE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
        <p style="margin:0;font-size:14px;line-height:1.4;overflow-wrap:anywhere">${esc(m.texte)}</p>${appel ? renfortCtrl(appel) : ''}${nd}</div>`; }).join('') : `<p class="small muted">${canal === 'parole' ? 'Aucun message pour l’instant. Lance la conversation !' : 'Aucun appel ni annonce pour l’instant.'}</p>`}
    </section>
    <form data-form="radio" data-canal="${canal}" class="row" style="position:sticky;bottom:96px;background:var(--bg);padding-top:6px">
      <label class="sr" for="radio-msg">Message</label>
      <input id="radio-msg" class="text grow" name="texte" maxlength="280" placeholder="${canal === 'parole' ? 'Message à tout le district…' : 'Réponse sur F2 (ex. « j’arrive avec 2 »)…'}" autocomplete="off">
      <button class="btn primary" type="submit" aria-label="Envoyer" style="width:48px;padding:0">${icon('send', 18)}</button>
    </form>
  </main>${tabbar('radio')}`;
}
