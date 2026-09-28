// Calcul de l'heure de résolution (par défaut 20:00, heure de Bruxelles),
// en tenant compte du passage à l'heure d'été et d'hiver.

const TZ = 'Europe/Brussels';

function partsInTz(ms, tz) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const { type, value } of fmt.formatToParts(new Date(ms))) p[type] = value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

/** Décalage (en ms) entre l'heure locale du fuseau et l'UTC, à l'instant donné. */
function tzOffset(ms, tz) {
  const p = partsInTz(ms, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Instant UTC correspondant à y-m-d h:00 dans le fuseau. */
function zonedTime(y, m, d, h, tz) {
  const guess = Date.UTC(y, m - 1, d, h, 0, 0);
  let ms = guess - tzOffset(guess, tz);
  ms = guess - tzOffset(ms, tz); // seconde passe pour les changements d'heure
  return ms;
}

/** Prochaine échéance de résolution strictement après `ms`. */
export function nextResolutionAfter(ms, hour = 20, tz = TZ) {
  const p = partsInTz(ms, tz);
  let candidate = zonedTime(p.y, p.m, p.d, hour, tz);
  if (candidate <= ms) {
    const next = new Date(Date.UTC(p.y, p.m - 1, p.d) + 36 * 3600 * 1000);
    candidate = zonedTime(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), hour, tz);
  }
  return candidate;
}

export function formatCountdown(msLeft) {
  if (msLeft <= 0) return '00:00:00';
  const s = Math.floor(msLeft / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

export function formatDateBe(ms) {
  return new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ms));
}

export function formatHeureBe(ms) {
  return new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
}

/** Jour de la semaine (0 = lundi … 6 = dimanche) à Bruxelles. */
export function weekdayBe(ms) {
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' }).format(new Date(ms));
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd);
}
