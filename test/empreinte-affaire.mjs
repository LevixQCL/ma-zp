// Empreinte d'une affaire écrite (objet complet, fonctions comprises) et de ses photos de pièces.
// Sert à vérifier qu'une affaire ouverte avant les variantes (sans state.variantes) reste identique, octet pour octet.
import { createHash } from 'node:crypto';
import { photoIndice } from '../js/ui/indices-photo.js';

const serialiser = (o) => JSON.stringify(o, (k, v) => (typeof v === 'function' ? `fn:${v.toString()}` : v));
export const empreinte = (s) => createHash('sha256').update(s).digest('hex').slice(0, 20);
/** Empreinte de l'objet affaire. */
export const empreinteAffaire = (aff) => empreinte(serialiser(aff));
/** Empreinte des photos de toutes les pièces (et rebondissements) de l'affaire. */
export function empreintePhotos(aff) {
  const codes = [...new Set([...aff.faits, ...Object.values(aff.rebonds || {}).map((r) => r.f)])].sort();
  return empreinte(codes.map((f) => `${f}\n${photoIndice(aff, f)}`).join('\n'));
}
