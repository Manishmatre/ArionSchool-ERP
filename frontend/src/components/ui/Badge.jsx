import React from 'react';

const VARIANTS = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
};

const Badge = ({ variant = 'neutral', icon: Icon, children, className = '' }) => (
  <span className={`${VARIANTS[variant] || VARIANTS.neutral} ${className}`}>
    {Icon && <Icon className="text-[0.9em]" />}
    {children}
  </span>
);

export default Badge;
