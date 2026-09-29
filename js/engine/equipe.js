// L'équipe de la zone (trombinoscope) et les trophées.
import { makeRng } from './rng.js';

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

export const roleDe = (m) => ROLES_EQUIPE.find((r) => r.id === m.role);
export const intitule = (m) => (m.f ? roleDe(m).f : roleDe(m).m);
export const surnomDe = (m) => (m.niveau > 0 ? roleDe(m).surnoms[Math.min(m.niveau, 3) - 1] : null);
export const nomComplet = (m) => `${m.prenom} ${m.nom}${surnomDe(m) ? ` « ${surnomDe(m)} »` : ''}`;

/**
 * Expérience du jour, à partir de ce que chaque service a vraiment fait.
 * gains : { inter, rech, prox, roul, admin } (nombres entiers).
 * Renvoie les montées de niveau (pour le rapport et la Gazette).
 */
export function faireProgresser(z, gains) {
  if (!z.equipe) z.equipe = creerEquipe(z.uid);
  const montees = [];
  for (const m of z.equipe) {
    const g = Math.max(0, Math.round(gains[m.role] || 0));
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

// ───── Trophées ─────
export const TROPHEES = [
  { id: 'sansfaute', nom: 'Zéro raté', texte: '7 tours d’affilée sans rater un seul incident' },
  { id: 'sauveur', nom: 'Sauveur', texte: 'Venir en aide à une zone en péril' },
  { id: 'solidaire', nom: 'Solidaire', texte: 'Prêter des agents en renfort 3 fois' },
  { id: 'orchestre', nom: 'Chef d’orchestre', texte: 'Résoudre une affaire que tu diriges avec au moins 2 zones en appui' },
  { id: 'limier', nom: 'Fin limier', texte: 'Identifier l’auteur d’une affaire' },
  { id: 'menottes', nom: 'Menottes d’or', texte: 'Réaliser une arrestation' },
  { id: 'cerveau', nom: 'Cerveau', texte: 'Résoudre 3 dossiers noirs dans une saison' },
  { id: 'batisseur', nom: 'Bâtisseur', texte: 'Porter l’hôtel de police au niveau 4' },
  { id: 'veteran', nom: 'Vétéran', texte: 'Faire progresser un membre de l’équipe jusqu’à son dernier surnom' },
  { id: 'incorruptible', nom: 'Incorruptible', texte: 'Finir une saison classé, sans aucune manœuvre' },
  { id: 'increvable', nom: 'Increvable', texte: 'Valider ses ordres les 14 tours d’une saison' },
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
  return ok;
}
