// Le chef de corps (saison 2) : portrait, création, fiche, agenda et talents dans les Ordres.
import { S, esc, icon, myZone, zoneName } from './common.js';
import { gradeFor, INFRAS, SERVICE_LABELS, ENIGMES } from '../engine/constants.js';
import { tabbar } from './common.js';
import { COMPETENCES, IDS_COMPETENCES, PARCOURS, IDS_PARCOURS, TALENTS, TALENT, AGENDA, niveauChef, progresChef, talentsDebloques, totalNiveaux, signatureChef, niveauXp, XP_CUMUL, NIVEAU_MAX_CHEF, JEUX_COMP, FRONT, VOIES, brevetPossible, maxTalentsDe, humeurReseau, estimeDe } from '../engine/chef.js';
import { cadreDe, rubansDe, RUBANS } from '../engine/chef-semaine.js';
import { ongletChefHtml, CHEF_V3 } from './chef-onglet.js';
import { creerChef } from '../engine/chef.js';
import { jourPrise, courriersDuJour } from '../engine/parapheur.js';
import { adjointFicheHtml, honneursHtml, COUL_CADRE, semaineHtml } from './chef-semaine.js';
import { segBrigadeHtml, equipeVueHtml, galonsAFaire } from './brigade.js';

// ───── Portraits (images générées avec Gemini, img/chefs/pNN.webp) ─────
// Tant qu'une image manque, un portrait dessiné (silhouette en uniforme, initiales) la remplace.
export const PORTRAITS = [
  ['p01', 'f'], ['p02', 'h'], ['p03', 'f'], ['p04', 'h'], ['p05', 'f'], ['p06', 'h'], ['p07', 'f'], ['p08', 'h'],
  ['p09', 'f'], ['p10', 'h'], ['p11', 'f'], ['p12', 'h'], ['p13', 'h'], ['p14', 'f'], ['p15', 'h'], ['p16', 'f'],
  ['p17', 'h'], ['p18', 'f'], ['p19', 'h'], ['p20', 'h'], ['p21', 'f'], ['p22', 'f'], ['p23', 'h'], ['p24', 'f'],
].map(([id, g]) => ({ id, g }));
const PORTRAIT = Object.fromEntries(PORTRAITS.map((p) => [p.id, p]));
/** Portrait connu (le profil n'est pas validé par les règles : un id inconnu ou non textuel retombe sur le dessin par défaut). */
const portraitConnu = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(PORTRAIT, id) ? id : null);
/** Couleur de zone sûre à insérer dans un SVG ou un style (la zone n'est nettoyée par le moteur qu'au tour de 20:00). */
const couleurSure = (c) => (typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c) ? c : '#5AB0F0');

/** Étoiles de grade (0 à 5) d'après les PS : Aspirant 0 … Chef de corps 5. */
const etoiles = (ps) => ['Aspirant', 'Inspecteur', 'Inspecteur principal', 'Commissaire', 'Commissaire divisionnaire', 'Chef de corps'].indexOf(gradeFor(ps || 0).nom);

function initialesDe(p, z) {
  const t = String((p && p.pseudo) || (z && z.nom) || '?').trim();
  return t.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
/** Portrait dessiné (en attendant l'image) : buste en uniforme, teint et cheveux selon le portrait choisi, initiales. */
const PEAUX = ['#F1C9A5', '#E0AC86', '#C68B62', '#9C6644', '#7A4B2E', '#F5D6BA'];
const CHEVEUX = ['#2B2118', '#5A3B22', '#8C6A43', '#C9A26B', '#9A9A9A', '#1A1A1A', '#6B3A2A'];
function portraitDessine(p, z, taille, id = null) {
  const c = couleurSure(z && z.couleur);
  const pid = portraitConnu(id) || portraitConnu(p && p.chef && p.chef.portrait);
  const k = pid ? Number(pid.slice(1)) - 1 : 0;
  const peau = PEAUX[k % PEAUX.length], ch = CHEVEUX[(k * 3) % CHEVEUX.length], f = pid && PORTRAIT[pid] && PORTRAIT[pid].g === 'f';
  const txt = id ? '' : esc(initialesDe(p, z));
  return `<svg viewBox="0 0 64 64" width="${taille}" height="${taille}" aria-hidden="true" style="display:block">
    <rect width="64" height="64" fill="#1B2436"/>
    ${f ? `<path d="M19 30 C17 44 22 48 26 48 L38 48 C42 48 47 44 45 30Z" fill="${ch}"/>` : ''}
    <path d="M10 64 C12 48 22 42 32 42 C42 42 52 48 54 64Z" fill="#22304a" stroke="${c}" stroke-width="1.5"/>
    <path d="M27 42 L32 52 L37 42" fill="#E8ECF5"/><circle cx="32" cy="29" r="11" fill="${peau}"/>
    <path d="M21 26 C21 17 43 17 43 26 C40 21 24 21 21 26Z" fill="${ch}"/>
    <path d="M19 21 C20 11 44 11 45 21Z" fill="#1A2233"/><rect x="18" y="18" width="28" height="5" rx="2" fill="#1A2233"/>
    <rect x="29" y="16" width="6" height="4" rx="1" fill="${c}"/>
    ${txt ? `<text x="32" y="61" text-anchor="middle" font-size="9" font-weight="700" fill="${c}" font-family="IBM Plex Mono, monospace">${txt}</text>` : ''}</svg>`;
}
/** Portrait du chef d'une zone (image si elle existe, sinon dessin), avec ses galons. */
export function portraitChef(uid, taille = 48, { galons = true } = {}) {
  const st = S.state, z = st && st.zones && st.zones[uid];
  const p = (S.players && S.players[uid]) || (S.user && uid === S.user.uid ? S.player : null) || {};
  const pr = p.chef && portraitConnu(p.chef.portrait) ? PORTRAIT[p.chef.portrait] : null;
  const n = galons && z ? etoiles(z.ps) : 0;
  const img = pr ? `<img src="img/chefs/${pr.id}.webp" alt="" width="${taille}" height="${taille}" loading="lazy" style="display:block;width:${taille}px;height:${taille}px;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none">${portraitDessine(p, z, taille)}</span>` : portraitDessine(p, z, taille);
  // Honneurs : cadre selon les niveaux, ruban choisi par le joueur (s'il l'a gagné).
  const cad = z && z.chef ? cadreDe(z.chef) : null, cc = cad && COUL_CADRE[cad.id];
  const rb = z && z.chef && p.chef && p.chef.ruban && RUBANS[p.chef.ruban] && rubansDe(z.chef).includes(p.chef.ruban) ? RUBANS[p.chef.ruban] : null;
  return `<span class="chef-portrait${cc ? ` cadre-${cad.id}` : ''}" style="--t:${taille}px;--zc:${couleurSure(z && z.couleur)}${cc ? `;--cadre:${cc}` : ''}" ${cad && cc ? `title="${esc(cad.nom)}"` : ''}>${img}${n > 0 ? `<span class="chef-galons" aria-label="${n} étoile${n > 1 ? 's' : ''}">${'★'.repeat(n)}</span>` : ''}${rb && taille >= 30 ? `<span class="chef-ruban" title="${esc(rb.nom)}">${rb.ico}</span>` : ''}</span>`;
}

// ───── Création (première ouverture de la saison 2) ─────
export function chefACreer() {
  const z = myZone();
  if ((!z || !S.state)) return false;
  const p = S.player || {};
  return !(p.chef && p.chef.parcours && p.chef.portrait);
}
export function creationChefHtml() {
  const p = S.player || {}, zc = myZone(), fige = zc && zc.chef && PARCOURS[zc.chef.parcours] ? zc.chef.parcours : null;
  const c = { ...(p.chef || {}), ...(S.chefBrouillon || {}), ...(fige ? { parcours: fige } : {}) };
  return `<section class="card chef-creation" aria-label="Ton chef de corps" style="gap:12px;border-color:var(--amber-line)">
    <span class="kicker">Ton chef de corps</span>
    <p class="small" style="margin:0">Tu n’es plus seulement une zone : tu es son chef. Ses compétences montent selon ta façon de jouer et le suivent de saison en saison. Choisis son visage et son parcours (une minute, une seule fois).</p>
    <span class="tiny muted" style="font-weight:700">Portrait</span>
    <div class="chef-grille">${(S.chefTous ? PORTRAITS : PORTRAITS.filter((x, i) => i % 3 === 0 || x.id === c.portrait)).map((x) => `<button type="button" class="chef-choix" data-action="chef-portrait" data-v="${x.id}" aria-pressed="${c.portrait === x.id}" aria-label="Portrait ${x.id}">
      <img src="img/chefs/${x.id}.webp" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="chef-choix-svg" style="display:none">${portraitDessine(p, myZone(), 56, x.id)}</span></button>`).join('')}</div>
    ${S.chefTous ? '' : `<button type="button" class="btn ghost small" data-action="chef-tous">Voir les ${PORTRAITS.length} portraits</button>`}
    ${fige ? `<span class="tiny muted" style="font-weight:700">Parcours : ${COMPETENCES[PARCOURS[fige].comp].ico} ${esc(PARCOURS[fige].nom)} (choisi une fois pour toute la carrière)</span>` : `<span class="tiny muted" style="font-weight:700">Parcours (+2 niveaux dans une compétence, une seule fois)</span>
    ${IDS_PARCOURS.map((k) => { const x = PARCOURS[k]; return `<button type="button" class="choice" data-action="chef-parcours" data-v="${k}" aria-pressed="${c.parcours === k}" style="text-align:left;align-items:flex-start">
      <span style="font-weight:700">${COMPETENCES[x.comp].ico} ${esc(x.nom)} <span class="tiny muted">· ${esc(COMPETENCES[x.comp].nom)} +2</span></span><span class="s">${esc(x.texte)}</span></button>`; }).join('')}`}
    <label class="field">Devise (facultatif)<input class="text" id="chef-devise" maxlength="60" value="${esc(c.devise || '')}" placeholder="Ex. : Toujours un coup d’avance"></label>
    <button type="button" class="btn primary block" data-action="chef-enregistrer" ${c.portrait && c.parcours ? '' : 'disabled'}>${c.portrait && c.parcours ? 'Prendre mes fonctions' : 'Choisis un portrait et un parcours'}</button>
  </section>`;
}


// ───── Ordres : agenda, talents, parrainage ─────
export function resumeChefOrdres(z, d) {
  if (z.chef.blesse != null && S.state.turn <= z.chef.blesse) return `🏥 À l’hôpital jusqu’au jour ${z.chef.blesse}`;
  const a = d.agenda || { type: 'bureau' }, A = AGENDA[a.type] || AGENDA.bureau;
  const l = a.type === 'terrain' ? `${A.nom} (${SERVICE_LABELS[a.service || 'intervention']})` : a.type === 'voisin' && S.state.zones[a.zone] ? `Chez ${S.state.zones[a.zone].nom}` : A.nom;
  return `${A.ico} ${esc(l)}${d.chefFront ? ` · ⚔️ ${esc(FRONT[d.chefFront].nom.toLowerCase())}` : ''}${d.reseau ? ' · service demandé' : ''} · talents ${((d.talents || z.chef.talents) || []).length}/${maxTalentsDe(z.chef)}`;
}

/** Bâtir : emplacements d'annexes (saison 2) et démolition. */
export function emplacementsHtml(z, d) {
  
  const faites = Object.keys(z.infra || {}).filter((k) => z.infra[k] && INFRAS[k]);
  const max = 3 + ((z.batiments && z.batiments.bureaux) || 1);
  return `<div class="col" style="gap:4px"><span class="tiny ${faites.length >= max ? 'warn' : 'muted'}">Emplacements d’annexes : ${faites.length} sur ${max} (3 + niveau ${z.batiments.bureaux} des bureaux).${faites.length >= max ? ' Pour en bâtir une autre, agrandis l’hôtel de police ou démolis une annexe.' : ''}</span>
    ${faites.length ? `<label class="field tiny">Démolir une annexe ce soir (gratuit, sans remboursement)<select class="text" data-change="demolir"><option value="">Aucune</option>${faites.map((k) => `<option value="${k}" ${d.demolir === k ? 'selected' : ''}>${esc(INFRAS[k].nom)}</option>`).join('')}</select></label>` : ''}</div>`;
}
void icon;

// ───── La fiche du chef (écran « Mon chef ») ─────
// Des stats claires, dans le style du jeu : compétences (niveau, progression, prochain déblocage), talents en tableau
// (une colonne par compétence, une ligne par palier), saison en cours, réseau, carrière.
export const COUL_COMP = { gestion: '#E8B530', commandement: '#E1453A', flair: '#A78BFA', diplomatie: '#5AB0F0', proximite: '#3DD39A' };
const RESEAU = {
  bourgmestre: { nom: 'Bourgmestre', suit: (z) => `satisfaction ${Math.round(z.satisfaction)}`, humeur: (z) => (z.satisfaction >= 65 ? 1 : z.satisfaction < 45 ? -1 : 0) },
  procureur: { nom: 'Procureur', suit: (z) => `réputation ${Math.round(z.reputation)}${z.dir && z.dir.parquet && z.dir.parquet.stade ? ', dossier trop recopié' : ''}`, humeur: (z) => ((z.dir && z.dir.parquet && z.dir.parquet.stade) || z.reputation < 40 ? -1 : z.reputation >= 60 ? 1 : 0) },
  syndicat: { nom: 'Syndicat', suit: (z) => `moral ${Math.round(z.moral)}`, humeur: (z) => ((z.dir && z.dir.mem && z.dir.mem.greve === 'arret') || z.moral < 45 ? -1 : z.moral >= 65 ? 1 : 0) },
  journaliste: { nom: 'Presse', suit: (z) => { const j = z.dir && z.dir.mem && z.dir.mem.journaliste; return j === 'amie' ? 'interview réussie' : j === 'hostile' ? 'article au vitriol' : 'pas encore d’interview'; }, humeur: (z) => { const j = z.dir && z.dir.mem && z.dir.mem.journaliste; return j === 'amie' ? 1 : j === 'hostile' ? -1 : 0; } },
};
const MONTE = {
  gestion: 'revenu positif, investissements, paperasse bouclée, journée au bureau ou à la commune · jeux : embouteillage, PV à relire',
  commandement: 'services tenus, incidents et urgences réussis, assauts en non-droit, affaires disputées, journée sur le terrain · jeux : colis, maintien de l’ordre, bitonal',
  flair: 'pièces d’enquête, auteur identifié, dossier noir, arrestation, journée au parquet · jeux : énigmes, crochetage, empreintes, ADN',
  diplomatie: 'renforts, relèves, pactes tenus, pièces partagées, visite à un voisin · jeux : réseau, interception (RCCU)',
  proximite: 'satisfaction haute, vagues absorbées, imprévus évités, réunion de quartier · jeux : incidents de Proximité',
};
const xpTxt = (chef, c) => { const xp = (chef.xp && chef.xp[c]) || 0, L = niveauXp(xp); return L >= NIVEAU_MAX_CHEF ? 'niveau maximum' : `${Math.floor(xp - XP_CUMUL[L])} / ${XP_CUMUL[L + 1] - XP_CUMUL[L]} XP`; };
/** Les blocs de la fiche d'un chef (le sien ou celui d'un collègue). */
function sectionsChef(uid, moi) {
  const st = S.state, z = st.zones[uid];
  const p = (S.players && S.players[uid]) || (moi ? S.player : {}) || {};
  const chef = z.chef, g = gradeFor(z.ps || 0), pc = chef.parcours && PARCOURS[chef.parcours];
  const deb = new Set(talentsDebloques(chef)), eq = chef.talents || [];
  const actifs = new Set(((z.chefNuit && z.chefNuit.tour === st.turn - 1 && z.chefNuit.faits) || []).map((f) => f.id));
  const ouvert = S.bureauObj || null;
  const total = totalNiveaux(chef);
  // En-tête.
  const hero = `<section class="card chef-hero" style="--zc:${esc(z.couleur || '#5AB0F0')}">
    <div class="row" style="gap:14px;align-items:center">${portraitChef(uid, 84)}
      <span class="col" style="gap:3px;min-width:0"><span class="kicker">${moi ? 'Mon chef de corps' : 'Chef de corps'}</span>
        <span style="font-weight:800;font-size:20px;line-height:1.1">${esc(p.pseudo || z.nom)}</span>
        <span class="small">${esc(g.nom)} · ${zoneName(z)}</span>
        <span class="row" style="gap:6px;flex-wrap:wrap"><span class="chef-sig">${esc(signatureChef(chef) || '')}</span>${chef.brevet ? `<span class="chef-sig" style="background:linear-gradient(180deg,#CFE3FF,#7FA8E6)">🎓 ${esc(VOIES[chef.brevet].titre)}</span>` : ''}${chef.blesse != null && st.turn <= chef.blesse ? '<span class="chef-sig" style="background:linear-gradient(180deg,#FFC9C4,#E1453A);color:#fff">🏥 à l’hôpital</span>' : ''}</span></span></div>
    <span class="small muted">${pc ? esc(pc.nom) : 'Parcours à choisir'}${p.chef && p.chef.devise ? ` · « ${esc(p.chef.devise)} »` : ''}</span>
    <div class="pc-stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="pc-stat"><span class="v">${total}<small>/50</small></span><span class="l">niveaux</span></div>
      <div class="pc-stat"><span class="v">${deb.size}<small>/15</small></span><span class="l">talents</span></div>
      <div class="pc-stat"><span class="v">${(chef.medailles || []).length}</span><span class="l">médaille${(chef.medailles || []).length > 1 ? 's' : ''}</span></div>
    </div>
    ${moi ? '<button type="button" class="btn small outline block" data-action="chef-carte">📤 Partager la carte de mon chef</button>' : ''}</section>`;
  // Compétences.
  const comp = `<section class="card" style="gap:10px"><h2 class="card-title">Compétences</h2>
    ${IDS_COMPETENCES.map((c) => { const L = niveauChef(chef, c), suiv = TALENTS.find((t) => t.comp === c && t.niv > L), o = ouvert === c;
      return `<button type="button" class="chef-comp${o ? ' ouvert' : ''}" data-action="chef-detail" data-k="${c}" style="--c:${COUL_COMP[c]}" aria-expanded="${o}">
        <span class="chef-comp-ico">${COMPETENCES[c].ico}</span>
        <span class="col grow" style="gap:4px;min-width:0"><span class="between"><span style="font-weight:700">${esc(COMPETENCES[c].nom)}</span><span class="tiny muted">${xpTxt(chef, c)}</span></span>
          <span class="chef-barre"><span style="width:${Math.max(3, Math.round(progresChef(chef, c) * 100))}%"></span></span>
          <span class="tiny muted">${suiv ? `Niveau ${suiv.niv} : talent « ${esc(suiv.nom)} »` : 'Tous ses talents sont débloqués'}</span>
          ${o ? `<span class="tiny" style="color:var(--text2);line-height:1.4">Monte avec : ${esc(MONTE[c])}.${moi && chef.saison && chef.saison[c] ? ` Cette saison : +${Math.round(chef.saison[c])} XP.` : ''}</span>` : ''}</span>
        <span class="chef-niv">${L}</span></button>`; }).join('')}
  </section>`;
  // Talents : tableau compétences × paliers.
  const tal = `<section class="card" style="gap:10px"><div class="between"><h2 class="card-title">Talents</h2><span class="tiny muted">${eq.length}/${maxTalentsDe(chef)} équipés</span></div>
    <div class="chef-slots" style="grid-template-columns:repeat(${maxTalentsDe(chef)},minmax(0,1fr))">${Array.from({ length: maxTalentsDe(chef) }, (_, i) => i).map((i) => { const t = eq[i]; return t ? `<div class="chef-slot on${actifs.has(t) ? ' actif' : ''}" style="--c:${COUL_COMP[TALENT[t].comp]}"><img src="img/talents/${t}.webp" alt=""><span class="tiny" style="font-weight:700">${esc(TALENT[t].nom)}</span><span class="tiny muted">${esc(TALENT[t].texte)}</span></div>` : '<div class="chef-slot"><span class="tiny muted">Emplacement libre</span></div>'; }).join('')}</div>
    ${''}
    <div class="chef-grille-tal">${IDS_COMPETENCES.map((c) => `<span class="tiny chef-gt-h" style="color:${COUL_COMP[c]}">${COMPETENCES[c].ico}</span>`).join('')}
      ${[2, 5, 8].map((n) => IDS_COMPETENCES.map((c) => { const t = TALENTS.find((x) => x.comp === c && x.niv === n), ok = deb.has(t.id), on = eq.includes(t.id);
        return `<button type="button" class="chef-gt${ok ? '' : ' verr'}${on ? ' on' : ''}" data-action="chef-detail" data-k="t:${t.id}" title="${esc(t.nom)}"><img src="img/talents/${t.id}.webp" alt="${esc(t.nom)}"><span class="chef-gt-n">${ok ? '' : n}</span></button>`; }).join('')).join('')}
    </div>
    ${ouvert && ouvert.startsWith('t:') && TALENT[ouvert.slice(2)] ? (() => { const t = TALENT[ouvert.slice(2)]; return `<div class="ddetail"><b>${esc(t.nom)}</b> · ${esc(COMPETENCES[t.comp].nom)} ${t.niv}${deb.has(t.id) ? '' : ' (verrouillé)'}<br><span class="small">${esc(t.texte)}</span></div>`; })() : '<span class="tiny muted">Une colonne par compétence, un talent aux niveaux 2, 5 et 8. Touche un écusson pour le détail.</span>'}
  </section>`;
  // Réseau.
  const res = `<section class="card" style="gap:10px"><h2 class="card-title">Le réseau</h2>
    <div class="chef-reseau">${Object.entries(RESEAU).map(([id, R]) => { const h = humeurReseau(z, id), e = estimeDe(z, id); return `<div class="chef-pers ${h > 0 ? 'ok' : h < 0 ? 'ko' : ''}">
      <img src="img/bureau/${id}-${h > 0 ? 1 : h < 0 ? '-1' : 0}.webp" alt=""><span class="tiny" style="font-weight:700">${R.nom}</span><span class="chef-humeur">${h > 0 ? 'Satisfait' : h < 0 ? 'Mécontent' : 'Neutre'}</span><span class="tiny muted">${esc(R.suit(z))}</span>${e ? `<span class="tiny ${e > 0 ? 'ok' : 'bad'}">estime ${e > 0 ? '+' : '−'}${Math.abs(e)}</span>` : ''}</div>`; }).join('')}</div>
    <span class="tiny muted">Leur humeur suit ta zone, et leur estime : elle se gagne (ou se perd) quand ils t’appellent. Elle se tasse un peu chaque semaine.</span></section>`;
  // Carrière.
  const f = felicitationsDe(uid), deja = !moi && S.player && S.player.felicite && S.player.felicite[uid] === st.season;
  const car = `<section class="card" style="gap:10px"><h2 class="card-title">Carrière</h2>
    ${(chef.medailles || []).length ? `<div class="pc-titres">${chef.medailles.map((m) => `<span class="pc-plaque">🎖️ ${esc(m.nom)} <small>saison ${m.season}</small></span>`).join('')}</div>` : '<span class="tiny muted">À chaque fin de saison, une médaille par compétence récompense la plus forte progression du district.</span>'}
    ${(chef.etats || []).length ? chef.etats.slice().reverse().map((e) => `<div class="chef-etat"><span class="chef-rang${e.rang === 1 ? ' or' : e.rang === 2 ? ' ar' : e.rang === 3 ? ' br' : ''}">${e.rang ? `${e.rang}<small>${e.rang === 1 ? 'er' : 'e'}</small>` : '–'}</span>
      <span class="col" style="gap:1px"><span class="small" style="font-weight:700">Saison ${e.season}${e.moyenne != null ? ` · IPZ ${String(e.moyenne).replace('.', ',')}` : ''}${e.anticipee ? ' · écourtée' : ''}</span>${(e.faits || []).length ? `<span class="tiny muted">${esc(e.faits.join(' · '))}</span>` : ''}</span></div>`).join('') : ''}
    ${(chef.souvenirs || []).length ? `<span class="tiny muted" style="font-weight:700">Réunions avec d’autres chefs</span><div class="row" style="gap:8px;flex-wrap:wrap">${chef.souvenirs.slice().reverse().map((x) => `<span class="row" style="gap:4px;align-items:center">${portraitChef(x.u, 24, { galons: false })}<span class="tiny">${st.zones[x.u] ? esc(st.zones[x.u].nom) : '?'} · s${x.s}</span></span>`).join('')}</div>` : ''}
    ${moi ? palierEnigmesHtml(z) : ''}
    <span class="tiny muted" style="font-weight:700">👏 Félicitations cette saison</span>
    <span class="small">${f.length ? f.map((u) => esc((S.players[u] && S.players[u].pseudo) || (st.zones[u] && st.zones[u].nom) || '?')).join(', ') : 'Aucune pour l’instant.'}</span>
    ${moi ? '' : `<button type="button" class="btn small ${deja ? 'ghost' : 'primary'} block" data-action="feliciter" data-u="${esc(uid)}" ${deja ? 'disabled' : ''}>${deja ? '✓ Tu l’as félicité cette saison' : `Féliciter ${esc(p.pseudo || 'ce chef')}`}</button>`}
  </section>`;
  return { hero, comp, tal, honneurs: honneursHtml(z, moi), res, adjoint: adjointFicheHtml(z, moi), car };
}

export function renderBureau() {
  const st = S.state, me = myZone();
  const uid = S.bureauUid && st.zones[S.bureauUid] ? S.bureauUid : me && me.uid;
  const z = st.zones[uid], moi = me && uid === me.uid;
  const back = `<a href="${moi ? '#hp' : '#carte'}" class="backlink">${icon('back', 20)}<span>${moi ? 'Retour à l’HP' : 'Retour à la carte'}</span></a>`;
  if (!z || !z.chef) return `<main class="screen">${back}<section class="card"><p class="small muted" style="margin:0">Pas encore de chef de corps dans cette zone.</p></section></main>${tabbar('hp')}`;
  const x = sectionsChef(uid, moi);
  return `<main class="screen">${back}${x.hero}${x.comp}${x.tal}${x.honneurs}${x.res}${x.adjoint}${x.car}</main>${tabbar(moi ? 'chef' : 'hp')}`;
}

/**
 * Onglet « Chef » (saison 2) : d'abord ce que ton chef fait AUJOURD'HUI (agenda, première ligne, service du réseau,
 * talents, brevet : envoyés avec tes ordres de 20:00), puis sa semaine (objectifs, duel), ce qu'il a fait cette nuit,
 * et sa fiche (compétences, talents, honneurs, réseau, adjoint, carrière) repliée en lignes.
 */
export function renderChef() {
  const st = S.state, z = myZone(), d = S.draft;
  if (!z) return renderBureau();
  // Onglet Brigade : vue Équipe (les figures et leurs galons).
  if (S.brigadeVue === 'equipe') return `<main class="screen"><h1 class="big" style="margin:0 0 10px">Brigade</h1>${segBrigadeHtml()}${equipeVueHtml()}</main>${tabbar('chef')}`;
  if (chefACreer()) return `<main class="screen chef-accueil">${segBrigadeHtml()}<div class="ca-tete"><h1 class="big">Ton chef de corps</h1>
      <p class="small muted" style="margin:0">Choisis qui dirige ta zone : un portrait, un parcours. Ça prend une minute, une seule fois.</p></div>${creationChefHtml()}</main>${tabbar('chef')}`;
  const p = S.player || {};
  // Chef pas encore créé par le tour de 20:00 (nouvelle zone) : on montre déjà celui que le joueur a choisi.
  const chef = z.chef || creerChef(p.chef), zv = z.chef ? z : { ...z, chef };
  const repli = (k, titre, sous, corps) => `<details class="ajd" data-k="${k}" ${S.ouverts && S.ouverts[k] ? 'open' : ''}><summary><span class="ajd-txt"><b>${titre}</b><span>${sous}</span></span><span class="ajd-chev" aria-hidden="true">${icon('chevron', 16)}</span></summary><div class="ajd-corps">${corps}</div></details>`;
  let fiche = '';
  if (z.chef) {
    const x = sectionsChef(z.uid, true);
    fiche = `<section class="hp-ajd" aria-label="Sa fiche"><h2 class="section">Sa fiche</h2>
      ${repli('ch-comp', 'Compétences', 'ce qui fait monter chacune', x.comp)}
      ${repli('ch-hon', 'Honneurs', 'cadre et rubans', x.honneurs)}
      ${x.adjoint ? repli('ch-adj', z.adjoint && z.adjoint.f ? 'L’adjointe' : 'L’adjoint', 'ta consigne les jours sans ordres', x.adjoint) : ''}
      ${repli('ch-car', 'Carrière', `${(z.chef.medailles || []).length} médaille${(z.chef.medailles || []).length > 1 ? 's' : ''} · états de service`, x.car)}</section>`;
  }
  const dd = d || {};
  return `${avecSeg(ongletChefHtml(zv, p, chef, dd, { nuit: z.chef ? chefNuitHtml(z) : '<p class="tiny muted" style="margin:0;text-align:center">Ton chef prend officiellement ses fonctions ce soir à 20:00. Tes choix d’aujourd’hui comptent déjà.</p>', semaine: (duelOk, neufSem) => (z.chef ? semaineHtml(z, { ouvert: CHEF_V3.actif ? !!neufSem : true, duelOk }) : ''), fiche }))}${tabbar('chef')}`;
}

/** Insère le choix de vue (Chef / Équipe) en tête de l'écran du chef. */
const avecSeg = (html) => html.replace(/(<main[^>]*>)/, `$1${segBrigadeHtml()}`);

/** Pastille de l'onglet Chef : un talent neuf à équiper, un brevet à choisir ou un service du réseau à demander. */
export function chefAFaire() {
  const st = S.state, z = myZone(), d = S.draft;
  if ((!z || !z.chef)) return false;
  const eq = (d && d.talents) || z.chef.talents || [];
  const j = jourPrise(z.chef, st.turn);
  if (j >= 3 && (z.chef.nouveauxTalents || []).some((t) => !eq.includes(t))) return true;
  const rep = (d && d.parapheur) || (S.savedOrders && S.savedOrders.parapheur) || {};
  if (courriersDuJour(st, z).some((id) => !Object.hasOwn(rep, id))) return true;
  if (brevetPossible(z.chef) && !(d && d.brevet)) return true;
  if (galonsAFaire()) return true;
  return false;
}

// ───── Le chef se voit agir : bloc « Ton chef cette nuit », moment de promotion, félicitations ─────
const talentAuNiveau = (c, L) => TALENTS.find((t) => t.comp === c && t.niv === L) || null;
export function chefNuitHtml(z) {
  const cn = z && z.chefNuit;
  if (!cn || cn.tour !== S.state.turn - 1 || !(cn.faits || []).length && !(cn.montees || []).length) return '';
  // Retour de Luc : la ligne qui suit une montée de niveau (ex. un service du réseau) se lisait comme la description
  // du talent débloqué. Chaque talent débloqué porte donc sa vraie description, et chaque fait de la nuit son étiquette.
  const montees = (cn.montees || []).map((m) => { const t = talentAuNiveau(m.comp, m.niveau);
    return `🎖️ <b>${esc(COMPETENCES[m.comp].nom)} ${m.niveau}</b>${t ? ` · talent « ${esc(t.nom)} » débloqué<span class="tiny muted" style="display:block">${esc(t.texte)}</span>` : ''}`; });
  const faits = (cn.faits || []).map((f) => (TALENT[f.id] ? `<img class="chef-insigne" src="img/talents/${f.id}.webp" alt="">${esc(f.t)}`
    : String(f.id || '').startsWith('svc-') ? `🤝 <span class="tiny muted">Réseau ·</span> ${esc(f.t)}` : esc(f.t)));
  const l = [...montees, ...faits].slice(0, 3);
  const nM = Math.min(montees.length, 3);
  return `<button type="button" class="chef-nuit" data-action="bureau-ouvrir">${portraitChef(z.uid, 36, { galons: false })}
    <span class="col" style="gap:2px;min-width:0;text-align:left"><span class="tiny muted" style="font-weight:700">Ton chef cette nuit${cn.signature ? ` · ${esc(cn.signature)}` : ''}</span>${l.map((x, k) => `<span class="small" style="line-height:1.35${k === nM && k > 0 ? ';border-top:1px solid var(--line);padding-top:4px;margin-top:2px' : ''}">${x}</span>`).join('')}</span></button>`;
}

/** Moment de promotion : une seule fois par soirée, à la première ouverture de l'HP. */
export function promotionAuBesoin() {
  const z = myZone(), cn = z && z.chefNuit;
  if (!cn || cn.tour !== S.state.turn - 1 || !((cn.montees || []).some((m) => [2, 5, 8, 10].includes(m.niveau)) || (cn.nouveaux || []).length)) return false;
  const cle = `mazp-promo-${S.state.season}-${cn.tour}-${z.uid}`;
  try { if (localStorage.getItem(cle)) return false; localStorage.setItem(cle, '1'); } catch (e) { return false; }
  const m = (cn.montees || []).filter((x) => [2, 5, 8, 10].includes(x.niveau)).sort((a, b) => b.niveau - a.niveau)[0];
  const t = (cn.nouveaux || [])[0];
  S.bureauUid = null; S.bureauObj = null;
  setTimeout(() => ouvrirPanneauChef(`<span class="kicker" style="color:var(--amber)">Promotion</span>
    <h2 id="aide-titre" class="aide-titre" style="margin:0">${m ? `${COMPETENCES[m.comp].ico} ${esc(COMPETENCES[m.comp].nom)} niveau ${m.niveau} !` : 'Nouveau talent !'}</h2>
    <div class="row" style="gap:14px;align-items:center;justify-content:center;padding:6px 0">${portraitChef(z.uid, 72)}${t ? `<img src="img/talents/${t}.webp" alt="" width="72" height="72" style="filter:drop-shadow(0 0 10px rgba(255,217,138,.7))">` : ''}</div>
    ${m ? `<span class="chef-barre" style="--c:${COUL_COMP[m.comp]}"><span style="width:100%"></span></span>` : ''}
    ${t ? `<p class="small" style="margin:0">Talent débloqué : <b>${esc(TALENT[t].nom)}</b> · ${esc(TALENT[t].texte)}. Équipe-le dans tes ordres (Chef de corps).</p>` : ''}
    ${cn.signature ? `<p class="tiny muted" style="margin:0">Ton style : ${esc(cn.signature)}.</p>` : ''}
    <div class="row" style="gap:8px"><a class="btn primary grow" href="#bureau" data-close>Voir mon chef</a><button type="button" class="btn ghost grow" data-close>Plus tard</button></div>`), 500);
  return true;
}
let ouvrirPanneauChef = () => {};
export function brancherPanneauChef(fn) { ouvrirPanneauChef = fn; }

/** Félicitations : qui a félicité ce chef cette saison (une par joueur et par saison, sans aucun effet de jeu). */
export function felicitationsDe(uid) {
  const s = S.state.season;
  return Object.entries(S.players || {}).filter(([u, p]) => u !== uid && p && p.felicite && p.felicite[uid] === s).map(([u]) => u);
}

// ───── Le chef partout dans le jeu ─────
/** Ma zone, avec l'agenda du brouillon d'ordres (pour les limites qui en dépendent, ex. talent « Intuition »). */
export function zoneAvecAgenda() { const z = myZone(); return z ? { ...z, _agenda: (S.draft && S.draft.agenda) || (z.dernierOrdre && z.dernierOrdre.agenda) || null } : z; }
/** Petite pastille « entraîne telle compétence du chef » (saison 2, si le chef existe). */
export function chipEntraine(cle, texte = null) {
  const z = myZone(), c = JEUX_COMP[cle] || (COMPETENCES[cle] ? cle : null);
  if ((!z || !z.chef) || !c) return '';
  return `<span class="chip-chef" style="--c:${COUL_COMP[c]}" title="Entraîne la compétence ${esc(COMPETENCES[c].nom)} de ton chef">${COMPETENCES[c].ico} ${texte === '' ? esc(COMPETENCES[c].nom) : texte || `${esc(COMPETENCES[c].nom)} +1`}</span>`;
}

/** Paliers de carrière des énigmes (toutes saisons) : en saison 2, ils quittent l'écran Énigmes pour la Carrière du chef. */
function palierEnigmesHtml(z) {
  if (!z) return '';
  const n = (z.carriere && Number.isFinite(z.carriere.enigmes)) ? z.carriere.enigmes : (z.stats && z.stats.quetesOk) || 0;
  const P = ENIGMES.paliers, prochain = (Math.floor(n / P.pas) + 1) * P.pas, pct = Math.round(100 * (n % P.pas) / P.pas);
  return `<div class="palier-enig" style="margin:0" title="Toutes les ${P.pas} énigmes réussies (dossier noir compris)"><span class="tiny"><strong>🧩 ${n}</strong> énigme${n > 1 ? 's' : ''} réussie${n > 1 ? 's' : ''} depuis ton arrivée · palier à ${prochain} : +${P.budget} k€ et +${P.jauge} jauge des skins</span><span class="palier-barre"><i style="width:${pct}%"></i></span></div>`;
}
