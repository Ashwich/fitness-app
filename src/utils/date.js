/**
 * YYYY-MM-DD in the device's local timezone.
 * Never use toISOString() for calendar days — it is UTC, so in India the
 * "day" would roll over at 05:30 instead of midnight.
 */
export const toLocalISODate = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
