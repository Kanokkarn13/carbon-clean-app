/** Localized date+time from "YYYY-MM-DD HH:mm:ss" or ISO strings.
 * Avoids timezone shifts by parsing as local when possible.
 */
export function formatDateTime(input?: string | null): string {
  if (!input) return '';
  const raw = String(input).trim();

  // Try strict "YYYY-MM-DD HH:mm:ss" (or without seconds) as local time
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw.replace('Z', ''));
  let d: Date | null = null;
  if (m) {
    const [, y, mo, da, hh, mm, ss] = m;
    d = new Date(
      Number(y),
      Number(mo) - 1,
      Number(da),
      Number(hh),
      Number(mm),
      ss ? Number(ss) : 0,
    );
  } else {
    // Fallback to Date parsing (may include timezone)
    const parsed = new Date(raw.replace(' ', 'T'));
    d = Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (!d) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Relative time like "3 min ago" / "2 days ago" */
export function formatRelativeTime(input?: string | number | Date | null): string {
  if (!input) return '';

  let d: Date | null = null;
  if (input instanceof Date) d = input;
  else if (typeof input === 'number') d = new Date(input < 1e11 ? input * 1000 : input);
  else if (typeof input === 'string') {
    const raw = input.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw.replace('Z', ''));
    if (m) {
      const [, y, mo, da, hh, mm, ss] = m;
      d = new Date(
        Number(y),
        Number(mo) - 1,
        Number(da),
        Number(hh),
        Number(mm),
        ss ? Number(ss) : 0,
      );
    } else {
      const parsed = new Date(raw.replace(' ', 'T'));
      d = Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  if (!d || Number.isNaN(d.getTime())) return '';
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 0) return 'just now';
  if (diffSec < 60) return `${diffSec} sec ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
