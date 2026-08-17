// inputSanitization.ts
// Regex-based sanitization for free-text numeric inputs (quantities, currency
// amounts). Applied as the user types (onChangeText), not just on submit, so
// invalid characters never appear in the field at all rather than being
// caught only at validation time.

/**
 * Sanitizes a decimal number as the user types: strips anything that isn't
 * a digit or a decimal point, collapses multiple decimal points down to the
 * first one, and truncates the fractional part to maxDecimals places.
 *
 * Does NOT parse to a number or round - this only shapes what characters
 * are allowed to stay in the text field. Use parseFloat() on the result
 * when you actually need the numeric value (e.g. on submit).
 */
export function sanitizeDecimalInput(rawText: string, maxDecimals: number = 2): string {
  // Strip everything except digits and '.'
  let cleaned = rawText.replace(/[^0-9.]/g, '');

  // Collapse multiple '.' characters down to just the first one.
  const firstDotIndex = cleaned.indexOf('.');
  if (firstDotIndex !== -1) {
    const beforeDot = cleaned.slice(0, firstDotIndex + 1);
    const afterDot = cleaned.slice(firstDotIndex + 1).replace(/\./g, '');
    cleaned = beforeDot + afterDot;
  }

  // Truncate the fractional part to maxDecimals places.
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1 && cleaned.length - dotIndex - 1 > maxDecimals) {
    cleaned = cleaned.slice(0, dotIndex + 1 + maxDecimals);
  }

  return cleaned;
}

/**
 * Sanitizes a whole-number-only input (e.g. a discrete pc/pack quantity
 * stepper's free-text fallback) - digits only, no decimal point at all.
 */
export function sanitizeIntegerInput(rawText: string): string {
  return rawText.replace(/[^0-9]/g, '');
}

/**
 * Formats a number as a 2-decimal-place currency string for display, e.g.
 * 45 -> "45.00", 2500 -> "2,500.00". Does not include a currency symbol -
 * callers prepend "₱" themselves, consistent with the rest of the app.
 *
 * Rule A's "Visual Truncation" calls for cleaned-up, readable number
 * formatting at scale - this adds the thousands-separator commas that were
 * previously missing (a bare .toFixed(2) reads "2500.00" instead of the
 * much more scannable "2,500.00" once totals get large).
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const fixed = Math.abs(amount).toFixed(2);
  const [whole, decimals] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${isNegative ? '-' : ''}${withCommas}.${decimals}`;
}

/**
 * Rule A's "Visual Truncation": cleans up a weighted quantity for display.
 * A clean fractional-zero value (2.000) collapses to a bare integer ("2");
 * a true fraction (0.250) keeps up to 3 decimal places, trimmed of any
 * trailing zeros ("0.25"). Does NOT append a unit label - pair this with
 * the item's own "(unit)" suffix (see Feature 1's Pricing Format rule)
 * rather than repeating the unit on the quantity itself.
 */
export function formatQuantityValue(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity);
  return parseFloat(quantity.toFixed(3)).toString();
}

/**
 * True if the sanitized text represents a valid positive number (used to
 * gate "Confirm"/"Save" buttons - e.g. ReconciliationModal, NewRecipeModal).
 * allowZero controls whether 0 counts as valid (quantities generally
 * shouldn't be 0, but some contexts, like a receipt total, arguably could be).
 */
export function isValidPositiveNumber(text: string, allowZero: boolean = false): boolean {
  const value = parseFloat(text);
  if (isNaN(value)) return false;
  return allowZero ? value >= 0 : value > 0;
}

/**
 * Units that have a smaller "display" unit worth converting down to when
 * the quantity would otherwise render as an awkward fraction (kg -> g,
 * L -> mL), each 1000 of the smaller unit to 1 of the larger.
 */
const CONVERTIBLE_UNITS: Record<string, { smallerUnit: string; factor: number }> = {
  kg: { smallerUnit: 'g', factor: 1000 },
  L: { smallerUnit: 'mL', factor: 1000 },
};

/**
 * Rule A's unit auto-conversion: formats a quantity TOGETHER with its unit
 * as one combined string, e.g. "2 kg" or "500g". A whole number keeps its
 * given unit with a space ("2 kg"); a true fraction in a convertible unit
 * (kg, L) converts down to the smaller unit instead of showing an awkward
 * decimal ("0.25 kg" becomes "250g", no space - matching the spec's own
 * example format). A fraction in a non-convertible unit (pack, box, etc,
 * or no unit at all) just falls back to formatQuantityValue's normal
 * decimal cleanup, with the unit appended if there is one.
 */
export function formatQuantityWithUnit(quantity: number, unit: string | null): string {
  const isWhole = Number.isInteger(quantity);

  if (!isWhole && unit && CONVERTIBLE_UNITS[unit]) {
    const { smallerUnit, factor } = CONVERTIBLE_UNITS[unit];
    // Round to 3 decimals first to guard against floating-point noise
    // (e.g. 0.1 * 1000 producing 99.99999999999999) before formatting.
    const converted = Math.round(quantity * factor * 1000) / 1000;
    return `${formatQuantityValue(converted)}${smallerUnit}`;
  }

  const valueText = formatQuantityValue(quantity);
  return unit ? `${valueText} ${unit}` : valueText;
}