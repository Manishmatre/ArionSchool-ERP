import React from 'react';
import { FiInbox } from 'react-icons/fi';

const EmptyState = ({ icon: Icon = FiInbox, title = 'Nothing here yet', description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center text-center py-10 px-4 ${className}`}>
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
      <Icon className="text-2xl" />
    </span>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {description && <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
