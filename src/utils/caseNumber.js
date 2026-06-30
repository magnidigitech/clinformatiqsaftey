/**
 * Generate a Clinformatiq case number.
 * Format: PV-{YYYY}-{orgId padded to 2 digits}-{sequence padded to 4 digits}
 * @param {number|string} orgId - Organization ID
 * @param {number|string} sequence - Sequence number
 * @returns {string} Formatted case number
 */
export function generateCaseNumber(orgId, sequence) {
  const year = new Date().getFullYear();
  const org = String(orgId).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `PV-${year}-${org}-${seq}`;
}

/**
 * Parse a Clinformatiq case number into its components.
 * @param {string} caseNumber - Case number string (e.g., "PV-2026-01-0042")
 * @returns {{ year: number, orgId: number, sequence: number } | null}
 */
export function parseCaseNumber(caseNumber) {
  if (!caseNumber || typeof caseNumber !== 'string') return null;

  const match = caseNumber.match(/^PV-(\d{4})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  return {
    year: parseInt(match[1], 10),
    orgId: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}
