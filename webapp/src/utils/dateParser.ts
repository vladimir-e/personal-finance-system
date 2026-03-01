/**
 * Parse flexible date input into an ISO date string (YYYY-MM-DD).
 * Accepts various human-friendly formats and normalizes them.
 *
 * Returns the ISO date string on success, or null if parsing fails.
 */
export function parseFlexDate(input: string, referenceDate: Date = new Date()): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed
  const refDay = referenceDate.getDate();

  // Natural language shortcuts
  if (trimmed === 'today') {
    return toISO(refYear, refMonth + 1, refDay);
  }
  if (trimmed === 'yesterday') {
    const d = new Date(refYear, refMonth, refDay - 1);
    return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  if (trimmed === 'tomorrow') {
    const d = new Date(refYear, refMonth, refDay + 1);
    return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return validateAndFormat(+y, +m, +d);
  }

  // US format with year: MM/DD/YYYY or MM/DD/YY
  const usFullMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usFullMatch) {
    const [, m, d, yRaw] = usFullMatch;
    let year = +yRaw;
    if (year < 100) year += 2000; // 26 -> 2026
    return validateAndFormat(year, +m, +d);
  }

  // Short US: MM/DD (assume current year)
  const usShortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (usShortMatch) {
    const [, m, d] = usShortMatch;
    return validateAndFormat(refYear, +m, +d);
  }

  // Bare day: just a number 1-31 (assume current month and year)
  const dayOnly = trimmed.match(/^(\d{1,2})$/);
  if (dayOnly) {
    const d = +dayOnly[1];
    if (d >= 1 && d <= 31) {
      return validateAndFormat(refYear, refMonth + 1, d);
    }
  }

  return null;
}

/** Validate the date is real and format as YYYY-MM-DD */
function validateAndFormat(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Use Date to validate (it handles month lengths, leap years)
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null; // Invalid date (e.g., Feb 30)
  }

  return toISO(year, month, day);
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
