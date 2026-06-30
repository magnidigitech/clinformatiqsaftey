import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

const NARANJO_QUESTIONS = [
  { id: 'q1', text: 'Are there previous conclusive reports on this reaction?', yes: 1, no: 0, unknown: 0 },
  { id: 'q2', text: 'Did the adverse event appear after the suspected drug was given?', yes: 2, no: -1, unknown: 0 },
  { id: 'q3', text: 'Did the adverse reaction improve when the drug was discontinued?', yes: 1, no: 0, unknown: 0 },
  { id: 'q4', text: 'Did the adverse reaction reappear when the drug was re-administered?', yes: 2, no: -1, unknown: 0 },
  { id: 'q5', text: 'Are there alternative causes that could have caused the reaction?', yes: -1, no: 2, unknown: 0 },
  { id: 'q6', text: 'Did the reaction reappear when a placebo was given?', yes: -1, no: 1, unknown: 0 },
  { id: 'q7', text: 'Was the drug detected in blood/fluids in toxic concentrations?', yes: 1, no: 0, unknown: 0 },
  { id: 'q8', text: 'Was the reaction more severe when dose was increased?', yes: 1, no: 0, unknown: 0 },
  { id: 'q9', text: 'Did the patient have a similar reaction to the same/similar drug?', yes: 1, no: 0, unknown: 0 },
  { id: 'q10', text: 'Was the adverse event confirmed by objective evidence?', yes: 1, no: 0, unknown: 0 },
];

function getInterpretation(score) {
  if (score >= 9) return { label: 'Definite', color: 'bg-green-100 text-green-800 border-green-200' };
  if (score >= 5) return { label: 'Probable', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  if (score >= 1) return { label: 'Possible', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  return { label: 'Doubtful', color: 'bg-red-100 text-red-800 border-red-200' };
}

export default function NaranjoCalculator({
  drugName = 'Drug',
  eventName = 'Event',
  initialAnswers = {},
  onChange,
  readOnly = false,
}) {
  const [answers, setAnswers] = useState(() => {
    const initial = {};
    NARANJO_QUESTIONS.forEach((q) => {
      initial[q.id] = initialAnswers[q.id] || null;
    });
    return initial;
  });

  // Sync external initialAnswers
  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      setAnswers((prev) => ({ ...prev, ...initialAnswers }));
    }
  }, [initialAnswers]);

  const score = useMemo(() => {
    return NARANJO_QUESTIONS.reduce((total, q) => {
      const answer = answers[q.id];
      if (answer === 'yes') return total + q.yes;
      if (answer === 'no') return total + q.no;
      return total + q.unknown;
    }, 0);
  }, [answers]);

  const interpretation = getInterpretation(score);

  const answeredCount = Object.values(answers).filter((a) => a !== null).length;

  const handleAnswer = (questionId, value) => {
    if (readOnly) return;
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    onChange?.({ answers: updated, score, interpretation: interpretation.label });
  };

  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-gray-900">Naranjo Algorithm</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {drugName} → {eventName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-primary">{score}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Score</div>
            </div>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border',
                interpretation.color
              )}
            >
              {interpretation.label}
            </span>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-brand-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / 10) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{answeredCount}/10</span>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="divide-y divide-gray-100">
        {NARANJO_QUESTIONS.map((question, index) => (
          <div
            key={question.id}
            className={cn(
              'px-4 py-3 transition-colors',
              answers[question.id] !== null ? 'bg-white' : 'bg-gray-50/50'
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-brand-primary mt-0.5 shrink-0 w-6">
                Q{index + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">{question.text}</p>
                <div className="flex items-center gap-4 mt-2">
                  {['yes', 'no', 'unknown'].map((option) => {
                    const scoreVal = question[option];
                    const isSelected = answers[question.id] === option;
                    return (
                      <label
                        key={option}
                        className={cn(
                          'flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-md text-xs font-medium transition-all',
                          isSelected
                            ? 'bg-brand-primary text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                          readOnly && 'cursor-default'
                        )}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={isSelected}
                          onChange={() => handleAnswer(question.id, option)}
                          disabled={readOnly}
                          className="sr-only"
                        />
                        <span className="capitalize">{option}</span>
                        <span
                          className={cn(
                            'text-[10px] ml-0.5',
                            isSelected ? 'text-white/70' : 'text-gray-400'
                          )}
                        >
                          ({scoreVal > 0 ? `+${scoreVal}` : scoreVal})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Score Legend */}
      <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-200">
        <div className="flex items-center justify-center gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> ≥9 Definite
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> 5-8 Probable
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> 1-4 Possible
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> ≤0 Doubtful
          </span>
        </div>
      </div>
    </div>
  );
}

export { NARANJO_QUESTIONS, getInterpretation };
