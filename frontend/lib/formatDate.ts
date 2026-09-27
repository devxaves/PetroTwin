/**
 * PetroTwin Date & Time Formatting Utilities.
 * Standardized on Indian Standard Time (IST, UTC+05:30 / Asia/Kolkata).
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format a date string or Date object into a readable IST Date (e.g. "15 May 2023").
 */
export function formatISTDate(
  dateInput: string | number | Date | null | undefined,
  includeYear: boolean = true
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

/**
 * Format a date string or Date object into IST Date and Time with explicit 'IST' label.
 * e.g. "15 May 2023, 14:30 IST"
 */
export function formatISTDateTime(
  dateInput: string | number | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  const datePart = date.toLocaleDateString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timePart = date.toLocaleTimeString("en-IN", {
    timeZone: IST_TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  });

  return `${datePart}, ${timePart} IST`;
}

/**
 * Format time only in IST (e.g. "14:30:15 IST").
 */
export function formatISTTime(
  dateInput: string | number | Date | null | undefined,
  includeSeconds: boolean = true
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  const timePart = date.toLocaleTimeString("en-IN", {
    timeZone: IST_TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  });

  return `${timePart} IST`;
}

/**
 * Format a date range in IST (e.g. "01 May 2023 – 15 May 2023 (IST)").
 */
export function formatISTDateRange(
  startInput: string | number | Date | null | undefined,
  endInput: string | number | Date | null | undefined
): string {
  if (!startInput && !endInput) return "—";
  const startStr = formatISTDate(startInput);
  const endStr = formatISTDate(endInput);
  return `${startStr} – ${endStr}`;
}
