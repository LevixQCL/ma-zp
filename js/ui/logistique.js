// Logistique (bâtiments de la zone) et détail du budget : ce qui coûte, ce qui rapporte.
import { S, esc, icon, fmt1, myZone } from './common.js';
import { gradeFor, LOTS, BATIMENTS, BATIMENT_MAX, INFRAS, ENTRETIEN_ANNEXE, TRAVAUX_TOURS, PEREQUATION, SUBSIDE, DEPENSES, USURE } from '../engine/constants.js';
import { parcVehicules, cabossesChoisis } from '../engine/parc.js';
import { DECOR, decorValide, decorDebloque, conditionDecor, decorCompte } from '../engine/decor.js';
import { coutCarrosserie } from '../engine/sinistres.js';
import { sceneHp, vehiculeSvg } from './scene-hp.js';
import { operationActive, fraisFixes, coutDepenses, coutDecision, decisionImpossible, capaciteAgents, capaciteVehicules, effectifPrevu, perequation, subsideAgents } from '../engine/zone.js';
import { coutDemarche } from '../engine/enquete.js';
import { PERIL } from '../engine/rivalites.js';
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
  if (d.aide && d.aide.cible && d.aide.budget) choix.push({ l: 'Entraide envoyée', v: -d.aide.budget });
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
  const recettes = p.fixes.lignes.filter((x) => x.v > 0), frais = p.fixes.lignes.filter((x) => x.v < 0);
  // Tendance : sur la base des seuls frais fixes (sans amendes exceptionnelles ni dépenses).
  const net = p.fixes.total;
  const tours = net < 0 ? Math.max(0, Math.ceil((z.budget - PERIL.budget) / -net)) : null;
  const c = z.compta;
  const html = `
    <div class="between" style="align-items:flex-start"><h2 id="aide-titre" class="aide-titre">Budget de la zone</h2>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <div class="between"><span class="small muted">Aujourd’hui</span><span class="mono" style="font-size:20px;font-weight:700">${fmt1(z.budget)} k€</span></div>
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
function ouvrirPanneau(html) {
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
export function sceneZone(z, st, decor = z.decor) {
  const T = st.turn;
  const parc = parcVehicules(z, T);
  return sceneHp({
    nom: z.nom, b: z.batiments.bureaux, g: z.batiments.garage,
    devant: parc.filter((v) => v.etat !== 'atelier').sort((a, c) => (c.etat === 'cabosse') - (a.etat === 'cabosse')).map((v) => ({ type: v.type, cabosse: v.etat === 'cabosse' })),
    travaux: z.travaux ? z.travaux.batiment : null, atelier: parc.some((v) => v.etat === 'atelier'),
    infra: z.infra || {}, lots: z.lots || [], decor,
    drapeau: { couleur: z.couleur, berne: z.moral < 35 },
    file: z.satisfaction < 35,
    renforce: !!(z.dernierOrdre && z.dernierOrdre.rythme === 'renforce'),
    imprevu: z.scene && z.scene.tour >= T - 1 ? z.scene : {},
    operation: !!operationActive(z, T),
  });
}

/** Personnalisation choisie par le joueur (tout de suite visible chez lui, recopiée dans la partie à 20:00). */
function monDecor(z) { return decorValide(z, (S.player && S.player.decor) || z.decor); }

/** Vignette cliquable du commissariat d'une zone (vitrine de la Carte). */
export function vignetteZone(z) {
  const moi = S.user && z.uid === S.user.uid;
  return `<button type="button" class="vitrine-item" data-action="voir-hp" data-uid="${esc(z.uid)}" aria-label="Voir le commissariat de ${esc(z.nom)}">
    ${sceneZone(z, S.state, moi ? monDecor(z) : decorValide(z, z.decor))}<span class="vitrine-nom"><i style="background:${esc(z.couleur)}"></i>${esc(z.nom)}${moi ? ' <span class="muted">(toi)</span>' : ''}</span></button>`;
}

/** Illustration cliquable de l'HP (dans la carte « Ma zone ») : ouvre la fiche logistique. */
export function sceneCarteHtml() {
  const z = myZone(), T = S.state.turn;
  const parc = parcVehicules(z, T);
  const cab = parc.filter((v) => v.etat === 'cabosse').length;
  const b = z.batiments;
  return `<button type="button" class="scene-btn" data-action="logistique" aria-label="Mon hôtel de police : bâtiments et véhicules">
    ${sceneZone(z, S.state, monDecor(z))}
    <span class="scene-leg"><span>Bâtiment niv. ${b.bureaux} · Garage niv. ${b.garage}${z.travaux ? ' · travaux' : ''}</span>
      ${cab ? `<span class="scene-pastille">${cab} cabossé${cab > 1 ? 's' : ''}</span>` : ''}${icon('chevron', 14)}</span>
  </button>`;
}

/** Hôtel de police d'une autre zone (depuis la Carte ou le classement). */
export function ouvrirHpVoisin(uid) {
  const st = S.state, z = st.zones[uid];
  if (!z) return;
  const moi = z.uid === (S.user && S.user.uid);
  const d = moi ? monDecor(z) : decorValide(z, z.decor);
  const annexes = Object.entries(INFRAS).filter(([id]) => z.infra && z.infra[id]).map(([, i]) => i.nom);
  const lots = (z.lots || []).map((l) => LOTS[l.id] && LOTS[l.id].nom).filter(Boolean);
  ouvrirPanneau(`
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><span class="mono tiny" style="color:var(--blue-soft)">ZP ${esc(z.code)}</span><h2 id="aide-titre" class="aide-titre" style="margin:0">${esc(z.nom)}</h2>
      <span class="tiny muted">${esc(gradeFor(z.ps || 0).nom)} · ${(z.trophees || []).length} trophée${(z.trophees || []).length > 1 ? 's' : ''}</span></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <div class="scene-voisin">${sceneZone(z, st, d)}</div>
    <div class="bats hp-logis">
      <div class="bat"><span class="tiny muted">Bâtiment</span><span style="font-weight:700">Niveau ${z.batiments.bureaux}</span></div>
      <div class="bat"><span class="tiny muted">Garage</span><span style="font-weight:700">Niveau ${z.batiments.garage} · ${z.vehicules} véhicule${z.vehicules > 1 ? 's' : ''}</span></div>
    </div>
    <p class="small" style="margin:0"><span class="muted">Annexes :</span> ${annexes.length ? esc(annexes.join(', ')) : 'aucune'}${lots.length ? `<br><span class="muted">Lots :</span> ${esc(lots.join(', '))}` : ''}</p>
    <p class="tiny muted" style="margin:0">Façade ${esc(DECOR.facade.options[d.facade].nom.toLowerCase())} · néon ${esc(DECOR.neon.options[d.neon].nom.toLowerCase())}${d.abords !== 'aucun' ? ` · ${esc(DECOR.abords.options[d.abords].nom.toLowerCase())}` : ''}</p>`);
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
    <div class="scene-voisin">${sceneZone(z, S.state, d)}</div>
    ${groupes}
    <p class="tiny muted" style="margin:0">Les éléments se débloquent avec ton grade et tes trophées. Les autres chefs de zone voient ton commissariat depuis la Carte et le classement, à partir de 20:00.</p>
  </div>`);
}

/** Fiche « Mon hôtel de police » : bâtiments, parc automobile, annexes. */
export function ouvrirLogistique() {
  ouvrirPanneau(`<div data-logis>${logistiqueCorps()}</div>`);
}
/** Si la fiche logistique est ouverte, la redessine (après un agrandissement ou une réparation). */
export function rafraichirLogistique() {
  const el = document.querySelector('.aide-wrap [data-logis]');
  if (el) el.innerHTML = logistiqueCorps();
}

function logistiqueCorps() {
  const z = myZone(), st = S.state, T = st.turn, d = S.draft || {};
  const b = z.batiments;
  const annexes = Object.entries(INFRAS).filter(([id]) => z.infra[id]);
  const entretienTotal = Object.entries(BATIMENTS).reduce((s, [id, B]) => s + B.entretien(b[id]), 0) + annexes.length * ENTRETIEN_ANNEXE;
  const occupation = { bureaux: [effectifPrevu(z), capaciteAgents(z), 'agents'], garage: [z.vehicules, capaciteVehicules(z), 'véhicules'] };
  const parc = parcVehicules(z, T);
  const choixCarro = cabossesChoisis(z, d.depenses && d.depenses.carrosserie);
  const pips = (n) => `<span class="niv" aria-label="Niveau ${n} sur ${BATIMENT_MAX}">${Array.from({ length: BATIMENT_MAX }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

  const bat = Object.entries(BATIMENTS).map(([id, B]) => {
    const n = b[id];
    const dec = { type: 'agrandir', batiment: id };
    const choisi = d.decision && d.decision.type === 'agrandir' && d.decision.batiment === id;
    const refus = decisionImpossible(z, dec, T);
    const enTravaux = z.travaux && z.travaux.batiment === id;
    const [occ, cap, unite] = occupation[id];
    return `<div class="bat">
      <div class="between"><span style="font-weight:700;font-size:13px">${id === 'bureaux' ? 'Bâtiment' : 'Garage'}</span>${pips(n)}</div>
      <span class="small"><span class="mono ${occ >= cap ? 'warn' : ''}">${occ}</span><span class="muted"> / ${cap} ${unite}</span></span>
      ${enTravaux ? `<span class="tiny warn" style="font-weight:600">Travaux : niveau ${n + 1} au tour ${z.travaux.fin}</span>`
        : n >= BATIMENT_MAX ? '<span class="tiny ok" style="font-weight:600">Niveau maximum</span>'
        : `<button type="button" class="btn small block ${choisi ? 'primary' : 'agr'}" data-action="agrandir" data-b="${id}" ${refus && !choisi ? 'disabled' : ''}>
            ${choisi ? '✓ Prévu ce soir' : `Agrandir · ${fmt1(B.coutAgrandir(n))} k€`}</button>
          <span class="tiny muted">${refus && !choisi ? esc(refus) : `niv. ${n + 1} : ${B.capacite(n + 1)} ${B.unite} · entretien ${fmt1(B.entretien(n + 1))} k€/tour`}</span>`}
    </div>`;
  }).join('');

  const etat = Math.round(100 - z.usure);
  const libres = Math.max(0, capaciteVehicules(z) - z.vehicules);
  const tuiles = parc.map((v) => {
    const prevu = v.etat === 'cabosse' && choixCarro.includes(v.cab);
    const [coul, txt] = v.etat === 'cabosse' ? (prevu ? ['var(--blue)', 'réparé ce soir'] : ['var(--amber)', 'cabossé'])
      : v.etat === 'atelier' ? ['var(--red)', `atelier ${v.jours} j`] : ['var(--green)', 'en service'];
    return `<button type="button" class="veh ${v.etat}${prevu ? ' prevu' : ''}" data-action="vehicule" data-slot="${v.slot}" aria-label="${esc(v.nom)} : ${txt}">
      ${vehiculeSvg(v.type, 20)}<span class="n">${esc(v.nom)}</span><span class="s"><i style="background:${coul}"></i>${txt}</span></button>`;
  }).join('') + (libres ? `<a class="veh libre" href="#ordres" data-close aria-label="Acheter un véhicule (grande décision)"><span style="font-size:16px;line-height:1">+</span><span class="s">${libres} place${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}</span></a>` : '');

  const peq = perequation(z, st);
  return `<div class="col hp-logis" style="gap:10px">
    <div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><h2 id="aide-titre" class="aide-titre" style="margin:0">Mon hôtel de police</h2>
      <span class="mono tiny muted">entretien ${fmt1(entretienTotal)} k€ par tour</span></div>
      <button class="iconbtn" data-close aria-label="Fermer" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">×</button></div>
    <button type="button" class="btn small block decor-btn" data-action="decor">${icon('star', 16)} Personnaliser mon commissariat <span class="tiny muted">${decorCompte(z).n} / ${decorCompte(z).total}</span></button>
    <div class="bats">${bat}</div>
    <div class="col" style="gap:5px">
      <div class="between"><span class="tiny muted">Parc automobile</span><span class="tiny muted">état du parc <span class="mono ${etat < 60 ? 'bad' : etat < 80 ? 'warn' : ''}">${etat} %</span></span></div>
      <div class="parc-etat"><span style="width:${etat}%;background:${etat >= 80 ? 'var(--green)' : etat >= 60 ? 'var(--amber)' : 'var(--red)'}"></span></div>
    </div>
    <div class="parc">${tuiles}</div>
    <div class="chips">${annexes.map(([, i]) => `<span class="chip">${esc(i.nom)}</span>`).join('')}<a class="chip add" href="#ordres" data-close>+ Annexe</a></div>
    ${z.agents > SUBSIDE.seuil ? `<p class="tiny ok" style="margin:0">Subside communal : +${fmt1(subsideAgents(z))} k€ par tour pour tes ${z.agents - SUBSIDE.seuil} agents au-delà de ${SUBSIDE.seuil}.</p>` : ''}
    ${peq ? `<p class="tiny ok" style="margin:0">Péréquation : ta zone est moins équipée que la moyenne du district, elle reçoit +${fmt1(PEREQUATION.montant)} k€ par tour.</p>` : ''}
    <p class="tiny muted" style="margin:0">Agrandir et réparer se paient à 20:00. Pense à valider tes ordres.</p>
  </div>`;
}

/** Fenêtre d'un véhicule (clic sur une tuile du parc) : état et réparations possibles. */
export function ouvrirVehicule(slot) {
  const z = myZone(), T = S.state.turn, d = S.draft || {};
  const v = parcVehicules(z, T).find((x) => x.slot === Number(slot));
  if (!v) return;
  const dep = d.depenses || {};
  const atelier = !!(z.infra && z.infra.garage);
  const etat = Math.round(100 - z.usure);
  const prevu = v.etat === 'cabosse' && cabossesChoisis(z, dep.carrosserie).includes(v.cab);
  const prix = coutCarrosserie(z, [0]);
  const statut = v.etat === 'cabosse'
    ? `<span class="tiny" style="color:var(--amber)">Cabossé${T - v.depuis > 0 ? ` depuis ${T - v.depuis} tour${T - v.depuis > 1 ? 's' : ''}` : ' aujourd’hui'} · il abîme l’image de la zone tant qu’il roule ainsi</span>`
    : v.etat === 'atelier' ? `<span class="tiny bad">À l’atelier : de retour dans ${v.jours} tour${v.jours > 1 ? 's' : ''}</span>`
    : '<span class="tiny ok">En service</span>';
  const html = `
    <div class="between" style="align-items:flex-start"><div class="row" style="gap:12px">${vehiculeSvg(v.type, 26)}<div class="col" style="gap:2px"><h2 id="aide-titre" class="aide-titre" style="margin:0">${esc(v.nom)}</h2>${statut}</div></div>
      <button class="iconbtn" data-action="logistique" aria-label="Retour au parc" style="width:32px;height:32px;margin:-4px -6px 0 0;font-size:20px">‹</button></div>
    ${v.etat === 'cabosse' ? `<div class="bat" style="gap:3px"><div class="between small"><span style="font-weight:600">Carrosserie ce soir</span><span class="mono">${fmt1(prix)} k€</span></div>
      <span class="tiny muted">${atelier ? 'Réparé à ton atelier mécanique, sans immobilisation.' : 'Immobilisé le temps de la réparation. Avec l’atelier mécanique : moitié prix et sans immobilisation.'}</span></div>
      <button type="button" class="btn ${prevu ? '' : 'primary'} block" data-action="carro-veh" data-i="${v.cab}">${prevu ? 'Annuler la réparation' : `Réparer ce soir · ${fmt1(prix)} k€`}</button>` : ''}
    <div class="between small"><span class="muted">État du parc (tous les véhicules)</span><span class="mono">${etat} %</span></div>
    <button type="button" class="btn block" data-action="dep-toggle" data-k="revision" data-fermer="1">${dep.revision ? '✓ Révision du parc prévue · annuler' : `Révision du parc · ${fmt1(DEPENSES.revision.cout)} k€ · +${USURE.revision} %`}</button>
    <p class="tiny muted" style="margin:0">Payé à 20:00 avec tes dépenses du jour. Pense à valider tes ordres.</p>`;
  ouvrirPanneau(html);
}
