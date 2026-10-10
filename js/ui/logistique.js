// Logistique (bâtiments de la zone) et détail du budget : ce qui coûte, ce qui rapporte.
import { reglesV2 } from '../engine/regles.js';
import { PACTES, pactesDe, partenaire, pacteImpossible } from '../engine/pactes.js';
import { ficheChefHtml, portraitChef } from './chef.js';
import { titresDefi } from './defis.js';
import { S, esc, icon, fmt1, myZone } from './common.js';
import { gradeFor, LOTS, BATIMENTS, BATIMENT_MAX, INFRAS, ENTRETIEN_ANNEXE, TRAVAUX_TOURS, PEREQUATION, SUBSIDE, DEPENSES, USURE, PREPA, REGLES, nbAnnexes, emplacementsAnnexes } from '../engine/constants.js';
import { parcVehicules, cabossesChoisis } from '../engine/parc.js';
import { DECOR, SKINS, decorValide, decorDebloque, conditionDecor, decorCompte, skinsValides, skinDe, earlyBirdEligible } from '../engine/decor.js';
import { coutCarrosserie } from '../engine/sinistres.js';
import { sceneHp, vehiculeSvg } from './scene-hp.js';
import { fiabilite } from '../engine/fipa.js';
import { siteDe } from '../engine/sites.js';
import { iconeSite } from './plan.js';
import { moyenneIpz, operationActive, fraisFixes, coutDepenses, coutDecision, decisionImpossible, capaciteAgents, capaciteVehicules, effectifPrevu, perequation, subsideAgents } from '../engine/zone.js';
import { coutDemarche, PRIME_LABELS } from '../engine/enquete.js';
import { portraitSuspect } from './portrait.js';
import { SERVICE_LABELS, scoreRevenu, BUDGET_IPZ, IPZ_POIDS } from '../engine/constants.js';
import { vitesseCombi, MODELES, modeleDe, prixRevente, vitesseVehicule, rendementFlotte, RENDEMENT } from '../engine/flotte.js';
import { aideBtn } from './aide.js';
import { comparatifModeles } from './modeles.js';
import { PERIL, absT } from '../engine/rivalites.js';
import { estimations } from './ordres.js';

const k = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt1(Math.abs(v))} k€`;

/** Prévision de ce soir, à partir du brouillon d'ordres. */
export function previsionBudget() {
  const z = myZone(), st = S.state, d = S.draft || {};
  let amendes = 0;
  try { amendes = estimations().amendes; } catch (e) { /* écran sans brouillon */ }
  const ff = fraisFixes(z, st, { amendes, rythme: d.rythme || 'normal' });
  const choix = [];
  const dep = coutDepenses(d.depenses || {}, z);
  if (dep) choix.push({ l: 'Dépenses du jour', v: -dep });
  if (d.decision && !decisionImpossible(z, d.decision, st.turn)) choix.push({ l: 'Grande décision', v: -coutDecision(z, d.decision) });
  const dem = (d.demarches || []).reduce((s, x) => s + coutDemarche(st, z.uid, x), 0);
  if (dem) choix.push({ l: 'Démarches d’enquête', v: -dem });
  if (d.aide && d.aide.cible && d.aide.budget) choix.push({ l: 'Coup de main envoyé', v: -d.aide.budget });
  if (d.offre && st.enchere && d.offre.id === st.enchere.id && d.offre.montant) choix.push({ l: 'Offre à la salle des ventes (si tu l’emportes)', v: -d.offre.montant });
  const totalChoix = choix.reduce((s, x) => s + x.v, 0);
  return { fixes: ff, choix, totalChoix, solde: ff.total + totalChoix, apres: z.budget + ff.total + totalChoix };
}

function lignes(l) {
  return l.map((x) => `<div class="between compta"><span>${esc(x.l)}</span><span class="mono ${x.v >= 0 ? 'ok' : 'bad'}">${k(x.v)}</span></div>`).join('');
}

/** Fenêtre « Détail du budget » (clic sur la tuile Budget). */
export function ouvrirBudget() {
  const z = myZone();
  const p = previsionBudget();
  const recettes = p.fixes.lignes.filter((x) => x.v > 0 || x.k === 'confiance'), frais = p.fixes.lignes.filter((x) => x.v < 0 && x.k !== 'confiance');
  // Tendance : sur la base des seuls frais fixes (sans amendes exceptionnelles ni dépenses).
  const net = p.fixes.total;
  const tours = net < 0 ? Math.max(0, Math.ceil((z.budget - PERIL.budget) / -net)) : null;
  const c = z.compta;
  const html = `
    <div class="between" style="align-items:flex-start"><h2 id="aide-titre" class="aide-titre">Budget de la zone</h2>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <div class="between"><span class="small muted">Aujourd’hui</span><span class="mono" style="font-size:20px;font-weight:700">${fmt1(z.budget)} k€</span></div>
    ${(() => {
      const rv = (z.ipzDetail && z.ipzDetail.revenus) || z.revenus || [], sc = z.ipzComp ? z.ipzComp.budget : scoreRevenu(rv);
      const moy = rv.length ? rv.reduce((a, x) => a + x, 0) / rv.length : 0;
      return `<div class="card tight" style="gap:4px;padding:8px 10px"><div class="between"><span class="small"><strong>Dans l’IPZ</strong> · ${Math.round(IPZ_POIDS.budget * 100)} %</span><span class="row" style="gap:6px"><span class="mono" style="font-weight:700">${fmt1(sc)}/100</span>${aideBtn('budgetIpz', 'Comment est calculé le score du budget')}</span></div>
        <span class="tiny muted">Score = ${BUDGET_IPZ.revenu.base} + ${BUDGET_IPZ.revenu.parK} × revenu moyen des ${BUDGET_IPZ.jours} derniers jours${rv.length ? ` (${fmt1(moy)} k€ par jour)` : ''}, entre 0 et 100 ; 100 dès 15 000 € par jour. Tes achats et dépenses du jour ne comptent pas : investir ne coûte rien à l’IPZ.</span></div>`;
    })()}
    <h3 class="compta-t">Chaque jour, quoi qu’il arrive</h3>
    ${lignes(recettes)}${lignes(frais)}
    <div class="between compta total"><span>Solde fixe par jour</span><span class="mono ${net >= 0 ? 'ok' : 'bad'}">${k(net)}</span></div>
    ${net < 0 ? `<p class="small bad" style="margin:0">À ce rythme, ta zone passe en péril (sous −${Math.abs(PERIL.budget)} k€) dans environ ${tours} tour${tours > 1 ? 's' : ''}. Réduis tes effectifs, tes dépenses ou le rythme.</p>` : `<p class="tiny muted" style="margin:0">Positif : ta zone vit de ses recettes. Les dépenses ci-dessous puisent dans ta réserve.</p>`}
    <h3 class="compta-t">Tes choix de ce soir</h3>
    ${p.choix.length ? lignes(p.choix) : '<p class="tiny muted" style="margin:0">Aucune dépense prévue dans tes ordres.</p>'}
    <div class="between compta total"><span>Budget estimé après 20:00</span><span class="mono ${p.apres >= 0 ? '' : 'bad'}" style="font-weight:700">${fmt1(p.apres)} k€</span></div>
    <p class="tiny muted" style="margin:0">Hors imprévus, primes, FIPA et Conseil. Une dépense du jour est refusée si le budget ne suffit pas au moment de la payer.</p>
    ${c && c.lignes ? `<h3 class="compta-t">Relevé du dernier tour (tour ${c.tour})</h3>
      ${lignes(c.lignes)}
      <div class="between compta total"><span>${fmt1(c.debut)} k€ → ${fmt1(c.fin)} k€</span><span class="mono ${c.fin - c.debut >= 0 ? 'ok' : 'bad'}">${k(Math.round((c.fin - c.debut) * 10) / 10)}</span></div>` : ''}
    <p class="tiny muted" style="margin:0">Budget négatif deux tours de suite : Inspection générale (−5 k€). Sous −${Math.abs(PERIL.budget)} k€ : zone en péril ; sans redressement en ${PERIL.tours} résolutions, tutelle, puis faillite.</p>
    <a class="small" href="#guide-zone" data-close>Règles du budget dans le guide</a>`;
  ouvrirPanneau(html);
}

/** Petit panneau en haut de l'écran (même présentation que les aides « ? »). */
export function ouvrirPanneau(html) {
  document.querySelector('.aide-wrap')?.remove();
  const retour = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'aide-wrap';
  wrap.innerHTML = `<div class="aide card" role="dialog" aria-modal="true" aria-labelledby="aide-titre">${html}</div>`;
  const fermer = () => { wrap.remove(); document.removeEventListener('keydown', echap); if (retour && retour.focus) retour.focus(); };
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) { fermer(); return; }
    const c = e.target.closest('[data-close]');
    if (c) { e.stopPropagation(); if (c.tagName !== 'A') e.preventDefault(); fermer(); }
  });
  document.addEventListener('keydown', echap);
  document.body.appendChild(wrap);
  (wrap.querySelector('[data-close]') || wrap.querySelector('button'))?.focus();
}

/** Paramètres de l'illustration pour n'importe quelle zone (la sienne ou celle d'un voisin). */
export function sceneZone(z, st, decor = z.decor, skins = skinsValides(z, z.skinsChoix), extra = {}) {
  const T = st.turn;
  const parc = parcVehicules(z, T);
  return sceneHp({
    nom: z.nom, b: z.batiments.bureaux, g: z.batiments.garage,
    devant: parc.filter((v) => v.etat !== 'atelier').sort((a, c) => (c.etat === 'cabosse') - (a.etat === 'cabosse')).map((v) => ({ type: v.type, cabosse: v.etat === 'cabosse' })),
    travaux: z.travaux ? z.travaux.batiment : null, atelier: parc.some((v) => v.etat === 'atelier'),
    infra: z.infra || {}, lots: z.lots || [], decor, skins,
    drapeau: { couleur: z.couleur, berne: z.moral < 35 },
    file: z.satisfaction < 35,
    renforce: !!(z.dernierOrdre && z.dernierOrdre.rythme === 'renforce'),
    imprevu: z.scene && z.scene.tour >= T - 1 ? z.scene : {},
    operation: !!operationActive(z, T),
    champion: estChampion(z, st),
    plaques: z.plaques || [],
    fondateur: !!z.fondateur,
    affiches: z.affiches || [],
    trace: z.trace && z.trace.tour >= T - 1 && st.zones[z.trace.auteur] ? { type: z.trace.type, couleur: st.zones[z.trace.auteur].couleur } : null,
    poste: (() => { const p = (st.postes || []).find((x) => x.cible === z.uid && x.jusqua >= absT(st)); return p && st.zones[p.auteur] ? { couleur: st.zones[p.auteur].couleur } : null; })(),
    ...extra,
  });
}

/** La zone est-elle championne de la semaine (étoile pendant 7 jours) ? */
export function estChampion(z, st) {
  const c = st.champion;
  if (!c || c.uid !== z.uid) return false;
  return (c.season === st.season && st.turn <= c.tour + 7) || (c.season === st.season - 1 && st.turn <= 7);
}

/** Skins du joueur : ceux de sa zone, plus celui gagné à la roulette (visible tout de suite). */
export function mesSkins(z) {
  const own = new Set(z.skins || []);
  if (S.player && S.player.earlyBird && earlyBirdEligible(z, S.state) && skinDe(S.player.earlyBird.skin)) own.add(S.player.earlyBird.skin);
  return { possedes: [...own], choix: skinsValides({ skins: [...own] }, (S.player && S.player.skinsChoix) || z.skinsChoix) };
}

/** Personnalisation choisie par le joueur (tout de suite visible chez lui, recopiée dans la partie à 20:00). */
export function monDecor(z) { return decorValide(z, (S.player && S.player.decor) || z.decor); }
export const monDecorPublic = monDecor;

/** Illustration d'une zone pour la vitrine de la Carte (la sienne avec ses choix en cours). */
export function sceneVignette(z) {
  const moi = S.user && z.uid === S.user.uid;
  return moi ? sceneZone(z, S.state, monDecor(z), mesSkins(z).choix) : sceneZone(z, S.state, decorValide(z, z.decor));
}

/** Illustration cliquable de l'HP (dans la carte « Ma zone ») : ouvre la fiche logistique. */
export function sceneCarteHtml(extra = {}) {
  const z = myZone(), T = S.state.turn;
  const parc = parcVehicules(z, T);
  const cab = parc.filter((v) => v.etat === 'cabosse').length;
  const b = z.batiments;
  // Animation de 20:00 : à la première ouverture après une résolution, les équipes sortent en patrouille.
  const cle = `mazp-anim-${S.state.seed || ''}-${S.state.season}-${T}`;
  let anim = false;
  try { if (T > 1 && !localStorage.getItem(cle)) { localStorage.setItem(cle, '1'); S.animFin = Date.now() + 6500; } } catch (e) { /* pas de stockage */ }
  if (S.animFin && Date.now() < S.animFin) anim = true;
  return `<button type="button" class="scene-btn${anim ? ' anim-soir' : ''}" data-action="logistique" aria-label="Mon hôtel de police : bâtiments et véhicules">
    ${sceneZone(z, S.state, monDecor(z), mesSkins(z).choix, extra)}
    <span class="scene-leg"><span>Bâtiment niv. ${b.bureaux} · Garage niv. ${b.garage}${z.travaux ? ' · travaux' : ''}</span>
      ${cab ? `<span class="scene-pastille">${cab} cabossé${cab > 1 ? 's' : ''}</span>` : ''}${icon('chevron', 14)}</span>
  </button>`;
}

/** Tableau des avis de recherche : les malfrats arrêtés par la zone (mise à prix), tamponnés « ARRÊTÉ ». */
export function affichesHtml(z, { moi = false } = {}) {
  const l = (z.affiches || []).slice().reverse();
  if (!l.length) return moi ? '<p class="tiny muted" style="margin:0">Tableau des arrestations : arrête l’auteur d’une affaire pour y accrocher ton premier avis de recherche.</p>' : '';
  const primeTxt = (p) => {
    if (!p) return 'prime à choisir';
    const [k, s] = p.split(':');
    if (k === 'formation') return `${PRIME_LABELS.formation.ico} formation ${(SERVICE_LABELS[s] || s).toLowerCase()}`;
    return PRIME_LABELS[k] ? `${PRIME_LABELS[k].ico} ${k === 'confiscation' ? 'avoirs confisqués' : 'renfort fédéral'}` : '';
  };
  return `<section class="affiches" aria-label="Tableau des arrestations">
    <span class="affiches-t">Tableau des arrestations · ${l.length}</span>
    <div class="affiches-g">${l.map((a, k) => `<figure class="affiche" style="--rot:${[-2.5, 1.8, -1.2, 2.4][k % 4]}deg">
      <span class="affiche-pin" aria-hidden="true"></span>
      <span class="affiche-h">Avis de recherche</span>
      <span class="affiche-photo">${portraitSuspect({ nom: a.nom, f: a.f, age: a.age, role: a.role, photo: a.photo }, a.i, 'affiche-face')}</span>
      <strong class="affiche-nom">${esc(a.nom)}</strong>
      <span class="affiche-aff">« ${esc(a.titre)} »</span>
      <span class="affiche-pied">Saison ${a.season}${a.tour != null ? ` · jour ${a.tour}` : ''}${a.prime !== undefined ? ` · ${esc(primeTxt(a.prime))}` : ''}</span>
      <span class="affiche-tampon" aria-label="Arrêté${a.f ? 'e' : ''}">Arrêté${a.f ? 'e' : ''}</span>
    </figure>`).join('')}</div>
  </section>`;
}

/** Hôtel de police d'une autre zone (depuis la Carte ou le classement). */
/** Dans la fiche d'un collègue : le pacte en cours avec lui, ou un raccourci pour lui en proposer un. */
function pacteVoisinHtml(st, uid) {
  const me = S.user && S.user.uid;
  const p = pactesDe(st, me).find((x) => partenaire(x, me) === uid);
  if (p) return `<a class="pacte-voisin" href="#pactes" data-close><span aria-hidden="true">🤝</span><span class="col grow" style="gap:0"><b>${esc(PACTES[p.type].nom)}</b><span class="tiny muted">${p.etape === 'actif' ? 'pacte en cours avec cette zone' : 'proposé, en attente'}</span></span>${icon('chevron', 16)}</a>`;
  const r = pacteImpossible(st, me, uid);
  return `<button type="button" class="btn small primary block" data-action="pacte-avec" data-u="${esc(uid)}" ${r ? 'disabled' : ''}>🤝 Proposer un pacte${r ? ` · ${esc(r)}` : ''}</button>`;
}

export function ouvrirHpVoisin(uid) {
  const st = S.state, z = st.zones[uid];
  if (!z) return;
  const moi = z.uid === (S.user && S.user.uid);
  const d = moi ? monDecor(z) : decorValide(z, z.decor);
  const annexes = Object.entries(INFRAS).filter(([id]) => z.infra && z.infra[id]).map(([, i]) => i.nom);
  const lots = (z.lots || []).map((l) => LOTS[l.id] && LOTS[l.id].nom).filter(Boolean);
  ouvrirPanneau(`
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="mono tiny" style="color:var(--blue-soft)">ZP ${esc(z.code)}</span><h2 id="aide-titre" class="aide-titre" style="margin:0">${esc(z.nom)}</h2>
      <span class="tiny muted">${moi ? 'Ta zone' : esc((S.players && S.players[uid] && S.players[uid].pseudo) || 'Chef de zone')} · ${esc(gradeFor(z.ps || 0).nom)} · ${(z.trophees || []).length} trophée${(z.trophees || []).length > 1 ? 's' : ''}</span></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <div class="scene-voisin">${moi ? sceneZone(z, st, d, mesSkins(z).choix) : sceneZone(z, st, d)}</div>
    ${affichesHtml(z, { moi })}
    ${!moi && reglesV2(st) ? pacteVoisinHtml(st, uid) : ''}
    ${z.chef ? `<button type="button" class="btn small outline block" data-action="bureau-ouvrir" data-u="${esc(uid)}">${portraitChef(uid, 22, { galons: false })} Voir son chef de corps</button>` : ''}
    ${titresDefi(uid).length ? `<p class="small" style="margin:0">${titresDefi(uid).map((t) => `🏆 <strong>${esc(t.titre)}</strong> <span class="muted">(défi, niv. ${t.niveau})</span>`).join(' · ')}</p>` : ''}
    <div class="bats hp-logis">
      <div class="bat"><span class="tiny muted">Bâtiment</span><span style="font-weight:700">Niveau ${z.batiments.bureaux}</span></div>
      <div class="bat"><span class="tiny muted">Garage</span><span style="font-weight:700">Niveau ${z.batiments.garage} · ${z.vehicules} véhicule${z.vehicules > 1 ? 's' : ''}</span></div>
    </div>
    <p class="small" style="margin:0"><span class="muted">Annexes :</span> ${annexes.length ? esc(annexes.join(', ')) : 'aucune'}${lots.length ? `<br><span class="muted">Lots :</span> ${esc(lots.join(', '))}` : ''}</p>
    ${estChampion(z, st) ? '<p class="small" style="margin:0;color:var(--amber)">★ Champion de la semaine</p>' : ''}
    ${(z.plaques || []).length ? `<p class="small" style="margin:0"><span class="muted">Podium :</span> ${z.plaques.map((pl) => `${pl.rang === 1 ? '1re' : `${pl.rang}e`} place saison ${pl.season}`).join(', ')}</p>` : ''}
    <div class="between small"><span class="muted">IPZ moyen</span><span class="mono">${fmt1(moyenneIpz(z))}</span></div>
    <div class="between small"><span class="muted">FIPA</span><span>${esc(fiabilite(z))}</span></div>
    ${siteDe(z) ? `<div class="between small"><span class="muted">Site sensible</span><span class="row" style="gap:4px;color:${siteDe(z).couleur}">${iconeSite(siteDe(z).id, siteDe(z).couleur, 14)}${esc(siteDe(z).nom)}</span></div>` : ''}
    ${z.peril || z.tutelle ? `<p class="small bad" style="margin:0">${z.peril ? 'Zone en péril : un coup de main rapporte de la réputation.' : 'Zone sous tutelle.'}</p>` : ''}
    <p class="tiny muted" style="margin:0">Façade ${esc(DECOR.facade.options[d.facade].nom.toLowerCase())} · néon ${esc(DECOR.neon.options[d.neon].nom.toLowerCase())}${d.abords !== 'aucun' ? ` · ${esc(DECOR.abords.options[d.abords].nom.toLowerCase())}` : ''}</p>
    ${moi ? '' : `<button type="button" class="btn block" data-action="ecrire-a" data-uid="${esc(uid)}">✉ Écrire à ${esc(z.nom)}</button>`}`);
}

/** Fenêtre « Personnaliser mon commissariat ». */
export function ouvrirDecor() {
  const z = myZone();
  const d = monDecor(z);
  const { n, total } = decorCompte(z);
  const groupes = Object.entries(DECOR).map(([cat, C]) => `<div class="col" style="gap:6px"><span class="tiny muted">${esc(C.titre)}</span><div class="decor-opts">
    ${Object.entries(C.options).map(([id, o]) => {
      const ok = decorDebloque(z, o), choisi = d[cat] === id;
      return `<button type="button" class="decor-opt${choisi ? ' on' : ''}${ok ? '' : ' verrou'}" data-action="decor-choix" data-cat="${cat}" data-id="${id}" ${ok ? '' : 'aria-disabled="true"'} aria-pressed="${choisi}">
        ${cat === 'neon' ? `<i class="pastille" style="background:${o.trait}"></i>` : cat === 'facade' ? `<i class="pastille" style="background:${o.jour[0]}"></i>` : ''}<span>${esc(o.nom)}</span>${ok ? '' : `<span class="cond">${icon('lock', 11)} ${esc(conditionDecor(o))}</span>`}</button>`;
    }).join('')}</div></div>`).join('');
  ouvrirPanneau(`<div data-decor class="col" style="gap:10px">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><h2 id="aide-titre" class="aide-titre" style="margin:0">Mon commissariat</h2><span class="tiny muted">${n} élément${n > 1 ? 's' : ''} débloqué${n > 1 ? 's' : ''} sur ${total}</span></div>
      <button class="iconbtn" data-action="logistique" aria-label="Retour" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">‹</button></div>
    <div class="scene-voisin">${sceneZone(z, S.state, d, mesSkins(z).choix, S.player && S.player.hpCiel ? { moment: S.player.hpCiel } : {})}</div>
    ${(() => {
      const { possedes, choix } = mesSkins(z);
      if (!possedes.length) return '';
      return `<div class="col" style="gap:6px"><span class="tiny" style="color:var(--amber)">${icon('star', 12)} Mes skins</span><div class="decor-opts">${possedes.map((k) => {
        const sk = skinDe(k); if (!sk) return '';
        const o = SKINS[sk.cat].options[sk.id], on = choix[sk.cat] === sk.id;
        return `<button type="button" class="decor-opt${on ? ' on' : ''}" data-action="skin-choix" data-cat="${sk.cat}" data-id="${sk.id}" aria-pressed="${on}"><span>${esc(o.nom)}</span><span class="cond">${esc(SKINS[sk.cat].titre)} · ${on ? 'équipé, touche pour l’enlever' : 'touche pour l’équiper'}</span></button>`;
      }).join('')}</div></div>`;
    })()}
    ${!reglesV2(S.state) ? '' : (() => {
      const c = (S.player && S.player.hpCiel) || '';
      const opt = (v, l) => `<button type="button" class="decor-opt${c === v ? ' on' : ''}" data-action="hp-ciel" data-v="${v}" aria-pressed="${c === v}"><span>${l}</span></button>`;
      return `<div class="col" style="gap:6px"><span class="tiny muted">Ciel de mon HP</span><div class="decor-opts">${opt('', 'Heure réelle')}${opt('jour', 'Toujours le jour')}${opt('crepuscule', 'Toujours le soir')}${opt('nuit', 'Toujours la nuit')}</div></div>`;
    })()}
    ${groupes}
    <p class="tiny muted" style="margin:0">Les éléments se débloquent avec ton grade et tes trophées. Les autres chefs de zone voient ton commissariat depuis la Carte et le classement, à partir de 20:00.</p>
  </div>`);
}

/** Fiche « Mon hôtel de police » : bâtiments et annexes, avec ce qu'ils donnent aujourd'hui et au niveau suivant. */
export function ouvrirLogistique() {
  ouvrirPanneau(`<div data-logis>${logistiqueCorps()}</div>`);
}
/** Fiche « Parc automobile » (tuile Véhicules de l'HP) : les véhicules un par un, état et révision. */
export function ouvrirParc() {
  ouvrirPanneau(`<div data-parc>${parcCorps()}</div>`);
}
/** Si une fiche logistique est ouverte, la redessine (après un agrandissement ou une réparation). */
export function rafraichirLogistique() {
  const el = document.querySelector('.aide-wrap [data-logis]');
  if (el) el.innerHTML = logistiqueCorps();
  const p = document.querySelector('.aide-wrap [data-parc]');
  if (p) p.innerHTML = parcCorps();
}

const pips = (n) => `<span class="niv" aria-label="Niveau ${n} sur ${BATIMENT_MAX}">${Array.from({ length: BATIMENT_MAX }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

const ICO_ANNEXE = { sport: '🏋️', logiciel: '💻', anpr: '📷', antenne: '🏘️', garage: '🔧', audition: '🎙️', tir: '🎯', cachots: '🔐', drone: '🛸', crise: '🚨', sapv: '🤝' };
const COURT_ANNEXE = { sport: 'sport', logiciel: 'logiciel', anpr: 'plaques', antenne: 'antenne', garage: 'atelier', audition: 'audition', tir: 'tir', cachots: 'cellules', drone: 'drone', crise: 'crise', sapv: 'victimes' };

/** Saison 2 : le chantier — niveaux en barres (le prochain en pointillé), annexes en tuiles à toucher. */
function logistiqueV2() {
  const z = myZone(), st = S.state, T = st.turn, d = S.draft || {};
  const b = z.batiments;
  const annexes = Object.entries(INFRAS).filter(([id]) => z.infra[id]);
  const entretienTotal = Object.entries(BATIMENTS).reduce((s2, [id, B]) => s2 + B.entretien(b[id]), 0) + annexes.length * ENTRETIEN_ANNEXE;
  const occupation = { bureaux: [effectifPrevu(z), capaciteAgents(z), 'agents', '🏢', 'Bâtiment'], garage: [z.vehicules, capaciteVehicules(z), 'véhicules', '🚓', 'Garage'] };
  const bat = Object.entries(BATIMENTS).map(([id, B]) => {
    const n = b[id], [occ, cap, unite, ic, nom] = occupation[id];
    const dec = { type: 'agrandir', batiment: id };
    const choisi = d.decision && d.decision.type === 'agrandir' && d.decision.batiment === id;
    const refus = decisionImpossible(z, dec, T);
    const enTravaux = z.travaux && z.travaux.batiment === id;
    const max = n >= BATIMENT_MAX;
    const trophee = !max && id === 'bureaux' && n + 1 === 4 && !(z.trophees || []).some((t) => t.id === 'batisseur');
    const piste = Array.from({ length: BATIMENT_MAX }, (_, i) => `<i class="${i < n ? 'ok' : i === n && !max ? (enTravaux || choisi ? 'prochain prevu' : 'prochain') : ''}">${i + 1}</i>`).join('');
    return `<div class="chantier">
      <div class="between"><b>${ic} ${nom}</b><span class="tiny muted" title="effectif actuel · places dans le bâtiment"><span class="mono ${occ >= cap ? 'warn' : ''}">${occ}</span> ${unite} · ${cap} places</span></div>
      <div class="chantier-niv" aria-label="Niveau ${n} sur ${BATIMENT_MAX}">${piste}</div>
      ${max ? '<span class="tiny ok" style="font-weight:600">Niveau maximum</span>'
        : `<span class="small">Niveau ${n + 1} : <span class="ok" style="font-weight:700">+${B.capacite(n + 1) - cap} places</span> (${B.capacite(n + 1)} ${unite} max) · entretien +${fmt1(B.entretien(n + 1) - B.entretien(n))} k€/tour${trophee ? ' · <span class="ok">trophée Bâtisseur</span>' : ''}</span>`}
      ${enTravaux ? `<span class="tiny warn" style="font-weight:600">Travaux : niveau ${n + 1} au tour ${z.travaux.fin}</span>`
        : max ? '' : `<button type="button" class="btn small block ${choisi ? 'primary' : 'agr'}" data-action="agrandir" data-b="${id}" ${refus && !choisi ? 'disabled' : ''}>${choisi ? '✓ Prévu ce soir' : `Agrandir · ${fmt1(B.coutAgrandir(n))} k€`}</button>${refus && !choisi ? `<span class="tiny muted">${esc(refus)}</span>` : ''}`}
    </div>`;
  }).join('');
  const choixDec = d.decision && d.decision.type === 'construire' ? d.decision.infra : null;
  const ids = Object.keys(INFRAS).filter((id) => !INFRAS[id].v2 || REGLES.v2);
  const sel = ids.includes(S.annexeSel) ? S.annexeSel : null;
  const tuiles = ids.map((id) => { const fait = !!z.infra[id], prevu = choixDec === id;
    return `<button type="button" class="annexe2 ${fait ? 'faite' : ''} ${prevu ? 'prevue' : ''} ${sel === id ? 'sel' : ''}" data-action="annexe-voir" data-id="${id}" aria-pressed="${sel === id}" aria-label="${esc(INFRAS[id].nom)}${fait ? ', construite' : prevu ? ', prévue ce soir' : ''}"><span aria-hidden="true">${ICO_ANNEXE[id] || '🏗️'}</span><small>${esc(COURT_ANNEXE[id] || id)}</small>${fait ? '<i>✓</i>' : ''}</button>`; }).join('');
  let fiche = '';
  if (sel) {
    const i = INFRAS[sel], fait = !!z.infra[sel], prevu = choixDec === sel;
    const refus = fait ? null : decisionImpossible(z, { type: 'construire', infra: sel }, T);
    fiche = `<div class="annexe2-fiche"><div class="between" style="gap:8px"><b>${ICO_ANNEXE[sel] || ''} ${esc(i.nom)}</b><span class="tiny ${fait ? 'ok' : 'muted'}">${fait ? '✓ construite' : `${i.cout} k€`}</span></div>
      <span class="small">${fait ? 'Te donne : ' : 'Donnerait : '}${esc(i.effet)}</span>
      ${fait ? '' : `<button type="button" class="btn small block ${prevu ? 'primary' : 'agr'}" data-action="annexe-construire" data-id="${sel}" ${refus && !prevu ? 'disabled' : ''}>${prevu ? '✓ Prévue ce soir (grande décision)' : `Construire ce soir · ${i.cout} k€`}</button>${refus && !prevu ? `<span class="tiny muted">${esc(refus)}</span>` : ''}`}</div>`;
  }
  const parc = parcVehicules(z, T);
  const enService = parc.filter((v) => v.etat === 'service').length;
  const cab = parc.filter((v) => v.etat === 'cabosse').length;
  const peq = perequation(z, st);
  return `<div class="col hp-logis logis2" style="gap:12px">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><h2 id="aide-titre" class="aide-titre" style="margin:0">Mon hôtel de police</h2>
      <span class="mono tiny muted">entretien ${fmt1(entretienTotal)} k€ par tour</span></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    ${bat}
    <div class="between"><span class="logis2-k">Annexes · ${nbAnnexes(z)} sur ${emplacementsAnnexes(z)} places</span><span class="tiny muted">touche pour le détail</span></div>
    <div class="annexes2">${tuiles}</div>
    ${fiche}
    <button type="button" class="list-row" data-action="parc" style="width:100%;text-align:left"><span class="col grow" style="gap:1px"><span style="font-weight:600">🚗 Parc automobile</span>
      <span class="tiny muted">${enService} sur ${z.vehicules} en service · état ${Math.round(100 - z.usure)} %${cab ? ` · ${cab} cabossé${cab > 1 ? 's' : ''}` : ''}</span></span>${icon('chevron', 16)}</button>
    <button type="button" class="btn small block decor-btn" data-action="decor">${icon('star', 16)} Personnaliser mon commissariat <span class="tiny muted">${decorCompte(z).n} / ${decorCompte(z).total}</span></button>
    ${affichesHtml(z, { moi: true })}
    ${z.agents > SUBSIDE.seuil ? `<p class="tiny ok" style="margin:0">Subside communal : +${fmt1(subsideAgents(z))} k€ par tour pour tes ${z.agents - SUBSIDE.seuil} agents au-delà de ${SUBSIDE.seuil}.</p>` : ''}
    ${peq ? `<p class="tiny ok" style="margin:0">Péréquation : +${fmt1(PEREQUATION.montant)} k€ par tour (zone moins équipée que la moyenne).</p>` : ''}
    <p class="tiny muted" style="margin:0">Agrandir et construire sont la grande décision du jour : payés à 20:00, pense à valider tes ordres.</p>
  </div>`;
}

function logistiqueCorps() {
  if (REGLES.v2) return logistiqueV2();
  const z = myZone(), st = S.state, T = st.turn, d = S.draft || {};
  const b = z.batiments;
  const annexes = Object.entries(INFRAS).filter(([id]) => z.infra[id]);
  const entretienTotal = Object.entries(BATIMENTS).reduce((s, [id, B]) => s + B.entretien(b[id]), 0) + annexes.length * ENTRETIEN_ANNEXE;
  const occupation = { bureaux: [effectifPrevu(z), capaciteAgents(z), 'agents'], garage: [z.vehicules, capaciteVehicules(z), 'véhicules'] };

  const bat = Object.entries(BATIMENTS).map(([id, B]) => {
    const n = b[id];
    const dec = { type: 'agrandir', batiment: id };
    const choisi = d.decision && d.decision.type === 'agrandir' && d.decision.batiment === id;
    const refus = decisionImpossible(z, dec, T);
    const enTravaux = z.travaux && z.travaux.batiment === id;
    const [occ, cap, unite] = occupation[id];
    const max = n >= BATIMENT_MAX;
    const plus = (txt, cls = 'ok') => (max ? '' : ` <span class="${cls}" style="font-weight:600">${txt}</span>`);
    const trophee = !max && id === 'bureaux' && n + 1 === 4 && !(z.trophees || []).some((t) => t.id === 'batisseur');
    return `<div class="bat">
      <div class="between"><span style="font-weight:700;font-size:13px">${id === 'bureaux' ? 'Bâtiment' : 'Garage'}</span>${pips(n)}</div>
      <div class="bat-niv"><span class="tiny muted">Niveau ${n}${plus('+1')}</span>
        <span class="small"><span class="mono ${occ >= cap ? 'warn' : ''}">${occ}</span> ${unite}<span class="muted"> · </span>${cap} places${plus(`+${B.capacite(n + 1) - cap}`)}</span>
        <span class="tiny muted">entretien ${fmt1(B.entretien(n))} k€${plus(`+${fmt1(B.entretien(n + 1) - B.entretien(n))}`, 'muted')}</span>
        ${trophee ? '<span class="tiny ok" style="font-weight:600">+ trophée Bâtisseur</span>' : ''}</div>
      ${enTravaux ? `<span class="tiny warn" style="font-weight:600">Travaux : niveau ${n + 1} au tour ${z.travaux.fin}</span>`
        : n >= BATIMENT_MAX ? '<span class="tiny ok" style="font-weight:600">Niveau maximum</span>'
        : `<button type="button" class="btn small block ${choisi ? 'primary' : 'agr'}" data-action="agrandir" data-b="${id}" ${refus && !choisi ? 'disabled' : ''}>
            ${choisi ? '✓ Prévu ce soir' : `Agrandir · ${fmt1(B.coutAgrandir(n))} k€`}</button>
          ${refus && !choisi ? `<span class="tiny muted">${esc(refus)}</span>` : ''}`}
    </div>`;
  }).join('');

  const choixDec = d.decision && d.decision.type === 'construire' ? d.decision.infra : null;
  const carteAnnexe = ([id, i]) => {
    const fait = !!z.infra[id], prevu = choixDec === id;
    return `<div class="annexe${fait ? ' faite' : ''}">
      <div class="between" style="gap:8px"><span style="font-weight:600;font-size:13px">${esc(i.nom)}</span>
        <span class="tiny ${fait ? 'ok' : prevu ? '' : 'muted'}" style="white-space:nowrap;${prevu ? 'color:var(--amber)' : ''}">${fait ? '✓ construite' : prevu ? 'prévue ce soir' : `${i.cout} k€`}</span></div>
      <span class="tiny ${fait ? '' : 'muted'}">${fait ? 'Te donne : ' : 'Donnerait : '}${esc(i.effet)}</span></div>`;
  };
  const aFaire = Object.entries(INFRAS).filter(([id]) => !z.infra[id]);
  const ann = `${annexes.length ? `<div class="annexes">${annexes.map(carteAnnexe).join('')}</div>` : '<p class="tiny muted" style="margin:0">Aucune annexe construite pour l’instant.</p>'}
    ${aFaire.length ? `<details class="annexes-plus"${choixDec ? ' open' : ''}><summary class="small">Annexes à construire (${aFaire.length})</summary>
      <div class="annexes">${aFaire.map(carteAnnexe).join('')}</div>
      <a class="small" href="#ordres" data-close>Construire : grande décision dans tes ordres</a></details>` : ''}`;

  const parc = parcVehicules(z, T);
  const enService = parc.filter((v) => v.etat === 'service').length;
  const etat = Math.round(100 - z.usure);
  const cab = parc.filter((v) => v.etat === 'cabosse').length;
  const peq = perequation(z, st);
  return `<div class="col hp-logis" style="gap:10px">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><h2 id="aide-titre" class="aide-titre" style="margin:0">Mon hôtel de police</h2>
      <span class="mono tiny muted">entretien ${fmt1(entretienTotal)} k€ par tour</span></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <button type="button" class="btn small block decor-btn" data-action="decor">${icon('star', 16)} Personnaliser mon commissariat <span class="tiny muted">${decorCompte(z).n} / ${decorCompte(z).total}</span></button>
    ${affichesHtml(z, { moi: true })}
    <div class="bats">${bat}</div>
    ${Object.keys(BATIMENTS).some((id) => b[id] < BATIMENT_MAX) ? '<p class="tiny muted" style="margin:-4px 0 0">En vert : ce que t’apporte le niveau suivant.</p>' : ''}
    <div class="col" style="gap:6px">
      <div class="between"><span class="tiny muted">Annexes · ${REGLES.v2 ? `${nbAnnexes(z)} emplacement${nbAnnexes(z) > 1 ? 's' : ''} occupé${nbAnnexes(z) > 1 ? 's' : ''} sur ${emplacementsAnnexes(z)}` : `${annexes.length} sur ${Object.keys(INFRAS).filter((k) => !INFRAS[k].v2).length}`}</span><span class="tiny muted">entretien ${fmt1(ENTRETIEN_ANNEXE)} k€/tour chacune</span></div>
      ${ann}
    </div>
    <button type="button" class="list-row" data-action="parc" style="width:100%;text-align:left"><span class="col grow" style="gap:1px"><span style="font-weight:600">Parc automobile</span>
      <span class="tiny muted">${enService} sur ${z.vehicules} en service · état ${etat} %${cab ? ` · ${cab} cabossé${cab > 1 ? 's' : ''}` : ''}</span></span>${icon('chevron', 16)}</button>
    ${z.agents > SUBSIDE.seuil ? `<p class="tiny ok" style="margin:0">Subside communal : +${fmt1(subsideAgents(z))} k€ par tour pour tes ${z.agents - SUBSIDE.seuil} agents au-delà de ${SUBSIDE.seuil}.</p>` : ''}
    ${peq ? `<p class="tiny ok" style="margin:0">Péréquation : ta zone est moins équipée que la moyenne du district, elle reçoit +${fmt1(PEREQUATION.montant)} k€ par tour.</p>` : ''}
    <p class="tiny muted" style="margin:0">Agrandir et construire se paient à 20:00. Pense à valider tes ordres.</p>
  </div>`;
}

function parcCorps() {
  const z = myZone(), T = S.state.turn, d = S.draft || {};
  const parc = parcVehicules(z, T);
  const choixCarro = cabossesChoisis(z, d.depenses && d.depenses.carrosserie);
  const etat = Math.round(100 - z.usure);
  const libres = Math.max(0, capaciteVehicules(z) - z.vehicules);
  const dep = d.depenses || {};
  const tuiles = parc.map((v) => {
    const prevu = v.etat === 'cabosse' && choixCarro.includes(v.cab);
    const vendu = (d.ventes || []).includes(v.slot);
    const [coul, txt] = vendu ? ['var(--red)', 'revendu ce soir'] : v.etat === 'cabosse' ? (prevu ? ['var(--blue)', 'réparé ce soir'] : ['var(--amber)', 'cabossé'])
      : v.etat === 'atelier' ? ['var(--red)', `atelier ${v.jours} j`] : ['var(--green)', v.etatPc != null ? `état ${v.etatPc} %` : 'en service'];
    return `<button type="button" class="veh ${v.etat}${prevu ? ' prevu' : ''}" data-action="vehicule" data-slot="${v.slot}" aria-label="${esc(v.nom)} : ${txt}">
      ${vehiculeSvg(v.type, 20)}<span class="n">${esc(v.nom)}</span><span class="s"><i style="background:${coul}"></i>${txt}</span>${v.etatPc != null ? `<span class="veh-u" aria-hidden="true"><b style="width:${v.etatPc}%;background:${v.etatPc >= 80 ? 'var(--green)' : v.etatPc >= 60 ? 'var(--amber)' : 'var(--red)'}"></b></span>` : ''}</button>`;
  }).join('') + (libres ? `<a class="veh libre" href="#ordres" data-close aria-label="Acheter un véhicule (grande décision)"><span style="font-size:16px;line-height:1">+</span><span class="s">${libres} place${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}</span></a>` : '');
  return `<div class="col hp-logis" style="gap:10px">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><h2 id="aide-titre" class="aide-titre" style="margin:0">Parc automobile</h2>
      <span class="tiny muted">${z.vehicules} véhicule${z.vehicules > 1 ? 's' : ''} · garage niv. ${z.batiments.garage} (${capaciteVehicules(z)} places)</span></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <div class="col" style="gap:5px">
      <div class="between"><span class="tiny muted">État moyen du parc</span><span class="mono tiny ${etat < 60 ? 'bad' : etat < 80 ? 'warn' : ''}">${etat} %</span></div>
      <div class="parc-etat"><span style="width:${etat}%;background:${etat >= 80 ? 'var(--green)' : etat >= 60 ? 'var(--amber)' : 'var(--red)'}"></span></div>
    </div>
    <div class="parc">${tuiles}</div>
    ${rendementHtml(z, T, d)}
    ${comparatifModeles(z)}
    ${(() => { const v = vitesseCombi(z); return `<div class="between small"><span class="muted">🚨 Vitesse sur les urgences</span><span class="mono">${Math.round(31 * 3.6 * v.mult)} km/h${v.prepa ? ` · préparation niv. ${v.prepa}` : ''}${v.cabosse ? ' · combi cabossé' : ''}</span></div>`; })()}
    <p class="tiny muted" style="margin:0">Touche un véhicule : son état, son modèle, la carrosserie, la revente. Acheter : Grande décision › Équiper. Combi : le moins cher par place · électrique : se rembourse (prime verte) · anonyme : flagrants et traques · fourgon : engagements et blessures.</p>
    <button type="button" class="btn block" data-action="dep-toggle" data-k="revision" data-fermer="1">${dep.revision ? '✓ Révision du parc prévue · annuler' : `Révision du parc · ${fmt1(DEPENSES.revision.cout)} k€ · +${USURE.revision} %`}</button>
    <button type="button" class="btn small ghost block" data-action="logistique">Voir mon hôtel de police</button>
    <p class="tiny muted" style="margin:0">Réparations et révision se paient à 20:00. Pense à valider tes ordres.</p>
  </div>`;
}

/** Ce que rapporte la flotte avec la répartition du jour (panneau du parc). */
function rendementHtml(z, T, d) {
  const alloc = d.alloc || {};
  const r = rendementFlotte(z, alloc, T, d.rythme || 'normal');
  const ligne = (ic, l, v, cls = '') => `<div class="between small"><span class="muted">${ic} ${l}</span><span class="mono ${cls}">${v}</span></div>`;
  const pi = Math.min(r.intervention, r.places);
  const l = [
    ligne('👮', 'Places à bord', `${fmt1(r.places)} · Intervention ${fmt1(pi)}${r.intervention > r.places ? ` (${fmt1(r.intervention - r.places)} à moitié)` : ''}`, r.intervention > r.places ? 'warn' : ''),
    ligne('🚔', `En voiture (+${Math.round(RENDEMENT.monte * 100)} %)`, r.montes.roulage + r.montes.proximite > 0 ? `Roulage ${fmt1(r.montes.roulage)} · Proximité ${fmt1(r.montes.proximite)}` : 'personne', r.montes.roulage + r.montes.proximite > 0 ? 'ok' : ''),
  ];
  if (r.verte) l.push(ligne('⚡', 'Prime verte', `+${fmt1(r.verte)} k€/jour`, 'ok'));
  if (r.filature) l.push(ligne('🕶️', 'Filatures', `flagrants +${r.filature} %/jour · traque : 2ᵉ planque`, 'ok'));
  if (r.recherche) l.push(ligne('🔎', 'Recherche (anonymes)', `+${r.recherche} %`, 'ok'));
  if (r.ordre) l.push(ligne('🛡️', 'Engagements (fourgons)', `force +${r.ordre} %`, 'ok'));
  if (r.protection) l.push(ligne('🦺', 'Blessures (fourgons)', `−${r.protection} %`, 'ok'));
  l.push(ligne('🔧', 'Entretien', `−${fmt1(r.entretien)} k€/jour`));
  return `<div class="col" style="gap:3px"><span class="tiny muted" style="font-weight:600">Ce que rapporte ta flotte (répartition du jour)</span>${l.join('')}</div>`;
}

/** Fenêtre d'un véhicule (clic sur une tuile du parc) : état et réparations possibles. */
export function ouvrirVehicule(slot) {
  const z = myZone(), T = S.state.turn, d = S.draft || {};
  const v = parcVehicules(z, T).find((x) => x.slot === Number(slot));
  if (!v) return;
  const dep = d.depenses || {};
  const atelier = !!(z.infra && z.infra.garage);
  const etat = v.etatPc != null ? v.etatPc : Math.round(100 - z.usure);
  const M = MODELES[v.modele] || MODELES.diesel, vit = vitesseVehicule(z, v.slot);
  const vendu = (d.ventes || []).includes(v.slot), prixV = prixRevente(z, v.slot);
  const prevu = v.etat === 'cabosse' && cabossesChoisis(z, dep.carrosserie).includes(v.cab);
  const prix = coutCarrosserie(z, [0]);
  const statut = v.etat === 'cabosse'
    ? `<span class="tiny" style="color:var(--amber)">Cabossé${T - v.depuis > 0 ? ` depuis ${T - v.depuis} tour${T - v.depuis > 1 ? 's' : ''}` : ' aujourd’hui'} · il abîme l’image de la zone tant qu’il roule ainsi</span>${v.cause ? `<span class="tiny muted" style="display:block">Cause : ${esc(v.cause)} (tour ${v.depuis}).</span>` : ''}`
    : v.etat === 'atelier' ? `<span class="tiny bad">À l’atelier : de retour dans ${v.jours} tour${v.jours > 1 ? 's' : ''}</span>`
    : '<span class="tiny ok">En service</span>';
  const html = `
    <div class="between" style="align-items:flex-start"><div class="row" style="gap:12px">${vehiculeSvg(v.type, 26)}<div class="col" style="gap:2px"><h2 id="aide-titre" class="aide-titre" style="margin:0">${esc(v.nom)}</h2>${statut}</div></div>
      <button class="iconbtn" data-action="parc" aria-label="Retour au parc" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">‹</button></div>
    ${v.etat === 'cabosse' ? `<div class="bat" style="gap:3px"><div class="between small"><span style="font-weight:600">Carrosserie ce soir</span><span class="mono">${fmt1(prix)} k€</span></div>
      <span class="tiny muted">${atelier ? 'Réparé à ton atelier mécanique, sans immobilisation.' : 'Immobilisé le temps de la réparation. Avec l’atelier mécanique : moitié prix et sans immobilisation.'}</span></div>
      <button type="button" class="btn ${prevu ? '' : 'primary'} block" data-action="carro-veh" data-i="${v.cab}">${prevu ? 'Annuler la réparation' : `Réparer ce soir · ${fmt1(prix)} k€`}</button>` : ''}
    <div class="col" style="gap:4px"><div class="between small"><span class="muted">État de ce véhicule</span><span class="mono">${etat} %${v.km ? ` · ${v.km} interventions` : ''}</span></div>
      <div class="parc-etat"><span style="width:${etat}%;background:${etat >= 80 ? 'var(--green)' : etat >= 60 ? 'var(--amber)' : 'var(--red)'}"></span></div></div>
    <div class="bat" style="gap:3px"><span style="font-weight:600">${esc(M.nom)}</span><span class="tiny muted">${esc(M.texte)}</span>
      <span class="tiny">${fmt1(M.places)} agents à bord · urgences : ${vit ? Math.round(31 * 3.6 * vit.mult) : '–'} km/h · usure ${M.usure === 1 ? 'normale' : `−${Math.round((1 - M.usure) * 100)} %`} · entretien ${fmt1(M.entretien)} k€/tour</span></div>
    ${z.vehicules > 1 ? `<button type="button" class="btn ${vendu ? '' : 'ghost'} block" data-action="vente-veh" data-slot="${v.slot}">${vendu ? 'Annuler la revente' : `Revendre ce soir · +${fmt1(prixV)} k€`}</button>
      <span class="tiny muted">Prix selon l’état (${Math.round(100 * 0.6)} % du prix neuf pour un véhicule parfait, ${v.etat === 'cabosse' ? '−30 % cabossé, ' : ''}15 % au minimum). Il roule encore ce soir.</span>` : '<span class="tiny muted">Ton dernier véhicule ne peut pas être revendu.</span>'}
    <button type="button" class="btn block" data-action="dep-toggle" data-k="revision" data-fermer="1">${dep.revision ? '✓ Révision du parc prévue · annuler' : `Révision du parc · ${fmt1(DEPENSES.revision.cout)} k€ · +${USURE.revision} %`}</button>
    <p class="tiny muted" style="margin:0">Payé à 20:00 avec tes dépenses du jour. Pense à valider tes ordres.</p>`;
  ouvrirPanneau(html);
}
