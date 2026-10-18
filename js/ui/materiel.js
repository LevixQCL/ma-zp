// Onglet Brigade › Matériel (oct. 2026) : le magasin et l'armurerie de la zone.
// Les commandes partent avec les ordres du soir (S.draft.materiel) ; tout se règle au tour de 20:00 (engine/materiel.js).
import { S, esc, myZone, fmtK } from './common.js';
import { COULEUR_ROLE, initiales } from './equipe.js';
import { enRodage } from '../engine/brigade.js';
import { MAT, ARTICLES, creerMateriel, giletsValides, certifiesActifs, tasersActifs, trouGilets, facteurGilets, prixMarche, gammeDe, surplus, ttiValides, trouTTI, facteurTTI, fonction, ttiDepart } from '../engine/materiel.js';

const IMG = (k) => `img/materiel/${k}.webp`;
const ico = (k, c = '') => `<img class="mat-ico${c ? ` ${c}` : ''}" src="${IMG(k)}" alt="" loading="lazy">`;

export const ordresMatVides = () => ({ masse: [], commandes: [], lancer: null, adherer: [], certifier: false, ceder: [], recyclage: [], fonctions: {} });
function om() { if (!S.draft) return ordresMatVides(); return (S.draft.materiel ||= ordresMatVides()); }

/** Dotation de la zone (avant son premier tour avec le magasin : celle qu'elle recevra ce soir). */
export const matDe = (z) => z.materiel || creerMateriel(z, S.state ? S.state.turn : 1);

/** Quelque chose à faire au magasin (pastille de l'onglet) : gilets qui périment sous 2 jours sans commande, masse pleine. */
export function materielAFaire() {
  const z = myZone(); if (!z || !z.materiel || !S.state) return false;
  const m = z.materiel, T = S.state.turn, o = (S.draft && S.draft.materiel) || ordresMatVides();
  const enCmd = (m.commandes || []).filter((c) => c.item.startsWith('gilets')).reduce((s, c) => s + c.lots * MAT.gilets.lot, 0)
    + o.commandes.filter((c) => c.item.startsWith('gilets')).reduce((s, c) => s + c.lots * MAT.gilets.lot, 0)
    + ((S.state.marches || []).filter((x) => !x.clos && x.part[z.uid] && x.item.startsWith('gilets')).reduce((s, x) => s + x.part[z.uid] * MAT.gilets.lot, 0))
    + o.adherer.length * MAT.gilets.lot;
  const valides2 = (m.gilets || []).filter((g) => g.fin > T + 2).reduce((s, g) => s + g.n, 0);
  return valides2 + enCmd < (z.agents || 0) || (m.masse >= MAT.masse.max && !o.masse.length);
}

/** La grille des gilets : un petit gilet par agent, dans l'ordre de péremption. */
function grilleGilets(m, z, T) {
  const n = z.agents || 0, cases = [];
  for (const g of (m.gilets || []).filter((x) => x.fin > T).sort((a, b) => a.fin - b.fin)) {
    for (let i = 0; i < g.n && cases.length < n; i++) cases.push({ k: g.m === 'ajuste' ? 'aj' : g.fin <= T + 2 ? 'per' : 'ok', fin: g.fin });
  }
  while (cases.length < n) cases.push({ k: 'sans' });
  const titre = { ok: 'valide', per: 'périme bientôt', sans: 'sans gilet valide', aj: 'gilet ajusté' };
  return `<div class="mat-gilets" role="img" aria-label="${giletsValides(m, T).total} gilets valides sur ${n} agents">${cases.map((c) => `<span class="mg ${c.k}" title="${titre[c.k]}${c.fin ? `, valable jusqu’au jour ${c.fin}` : ''}"><img src="${IMG(c.k === 'aj' ? 'gilets_ajustes' : 'gilets')}" alt=""></span>`).join('')}</div>`;
}

function boutonCmd(item, voie, label) {
  const o = om(), a = ARTICLES[item], v = MAT.voies[voie];
  const c = o.commandes.find((x) => x.item === item && x.voie === voie);
  const prix = a.prix * v.mult * (c ? c.lots * gammeDe(c.q).prix : 1);
  return `<button type="button" class="btn small${c ? ' on' : ' ghost'}" data-action="mat-cmd" data-k="${item}" data-v="${voie}" aria-pressed="${!!c}">${esc(label)} · ${fmtK(prix)}</button>`;
}
function stepper(item) {
  const c = om().commandes.find((x) => x.item === item);
  if (!c) return '';
  const a = ARTICLES[item];
  return `<div class="mat-step"><button type="button" class="btn small ghost" data-action="mat-lots" data-k="${item}" data-d="-1" aria-label="Un lot de moins">−</button>
    <span><b>${c.lots}</b> lot${c.lots > 1 ? 's' : ''} · ${c.lots * a.lot} ${esc(a.nom.toLowerCase())}</span>
    <button type="button" class="btn small ghost" data-action="mat-lots" data-k="${item}" data-d="1" aria-label="Un lot de plus" ${c.lots >= MAT.lotsMax ? 'disabled' : ''}>+</button></div>
    <div class="mat-gamme" role="group" aria-label="Fournisseur">${Object.entries(MAT.gammes).map(([k, q]) => `<button type="button" class="${(c.q || 'std') === k ? 'on' : ''}" data-action="mat-gamme" data-k="${item}" data-q="${k}" aria-pressed="${(c.q || 'std') === k}"><b>${esc(q.nom)}</b><span>${q.prix === 1 ? 'prix normal' : `${q.prix < 1 ? '−' : '+'}${Math.round(Math.abs(1 - q.prix) * 100)} %`}${item.startsWith('gilets') ? ` · ${q.validite} j` : ''}${q.defaut ? ` · ${Math.round(q.defaut * 100)} % de lots recalés` : ' · jamais recalé'}</span></button>`).join('')}</div>`;
}

export function materielVueHtml() {
  const z = myZone(), st = S.state, T = st.turn, m = matDe(z), o = om(), n = z.agents || 0;
  const g = giletsValides(m, T), bientot = (m.gilets || []).filter((x) => x.fin > T && x.fin <= T + 2).reduce((s, x) => s + x.n, 0);
  const fg = facteurGilets({ ...z, materiel: m }, T), trou = trouGilets({ ...z, materiel: m }, T);
  const enCmd = (m.commandes || []).map((c) => `${c.lots * ARTICLES[c.item].lot} ${ARTICLES[c.item].nom.toLowerCase()} (${c.arrive <= T + 1 ? 'demain soir' : `dans ${c.arrive - T} jours`})`);
  const tenueTxt = m.tenue >= 75 ? 'Tenue neuve : moral +0,8 par jour.' : m.tenue >= 45 ? 'Tenue correcte.' : m.tenue >= 25 ? 'Tenue usée : moral −1 par jour.' : 'Tenue en lambeaux : moral −1,5 par jour.';
  const coul = (v, a, b) => (v >= a ? 'var(--green)' : v >= b ? 'var(--amber)' : 'var(--red)');
  const marches = (st.marches || []).filter((x) => !x.clos && x.ferme >= T);
  const monMarche = marches.find((x) => x.lanceur === z.uid);
  const nomZ = (u) => (u === z.uid ? 'ta zone' : (st.zones[u] && st.zones[u].nom) || 'une zone');

  return `<section class="col" style="gap:10px" aria-label="Magasin et armurerie">
    <div class="mat-banner"><img src="${IMG('banniere')}" alt="Le magasin et l’armurerie">
      <div class="mat-etat"><div><b>${g.total}/${n}</b>gilets valides</div><div><b>${m.masse}</b>pts de masse</div><div><b>${tasersActifs(m, T)}</b>taser${tasersActifs(m, T) > 1 ? 's' : ''} en service</div><div><b>${m.bodycam || 0}</b>bodycams</div></div></div>

    <section class="card mat-bloc${fg < 1 || bientot ? ' alerte' : ''}">
      <div class="mat-tete">${ico('gilets', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Gilets pare-balles</b><span class="tiny muted">${g.total} valides sur ${n} agents${g.ajustes ? `, dont ${g.ajustes} ajustés` : ''}</span></div></div>
      ${grilleGilets(m, z, T)}
      <div class="mat-leg"><span class="ok">valide</span><span class="per">périme sous 2 jours</span><span class="sans">sans gilet</span><span class="aj">ajusté</span></div>
      <p class="small" style="margin:0">${fg < 1 ? `<b style="color:var(--red)">${Math.round(trou * 100)} % d’agents sans gilet valide : ils refusent les interventions à risque (Intervention −${Math.round((1 - fg) * 100)} %).</b>` : bientot ? `<b>${bientot} gilets périment d’ici deux jours.</b> La centrale livre en ${MAT.voies.centrale.delai} jours, la procédure négociée dès demain soir (plus cher).` : 'Tout le monde est couvert. Un gilet valide arrête souvent le coup quand une intervention tourne mal, mais il peut y rester (coup de couteau, impact).'}</p>
      <div class="row" style="gap:6px;flex-wrap:wrap">${boutonCmd('gilets', 'centrale', `Centrale (${MAT.voies.centrale.delai} j)`)}${boutonCmd('gilets', 'negociee', 'Négociée (demain)')}${boutonCmd('gilets_ajustes', 'centrale', 'Ajustés')}</div>
      ${stepper('gilets')}${stepper('gilets_ajustes')}
      <span class="tiny muted">Un lot = ${MAT.gilets.lot} gilets, valables de ${MAT.gammes.eco.validite} à ${MAT.gammes.qualite.validite} jours selon le fournisseur. Ajustés (port discret) : moins de blessures et meilleur moral. La centrale peut annoncer un retard (rupture de stock).</span>
      ${m.inspection ? `<span class="tiny ${m.inspection.ok ? 'muted' : ''}" style="${m.inspection.ok ? '' : 'color:var(--amber)'}">Dernière inspection surprise : jour ${m.inspection.t}, ${m.inspection.ok ? 'rien à signaler' : 'remarques (voir le rapport de ce soir-là)'}.</span>` : '<span class="tiny muted">Une inspection surprise peut passer : gilets périmés en service et masse inutilisée sont sanctionnés.</span>'}
    </section>

    ${ttiHtml(z, m, T, o)}

    <section class="card mat-bloc">
      <div class="mat-tete">${ico('tenue', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Tenue</b><span class="tiny muted">masse d’habillement : ${m.masse}/${MAT.masse.max} points, +${MAT.masse.parJour} par jour</span></div>${ico('chaussures', 's')}</div>
      <div class="mat-jauge"><span>Polos, t-shirts</span><span class="barre"><i style="width:${m.tenue}%;background:${coul(m.tenue, 75, 45)}"></i></span><b>${m.tenue}</b></div>
      <div class="mat-jauge"><span>Chaussures</span><span class="barre"><i style="width:${m.chaussures}%;background:${coul(m.chaussures, 50, 25)}"></i></span><b>${m.chaussures}</b></div>
      <p class="small" style="margin:0">${tenueTxt}${m.chaussures < 50 ? ' Chaussures usées : plus de blessures.' : ''}</p>
      <span class="tiny muted">Usure${m.usureJour ? ` hier : tenue −${String(m.usureJour.tenue).replace('.', ',')}, chaussures −${String(m.usureJour.chaussures).replace('.', ',')}` : ''}. La tenue s’use plus vite en rythme renforcé, les chaussures avec tes agents sur le terrain (Intervention, Roulage, Proximité). Chaque recrue apporte ${MAT.masseRecrue} point de masse pour sa tenue.</span>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <button type="button" class="btn small${o.masse.includes('tenue') ? ' on' : ' ghost'}" data-action="mat-masse" data-k="tenue" ${m.masse < MAT.tenue.cout && !o.masse.includes('tenue') ? 'disabled' : ''}>Polos neufs · ${MAT.tenue.cout} pts</button>
        <button type="button" class="btn small${o.masse.includes('chaussures') ? ' on' : ' ghost'}" data-action="mat-masse" data-k="chaussures" ${m.masse < MAT.chaussures.cout && !o.masse.includes('chaussures') ? 'disabled' : ''}>Chaussures · ${MAT.chaussures.cout} pts</button>
      </div>
      <span class="tiny muted">Les points non utilisés sont perdus en fin de saison.</span>
    </section>

    <section class="card mat-bloc">
      <b>Armement et équipements</b>
      <div class="mat-item">${ico('taser')}<div><span class="small"><b>Taser</b> : ${m.taser || 0} en armurerie, ${certifiesActifs(m, T)} agents brevetés, ${tasersActifs(m, T)} en service. ${tasersActifs(m, T) ? 'Ouvre « Neutraliser au taser » sur l’appel du jour (arme, fuite, foule).' : (m.taser ? `Il faut ${MAT.taser.cert.agents} agents brevetés par taser en service.` : 'Ouvre une nouvelle approche sur l’appel du jour.')}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${boutonCmd('taser', 'centrale', 'Centrale')}<button type="button" class="btn small${o.certifier ? ' on' : ' ghost'}" data-action="mat-cert" ${!m.taser ? 'disabled' : ''}>Breveter ${MAT.taser.cert.agents} agents · ${fmtK(MAT.taser.cert.prix)}</button></div>${stepper('taser')}
        <span class="tiny muted">Brevet taser : ${MAT.taser.cert.agents} agents en formation un jour, valable ${MAT.taser.cert.validite} jours (recyclage ensuite).</span></div></div>
      <div class="mat-item">${ico('bodycam')}<div><span class="small"><b>Bodycams</b> : ${m.bodycam || 0}. ${(m.bodycam || 0) >= MAT.bodycam.lot ? 'Satisfaction en hausse chaque jour, approches « procédure » +5 %.' : `Moins de plaintes, approches « procédure » plus sûres. Entretien : ${fmtK(MAT.bodycam.entretien)} par jour et par lot.`}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${boutonCmd('bodycam', 'centrale', `Lot de ${MAT.bodycam.lot}, centrale`)}</div>${stepper('bodycam')}</div></div>
      <div class="mat-item">${ico('gnep')}<div><span class="small"><b>Casques et boucliers</b> : ${m.gnep || 0}. Ouvre « Cordon casqué » face aux foules. Au non-droit : force +8 % et moins de blessés s’il y en a pour tous tes agents engagés ; pour moins de la moitié, plus de blessés.</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${boutonCmd('gnep', 'centrale', `Lot de ${MAT.gnep.lot}, centrale`)}</div>${stepper('gnep')}</div></div>
      <span class="tiny muted">Une intervention qui tourne mal peut abîmer le matériel : taser cassé, bodycam arrachée, casque fendu.</span>
    </section>

    <section class="card mat-bloc">
      <div class="mat-tete">${ico('marche', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Marchés du district</b><span class="tiny muted">−${Math.round(MAT.marche.remiseParZone * 100)} % par zone qui adhère, jusqu’à −${Math.round(MAT.marche.remiseMax * 100)} %</span></div></div>
      ${marches.map((x) => { const nz = Object.keys(x.part).length, a = ARTICLES[x.item], moi = !!x.part[z.uid], veut = o.adherer.find((y) => y.id === x.id);
        return `<div class="mat-marche"><div class="col" style="gap:2px;min-width:0"><span class="small"><b>${esc(a.nom)}</b> · lancé par ${esc(nomZ(x.lanceur))}</span><span class="tiny muted">${nz} zone${nz > 1 ? 's' : ''} · −${Math.round((1 - prixMarche(nz)) * 100)} % · clôture ${x.ferme === T ? 'ce soir' : x.ferme - T === 1 ? 'demain soir' : `dans ${x.ferme - T} jours`}${moi ? ` · ta part : ${x.part[z.uid]} lot${x.part[z.uid] > 1 ? 's' : ''}` : ''}</span></div>
          ${moi ? '<span class="tiny muted">inscrit</span>' : `<button type="button" class="btn small${veut ? ' on' : ' ghost'}" data-action="mat-adh" data-id="${esc(x.id)}">${veut ? `Adhérer (${veut.lots} lot${veut.lots > 1 ? 's' : ''})` : 'Adhérer'}</button>`}</div>`; }).join('') || '<p class="tiny muted" style="margin:0">Aucun marché ouvert. Lance le tien : les autres zones pourront y adhérer pendant deux jours et tout le monde paiera moins cher.</p>'}
      <div class="row" style="gap:6px;flex-wrap:wrap">${['gilets', 'taser', 'bodycam', 'gnep'].map((k) => `<button type="button" class="btn small${o.lancer && o.lancer.item === k ? ' on' : ' ghost'}" data-action="mat-lancer" data-k="${k}" ${monMarche ? 'disabled' : ''}>Lancer : ${esc(ARTICLES[k].nom.toLowerCase())}</button>`).join('')}</div>
      ${o.lancer ? `<div class="mat-step"><button type="button" class="btn small ghost" data-action="mat-lancer-lots" data-d="-1" aria-label="Un lot de moins">−</button><span>Ta part : <b>${o.lancer.lots}</b> lot${o.lancer.lots > 1 ? 's' : ''}</span><button type="button" class="btn small ghost" data-action="mat-lancer-lots" data-d="1" aria-label="Un lot de plus">+</button></div>` : ''}
      <span class="tiny muted">Payé à la clôture, livré ${MAT.marche.livraison} jours après. Celui qui lance gagne ${MAT.marche.psLanceur} PS par zone qui adhère.</span>
    </section>

    ${fonctionsHtml(z, o)}
    ${entreZonesHtml(z, T, o)}
    ${enCmd.length ? `<section class="card mat-bloc"><div class="mat-tete">${ico('marche', 's')}<div class="col grow" style="gap:1px"><b>Livraisons attendues</b><span class="small">${esc(enCmd.join(' · '))}</span></div></div></section>` : ''}
    ${m.hs ? `<p class="tiny muted" style="margin:0">${m.hs} objet${m.hs > 1 ? 's' : ''} perdu${m.hs > 1 ? 's' : ''} en intervention depuis le début de la saison.</p>` : ''}
    <p class="tiny muted" style="margin:0">Les commandes partent avec tes ordres du soir et sont payées à 20:00 si le budget le permet.</p>
  </section>`;
}

/** Recyclage TTI avec et sans arme à feu : qui est à jour, qui arrive à échéance, groupes envoyés ce soir. */
function ttiHtml(z, m0, T, o) {
  const m = m0.tti ? m0 : { ...m0, tti: ttiDepart(z.agents || 20, T) }, n = z.agents || 0, zz = { ...z, materiel: m };
  const mo = fonction(z, 'moniteurTTI'), stand = !!(z.infra && z.infra.tir);
  const ligne = (type) => {
    const v = Math.min(n, ttiValides(m, T, type)), bientot = (m.tti[type] || []).filter((x) => x.fin > T && x.fin <= T + 3).reduce((s, x) => s + x.n, 0);
    const r = (o.recyclage || []).find((x) => x.type === type), g = r ? r.groupes : 0;
    const prix = MAT.tti[type].prix * (mo ? 0.5 : 1) * (type === 'af' && stand ? 0.5 : 1);
    const pct = n ? Math.round((v / n) * 100) : 100;
    return `<div class="col" style="gap:5px">
      <div class="mat-jauge"><span>${type === 'af' ? 'Avec arme à feu' : 'Sans arme à feu'}</span><span class="barre"><i style="width:${pct}%;background:${pct >= 90 ? 'var(--green)' : pct >= 70 ? 'var(--amber)' : 'var(--red)'}"></i></span><b>${v}/${n}</b></div>
      ${bientot ? `<span class="tiny" style="color:var(--amber)">${bientot} agent${bientot > 1 ? 's' : ''} à recycler d’ici 3 jours.</span>` : ''}
      <div class="mat-step"><button type="button" class="btn small ghost" data-action="mat-tti" data-t="${type}" data-d="-1" ${!g ? 'disabled' : ''} aria-label="Un groupe de moins">−</button>
        <span>${g ? `<b>${g}</b> groupe${g > 1 ? 's' : ''} · ${g * MAT.tti.groupe} agents · ${fmtK(g * prix)}` : `Recycler par groupes de ${MAT.tti.groupe} · ${fmtK(prix)} le groupe`}</span>
        <button type="button" class="btn small ghost" data-action="mat-tti" data-t="${type}" data-d="1" ${g >= MAT.tti.groupesMax ? 'disabled' : ''} aria-label="Un groupe de plus">+</button></div></div>`;
  };
  const ft = facteurTTI(zz, T), ts = trouTTI(zz, T, 'saf');
  return `<section class="card mat-bloc${ft < 1 ? ' alerte' : ''}">
    <div class="mat-tete">${ico('taser', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Recyclage TTI</b><span class="tiny muted">techniques et tactiques d’intervention, valable ${MAT.tti.validite + (mo ? 7 : 0)} jours</span></div></div>
    ${ligne('af')}${ligne('saf')}
    <p class="small" style="margin:0">${ft < 1 ? `<b style="color:var(--red)">Des agents ne peuvent plus porter leur arme : Intervention −${Math.round((1 - ft) * 100)} %, assauts du non-droit affaiblis.</b>` : 'Sans recyclage avec arme à feu, un agent ne porte plus son arme : moins d’Intervention et d’assauts. '}${ts > MAT.tti.seuilSAF ? ' <b>Sans arme à feu en retard : plus de blessés et de plaintes.</b>' : ''}</p>
    <span class="tiny muted">Un agent absent par groupe de ${MAT.tti.groupe} (demi-journée par roulement)${stand ? ', tir au stand : moitié prix et moitié moins d’absents' : ''}${mo ? `. Moniteur : ${esc(mo.prenom)} ${esc(mo.nom)}` : ''}. Les recrues sortent d’école à jour.</span>
  </section>`;
}

/** Fonctions matériel : une figure (dès son premier surnom) par fonction. */
function fonctionsHtml(z, o) {
  const figs = (z.equipe || []).filter((m) => (m.niveau || 0) >= 1);
  const cur = { ...(z.fonctions || {}), ...(o.fonctions || {}) };
  const lignes = Object.entries(MAT.fonctions).map(([k, f]) => {
    const role = cur[k];
    const boutons = figs.map((m) => `<button type="button" class="mat-fig${role === m.role ? ' on' : ''}" data-action="mat-fonction" data-f="${k}" data-role="${m.role}" style="--c:${COULEUR_ROLE[m.role]}" title="${esc(m.prenom)} ${esc(m.nom)}" aria-pressed="${role === m.role}">${esc(initiales(m))}</button>`).join('');
    const tient = role && figs.find((m) => m.role === role);
    return `<div class="mat-fonction"><div class="col" style="gap:2px;min-width:0"><span class="small"><b>${esc(f.nom)}</b>${tient ? ` · ${esc(tient.prenom)} ${esc(tient.nom)}` : ''}</span><span class="tiny muted">${esc(f.texte)}</span></div><div class="row" style="gap:4px;flex-wrap:wrap">${boutons}</div></div>`;
  }).join('');
  return `<section class="card mat-bloc"><b>Fonctions de tes figures</b>
    ${figs.length ? lignes : '<p class="tiny muted" style="margin:0">Une figure peut prendre une fonction matériel dès son premier surnom (vue Équipe).</p>'}
    ${figs.length ? '<span class="tiny muted">Une figure ne tient qu’une fonction. Le changement prend effet ce soir à 20:00.</span>' : ''}</section>`;
}

/** Entre zones : tes surplus, les zones qui manquent de gilets, ce que tu leur cèdes ce soir. */
function entreZonesHtml(z, T, o) {
  const st = S.state, sp = surplus({ ...z, materiel: matDe(z) }, T);
  const manquent = Object.values(st.zones || {}).filter((x) => x.uid !== z.uid && x.materiel && trouGilets(x, T) > 0.2)
    .map((x) => ({ x, t: trouGilets(x, T), besoin: Math.ceil(trouGilets(x, T) * (x.agents || 0)) })).sort((a, b) => b.t - a.t).slice(0, 4);
  const lignes = manquent.map(({ x, t, besoin }) => {
    const c = (o.ceder || []).find((y) => y.cible === x.uid && y.item === 'gilets');
    const n = Math.min(sp.gilets, besoin);
    return `<div class="mat-marche"><div class="col" style="gap:2px;min-width:0"><span class="small"><b>${esc(x.nom || 'Zone')}</b> : ${besoin} agent${besoin > 1 ? 's' : ''} sans gilet</span><span class="tiny muted">${t > MAT.gilets.refus ? 'ses agents refusent les interventions à risque' : 'bientôt en difficulté'}</span></div>
      ${n > 0 ? `<button type="button" class="btn small${c ? ' on' : ' ghost'}" data-action="mat-ceder" data-cible="${esc(x.uid)}" data-n="${n}">${c ? `${c.n} gilets cédés ce soir` : `Céder ${n} gilet${n > 1 ? 's' : ''}`}</button>` : '<span class="tiny muted">pas de surplus</span>'}</div>`;
  }).join('');
  return `<section class="card mat-bloc"><div class="mat-tete">${ico('gilets', 's')}<div class="col grow" style="gap:1px;min-width:0"><b>Entre zones</b><span class="tiny muted">ton surplus : ${sp.gilets} gilet${sp.gilets > 1 ? 's' : ''}, ${sp.taser} taser${sp.taser > 1 ? 's' : ''} en réserve</span></div></div>
    ${lignes || '<p class="tiny muted" style="margin:0">Aucune zone ne manque de gilets pour l’instant.</p>'}
    <span class="tiny muted">Céder ton surplus rapporte ${MAT.ceder.psPar === 2 ? '1 PS par 2 objets' : 'des PS'} (${MAT.ceder.psMax} au plus), et +${MAT.ceder.rep} de réputation si ses agents refusaient déjà les interventions.</span></section>`;
}

/** Clics de la vue Matériel. Renvoie true si l'action a été traitée. */
export function actionMateriel(a, el) {
  if (!a.startsWith('mat-') || !S.draft) return false;
  const o = om(), z = myZone(), m = matDe(z);
  if (a === 'mat-masse') { const k = el.dataset.k; o.masse = o.masse.includes(k) ? o.masse.filter((x) => x !== k) : [...o.masse, k]; if (o.masse.reduce((s, x) => s + MAT[x].cout, 0) > m.masse) o.masse = o.masse.filter((x) => x !== k); }
  if (a === 'mat-cmd') {
    const k = el.dataset.k, v = el.dataset.v, i = o.commandes.findIndex((c) => c.item === k && c.voie === v);
    if (i >= 0) o.commandes.splice(i, 1);
    else {
      o.commandes = o.commandes.filter((c) => c.item !== k);
      let lots = 1;
      if (k.startsWith('gilets')) { const T = S.state.turn; const dans = (m.gilets || []).filter((g) => g.fin > T + MAT.voies[v].delai).reduce((s, g) => s + g.n, 0); lots = Math.max(1, Math.min(MAT.lotsMax, Math.ceil(((z.agents || 0) - dans) / MAT.gilets.lot))); }
      o.commandes.push({ item: k, lots, voie: v });
    }
  }
  if (a === 'mat-lots') { const c = o.commandes.find((x) => x.item === el.dataset.k); if (c) c.lots = Math.max(1, Math.min(MAT.lotsMax, c.lots + Number(el.dataset.d))); }
  if (a === 'mat-cert') o.certifier = !o.certifier;
  if (a === 'mat-tti') { o.recyclage ||= []; const t = el.dataset.t; let r = o.recyclage.find((x) => x.type === t); if (!r) { r = { type: t, groupes: 0 }; o.recyclage.push(r); } r.groupes = Math.max(0, Math.min(MAT.tti.groupesMax, r.groupes + Number(el.dataset.d))); o.recyclage = o.recyclage.filter((x) => x.groupes > 0); }
  if (a === 'mat-fonction') { o.fonctions ||= {}; const f = el.dataset.f, role = el.dataset.role, cur = { ...(z.fonctions || {}), ...o.fonctions };
    if (cur[f] === role) o.fonctions[f] = null; else { for (const k of Object.keys(cur)) if (cur[k] === role && k !== f) o.fonctions[k] = null; o.fonctions[f] = role; } }
  if (a === 'mat-gamme') { const c = o.commandes.find((x) => x.item === el.dataset.k); if (c) c.q = el.dataset.q; }
  if (a === 'mat-ceder') { o.ceder ||= []; const u = el.dataset.cible, i = o.ceder.findIndex((x) => x.cible === u); if (i >= 0) o.ceder.splice(i, 1); else if (o.ceder.length < 2) o.ceder.push({ cible: u, item: 'gilets', n: Number(el.dataset.n) || 0 }); }
  if (a === 'mat-adh') { const id = el.dataset.id, i = o.adherer.findIndex((x) => x.id === id); if (i >= 0) o.adherer.splice(i, 1); else o.adherer.push({ id, lots: 2 }); }
  if (a === 'mat-lancer') o.lancer = o.lancer && o.lancer.item === el.dataset.k ? null : { item: el.dataset.k, lots: 2 };
  if (a === 'mat-lancer-lots' && o.lancer) o.lancer.lots = Math.max(1, Math.min(MAT.lotsMax, o.lancer.lots + Number(el.dataset.d)));
  S.ordersDirty = true;
  return true;
}

/**
 * Pions des Ordres : chaque agent au service est un petit personnage dans la tenue de son service.
 * L'équipement se voit : sans gilet (Intervention, Roulage, Proximité), sans recyclage TTI arme, taser, recrue en formation.
 * Renvoie une fonction (i) → { img, cls, bdg, titre } pour le i-ème agent « au service » de `s`.
 */
const SPRITE = { intervention: 'inter', proximite: 'prox', recherche: 'rech', roulage: 'roul', admin: 'admin' };
export function agentsService(s) {
  const z = myZone(); if (!z || !S.state || !S.draft) return () => ({ img: `img/agents/${SPRITE[s]}.webp`, cls: '', bdg: '', titre: '' });
  const T = S.state.turn, m = z.materiel, n = z.agents || 0, alloc = S.draft.alloc || {};
  const terrain = ['intervention', 'roulage', 'proximite'];
  const avantT = terrain.includes(s) ? terrain.slice(0, terrain.indexOf(s)).reduce((t, k) => t + (Number(alloc[k]) || 0), 0) : 0;
  const ordre = ['intervention', 'proximite', 'recherche', 'roulage', 'admin'];
  const total = ordre.reduce((t, k) => t + (Number(alloc[k]) || 0), 0);
  const avantG = ordre.slice(0, ordre.indexOf(s)).reduce((t, k) => t + (Number(alloc[k]) || 0), 0);
  const sansG = m && terrain.includes(s) ? Math.max(0, n - giletsValides(m, T).total) : 0;
  const sansA = m && m.tti && terrain.includes(s) ? Math.max(0, n - ttiValides(m, T, 'af')) : 0;
  const tz = m && s === 'intervention' ? tasersActifs(m, T) : 0;
  const recr = Math.min(total, enRodage(z, T));
  return (i) => {
    const g = avantT + i, gl = avantG + i;
    let img = SPRITE[s], cls = '', bdg = '', titre = [];
    const recrue = gl >= total - recr;
    if (recrue) { img = 'recrue'; bdg = '<span class="ag-b v">½</span>'; titre.push('recrue en formation (à mi-efficacité)'); }
    if (s === 'intervention' && i < tz && !recrue) { img = 'inter_taser'; bdg = '<span class="ag-b y">⚡</span>'; titre.push('taser en service'); }
    if (g < sansG) { if (s === 'intervention' && !recrue) img = 'inter_sans_gilet'; cls += ' sg'; bdg = '<span class="ag-b r">!</span>'; titre.push('sans gilet valide'); }
    if (g < sansA) { cls += ' sa'; if (!bdg) bdg = '<span class="ag-b g">TTI</span>'; titre.push('sans recyclage TTI avec arme à feu'); }
    return { img: `img/agents/${img}.webp`, cls: cls + (i % 2 ? ' m' : ''), bdg, titre: titre.join(', ') };
  };
}
/** Résumé de l'équipement sous l'Intervention : gilets, recyclage TTI, tasers, recrues. */
export function resumeEquipement() {
  const z = myZone(); if (!z || !z.materiel || !S.state) return '';
  const T = S.state.turn, m = z.materiel, n = z.agents || 0;
  const g = Math.min(n, giletsValides(m, T).total), a = m.tti ? Math.min(n, ttiValides(m, T, 'af')) : n, tz = tasersActifs(m, T), r = enRodage(z, T);
  const chip = (txt, mal) => `<span class="ag-chip${mal ? ' mal' : ''}">${txt}</span>`;
  return `<div class="ag-resume">${chip(`<b>${g}/${n}</b> gilets`, g < n)}${chip(`<b>${a}/${n}</b> TTI arme`, a < n)}${tz ? chip(`<b>${tz}</b> taser${tz > 1 ? 's' : ''}`) : ''}${r ? chip(`<b>${r}</b> recrue${r > 1 ? 's' : ''} à ½`) : ''}<a href="#chef" class="ag-lien" data-action="brigade-vue" data-v="materiel">Matériel ›</a></div>`;
}
