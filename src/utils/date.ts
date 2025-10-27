export const isValidDate = (d: any) => d instanceof Date && !Number.isNaN(d.getTime());

export const safeDate = (v: any) => {
  const d = new Date(v);
  return isValidDate(d) ? d : null;
};

export function startOfDay(d?: Date | null) {
  if (!d || !isValidDate(d)) return null;
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function iso(d?: Date | null) {
  const s = startOfDay(d);
  return s ? s.toISOString().slice(0, 10) : '';
}
