import React from 'react';

/** Toolbar card for search + filters + actions on list pages */
const FilterBar = ({ children, className = '' }) => (
  <div className={`card card-pad ${className}`}>
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">{children}</div>
  </div>
);

export const FilterBarActions = ({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 md:ml-auto ${className}`}>{children}</div>
);

export default FilterBar;
