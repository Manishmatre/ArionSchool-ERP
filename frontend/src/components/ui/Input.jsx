import React from 'react';
import { FiSearch } from 'react-icons/fi';

const fieldClass = (error) =>
  `w-full bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition focus:outline-none focus:ring-2 ${
    error
      ? 'border-danger-400 focus:ring-danger-500/20 focus:border-danger-500'
      : 'border-slate-300 hover:border-slate-400 focus:ring-primary-500/20 focus:border-primary-600'
  }`;

export const TextField = ({ label, error, hint, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">{label}</label>}
    <input className={`${fieldClass(error)} px-3.5 py-2.5`} {...props} />
    {error && <p className="mt-1 text-xs font-medium text-danger-600">{error}</p>}
    {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const SelectField = ({ label, error, children, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">{label}</label>}
    <select
      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      className={`${fieldClass(error)} px-3.5 py-2.5 cursor-pointer`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs font-medium text-danger-600">{error}</p>}
  </div>
);

export const TextArea = ({ label, error, className = '', rows = 3, ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">{label}</label>}
    <textarea className={`${fieldClass(error)} px-3.5 py-2.5 resize-y`} rows={rows} {...props} />
    {error && <p className="mt-1 text-xs font-medium text-danger-600">{error}</p>}
  </div>
);

export const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '', ...props }) => (
  <div className={`relative flex items-center ${className}`}>
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 pointer-events-none z-10">
      <FiSearch className="w-4 h-4" />
    </span>
    <input
      type="search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ paddingLeft: '2.5rem' }}
      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 focus:bg-white transition"
      {...props}
    />
  </div>
);
