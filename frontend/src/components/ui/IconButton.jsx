import React from 'react';

const VARIANTS = {
  primary: 'text-primary-600 hover:bg-primary-50 hover:text-primary-700',
  success: 'text-success-600 hover:bg-success-50 hover:text-success-700',
  danger: 'text-danger-600 hover:bg-danger-50 hover:text-danger-700',
  neutral: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
};

const IconButton = ({ icon: Icon, variant = 'neutral', title, onClick, className = '', disabled }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.neutral} ${className}`}
  >
    <Icon className="text-lg" />
  </button>
);

export default IconButton;
