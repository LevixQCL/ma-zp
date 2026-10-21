// L'équipe de la zone (trombinoscope) et les trophées.
import { makeRng } from './rng.js';
import { ROLE_SERVICE, bonusChef } from './constants.js';
import { CARNET_TYPES } from './central.js';

// ───── Trombinoscope ─────
export const ROLES_EQUIPE = [
  { id: 'inter', service: 'intervention', m: 'Chef de patrouille', f: 'Cheffe de patrouille', surnoms: ['Gyrophare', 'Sirène', 'le Rempart du Delta'], verbe: (n) => `${n} intervention${n > 1 ? 's' : ''} menée${n > 1 ? 's' : ''}` },
  { id: 'rech', service: 'recherche', m: 'Enquêteur', f: 'Enquêtrice', surnoms: ['Loupe', 'le Renard', 'la Mémoire du parquet'], verbe: (n) => `${n} point${n > 1 ? 's' : ''} d’enquête` },
  { id: 'prox', service: 'proximite', m: 'Agent de quartier', f: 'Agente de quartier', surnoms: ['Bonjour-Madame', 'l’Oreille du quartier', 'le Maire officieux'], verbe: (n) => `${n} tournée${n > 1 ? 's' : ''} de quartier` },
  { id: 'roul', service: 'roulage', m: 'Motard', f: 'Motarde', surnoms: ['Radar', 'Flash', 'la Terreur du ring'], verbe: (n) => `${n} contrôle${n > 1 ? 's' : ''}` },
  { id: 'admin', service: 'admin', m: 'Responsable de l’accueil', f: 'Responsable de l’accueil', surnoms: ['Tampon', 'la Paperassière', 'l’Archiviste suprême'], verbe: (n) => `${n} dossier${n > 1 ? 's' : ''} bouclé${n > 1 ? 's' : ''}` },
];
export const SEUILS_EQUIPE = [0, 25, 80, 180]; // expérience pour chaque surnom

const PRENOMS_EQ = [['Julie', 1], ['Karim', 0], ['Sofia', 1], ['Bart', 0], ['Nathalie', 1], ['Steve', 0], ['Anissa', 1], ['Pierre', 0], ['Élodie', 1], ['Hakim', 0], ['Vanessa', 1], ['Jonathan', 0], ['Mélissa', 1], ['Geoffrey', 0], ['Samira', 1], ['Dimitri', 0], ['Carine', 1], ['Wim', 0], ['Laetitia', 1], ['Grégory', 0]];
const NOMS_EQ = ['Vandenberghe', 'Lejeune', 'Peeters', 'Mathieu', 'Wauters', 'Dumont', 'Jacobs', 'Lefèbvre', 'Martens', 'Simon', 'Goossens', 'Leroy', 'Denis', 'Michiels', 'Charlier', 'Hubert'];

export function creerEquipe(uid) {
  const rng = makeRng(`equipe:${uid}`);
  const p = rng.shuffle(PRENOMS_EQ), n = rng.shuffle(NOMS_EQ);
  return ROLES_EQUIPE.map((r, i) => ({ role: r.id, prenom: p[i][0], f: p[i][1], nom: n[i], xp: 0, niveau: 0 }));
}

/**
 * Noms choisis par le joueur (profil `equipeNoms` : { role: { prenom, nom, f } } ou null pour revenir au nom d'origine).
 * Modifie l'équipe en place ; l'expérience et les surnoms ne bougent pas.
 */
export function appliquerNoms(equipe, uid, noms) {
  if (!equipe || !noms || typeof noms !== 'object') return equipe;
  const origine = creerEquipe(uid);
  const propre = (v) => String(v || '').replace(/[<>]/g, '').trim().slice(0, 20);
  for (const m of equipe) {
    if (!(m.role in noms)) continue;
    const n = noms[m.role];
    const o = origine.find((x) => x.role === m.role);
    if (!n) { if (o) { m.prenom = o.prenom; m.nom = o.nom; m.f = o.f; } continue; }
    const prenom = propre(n.prenom), nom = propre(n.nom);
    if (prenom) m.prenom = prenom;
    if (nom) m.nom = nom;
    if (n.f === 0 || n.f === 1) m.f = n.f;
  }
  return equipe;
}

/**
 * Mission du jour d'une figure (ordres déjà nettoyés) : zone de non-droit (sur un secteur où la zone envoie des agents,
 * par défaut celui où elle en envoie le plus) ou renfort (si des agents sont prêtés). null si impossible.
 */
export function missionsValides(o) {
  const brut = Array.isArray(o && o.missions) ? o.missions : (o && o.mission ? [o.mission] : []);
  const out = [], roles = new Set(), dest = new Set();
  for (const m of brut) {
    if (!m || roles.has(m.role)) continue;
    const v = missionValide({ ...o, mission: m, missions: undefined });
    if (!v) continue;
    const cle = v.type === 'nondroit' ? `nd:${v.secteur}` : 'renfort';
    if (dest.has(cle)) continue; // une figure par destination (un secteur, ou le renfort)
    roles.add(v.role); dest.add(cle); out.push(v);
  }
  return out;
}
export function missionValide(o) {
  if (o && Array.isArray(o.missions) && !o.mission) return missionsValides(o)[0] || null;
  const m = o && o.mission;
  if (!m) return null;
  if (m.type === 'nondroit') {
    const sects = Object.entries(o.secteurs || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (!sects.length) return null;
    const k = sects.some(([x]) => x === m.secteur) ? m.secteur : sects[0][0];
    return { role: m.role, type: 'nondroit', secteur: k };
  }
  if (m.type === 'renfort') return o.renfort && o.renfort.cible && o.renfort.agents > 0 ? { role: m.role, type: 'renfort' } : null;
  return null;
}
/** La figure d'un rôle dans l'équipe d'une zone. */
export const figure = (z, role) => (z.equipe || []).find((m) => m.role === role) || null;

export const roleDe = (m) => ROLES_EQUIPE.find((r) => r.id === m.role);
export const intitule = (m) => (m.f ? roleDe(m).f : roleDe(m).m);
export const surnomDe = (m) => (m.niveau > 0 ? roleDe(m).surnoms[Math.min(m.niveau, 3) - 1] : null);
export const nomComplet = (m) => `${m.prenom} ${m.nom}${surnomDe(m) ? ` « ${surnomDe(m)} »` : ''}`;

/**
 * Expérience du jour, à partir de ce que chaque service a vraiment fait.
 * gains : { inter, rech, prox, roul, admin } (nombres entiers).
 * Renvoie les montées de niveau (pour le rapport et la Gazette).
 */
export function faireProgresser(z, gains, extra = null) {
  if (!z.equipe) z.equipe = creerEquipe(z.uid);
  const montees = [];
  for (const m of z.equipe) {
    const g = Math.max(0, Math.round((gains[m.role] || 0) + ((extra && extra[m.role]) || 0)));
    m.xp += g; m._g = g;
    let niv = 0;
    for (let k = 0; k < SEUILS_EQUIPE.length; k++) if (m.xp >= SEUILS_EQUIPE[k]) niv = k;
    if (niv > m.niveau) { m.niveau = niv; montees.push(m); }
  }
  // La vedette du jour : celui ou celle qui a le plus contribué.
  const vedette = z.equipe.slice().sort((a, b) => b._g - a._g)[0];
  const ligne = vedette && vedette._g > 0 ? `Équipe : ${intitule(vedette).toLowerCase()} ${vedette.prenom} ${vedette.nom}${surnomDe(vedette) ? ` (« ${surnomDe(vedette)} »)` : ''} en vedette, ${roleDe(vedette).verbe(vedette._g)}.` : null;
  for (const m of z.equipe) delete m._g;
  return { montees, ligne };
}

// ───── Galons : à chaque surnom gagné, la figure reçoit un galon à attribuer (oct. 2026, onglet Brigade) ─────
// Trois paliers ; à chacun, deux choix exclusifs : « terrain » (A, une nouvelle façon d'agir sur les appels)
// ou « service » (B, un effet durable sur son service). Première étape : les choix sont enregistrés et affichés ;
// « terrain » ouvre une approche réservée sur l'appel du jour (engine/brigade.js), « service » agit au tour de 20:00.
const G = (nom, texte) => ({ nom, texte });
export const GALONS = {
  inter: [
    [G('Interpellation coordonnée', 'Interpeller à deux sur les appels, avec moins de risque de blessure.'), G('Patrouille rodée', 'Intervention plus efficace : +4 %.')],
    [G('Négociation de crise', 'Face à une arme : négocier, bien plus sûr que le simple dialogue.'), G('Tuteur exigeant', 'Les recrues deviennent opérationnelles en 2 jours au lieu de 4.')],
    [G('Haut risque', 'Interpellation à haut risque : gros gain, risque de blessure.'), G('Pilier', 'Intervention encore plus solide : +6 %.')],
  ],
  rech: [
    [G('Audition ciblée', 'Face à un témoin qui se tait : une question de plus.'), G('Dossiers rangés', 'Une unité de travail de plus chaque jour sur les dossiers.')],
    [G('Filature', 'Une démarche d’enquête de plus par semaine, sans prendre d’agent.'), G('Tutrice', 'Les recrues deviennent opérationnelles en 2 jours au lieu de 4.')],
    [G('Perquisition préparée', 'Après une filature réussie, une perquisition qui rapporte double.'), G('Mémoire du parquet', 'Deux unités de travail de plus chaque jour sur les dossiers.')],
  ],
  prox: [
    [G('Médiation', 'Les différends réglés pour de bon, sans suite.'), G('Tournée de confiance', 'Satisfaction +0,3 par jour avec des agents en Proximité.')],
    [G('Désamorcer', 'Une fois par semaine, un appel évité avant de tomber.'), G('Tutrice', 'Les recrues deviennent opérationnelles en 2 jours au lieu de 4.')],
    [G('Grande sœur du quartier', 'Face à une foule tendue : calmer sans intervenir.'), G('Réseau d’habitants', 'Criminalité −0,3 par jour.')],
  ],
  roul: [
    [G('Contrôle ciblé', 'Face à une fuite en voiture : un contrôle préparé, peu de risque.'), G('Radar humain', 'Amendes +5 %.')],
    [G('Poursuite encadrée', 'Prise en chasse avec moitié moins de risque pour les passants.'), G('Tuteur', 'Les recrues deviennent opérationnelles en 2 jours au lieu de 4.')],
    [G('Barrage coordonné', 'Avec une zone voisine : un fuyard chez toi peut être arrêté chez elle, et l’inverse.'), G('Prévention routière', 'Satisfaction +0,2 par jour avec des agents au Roulage.')],
  ],
  admin: [
    [G('Plainte bien prise', 'À l’accueil, la victime revient avec un détail utile.'), G('Guichet fluide', 'Paperasse des incidents −10 %.')],
    [G('Témoin en confiance', 'Les témoins qui se taisent parlent plus souvent à l’accueil.'), G('Tutrice', 'Les recrues deviennent opérationnelles en 2 jours au lieu de 4.')],
    [G('Dossier en béton', 'Une confrontation par semaine : une preuve de plus prise en compte.'), G('Cellule de crise', 'Moral +0,3 par jour.')],
  ],
};
/** Galons attribués d'une figure (liste de 'A' / 'B', palier par palier). */
export const galonsDe = (m) => (m && Array.isArray(m.galons) ? m.galons.filter((g) => g === 'A' || g === 'B').slice(0, 3) : []);
/** Galons gagnés mais pas encore attribués (un par surnom). */
export const galonsLibres = (m, liste = galonsDe(m)) => Math.max(0, Math.min(3, (m && m.niveau) || 0) - liste.length);
/** Choix lus dans les ordres : { role: ['A', 'B', ...] }, nettoyés. */
export function lireGalons(o) {
  const g = o && o.galons, out = {};
  if (!g || typeof g !== 'object') return out;
  for (const r of Object.keys(GALONS)) if (Array.isArray(g[r])) out[r] = g[r].filter((x) => x === 'A' || x === 'B').slice(0, 3);
  return out;
}
/**
 * Attribue les galons demandés : seulement des ajouts (on ne revient pas sur un palier), dans la limite des surnoms.
 * Renvoie les nouveaux choix ({ m, palier, choix }) pour le rapport.
 */
export function appliquerGalons(z, demande) {
  const faits = [];
  for (const m of z.equipe || []) {
    const voulu = demande && demande[m.role];
    if (!voulu || !GALONS[m.role]) continue;
    const cur = galonsDe(m), max = Math.min(3, m.niveau || 0);
    if (voulu.length <= cur.length || cur.some((g, i) => voulu[i] !== g)) continue;
    const nv = voulu.slice(0, max);
    for (let i = cur.length; i < nv.length; i++) faits.push({ m, palier: i, choix: nv[i] });
    if (nv.length > cur.length) m.galons = nv;
  }
  return faits;
}

// ───── Trophées ─────
export const TROPHEES = [
  { id: 'sansfaute', nom: 'Zéro raté', texte: '7 tours d’affilée sans rater un seul incident' },
  { id: 'sauveur', nom: 'Sauveur', texte: 'Venir en aide à une zone en péril' },
  { id: 'solidaire', nom: 'Solidaire', texte: 'Prêter des agents en renfort 3 fois' },
  { id: 'orchestre', nom: 'Chef d’orchestre', texte: 'Reprendre un secteur de la zone de non-droit à au moins 3 zones' },
  { id: 'liberateur', nom: 'Libérateur', texte: 'Participer à la chute du QG du milieu, au cœur de la ville' },
  { id: 'limier', nom: 'Fin limier', texte: 'Identifier l’auteur d’une affaire' },
  { id: 'menottes', nom: 'Menottes d’or', texte: 'Réaliser une arrestation' },
  { id: 'cerveau', nom: 'Cerveau', texte: 'Résoudre 3 dossiers noirs dans une saison' },
  { id: 'batisseur', nom: 'Bâtisseur', texte: 'Porter l’hôtel de police au niveau 4' },
  { id: 'veteran', nom: 'Vétéran', texte: 'Faire progresser un membre de l’équipe jusqu’à son dernier surnom' },
  { id: 'incorruptible', nom: 'Incorruptible', texte: 'Finir une saison classé, sans jamais rompre un pacte' },
  { id: 'increvable', nom: 'Increvable', texte: 'Valider ses ordres les 14 tours d’une saison' },
  // Oct. 2026 (idées de Luc) : 8 de plus, d'autres viendront.
  { id: 'rempart', nom: 'Rempart', texte: 'Repousser un gang dans la zone de non-droit' },
  { id: 'premiereligne', nom: 'Première ligne', texte: 'Participer à tous les assauts de la zone de non-droit deux soirs d’affilée' },
  { id: 'recordman', nom: 'Recordman', texte: 'Battre 10 records aux mini-jeux' },
  { id: 'erudit', nom: 'Érudit', texte: 'Réussir 50 énigmes' },
  { id: 'urgentiste', nom: 'Sur tous les fronts', texte: 'Réussir 25 incidents du jour' },
  { id: 'tresorier', nom: 'Trésorier', texte: 'Dégager 20 000 € de revenu en une journée' },
  { id: 'collection', nom: 'Collectionneur', texte: 'Débloquer 5 skins pour son commissariat' },
  { id: 'sommet', nom: 'Au sommet', texte: 'Atteindre 85 d’IPZ un soir' },
  // Central (Carte › Ma zone).
  { id: 'mainsure', nom: 'Main sûre', texte: 'Faire 50 saisies au central' },
  { id: 'tourcontrole', nom: 'Tour de contrôle', texte: 'Faire 15 points de mieux que l’adjoint en une journée de central' },
  { id: 'carnetcomplet', nom: 'Carnet complet', texte: 'Régler soi-même chaque type d’appel du central' },
];
export const TROPHEE = Object.fromEntries(TROPHEES.map((t) => [t.id, t]));

/** Donne un trophée s'il n'est pas déjà acquis. Renvoie true s'il est nouveau. */
export function donnerTrophee(z, id, season, turn) {
  z.trophees = z.trophees || [];
  if (z.trophees.some((t) => t.id === id)) return false;
  z.trophees.push({ id, s: season, t: turn });
  return true;
}

/** Trophées vérifiés à chaque tour (les deux de fin de saison sont donnés ailleurs). */
export function verifierTrophees(z) {
  const st = z.stats || {};
  const ok = [];
  if ((st.serieSansRate || 0) >= 7) ok.push('sansfaute');
  if ((st.sauvetages || 0) >= 1) ok.push('sauveur');
  if ((st.renfortsPretes || 0) >= 3) ok.push('solidaire');
  if ((st.affairesOrchestre || 0) >= 1) ok.push('orchestre');
  if ((st.decouvertes || 0) >= 1) ok.push('limier');
  if ((st.arrestations || 0) >= 1) ok.push('menottes');
  if ((st.noirs || 0) >= 3) ok.push('cerveau');
  if (z.batiments && z.batiments.bureaux >= 4) ok.push('batisseur');
  if ((z.equipe || []).some((m) => m.niveau >= 3)) ok.push('veteran');
  const c = z.carriere || {};
  if ((st.gangsRepousses || 0) >= 1) ok.push('rempart');
  if ((st.serieAssauts || 0) >= 2) ok.push('premiereligne');
  if ((c.records || 0) >= 10) ok.push('recordman');
  if ((c.enigmes || 0) >= 50) ok.push('erudit');
  if ((c.incidents || 0) >= 25) ok.push('urgentiste');
  if ((st.revenuMax || 0) >= 20) ok.push('tresorier');
  if ((z.skins || []).length >= 5) ok.push('collection');
  if ((Number(z.ipz) || 0) >= 85) ok.push('sommet');
  const cx = z.central;
  if (cx && Object.values(cx.saisies || {}).reduce((t, n) => t + n, 0) >= 50) ok.push('mainsure');
  if (cx && (cx.gainMax || 0) >= 15) ok.push('tourcontrole');
  if (cx && CARNET_TYPES.every((t) => (cx.types || {})[t] > 0)) ok.push('carnetcomplet');
  return ok;
}

/**
 * Service encadré par chaque figure ce soir : le sien, ou celui choisi dans les ordres (`postes` : { role: service }).
 * Une seule figure par service : si deux visent le même, la plus expérimentée l'encadre ; l'autre reprend le sien,
 * ou prend le service laissé libre par la première (échange).
 * Les figures en mission (`enMission` : liste de rôles) n'encadrent rien. Renvoie { service: { role, bonus } }.
 */
export function encadrement(equipe, postes = {}, enMission = []) {
  const out = {};
  const liste = (equipe || []).filter((m) => ROLE_SERVICE[m.role] && !enMission.includes(m.role))
    .map((m) => ({ m, s: (postes && postes[m.role] && Object.values(ROLE_SERVICE).includes(postes[m.role])) ? postes[m.role] : ROLE_SERVICE[m.role] }))
    .sort((a, b) => (b.m.niveau || 0) - (a.m.niveau || 0) || (b.m.xp || 0) - (a.m.xp || 0));
  const restants = [];
  for (const x of liste) { if (out[x.s]) restants.push(x); else out[x.s] = { role: x.m.role, bonus: bonusChef(x.m.niveau) }; }
  // Place prise : la figure reprend son propre service, sinon celui que la première a libéré (un échange).
  for (const x of restants) {
    const home = ROLE_SERVICE[x.m.role], libere = ROLE_SERVICE[out[x.s].role];
    const s2 = !out[home] ? home : !out[libere] ? libere : null;
    if (s2) out[s2] = { role: x.m.role, bonus: bonusChef(x.m.niveau) };
  }
  return out;
}
