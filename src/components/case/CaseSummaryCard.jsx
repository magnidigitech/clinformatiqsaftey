import { Calendar, User, Pill, AlertTriangle, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  DRAFT: { bg: 'bg-status-draft-bg', text: 'text-status-draft-text', label: 'Draft' },
  SUBMITTED: { bg: 'bg-status-submitted-bg', text: 'text-status-submitted-text', label: 'Submitted' },
  UNDER_REVIEW: { bg: 'bg-status-review-bg', text: 'text-status-review-text', label: 'Under Review' },
  ACCEPTED: { bg: 'bg-status-accepted-bg', text: 'text-status-accepted-text', label: 'Accepted' },
  NEEDS_REVISION: { bg: 'bg-status-revision-bg', text: 'text-status-revision-text', label: 'Needs Revision' },
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', style.bg, style.text)}>
      {style.label}
    </span>
  );
}

export default function CaseSummaryCard({ caseData, compact = false, onClick }) {
  if (!caseData) return null;

  const {
    case_number,
    workflow_state,
    created_at,
    updated_at,
    patient,
    products = [],
    events = [],
  } = caseData;

  const patientSummary = patient
    ? `${patient.patient_code || 'N/A'} • ${patient.sex || '?'} • ${patient.age_value ? `${patient.age_value} ${patient.age_unit || 'years'}` : 'Age N/A'}`
    : 'No patient data';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex items-center justify-between p-3 bg-white border border-gray-200 rounded-sm hover:border-brand-primary/30 transition-colors',
          onClick && 'cursor-pointer'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">{case_number}</span>
            <span className="text-xs text-gray-500">{patientSummary}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Pill className="w-3.5 h-3.5" />
            <span>{products.length}</span>
            <AlertTriangle className="w-3.5 h-3.5 ml-1" />
            <span>{events.length}</span>
          </div>
          <StatusBadge status={workflow_state} />
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-brand-primary" />
              <h3 className="text-lg font-bold text-gray-900">{case_number || 'New Case'}</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created {formatDate(created_at)} • Updated {formatDate(updated_at)}
            </p>
          </div>
          <StatusBadge status={workflow_state} />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Patient */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-sm">
            <User className="w-5 h-5 text-brand-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</div>
              <div className="text-sm text-gray-900 mt-1">
                {patient?.patient_code || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {patient?.sex || '?'} • {patient?.age_value ? `${patient.age_value} ${patient.age_unit || 'yrs'}` : 'Age N/A'}
                {patient?.weight_kg && ` • ${patient.weight_kg}kg`}
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-sm">
            <Pill className="w-5 h-5 text-brand-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</div>
              <div className="text-sm text-gray-900 mt-1">
                {products.length} drug{products.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {products.filter((p) => p.suspect_flag === 'SUSPECT').length} suspect
              </div>
            </div>
          </div>

          {/* Events */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-sm">
            <AlertTriangle className="w-5 h-5 text-brand-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Events</div>
              <div className="text-sm text-gray-900 mt-1">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {events.filter((e) =>
                  e.is_serious || e.seriousness_death || e.seriousness_hospitalization
                ).length} serious
              </div>
            </div>
          </div>
        </div>

        {/* Drug Names */}
        {products.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {products.map((p, idx) => (
              <span
                key={idx}
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  p.suspect_flag === 'SUSPECT'
                    ? 'bg-red-50 text-red-700'
                    : p.suspect_flag === 'INTERACTING'
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {p.drug_name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export { StatusBadge, STATUS_STYLES };
