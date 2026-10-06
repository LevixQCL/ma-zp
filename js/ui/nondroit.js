// Zone de non-droit (écran Terrain) : les secteurs du centre, qui y était hier, l'influence de chacun,
// et un stepper pour y envoyer des agents ce soir. Personne n'a besoin d'accepter personne.
import { S, esc, fmt1, myZone } from './common.js';
import { ND, secteurOuvert, regenSecteur } from '../engine/constants.js';
import { forceEngagement } from '../engine/zone.js';
import { milieuDe, nomSecteur, partsDe, prevoirSecteur, secteursVoisins } from '../engine/nondroit.js';
import { planNonDroit } from './plan.js';

const nd = () => (S.state && S.state.nonDroit) || null;
const nomZ = (uid) => (S.state.zones[uid] ? esc(S.state.zones[uid].nom) : '?');

/** Agents de ma zone envoyés ce soir dans la zone de non-droit (brouillon). */
export const agentsND = (d = S.draft) => Object.values((d && d.secteurs) || {}).reduce((a, b) => a + (b || 0), 0);

/** Annonces radio de ce soir : { secteur: [{ uid, n, moi? }] }. Dernière annonce par zone et par secteur ;
 *  pour ma zone, c'est mon brouillon qui fait foi (je suis toujours en tête). */
export function annoncesND() {
  const st = S.state, me = myZone(), out = {};
  const n0 = nd();
  if (!st || !n0) return out;
  const vu = {};
  for (const m of S.radio || []) {
    const a = m.nd;
    if (!a || a.season !== st.season || a.turn !== st.turn || !st.zones[m.uid] || (me && m.uid === me.uid) || !n0.secteurs[a.secteur]) continue;
    const cle = `${m.uid}|${a.secteur}`;
    if (!vu[cle] || vu[cle].at < m.at) vu[cle] = { uid: m.uid, secteur: String(a.secteur), n: a.agents || 0, at: m.at };
  }
  for (const v of Object.values(vu)) if (v.n > 0) (out[v.secteur] ||= []).push(v);
  for (const k of Object.keys(out)) out[k].sort((a, b) => b.n - a.n);
  if (me && S.draft) for (const [k, n] of Object.entries(S.draft.secteurs || {})) if (n) (out[k] ||= []).unshift({ uid: me.uid, n, moi: true });
  return out;
}

/** Ma dernière annonce radio de ce soir sur un secteur (nombre d'agents annoncés, 0 si aucune). */
export function monAnnonceND(k) {
  const st = S.state, me = myZone();
  let der = null;
  for (const m of S.radio || []) if (m.nd && me && m.uid === me.uid && m.nd.season === st.season && m.nd.turn === st.turn && String(m.nd.secteur) === String(k) && (!der || der.at < m.at)) der = m;
  return der ? der.nd.agents : 0;
}

/** Place qu'il me reste sur un secteur (plafonds par secteur et pour toute la zone de non-droit). */
export function placeND(k, d = S.draft) {
  if (!d) return 0;
  return Math.max(0, Math.min(ND.maxParSecteur - ((d.secteurs || {})[k] || 0), ND.maxTotal - agentsND(d)));
}

/** Prévision d'un secteur si je rejoins avec n agents, en plus des zones annoncées ce soir. */
export function prevoirRejoindre(k, n) {
  const s = nd().secteurs[k], me = myZone();
  const autres = (annoncesND()[k] || []).filter((x) => !x.moi).map((x) => forceEngagement(S.state.zones[x.uid], x.n, S.state.turn));
  return prevoirSecteur(S.state, s, [...autres, n ? forceEngagement(me, n, S.state.turn) : 0]);
}

/** Agents proposés pour rejoindre : le minimum qui fait tomber le secteur ce soir avec les zones annoncées ;
 *  sinon 2 (assez pour compter dans l'influence). Pour une garde, 2. */
export function suggestionND(k, d = S.draft) {
  const n = nd(); const s = n && n.secteurs[k];
  const place = placeND(k, d);
  if (!s || !place) return 0;
  if (s.statut !== 'repris') for (let i = 1; i <= place; i++) if (prevoirRejoindre(k, i).emprise <= 0) return i;
  return Math.min(place, 2);
}

/** Pastilles « qui y va ce soir » d'un secteur. */
/** Version compacte : une pastille ronde par zone (initiales, à sa couleur), le nom complet au survol. */
function pionsCeSoir(liste) {
  const ini = (nom) => String(nom || '?').replace(/^ZP\s*\d*\s*/i, '').trim().slice(0, 2).toUpperCase();
  const max = 5, vus = liste.slice(0, max);
  return `<span class="nd-pions">${vus.map((x) => { const z = S.state.zones[x.uid]; const nom = x.moi ? 'toi' : (z ? z.nom : '?');
    return `<span class="nd-pion ${x.moi ? 'moi' : ''}" style="--c:${x.moi ? 'var(--amber)' : esc((z && z.couleur) || '#9FB0C0')}" title="${esc(nom)} · ${x.n} agent${x.n > 1 ? 's' : ''}">${x.moi ? 'toi' : esc(ini(nom))}</span>`; }).join('')}${liste.length > max ? `<span class="nd-pion plus">+${liste.length - max}</span>` : ''}</span>`;
}
function pastillesCeSoir(liste) {
  return liste.map((x) => `<span class="nd-qui ${x.moi ? 'moi' : ''}" ${!x.moi && S.state.zones[x.uid] ? `style="--c:${esc(S.state.zones[x.uid].couleur || '#9FB0C0')}"` : ''}>${x.moi ? 'toi' : nomZ(x.uid)} <b>${x.n}</b></span>`).join('');
}

/** Bandeau du Terrain : qui va où ce soir, d'après la radio. */
function ceSoirHtml(n, me, ann) {
  const lignes = Object.entries(ann).filter(([k]) => n.secteurs[k]).sort((a, b) => b[1].length - a[1].length || b[1].reduce((t, x) => t + x.n, 0) - a[1].reduce((t, x) => t + x.n, 0));
  if (!lignes.length) return `<div class="nd-cesoir vide"><span class="kicker">📻 Qui y va ce soir</span>
    <p class="tiny muted" style="margin:0">Personne ne s’est encore annoncé. Mets des agents sur un secteur puis « Prévenir la radio » : les autres verront où te rejoindre, d’un bouton.</p></div>`;
  const ligne = ([k, l]) => {
    const s = n.secteurs[k];
    const repris = s.statut === 'repris';
    const forces = l.map((x) => forceEngagement(S.state.zones[x.uid], x.n, S.state.turn));
    const p = prevoirSecteur(S.state, s, forces);
    const tombe = !repris && p.emprise <= 0;
    const moiDedans = l.some((x) => x.moi);
    // Secteur déjà repris : la garde suffit dès que l'emprise ne remonte pas.
    const assuree = repris && p.emprise <= Math.max(s.emprise, 0) + 0.5;
    const droite = repris
      ? `<span class="tiny ${assuree ? 'ok' : 'bad'}">${assuree ? '🛡 garde assurée' : '🛡 garde trop faible'}</span>
        <span class="tiny ${moiDedans ? 'ok' : assuree ? 'muted' : 'nd-rej'}">${moiDedans ? '✓ tu gardes' : assuree ? 'assez de monde' : 'Renforcer ›'}</span>`
      : `<span class="tiny ${tombe ? 'good' : p.emprise < s.emprise ? '' : 'bad'}">${tombe ? 'repris ce soir' : `emprise ${Math.round(s.emprise)} → ${Math.round(p.emprise)}`}</span>
        <span class="tiny ${moiDedans ? 'ok' : 'nd-rej'}">${moiDedans ? '✓ tu y vas' : 'Rejoindre ›'}</span>`;
    return `<button type="button" class="nd-cs-row" data-action="secteur" data-c="${k}" aria-label="${esc(nomSecteur(k))} : ${l.map((x) => (x.moi ? 'toi' : nomZ(x.uid)) + ' ' + x.n).join(', ')}">
        <span class="nd-cs-ico" aria-hidden="true">${repris ? '🛡' : '⚔️'}</span>
        <span class="col" style="gap:2px;min-width:0;flex:1;text-align:left"><span class="nd-nom">${s.coeur ? '★ ' : ''}${esc(nomSecteur(k))}</span>
          <span class="row" style="gap:6px;align-items:center">${pionsCeSoir(l)}<span class="tiny muted">${l.reduce((t, x) => t + x.n, 0)} ag.</span></span></span>
        <span class="col" style="gap:0;align-items:flex-end;flex-shrink:0">${droite}</span>
      </button>`;
  };
  const assauts = lignes.filter(([k]) => n.secteurs[k].statut !== 'repris');
  const gardes = lignes.filter(([k]) => n.secteurs[k].statut === 'repris');
  const trop = gardes.filter(([k, l]) => l.reduce((t, x) => t + x.n, 0) > 4);
  return `<div class="nd-cesoir"><span class="kicker">📻 Qui y va ce soir</span>
    ${assauts.map(ligne).join('')}${gardes.map(ligne).join('')}
    ${trop.length ? `<p class="tiny warn" style="margin:2px 0 0">🛡 ${trop.map(([k]) => esc(nomSecteur(k))).join(', ')} : assez de garde, renforce plutôt un assaut ⚔️.</p>` : ''}
  </div>`;
}

/** Secteurs tenus avec mon influence qui risquent de retomber sans garde ce soir (pour les alertes). */
export function secteursEnDanger() {
  const n = nd(), me = myZone();
  if (!n || !me) return [];
  return Object.entries(n.secteurs).filter(([k, s]) => s.statut === 'repris' && s.emprise >= ND.seuilRechute - 20
    && partsDe(s).some((p) => p.uid === me.uid && p.part >= ND.partMin) && !((S.draft && S.draft.secteurs) || {})[k]).map(([k]) => k);
}

function barre(v, coul) {
  return `<span class="nd-barre" role="img" aria-label="Emprise du milieu ${Math.round(v)} sur 100"><span style="width:${Math.max(2, Math.round(v))}%;background:${coul}"></span><span class="nd-seuil" style="left:${ND.seuilRechute}%"></span></span>`;
}

/** « Ce que ça rapporte » : reprise et retombées de chaque nuit, et la part de la zone si elle a déjà de l'influence. */
function gainsHtml(s, moi) {
  const mult = s.coeur ? ND.coeurMult : 1, f = (v) => fmt1(Math.round(v * 10) / 10);
  const part = moi ? moi.part : null;
  const pourToi = (fixe, var_, k = 1) => (part !== null ? ` <span class="ok">(toi, ${Math.round(part * 100)} % : ${f(mult * ((part >= ND.partMin ? fixe : 0) + var_ * part) * k)})</span>` : '');
  const P = ND.prise, R = ND.retombees;
  return `<details class="nd-gains tiny" data-k="nd-gains-${s.coeur ? 'c' : 'a'}" ${S.ouverts && S.ouverts[`nd-gains-${s.coeur ? 'c' : 'a'}`] ? 'open' : ''}><summary>💰 Ce que ça rapporte${s.coeur ? ` (Cœur : ×${String(ND.coeurMult).replace('.', ',')})` : ''}</summary>
    <div class="g">
      <strong>À la reprise</strong><span>+${f(P.points * mult)} pts de résultats + jusqu’à ${f(P.pointsPart * mult)} selon ta part${pourToi(P.points, P.pointsPart)} · jusqu’à ${f(P.prime * mult)} k€ selon ta part · +${f(P.satisfaction * mult)} de satisfaction, +${P.rep} de réputation (+1 à plusieurs), +${P.moral} de moral</span>
      <strong>Chaque nuit tenu</strong><span>+${f(R.points * mult)} pts + jusqu’à ${f(R.pointsPart * mult)} selon ta part${pourToi(R.points, R.pointsPart)} · jusqu’à ${f(R.budget * mult)} k€ · +${f(Math.min(R.satisfaction * mult, R.satisfactionMax))} de satisfaction (${f(R.satisfactionMax)} au plus par nuit, tous secteurs) · +${Math.round(R.ps * mult)} PS</span>
      <strong>Pour qui</strong><span>chaque zone qui a au moins ${Math.round(ND.partMin * 100)} % d’influence touche sa part entière : y aller à plusieurs ne divise pas les gains fixes.</span>
    </div></details>`;
}

function carteSecteur(k, s, me, d) {
  const m = milieuDe(s);
  const ouvert = secteurOuvert(nd(), k);
  const n = (d.secteurs || {})[k] || 0;
  const repris = s.statut === 'repris';
  const parts = partsDe(s);
  const moi = parts.find((p) => p.uid === me.uid);
  const hier = (s.hier || []).filter((x) => S.state.zones[x.u]);
  const maForce = n ? forceEngagement(me, n, S.state.turn) : 0;
  const seul = prevoirSecteur(S.state, s, [maForce]);
  const ceSoir = (annoncesND()[k] || []).filter((x) => !x.moi);
  const base = ceSoir.length ? ceSoir.map((x) => ({ u: x.uid, n: x.n })) : hier.filter((x) => x.u !== me.uid);
  const autres = base.map((x) => forceEngagement(S.state.zones[x.u], x.n, S.state.turn));
  const ensemble = autres.length ? prevoirSecteur(S.state, s, [maForce, ...autres]) : null;
  const annonce = monAnnonceND(k);
  const regen = regenSecteur(S.state, s);
  const coul = repris ? '#E8913A' : '#E0625A';
  const statut = repris
    ? `<span class="pill green">Repris${s.chef && S.state.zones[s.chef] ? ` · ${nomZ(s.chef)}` : ''}</span>`
    : ouvert ? '<span class="pill" style="color:var(--red-soft);border-color:var(--red-line)">Aux mains du milieu</span>' : '<span class="pill">Verrouillé</span>';
  const fleche = (a, b) => (b < a - 0.5 ? `<span class="good">${Math.round(a)} → ${Math.round(b)}</span>` : b > a + 0.5 ? `<span class="bad">${Math.round(a)} → ${Math.round(b)}</span>` : `<span class="muted">${Math.round(a)} → ${Math.round(b)}</span>`);
  const seuilAgents = Math.ceil(regen / ND.efficacite / Math.max(0.5, forceEngagement(me, 1, S.state.turn)));
  let prevision = '';
  if (ouvert) {
    if (!repris) {
      const nuits = (e) => (e.emprise <= 0 ? 'repris ce soir' : e.emprise < s.emprise ? `encore ~${Math.ceil(e.emprise / Math.max(0.1, s.emprise - e.emprise))} soirs à ce rythme` : 'le milieu tient bon');
      const seuilF = regen / ND.efficacite;
      prevision = `${n && !ceSoir.length ? (maForce <= seuilF
        ? `<p class="tiny bad" style="margin:0">Toi seul : trop faible (≈ ${seuilAgents} agents). Sans autre zone, assaut repoussé, ${Math.round(ND.blesseRepousse * 100)} % de risque de blessure par agent.</p>`
        : `<p class="tiny" style="margin:0">Toi seul : ${fleche(s.emprise, seul.emprise)} · ${nuits(seul)}. <span class="warn">Seul, ${Math.round(ND.seulEchec * 100)} % de risque de piège.</span></p>`) : ''}
        ${ensemble ? `<p class="tiny" style="margin:0">${ceSoir.length ? 'Avec les zones annoncées ce soir' : 'Avec les zones d’hier'}${n ? ' et toi' : ''} (+${Math.round((ensemble.coop - 1) * 100)} %) : ${fleche(s.emprise, ensemble.emprise)} · ${nuits(ensemble)}.</p>` : ''}`;
    } else {
      const sansMoi = autres.length ? prevoirSecteur(S.state, s, autres) : null;
      const dejaGarde = sansMoi && sansMoi.emprise <= Math.max(s.emprise, 0) + 0.5;
      prevision = `<p class="tiny" style="margin:0"><strong>Secteur déjà repris : il ne s’agit plus de l’attaquer, seulement de le garder.</strong> ${s.emprise >= ND.seuilRechute - 20 ? '<strong class="bad">Il faut de la garde.</strong> ' : ''}${n ? `Ta garde (force ${fmt1(maForce)}) : ${fleche(s.emprise, seul.emprise)}.` : `Le milieu revient de ${ND.remontee} par nuit ; à ${ND.seuilRechute}, il reprend le secteur. 2 ou 3 agents de garde suffisent.`}</p>
        ${dejaGarde ? `<p class="tiny warn" style="margin:0">${ceSoir.length ? 'Les zones annoncées ce soir' : 'Les zones d’hier'} suffisent déjà à le garder. Tes agents seraient plus utiles à l’assaut d’un secteur encore aux mains du milieu.</p>` : ''}`;
    }
  }
  return `<div class="nd-detail" style="gap:6px">
    <p class="tiny muted" style="margin:0">${esc(m.texte)}</p>
    ${!ouvert ? `<p class="tiny muted" style="margin:0">Il faut tenir ${ND.coeurSeuil} secteurs de l’anneau en même temps (${Object.values(nd().secteurs).filter((x) => !x.coeur && x.statut === 'repris').length} aujourd’hui). Il rapporte ${String(ND.coeurMult).replace('.', ',')} fois plus.</p>` : ''}
    <p class="small" style="margin:0"><strong>Ce soir :</strong> ${ceSoir.length || n ? `<span class="nd-quis" style="display:inline-flex">${pastillesCeSoir([...(n ? [{ moi: true, n }] : []), ...ceSoir])}</span>` : '<span class="muted">personne d’annoncé pour l’instant</span>'}</p>
    <p class="tiny muted" style="margin:0">Hier soir : ${hier.length ? hier.map((x) => `${x.u === me.uid ? '<strong>toi</strong>' : nomZ(x.u)} (${x.n})`).join(', ') : 'personne'}${parts.length ? ` · influence : ${parts.slice(0, 4).map((p) => `${p.uid === me.uid ? '<strong>toi</strong>' : nomZ(p.uid)} ${Math.round(p.part * 100)} %`).join(', ')}${parts.length > 4 ? '…' : ''}` : ''}</p>
    ${moi && repris ? `<p class="tiny ${moi.part >= ND.partMin ? 'ok' : 'muted'}" style="margin:0">${moi.part >= ND.partMin ? `Tu touches les retombées chaque nuit (${Math.round(moi.part * 100)} % d’influence).` : `Ton influence (${Math.round(moi.part * 100)} %) est sous ${Math.round(ND.partMin * 100)} % : monte la garde pour toucher les retombées.`}</p>` : ''}
    ${gainsHtml(s, moi)}
    ${ouvert && !repris && !n ? `<p class="tiny muted" style="margin:0">Pour le faire reculer ce soir : ≈ ${seuilAgents} agents, plutôt à plusieurs zones.</p>` : ''}
    ${prevision}
    ${ouvert ? `<div class="between"><span class="small">${repris ? 'Agents de garde ce soir' : 'Agents à l’assaut ce soir'}</span>
      <span class="stepper"><button type="button" data-action="nd" data-c="${k}" data-d="-1" aria-label="Un agent de moins à ${esc(nomSecteur(k))}" ${n <= 0 ? 'disabled' : ''}>−</button><span class="n">${n}</span><button type="button" data-action="nd" data-c="${k}" data-d="1" aria-label="Un agent de plus à ${esc(nomSecteur(k))}" ${n >= ND.maxParSecteur || agentsND(d) >= ND.maxTotal ? 'disabled' : ''}>+</button></span></div>
      ${n ? (annonce === n ? `<p class="tiny ok" style="margin:0;text-align:center">✓ Annoncé à la radio : les autres zones voient que tu y vas avec ${n}.</p>`
        : `<button type="button" class="btn small ${annonce ? 'ghost' : 'primary'} block" data-action="nd-appel" data-c="${k}">📻 ${annonce ? `Mettre à jour la radio : ${n} agents au lieu de ${annonce}` : `Prévenir la radio : « j’y vais ce soir avec ${n} »`}</button>`) : ''}` : ''}
  </div>`;
}

/** Ligne compacte d'un secteur ; le secteur choisi s'ouvre en dessous. */
function ligneSecteur(k, s, me, d) {
  const m = milieuDe(s);
  const ouvert = secteurOuvert(nd(), k);
  const repris = s.statut === 'repris';
  const n = (d.secteurs || {})[k] || 0;
  const sel = S.secteurSel === k;
  const moi = partsDe(s).some((p) => p.uid === me.uid && p.part >= ND.partMin);
  const autresCeSoir = (annoncesND()[k] || []).filter((x) => !x.moi).length;
  const etat = (autresCeSoir ? ` · <span class="nd-rej">📻 ${autresCeSoir} zone${autresCeSoir > 1 ? 's' : ''}</span>` : '') + (repris ? ` · <span class="ok">✓ repris${s.chef && S.state.zones[s.chef] ? ` (${nomZ(s.chef)})` : ''}</span>` : ouvert ? '' : ' · 🔒 verrouillé');
  return `<div class="nd-sect ${sel ? 'sel' : ''}" id="nd-${k}">
    <button type="button" class="nd-row" data-action="secteur" data-c="${k}" aria-expanded="${sel}">
      <span class="col" style="gap:0;min-width:0;flex:1;text-align:left"><span class="nd-nom">${s.coeur ? '★ ' : ''}${esc(nomSecteur(k))}${moi ? ' <span class="nd-moi">toi</span>' : ''}</span><span class="tiny muted nd-titre">${esc(m.titre)}${etat}</span></span>
      ${barre(s.emprise, repris ? '#E8913A' : '#E0625A')}<span class="mono tiny nd-chiffre">${Math.round(s.emprise)}</span>
      <span class="nd-agents ${n ? '' : 'vide'}">${n || ''}</span>
    </button>
    ${sel ? carteSecteur(k, s, me, d) : ''}
  </div>`;
}

/** Bloc complet pour le Terrain. */
export function nonDroitHtml() {
  const n = nd(), me = myZone(), d = S.draft;
  if (!n || !me || !d) return '';
  const cles = Object.keys(n.secteurs).sort((a, b) => (n.secteurs[a].coeur - n.secteurs[b].coeur) || Number(a) - Number(b));
  const voisins = new Set(secteursVoisins(S.state, me.uid));
  // D'abord ce qui me concerne : mes agents de ce soir, mes secteurs tenus, ceux qui bordent ma zone.
  const rang = (k) => { const s = n.secteurs[k]; return ((d.secteurs || {})[k] ? 0 : 4) + (partsDe(s).some((p) => p.uid === me.uid) ? 0 : 2) + (voisins.has(k) ? 0 : 1); };
  const tries = cles.slice().sort((a, b) => rang(a) - rang(b) || n.secteurs[a].emprise - n.secteurs[b].emprise);
  const repris = cles.filter((k) => n.secteurs[k].statut === 'repris').length;
  const mesAgents = agentsND(d);
  const danger = secteursEnDanger();
  const bordent = [...voisins].filter((k) => n.secteurs[k].statut === 'milieu').length;
  // Secteur ouvert par défaut : là où j'ai des agents, sinon là où il y avait du monde hier, sinon le plus entamé.
  const ann = annoncesND();
  if (S.secteurSel === undefined) {
    const ouverts = tries.filter((k) => secteurOuvert(n, k));
    S.secteurSel = ouverts.find((k) => (d.secteurs || {})[k]) || ouverts.find((k) => ann[k]) || ouverts.filter((k) => n.secteurs[k].statut === 'milieu').sort((a, b) => ((n.secteurs[b].hier || []).length - (n.secteurs[a].hier || []).length) || n.secteurs[a].emprise - n.secteurs[b].emprise)[0] || null;
  }
  return `<section class="col" aria-label="Zone de non-droit" style="gap:8px" id="non-droit">
    <div class="between"><h2 class="section" style="margin:0">Zone de non-droit</h2><span class="tiny muted">${repris} repris sur ${cles.length} · tes agents ${mesAgents}/${ND.maxTotal}</span></div>
    ${ceSoirHtml(n, me, ann)}
    <div class="plan-cadre">${planNonDroit(S.state, me, S.secteurSel)}</div>
    <p class="tiny muted" style="margin:0">À plusieurs, <strong>+${Math.round(ND.coop * 100)} % par zone</strong> ; seul ou trop faible, blessés possibles.${bordent ? ` ${bordent} secteur${bordent > 1 ? 's' : ''} du milieu touche${bordent > 1 ? 'nt' : ''} ta zone.` : ''} <a href="#guide-affaires">Règles</a></p>
    ${danger.length ? `<p class="small bad" style="margin:0">⚠ ${danger.map((k) => esc(nomSecteur(k))).join(', ')} : le milieu remonte et personne de garde de ta part.</p>` : ''}
    <div class="card tight nd-liste">${tries.map((k) => ligneSecteur(k, n.secteurs[k], me, d)).join('')}</div>
  </section>`;
}

