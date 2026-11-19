import React from 'react';
import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';

const TONES = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600' },
  success: { bg: 'bg-success-50', text: 'text-success-600' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600' },
  info: { bg: 'bg-info-50', text: 'text-info-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

/**
 * Analytical KPI card with icon, value, optional subtitle and trend delta.
 * compact: boolean (render smaller padding and typography for dashboard grids)
 * trend: { value: number (percent), direction: 'up' | 'down' } (optional)
 */
const StatCard = ({
  title,
  value,
  icon: Icon,
  tone = 'primary',
  subtitle,
  trend,
  onClick,
  compact = false,
  className = '',
}) => {
  const t = TONES[tone] || TONES.primary;
  const clickable = typeof onClick === 'function';

  return (
    <div
      onClick={onClick}
      className={`card ${compact ? 'p-3.5 sm:p-4' : 'card-pad'} ${clickable ? 'card-hover cursor-pointer' : ''} ${className}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className={`${compact ? 'text-[11px]' : 'text-[0.8rem]'} font-semibold text-slate-500 truncate`}>
            {title}
          </p>
          <p className={`${compact ? 'text-lg sm:text-xl mt-1' : 'text-2xl mt-1.5'} font-bold text-slate-900 tracking-tight leading-tight`}>
            {value}
          </p>
        </div>
        {Icon && (
          <span className={`flex ${compact ? 'h-9 w-9 text-base' : 'h-11 w-11 text-xl'} items-center justify-center rounded-xl ${t.bg} ${t.text} flex-shrink-0`}>
            <Icon className={compact ? 'text-base' : 'text-xl'} />
          </span>
        )}
      </div>

      {(trend || subtitle) && (
        <div className={`flex items-center gap-1.5 ${compact ? 'mt-2 text-[11px]' : 'mt-3 text-xs'}`}>
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                trend.direction === 'down' ? 'text-danger-600' : 'text-success-600'
              }`}
            >
              {trend.direction === 'down' ? <FiArrowDownRight /> : <FiArrowUpRight />}
              {Math.abs(trend.value)}%
            </span>
          )}
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
