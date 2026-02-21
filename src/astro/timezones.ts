/**
 * Get the current time string for a given UTC offset (in hours).
 */
export function getTimeForOffset(date: Date, offsetHours: number): string {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const targetMs = utcMs + offsetHours * 3600000;
  const targetDate = new Date(targetMs);

  const h = targetDate.getHours();
  const m = targetDate.getMinutes();
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Get formatted UTC time string.
 */
export function formatUTC(date: Date): string {
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  const s = date.getUTCSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Get formatted local time string for a given IANA timezone.
 */
export function formatTimeInZone(date: Date, timezone: string): string {
  try {
    return date.toLocaleTimeString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    // Fallback if timezone is invalid
    return formatUTC(date);
  }
}

/**
 * Get formatted date string.
 */
export function formatDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${days[date.getUTCDay()]} ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * The 24 standard timezone offsets and their longitude centers.
 */
export function getTimezoneOffsets(): Array<{ offset: number; lng: number; label: string }> {
  const zones = [];
  for (let i = -12; i <= 12; i++) {
    zones.push({
      offset: i,
      lng: i * 15,
      label: i === 0 ? 'UTC' : `UTC${i > 0 ? '+' : ''}${i}`,
    });
  }
  return zones;
}
