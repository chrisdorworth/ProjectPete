/**
 * Shared address normalizer used by dedup and household policies.
 * Pure function — no I/O (RULE-16).
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\broad\b/g, "rd")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\blane\b/g, "ln")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bapartment\b/g, "apt")
    .replace(/\bsuite\b/g, "ste")
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
