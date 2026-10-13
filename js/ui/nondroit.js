// Zone de non-droit (Carte) : sous la maquette, le tiroir du secteur touché (verdict, rôles, détails repliés),
// puis le Parrain et la liste des secteurs. Personne n'a besoin d'accepter personne : la validation annonce à la radio.
import { S, esc, fmt1, icon, myZone } from './common.js';
import { ND, secteurOuvert, regenSecteur } from '../engine/constants.js';
import { forceEngagement } from '../engine/zone.js';
import { milieuDe, nomSecteur, partsDe, prevoirSecteur, secteursVoisins, gangCeSoir, faille, repere, ouvertCeSoir, prevoirRoles } from '../engine/nondroit.js';
import { planNonDroit } from './plan.js';
import { quartierActif, corpsQHtml, alertesQ } from './quartier.js';
import { v3Actif, reseauHtml, ligneLieutenant, confianceHtml, sceneCarte, ICO_SCENE, dernierCarreHtml, tactiqueEnTete } from './milieu.js';

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
    if (!vu[cle] || vu[cle].at < m.at) vu[cle] = { uid: m.uid, secteur: String(a.secteur), n: a.agents || 0, at: m.at, r: rolesPropres(a.roles, a.agents || 0), ...(a.tactique ? { tac: String(a.tactique) } : {}) };
  }
  for (const v of Object.values(vu)) if (v.n > 0) (out[v.secteur] ||= []).push(v);
  for (const k of Object.keys(out)) out[k].sort((a, b) => b.n - a.n);
  if (me && S.draft) for (const [k, n] of Object.entries(S.draft.secteurs || {})) if (n) (out[k] ||= []).unshift({ uid: me.uid, n, moi: true, r: rolesDe(k) });
  return out;
}

const rolesPropres = (r, n) => (r && typeof r === 'object' ? { rep: Number(r.rep) || 0, desc: Number(r.desc) || 0, bouc: Number(r.bouc) || 0, ...(Number(r.sc) > 0 ? { sc: Number(r.sc) } : {}) } : { rep: 0, desc: n || 0, bouc: 0 });
/** Mes agents par rôle sur un secteur (brouillon). Sans rôles enregistrés, tout est en descente. */
export function rolesDe(k, d = S.draft) {
  const n = ((d && d.secteurs) || {})[k] || 0;
  const r = d && d.roles && d.roles[k];
  if (r && r.rep + r.desc + r.bouc + (r.sc || 0) === n) return { sc: 0, ...r };
  return { rep: 0, desc: n, bouc: 0 };
}
export const ROLES_ND = {
  rep: { ico: '🔍', nom: 'Repérage', svc: 'Recherche', court: 'repérage' },
  desc: { ico: '🚔', nom: 'Descente', svc: 'Intervention', court: 'descente' },
  bouc: { ico: '🚧', nom: 'Bouclage', svc: 'Roulage · Proximité', court: 'bouclage' },
};
/** « 2 au repérage, 3 en descente » pour la radio. */
export function texteRoles(r) {
  const t = [];
  if (quartierActif(S.state)) {
    if (r.desc) t.push(`${r.desc} 🔨 pour casser`);
    if (r.rep) t.push(`${r.rep} 🔦 pour révéler`);
    if (r.bouc) t.push(`${r.bouc} 🛡 pour protéger`);
    return t.join(', ');
  }
  if (r.rep) t.push(`${r.rep} au repérage`);
  if (r.desc) t.push(`${r.desc} en descente`);
  if (r.bouc) t.push(`${r.bouc} au bouclage`);
  if (r.sc) t.push(`${r.sc} à la scène`);
  return t.length > 1 ? `${t.slice(0, -1).join(', ')} et ${t[t.length - 1]}` : t[0] || '';
}
/** Rôle le plus utile pour rejoindre un secteur ce soir (ce qui manque d'abord). */
export function roleManquant(k) {
  const n = nd(); const s = n && n.secteurs[k];
  if ((!s || s.statut === 'repris')) return 'desc';
  const p = prevoirRolesSecteur(k);
  if (p.besoin.rep > p.nR && !repere(s, S.state.turn)) return 'rep';
  if (p.nD && p.nB < Math.ceil(p.nD * p.ratio)) return 'bouc';
  return 'desc';
}
/** Prévision d'un secteur avec les zones annoncées ce soir et mon brouillon. */
export function prevoirRolesSecteur(k, ajout = null) {
  const s = nd().secteurs[k], me = myZone();
  const liste = (annoncesND()[k] || []).map((x) => ({ zone: S.state.zones[x.uid], r: x.moi ? rolesDe(k) : x.r }));
  if (ajout) { const mien = liste.find((x) => x.zone === me); const r0 = mien ? mien.r : { rep: 0, desc: 0, bouc: 0 }; const r = { rep: r0.rep + (ajout.rep || 0), desc: r0.desc + (ajout.desc || 0), bouc: r0.bouc + (ajout.bouc || 0) }; if (mien) mien.r = r; else liste.push({ zone: me, r }); }
  return prevoirRoles(S.state, s, liste);
}

/** Ma dernière annonce radio de ce soir sur un secteur (nombre d'agents annoncés, 0 si aucune). */
export function monAnnonceND(k) {
  const st = S.state, me = myZone();
  let der = null;
  for (const m of S.radio || []) if (m.nd && me && m.uid === me.uid && m.nd.season === st.season && m.nd.turn === st.turn && String(m.nd.secteur) === String(k) && (!der || der.at < m.at)) der = m;
  return der ? der.nd.agents : 0;
}

/** Ma dernière annonce radio de ce soir sur un secteur (l'objet nd complet : agents, rôles, tactique), ou null. */
export function derniereAnnonceND(k) {
  const st = S.state, me = myZone();
  let der = null;
  for (const m of S.radio || []) if (m.nd && me && m.uid === me.uid && m.nd.season === st.season && m.nd.turn === st.turn && String(m.nd.secteur) === String(k) && (!der || der.at < m.at)) der = m;
  return der ? der.nd : null;
}
/** Deux répartitions par rôle identiques ? (l'ordre des clés peut changer en passant par le serveur) */
export const memesRoles = (a, b) => ['rep', 'desc', 'bouc', 'sc'].every((r) => (Number((a || {})[r]) || 0) === (Number((b || {})[r]) || 0));

/** Place qu'il me reste sur un secteur (plafonds par secteur et pour toute la zone de non-droit). */
export function placeND(k, d = S.draft) {
  if (!d) return 0;
  return Math.max(0, Math.min(ND.maxParSecteur - ((d.secteurs || {})[k] || 0), ND.maxTotal - agentsND(d)));
}

/** Prévision d'un secteur si je rejoins avec n agents, en plus des zones annoncées ce soir. */
export function prevoirRejoindre(k, n) {
  const s = nd().secteurs[k], me = myZone();
  if ((s.statut !== 'repris')) {
    // Avec les rôles : on rejoint d'abord là où il manque du monde (repérage, bouclage, sinon descente).
    const aj = { rep: 0, desc: 0, bouc: 0 };
    const base = prevoirRolesSecteur(k);
    for (let i = 0; i < n; i++) {
      const p = prevoirRolesSecteur(k, aj);
      const r = !repere(s, S.state.turn) && p.nR < 2 && base.besoin.rep ? 'rep' : p.nD && p.nB < Math.ceil(p.nD * p.ratio) ? 'bouc' : 'desc';
      aj[r] += 1;
    }
    const p = prevoirRolesSecteur(k, aj);
    return { force: p.D, emprise: p.apres, regen: regenSecteur(S.state, s), coop: p.coop };
  }
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

/** Secteurs du milieu qui tombent ce soir avec 1 à 4 agents de plus (zones déjà annoncées à la radio) : { k, n }. */
export function presqueTombes() {
  if (quartierActif(S.state)) return alertesQ().tombent;
  const n0 = nd(), me = myZone();
  if ((!n0 || !me || !S.draft)) return [];
  const ann = annoncesND(), out = [];
  for (const [k, s] of Object.entries(n0.secteurs)) {
    if (s.statut !== 'milieu' || s.barricade || !secteurOuvert(n0, k) || !(ann[k] || []).some((x) => !x.moi)) continue;
    if (prevoirRejoindre(k, 0).emprise <= 0) continue; // tombe déjà avec ce qui est annoncé
    const place = placeND(k);
    for (let i = 1; i <= Math.min(4, place); i++) if (prevoirRejoindre(k, i).emprise <= 0) { out.push({ k, n: i }); break; }
  }
  return out.sort((a, b) => a.n - b.n);
}

/** Secteurs tenus avec mon influence qui risquent de retomber sans garde ce soir (pour les alertes). */
export function secteursEnDanger() {
  if (quartierActif(S.state)) return alertesQ().danger.map((x) => x.k);
  const n = nd(), me = myZone();
  if (!n || !me) return [];
  return Object.entries(n.secteurs).filter(([k, s]) => s.statut === 'repris' && (s.emprise >= ND.seuilRechute - 20 || gangCeSoir(S.state, s))
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

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const soirs = (s) => (s.soirs || []).map((j) => JOURS[j]).join(' et ');
const eurosK = (v) => `${Math.round(v * 1000).toLocaleString('fr-BE')} €`;

// ── Tiroir du secteur (refonte du 13 octobre) ───────────────────────────────────────────────────────────────
// Sous la carte, un seul tiroir : le nom, la jauge avant → après, les rôles côte à côte, UN verdict en couleur.
// Tout le reste (faille, piège, fuite, saisies, gains, explication des rôles) se déplie dans « Détails ».
// La radio n'a plus de bouton : la validation des ordres annonce les agents (annoncerNDAuto).

/** En-tête du tiroir : poignée (replier / déplier), nom, une ligne de contexte, une pastille d'état. */
function teteTiroir(k, s, sous, pill = '') {
  const replie = !!S.ndRepli;
  return `<button type="button" class="ndt-tete" data-action="nd-replier" aria-expanded="${!replie}" aria-label="${replie ? 'Déplier' : 'Replier'} la fiche de ${esc(nomSecteur(k))}">
      <span class="ndt-poignee" aria-hidden="true"></span>
      <span class="ndt-titre"><span class="ndt-nom">${s.coeur ? '★ ' : ''}${esc(nomSecteur(k))}</span><span class="ndt-sous">${sous}</span></span>
      ${pill}<span class="ndt-chev" aria-hidden="true">${icon('chevron', 16)}</span>
    </button>`;
}

/** Jauge d'emprise : où en est le milieu, et où il sera après ce soir (la part qui tombe reste en clair). */
function jauge(avant, apres, { seuil = null, libelle = 'Emprise du milieu' } = {}) {
  const a = Math.max(0, Math.min(100, avant)), b = Math.max(0, Math.min(100, apres));
  const monte = b > a + 0.5, baisse = b < a - 0.5;
  return `<div class="ndt-jauge">
      <span class="ndt-j" role="img" aria-label="${libelle} : ${Math.round(a)} aujourd’hui, ${Math.round(b)} après ce soir">
        <span class="ndt-j-av" style="width:${Math.max(2, Math.round(Math.max(a, b)))}%"></span>
        <span class="ndt-j-ap ${monte ? 'monte' : ''}" style="width:${Math.max(b > 0 ? 2 : 0, Math.round(b))}%"></span>
        ${seuil != null ? `<i class="ndt-j-seuil" style="left:${seuil}%"></i>` : ''}
      </span>
      <span class="ndt-j-n"><b>${Math.round(a)}</b> → <b class="${baisse ? 'good' : monte ? 'bad' : ''}">${Math.round(b)}</b></span>
    </div>`;
}

const verdict = (ton, html) => `<p class="ndt-verdict ${ton}" role="status">${html}</p>`;

/** Où en sont mes ordres sur ce secteur : à valider, ou validés et annoncés à la radio. */
function etatRadio(k, monN) {
  if (!monN) return '';
  const annonce = monAnnonceND(k);
  return S.ordersDirty || annonce !== monN
    ? `<p class="ndt-radio warn">${S.ordersDirty ? 'Pense à valider : tes agents seront annoncés à la radio en même temps.' : 'Validé · annonce à la radio en cours.'}</p>`
    : '<p class="ndt-radio ok">✓ Validé et annoncé à la radio.</p>';
}

/** Un stepper −/+ pour un rôle. */
function stepRole(k, role, v, plein, nom) {
  return `<span class="stepper ndt-step"><button type="button" data-action="nd-role" data-c="${k}" data-r="${role}" data-d="-1" aria-label="Un agent de moins en ${nom} à ${esc(nomSecteur(k))}" ${v <= 0 ? 'disabled' : ''}>−</button><span class="n">${v}</span><button type="button" data-action="nd-role" data-c="${k}" data-r="${role}" data-d="1" aria-label="Un agent de plus en ${nom} à ${esc(nomSecteur(k))}" ${plein ? 'disabled' : ''}>+</button></span>`;
}

/** Tiroir d'un secteur aux mains du milieu (règle des rôles : repérage, descente, bouclage). */
function ficheMilieu(k, s, me, d) {
  const T = S.state.turn, F = faille(s), m = milieuDe(s);
  const ouvert = secteurOuvert(nd(), k);
  const ann = annoncesND()[k] || [];
  const mes = rolesDe(k, d);
  const total = (x) => x.rep + x.desc + x.bouc + (x.sc || 0);
  const monN = total(mes);
  const lt = v3Actif() && s.lieutenant && !s.coeur ? s.lieutenant : null;
  const sous = `${esc(m.titre)}${lt ? ` · ${esc(lt.nom)}${lt.etat !== 'libre' ? ` (${{ garde: 'en garde à vue', tombe: 'tombé', enfui: 'en fuite' }[lt.etat] || ''})` : ''}` : ''}`;
  if (!ouvert) {
    const tenus = Object.values(nd().secteurs).filter((x) => !x.coeur && x.statut === 'repris').length;
    return `<div class="ndt nd-fiche ${S.ndRepli ? 'replie' : ''}" id="nd-${k}">
      ${teteTiroir(k, s, sous, '<span class="pill">🔒 verrouillé</span>')}
      ${S.ndRepli ? '' : `<div class="ndt-corps">${verdict('neutre', `Le QG s’ouvre quand ${ND.coeurSeuil} secteurs de l’anneau sont tenus en même temps (${tenus} aujourd’hui). Il rapporte ${String(ND.coeurMult).replace('.', ',')} fois plus.`)}
        <details class="ndt-det" data-k="ndt-det" ${S.ouverts && S.ouverts['ndt-det'] ? 'open' : ''}><summary>Détails : ce qu’il rapporte</summary><div class="ndt-det-c">${gainsHtml(s, partsDe(s).find((x) => x.uid === me.uid))}</div></details></div>`}
    </div>`;
  }
  const p = prevoirRolesSecteur(k);
  const rep = repere(s, T), repDemain = s.repere && s.repere.a > T;
  const place = Math.min(ND.maxParSecteur - monN, ND.maxTotal - agentsND(d));
  const n = { rep: p.nR, desc: p.nD, bouc: p.nB };
  const cibleDesc = Math.max(n.desc, p.besoin.desc);
  const cible = { rep: rep || repDemain ? 0 : 2, desc: cibleDesc, bouc: Math.ceil(cibleDesc * p.ratio) };
  const cases = (role) => {
    const pions = [];
    for (const x of ann) { const z = S.state.zones[x.uid]; const v = (x.moi ? mes : x.r)[role] || 0;
      for (let i = 0; i < v; i++) pions.push(`<span class="nd-case pleine ${x.moi ? 'moi' : ''}" style="--c:${x.moi ? 'var(--amber)' : esc((z && z.couleur) || '#9FB0C0')}" title="${x.moi ? 'toi' : nomZ(x.uid)}"></span>`); }
    for (let i = pions.length; i < Math.min(cible[role], 10); i++) pions.push('<span class="nd-case vide"></span>');
    return pions.join('');
  };
  const manqueB = Math.max(0, Math.ceil(n.desc * p.ratio) - n.bouc);
  const etat = {
    rep: rep || repDemain ? ['ok', 'déjà repéré'] : n.rep >= 2 ? ['ok', 'repéré demain'] : ['bad', `il en manque ${2 - n.rep}`],
    desc: !n.desc ? ['neutre', 'personne'] : p.tropFaible ? ['bad', 'trop faible'] : n.desc < cibleDesc ? ['warn', `${cibleDesc - n.desc} de plus`] : ['ok', 'assez'],
    bouc: !n.desc ? ['neutre', 'avec la descente'] : manqueB ? ['bad', `il en manque ${manqueB}`] : ['ok', 'bouclé'],
  };
  const tuile = (role) => `<div class="ndt-role ${etat[role][0]}">
      <span class="ndt-r-tete"><span class="ndt-r-ico" aria-hidden="true">${ROLES_ND[role].ico}</span><span class="col" style="gap:0;min-width:0"><b>${ROLES_ND[role].nom}</b><span class="ndt-r-svc">${ROLES_ND[role].svc}</span></span></span>
      ${stepRole(k, role, mes[role], place <= 0, ROLES_ND[role].court)}
      <span class="nd-cases">${cases(role)}</span>
      <span class="ndt-r-etat">${etat[role][1]}</span>
    </div>`;
  // Le verdict : une seule phrase qui dit ce qui va se passer ce soir, et quoi faire si ça ne suffit pas.
  const tt = tactiqueEnTete(k, ann, monN - (mes.sc || 0));
  const ltNom = lt && lt.etat === 'libre' ? esc(lt.nom) : '';
  let v;
  if (!p.nD) v = verdict('neutre', `Personne en descente ce soir : le milieu se refait. Pour le faire tomber, il faut environ <b>${p.besoin.desc} en descente</b>${cible.rep ? ' et <b>2 au repérage</b>' : ''}, à plusieurs zones.`);
  else if (p.tropFaible) v = verdict('bad', p.mult === 0 ? 'Impossible d’entrer sans repérage : mets <b>2 agents au repérage</b>.' : F.soirs && !p.ouvert ? 'Fermé ce soir : personne à cueillir. Reviens un soir d’ouverture (voir Détails).' : `Trop faible, le milieu tient. Il faut environ <b>${p.besoin.desc} en descente</b>, toutes zones comprises.`);
  else if (tt === 'frontal' || (tt === 'encercler' && p.fuite <= 0)) v = verdict('ok', `<b>Repris ce soir</b> : ${tt === 'frontal' ? 'assaut frontal sur le dernier carré' : 'encerclé sans fuite, saisies ×2'}.`);
  else if (p.apres <= 0) v = ltNom && p.fuite >= 0.5 ? verdict('warn', `<b>Repris ce soir</b>, mais ${ltNom} filerait : ajoute <b>${Math.max(1, manqueB)} au bouclage</b> pour l’arrêter.`)
    : verdict('ok', `<b>Repris ce soir</b>${ltNom ? ` · ${ltNom} arrêté, il parlera` : ''}.`);
  else v = verdict('warn', `Pas encore repris ce soir (emprise ${Math.round(s.emprise)} → ${Math.round(p.apres)}). ${manqueB ? `Ajoute <b>${manqueB} au bouclage</b> pour limiter la fuite, puis` : 'Il faut'} plus de monde en descente.`);
  const piege = p.nD && p.piege > 0.2 ? `<p class="ndt-note bad">⚠ ${Math.round(p.piege * 100)} % de risque de piège : sans repérage, des agents peuvent revenir blessés.</p>` : '';
  const effet = { rep: 'Révèle la faille. Repéré les 4 soirs suivants : descente plus forte, sans piège. 15 % des saisies pour ceux qui ont repéré.',
    desc: 'Fait tomber l’emprise : c’est elle qui reprend le secteur.',
    bouc: `Ferme les sorties : moins de fuite, plus de saisies, le lieutenant arrêté. Ici, 1 pour ${p.ratio >= 1 ? '1' : '2'} en descente.` };
  const partMoi = (() => { if (!monN || !p.butin) return 0; const w = (x) => (x.rep * ND.roles.poidsRep + x.desc + x.bouc); const tot = ann.reduce((a, x) => a + w(x.moi ? mes : x.r), 0) || 1; return w(mes) / tot * (rep && s.repere && s.repere.par.length ? 1 - ND.roles.tuyau : 1) + (rep && s.repere && s.repere.par.includes(me.uid) ? ND.roles.tuyau / s.repere.par.length : 0); })();
  const pill = rep ? '<span class="pill nd-rep">🔍 repéré</span>' : repDemain ? '<span class="pill nd-rep">🔍 demain</span>' : '';
  const sc = sceneCarte(k);
  return `<div class="ndt nd-fiche ${S.ndRepli ? 'replie' : ''}" id="nd-${k}">
    ${teteTiroir(k, s, sous, pill)}
    ${S.ndRepli ? '' : `<div class="ndt-corps">
      ${jauge(s.emprise, p.nD && !p.tropFaible ? p.apres : s.emprise)}
      <div class="ndt-qui">${ann.length ? `${pionsCeSoir(ann.map((x) => (x.moi ? { ...x, n: monN } : x)))}<span>${ann.reduce((t, x) => t + (x.moi ? monN : x.n), 0)} agents annoncés ce soir</span>` : '<span>Personne d’annoncé ce soir.</span>'}</div>
      ${p.guetteurs && !rep ? '<p class="ndt-note bad">👁 Le milieu a doublé ses guetteurs : sans repérage, piège plus probable.</p>' : ''}
      ${sc ? `<a class="ml-chip" href="#hp">${ICO_SCENE[sc.type]} Scène ce soir ici · à régler sur l’HP ›</a>` : ''}
      <div class="ndt-roles">${tuile('rep')}${tuile('desc')}${tuile('bouc')}</div>
      ${dernierCarreHtml(k, s, ann, monN - (mes.sc || 0))}
      ${v}${piege}
      ${etatRadio(k, monN)}
      <details class="ndt-det" data-k="ndt-det" ${S.ouverts && S.ouverts['ndt-det'] ? 'open' : ''}><summary>Détails : faille, prévision, gains</summary>
        <div class="ndt-det-c">
          ${ligneLieutenant(k, s)}
          <p class="tiny muted" style="margin:0">${esc(m.texte)}</p>
          ${s.connue ? `<div class="nd-faille connue"><strong class="small">Faille : ${esc(F.titre)}</strong><span class="tiny">${esc(F.texte)}${F.soirs ? ` <strong>Ouvert le ${soirs(s)}</strong> (ce soir : ${ouvertCeSoir(s, T) ? '<span class="ok">ouvert</span>' : '<span class="bad">fermé</span>'}).` : ''}</span></div>`
            : '<div class="nd-faille"><strong class="small">❔ Faille inconnue</strong><span class="tiny muted">Un repérage la révèle à toutes les zones.</span></div>'}
          ${p.nD ? `<dl class="nd-prev">
            <dt>Piège</dt><dd class="${p.piege > 0.2 ? 'bad' : p.piege ? 'warn' : 'ok'}">${p.piege ? `${Math.round(p.piege * 100)} %` : 'non'}</dd>
            <dt>Fuite</dt><dd class="${p.fuite > 0.3 ? 'bad' : p.fuite > 0 ? 'warn' : 'ok'}">${Math.round(p.fuite * 100)} %</dd>
            ${p.rens && p.rens.length ? `<dt>Dossier</dt><dd class="ok">${p.rens.length} renseignement${p.rens.length > 1 ? 's' : ''} apporté${p.rens.length > 1 ? 's' : ''} (+${p.rens.length * 12} %)</dd>` : ''}
            <dt>Saisies</dt><dd>~${eurosK(p.butin)}${partMoi ? ` · <span class="warn">toi ~${eurosK(p.butin * partMoi)}</span>` : ''}</dd>
          </dl>` : ''}
          <ul class="ndt-aide">${['rep', 'desc', 'bouc'].map((r) => `<li><b>${ROLES_ND[r].ico} ${ROLES_ND[r].nom}</b> · ${effet[r]}</li>`).join('')}
            <li>À plusieurs zones, <b>+${Math.round(ND.coop * 100)} % par zone</b> ; seul ou trop faible, des blessés sont possibles. <a href="#guide-affaires">Règles</a></li></ul>
          ${gainsHtml(s, partsDe(s).find((x) => x.uid === me.uid))}
        </div></details>
    </div>`}
  </div>`;
}

/** Tiroir d'un secteur repris : il ne s'agit plus d'attaquer, seulement de garder (et de rassurer les habitants). */
function ficheRepris(k, s, me, d) {
  const m = milieuDe(s);
  const n = (d.secteurs || {})[k] || 0;
  const parts = partsDe(s), moi = parts.find((x) => x.uid === me.uid);
  const hier = (s.hier || []).filter((x) => S.state.zones[x.u]);
  const gang = gangCeSoir(S.state, s);
  const ceSoir = (annoncesND()[k] || []).filter((x) => !x.moi);
  const maForce = n ? forceEngagement(me, n, S.state.turn) : 0;
  const autres = ceSoir.map((x) => forceEngagement(S.state.zones[x.uid], x.n, S.state.turn));
  const p = prevoirSecteur(S.state, s, [maForce, ...autres]);
  const sansMoi = autres.length ? prevoirSecteur(S.state, s, autres) : null;
  const assuree = p.emprise <= Math.max(s.emprise, 0) + 0.5;
  const dejaGarde = sansMoi && sansMoi.emprise <= Math.max(s.emprise, 0) + 0.5;
  const tombe = p.emprise >= ND.seuilRechute;
  const chef = s.chef && S.state.zones[s.chef] ? (s.chef === me.uid ? 'toi' : nomZ(s.chef)) : '';
  const sous = `Repris${chef ? ` · ${chef}` : ''} · ${esc(m.titre)}`;
  const plein = n >= ND.maxParSecteur || agentsND(d) >= ND.maxTotal;
  const r = rolesDe(k, d);
  const tuiles = v3Actif()
    ? `<div class="ndt-roles deux">
        <div class="ndt-role"><span class="ndt-r-tete"><span class="ndt-r-ico" aria-hidden="true">🛡</span><span class="col" style="gap:0;min-width:0"><b>Garde</b><span class="ndt-r-svc">Intervention</span></span></span>${stepRole(k, 'desc', r.desc + r.rep, plein, 'garde')}<span class="ndt-r-etat">repousse le milieu</span></div>
        <div class="ndt-role"><span class="ndt-r-tete"><span class="ndt-r-ico" aria-hidden="true">🤝</span><span class="col" style="gap:0;min-width:0"><b>Présence</b><span class="ndt-r-svc">Proximité</span></span></span>${stepRole(k, 'bouc', r.bouc, plein, 'présence')}<span class="ndt-r-etat">garde + confiance</span></div>
      </div>`
    : `<div class="ndt-roles un"><div class="ndt-role"><span class="ndt-r-tete"><span class="ndt-r-ico" aria-hidden="true">🛡</span><b>Agents de garde</b></span>
        <span class="stepper ndt-step"><button type="button" data-action="nd" data-c="${k}" data-d="-1" aria-label="Un agent de moins à ${esc(nomSecteur(k))}" ${n <= 0 ? 'disabled' : ''}>−</button><span class="n">${n}</span><button type="button" data-action="nd" data-c="${k}" data-d="1" aria-label="Un agent de plus à ${esc(nomSecteur(k))}" ${plein ? 'disabled' : ''}>+</button></span></div></div>`;
  let v;
  if (n && dejaGarde && !gang) v = verdict('warn', 'Les autres zones suffisent déjà à le garder : tes agents seraient plus utiles à un assaut.');
  else if (tombe) v = verdict('bad', `<b>Il retombe ce soir</b> sans plus de garde (milieu ${Math.round(s.emprise)} → ${Math.round(p.emprise)}, rechute à ${ND.seuilRechute}).${gang ? ' Face au gang, il faut une vraie garde à plusieurs zones.' : ''}`);
  else if (assuree) v = verdict('ok', `<b>Garde assurée ce soir</b>${gang ? ' : le gang est repoussé' : ''}.`);
  else if (p.emprise < ND.seuilRechute - 20) v = verdict('ok', `<b>Le secteur tient ce soir</b> : le milieu remonte un peu (${Math.round(s.emprise)} → ${Math.round(p.emprise)}), la rechute est à ${ND.seuilRechute}.${n ? '' : ' Un peu de garde le ferait redescendre.'}`);
  else v = verdict('warn', `Le milieu remonte vite (${Math.round(s.emprise)} → ${Math.round(p.emprise)}, rechute à ${ND.seuilRechute}) : ${gang ? 'face au gang, il faut une vraie garde à plusieurs zones' : 'ajoute 2 ou 3 agents de garde'}.`);
  return `<div class="ndt nd-fiche ${S.ndRepli ? 'replie' : ''}" id="nd-${k}">
    ${teteTiroir(k, s, sous, '<span class="pill green">✓ repris</span>')}
    ${S.ndRepli ? '' : `<div class="ndt-corps">
      ${jauge(s.emprise, p.emprise, { seuil: ND.seuilRechute, libelle: 'Retour du milieu' })}
      <div class="ndt-qui">${ceSoir.length || n ? `${pionsCeSoir([...(n ? [{ moi: true, n }] : []), ...ceSoir])}<span>${n + ceSoir.reduce((t, x) => t + x.n, 0)} agents de garde ce soir</span>` : '<span>Personne de garde annoncé ce soir.</span>'}</div>
      ${gang ? `<p class="ndt-note bad">⚠️ <b>${gang.represailles ? 'Représailles' : 'Un gang attaque'} ce soir</b> (+${gang.force} d’emprise). Repoussé : +${ND.gangs.rep} de réputation et +${ND.gangs.ps} PS à chaque zone de garde.</p>` : ''}
      ${tuiles}
      ${v}
      ${etatRadio(k, n)}
      ${confianceHtml(k, s, v3Actif() ? r.bouc : 0)}
      <details class="ndt-det" data-k="ndt-det" ${S.ouverts && S.ouverts['ndt-det'] ? 'open' : ''}><summary>Détails : influence, gains</summary>
        <div class="ndt-det-c">
          <p class="tiny muted" style="margin:0">${esc(m.texte)}</p>
          <p class="tiny" style="margin:0">Hier soir : ${hier.length ? hier.map((x) => `${x.u === me.uid ? '<strong>toi</strong>' : nomZ(x.u)} (${x.n})`).join(', ') : 'personne'}${parts.length ? ` · influence : ${parts.slice(0, 4).map((q) => `${q.uid === me.uid ? '<strong>toi</strong>' : nomZ(q.uid)} ${Math.round(q.part * 100)} %`).join(', ')}${parts.length > 4 ? '…' : ''}` : ''}</p>
          ${moi ? `<p class="tiny ${moi.part >= ND.partMin ? 'ok' : 'muted'}" style="margin:0">${moi.part >= ND.partMin ? `Tu touches les retombées chaque nuit (${Math.round(moi.part * 100)} % d’influence).` : `Ton influence (${Math.round(moi.part * 100)} %) est sous ${Math.round(ND.partMin * 100)} % : monte la garde pour toucher les retombées.`}</p>` : ''}
          ${gainsHtml(s, moi)}
        </div></details>
    </div>`}
  </div>`;
}

function carteSecteur(k, s, me, d) {
  return s.statut === 'repris' ? ficheRepris(k, s, me, d) : ficheMilieu(k, s, me, d);
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
  const gang = repris ? gangCeSoir(S.state, s) : null;
  const sc = !repris ? sceneCarte(k) : null;
  const etat = (sc ? ` · <span class="warn">${ICO_SCENE[sc.type]} ${sc.type === 'emeute' ? 'émeute' : sc.type === 'rodeo' ? 'rodéo' : sc.type} ce soir</span>` : '') + (v3Actif() && !repris && s.lieutenant ? ` · ${esc(s.lieutenant.nom)}` : '') + (gang ? ` · <span class="bad">⚠️ ${gang.represailles ? 'représailles' : 'gang'} ce soir (+${gang.force})</span>` : '') + (autresCeSoir ? ` · <span class="nd-rej">📻 ${autresCeSoir} zone${autresCeSoir > 1 ? 's' : ''}</span>` : '') + (repris ? ` · <span class="ok">✓ repris${s.chef && S.state.zones[s.chef] ? ` (${nomZ(s.chef)})` : ''}</span>` : ouvert ? '' : ' · 🔒 verrouillé');
  return `<div class="nd-sect ${sel ? 'sel' : ''}" id="nd-${k}">
    <button type="button" class="nd-row" data-action="secteur" data-c="${k}" aria-expanded="${sel}">
      <span class="col" style="gap:0;min-width:0;flex:1;text-align:left"><span class="nd-nom">${s.coeur ? '★ ' : ''}${esc(nomSecteur(k))}${moi ? ' <span class="nd-moi">toi</span>' : ''}</span><span class="tiny muted nd-titre">${esc(m.titre)}${etat}</span></span>
      ${barre(s.emprise, repris ? '#E8913A' : '#E0625A')}<span class="mono tiny nd-chiffre">${Math.round(s.emprise)}</span>
      <span class="nd-agents ${n ? '' : 'vide'}">${n || ''}</span>
    </button>
    ${sel ? carteSecteur(k, s, me, d) : ''}
  </div>`;
}

/** Bloc complet : le tiroir du secteur choisi (juste sous la carte), puis le Parrain et la liste des secteurs. */
export function nonDroitHtml({ sansPlan = false } = {}) {
  const n = nd(), me = myZone(), d = S.draft;
  if (!n || !me || !d) return '';
  // « Le Quartier » : le plateau (sauf sur la Carte, qui le montre à la place de la maquette) et la fiche du secteur.
  if (quartierActif(S.state)) return `<section class="col" aria-label="Zone de non-droit" style="gap:8px" id="non-droit">${sansPlan ? '' : '<p class="tiny muted" style="margin:0"><a href="#carte">Voir le non-droit sur la carte</a></p>'}${corpsQHtml()}</section>`;
  const cles = Object.keys(n.secteurs).sort((a, b) => (n.secteurs[a].coeur - n.secteurs[b].coeur) || Number(a) - Number(b));
  const voisins = new Set(secteursVoisins(S.state, me.uid));
  // D'abord ce qui me concerne : mes agents de ce soir, mes secteurs tenus, ceux qui bordent ma zone.
  const rang = (k) => { const s = n.secteurs[k]; return ((d.secteurs || {})[k] ? 0 : 4) + (partsDe(s).some((p) => p.uid === me.uid) ? 0 : 2) + (voisins.has(k) ? 0 : 1); };
  const tries = cles.slice().sort((a, b) => rang(a) - rang(b) || n.secteurs[a].emprise - n.secteurs[b].emprise);
  const danger = secteursEnDanger();
  // Secteur ouvert par défaut : là où j'ai des agents, sinon là où des zones s'annoncent, sinon le plus fréquenté hier.
  const ann = annoncesND();
  if (S.secteurSel === undefined) {
    const ouverts = tries.filter((k) => secteurOuvert(n, k));
    S.secteurSel = ouverts.find((k) => (d.secteurs || {})[k]) || ouverts.find((k) => ann[k]) || ouverts.filter((k) => n.secteurs[k].statut === 'milieu').sort((a, b) => ((n.secteurs[b].hier || []).length - (n.secteurs[a].hier || []).length) || n.secteurs[a].emprise - n.secteurs[b].emprise)[0] || null;
  }
  const sel = S.secteurSel && n.secteurs[S.secteurSel] ? S.secteurSel : null;
  // En liste, seulement ce qui te concerne (tes agents, tes secteurs tenus, ceux en danger, ceux où une zone s'annonce) ; le reste se replie.
  const utile = (k) => (d.secteurs || {})[k] || ann[k] || danger.includes(k) || partsDe(n.secteurs[k]).some((p) => p.uid === me.uid && p.part >= ND.partMin);
  const miens = tries.filter((k) => k !== sel && utile(k));
  const autres = tries.filter((k) => k !== sel && !utile(k));
  const ouvertAutres = S.ouverts && S.ouverts['nd-autres'];
  return `<section class="col nd-v4" aria-label="Zone de non-droit" style="gap:10px" id="non-droit">
    ${sansPlan ? '' : `<div class="plan-cadre">${planNonDroit(S.state, me, S.secteurSel)}</div>`}
    ${sel ? carteSecteur(sel, n.secteurs[sel], me, d) : `<p class="ndt-astuce">👆 Touche un secteur sur ${sansPlan ? 'la carte' : 'le plan'} pour l’ouvrir.</p>`}
    ${danger.length ? `<p class="small bad" style="margin:0">⚠ ${danger.map((k) => esc(nomSecteur(k))).join(', ')} : le milieu remonte et personne de garde de ta part.</p>` : ''}
    ${reseauHtml(me)}
    ${miens.length ? `<div class="card tight nd-liste">${miens.map((k) => ligneSecteur(k, n.secteurs[k], me, d)).join('')}</div>` : ''}
    ${autres.length ? `<details class="nd-autres" data-k="nd-autres" ${ouvertAutres ? 'open' : ''}><summary class="small">${miens.length || sel ? 'Les' : 'Tous les'} ${autres.length} autre${autres.length > 1 ? 's' : ''} secteur${autres.length > 1 ? 's' : ''} ${icon('chevron', 14)}</summary>
      <div class="card tight nd-liste" style="margin-top:8px">${autres.map((k) => ligneSecteur(k, n.secteurs[k], me, d)).join('')}</div></details>` : ''}
  </section>`;
}
