import React from 'react';

/**
 * Backward-compatible stats card (keeps { title, value, icon, colorClass } API).
 * `icon` is expected to be a rendered React node (as used across existing pages).
 * `colorClass` sets the icon bubble background (e.g. "bg-blue-100 text-primary-600").
 */
const StatsCard = ({ title, value, icon, colorClass }) => {
  return (
    <div className="card card-pad card-hover flex items-center gap-4">
      <div className={`rounded-xl p-3 flex items-center justify-center ${colorClass || 'bg-slate-100 text-slate-600'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[0.8rem] font-medium text-slate-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
};

export default StatsCard;
