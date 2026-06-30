/**
 * ICH E2B seriousness criteria for adverse events.
 */
export const SERIOUSNESS_CRITERIA = [
  {
    id: 'death',
    label: 'Results in death',
    description: 'The adverse event resulted in the death of the patient.',
  },
  {
    id: 'life_threatening',
    label: 'Life-threatening',
    description: 'The patient was at substantial risk of dying at the time of the adverse event.',
  },
  {
    id: 'hospitalization',
    label: 'Requires or prolongs hospitalization',
    description: 'The adverse event required inpatient hospitalization or prolonged an existing hospitalization.',
  },
  {
    id: 'disability',
    label: 'Results in persistent or significant disability/incapacity',
    description: 'The adverse event resulted in a substantial disruption of a person\'s ability to conduct normal life functions.',
  },
  {
    id: 'congenital_anomaly',
    label: 'Congenital anomaly/birth defect',
    description: 'The adverse event resulted in a congenital anomaly or birth defect.',
  },
  {
    id: 'other_medically_important',
    label: 'Other medically important condition',
    description: 'The event may jeopardize the patient and may require medical or surgical intervention to prevent one of the other outcomes listed above.',
  },
];

/**
 * Check seriousness based on selected criteria.
 * @param {string[]} selectedCriteria - Array of criteria IDs that apply
 * @returns {{ isSerious: boolean, criteria: Array<{ id: string, label: string }> }}
 */
export function checkSeriousness(selectedCriteria = []) {
  const matchedCriteria = SERIOUSNESS_CRITERIA.filter((c) =>
    selectedCriteria.includes(c.id)
  );

  return {
    isSerious: matchedCriteria.length > 0,
    criteria: matchedCriteria.map(({ id, label }) => ({ id, label })),
  };
}
