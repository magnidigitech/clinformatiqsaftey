import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MetricCard({ icon: Icon, value, label, trend, trendLabel, className }) {
  const getTrendDisplay = () => {
    if (!trend) return null;
    const isUp = trend > 0;
    const isDown = trend < 0;
    const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
    return (
      <div
        className={cn(
          'flex items-center gap-1 text-xs font-medium',
          isUp && 'text-green-600',
          isDown && 'text-red-600',
          !isUp && !isDown && 'text-gray-400'
        )}
      >
        <TrendIcon className="w-3.5 h-3.5" />
        <span>{Math.abs(trend)}%</span>
        {trendLabel && <span className="text-gray-400 font-normal">{trendLabel}</span>}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-sm p-5 shadow-sm hover:shadow-sm transition-shadow',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '-'}</p>
          {getTrendDisplay() && <div className="mt-2">{getTrendDisplay()}</div>}
        </div>
        {Icon && (
          <div className="flex items-center justify-center w-11 h-11 bg-brand-light rounded-sm shrink-0">
            <Icon className="w-5 h-5 text-brand-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
