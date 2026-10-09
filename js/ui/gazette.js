import { portraitChef } from './chef.js';
import { noteCourte } from './nouveautes.js';
import { partageHtml } from './invitation.js';
// La Gazette du Delta, le classement, l'espace maître du jeu.
import { S, esc, icon, tabbar, myZone, zoneName, gradeInfo, fmt1, classementLive } from './common.js';
import { GRADES, LOTS, ENCHERE, PS, SEASON_LENGTH, IPZ_POIDS, MIN_TOURS_CLASSEMENT, DOCTRINES } from '../engine/constants.js';
import { pointsIpz, IPZ_LABELS } from '../engine/zone.js';
import { insigne } from './blasons.js';
import { regrouperHonneur } from '../engine/honneur.js';
import { apercuDirecteur, REGLAGES, DISTRICT } from '../engine/directeur.js';
import { affaire, texteMisePrix, affairesOuvrables } from '../engine/enquete.js';
import { formatDateBe, formatHeureBe } from '../engine/time.js';
import { debriefsRecents, lienDebrief } from './debrief.js';
import { reglesV2 } from '../engine/regles.js';
import { renderGazetteStories } from './gazette-stories.js';

export function renderGazette() {
  const list = S.gazettes;
  const me = myZone();
  if (!list.length) {
    return `<main class="screen"><a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
      <div class="paper"><div class="mast"><h1>La Gazette du Delta</h1></div><p>Le premier numéro paraîtra ce soir à 20:00. Passe tes ordres d’ici là !</p></div></main>${tabbar('hp')}`;
  }
  // Saison 2 : la Gazette en cartes à toucher (« stories »).
  if (reglesV2(S.state)) return renderGazetteStories();
  const i = Math.min(S.gazetteIndex, list.length - 1);
  const g = list[i];
  const sansFaillite = null;
  const rapport = g.rapports && g.rapports[me.uid];
  return `<main class="screen">
    <div class="between"><a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
      <div class="row" style="gap:4px">
        <button class="iconbtn" data-action="gazette-nav" data-d="1" ${i >= list.length - 1 ? 'disabled' : ''} aria-label="Numéro précédent">${icon('back', 18)}</button>
        <span class="tiny muted mono">n° ${g.turn} · S${g.season}</span>
        <button class="iconbtn" data-action="gazette-nav" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Numéro suivant">${icon('chevron', 18)}</button>
      </div></div>
    <article class="paper journal">
      <header class="mast">
        <div class="meta"><span>Édition du soir · n° ${g.turn}</span><span>Saison ${g.season}</span></div>
        <h1>La Gazette du Delta</h1>
        <div class="devise">Le quotidien du district · ${g.date ? `${formatDateBe(g.date)}, ${formatHeureBe(g.date)}` : `tour ${g.turn}`}</div>
        ${g.toursSansFaillite !== undefined ? `<div class="chantier">District Delta : <strong>${g.toursSansFaillite}</strong> tour${g.toursSansFaillite > 1 ? 's' : ''} sans faillite</div>` : ''}
        ${g.prochainLot && LOTS[g.prochainLot.lot] ? `<div class="devise">Aujourd’hui à la salle des ventes : <strong>${esc(LOTS[g.prochainLot.lot].nom)}</strong>, mise à prix ${g.prochainLot.prixMin} k€${LOTS[g.prochainLot.lot].reserve ? ` (réputation ${ENCHERE.repReserve}+)` : ''}</div>` : ''}</header>
      ${g.finSaison ? `<section class="box sombre"><span class="k" style="color:#FFB23F">Fin de la saison ${g.finSaison.season}</span>
        ${g.finSaison.titres.map((t) => { const z = S.state.zones[t.uid]; return `<p style="color:#F4EFE3">${icon('trophy', 13)} <strong>${esc(t.titre)}</strong> : ${z ? zoneName(z) : ''}</p>`; }).join('')}
        <p style="color:#C9B68F">La saison ${g.finSaison.saisonSuivante} commence : budgets et effectifs repartent des valeurs de départ. Chaque zone reçoit son Bilan de saison : quelques imprévus (pension, matériel cassé, entretien), à remettre en état ou à accepter dans les 3 premiers jours.</p>${(S.state.regles || 1) >= 2 ? '<p style="color:#F4EFE3"><strong>Nouveau cette saison :</strong> ton <strong>chef de corps</strong> prend ses fonctions (portrait, parcours, compétences, talents, agenda), quatre <strong>nouvelles annexes</strong> dans des emplacements limités, et la <strong>doctrine</strong> de ta zone à choisir dans tes ordres. Le classement compte désormais tous les jours de la saison.</p>' : ''}${g.finSaison.anticipee ? '<p style="color:#C9B68F">Saison écourtée par le maître du jeu : le bilan de fin de saison est allégé (au plus un niveau par élément).</p>' : ''}${g.finSaison.filetManque ? `<p style="color:#C9B68F">${esc(g.finSaison.filetManque)} a filé entre les mailles avant l’Opération Filet. On le reverra peut-être.</p>` : ''}</section>` : ''}
      <section class="une"><span class="k">${esc(g.une.kicker)}</span><h2>${esc(g.une.titre)}</h2>${g.une.texte ? `<p class="lettrine${/^[A-Za-zÀ-ÿ]/.test(g.une.texte) ? '' : ' sans'}">${esc(g.une.texte)}</p>` : ''}</section>
      ${g.breves && g.breves.length ? `<div class="rule double"></div>
        <div class="colonnes">${g.breves.slice(0, 6).map((b) => `<section class="breve"><span class="k">${esc(b.kicker)}</span><h3>${esc(b.titre)}</h3>${b.texte ? `<p>${esc(b.texte)}</p>` : ''}</section>`).join('')}</div>` : ''}
      ${(g.tribunal || []).length ? `<section class="tribunal"><span class="k">Au tribunal</span>${g.tribunal.map((p) => `<div class="proces"><h3>${esc(p.suspect)}</h3><p class="peine">${esc(p.peine)}</p>
        <p>Affaire « ${esc(p.titre)} ».${p.temoins.length ? ` Cités à la barre : les enquêteurs de ${esc(p.temoins.join(', '))}.` : ''} Interpellation par ${esc(p.arrestation.join(' et '))}.</p></div>`).join('')}</section>` : ''}
      ${enqueteGazette(g)}
      ${(g.honneur || []).length ? `<div class="rule"></div><section class="col" style="gap:5px"><span class="k">Tableau d’honneur</span>${regrouperHonneur(g.honneur).map((h) => `<p><span class="etoile">★</span> <strong>${esc(h.titre)}</strong>${h.texte ? `. ${esc(h.texte)}` : ''}</p>`).join('')}</section>` : ''}
      ${(g.echos || []).length || (g.betisier || []).length ? `<div class="rule double"></div><div class="colonnes bas">
        ${(g.echos || []).length ? `<section class="echos"><span class="k">Échos du district</span>${g.echos.map((l) => `<p>${esc(l)}</p>`).join('')}</section>` : ''}
        ${(g.betisier || []).length ? `<section class="betisier"><span class="k">Le bêtisier</span>${g.betisier.map((b) => `<p><strong>${esc(b.titre)}</strong>${b.texte ? ` ${esc(b.texte)}` : ''}</p>`).join('')}</section>` : ''}
      </div>` : ''}
      ${rapport && rapport.length ? `<details class="rapport-g"><summary><span class="k">Ton rapport de la nuit</span></summary>${rapport.map((l) => `<p style="font-size:12.5px">• ${esc(l)}</p>`).join('')}</details>` : ''}
      <section class="box" aria-label="Classement"><div class="rank tiny" style="font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px"><span>Classement</span><span>Moyenne · jour</span></div>
        ${g.classement.slice(0, 8).map((c, k) => `<div class="rank" ${c.uid === me.uid ? 'style="font-weight:700"' : ''}><span>${c.classe ? `<strong>${k + 1}.</strong>` : '<span style="color:var(--ink3)">–</span>'} ZP ${esc(c.code)} ${esc(c.nom)} ${S.state.zones[c.uid] ? insigne(S.state.zones[c.uid].ps) : ''}</span><span class="mono">${fmt1(c.moyenne)} <span style="color:var(--ink3)">· ${fmt1(c.ipz)}</span></span></div>`).join('')}
        <p style="font-size:11px;color:var(--ink3)">Classé à partir de 5 tours joués.</p></section>
      <p class="colophon">La rédaction salue ses lecteurs les plus attentifs.</p>
    </article>
  </main>${tabbar('hp')}`;
}

function enqueteGazette(g) {
  const e = g.enquete, f = g.fipa || [];
  if (!e && !f.length) return '';
  const l = [];
  // Dossier clos : le débrief de l'affaire terminée ce soir.
  const dbs = debriefsRecents().filter((x) => x.g === g);
  if (e) {
    if (e.decouverte) l.push(`<p><strong>${esc(e.titre)}</strong> : ${esc(e.decouverte.suspect)}${e.decouverte.complice ? ` et ${esc(e.decouverte.complice)}, son complice,` : ''} démasqué${e.decouverte.complice ? 's' : ''} au jour ${e.jour} par ${esc(e.decouverte.zones.join(' et '))} (${e.decouverte.pts} pts). La traque commence.</p>`);
    for (const a of e.arrestations || []) l.push(a.planque ? `<p><strong>Arrestation</strong> : ${esc(a.suspect)}, à ${esc(a.planque)}, par ${esc(a.zones.join(' et '))}.</p>` : `<p><strong>Aveux</strong> : ${esc(a.suspect)}, confronté·e par ${esc(a.zones.join(' et '))}.</p>`);
    for (const a of e.fuites || []) l.push(`<p><strong>Fuite</strong> : ${esc(a.suspect)} se cachait à ${esc(a.planque)}.</p>`);
    if (e.classee && e.solution) l.push(`<p><strong>${esc(e.titre)}</strong> classée sans suite. La solution : ${esc(e.solution.suspect)}${e.solution.complice ? ` et ${esc(e.solution.complice)}, son complice` : ''}${e.solution.planque ? `, planque « ${esc(e.solution.planque)} »` : ''}.</p>`);
    if (!e.decouverte && !e.classee && !e.pause) l.push(`<p><strong>${esc(e.titre)}</strong> : jour ${e.jour}, toujours pas d’auteur identifié.</p>`);
    if (e.rebond) l.push(`<p><strong>${esc(e.rebond.titre)}</strong>. ${esc(e.rebond.texte)}</p>`);
    if (dbs.length) l.push(dbs.map((x) => lienDebrief(x)).join(''));
    // Tant que la traque court, la planque ne figure pas dans le fin mot (anciens numéros compris).
    const traqueEnCours = (S.state.traques || []).some((t) => t.n === e.n && !t.fini);
    let fem = false;
    try { const af = affaire(S.state, e.n); fem = !!(af && af.suspects[af.coupable] && af.suspects[af.coupable].f); } catch (x) { /* affaire introuvable : masculin par défaut */ }
    const recit = e.recit && traqueEnCours ? e.recit.replace(/ [^.]*a caché le butin dans la planque « [^»]*» \([^)]*\)\./, ` Où ${fem ? 'elle' : 'il'} se cache reste à trouver : c’est l’enjeu de la traque.`).replace(/ Où il ou elle se cache/, ` Où ${fem ? 'elle' : 'il'} se cache`) : e.recit;
    if (recit) {
      // Anciens récits : les innocents sur une ligne ; nouveaux : un paragraphe par personne.
      const [tete, ...autres] = String(recit).split('\n');
      l.push(`<p><em>Le fin mot de l’affaire : ${esc(tete)}</em></p>${autres.length ? `<p class="k" style="margin-top:4px">Les autres suspects</p>${autres.map((x) => `<p><em>${esc(x)}</em></p>`).join('')}` : ''}`);
    }
    if (e.nouvelle) l.push(`<p>Nouvelle affaire ouverte : <strong>${esc(e.nouvelle)}</strong>. ${esc(texteMisePrix())}</p>`);
  }
  for (const x of f) {
    const txt = !x.mult ? 'dispositif raté' : x.choixA === 'partager' && x.choixB === 'partager' ? 'succès partagé' : x.choixA === x.choixB ? 'chacun revendique le mérite' : `${x.choixA === 'revendiquer' ? x.a : x.b} revendique seul le succès`;
    l.push(`<p><strong>FIPA ${esc(x.titre)}</strong> (${esc(x.a)} et ${esc(x.b)}) : ${esc(txt)}.</p>`);
  }
  return `<div class="rule"></div><section class="col" style="gap:4px"><span class="k">Enquête et FIPA</span>${l.join('')}</section>`;
}

// Esprit vif : score aux énigmes du jour, depuis le début de la partie.
// Le score tient compte du taux de réussite ET du nombre d'énigmes : on ajoute à chaque joueur
// ENIG_POIDS énigmes « fictives » réussies au taux moyen du district (moyenne bayésienne).
// Peu d'énigmes → score tiré vers la moyenne ; beaucoup → score proche de son vrai taux.
// Ex. (moyenne 80 %) : 21/21 → 93,5 · 20/21 → 90,3 · 3/3 → 84,6 · 18/21 → 83,9.
const MIN_ENIGMES = 3;
const ENIG_POIDS = 10;
export function scoreEnigmes(ok, n, moyenne) { return (100 * (ok + ENIG_POIDS * moyenne)) / (n + ENIG_POIDS); }
function classementEnigmes(me) {
  // Compteurs tenus par le tour de 20:00 (aucune lecture en plus) ; repris de l'historique au premier tour qui les calcule.
  if (!S.state.enigCarriereInit) return `<section class="card"><h2 class="card-title">Esprit vif · énigmes du jour</h2><p class="small muted" style="margin:0">Le classement des énigmes se met à jour au tour de 20:00 : il sera là ce soir.</p></section>`;
  const par = {};
  const noirs = {};
  for (const z of Object.values(S.state.zones)) {
    const c = z.enigCarriere;
    if (!c) continue;
    if (c.n) par[z.uid] = { ok: c.ok, n: c.n };
    if (c.noirN) noirs[z.uid] = { ok: c.noirOk, n: c.noirN };
  }
  const tous = Object.values(par).reduce((t, x) => [t[0] + x.ok, t[1] + x.n], [0, 0]);
  const moyenne = Math.min(0.8, Math.max(0.4, tous[1] ? tous[0] / tous[1] : 0.6));
  const lignes = Object.entries(par).map(([uid, x]) => ({ z: S.state.zones[uid], ...x, pct: x.n ? (100 * x.ok) / x.n : 0, score: scoreEnigmes(x.ok, x.n, moyenne), classe: x.n >= MIN_ENIGMES }))
    .sort((a, b) => (b.classe - a.classe) || (b.score - a.score) || (b.ok - a.ok));
  let rang = 0;
  return `<section class="card"><h2 class="card-title">Esprit vif · énigmes du jour</h2>
    ${lignes.length ? lignes.map((l) => couloir({ z: l.z, rang: l.classe ? ++rang : 0, classe: l.classe, valeur: l.score, txt: `${String(Math.round(l.score * 10) / 10).replace('.', ',')} pts`, me: l.z.uid === me.uid,
      sous: `${l.ok} réussie${l.ok > 1 ? 's' : ''} sur ${l.n} (${Math.round(l.pct)} %)${noirs[l.z.uid] && noirs[l.z.uid].ok ? ` · 🕵 ${noirs[l.z.uid].ok} dossier${noirs[l.z.uid].ok > 1 ? 's' : ''} noir${noirs[l.z.uid].ok > 1 ? 's' : ''}` : ''}${l.classe ? '' : ` · classé dès ${MIN_ENIGMES} réponses`}` })).join('') : '<p class="small muted" style="margin:0">Personne n’a encore répondu à une énigme.</p>'}
    <p class="small muted" style="margin:0">Score = taux de réussite pondéré par le nombre d’énigmes : chacun part avec ${ENIG_POIDS} énigmes fictives à la moyenne du district (${Math.round(moyenne * 100)} %). Plus tu réponds, plus c’est ton vrai taux qui compte : 21 sur 21 passe devant 3 sur 3. Classé dès ${MIN_ENIGMES} réponses. Les dossiers noirs (🕵) ne comptent pas dans le score : ils ont leur propre classement juste en dessous.</p></section>${noirsHtml(noirs, me)}`;
}

/** Dossiers noirs (énigmes hardcore) : résolus depuis le début de la partie, et le compte de la saison pour le titre « Cerveau du district ». */
function noirsHtml(noirs, me) {
  const zs = Object.values(S.state.zones).map((z) => ({ z, ok: (noirs[z.uid] || {}).ok || 0, n: (noirs[z.uid] || {}).n || 0, saison: (z.stats && z.stats.noirs) || 0 }))
    .filter((x) => x.n || x.saison).sort((a, b) => (b.saison - a.saison) || (b.ok - a.ok) || (a.n - b.n));
  const max = Math.max(1, ...zs.map((x) => x.ok));
  return `<section class="card" style="gap:8px"><h2 class="card-title">🕵 Dossiers noirs · énigmes hardcore</h2>
    ${zs.length ? zs.map((x, k) => couloir({ z: x.z, rang: k + 1, classe: x.ok > 0 || x.saison > 0, valeur: x.ok, max, txt: `${x.ok} résolu${x.ok > 1 ? 's' : ''}`, me: x.z.uid === me.uid,
      sous: `${x.saison} cette saison · ${x.n} tenté${x.n > 1 ? 's' : ''} depuis le début` })).join('')
      : '<p class="small muted" style="margin:0">Personne n’a encore résolu de dossier noir. Il s’ouvre chaque jour dans les énigmes, facultatif et au niveau hardcore.</p>'}
    <p class="small muted" style="margin:0">Classé sur les dossiers noirs résolus cette saison : le premier reçoit le titre « Cerveau du district » en fin de saison.</p></section>`;
}

const ONGLETS_CLASSEMENT = [['ipz', 'IPZ', '#63B0FF'], ['limier', 'Enquête', '#FFB23F'], ['enigmes', 'Énigmes', '#A78BFA'], ['grade', 'Grades', '#3DD39A'], ['palmares', 'Palmarès', '#F5C64A']];
// « La course » : chaque zone est un couloir dont la barre avance jusqu'à 100 (ou jusqu'au meilleur score).
const COMPO = [['satisfaction', '#63B0FF'], ['affaires', '#9DCBFF'], ['moral', '#FFB23F'], ['budget', '#3DD39A'], ['reputation', '#A78BFA']];
const MEDAILLES = ['🥇', '🥈', '🥉'];
const coul = (z) => (/^#[0-9a-f]{6}$/i.test(z.couleur || '') ? z.couleur : '#63B0FF');
/** Points de chaque composante dans la moyenne de la saison (approchés par la composition du jour pour les tours d'avant la mesure). */
function compoSaison(z, moyenne) {
  if (z.compSomme && z.compTours) {
    const c = Object.fromEntries(COMPO.map(([k]) => [k, (z.compSomme[k] || 0) / z.compTours]));
    const tot = COMPO.reduce((t, [k]) => t + c[k], 0) || 1;
    return Object.fromEntries(COMPO.map(([k]) => [k, (c[k] / tot) * moyenne]));
  }
  if (!z.ipzComp) return null;
  const pt = pointsIpz(z.ipzComp), tot = COMPO.reduce((t, [k]) => t + (pt[k] || 0), 0) || 1;
  return Object.fromEntries(COMPO.map(([k]) => [k, ((pt[k] || 0) / tot) * moyenne]));
}
function couloir({ z, rang, classe, valeur, max = 100, txt, sous = '', compo = null, me }) {
  const c = coul(z), w = Math.max(6, Math.min(100, (valeur / max) * 100));
  const r = classe ? (rang <= 3 ? MEDAILLES[rang - 1] : rang) : '–';
  return `<div class="crs ${me ? 'me' : ''} ${classe ? '' : 'nc'}">
    <span class="crs-r">${r}</span>
    <div class="crs-col">
      <button type="button" class="crs-piste" data-action="voir-hp" data-uid="${esc(z.uid)}" aria-label="${esc(z.nom)} : ${txt}">
        <span class="crs-barre" style="width:${w}%;background:linear-gradient(90deg,${c}40,${c}c0)"></span>
        <span class="crs-lbl"><span class="crs-nom">${z.chef ? `<span style="display:inline-block;vertical-align:-5px;margin-right:4px">${portraitChef(z.uid, 20, { galons: false })}</span>` : ''}${z.doctrine && DOCTRINES[z.doctrine] ? `${DOCTRINES[z.doctrine].ico} ` : ''}${esc(z.nom)}${me ? ' · toi' : ''}</span><span class="crs-v">${txt}</span></span></button>
      ${compo ? `<div class="crs-compo" style="width:${w}%" aria-hidden="true">${COMPO.map(([k, cc]) => `<i style="flex:${Math.max(0.01, compo[k])};background:${cc}"></i>`).join('')}</div>` : ''}
      ${sous ? `<span class="tiny muted">${sous}</span>` : ''}
    </div></div>`;
}
/** « Pourquoi X est devant toi ? » : écart composante par composante avec la zone juste au-dessus (ou la suivante si on est en tête). */
function pourquoiHtml(rows, me) {
  const i = rows.findIndex((r) => r.z.uid === me.uid);
  if (i < 0 || !rows[i].classe) return '';
  const autre = i > 0 ? rows[i - 1] : rows[i + 1];
  if (!autre || !autre.classe) return '';
  const a = compoSaison(autre.z, autre.moyenne), m = compoSaison(me, rows[i].moyenne);
  if (!a || !m) return '';
  const ecarts = COMPO.map(([k]) => ({ k, d: Math.round((a[k] - m[k]) * 10) / 10 })).filter((x) => Math.abs(x.d) >= 0.1).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  const sgn = (d) => (i > 0 ? d : -d);
  const t = ecarts.map((x) => `${IPZ_LABELS[x.k]} <span class="${sgn(x.d) > 0 ? 'bad' : 'ok'}">${sgn(x.d) > 0 ? '+' : '−'}${fmt1(Math.abs(x.d))}</span>`).join(' · ');
  const ecart = Math.abs(autre.moyenne - rows[i].moyenne);
  return `<section class="card tight" style="gap:4px"><strong>${i > 0 ? `Pourquoi ${esc(autre.z.nom)} est devant toi ?` : `Ton avance sur ${esc(autre.z.nom)}`}</strong>
    <span class="small">${i > 0 ? `${fmt1(ecart)} pt d’écart.` : `${fmt1(ecart)} pt d’avance.`} ${i > 0 ? `${esc(autre.z.nom)} fait mieux (rouge) ou moins bien (vert) que toi en :` : 'Ce qui te met devant (vert) ou te rattrape (rouge) :'}</span>
    <span class="small">${t || 'composition très proche'}</span>
    <span class="tiny muted">En points d’IPZ moyens sur la saison. Les fines barres de couleur montrent la même chose pour chaque zone.</span></section>`;
}

export function renderClassement() {
  const me = myZone();
  const { g, n, pct } = gradeInfo(me.ps);
  const onglets = ONGLETS_CLASSEMENT.filter(([k]) => k !== 'palmares' || (S.state.palmares && S.state.palmares.length));
  const tab = onglets.some(([k]) => k === S.classTab) ? S.classTab : 'ipz';
  let corps = '';
  if (tab === 'ipz') {
    const rows = classementLive(S.state);
    let rang = 0;
    corps = `<section class="card" style="gap:8px"><h2 class="card-title">Performance · IPZ de la saison</h2>
      <p class="small muted" style="margin:0">Moyenne de la saison, les derniers jours comptant plus. La barre avance jusqu’à 100. Dessous, d’où vient l’IPZ de chacun. Touche une zone pour voir son hôtel de police.</p>
      ${rows.map((r) => couloir({ z: r.z, rang: r.classe ? ++rang : 0, classe: r.classe, valeur: r.moyenne, txt: r.classe || r.z.toursJoues ? fmt1(r.moyenne) : '—', compo: compoSaison(r.z, r.moyenne), me: r.z.uid === me.uid,
        sous: r.classe ? '' : `${r.z.toursJoues || 0} tour${(r.z.toursJoues || 0) > 1 ? 's' : ''} joué${(r.z.toursJoues || 0) > 1 ? 's' : ''} sur ${MIN_TOURS_CLASSEMENT || 5} pour être classé` })).join('')}
      <div class="crs-leg">${COMPO.map(([k, c]) => `<span><i style="background:${c}"></i>${IPZ_LABELS[k]} ${Math.round(IPZ_POIDS[k] * 100)} %</span>`).join('')}</div>
    </section>${pourquoiHtml(rows, me)}`;
  } else if (tab === 'limier') {
    const zs = Object.values(S.state.zones).sort((a, b) => b.stats.limier - a.stats.limier);
    const max = Math.max(1, ...zs.map((z) => z.stats.limier));
    corps = `<section class="card" style="gap:8px"><h2 class="card-title">Fin limier · points d’enquête</h2>
      ${zs.map((z, k) => couloir({ z, rang: k + 1, classe: z.stats.limier > 0, valeur: z.stats.limier, max, txt: `${z.stats.limier} pts`, me: z.uid === me.uid,
        sous: `${z.stats.decouvertes || 0} découverte${(z.stats.decouvertes || 0) > 1 ? 's' : ''} · ${z.stats.arrestations || 0} arrestation${(z.stats.arrestations || 0) > 1 ? 's' : ''}${(z.affiches || []).length ? ` · ${z.affiches.length} avis au mur` : ''}` })).join('')}
      <p class="small muted" style="margin:0">Découverte : 40 à 100 pts selon le jour. Arrestation : 30. Pièce partagée qui a aidé : 25. La barre est relative au meilleur limier.</p></section>`;
  } else if (tab === 'enigmes') {
    corps = classementEnigmes(me);
  } else if (tab === 'grade') {
    corps = `<section class="card"><div class="between"><h2 class="card-title">Ton grade : ${g.nom}</h2><span class="mono small">${me.ps} PS</span></div>
      <div class="gauge"><div class="bar" role="img" aria-label="Progression ${pct} %"><div style="width:${pct}%;background:var(--amber)"></div></div></div>
      <p class="small muted" style="margin:0">${n ? `Encore ${n.ps - me.ps} PS pour devenir ${n.nom}.` : 'Grade maximum atteint.'} Ordres +10, énigme réussie +5, découverte +15, arrestation +10, FIPA +10, indice partagé +5. Maximum ${PS.plafondJour} PS par jour, plus ${PS.plafondEntraide} PS d’entraide (renfort, indices partagés, FIPA, zone de non-droit…).</p>
      <table class="rank"><tbody>${GRADES.map((gr) => `<tr class="${gr.nom === g.nom ? 'me' : ''}"><td>${gr.nom}</td><td class="num">${gr.ps}</td><td class="small muted">${gr.debloque}</td></tr>`).join('')}</tbody></table>
    </section>`;
  } else {
    corps = `<section class="card"><h2 class="card-title">Palmarès</h2>
      ${S.state.palmares.slice().reverse().map((p) => `<div class="col" style="gap:2px"><span class="small" style="font-weight:700">Saison ${p.season}</span>
        ${p.titres.map((t) => { const z = S.state.zones[t.uid]; return `<span class="small muted">${esc(t.titre)} : ${z ? zoneName(z) : 'zone disparue'}</span>`; }).join('')}</div>`).join('')}</section>`;
  }
  return `<main class="screen">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <header class="col" style="gap:3px"><span class="kicker">Saison ${S.state.season} · tour ${S.state.turn} sur 14</span><h1 class="big">Classements</h1></header>
    <div class="crs-tabs" role="tablist" aria-label="Classements">${onglets.map(([k, l, c]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-action="class-tab" data-t="${k}" style="--c:${c}"><i></i>${l}</button>`).join('')}</div>
    ${corps}
  </main>${tabbar('hp')}`;
}

/** « vu il y a 12 min », « vu hier à 21:04 »… */
/** Date d'inscription : l'heure d'arrivée de la zone dans la partie (gardée d'une saison à l'autre). */
function inscritTexte(t) {
  return Number(t) > 1e12 ? `inscrit le ${new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(Number(t)))}` : 'inscrit avant le suivi des dates';
}
function vuTexte(t) {
  if (!t) return 'jamais vu depuis la mise à jour';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 6) return 'en ligne';
  if (m < 60) return `vu il y a ${m} min`;
  if (m < 24 * 60) return `vu il y a ${Math.round(m / 60)} h (${formatHeureBe(t)})`;
  return `vu le ${formatDateBe(t)} à ${formatHeureBe(t)}`;
}
const vuClasse = (t) => (!t ? 'muted' : Date.now() - t < 6 * 60000 ? 'ok' : Date.now() - t > 48 * 3600000 ? 'bad' : 'muted');

/** Classement « Roi de l'entraînement » (visible du seul maître du jeu). */
function roiEntrainementHtml(zones) {
  const lignes = zones.map((z) => {
    const p = (S.players || {})[z.uid] || {}, e = p.entrainement || {};
    const enigmes = e.enigmes || 0, reussies = e.reussies || 0, minijeux = e.minijeux || 0;
    return { z, p, enigmes, reussies, minijeux, total: enigmes + minijeux, dernier: e.dernier || 0 };
  }).sort((a, b) => b.total - a.total || b.reussies - a.reussies || b.dernier - a.dernier);
  const actifs = lignes.filter((l) => l.total > 0);
  const ligne = (l, k) => `<div class="between" style="gap:8px">
      <span class="small"><strong style="display:inline-block;min-width:22px">${k === 0 ? '👑' : `${k + 1}.`}</strong>${zoneName(l.z)}${l.p.pseudo ? ` <span class="muted">(${esc(l.p.pseudo)})</span>` : ''}<br>
        <span class="tiny muted">${l.enigmes} énigme${l.enigmes > 1 ? 's' : ''}${l.enigmes ? ` (${l.reussies} réussie${l.reussies > 1 ? 's' : ''})` : ''} · ${l.minijeux} mini-jeu${l.minijeux > 1 ? 'x' : ''}${l.dernier ? ` · dernier le ${formatDateBe(l.dernier)}` : ''}</span></span>
      <span class="pill">${l.total}</span></div>`;
  return `<section class="card"><div class="between"><h2 class="card-title">Roi de l’entraînement</h2><button class="btn small ghost" data-action="admin-vus">Actualiser</button></div>
      <p class="tiny muted" style="margin:0">Énigmes d’entraînement terminées + mini-jeux joués jusqu’au bout en entraînement. Visible par toi seul.</p>
      ${actifs.length ? actifs.map(ligne).join('') : '<p class="small muted" style="margin:0">Personne ne s’est encore entraîné.</p>'}
      ${actifs.length && actifs.length < lignes.length ? `<p class="tiny muted" style="margin:0">Pas encore d’entraînement : ${lignes.filter((l) => !l.total).map((l) => esc(l.p.pseudo || l.z.nom || '')).join(', ')}.</p>` : ''}
    </section>`;
}

/** Le Directeur vu par le maître du jeu : réglages, district, et ce qu'il prépare à chaque zone. */
function directeurAdminHtml(st) {
  const ap = apercuDirecteur(st);
  const choix = (k, liste) => `<div class="row" style="gap:6px;flex-wrap:wrap">${Object.entries(liste).map(([v, x]) => `<button type="button" class="btn small ${ap.reglages[k] === v ? 'primary' : ''}" data-action="dir-reglage" data-k="${k}" data-v="${v}" aria-pressed="${ap.reglages[k] === v}">${esc(x.nom)}</button>`).join('')}</div>`;
  const f = ap.fantome;
  const ev = st.evenement && st.evenement.fantome ? st.evenement : null;
  const actives = Object.values(st.zones).filter((x) => x.toursSansOrdres < 3).length;
  return `<section class="card" style="gap:10px"><h2 class="card-title">Le Directeur</h2>
    <p class="small muted" style="margin:0">Le maître du jeu invisible : ciel de chaque zone, feuilletons, dilemmes, événements du district. Tes réglages s’appliquent dès la prochaine nuit, pour tout le monde.</p>
    <span class="small" style="font-weight:600">Intensité (coups durs et mauvaises nouvelles)</span>${choix('intensite', REGLAGES.intensite)}
    <span class="small" style="font-weight:600">Feuilletons et dilemmes</span>${choix('feuilletons', REGLAGES.feuilletons)}
    <span class="small" style="font-weight:600">Événement du district</span>
    <p class="small muted" style="margin:0">${ap.district ? `Prévu : ${esc(ap.district.titre)} au tour ${ap.district.tour}.` : (ap.prochain && ap.prochain <= SEASON_LENGTH ? `Prochain vers le tour ${ap.prochain}.` : 'Plus d’autre événement prévu cette saison.')}${st.dir && st.dir.forcer ? ` Demandé : ${esc(DISTRICT[st.dir.forcer].titre)} (annoncé à la prochaine nuit, le surlendemain).` : ''}</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">${Object.entries(DISTRICT).map(([id, e]) => `<button type="button" class="btn small" data-action="dir-forcer" data-id="${id}">${esc(e.titre)}</button>`).join('')}</div>
    ${f ? `<p class="small" style="margin:0"><strong>Ennemi de la saison</strong> : ${esc(f.nom)} · dossier ${f.dossier || 0} pièce${(f.dossier || 0) > 1 ? 's' : ''}${ev ? ` · opération finale au tour ${ev.tour} : environ ${Math.max(3, Math.round(ev.parZone * actives))} agents requis` : ''}${f.fini ? (f.arrete ? ' · arrêté' : ' · en fuite') : ''}</p>` : ''}
    ${ap.coop.length ? `<p class="small" style="margin:0"><strong>Fugitif à la frontière</strong> : ${ap.coop.map((x) => `${esc(x.la)} et ${esc(x.lb)} (tour ${x.tour}${x.e === 'cavale' ? ', dernière chance' : ''})`).join(' · ')}</p>` : ''}
    ${ap.duo ? `<p class="small" style="margin:0"><strong>Défi en duo</strong> : ${esc(zoneName(st.zones[ap.duo.a]))} et ${esc(zoneName(st.zones[ap.duo.b]))} (tour ${ap.duo.tour})</p>` : ''}
    <div class="col" style="gap:6px">${ap.zones.map((x) => `<div class="col" style="gap:2px;padding:8px 10px;border:1px solid var(--line);border-radius:10px">
      <div class="between"><span class="small" style="font-weight:600">${esc(x.label)}</span><span class="pill ciel-pill ciel-p-${x.ciel.id}">${esc(x.ciel.nom)} ${x.jour}/${x.sur}</span></div>
      <span class="tiny muted">${x.absent ? 'absente (épargnée) · ' : ''}forme ${x.forme > 0 ? '+' : ''}${String(x.forme).replace('.', ',')} · énigmes ${x.enigmes > 0 ? '+' : ''}${x.enigmes} · mini-jeux ${x.incidents > 0 ? '+' : ''}${x.incidents}${x.routine >= 2 ? ` · même répartition depuis ${x.routine + 1} j` : ''}</span>
      ${x.feuilleton || x.operation ? `<span class="tiny">${[x.feuilleton, x.operation].filter(Boolean).map(esc).join(' · ')}</span>` : ''}
      ${x.faiblesses.length ? `<span class="tiny" style="color:var(--amber-soft)">Délaissé : ${x.faiblesses.map(esc).join(', ')}</span>` : ''}
    </div>`).join('')}</div>
  </section>`;
}

/** Zones qui ont confronté le bon suspect au dernier tour sans obtenir d'aveux (lu dans leur rapport du soir). */
export function confrontationsRatees(st) {
  if (!st || !st.enquete) return [];
  const aff = affaire(st, st.enquete.n);
  if (!aff || !aff.meurtre) return [];
  const nom = aff.suspects[aff.coupable].nom, g = S.gazettes && S.gazettes[0];
  return Object.values(st.zones).filter((z) => {
    const d = z.enquete;
    if (d && d.n === st.enquete.n && (d.exclu || (d.accuse !== null && d.accuse !== undefined))) return false;
    const lignes = (g && g.rapports && g.rapports[z.uid]) || z.rapport || [];
    return lignes.some((l) => typeof l === 'string' && l.includes('nie tout et repart libre') && l.includes(nom));
  });
}
function aveuxAdminHtml(st) {
  if (!st || !st.enquete) return '';
  const aff = affaire(st, st.enquete.n);
  if (!aff || !aff.meurtre) return '';
  const auto = confrontationsRatees(st).map((z) => z.uid);
  // Sélection : par défaut les zones repérées dans les rapports de ce soir ; le maître du jeu peut en ajouter ou en retirer.
  if (!S.aveuxSel || S.aveuxSel.n !== st.enquete.n) S.aveuxSel = { n: st.enquete.n, uids: auto.slice() };
  const sel = new Set(S.aveuxSel.uids);
  const zones = Object.values(st.zones).filter((z) => !(z.enquete && z.enquete.n === st.enquete.n && (z.enquete.exclu || (z.enquete.accuse !== null && z.enquete.accuse !== undefined))))
    .sort((a, b) => (auto.includes(b.uid) - auto.includes(a.uid)) || String(a.code).localeCompare(String(b.code)));
  return `<section class="card amber"><h2 class="card-title">Accorder les aveux · ${esc(aff.titre)}</h2>
    <p class="small" style="margin:0">${auto.length ? `Repérées dans les rapports de ce soir (confrontation ${deNom(aff.suspects[aff.coupable].nom)}, le bon suspect, sans les pièces décisives) : ${auto.map((u) => `<b>${esc(zoneName(st.zones[u]))}</b>`).join(', ')}.` : `Aucune confrontation ${deNom(aff.suspects[aff.coupable].nom)} repérée dans les rapports de ce soir. Coche à la main les zones qui l’ont confronté${aff.suspects[aff.coupable].f ? 'e' : ''}.`}</p>
    <div class="col" style="gap:6px">${zones.map((z) => `<button type="button" class="choice" data-action="admin-aveux-sel" data-uid="${esc(z.uid)}" aria-pressed="${sel.has(z.uid)}"><span style="font-weight:600">${sel.has(z.uid) ? '✓ ' : ''}${esc(zoneName(z))}</span>${auto.includes(z.uid) ? '<span class="s">confrontation ratée ce soir</span>' : ''}</button>`).join('')}</div>
    <p class="small muted" style="margin:0">Le tour est recalculé tout de suite : la confrontation des zones cochées compte comme réussie (points, prime, débrief), l’affaire se clôt et la saison ${st.season + 1} commence. Une journée de jeu passe ce soir : les ordres déjà donnés pour demain sont joués maintenant.</p>
    <button class="btn block primary" data-action="admin-aveux" data-uids="${esc([...sel].join(','))}" ${sel.size ? '' : 'disabled'}>Accorder les aveux (${sel.size}) et calculer le tour maintenant</button></section>`;
}
const deNom = (n) => (/^[aeiouyhéèêàâîôû]/i.test(n) ? `d’${n}` : `de ${n}`);

export function renderAdmin() {
  // (note de mise à jour : voir ui/nouveautes.js)
  const st = S.state;
  const zones = Object.values(st.zones);
  return `<main class="screen">
    <a href="#hp" class="backlink">${icon('back', 20)}<span>Retour à l’HP</span></a>
    <header class="col" style="gap:3px"><span class="kicker">Espace maître du jeu</span><h1 class="big">Administration</h1>
      <p class="sub">Mode ${S.backend.mode === 'demo' ? 'démo (sur cet appareil)' : 'en ligne (Firebase)'} · saison ${st.season}, tour ${st.turn} · prochaine résolution ${formatDateBe(st.nextDeadline)} à ${formatHeureBe(st.nextDeadline)}</p></header>
    ${S.partie ? `<section class="card amber"><h2 class="card-title">Inviter des collègues</h2>
      <p class="small" style="margin:0;color:var(--amber-soft)">Partie « ${esc(S.partie.nom)} » · code d’invitation <strong class="mono" style="color:var(--text);font-size:16px;letter-spacing:2px">${esc(S.partie.code)}</strong></p>
      <p class="small" style="margin:0">Envoie le lien : ton collègue se connecte et arrive directement dans la partie, sans taper de code.</p>
      ${partageHtml(S.partie)}</section>` : ''}
    ${S.backend.isSuperAdmin && S.backend.isSuperAdmin(S.user) && S.backend.mode !== 'demo' ? `<section class="card"><h2 class="card-title">Toutes les parties</h2>
      <p class="small muted" style="margin:0">Tu es super-administrateur : tu peux ouvrir n’importe quelle partie pour aider son maître du jeu.</p>
      <button class="btn small" data-action="admin-all-parties">Afficher la liste</button>
      ${(S.allParties || []).map((p) => `<div class="between"><span class="small">${esc(p.nom)} · <span class="mono">${esc(p.code)}</span> · ${esc(p.ownerEmail || '')}</span><button class="btn small" data-action="party-open" data-id="${esc(p.id)}">Ouvrir</button></div>`).join('')}</section>` : ''}
    <section class="card"><h2 class="card-title">Note de mise à jour</h2>
      <p class="small muted" style="margin:0">Chaque joueur verra la fenêtre « Nouveautés » à sa prochaine ouverture. Tu peux aussi l’envoyer en message privé à tous les joueurs :</p>
      <p class="small" style="margin:0;padding:10px 12px;border-radius:10px;background:var(--bg);border:1px solid var(--line);line-height:1.45">${esc(noteCourte())}</p>
      <div class="row"><button class="btn small grow" data-action="maj-voir">Voir la note complète</button>
        <button class="btn small primary grow" data-action="maj-envoyer" ${S.majEnvoyee ? 'disabled' : ''}>${S.majEnvoyee ? `Envoyée à ${S.majEnvoyee} joueur${S.majEnvoyee > 1 ? 's' : ''}` : 'Envoyer à tous en privé'}</button></div></section>
    ${aveuxAdminHtml(st)}
    <section class="card"><h2 class="card-title">Enquête</h2>
      ${st.enquetePause ? `<p class="small" style="margin:0">Enquête en pause : l’affaire « ${esc(st.enquetePause.titre)} » a été retirée. La nouvelle affaire s’ouvrira à la prochaine résolution (${esc(formatDateBe(st.nextDeadline))} à 20:00). Les traques continuent.</p>`
        : st.enquete ? `<p class="small muted" style="margin:0">Retire l’affaire en cours (par exemple si elle s’est ouverte en même temps qu’une traque). Les traques continuent, une édition spéciale de la Gazette s’affiche chez tout le monde, et la nouvelle affaire s’ouvre au prochain 20:00.</p>
      <button class="btn block danger" data-action="admin-pause-enquete">Retirer l’affaire n° ${st.enquete.n} jusqu’à demain 20:00</button>` : '<p class="small muted" style="margin:0">Pas d’affaire en cours.</p>'}
      ${affairesOuvrables(st).length ? `<h3 class="small" style="margin:8px 0 0">Ouvrir une affaire écrite maintenant</h3>
      <p class="small muted" style="margin:0">Sans attendre le 20:00. ${st.enquete ? `L’affaire en cours (« ${esc(affaire(st, st.enquete.n).titre)} », jour ${st.enquete.jour || 1}) est retirée et ses pièces sont perdues ; ` : ''}les traques continuent. Chaque affaire ne se joue qu’une fois par partie.</p>
      ${affairesOuvrables(st).map((a) => `<div class="list-row" style="gap:10px;align-items:center"><span class="grow"><b>${esc(a.titre)}</b><br><span class="tiny muted">${esc(a.resume)}</span></span><button class="btn small outline" data-action="admin-affaire-maintenant" data-cas="${a.cas}">Ouvrir</button></div>`).join('')}` : ''}</section>
    <section class="card"><h2 class="card-title">Saison</h2>
      <p class="small muted" style="margin:0">Saison ${st.season}, jour ${st.turn} sur ${SEASON_LENGTH}. Tu peux passer plus tôt à la saison suivante (nouvelles règles, annexes et chef de corps). Le bilan de fin de saison est alors allégé : peu de pertes, jamais plus d'un niveau par élément.</p>
      ${st.finSaison ? `<p class="small" style="margin:0"><b>Programmé :</b> ${st.finSaison === 'enquete' ? 'la saison se termine le soir où l’affaire en cours se clôt (l’affaire suivante s’ouvre et continue dans la nouvelle saison).' : 'la saison se termine ce soir à 20:00.'}</p>
      <button class="btn block outline" data-action="admin-fin-saison" data-mode="">Annuler la fin anticipée</button>`
      : `<div class="row"><button class="btn small grow" data-action="admin-fin-saison" data-mode="enquete">À la clôture de l’enquête</button>
      <button class="btn small grow danger" data-action="admin-fin-saison" data-mode="soir">Ce soir à 20:00</button></div>`}</section>
    <section class="card"><h2 class="card-title">Affaires écrites : version</h2>
      <p class="small muted" style="margin:0">Par défaut, chaque affaire écrite (rue de la Clef, la Rampe, le corbeau) se joue dans ton scénario d’origine. Si les joueurs de cette partie connaissent déjà l’histoire, active l’autre version : à son ouverture, chaque affaire tirera son scénario (l’origine ou une version où quelqu’un d’autre a fait le coup). Une affaire déjà ouverte ne change pas.</p>
      <button class="btn block ${st.variantesEcrites ? '' : 'outline'}" data-action="admin-variantes">${st.variantesEcrites ? '✓ Autre version possible (toucher pour revenir au scénario d’origine)' : 'Scénario d’origine (toucher pour permettre l’autre version)'}</button></section>
    ${directeurAdminHtml(st)}
    <section class="card"><h2 class="card-title">Résolution</h2>
      <p class="small muted" style="margin:0">Force la résolution du tour en cours maintenant (utile pour tester). Les joueurs ne pourront plus modifier leurs ordres de ce tour.</p>
      <button class="btn block" data-action="admin-force">Résoudre le tour maintenant</button>
      <p class="small muted" style="margin:0">${st.tourServeur ? 'Le tour est calculé par la tâche planifiée (quelques minutes après 20:00) ; les appareils ne le calculent qu’en secours, 20 minutes plus tard.' : 'Le tour est calculé par le premier appareil ouvert après 20:00 (la tâche planifiée n’est pas encore active).'}</p>
      ${st.zonesEnErreur ? `<p class="small bad" style="margin:0">Tour ${st.zonesEnErreur.tour} : ${st.zonesEnErreur.uids.length} zone${st.zonesEnErreur.uids.length > 1 ? 's' : ''} sautée${st.zonesEnErreur.uids.length > 1 ? 's' : ''} sur erreur (${st.zonesEnErreur.uids.map((u) => st.zones[u] ? esc(st.zones[u].nom) : '?').join(', ')}). Le détail est dans leur rapport.</p>` : ''}
      <p class="small muted" style="margin:8px 0 0">Si le calcul du tour échoue pour tout le monde (message d’erreur en haut de l’écran), tu peux passer ce tour sans le calculer : rien ne change dans les zones, la partie repart au tour suivant.</p>
      <button class="btn block danger" data-action="admin-passer-tour" ${st.turn >= SEASON_LENGTH ? 'disabled' : ''}>Passer le tour ${st.turn} sans calcul</button></section>
    <section class="card"><div class="between"><h2 class="card-title">Joueurs (${zones.length})</h2><button class="btn small ghost" data-action="admin-vus">Actualiser</button></div>
      ${zones.slice().sort((a, b) => (((S.players || {})[b.uid] || {}).vuLe || 0) - (((S.players || {})[a.uid] || {}).vuLe || 0)).map((z) => { const p = (S.players || {})[z.uid] || {}; return `<div class="between" style="gap:8px"><span class="small">${zoneName(z)}${p.pseudo ? ` <span class="muted">(${esc(p.pseudo)})</span>` : ''}<br><span class="tiny muted">${inscritTexte(z.arrivee)} · </span><span class="tiny ${vuClasse(p.vuLe)}">${vuTexte(p.vuLe)}</span><span class="tiny muted"> · ${z.toursJoues} tours joués${z.toursSansOrdres ? ` · ${z.toursSansOrdres} sans ordres` : ''}</span></span>
        ${z.uid !== S.user.uid ? `<button class="btn small danger" data-action="admin-remove" data-uid="${esc(z.uid)}">Retirer</button>` : ''}</div>`; }).join('')}
      <p class="tiny muted" style="margin:0">Dernière connexion : mise à jour quand le joueur a le jeu ouvert (au plus toutes les 5 minutes). « Jamais vu » : pas revenu depuis cette mise à jour.</p>
    </section>
    ${roiEntrainementHtml(zones)}
    <section class="card"><h2 class="card-title">Sauvegarde</h2>
      <p class="small muted" style="margin:0">Télécharge une copie de la partie (zones, profils) avant une mise à jour importante. Tu pourras la restaurer si besoin.</p>
      <div class="row"><button class="btn grow" data-action="admin-export">Télécharger</button>
        <label class="btn grow" for="import-file" style="cursor:pointer">Restaurer<input id="import-file" type="file" accept="application/json,.json" class="sr"></label></div></section>
    <section class="card red"><h2 class="card-title">Zone dangereuse</h2>
      <p class="small" style="margin:0;color:var(--text2)">Recommencer la partie efface toutes les zones, la progression et les grades. Chaque joueur retrouve une zone neuve à sa prochaine connexion.</p>
      <button class="btn danger block" data-action="admin-reset">Recommencer la partie</button></section>
  </main>${tabbar('hp')}`;
}
