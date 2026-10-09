// Le chef de corps (saison 2) : portrait, création, fiche, agenda et talents dans les Ordres.
import { S, esc, icon, myZone, zoneName } from './common.js';
import { gradeFor, INFRAS, SERVICE_LABELS, ENIGMES } from '../engine/constants.js';
import { reglesV2 } from '../engine/regles.js';
import { tabbar } from './common.js';
import { COMPETENCES, IDS_COMPETENCES, PARCOURS, IDS_PARCOURS, TALENTS, TALENT, AGENDA, IDS_AGENDA, CHEF,
  niveauChef, progresChef, talentsDebloques, totalNiveaux, signatureChef, niveauXp, XP_CUMUL, NIVEAU_MAX_CHEF, JEUX_COMP,
  FRONT, IDS_FRONT, RISQUE_FRONT, RESEAU as RESEAU_E, IDS_RESEAU, servicePossible, VOIES, brevetPossible, BREVET_NIVEAUX, maxTalentsDe, humeurReseau, estimeDe } from '../engine/chef.js';
import { cadreDe, rubansDe, RUBANS } from '../engine/chef-semaine.js';
import { ongletChefHtml } from './chef-onglet.js';
import { creerChef } from '../engine/chef.js';
import { jourPrise, courriersDuJour } from '../engine/parapheur.js';
import { adjointFicheHtml, honneursHtml, COUL_CADRE, semaineHtml } from './chef-semaine.js';

// ───── Portraits (images générées avec Gemini, img/chefs/pNN.webp) ─────
// Tant qu'une image manque, un portrait dessiné (silhouette en uniforme, initiales) la remplace.
export const PORTRAITS = [
  ['p01', 'f'], ['p02', 'h'], ['p03', 'f'], ['p04', 'h'], ['p05', 'f'], ['p06', 'h'], ['p07', 'f'], ['p08', 'h'],
  ['p09', 'f'], ['p10', 'h'], ['p11', 'f'], ['p12', 'h'], ['p13', 'h'], ['p14', 'f'], ['p15', 'h'], ['p16', 'f'],
  ['p17', 'h'], ['p18', 'f'], ['p19', 'h'], ['p20', 'h'], ['p21', 'f'], ['p22', 'f'], ['p23', 'h'], ['p24', 'f'],
].map(([id, g]) => ({ id, g }));
const PORTRAIT = Object.fromEntries(PORTRAITS.map((p) => [p.id, p]));

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
  const c = (z && z.couleur) || '#5AB0F0';
  const pid = id || (p && p.chef && p.chef.portrait) || null;
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
  const pr = p.chef && PORTRAIT[p.chef.portrait];
  const n = galons && z ? etoiles(z.ps) : 0;
  const img = pr ? `<img src="img/chefs/${pr.id}.webp" alt="" width="${taille}" height="${taille}" loading="lazy" style="display:block;width:${taille}px;height:${taille}px;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none">${portraitDessine(p, z, taille)}</span>` : portraitDessine(p, z, taille);
  // Honneurs : cadre selon les niveaux, ruban choisi par le joueur (s'il l'a gagné).
  const cad = z && z.chef ? cadreDe(z.chef) : null, cc = cad && COUL_CADRE[cad.id];
  const rb = z && z.chef && p.chef && p.chef.ruban && RUBANS[p.chef.ruban] && rubansDe(z.chef).includes(p.chef.ruban) ? RUBANS[p.chef.ruban] : null;
  return `<span class="chef-portrait${cc ? ` cadre-${cad.id}` : ''}" style="--t:${taille}px;--zc:${esc((z && z.couleur) || '#5AB0F0')}${cc ? `;--cadre:${cc}` : ''}" ${cad && cc ? `title="${esc(cad.nom)}"` : ''}>${img}${n > 0 ? `<span class="chef-galons" aria-label="${n} étoile${n > 1 ? 's' : ''}">${'★'.repeat(n)}</span>` : ''}${rb && taille >= 30 ? `<span class="chef-ruban" title="${esc(rb.nom)}">${rb.ico}</span>` : ''}</span>`;
}

// ───── Création (première ouverture de la saison 2) ─────
export function chefACreer() {
  const z = myZone();
  if (!z || !S.state || !reglesV2(S.state)) return false;
  const p = S.player || {};
  return !(p.chef && p.chef.parcours && p.chef.portrait);
}
export function creationChefHtml() {
  const p = S.player || {}, zc = myZone(), fige = zc && zc.chef && PARCOURS[zc.chef.parcours] ? zc.chef.parcours : null;
  const c = { ...(p.chef || {}), ...(S.chefBrouillon || {}), ...(fige ? { parcours: fige } : {}) };
  return `<section class="card chef-creation" aria-label="Ton chef de corps" style="gap:12px;border-color:var(--amber-line)">
    <span class="kicker">Saison 2 · ton chef de corps</span>
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

// ───── Fiche du chef ─────
/** Toile des 5 compétences (SVG). */
function toile(chef, taille = 190) {
  const R = taille / 2 - 34, cx = taille / 2, cy = taille / 2;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const anneaux = [2, 4, 6, 8, 10].map((v) => `<polygon points="${IDS_COMPETENCES.map((_, i) => pt(i, R * v / 10).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
  const forme = IDS_COMPETENCES.map((c, i) => pt(i, R * Math.max(0.4, niveauChef(chef, c)) / 10).join(',')).join(' ');
  const labels = IDS_COMPETENCES.map((c, i) => { const [x, y] = pt(i, R + 15); return `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" fill="var(--text2)">${COMPETENCES[c].court} ${niveauChef(chef, c)}</text>`; }).join('');
  return `<svg viewBox="0 0 ${taille} ${taille}" width="${taille}" height="${taille}" role="img" aria-label="Compétences du chef">${anneaux}
    <polygon points="${forme}" fill="color-mix(in srgb, var(--zc) 35%, transparent)" stroke="var(--zc)" stroke-width="2"/>${labels}</svg>`;
}
export function ficheChefHtml(uid, { moi = false } = {}) {
  const st = S.state, z = st.zones[uid];
  if (!z || !z.chef) return '';
  const chef = z.chef, p = (S.players && S.players[uid]) || (moi ? S.player : {}) || {};
  const pc = chef.parcours && PARCOURS[chef.parcours];
  const deb = new Set(talentsDebloques(chef));
  return `<section class="card chef-fiche" aria-label="Chef de corps" style="--zc:${esc(z.couleur || '#5AA0F0')}">
    <div class="row" style="gap:12px;align-items:center">${portraitChef(uid, 64)}
      <span class="col grow" style="gap:2px;min-width:0"><span class="kicker">Chef de corps</span>
        <span style="font-weight:700">${esc(p.pseudo || 'Sans pseudo')} · ${esc(gradeFor(z.ps || 0).nom)}</span>
        <span class="tiny muted">${pc ? esc(pc.nom) : 'Parcours à choisir'}${p.chef && p.chef.devise ? ` · « ${esc(p.chef.devise)} »` : ''}</span></span></div>
    <div class="chef-toile">${toile(chef)}
      <div class="col" style="gap:6px;flex:1;min-width:150px">${IDS_COMPETENCES.map((c) => `<div class="col" style="gap:2px"><span class="between tiny"><span>${COMPETENCES[c].ico} ${esc(COMPETENCES[c].nom)}</span><b>${niveauChef(chef, c)}</b></span>
        <span class="pc-barre"><span style="width:${Math.max(3, Math.round(progresChef(chef, c) * 100))}%"></span></span></div>`).join('')}</div></div>
    <span class="tiny muted" style="font-weight:700">Talents équipés (${(chef.talents || []).length}/${CHEF.maxTalents})</span>
    <div class="col" style="gap:4px">${(chef.talents || []).length ? chef.talents.map((t) => `<span class="small" style="display:flex;gap:6px;align-items:center"><img src="img/talents/${t}.webp" alt="" width="24" height="24"><span><b>${esc(TALENT[t].nom)}</b> <span class="muted">· ${esc(TALENT[t].texte)}</span></span></span>`).join('') : '<span class="tiny muted">Aucun pour l’instant.</span>'}</div>
    ${moi ? `<details class="repli-mini"><summary class="tiny muted">Tous les talents (${deb.size} débloqué${deb.size > 1 ? 's' : ''} sur ${TALENTS.length})</summary>
      <div class="col" style="gap:4px;margin-top:6px">${IDS_COMPETENCES.map((c) => TALENTS.filter((t) => t.comp === c).map((t) => `<span class="tiny ${deb.has(t.id) ? '' : 'muted'}"><img src="img/talents/${t.id}.webp" alt="" width="16" height="16" style="vertical-align:-3px;${deb.has(t.id) ? '' : 'filter:grayscale(1);opacity:.5'}"> <b>${esc(t.nom)}</b> (${esc(COMPETENCES[c].nom)} ${t.niv}) · ${esc(t.texte)}</span>`).join('')).join('')}</div></details>` : ''}
    ${(chef.medailles || []).length ? `<div class="pc-titres">${chef.medailles.map((m) => `<span class="pc-plaque">🎖️ ${esc(m.nom)} <small>saison ${m.season}</small></span>`).join('')}</div>` : ''}
    ${(chef.etats || []).length ? `<span class="tiny muted" style="font-weight:700">États de service</span>
      <div class="col" style="gap:2px">${chef.etats.slice().reverse().map((e) => `<span class="tiny">Saison ${e.season} · ${e.rang ? `${e.rang}${e.rang === 1 ? 'er' : 'e'} sur ${e.sur}` : 'non classé'}${e.moyenne != null ? ` · IPZ moyen ${String(e.moyenne).replace('.', ',')}` : ''} · ${e.affaires} affaire${e.affaires > 1 ? 's' : ''} · ${e.trophees} trophée${e.trophees > 1 ? 's' : ''}${e.anticipee ? ' · saison écourtée' : ''}${(e.faits || []).length ? `<br><span class="muted">${esc(e.faits.join(' · '))}</span>` : ''}</span>`).join('')}</div>` : ''}
    ${chef.parrain && chef.parrain.fin >= st.turn && st.zones[chef.parrain.uid] ? `<span class="tiny">Parrainé par ${zoneName(st.zones[chef.parrain.uid])} jusqu’au jour ${chef.parrain.fin} (${esc(COMPETENCES[chef.parrain.comp].nom)} +50 %).</span>` : ''}
  </section>`;
}

// ───── Ordres : agenda, talents, parrainage ─────
export function resumeChefOrdres(z, d) {
  if (z.chef.blesse != null && S.state.turn <= z.chef.blesse) return `🏥 À l’hôpital jusqu’au jour ${z.chef.blesse}`;
  const a = d.agenda || { type: 'bureau' }, A = AGENDA[a.type] || AGENDA.bureau;
  const l = a.type === 'terrain' ? `${A.nom} (${SERVICE_LABELS[a.service || 'intervention']})` : a.type === 'voisin' && S.state.zones[a.zone] ? `Chez ${S.state.zones[a.zone].nom}` : A.nom;
  return `${A.ico} ${esc(l)}${d.chefFront ? ` · ⚔️ ${esc(FRONT[d.chefFront].nom.toLowerCase())}` : ''}${d.reseau ? ' · service demandé' : ''} · talents ${((d.talents || z.chef.talents) || []).length}/${maxTalentsDe(z.chef)}`;
}
export function chefOrdresHtml(z, d) {
  const st = S.state, T = st.turn, chef = z.chef;
  const a = d.agenda || { type: 'bureau' };
  const voisins = Object.values(st.zones).filter((x) => x.uid !== z.uid && x.chef);
  const deb = talentsDebloques(chef);
  const eq = d.talents || chef.talents || [];
  const verrou = chef.talentsT != null && T < chef.talentsT + CHEF.semaine;
  const filleuls = totalNiveaux(chef) >= CHEF.parrainage.minParrain ? voisins.filter((x) => totalNiveaux(x.chef) <= CHEF.parrainage.maxFilleul && !(x.chef.parrain && x.chef.parrain.fin >= T)) : [];
  return `<div class="col" style="gap:10px">
    <span class="tiny muted" style="font-weight:700">Où passe ton chef aujourd’hui ?</span>
    <div class="col" style="gap:6px">${IDS_AGENDA.map((k) => { const A = AGENDA[k]; return `<button type="button" class="choice" data-action="chef-agenda" data-v="${k}" aria-pressed="${a.type === k}" style="text-align:left;align-items:flex-start">
      <span style="font-weight:700">${A.ico} ${esc(A.nom)} <span class="tiny muted">· ${esc(COMPETENCES[A.comp].nom)}</span></span><span class="s">${esc(A.effet)}</span></button>`; }).join('')}</div>
    ${a.type === 'terrain' ? `<label class="field tiny">Avec quel service ?<select class="text" data-change="chef-service">${['intervention', 'proximite', 'recherche', 'roulage', 'admin'].map((s2) => `<option value="${s2}" ${(a.service || 'intervention') === s2 ? 'selected' : ''}>${esc(s2 === 'admin' ? 'Accueil' : SERVICE_LABELS[s2])}</option>`).join('')}</select></label>` : ''}
    ${a.type === 'voisin' ? `<label class="field tiny">Chez quelle zone ?<select class="text" data-change="chef-voisin"><option value="">—</option>${voisins.map((x) => `<option value="${esc(x.uid)}" ${a.zone === x.uid ? 'selected' : ''}>${zoneName(x)}</option>`).join('')}</select></label>
      <p class="tiny muted" style="margin:0">La réunion n’a lieu que si ce chef vient aussi chez toi ce soir : convenez-en sur la Radio.</p>` : ''}
    ${chef.blesse != null && st.turn <= chef.blesse ? `<p class="small bad" style="margin:0">🏥 Ton chef est à l’hôpital jusqu’au jour ${chef.blesse} : talents coupés, agenda au bureau, pas de première ligne.</p>` : `
    <span class="tiny muted" style="font-weight:700">En première ligne ce soir ? (une action, ${Math.round(RISQUE_FRONT.base * 100)} % de risque d’être blessé : 2 jours d’hôpital)</span>
    <div class="chef-chips"><button type="button" class="chef-chip" data-action="chef-front" data-v="" aria-pressed="${!d.chefFront}">🪑 Non</button>${IDS_FRONT.map((k) => `<button type="button" class="chef-chip" data-action="chef-front" data-v="${k}" aria-pressed="${d.chefFront === k}">${COMPETENCES[FRONT[k].comp].ico} ${esc(FRONT[k].court)}</button>`).join('')}</div>
    ${d.chefFront ? `<span class="small ok">${esc(FRONT[d.chefFront].nom)} : ${esc(FRONT[d.chefFront].effet(niveauChef(chef, FRONT[d.chefFront].comp)))} (${esc(COMPETENCES[FRONT[d.chefFront].comp].nom)} ${niveauChef(chef, FRONT[d.chefFront].comp)}), seulement si l’action a lieu ce soir.</span>` : ''}`}
    <span class="tiny muted" style="font-weight:700">Demander un service au réseau (si la personne est satisfaite, une fois par semaine chacune)</span>
    <div class="chef-reseau">${IDS_RESEAU.map((id) => { const R = RESEAU_E[id], refus = servicePossible(z, id, T), h = humeurReseau(z, id); return `<button type="button" class="chef-pers ${h > 0 ? 'ok' : h < 0 ? 'ko' : ''}${d.reseau === id ? ' choisi' : ''}" data-action="chef-reseau" data-v="${id}" ${refus ? 'disabled' : ''} aria-pressed="${d.reseau === id}" style="background:none;border:0;padding:0;cursor:pointer;color:var(--text)"><img src="img/bureau/${id}-${h > 0 ? 1 : h < 0 ? '-1' : 0}.webp" alt=""><span class="tiny" style="font-weight:700">${esc(R.nom.replace(/^(Le|La) /, ''))}</span><span class="tiny ${refus ? 'muted' : 'ok'}">${refus ? esc(refus) : esc(R.geste(niveauChef(chef, 'diplomatie')))}</span></button>`; }).join('')}</div>
    ${brevetPossible(chef) ? `<span class="tiny muted" style="font-weight:700">🎓 Brevet de carrière disponible (une fois, définitif) : un titre et un 4e emplacement de talent</span>
    <div class="col" style="gap:6px">${Object.entries(VOIES).map(([k, V]) => `<button type="button" class="choice" data-action="chef-brevet" data-v="${k}" aria-pressed="${d.brevet === k}" style="text-align:left;align-items:flex-start"><span style="font-weight:700">${esc(V.nom)} · ${esc(V.titre)}</span><span class="s">${esc(V.texte)}</span></button>`).join('')}</div>` : chef.brevet ? `<span class="tiny muted">🎓 ${esc(VOIES[chef.brevet].titre)} : 4e emplacement pour un talent de ${VOIES[chef.brevet].comps.map((c) => esc(COMPETENCES[c].nom)).join(' ou ')}.</span>` : `<span class="tiny muted">🎓 Brevet de carrière à ${BREVET_NIVEAUX} niveaux au total (tu en as ${totalNiveaux(chef)}).</span>`}
    <details class="repli-mini" ${(chef.nouveauxTalents || []).some((t) => !eq.includes(t)) ? 'open' : ''}><summary class="tiny" style="font-weight:700">Talents équipés (${eq.length}/${maxTalentsDe(chef)}) · ${eq.map((t) => esc(TALENT[t].nom)).join(', ') || 'aucun'} · changer</summary>
    <span class="tiny muted">${verrou ? `Remplacer un talent : à partir du jour ${chef.talentsT + CHEF.semaine}` : 'Ajouter est libre ; remplacer un talent, une fois par semaine.'}</span>
    ${deb.length ? `<div class="col" style="gap:6px">${deb.map((id) => { const t = TALENT[id], on = eq.includes(id); const V = chef.brevet && VOIES[chef.brevet], horsVoie = eq.filter((x) => !(V && V.comps.includes(TALENT[x].comp))).length; const bloque = !on && (eq.length >= maxTalentsDe(chef) || (!(V && V.comps.includes(t.comp)) && horsVoie >= CHEF.maxTalents)); return `<button type="button" class="choice" data-action="chef-talent" data-v="${id}" aria-pressed="${on}" ${bloque ? 'disabled' : ''} style="text-align:left;align-items:flex-start">
      <span style="font-weight:700;display:flex;align-items:center;gap:6px"><img src="img/talents/${t.id}.webp" alt="" width="26" height="26">${esc(t.nom)} <span class="tiny muted">· ${esc(COMPETENCES[t.comp].nom)} ${t.niv}</span>${(chef.nouveauxTalents || []).includes(id) ? ' <span class="pill amber">nouveau</span>' : ''}</span><span class="s">${esc(t.texte)}</span></button>`; }).join('')}</div>`
      : `<p class="tiny muted" style="margin:0">Aucun talent débloqué : le premier arrive au niveau 2 d’une compétence.</p>`}</details>
    ${filleuls.length ? `<label class="field tiny">Parrainer un nouveau chef (7 jours, sa meilleure progression +50 %, des PS d’entraide pour toi)<select class="text" data-change="chef-parrainer"><option value="">Personne</option>${filleuls.map((x) => `<option value="${esc(x.uid)}" ${d.parrainer === x.uid ? 'selected' : ''}>${zoneName(x)}</option>`).join('')}</select></label>` : ''}
  </div>`;
}

/** Bâtir : emplacements d'annexes (saison 2) et démolition. */
export function emplacementsHtml(z, d) {
  if (!reglesV2(S.state)) return '';
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
  gestion: 'revenu positif, investissements, paperasse bouclée, journée au bureau ou à la commune · jeux : embouteillage, dossier à relire',
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
    ${moi && !reglesV2(st) ? '<a class="tiny" href="#ordres" data-action="ord-chef">Changer mes talents dans les Ordres →</a>' : ''}
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
  if (!z || !z.chef) return `<main class="screen">${back}<section class="card"><p class="small muted" style="margin:0">Le chef de corps arrive avec la saison 2.</p></section></main>${tabbar('hp')}`;
  const x = sectionsChef(uid, moi);
  return `<main class="screen">${back}${x.hero}${x.comp}${x.tal}${x.honneurs}${x.res}${x.adjoint}${x.car}</main>${tabbar(moi && reglesV2(st) ? 'chef' : 'hp')}`;
}

/**
 * Onglet « Chef » (saison 2) : d'abord ce que ton chef fait AUJOURD'HUI (agenda, première ligne, service du réseau,
 * talents, brevet : envoyés avec tes ordres de 20:00), puis sa semaine (objectifs, duel), ce qu'il a fait cette nuit,
 * et sa fiche (compétences, talents, honneurs, réseau, adjoint, carrière) repliée en lignes.
 */
export function renderChef() {
  const st = S.state, z = myZone(), d = S.draft;
  if (!z || !reglesV2(st)) return renderBureau();
  if (chefACreer()) return `<main class="screen chef-accueil"><div class="ca-tete"><h1 class="big">Ton chef de corps</h1>
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
  return `${ongletChefHtml(zv, p, chef, dd, { nuit: z.chef ? chefNuitHtml(z) : '<p class="tiny muted" style="margin:0;text-align:center">Ton chef prend officiellement ses fonctions ce soir à 20:00. Tes choix d’aujourd’hui comptent déjà.</p>', semaine: (duelOk) => (z.chef ? semaineHtml(z, { ouvert: true, duelOk }) : ''), fiche })}${tabbar('chef')}`;
}

/** Pastille de l'onglet Chef : un talent neuf à équiper, un brevet à choisir ou un service du réseau à demander. */
export function chefAFaire() {
  const st = S.state, z = myZone(), d = S.draft;
  if (!z || !z.chef || !reglesV2(st)) return false;
  const eq = (d && d.talents) || z.chef.talents || [];
  const j = jourPrise(z.chef, st.turn);
  if (j >= 3 && (z.chef.nouveauxTalents || []).some((t) => !eq.includes(t))) return true;
  const rep = (d && d.parapheur) || (S.savedOrders && S.savedOrders.parapheur) || {};
  if (courriersDuJour(st, z).some((id) => !Object.hasOwn(rep, id))) return true;
  if (brevetPossible(z.chef) && !(d && d.brevet)) return true;
  return false;
}

// ───── Le chef se voit agir : bloc « Ton chef cette nuit », moment de promotion, félicitations ─────
const talentAuNiveau = (c, L) => TALENTS.find((t) => t.comp === c && t.niv === L) || null;
export function chefNuitHtml(z) {
  const cn = z && z.chefNuit;
  if (!cn || cn.tour !== S.state.turn - 1 || !(cn.faits || []).length && !(cn.montees || []).length) return '';
  const l = [...(cn.montees || []).map((m) => `<b>${esc(COMPETENCES[m.comp].nom)} ${m.niveau}</b>${talentAuNiveau(m.comp, m.niveau) ? ` · talent « ${esc(talentAuNiveau(m.comp, m.niveau).nom)} » débloqué` : ''}`),
    ...(cn.faits || []).map((f) => `${TALENT[f.id] ? `<img class="chef-insigne" src="img/talents/${f.id}.webp" alt="">` : ''}${esc(f.t)}`)].slice(0, 3);
  return `<button type="button" class="chef-nuit" data-action="bureau-ouvrir">${portraitChef(z.uid, 36, { galons: false })}
    <span class="col" style="gap:2px;min-width:0;text-align:left"><span class="tiny muted" style="font-weight:700">Ton chef cette nuit${cn.signature ? ` · ${esc(cn.signature)}` : ''}</span>${l.map((x) => `<span class="small" style="line-height:1.35">${x}</span>`).join('')}</span></button>`;
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
  if (!z || !z.chef || !reglesV2(S.state) || !c) return '';
  return `<span class="chip-chef" style="--c:${COUL_COMP[c]}" title="Entraîne la compétence ${esc(COMPETENCES[c].nom)} de ton chef">${COMPETENCES[c].ico} ${texte === '' ? esc(COMPETENCES[c].nom) : texte || `${esc(COMPETENCES[c].nom)} +1`}</span>`;
}

/** Paliers de carrière des énigmes (toutes saisons) : en saison 2, ils quittent l'écran Énigmes pour la Carrière du chef. */
function palierEnigmesHtml(z) {
  if (!z) return '';
  const n = (z.carriere && Number.isFinite(z.carriere.enigmes)) ? z.carriere.enigmes : (z.stats && z.stats.quetesOk) || 0;
  const P = ENIGMES.paliers, prochain = (Math.floor(n / P.pas) + 1) * P.pas, pct = Math.round(100 * (n % P.pas) / P.pas);
  return `<div class="palier-enig" style="margin:0" title="Toutes les ${P.pas} énigmes réussies (dossier noir compris)"><span class="tiny"><strong>🧩 ${n}</strong> énigme${n > 1 ? 's' : ''} réussie${n > 1 ? 's' : ''} depuis ton arrivée · palier à ${prochain} : +${P.budget} k€ et +${P.jauge} jauge des skins</span><span class="palier-barre"><i style="width:${pct}%"></i></span></div>`;
}
