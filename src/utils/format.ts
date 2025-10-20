/** Localized date+time from "YYYY-MM-DD HH:mm:ss" or ISO strings. */
export function formatDateTime(input?: string | null): string {
  if (!input) return '';
  const s = String(input).replace(' ', 'T');
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
