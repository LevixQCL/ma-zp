// Onglet « Chef » (saison 2) : la prise de fonctions (une prérogative de plus par jour sur six jours), l'agenda en tuiles,
// le parapheur (courriers du jour à tamponner), puis talents, première ligne, réseau, semaine et rival à mesure qu'ils s'ouvrent.
import { S, esc, icon, zoneName } from './common.js';
import { gradeFor, SERVICE_LABELS } from '../engine/constants.js';
import { COMPETENCES, IDS_COMPETENCES, AGENDA, IDS_AGENDA, TALENTS, TALENT, CHEF, FRONT, IDS_FRONT, RISQUE_FRONT, RESEAU, IDS_RESEAU,
  VOIES, BREVET_NIVEAUX, niveauChef, progresChef, talentsDebloques, totalNiveaux, signatureChef, maxTalentsDe, brevetPossible,
  servicePossible, humeurReseau, estimeDe, niveauXp, XP_CUMUL, NIVEAU_MAX_CHEF } from '../engine/chef.js';
import { portraitChef } from './chef.js';
import { cadrePromoHtml } from './fondateurs.js';
import { COURRIERS, PRISE, AGENDA_JOUR, jourPrise, courriersDuJour, texteFx, XP_COURRIER } from '../engine/parapheur.js';

const COUL = { gestion: '#E8B530', commandement: '#E1453A', flair: '#A78BFA', diplomatie: '#5AB0F0', proximite: '#3DD39A' };
const COURT = { gestion: 'Gest.', commandement: 'Cdt', flair: 'Flair', diplomatie: 'Diplo.', proximite: 'Prox.' };
const cc = (k, t) => `<span class="co-cc" style="--c:${COUL[k]}">${COMPETENCES[k].ico} ${t || esc(COMPETENCES[k].nom)}</span>`;
const neuf = (j, J) => j === J;
const ORDRE_AGENDA = ['bureau', 'terrain', 'quartier', 'commune', 'parquet', 'voisin'].filter((k) => IDS_AGENDA.includes(k));
const badgeNeuf = '<span class="co-neuf">nouveau</span>';

/** Prise de fonctions : barre des six jours et « Demain : … ». */
function priseHtml(j, chef) {
  if (j > PRISE.length) return '';
  const suiv = PRISE.find((p) => p.j === j + 1);
  return `<section class="card co-prise" aria-label="Prise de fonctions">
    <div class="between"><h2 class="card-title" style="margin:0">Prise de fonctions</h2><span class="tiny muted">jour ${j} sur ${PRISE.length}</span></div>
    <div class="co-pas-l">${PRISE.map((p) => `<div class="co-pas ${p.j < j ? 'fait' : p.j === j ? 'auj' : ''}"><span class="o">${p.j < j ? '✓' : p.ico}</span><span class="lb">${esc(p.lb)}</span></div>`).join('')}</div>
    <div class="co-teaser">${suiv ? `🔒 <span><b>Demain :</b> ${esc(suiv.tease)}.</span>` : `🎓 <span>Dernière étape ! Ensuite, la carrière continue : brevet à ${BREVET_NIVEAUX} niveaux au total (tu en as ${totalNiveaux(chef)}).</span>`}</div>
  </section>`;
}

function heroHtml(z, p, chef) {
  return `<section class="card co-hero${z.fondateur ? ' fd' : ''}" style="--zc:${esc(z.couleur || '#5AB0F0')}">${cadrePromoHtml(z)}
    <a class="co-hero-l" href="#bureau" data-action="bureau-ouvrir" aria-label="Voir la fiche complète du chef">${portraitChef(z.uid, 60)}
      <span class="col" style="gap:2px;min-width:0"><span class="kicker">Mon chef de corps</span>
        <span class="co-nom">${esc(p.pseudo || z.nom)}</span>
        <span class="tiny muted">${esc(gradeFor(z.ps || 0).nom)} · ${zoneName(z)}</span>
        <span><span class="chef-sig">${esc(signatureChef(chef) || 'Jeune chef')}</span>${chef.brevet ? ` <span class="chef-sig" style="background:linear-gradient(180deg,#CFE3FF,#7FA8E6)">🎓 ${esc(VOIES[chef.brevet].titre)}</span>` : ''}${chef.blesse != null && S.state.turn <= chef.blesse ? ' <span class="chef-sig" style="background:linear-gradient(180deg,#FFC9C4,#E1453A);color:#fff">🏥 hôpital</span>' : ''}</span></span>
      <span class="co-chev" aria-hidden="true">${icon('chevron', 16)}</span></a>
    <div class="co-comps">${IDS_COMPETENCES.map((k) => `<div class="co-cp" style="--c:${COUL[k]}" title="${esc(COMPETENCES[k].nom)}"><span class="i">${COMPETENCES[k].ico}</span><span class="n">${niveauChef(chef, k)}</span><span class="b"><i style="width:${Math.max(3, Math.round(progresChef(chef, k) * 100))}%"></i></span><span class="l">${COURT[k]}</span></div>`).join('')}</div>
  </section>`;
}

function agendaHtml(z, d, chef, j) {
  const hs = chef.blesse != null && S.state.turn <= chef.blesse;
  const a = (d && d.agenda) || { type: 'bureau' };
  const ouvert = (k) => j >= (AGENDA_JOUR[k] || 1);
  const cur = ouvert(a.type) ? a.type : 'bureau', A = AGENDA[cur];
  const voisins = Object.values(S.state.zones).filter((x) => x.uid !== z.uid && x.chef);
  if (hs) return `<section class="card"><h2 class="card-title" style="margin:0">Où passe ton chef aujourd’hui ?</h2><p class="small bad" style="margin:0">🏥 À l’hôpital jusqu’au jour ${chef.blesse} : agenda au bureau, talents coupés, pas de première ligne.</p></section>`;
  return `<section class="card co-agenda ${neuf(j, 1) ? 'co-new' : ''}" aria-label="Agenda du chef">
    <div class="between"><h2 class="card-title" style="margin:0">Où passe ton chef aujourd’hui ?</h2>${neuf(j, 1) ? badgeNeuf : ''}</div>
    <div class="co-lieux">${ORDRE_AGENDA.map((k) => { const L = AGENDA[k], ok = ouvert(k); return `<button type="button" class="co-lieu ${ok ? '' : 'verr'}" data-action="chef-agenda" data-v="${k}" aria-pressed="${cur === k && ok}" ${ok ? '' : 'disabled'} style="--c:${COUL[L.comp]}">
      ${cur === k && ok ? `<span class="co-pion">${portraitChef(z.uid, 28, { galons: false })}</span>` : ''}
      <span class="ico">${ok ? L.ico : '🔒'}</span><span class="n">${esc(L.nom)}</span><span class="c">${ok ? `${COMPETENCES[L.comp].ico} ${esc(COMPETENCES[L.comp].nom)}` : `jour ${AGENDA_JOUR[k]}`}</span></button>`; }).join('')}</div>
    <div class="co-effet"><span>${A.ico}</span><span><b>${esc(A.nom)}</b> · ${esc(cur === 'terrain' ? `le service choisi travaille 10 % mieux ce soir` : A.effet)}. ${cc(A.comp, `+2 XP`)}</span></div>
    ${cur === 'terrain' ? `<div class="co-chips">${['intervention', 'proximite', 'recherche', 'roulage', 'admin'].map((s2) => `<button type="button" class="chef-chip" data-action="chef-agenda-svc" data-v="${s2}" aria-pressed="${(a.service || 'intervention') === s2}">${esc(s2 === 'admin' ? 'Accueil' : SERVICE_LABELS[s2])}</button>`).join('')}</div>` : ''}
    ${cur === 'voisin' ? `<div class="co-chips">${voisins.length ? voisins.map((x) => `<button type="button" class="chef-chip" data-action="chef-agenda-voisin" data-v="${esc(x.uid)}" aria-pressed="${a.zone === x.uid}">${esc(x.nom)}${z.chef && z.chef.visites && z.chef.visites[x.uid] != null && S.state.turn - z.chef.visites[x.uid] < 7 ? ' <span class="tiny muted">· déjà vu cette semaine</span>' : ''}</button>`).join('') : '<span class="tiny muted">Aucun autre chef dans la partie.</span>'}</div>
      <span class="tiny muted">La réunion n’a lieu que si ce chef vient aussi chez toi ce soir : convenez-en sur la Radio.</span>` : ''}
  </section>`;
}

/** Index du prochain courrier sans réponse après `i` (ou la longueur de la liste). */
export function paraSuivant(liste, rep, i) {
  let n = i + 1;
  while (n < liste.length && rep && Object.hasOwn(rep, liste[n])) n++;
  return n;
}

function feuilleHtml(id, rep, dernier = false) {
  const C = COURRIERS[id], ch = rep && Object.hasOwn(rep, id) ? rep[id] : null;
  const anim = S.paraAnim === id;
  const av = C.img ? `<img src="img/bureau/${C.img}-${C.humeur ?? 0}.webp" alt="">` : `<span class="av">${esc(C.av || '✉')}</span>`;
  return `<article class="co-feuille" data-para="${esc(id)}">
    ${C.suite ? '<div class="co-suite">↻ Suite d’un courrier d’hier</div>' : ''}
    <div class="co-ent">${av}<span style="min-width:0"><span class="de">De : ${esc(C.de)}</span><span class="objet">${esc(C.obj)}</span></span></div>
    <p class="co-txt">${esc(C.txt)}</p>
    <div class="co-reps">${C.o.map((o, k) => `<button type="button" class="co-opt" data-action="para-choix" data-id="${esc(id)}" data-v="${k}" aria-pressed="${ch === k}">
      <span class="l"><span>${esc(o.l)}</span>${cc(o.comp, `+${XP_COURRIER}`)}</span><span class="s">${esc(texteFx(o.fx || {}))}${o.suite ? ' · <i>il y aura une suite</i>' : ''}</span></button>`).join('')}</div>
    ${ch != null ? `<span class="co-tampon ${anim ? 'anim' : ''} ${ch === 0 ? 'vert' : 'rouge'}">${esc(C.o[ch].tampon)}</span>
    <div class="co-valide"><span class="tiny">Réponse retenue. Tu peux encore en changer jusqu’à 20:00.</span>
      <button type="button" class="btn small primary" data-action="para-suivant" data-id="${esc(id)}">${dernier ? 'Ranger le parapheur' : 'Courrier suivant →'}</button></div>` : ''}
  </article>`;
}

function parapheurHtml(z, d, j) {
  const liste = courriersDuJour(S.state, z), rep = (d && d.parapheur) || {};
  if (!liste.length) return '';
  const faits = liste.filter((id) => Object.hasOwn(rep, id)).length;
  let i = S.paraIdx == null ? liste.findIndex((id) => !Object.hasOwn(rep, id)) : S.paraIdx;
  if (i < 0 || i > liste.length) i = liste.length;
  const reste = liste.length - i;
  const corps = i >= liste.length
    ? `<div class="co-fin"><span style="font-size:28px">🖋️</span><b>Parapheur vidé</b><span class="tiny muted">Tes réponses partent avec tes ordres de 20:00. Touche un courrier ci-dessous pour changer d’avis.</span></div>`
    : `<div class="co-pile">${reste > 1 ? '<div class="co-derriere"></div>' : ''}${feuilleHtml(liste[i], rep, !liste.some((x, k) => k !== i && !Object.hasOwn(rep, x)))}</div>`;
  return `<section class="card co-para ${neuf(j, 1) ? 'co-new' : ''}" aria-label="Le parapheur">
    <div class="between"><h2 class="card-title" style="margin:0">Le parapheur</h2><span class="tiny ${faits === liste.length ? 'ok' : 'muted'}" style="font-weight:700">${faits}/${liste.length} signé${faits > 1 ? 's' : ''}</span></div>
    <span class="tiny muted">${liste.length > 1 ? `${liste.length} courriers` : 'Un courrier'} sur ton bureau. Chaque réponse entraîne une compétence de ton chef. Sans réponse, ton adjoint classe le courrier (sans effet, sans expérience).</span>
    ${corps}
    ${faits ? `<div class="co-signes">${liste.map((id, k) => Object.hasOwn(rep, id) ? `<button type="button" class="co-mini" data-action="para-revoir" data-v="${k}" aria-label="Modifier ta réponse : ${esc(COURRIERS[id].obj)}"><span class="p">✓</span><span class="t">${esc(COURRIERS[id].obj)}</span><span class="m">${icon('pencil', 12)} modifier</span></button>` : '').join('')}</div>` : ''}
  </section>`;
}

function talentsHtml(z, d, chef, j) {
  const eq = (d && d.talents) || chef.talents || [], max = maxTalentsDe(chef), deb = talentsDebloques(chef);
  const V = chef.brevet && VOIES[chef.brevet];
  const horsVoie = eq.filter((x) => !(V && V.comps.includes(TALENT[x].comp))).length;
  const verrou = chef.talentsT != null && S.state.turn < chef.talentsT + CHEF.semaine;
  const libres = deb.filter((t) => !eq.includes(t));
  const prochains = IDS_COMPETENCES.map((c) => { const t = TALENTS.find((x) => x.comp === c && x.niv > niveauChef(chef, c)); if (!t) return null;
    const base = chef.parcours && niveauChef(chef, c) - niveauXp((chef.xp && chef.xp[c]) || 0);
    const need = XP_CUMUL[Math.min(NIVEAU_MAX_CHEF, t.niv - (base || 0))] - ((chef.xp && chef.xp[c]) || 0);
    return { t, need: Math.max(1, Math.ceil(need)) }; }).filter(Boolean).sort((a, b) => a.need - b.need);
  const slots = Array.from({ length: max }, (_, k) => { const t = eq[k];
    if (t) return `<button type="button" class="co-slot on" data-action="chef-talent" data-v="${t}" style="--c:${COUL[TALENT[t].comp]}" title="Retirer"><img src="img/talents/${t}.webp" alt=""><span class="n">${esc(TALENT[t].nom)}</span><span class="s">${esc(TALENT[t].texte)}</span></button>`;
    const pr = prochains[k - eq.length - (libres.length ? 1 : 0)];
    if (k === eq.length && libres.length) return `<div class="co-slot offre"><span class="s" style="color:var(--amber);font-weight:700">Choisis ci-dessous ↓</span></div>`;
    return `<div class="co-slot"><span style="font-size:18px;opacity:.6">＋</span>${pr ? `<span class="s">${esc(COMPETENCES[pr.t.comp].nom)} ${pr.t.niv} : ${esc(pr.t.nom)}</span><span class="s" style="color:var(--amber-soft)">encore ${pr.need} XP</span>` : '<span class="s">libre</span>'}</div>`; }).join('');
  return `<section class="card co-tal ${neuf(j, 3) ? 'co-new' : ''}" aria-label="Talents">
    <div class="between"><h2 class="card-title" style="margin:0">Talents</h2>${neuf(j, 3) ? badgeNeuf : `<span class="tiny muted">${eq.length}/${max} · ${deb.length}/15 débloqués</span>`}</div>
    <div class="co-slots" style="grid-template-columns:repeat(${max},minmax(0,1fr))">${slots}</div>
    ${libres.length ? `<div class="col" style="gap:6px">${libres.map((id) => { const t = TALENT[id]; const bloque = eq.length >= max || (!(V && V.comps.includes(t.comp)) && horsVoie >= CHEF.maxTalents); return `<button type="button" class="co-talent" data-action="chef-talent" data-v="${id}" ${bloque ? 'disabled' : ''} style="--c:${COUL[t.comp]}"><img src="img/talents/${id}.webp" alt=""><span class="col grow" style="gap:1px;min-width:0;text-align:left"><b class="small">${esc(t.nom)}${(chef.nouveauxTalents || []).includes(id) ? ' <span class="pill amber">nouveau</span>' : ''}</b><span class="tiny muted">${esc(t.texte)}</span></span><span class="tiny" style="font-weight:700;color:var(--amber)">${bloque ? 'plein' : 'Équiper'}</span></button>`; }).join('')}</div>` : ''}
    <span class="tiny muted">${verrou ? `Ajouter dans une case vide est libre ; remplacer un talent, à partir du jour ${chef.talentsT + CHEF.semaine}.` : 'Ajouter est libre ; remplacer un talent, une fois par semaine. Touche un talent équipé pour le retirer.'}</span>
  </section>`;
}

function frontHtml(z, d, chef, j) {
  if (chef.blesse != null && S.state.turn <= chef.blesse) return '';
  return `<section class="card ${neuf(j, 4) ? 'co-new' : ''}" aria-label="Première ligne">
    <div class="between"><h2 class="card-title" style="margin:0">En première ligne ce soir ?</h2>${neuf(j, 4) ? badgeNeuf : ''}</div>
    <div class="co-fronts"><button type="button" class="co-front" data-action="chef-front" data-v="" aria-pressed="${!d.chefFront}"><span class="n">🪑 Rester au QG</span><span class="s">aucun risque</span></button>
      ${IDS_FRONT.map((k) => { const F = FRONT[k]; return `<button type="button" class="co-front" data-action="chef-front" data-v="${k}" aria-pressed="${d.chefFront === k}"><span class="n">${COMPETENCES[F.comp].ico} ${esc(F.court)}</span><span class="s">${esc(F.effet(niveauChef(chef, F.comp)))}</span></button>`; }).join('')}</div>
    ${d.chefFront ? `<div class="co-risque"><span>Risque de blessure</span><span class="j"><i style="width:${Math.round(RISQUE_FRONT.base * 100)}%"></i></span><b>${Math.round(RISQUE_FRONT.base * 100)} %</b></div><span class="tiny muted">Blessé : ${RISQUE_FRONT.jours} jours d’hôpital, talents coupés. Le bonus ne compte que si l’action a lieu ce soir. +2 XP en ${esc(COMPETENCES[FRONT[d.chefFront].comp].nom)}.</span>` : ''}
  </section>`;
}

function reseauHtml(z, d, chef, j) {
  const T = S.state.turn;
  return `<section class="card ${neuf(j, 5) ? 'co-new' : ''}" aria-label="Le réseau">
    <div class="between"><h2 class="card-title" style="margin:0">Le réseau</h2>${neuf(j, 5) ? badgeNeuf : '<span class="tiny muted">un service par personne et par semaine</span>'}</div>
    <div class="chef-reseau">${IDS_RESEAU.map((id) => { const R = RESEAU[id], refus = servicePossible(z, id, T), h = humeurReseau(z, id), e = estimeDe(z, id);
      return `<button type="button" class="chef-pers ${h > 0 ? 'ok' : h < 0 ? 'ko' : ''}${d.reseau === id ? ' choisi' : ''}" data-action="chef-reseau" data-v="${id}" ${refus ? 'disabled' : ''} aria-pressed="${d.reseau === id}" style="background:none;border:0;padding:0;cursor:pointer;color:var(--text)">
        <img src="img/bureau/${id}-${h > 0 ? 1 : h < 0 ? '-1' : 0}.webp" alt=""><span class="tiny" style="font-weight:700">${esc(R.nom.replace(/^(Le|La) /, ''))}</span><span class="chef-humeur">${h > 0 ? 'Satisfait' : h < 0 ? 'Mécontent' : 'Neutre'}</span>
        <span class="co-est" title="Estime ${e}">${[-2, -1, 1, 2].map((x) => `<i class="${x < 0 && e <= x ? 'm' : x > 0 && e >= x ? 'p' : ''}"></i>`).join('')}</span></button>`; }).join('')}</div>
    <div class="co-effet">${d.reseau && RESEAU[d.reseau] ? `<span>📞</span><span><b>${esc(RESEAU[d.reseau].nom)}</b> : ${esc(RESEAU[d.reseau].geste(niveauChef(chef, 'diplomatie')))} ce soir.</span>` : '<span>💡</span><span>Seuls les satisfaits rendent service. Leur humeur suit ta zone ; leur estime (les points) se gagne aussi au parapheur.</span>'}</div>
  </section>`;
}

function brevetHtml(chef, d) {
  if (!brevetPossible(chef)) return '';
  return `<section class="card co-new"><div class="between"><h2 class="card-title" style="margin:0">🎓 Brevet de carrière</h2>${badgeNeuf}</div>
    <span class="tiny muted">${BREVET_NIVEAUX} niveaux au total : choisis ta voie (une fois, définitif). Un titre et un 4e emplacement de talent.</span>
    <div class="col" style="gap:6px">${Object.entries(VOIES).map(([k, V]) => `<button type="button" class="choice" data-action="chef-brevet" data-v="${k}" aria-pressed="${d.brevet === k}" style="text-align:left;align-items:flex-start"><span style="font-weight:700">${esc(V.nom)} · ${esc(V.titre)}</span><span class="s">${esc(V.texte)}</span></button>`).join('')}</div></section>`;
}

function parrainHtml(z, d, chef) {
  const T = S.state.turn, voisins = Object.values(S.state.zones).filter((x) => x.uid !== z.uid && x.chef);
  const filleuls = totalNiveaux(chef) >= CHEF.parrainage.minParrain ? voisins.filter((x) => totalNiveaux(x.chef) <= CHEF.parrainage.maxFilleul && !(x.chef.parrain && x.chef.parrain.fin >= T)) : [];
  if (!filleuls.length) return '';
  return `<section class="card"><h2 class="card-title" style="margin:0">Parrainer un nouveau chef</h2><span class="tiny muted">7 jours : sa meilleure progression +50 %, des PS d’entraide pour toi.</span>
    <label class="field tiny"><select class="text" data-change="chef-parrainer"><option value="">Personne</option>${filleuls.map((x) => `<option value="${esc(x.uid)}" ${d.parrainer === x.uid ? 'selected' : ''}>${zoneName(x)}</option>`).join('')}</select></label></section>`;
}

/** L'onglet complet. `extra` : { nuit, semaine(duel), fiche } rendus par chef.js. */
export function ongletChefHtml(z, p, chef, d, extra) {
  const j = jourPrise(chef, S.state.turn);
  const saved = !!S.savedOrders && !S.ordersDirty;
  return `<main class="screen chef-onglet co">
    ${heroHtml(z, p, chef)}
    ${priseHtml(j, chef)}
    ${extra.nuit || ''}
    <div class="co-statut"><span class="statut-ordres ${saved ? 'ok' : ''}">${saved ? `${icon('check', 13)} envoyé avec tes ordres` : 'tout ce qui suit part avec tes ordres de 20:00'}</span></div>
    ${brevetHtml(chef, d)}
    ${agendaHtml(z, d, chef, j)}
    ${parapheurHtml(z, d, j)}
    ${j >= 3 ? talentsHtml(z, d, chef, j) : ''}
    ${j >= 4 ? frontHtml(z, d, chef, j) : ''}
    ${j >= 5 ? reseauHtml(z, d, chef, j) : ''}
    ${j >= 2 ? extra.semaine(j >= 6) : ''}
    ${j >= 6 ? parrainHtml(z, d, chef) : ''}
    ${extra.fiche || ''}
  </main>`;
}
