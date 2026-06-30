/**
 * Naranjo Adverse Drug Reaction Probability Scale
 * Each question has scores for yes, no, and unknown/not applicable answers.
 */
export const NARANJO_QUESTIONS = [
  {
    id: 1,
    question: 'Are there previous conclusive reports on this reaction?',
    yes: 1,
    no: 0,
    unknown: 0,
  },
  {
    id: 2,
    question: 'Did the adverse event appear after the suspected drug was administered?',
    yes: 2,
    no: -1,
    unknown: 0,
  },
  {
    id: 3,
    question: 'Did the adverse reaction improve when the drug was discontinued or a specific antagonist was administered?',
    yes: 1,
    no: 0,
    unknown: 0,
  },
  {
    id: 4,
    question: 'Did the adverse reaction reappear when the drug was readministered?',
    yes: 2,
    no: -1,
    unknown: 0,
  },
  {
    id: 5,
    question: 'Are there alternative causes (other than the drug) that could on their own have caused the reaction?',
    yes: -1,
    no: 2,
    unknown: 0,
  },
  {
    id: 6,
    question: 'Did the reaction reappear when a placebo was given?',
    yes: -1,
    no: 1,
    unknown: 0,
  },
  {
    id: 7,
    question: 'Was the drug detected in the blood (or other fluids) in concentrations known to be toxic?',
    yes: 1,
    no: 0,
    unknown: 0,
  },
  {
    id: 8,
    question: 'Was the reaction more severe when the dose was increased, or less severe when the dose was decreased?',
    yes: 1,
    no: 0,
    unknown: 0,
  },
  {
    id: 9,
    question: 'Did the patient have a similar reaction to the same or similar drugs in any previous exposure?',
    yes: 1,
    no: 0,
    unknown: 0,
  },
  {
    id: 10,
    question: 'Was the adverse event confirmed by any objective evidence?',
    yes: 1,
    no: 0,
    unknown: 0,
  },
];

/**
 * Get the interpretation label for a Naranjo score.
 * @param {number} score - Total Naranjo score
 * @returns {string} Interpretation label
 */
export function getInterpretation(score) {
  if (score >= 9) return 'Definite';
  if (score >= 5) return 'Probable';
  if (score >= 1) return 'Possible';
  return 'Doubtful';
}

/**
 * Calculate the Naranjo score from a set of answers.
 * @param {Object} answers - Map of question id to answer ('yes', 'no', or 'unknown')
 * @returns {{ score: number, interpretation: string }}
 */
export function calculateNaranjoScore(answers) {
  let score = 0;

  for (const question of NARANJO_QUESTIONS) {
    const answer = answers[question.id];
    if (answer === 'yes') {
      score += question.yes;
    } else if (answer === 'no') {
      score += question.no;
    } else {
      score += question.unknown;
    }
  }

  return {
    score,
    interpretation: getInterpretation(score),
  };
}
