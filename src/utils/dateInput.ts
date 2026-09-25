/**
 * Reads a date an engineer typed, the way it is written in India.
 *
 * Accepts DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY and YYYY-MM-DD. Returns the
 * date as YYYY-MM-DD, or null when it is not a real calendar date.
 *
 * Never hands the raw text to `new Date()`: that reads 01/02/2025 as
 * 2 January (US order) — a valid date, silently wrong — and rejects
 * 15/01/2025 outright.
 */
export const parseTypedDate = (text: string): string | null => {
  const s = text.trim();
  let day: number;
  let month: number;
  let year: number;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const indian = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (indian) {
    [day, month, year] = [Number(indian[1]), Number(indian[2]), Number(indian[3])];
  } else {
    return null;
  }

  // Rejects 31/02/2025 and the like: a real date round-trips unchanged.
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** YYYY-MM-DD → DD/MM/YYYY, for showing a stored date back in the form. */
export const toTypedDate = (isoDate: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : isoDate;
};
