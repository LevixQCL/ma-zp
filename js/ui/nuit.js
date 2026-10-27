// Les faits marquants de la nuit (trois au plus), pour la bulle de l'adjoint à l'accueil.
import { S } from './common.js';

const MARQUANTS = [/^Coup dur/, /^Traque : .*arrêté/, /^Enquête : bien vu/, /^Enquête : .* passe aux aveux/, /^Trophée débloqué/, /^Jauge des skins pleine/, /vague de délinquance/i, /^Incident technique/, /^Spécialité .*palier/, /^Armurerie : /, /^Zone de non-droit : .* vendu par le parquet/];

export function faitsDeLaNuit(z) {
  if (!z || S.state.turn <= 1) return [];
  const l = [...(z.cetteNuit || []).map((x) => x.t)];
  for (const r of z.rapport || []) { if (l.length >= 3) break; if (MARQUANTS.some((m) => m.test(r)) && !l.includes(r)) l.push(r); }
  return l.slice(0, 3);
}
