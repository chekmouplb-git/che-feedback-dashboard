/**
 * Shared date helpers for filtering Google Forms responses by date.
 *
 * Google Forms / Apps Script can hand us dates in several shapes:
 *   "2026-01-05T02:30:00.000Z"   (ISO — most common from Apps Script)
 *   "2026-01-05"                 (plain date)
 *   "1/5/2026 10:30:00"          (Sheets display format)
 *   ""                           (blank — respondent skipped an optional field)
 *   "Jan 5, 2026 at 10:30 AM"    (free text — unparseable)
 *
 * The old filter used `new Date(value)` directly, which silently let blank and
 * unparseable rows through the filter. These helpers parse defensively and
 * return null when a value cannot be trusted.
 */

/** Parse a raw form date value into a Date, or null if it isn't usable. */
export function parseRowDate(value: unknown): Date | null {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Epoch milliseconds
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Plain "YYYY-MM-DD" — build in LOCAL time so it doesn't shift a day in PH (UTC+8)
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const d = new Date(
      Number(isoDate[1]),
      Number(isoDate[2]) - 1,
      Number(isoDate[3])
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // "M/D/YYYY" or "D/M/YYYY", with optional time
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (slash) {
    let month = Number(slash[1]);
    let day = Number(slash[2]);
    // Google Forms defaults to M/D/YYYY. If the first part can't be a month,
    // it must be D/M/YYYY instead.
    if (month > 12) [month, day] = [day, month];
    const d = new Date(
      Number(slash[3]),
      month - 1,
      day,
      Number(slash[4] ?? 0),
      Number(slash[5] ?? 0),
      Number(slash[6] ?? 0)
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO datetime and anything else the browser understands
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** Start of the given "YYYY-MM-DD" day, in local time. */
export function startOfDay(value: string): Date | null {
  const d = parseRowDate(value);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of the given "YYYY-MM-DD" day, in local time. */
export function endOfDay(value: string): Date | null {
  const d = parseRowDate(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Is `rowDate` inside the selected range?
 * Rows with no usable date are EXCLUDED while a filter is active, so the
 * response count always reflects what is actually being charted.
 */
export function inDateRange(
  rowDate: Date | null,
  from: string,
  to: string
): boolean {
  if (!from && !to) return true;
  if (!rowDate) return false;

  const start = from ? startOfDay(from) : null;
  const end = to ? endOfDay(to) : null;

  if (start && rowDate < start) return false;
  if (end && rowDate > end) return false;
  return true;
}
