// Onglet Brigade › Matériel (oct. 2026) : le magasin et l'armurerie de la zone.
// Les commandes partent avec les ordres du soir (S.draft.materiel) ; tout se règle au tour de 20:00 (engine/materiel.js).
import { S, esc, myZone, fmtK } from './common.js';
import { COULEUR_ROLE, initiales } from './equipe.js';
import { enRodage } from '../engine/brigade.js';
import { MAT, ARTICLES, creerMateriel, giletsValides, certifiesActifs, tasersActifs, fnActifs, brevetesFN, possession, auRatelier, trouGilets, facteurGilets, prixMarche, gammeDe, surplus, ttiValides, trouTTI, facteurTTI, fonction, ttiDepart } from '../engine/materiel.js';

const IMG = (k) => `img/materiel/${k}.webp`;
const ico = (k, c = '') => `<img class="mat-ico${c ? ` ${c}` : ''}" src="${IMG(k)}" alt="" loading="lazy">`;

export const ordresMatVides = () => ({ masse: [], commandes: [], lancer: null, adherer: [], certifier: false, brevetFN: false, ceder: [], recyclage: [], fonctions: {} });
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

const nomMin = (t) => (/^[A-Z0-9 ]+$/.test(t) ? t : t.toLowerCase());
const coul = (p) => (p >= 0.9 ? 'var(--green)' : p >= 0.6 ? 'var(--amber)' : 'var(--red)');
const jauge = (p) => `<span class="mt-jauge"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%;background:${coul(p)}"></i></span>`;
const info = (t) => `<p class="mt-info">${t}</p>`;
const ARM = ['taser', 'fn303', 'bodycam', 'gnep'];
const COUT_JOUR = { taser: MAT.taser.possession, fn303: MAT.fn303.possession, bodycam: MAT.bodycam.entretien };
const NOM_ARM = { taser: 'Taser', fn303: 'FN 303', bodycam: 'Bodycams', gnep: 'Casques' };

/** Commande de gilets en cours (standard ou ajustés), ou le réglage en attente du tiroir. */
function cfgDe(item) {
  const o = om();
  const c = item === 'gilets' ? o.commandes.find((x) => x.item.startsWith('gilets')) : o.commandes.find((x) => x.item === item);
  if (c) return { c, prevu: true };
  S.matCfg ||= {};
  if (!S.matCfg[item]) {
    let lots = 1;
    if (item === 'gilets') { const z = myZone(), m = matDe(z), T = S.state.turn; const dans = (m.gilets || []).filter((g) => g.fin > T + MAT.voies.centrale.delai).reduce((t, g) => t + g.n, 0); lots = Math.max(1, Math.min(MAT.lotsMax, Math.ceil(((z.agents || 0) - dans) / MAT.gilets.lot))); }
    S.matCfg[item] = { item, lots, voie: 'centrale', q: 'std' };
  }
  return { c: S.matCfg[item], prevu: false };
}
const prixCmd = (c) => ARTICLES[c.item].prix * MAT.voies[c.voie].mult * c.lots * gammeDe(c.q).prix;

/** Ce qui part ce soir avec les ordres : liste courte et coût estimé. */
function panierDuSoir(z, m, o) {
  const l = []; let cout = 0, pts = 0;
  for (const c of o.commandes) { const p = prixCmd(c); cout += p; l.push(`${c.lots * ARTICLES[c.item].lot} ${nomMin(ARTICLES[c.item].nom)}`); }
  for (const k of o.masse) { pts += MAT[k].cout; l.push(k === 'tenue' ? 'polos neufs' : 'chaussures'); }
  const mt = fonction(z, 'moniteurTaser'), pb = MAT.taser.cert.prix * (mt ? 0.5 : 1);
  if (o.certifier) { cout += pb; l.push('brevet taser'); }
  if (o.brevetFN) { cout += pb; l.push('brevet FN 303'); }
  const mo = fonction(z, 'moniteurTTI'), stand = !!(z.infra && z.infra.tir);
  for (const r of o.recyclage || []) { cout += r.groupes * MAT.tti[r.type].prix * (mo ? 0.5 : 1) * (r.type === 'af' && stand ? 0.5 : 1); l.push(`TTI ${r.type === 'af' ? 'arme' : 'sans arme'} ×${r.groupes * MAT.tti.groupe}`); }
  if (o.adherer.length) l.push(`marché${o.adherer.length > 1 ? 's' : ''} (payé à la clôture)`);
  if (o.lancer) l.push(`marché ${nomMin(ARTICLES[o.lancer.item].nom)} lancé`);
  for (const c of o.ceder || []) l.push(`${c.n} gilets cédés`);
  if (!l.length) return '';
  return `<div class="mt-panier"><div class="col" style="gap:1px;min-width:0"><span class="small"><b style="color:var(--amber)">Ce soir · ${fmtK(cout)}</b>${pts ? ` · ${pts} pts de masse` : ''}</span><span class="tiny muted mt-ellipse">${esc(l.join(' · '))}</span></div><button type="button" class="btn small ghost" data-action="mat-vider">Vider</button></div>`;
}

export function materielVueHtml() {
  const z = myZone(), st = S.state, T = st.turn, m = matDe(z), o = om(), n = z.agents || 0, zz = { ...z, materiel: m };
  const g = giletsValides(m, T), sans = Math.max(0, n - g.total), bientot = (m.gilets || []).filter((x) => x.fin > T && x.fin <= T + 2).reduce((t, x) => t + x.n, 0);
  const mtti = m.tti ? m : { ...m, tti: ttiDepart(n || 20, T) };
  const af = Math.min(n, ttiValides(mtti, T, 'af')), saf = Math.min(n, ttiValides(mtti, T, 'saf'));
  const enCmd = (m.commandes || []);
  const marches = (st.marches || []).filter((x) => !x.clos && x.ferme >= T);
  const manquent = Object.values(st.zones || {}).filter((x) => x.uid !== z.uid && x.materiel && trouGilets(x, T) > 0.2);
  const figs = (z.equipe || []).filter((f) => (f.niveau || 0) >= 1), fct = { ...(z.fonctions || {}), ...(o.fonctions || {}) };
  const nFct = Object.keys(MAT.fonctions).filter((k) => fct[k]).length;
  const srv = { taser: tasersActifs(m, T), fn303: fnActifs(m, T) };
  const prevu = (k) => k === 'gilets' ? o.commandes.some((c) => c.item.startsWith('gilets')) || o.adherer.length > 0
    : k === 'tti' ? (o.recyclage || []).length > 0 : k === 'tenue' ? o.masse.length > 0
    : o.commandes.some((c) => c.item === k) || (k === 'taser' && o.certifier) || (k === 'fn303' && o.brevetFN);

  // Ce qui cloche, en pastilles sur la bannière (un tap ouvre le bon tiroir).
  const al = [];
  const chip = (cls, k, t) => `<button type="button" class="mt-chip ${cls}" data-action="mat-ouvrir" data-k="${k}">${t}</button>`;
  if (sans) al.push(chip('r', 'gilets', `${sans} sans gilet`));
  if (bientot) al.push(chip('a', 'gilets', `${bientot} gilet${bientot > 1 ? 's' : ''} périme${bientot > 1 ? 'nt' : ''} sous 2 j`));
  if (af < n) al.push(chip(facteurTTI(zz, T) < 1 ? 'r' : 'a', 'tti', `${n - af} TTI arme à recycler`));
  if (trouTTI(zz, T, 'saf') > MAT.tti.seuilSAF) al.push(chip('a', 'tti', 'TTI sans arme en retard'));
  if (m.tenue < 45) al.push(chip('a', 'tenue', 'Polos usés'));
  if (m.chaussures < 50) al.push(chip('a', 'tenue', 'Chaussures usées'));
  if (m.masse >= MAT.masse.max && !o.masse.length) al.push(chip('a', 'tenue', 'Masse pleine'));
  for (const k of ['taser', 'fn303']) if ((m[k] || 0) > srv[k] && srv[k] < MAT[k].max) al.push(chip('a', k, `${NOM_ARM[k]} sans breveté`));
  if (auRatelier(m, T)) al.unshift(chip('r', 'taser', 'Armurerie au râtelier (budget)'));
  if (!al.length) al.push('<span class="mt-chip ok">Tout le monde est équipé</span>');

  const tuile = (k, img, v, l, extra, etat) => `<button type="button" class="mt-tuile${etat ? ` ${etat}` : ''}" data-action="mat-ouvrir" data-k="${k}">${prevu(k) ? '<span class="mt-past c" title="prévu ce soir">+</span>' : ''}<img src="${img}" alt="" loading="lazy">${v ? `<b>${v}</b>` : ''}${extra || ''}<span class="mt-l">${l}</span></button>`;
  const etat = (p) => (p < 0.7 ? 'mal' : p < 1 ? 'moyen' : '');
  const pg = n ? g.total / n : 1, pa = n ? af / n : 1;
  const points = (k) => `<span class="mt-pts">${Array.from({ length: MAT[k].max }, (_, i) => `<i${i < srv[k] ? ' class="on"' : ''}></i>`).join('')}</span>`;
  const ligne = (k, img, titre, sous, badge) => `<button type="button" class="mt-ligne" data-action="mat-ouvrir" data-k="${k}">${img}<span class="col" style="gap:1px;min-width:0"><span>${titre}</span><span class="tiny muted">${sous}</span></span><span class="mt-badge">${badge || ''}</span><span class="mt-chev" aria-hidden="true">›</span></button>`;
  const icTxt = (t) => `<span class="mt-ic" aria-hidden="true">${t}</span>`;
  const marcheSous = marches.length ? `${marches.length} ouvert${marches.length > 1 ? 's' : ''} · jusqu’à −${Math.round((1 - prixMarche(Math.max(...marches.map((x) => Object.keys(x.part).length)) + 1)) * 100)} %` : 'aucun ouvert · lance le tien';
  const neuf = S.matSheetNeuf; S.matSheetNeuf = false;

  return `<section class="col" style="gap:12px" aria-label="Magasin et armurerie">
    <div class="mt-banniere" style="background-image:url(${IMG('banniere')})"><div class="mt-alertes">${al.join('')}</div></div>
    ${panierDuSoir(z, m, o)}
    <h2 class="mt-h">Ta brigade</h2>
    <div class="mt-etat">
      ${tuile('gilets', IMG('gilets'), `${g.total}/${n}`, 'gilets valides', jauge(pg) + (sans ? `<span class="mt-past r">${sans}</span>` : ''), etat(pg))}
      ${tuile('tti', 'img/agents/inter.webp', `${af}/${n}`, saf < n ? `TTI arme · sans arme ${saf}` : 'TTI à jour', jauge(pa), etat(pa))}
      ${tuile('tenue', IMG('tenue'), '', `tenue · ${m.masse} pts`, `<span class="mt-duo"><span>Polos</span>${jauge(m.tenue / 100)}<span>Chauss.</span>${jauge(m.chaussures / 100)}</span>`, m.tenue < 45 || m.chaussures < 50 ? 'moyen' : '')}
    </div>
    <h2 class="mt-h">Armurerie${possession(m) ? ` · ${fmtK(possession(m))} par jour` : ''}</h2>
    <div class="mt-arm">
      ${tuile('taser', IMG('taser'), `${srv.taser}/${m.taser || 0}`, 'Taser', points('taser'))}
      ${tuile('fn303', IMG('fn303'), `${srv.fn303}/${m.fn303 || 0}`, 'FN 303', points('fn303'))}
      ${tuile('bodycam', IMG('bodycam'), `${m.bodycam || 0}`, 'Bodycams')}
      ${tuile('gnep', IMG('gnep'), `${m.gnep || 0}`, 'Casques')}
    </div>
    <div class="mt-lignes">
      ${ligne('marches', `<img src="${IMG('marche')}" alt="">`, 'Marchés du district', marcheSous, o.adherer.length || o.lancer ? 'prévu' : marches.some((x) => !x.part[z.uid]) ? 'Rejoindre' : '')}
      ${ligne('zones', icTxt('⇄'), 'Entre zones', manquent.length ? `${manquent.length} zone${manquent.length > 1 ? 's' : ''} manque${manquent.length > 1 ? 'nt' : ''} de gilets` : 'aucune zone en manque', (o.ceder || []).length ? 'prévu' : manquent.length ? 'Aider' : '')}
      ${ligne('fonctions', `<img src="img/agents/admin.webp" alt="">`, 'Fonctions', figs.length ? `${nFct}/${Object.keys(MAT.fonctions).length} tenues par tes figures` : 'dès le premier surnom d’une figure', '')}
      ${enCmd.length ? ligne('livraisons', icTxt('🚚'), 'Livraisons', esc(enCmd.map((c) => `${c.lots * ARTICLES[c.item].lot} ${nomMin(ARTICLES[c.item].nom)} ${c.arrive <= T + 1 ? 'demain' : `dans ${c.arrive - T} j`}`).join(' · ')), '') : ''}
    </div>
    ${S.matSheet ? tiroirHtml(S.matSheet, z, m, T, o, neuf) : ''}
  </section>`;
}

/** Tiroir du bas : tout le détail d'un élément, une ligne d'explication, les choix en boutons. */
function tiroirHtml(k, z, m, T, o, neuf) {
  const tete = (img, titre, sous) => `<div class="mt-tete"><img src="${img}" alt=""><div class="col" style="gap:2px;min-width:0"><h2 class="bs-titre">${titre}</h2><span class="small muted">${sous}</span></div><button type="button" class="mt-fermer" data-action="mat-fermer" aria-label="Fermer">×</button></div>`;
  let corps = '';
  if (k === 'gilets') corps = tiroirGilets(z, m, T, tete);
  else if (k === 'tti') corps = tete('img/agents/inter.webp', 'Recyclage TTI', `valable ${MAT.tti.validite + (fonction(z, 'moniteurTTI') ? 7 : 0)} jours`) + ttiHtml(z, m, T, o);
  else if (k === 'tenue') corps = tiroirTenue(z, m, T, o, tete);
  else if (ARM.includes(k)) corps = tiroirArme(k, z, m, T, o, tete);
  else if (k === 'marches') corps = tete(IMG('marche'), 'Marchés du district', `−${Math.round(MAT.marche.remiseParZone * 100)} % par zone, jusqu’à −${Math.round(MAT.marche.remiseMax * 100)} %`) + marchesHtml(z, T, o);
  else if (k === 'zones') { const sp = surplus({ ...z, materiel: m }, T); corps = tete(IMG('gilets'), 'Entre zones', `ton surplus : ${sp.gilets} gilet${sp.gilets > 1 ? 's' : ''}, ${sp.taser} taser${sp.taser > 1 ? 's' : ''}`) + entreZonesHtml(z, T, o); }
  else if (k === 'fonctions') corps = tete('img/agents/admin.webp', 'Fonctions', 'une figure par fonction, dès son premier surnom') + fonctionsHtml(z, o);
  else if (k === 'livraisons') corps = tete(IMG('marche'), 'Livraisons', 'commandes en route') + (m.commandes || []).map((c) => `<div class="mt-rang"><img src="${IMG(c.item)}" alt=""><span class="col" style="gap:1px"><span class="small"><b>${c.lots * ARTICLES[c.item].lot} ${esc(nomMin(ARTICLES[c.item].nom))}</b></span><span class="tiny muted">${c.arrive <= T + 1 ? 'livré demain soir' : `livré dans ${c.arrive - T} jours`}</span></span></div>`).join('') + (m.hs ? info(`${m.hs} objet${m.hs > 1 ? 's' : ''} perdu${m.hs > 1 ? 's' : ''} en intervention cette saison.`) : '');
  return `<div class="bs-voile${neuf ? '' : ' mt-fixe'}" data-action="mat-fermer" aria-hidden="true"></div>
    <section class="bs mt-bs${neuf ? '' : ' mt-fixe'}" role="dialog" aria-modal="true"><span class="bs-poignee" aria-hidden="true"></span>${corps}</section>`;
}

const segc = (action, item, opts, val) => `<div class="mt-seg" role="group">${opts.map(([v, l, sous]) => `<button type="button" class="${v === val ? 'on' : ''}" data-action="${action}" data-k="${item}" data-v="${v}" aria-pressed="${v === val}">${l}${sous ? `<small>${sous}</small>` : ''}</button>`).join('')}</div>`;
const pas = (action, item, val, unite, max, extra = '') => `<div class="mt-pas"><button type="button" data-action="${action}" data-k="${item}" data-d="-1" ${val <= 1 ? 'disabled' : ''} aria-label="Moins">−</button><b>${val}</b><span class="small muted grow">${unite}</span><button type="button" data-action="${action}" data-k="${item}" data-d="1" ${val >= max ? 'disabled' : ''} aria-label="Plus">+</button>${extra}</div>`;
function blocCommande(item, avecVoie) {
  const { c, prevu } = cfgDe(item), a = ARTICLES[c.item];
  const gam = Object.entries(MAT.gammes).map(([v, q]) => [v, q.nom, item === 'gilets' ? `${q.validite} j` : q.prix === 1 ? 'prix normal' : `${q.prix < 1 ? '−' : '+'}${Math.round(Math.abs(1 - q.prix) * 100)} %`]);
  return `${avecVoie ? `<div class="mt-choix"><span class="tiny muted">Livraison</span>${segc('mat-c-voie', item, [['centrale', 'Centrale', `${MAT.voies.centrale.delai} jours`], ['negociee', 'Négociée', `demain, +${Math.round((MAT.voies.negociee.mult - 1) * 100)} %`]], c.voie)}</div>` : ''}
    <div class="mt-choix"><span class="tiny muted">Fournisseur</span>${segc('mat-c-gamme', item, gam, c.q || 'std')}</div>
    ${item === 'gilets' ? `<div class="mt-choix"><span class="tiny muted">Modèle</span>${segc('mat-c-modele', item, [['gilets', 'Standard', ''], ['gilets_ajustes', 'Ajusté', 'moins de blessures, moral +']], c.item)}</div>` : ''}
    ${pas('mat-c-lots', item, c.lots, `${a.lot > 1 ? `lot${c.lots > 1 ? 's' : ''} · ${c.lots * a.lot} ${esc(nomMin(a.nom))}` : 'à acheter'}`, MAT.lotsMax)}
    <div class="mt-action"><span class="mt-prix">${fmtK(prixCmd(c))}<small>payé ce soir à 20:00</small></span><button type="button" class="btn ${prevu ? 'ghost' : 'primary'}" data-action="mat-c-ok" data-k="${item}">${prevu ? 'Retirer' : 'Commander'}</button></div>`;
}
function tiroirGilets(z, m, T, tete) {
  const g = giletsValides(m, T), n = z.agents || 0, fg = facteurGilets({ ...z, materiel: m }, T);
  return `${tete(IMG('gilets'), 'Gilets pare-balles', `${g.total} valides sur ${n}${g.ajustes ? `, dont ${g.ajustes} ajustés` : ''}`)}
    ${grilleGilets(m, z, T)}
    <div class="mat-leg"><span class="ok">valide</span><span class="per">périme sous 2 j</span><span class="sans">sans gilet</span><span class="aj">ajusté</span></div>
    ${info(fg < 1 ? `<b style="color:var(--red)">Intervention −${Math.round((1 - fg) * 100)} % : sans gilet, l’agent refuse d’intervenir.</b>` : 'Sans gilet, l’agent refuse d’intervenir. Un gilet arrête souvent le coup, puis il est hors service.')}
    ${blocCommande('gilets', true)}
    ${m.inspection && !m.inspection.ok ? info(`<span style="color:var(--amber)">Inspection du jour ${m.inspection.t} : remarques sur les gilets.</span>`) : ''}`;
}
function tiroirTenue(z, m, T, o, tete) {
  const rang = (k, nom, v) => { const on = o.masse.includes(k); return `<div class="mt-rang"><img src="${IMG(k)}" alt=""><span class="col grow" style="gap:4px;min-width:0"><span class="small"><b>${nom}</b> · ${v} %</span>${jauge(v / 100)}</span><button type="button" class="btn small ${on ? 'on' : 'ghost'}" data-action="mat-masse" data-k="${k}" ${m.masse < MAT[k].cout && !on ? 'disabled' : ''}>${on ? 'Prévu ✓' : `Neufs · ${MAT[k].cout} pts`}</button></div>`; };
  return `${tete(IMG('tenue'), 'Tenue', `masse : ${m.masse}/${MAT.masse.max} pts, +${MAT.masse.parJour} par jour`)}
    ${rang('tenue', 'Polos et t-shirts', m.tenue)}${rang('chaussures', 'Chaussures', m.chaussures)}
    ${info(`Tenue usée : moral en baisse. Chaussures usées : plus de blessures. Les points non utilisés sont perdus en fin de saison.`)}`;
}
function tiroirArme(k, z, m, T, o, tete) {
  const EFF = { taser: 'Ouvre « Neutraliser au taser » sur l’appel du jour (arme, fuite, foule).', fn303: 'Même vocation que le taser, plus de portée : « Tir FN 303 à distance » (arme, foule).', bodycam: 'Moins de plaintes, approches « procédure » +5 %.', gnep: 'Ouvre « Cordon casqué » face aux foules. Au non-droit : plus de force, moins de blessés.' };
  const brev = k === 'taser' || k === 'fn303';
  const nb = k === 'taser' ? certifiesActifs(m, T) : k === 'fn303' ? brevetesFN(m, T) : 0, srv = k === 'taser' ? tasersActifs(m, T) : k === 'fn303' ? fnActifs(m, T) : 0;
  const on = k === 'taser' ? o.certifier : o.brevetFN, mt = fonction(z, 'moniteurTaser');
  const sous = brev ? `${srv} en service · ${m[k] || 0} en armurerie · ${nb} brevetés` : `${m[k] || 0} en service`;
  return `${tete(IMG(k), ARTICLES[k].nom, sous)}
    ${info(EFF[k] + (brev ? ` Il faut ${MAT[k].cert.agents} agents brevetés par appareil en service.` : ''))}
    ${COUT_JOUR[k] ? info(`Chaque jour : ${fmtK(COUT_JOUR[k])} par ${k === 'bodycam' ? 'caméra' : 'appareil'} (${k === 'taser' ? 'licence et cartouches' : k === 'fn303' ? 'munitions' : 'stockage des vidéos'}). Sans budget, il reste au râtelier.`) : ''}
    ${blocCommande(k, false)}
    ${brev ? `<div class="mt-rang"><img src="img/agents/inter_taser.webp" alt=""><span class="col grow" style="gap:1px;min-width:0"><span class="small"><b>Breveter ${MAT[k].cert.agents} agents</b> · ${fmtK(MAT[k].cert.prix * (mt ? 0.5 : 1))}</span><span class="tiny muted">1 jour de formation · valable ${mt ? 21 : MAT[k].cert.validite} jours</span></span><button type="button" class="btn small ${on ? 'on' : 'ghost'}" data-action="${k === 'taser' ? 'mat-cert' : 'mat-cert-fn'}" ${!m[k] ? 'disabled' : ''}>${on ? 'Prévu ✓' : 'Former'}</button></div>` : ''}`;
}
function marchesHtml(z, T, o) {
  const st = S.state, marches = (st.marches || []).filter((x) => !x.clos && x.ferme >= T), monMarche = marches.find((x) => x.lanceur === z.uid);
  const nomZ = (u) => (u === z.uid ? 'ta zone' : (st.zones[u] && st.zones[u].nom) || 'une zone');
  const ouverts = marches.map((x) => { const nz = Object.keys(x.part).length, a = ARTICLES[x.item], moi = !!x.part[z.uid], veut = o.adherer.find((y) => y.id === x.id);
    return `<div class="mt-rang"><img src="${IMG(x.item)}" alt=""><span class="col grow" style="gap:1px;min-width:0"><span class="small"><b>${esc(a.nom)}</b> · ${esc(nomZ(x.lanceur))}</span><span class="tiny muted">${nz} zone${nz > 1 ? 's' : ''} · −${Math.round((1 - prixMarche(nz)) * 100)} % · ferme ${x.ferme === T ? 'ce soir' : x.ferme - T === 1 ? 'demain' : `dans ${x.ferme - T} j`}${moi ? ` · ta part : ${x.part[z.uid]} lot${x.part[z.uid] > 1 ? 's' : ''}` : ''}</span></span>
      ${moi ? '<span class="tiny muted">inscrit</span>' : `<button type="button" class="btn small ${veut ? 'on' : 'ghost'}" data-action="mat-adh" data-id="${esc(x.id)}">${veut ? 'Rejoint ✓' : 'Rejoindre'}</button>`}</div>`; }).join('');
  return `${ouverts || info('Aucun marché ouvert. Lance le tien : les autres zones ont deux jours pour le rejoindre.')}
    <div class="mt-choix"><span class="tiny muted">Lancer un marché · +${MAT.marche.psLanceur} PS par zone qui le rejoint</span>
    <div class="mt-arm">${['gilets', 'taser', 'bodycam', 'gnep'].map((k) => `<button type="button" class="mt-tuile petit${o.lancer && o.lancer.item === k ? ' choisi' : ''}" data-action="mat-lancer" data-k="${k}" ${monMarche ? 'disabled' : ''}><img src="${IMG(k)}" alt=""><span class="mt-l">${NOM_ARM[k] || 'Gilets'}</span></button>`).join('')}</div></div>
    ${o.lancer ? `<div class="mt-pas"><button type="button" data-action="mat-lancer-lots" data-d="-1" ${o.lancer.lots <= 1 ? 'disabled' : ''} aria-label="Moins">−</button><b>${o.lancer.lots}</b><span class="small muted grow">lot${o.lancer.lots > 1 ? 's' : ''} pour toi</span><button type="button" data-action="mat-lancer-lots" data-d="1" aria-label="Plus">+</button></div>` : ''}
    ${info(`Payé à la clôture, livré ${MAT.marche.livraison} jours après.`)}`;
}

/** Recyclage TTI avec et sans arme à feu : qui est à jour, groupes envoyés ce soir. */
function ttiHtml(z, m0, T, o) {
  const m = m0.tti ? m0 : { ...m0, tti: ttiDepart(z.agents || 20, T) }, n = z.agents || 0, zz = { ...z, materiel: m };
  const mo = fonction(z, 'moniteurTTI'), stand = !!(z.infra && z.infra.tir);
  const ligne = (type) => {
    const v = Math.min(n, ttiValides(m, T, type)), bientot = (m.tti[type] || []).filter((x) => x.fin > T && x.fin <= T + 3).reduce((s, x) => s + x.n, 0);
    const r = (o.recyclage || []).find((x) => x.type === type), g = r ? r.groupes : 0;
    const prix = MAT.tti[type].prix * (mo ? 0.5 : 1) * (type === 'af' && stand ? 0.5 : 1);
    return `<div class="mt-choix"><div class="mat-jauge"><span>${type === 'af' ? 'Avec arme' : 'Sans arme'}</span><span class="barre"><i style="width:${n ? Math.round((v / n) * 100) : 100}%;background:${coul(n ? v / n : 1)}"></i></span><b>${v}/${n}</b></div>
      ${bientot ? `<span class="tiny" style="color:var(--amber)">${bientot} à recycler d’ici 3 jours</span>` : ''}
      <div class="mt-pas"><button type="button" data-action="mat-tti" data-t="${type}" data-d="-1" ${!g ? 'disabled' : ''} aria-label="Un groupe de moins">−</button><b>${g}</b><span class="small muted grow">groupe${g > 1 ? 's' : ''} de ${MAT.tti.groupe} · ${fmtK(prix)} le groupe</span><button type="button" data-action="mat-tti" data-t="${type}" data-d="1" ${g >= MAT.tti.groupesMax ? 'disabled' : ''} aria-label="Un groupe de plus">+</button></div></div>`;
  };
  const ft = facteurTTI(zz, T);
  return `${ligne('af')}${ligne('saf')}
    ${info(`${ft < 1 ? `<b style="color:var(--red)">Intervention −${Math.round((1 - ft) * 100)} %.</b> ` : ''}Sans recyclage avec arme, l’agent laisse son arme. Un absent par groupe demain${stand ? ' (stand de tir : moitié prix)' : ''}${mo ? `. Moniteur : ${esc(mo.prenom)} ${esc(mo.nom)}` : ''}.`)}`;
}

/** Fonctions matériel : une figure (dès son premier surnom) par fonction. */
function fonctionsHtml(z, o) {
  const figs = (z.equipe || []).filter((m) => (m.niveau || 0) >= 1);
  if (!figs.length) return info('Une figure peut prendre une fonction matériel dès son premier surnom (vue Équipe).');
  const cur = { ...(z.fonctions || {}), ...(o.fonctions || {}) };
  return Object.entries(MAT.fonctions).map(([k, f]) => {
    const role = cur[k], tient = role && figs.find((m) => m.role === role);
    const boutons = figs.map((m) => `<button type="button" class="mat-fig${role === m.role ? ' on' : ''}" data-action="mat-fonction" data-f="${k}" data-role="${m.role}" style="--c:${COULEUR_ROLE[m.role]}" title="${esc(m.prenom)} ${esc(m.nom)}" aria-pressed="${role === m.role}">${esc(initiales(m))}</button>`).join('');
    return `<div class="mat-fonction"><div class="col" style="gap:2px;min-width:0"><span class="small"><b>${esc(f.nom)}</b>${tient ? ` · ${esc(tient.prenom)} ${esc(tient.nom)}` : ''}</span><span class="tiny muted">${esc(f.texte)}</span></div><div class="row" style="gap:4px;flex-wrap:wrap">${boutons}</div></div>`;
  }).join('') + info('Une figure ne tient qu’une fonction. Effet ce soir à 20:00.');
}

/** Entre zones : les zones qui manquent de gilets, ce que tu leur cèdes ce soir. */
function entreZonesHtml(z, T, o) {
  const st = S.state, sp = surplus({ ...z, materiel: matDe(z) }, T);
  const manquent = Object.values(st.zones || {}).filter((x) => x.uid !== z.uid && x.materiel && trouGilets(x, T) > 0.2)
    .map((x) => ({ x, t: trouGilets(x, T), besoin: Math.ceil(trouGilets(x, T) * (x.agents || 0)) })).sort((a, b) => b.t - a.t).slice(0, 4);
  const lignes = manquent.map(({ x, t, besoin }) => {
    const c = (o.ceder || []).find((y) => y.cible === x.uid && y.item === 'gilets'), n = Math.min(sp.gilets, besoin);
    return `<div class="mt-rang"><img src="img/agents/inter_sans_gilet.webp" alt=""><span class="col grow" style="gap:1px;min-width:0"><span class="small"><b>${esc(x.nom || 'Zone')}</b> · ${besoin} sans gilet</span><span class="tiny muted">${t > MAT.gilets.refus ? 'ses agents refusent d’intervenir' : 'bientôt en difficulté'}</span></span>
      ${n > 0 ? `<button type="button" class="btn small ${c ? 'on' : 'ghost'}" data-action="mat-ceder" data-cible="${esc(x.uid)}" data-n="${n}">${c ? `${c.n} cédés ✓` : `Céder ${n}`}</button>` : '<span class="tiny muted">pas de surplus</span>'}</div>`;
  }).join('');
  return `${lignes || info('Aucune zone ne manque de gilets pour l’instant.')}
    ${info(`1 PS pour 2 objets cédés (${MAT.ceder.psMax} au plus), +${MAT.ceder.rep} réputation si leurs agents refusaient d’intervenir.`)}`;
}

/** Clics de la vue Matériel. Renvoie true si l'action a été traitée. */
export function actionMateriel(a, el) {
  if (!a.startsWith('mat-')) return false;
  if (a === 'mat-ouvrir') { S.matSheet = el.dataset.k; S.matSheetNeuf = true; return true; }
  if (a === 'mat-fermer') { S.matSheet = null; return true; }
  if (!S.draft) return false;
  const o = om(), z = myZone(), m = matDe(z);
  if (a.startsWith('mat-c-')) {
    const item = el.dataset.k, { c, prevu } = cfgDe(item);
    if (a === 'mat-c-voie') c.voie = el.dataset.v;
    if (a === 'mat-c-gamme') c.q = el.dataset.v;
    if (a === 'mat-c-modele') c.item = el.dataset.v;
    if (a === 'mat-c-lots') c.lots = Math.max(1, Math.min(MAT.lotsMax, c.lots + Number(el.dataset.d)));
    if (a === 'mat-c-ok') {
      if (prevu) { o.commandes = o.commandes.filter((x) => x !== c); S.matCfg[item] = { ...c }; }
      else { o.commandes = o.commandes.filter((x) => (item === 'gilets' ? !x.item.startsWith('gilets') : x.item !== item)); o.commandes.push({ ...c }); S.matSheet = null; }
    }
    if (!prevu && a !== 'mat-c-ok') return true; // réglage seulement : rien ne part encore
  }
  if (a === 'mat-vider') { S.draft.materiel = { ...ordresMatVides(), fonctions: o.fonctions || {} }; S.matCfg = {}; }
  if (a === 'mat-masse') { const k = el.dataset.k; o.masse = o.masse.includes(k) ? o.masse.filter((x) => x !== k) : [...o.masse, k]; if (o.masse.reduce((s, x) => s + MAT[x].cout, 0) > m.masse) o.masse = o.masse.filter((x) => x !== k); }
  if (a === 'mat-cert') o.certifier = !o.certifier;
  if (a === 'mat-cert-fn') o.brevetFN = !o.brevetFN;
  if (a === 'mat-tti') { o.recyclage ||= []; const t = el.dataset.t; let r = o.recyclage.find((x) => x.type === t); if (!r) { r = { type: t, groupes: 0 }; o.recyclage.push(r); } r.groupes = Math.max(0, Math.min(MAT.tti.groupesMax, r.groupes + Number(el.dataset.d))); o.recyclage = o.recyclage.filter((x) => x.groupes > 0); }
  if (a === 'mat-fonction') { o.fonctions ||= {}; const f = el.dataset.f, role = el.dataset.role, cur = { ...(z.fonctions || {}), ...o.fonctions };
    if (cur[f] === role) o.fonctions[f] = null; else { for (const k of Object.keys(cur)) if (cur[k] === role && k !== f) o.fonctions[k] = null; o.fonctions[f] = role; } }
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
const INFO_PION = {
  'recrue en formation (à mi-efficacité)': '½ Recrue en formation : efficace à moitié pendant quelques jours.',
  'taser en service': '⚡ Part avec un taser (agent breveté).',
  'FN 303 en service': 'FN Part avec un FN 303 (agent breveté).',
  'sans gilet valide': '! Pas de gilet pare-balles valide : risque de blessure plus élevé, moral en baisse.',
  'sans recyclage TTI avec arme à feu': 'TTI Recyclage arme à feu périmé : trop d’agents dans ce cas freinent l’Intervention.',
};
const SPRITE = { intervention: 'inter', proximite: 'prox', recherche: 'rech', roulage: 'roul', admin: 'admin' };
export function agentsService(s) {
  const z = myZone(); if (!z || !S.state || !S.draft) return () => ({ img: `img/agents/${SPRITE[s]}.webp`, cls: '', bdg: '', titre: '', info: '' });
  const T = S.state.turn, m = z.materiel, n = z.agents || 0, alloc = S.draft.alloc || {};
  const terrain = ['intervention', 'roulage', 'proximite'];
  const avantT = terrain.includes(s) ? terrain.slice(0, terrain.indexOf(s)).reduce((t, k) => t + (Number(alloc[k]) || 0), 0) : 0;
  const ordre = ['intervention', 'proximite', 'recherche', 'roulage', 'admin'];
  const total = ordre.reduce((t, k) => t + (Number(alloc[k]) || 0), 0);
  const avantG = ordre.slice(0, ordre.indexOf(s)).reduce((t, k) => t + (Number(alloc[k]) || 0), 0);
  const sansG = m && terrain.includes(s) ? Math.max(0, n - giletsValides(m, T).total) : 0;
  const sansA = m && m.tti && terrain.includes(s) ? Math.max(0, n - ttiValides(m, T, 'af')) : 0;
  const tz = m && s === 'intervention' ? tasersActifs(m, T) : 0, fz = m && s === 'intervention' ? fnActifs(m, T) : 0;
  const recr = Math.min(total, enRodage(z, T));
  return (i) => {
    const g = avantT + i, gl = avantG + i;
    let img = SPRITE[s], cls = '', bdg = '', titre = [];
    const recrue = gl >= total - recr;
    if (recrue) { img = 'recrue'; bdg = '<span class="ag-b v">½</span>'; titre.push('recrue en formation (à mi-efficacité)'); }
    if (s === 'intervention' && i < tz && !recrue) { img = 'inter_taser'; bdg = '<span class="ag-b y">⚡</span>'; titre.push('taser en service'); }
    else if (s === 'intervention' && i < tz + fz && !recrue) { bdg = '<span class="ag-b y">FN</span>'; titre.push('FN 303 en service'); }
    if (g < sansG) { if (s === 'intervention' && !recrue) img = 'inter_sans_gilet'; cls += ' sg'; bdg = '<span class="ag-b r">!</span>'; titre.push('sans gilet valide'); }
    if (g < sansA) { cls += ' sa'; if (!bdg) bdg = '<span class="ag-b g">TTI</span>'; titre.push('sans recyclage TTI avec arme à feu'); }
    // Explication affichée en touchant le pion (téléphone : pas de survol).
    const info = titre.map((t) => INFO_PION[t]).filter(Boolean).join('\n') + (titre.some((t) => /gilet|TTI/.test(t)) ? '\nÀ régler dans Matériel.' : '');
    return { img: `img/agents/${img}.webp`, cls: cls + (i % 2 ? ' m' : ''), bdg, titre: titre.join(', '), info };
  };
}
/** Résumé de l'équipement sous l'Intervention : gilets, recyclage TTI, tasers, recrues. */
export function resumeEquipement() {
  const z = myZone(); if (!z || !z.materiel || !S.state) return '';
  const T = S.state.turn, m = z.materiel, n = z.agents || 0;
  const g = Math.min(n, giletsValides(m, T).total), a = m.tti ? Math.min(n, ttiValides(m, T, 'af')) : n, tz = tasersActifs(m, T), fz = fnActifs(m, T), r = enRodage(z, T);
  const chip = (txt, mal) => `<span class="ag-chip${mal ? ' mal' : ''}">${txt}</span>`;
  return `<div class="ag-resume">${chip(`<b>${g}/${n}</b> gilets`, g < n)}${chip(`<b>${a}/${n}</b> TTI arme`, a < n)}${tz ? chip(`<b>${tz}</b> taser${tz > 1 ? 's' : ''}`) : ''}${fz ? chip(`<b>${fz}</b> FN 303`) : ''}${r ? chip(`<b>${r}</b> recrue${r > 1 ? 's' : ''} à ½`) : ''}<a href="#chef" class="ag-lien" data-action="brigade-vue" data-v="materiel">Matériel ›</a></div>`;
}
