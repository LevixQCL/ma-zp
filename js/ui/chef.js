// Le chef de corps (saison 2) : portrait, création, fiche, agenda et talents dans les Ordres.
import { S, esc, icon, myZone, zoneName } from './common.js';
import { gradeFor, INFRAS, SERVICE_LABELS } from '../engine/constants.js';
import { reglesV2 } from '../engine/regles.js';
import { bureauSvg } from './bureau-scene.js';
import { tabbar } from './common.js';
import { COMPETENCES, IDS_COMPETENCES, PARCOURS, IDS_PARCOURS, TALENTS, TALENT, AGENDA, IDS_AGENDA, CHEF,
  niveauChef, progresChef, talentsDebloques, totalNiveaux } from '../engine/chef.js';

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
  return `<span class="chef-portrait" style="--t:${taille}px;--zc:${esc((z && z.couleur) || '#5AB0F0')}">${img}${n > 0 ? `<span class="chef-galons" aria-label="${n} étoile${n > 1 ? 's' : ''}">${'★'.repeat(n)}</span>` : ''}</span>`;
}

// ───── Création (première ouverture de la saison 2) ─────
export function chefACreer() {
  const z = myZone();
  if (!z || !S.state || !reglesV2(S.state)) return false;
  const p = S.player || {};
  return !(p.chef && p.chef.parcours && p.chef.portrait);
}
export function creationChefHtml() {
  const p = S.player || {}, c = { ...(p.chef || {}), ...(S.chefBrouillon || {}) };
  return `<section class="card chef-creation" aria-label="Ton chef de corps" style="gap:12px;border-color:var(--amber-line)">
    <span class="kicker">Saison 2 · ton chef de corps</span>
    <p class="small" style="margin:0">Tu n’es plus seulement une zone : tu es son chef. Ses compétences montent selon ta façon de jouer et le suivent de saison en saison. Choisis son visage et son parcours (une minute, une seule fois).</p>
    <span class="tiny muted" style="font-weight:700">Portrait</span>
    <div class="chef-grille">${PORTRAITS.map((x) => `<button type="button" class="chef-choix" data-action="chef-portrait" data-v="${x.id}" aria-pressed="${c.portrait === x.id}" aria-label="Portrait ${x.id}">
      <img src="img/chefs/${x.id}.webp" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="chef-choix-svg" style="display:none">${portraitDessine(p, myZone(), 56, x.id)}</span></button>`).join('')}</div>
    <span class="tiny muted" style="font-weight:700">Parcours (+2 niveaux dans une compétence)</span>
    ${IDS_PARCOURS.map((k) => { const x = PARCOURS[k]; return `<button type="button" class="choice" data-action="chef-parcours" data-v="${k}" aria-pressed="${c.parcours === k}" style="text-align:left;align-items:flex-start">
      <span style="font-weight:700">${COMPETENCES[x.comp].ico} ${esc(x.nom)} <span class="tiny muted">· ${esc(COMPETENCES[x.comp].nom)} +2</span></span><span class="s">${esc(x.texte)}</span></button>`; }).join('')}
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
    <div class="col" style="gap:4px">${(chef.talents || []).length ? chef.talents.map((t) => `<span class="small"><b>${esc(TALENT[t].nom)}</b> <span class="muted">· ${esc(TALENT[t].texte)}</span></span>`).join('') : '<span class="tiny muted">Aucun pour l’instant.</span>'}</div>
    ${moi ? `<details class="repli-mini"><summary class="tiny muted">Tous les talents (${deb.size} débloqué${deb.size > 1 ? 's' : ''} sur ${TALENTS.length})</summary>
      <div class="col" style="gap:4px;margin-top:6px">${IDS_COMPETENCES.map((c) => TALENTS.filter((t) => t.comp === c).map((t) => `<span class="tiny ${deb.has(t.id) ? '' : 'muted'}">${deb.has(t.id) ? '🔓' : '🔒'} <b>${esc(t.nom)}</b> (${esc(COMPETENCES[c].nom)} ${t.niv}) · ${esc(t.texte)}</span>`).join('')).join('')}</div></details>` : ''}
    ${(chef.medailles || []).length ? `<div class="pc-titres">${chef.medailles.map((m) => `<span class="pc-plaque">🎖️ ${esc(m.nom)} <small>saison ${m.season}</small></span>`).join('')}</div>` : ''}
    ${(chef.etats || []).length ? `<span class="tiny muted" style="font-weight:700">États de service</span>
      <div class="col" style="gap:2px">${chef.etats.slice().reverse().map((e) => `<span class="tiny">Saison ${e.season} · ${e.rang ? `${e.rang}${e.rang === 1 ? 'er' : 'e'} sur ${e.sur}` : 'non classé'}${e.moyenne != null ? ` · IPZ moyen ${String(e.moyenne).replace('.', ',')}` : ''} · ${e.affaires} affaire${e.affaires > 1 ? 's' : ''} · ${e.trophees} trophée${e.trophees > 1 ? 's' : ''}${e.anticipee ? ' · saison écourtée' : ''}</span>`).join('')}</div>` : ''}
    ${chef.parrain && chef.parrain.fin >= st.turn && st.zones[chef.parrain.uid] ? `<span class="tiny">Parrainé par ${zoneName(st.zones[chef.parrain.uid])} jusqu’au jour ${chef.parrain.fin} (${esc(COMPETENCES[chef.parrain.comp].nom)} +50 %).</span>` : ''}
  </section>`;
}

// ───── Ordres : agenda, talents, parrainage ─────
export function resumeChefOrdres(z, d) {
  const a = d.agenda || { type: 'bureau' }, A = AGENDA[a.type] || AGENDA.bureau;
  const l = a.type === 'terrain' ? `${A.nom} (${SERVICE_LABELS[a.service || 'intervention']})` : a.type === 'voisin' && S.state.zones[a.zone] ? `Chez ${S.state.zones[a.zone].nom}` : A.nom;
  return `${A.ico} ${esc(l)} · talents ${((d.talents || z.chef.talents) || []).length}/${CHEF.maxTalents}`;
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
    <span class="tiny muted" style="font-weight:700">Talents équipés (${eq.length}/${CHEF.maxTalents})${verrou ? ` · remplacer un talent : à partir du jour ${chef.talentsT + CHEF.semaine}` : ' · tu peux en changer une fois par semaine'}</span>
    ${deb.length ? `<div class="col" style="gap:6px">${deb.map((id) => { const t = TALENT[id], on = eq.includes(id); const bloque = !on && eq.length >= CHEF.maxTalents; return `<button type="button" class="choice" data-action="chef-talent" data-v="${id}" aria-pressed="${on}" ${bloque ? 'disabled' : ''} style="text-align:left;align-items:flex-start">
      <span style="font-weight:700">${esc(t.nom)} <span class="tiny muted">· ${esc(COMPETENCES[t.comp].nom)} ${t.niv}</span>${(chef.nouveauxTalents || []).includes(id) ? ' <span class="pill amber">nouveau</span>' : ''}</span><span class="s">${esc(t.texte)}</span></button>`; }).join('')}</div>`
      : `<p class="tiny muted" style="margin:0">Aucun talent débloqué : le premier arrive au niveau 2 d’une compétence.</p>`}
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

// ───── Le bureau du chef (écran illustré) ─────
// Rien de nouveau à gérer : le bureau montre ce que le chef a déjà accompli. Les objets apparaissent avec les
// compétences (niveaux 2, 5, 8), les médailles et les états de service se posent au mur, et les quatre visages du
// réseau reflètent la zone (satisfaction, réputation, moral, presse).
const RESEAU = {
  bourgmestre: { nom: 'Le bourgmestre', suit: 'la satisfaction de la population', humeur: (z) => (z.satisfaction >= 65 ? 1 : z.satisfaction < 45 ? -1 : 0) },
  procureur: { nom: 'Le procureur', suit: 'ta réputation et ton travail d’enquête (le parquet n’aime pas les dossiers recopiés)', humeur: (z) => ((z.dir && z.dir.parquet && z.dir.parquet.stade) || z.reputation < 40 ? -1 : z.reputation >= 60 ? 1 : 0) },
  syndicat: { nom: 'Le délégué syndical', suit: 'le moral de tes agents', humeur: (z) => ((z.dir && z.dir.mem && z.dir.mem.greve === 'arret') || z.moral < 45 ? -1 : z.moral >= 65 ? 1 : 0) },
  journaliste: { nom: 'La journaliste de La Voix du Delta', suit: 'tes interviews et la bonne ou mauvaise presse', humeur: (z) => { const j = z.dir && z.dir.mem && z.dir.mem.journaliste; return j === 'amie' ? 1 : j === 'hostile' ? -1 : 0; } },
};
const PALIERS = {
  gestion: ['des classeurs', 'une calculatrice et un écran de graphiques', 'un stylo plume doré et la plaque « budget en équilibre »'],
  commandement: ['une radio portative', 'la carte tactique de la ville au mur', 'la casquette de commandement et une console radio'],
  flair: ['une loupe', 'un petit tableau d’enquête avec ses fils rouges', 'le grand mur d’enquête et la boîte des dossiers classés'],
  diplomatie: ['un téléphone de bureau', 'la photo d’une poignée de main', 'les petits drapeaux et la plaque de jumelage'],
  proximite: ['une plante verte', 'le plan du quartier épinglé de cœurs', 'les dessins d’enfants et les fleurs'],
};
const MONTE = {
  gestion: 'finir la journée dans le vert, investir (formation, matériel, bâtiments), boucler la paperasse, passer la journée au bureau ou à la commune',
  commandement: 'tenir ses services, réussir incidents et urgences, mener un assaut en non-droit, gagner une affaire disputée, aller sur le terrain',
  flair: 'trouver des pièces d’enquête, identifier un auteur, résoudre un dossier noir, arrêter un suspect, passer la journée au parquet',
  diplomatie: 'prêter un renfort, prendre une relève, tenir un pacte, partager des pièces, rendre visite à un voisin',
  proximite: 'garder une satisfaction haute, absorber une vague de délinquance, éviter les imprévus, tenir une réunion de quartier',
};
export function renderBureau() {
  const st = S.state, me = myZone();
  const uid = S.bureauUid && st.zones[S.bureauUid] ? S.bureauUid : me && me.uid;
  const z = st.zones[uid], moi = me && uid === me.uid;
  const back = `<a href="${moi ? '#hp' : '#carte'}" class="backlink">${icon('back', 20)}<span>${moi ? 'Retour à l’HP' : 'Retour à la carte'}</span></a>`;
  if (!z || !z.chef) return `<main class="screen">${back}<section class="card"><p class="small muted" style="margin:0">Le bureau du chef ouvre avec la saison 2.</p></section></main>${tabbar('hp')}`;
  const p = (S.players && S.players[uid]) || (moi ? S.player : {}) || {};
  const chef = z.chef, niveaux = Object.fromEntries(IDS_COMPETENCES.map((c) => [c, niveauChef(chef, c)]));
  const g = gradeFor(z.ps || 0);
  const ets = ['Aspirant', 'Inspecteur', 'Inspecteur principal', 'Commissaire', 'Commissaire divisionnaire', 'Chef de corps'].indexOf(g.nom);
  const h = new Date().getHours();
  const svg = bureauSvg({ uid: `b${uid.slice(0, 4)}`, niveaux, portrait: p.chef && p.chef.portrait, grade: g.nom, etoiles: Math.max(0, ets), nom: p.pseudo || z.nom, devise: (p.chef && p.chef.devise) || '', couleur: z.couleur,
    medailles: chef.medailles || [], etats: chef.etats || [], talents: chef.talents || [],
    reseau: Object.entries(RESEAU).map(([id, R]) => ({ id, humeur: R.humeur(z) })), moment: h >= 8 && h < 18 ? 'jour' : h >= 18 && h < 20 ? 'crepuscule' : 'nuit', affiches: (z.affiches || []).length });
  const o = S.bureauObj || null;
  let info = '<p class="small muted" style="margin:0">Touche un objet du bureau pour voir ce qu’il raconte. Le bureau se remplit à mesure que ton chef progresse.</p>';
  if (o && COMPETENCES[o]) {
    const L = niveaux[o], tier = L >= 8 ? 3 : L >= 5 ? 2 : L >= 2 ? 1 : 0, suiv = [2, 5, 8].find((x) => x > L);
    info = `<span style="font-weight:700">${COMPETENCES[o].ico} ${esc(COMPETENCES[o].nom)} · niveau ${L}</span>
      <span class="pc-barre"><span style="width:${Math.max(3, Math.round(progresChef(chef, o) * 100))}%"></span></span>
      <span class="small">${tier ? `Sur le bureau : ${esc(PALIERS[o].slice(0, tier).join(', '))}.` : 'Rien encore sur le bureau pour cette compétence.'}${suiv ? ` Au niveau ${suiv} : ${esc(PALIERS[o][[2, 5, 8].indexOf(suiv)])}.` : ''}</span>
      <span class="tiny muted">Elle monte en : ${esc(MONTE[o])}.</span>`;
  } else if (o && o.startsWith('reseau-')) {
    const R = RESEAU[o.slice(7)], hm = R.humeur(z);
    info = `<span style="font-weight:700">${esc(R.nom)} · ${hm > 0 ? 'satisfait' : hm < 0 ? 'mécontent' : 'neutre'}</span><span class="small">Son humeur suit ${esc(R.suit)}.</span>`;
  } else if (o === 'medailles') info = (chef.medailles || []).length ? chef.medailles.map((m) => `<span class="small">🎖️ ${esc(m.nom)} · saison ${m.season}</span>`).join('') : '<span class="small muted">Une médaille par compétence récompense, à chaque fin de saison, la plus forte progression du district.</span>';
  else if (o === 'etats') info = (chef.etats || []).length ? chef.etats.slice().reverse().map((e) => `<span class="small">Saison ${e.season} · ${e.rang ? `${e.rang}${e.rang === 1 ? 'er' : 'e'} sur ${e.sur}` : 'non classé'}${e.moyenne != null ? ` · IPZ moyen ${String(e.moyenne).replace('.', ',')}` : ''}</span>`).join('') : '<span class="small muted">Chaque saison terminée accroche un certificat au mur.</span>';
  else if (o === 'talents') info = (chef.talents || []).length ? chef.talents.map((t) => `<span class="small"><b>${esc(TALENT[t].nom)}</b> · ${esc(TALENT[t].texte)}</span>`).join('') : '<span class="small muted">Les talents équipés sont cousus sur la veste. Le premier se débloque au niveau 2 d’une compétence.</span>';
  else if (o === 'affiches') info = `<span class="small">${(z.affiches || []).length} suspect${(z.affiches || []).length > 1 ? 's' : ''} arrêté${(z.affiches || []).length > 1 ? 's' : ''}.</span>`;
  else if (o === 'portrait' || o === 'nom') info = `<span style="font-weight:700">${esc(p.pseudo || z.nom)} · ${esc(g.nom)}</span><span class="small">${chef.parcours && PARCOURS[chef.parcours] ? esc(PARCOURS[chef.parcours].nom) : ''}${p.chef && p.chef.devise ? ` · « ${esc(p.chef.devise)} »` : ''}</span>`;
  return `<main class="screen">${back}
    <div class="col" style="gap:2px"><span class="kicker">Bureau du chef</span><h1 class="big" style="margin:0">${moi ? 'Ton bureau' : `Le bureau de ${esc(p.pseudo || z.nom)}`}</h1><span class="small muted">${zoneName(z)}</span></div>
    <section class="card bureau-scene" style="padding:0;overflow:hidden" data-bureau>${svg}</section>
    <section class="card" style="gap:6px" aria-live="polite">${info}</section>
    ${ficheChefHtml(uid, { moi })}
  </main>${tabbar('hp')}`;
}
