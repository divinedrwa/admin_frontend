/** IST fixed offset (India has no DST). Society default timezone for admin date inputs. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Current society-local YYYY-MM-DD for `<input type="date">` defaults. */
export function istTodayDateInput(): string {
  const shifted = new Date(Date.now() + IST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Society-local YYYY-MM-DD from a UTC instant. */
export function istDateInputFromInstant(d: Date): string {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Society-local YYYY-MM-DD offset by calendar months from today (IST). */
export function istDateInputAddMonths(months: number): string {
  const shifted = new Date(Date.now() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const anchor = new Date(Date.UTC(y, m + months, d));
  return `${anchor.getUTCFullYear()}-${pad2(anchor.getUTCMonth() + 1)}-${pad2(anchor.getUTCDate())}`;
}

/** Parse HTML date input as IST calendar day start → UTC ISO for the API. */
export function istIsoFromDateInput(dateStr: string, endOfDay = false): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const hh = endOfDay ? 23 : 0;
  const mm = endOfDay ? 59 : 0;
  const ss = endOfDay ? 59 : 0;
  const ms = endOfDay ? 999 : 0;
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms) - IST_OFFSET_MS).toISOString();
}

/** Format a UTC instant for `datetime-local` as IST wall time. */
export function istInputValue(d: Date): string {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}T${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}

/** Parse `datetime-local` value as IST wall time → UTC ISO for the API. */
export function istIsoFromDatetimeLocal(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const [datePart, timePart] = value.split("T");
  if (!datePart) return undefined;
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh = 0, mm = 0] = (timePart ?? "00:00").split(":").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS).toISOString();
}

/** Default payment window: 1st–10th of the month after billing month (IST calendar days). */
export function defaultPaymentWindowForCycleMonth(cycleMonth: string): {
  paymentStart: string;
  paymentEnd: string;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(cycleMonth.trim());
  if (!match) {
    const now = new Date();
    const startUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0) - IST_OFFSET_MS,
    );
    const endUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 10, 23, 59) -
        IST_OFFSET_MS,
    );
    return { paymentStart: istInputValue(startUtc), paymentEnd: istInputValue(endUtc) };
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const payYear = m === 12 ? y + 1 : y;
  const payMonth = m === 12 ? 1 : m + 1;
  const startUtc = new Date(Date.UTC(payYear, payMonth - 1, 1, 0, 0) - IST_OFFSET_MS);
  const endUtc = new Date(Date.UTC(payYear, payMonth - 1, 10, 23, 59) - IST_OFFSET_MS);
  return { paymentStart: istInputValue(startUtc), paymentEnd: istInputValue(endUtc) };
}

/** @deprecated Use istInputValue — kept for older imports. */
export const utcInputValue = istInputValue;

/** @deprecated Use istIsoFromDatetimeLocal — kept for older imports. */
export const utcIsoFromDatetimeLocal = istIsoFromDatetimeLocal;
