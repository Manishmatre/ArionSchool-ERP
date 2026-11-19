import React from 'react';
import { Card, CardHeader } from './Card';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export const FormPageLayout = ({ children, footer, className = '' }) => (
  <div className={cx('space-y-6', className)}>
    {children}
    {footer && (
      <div className="sticky bottom-0 z-10 -mx-1 px-1 py-4 bg-slate-50/95 backdrop-blur border-t border-slate-200 rounded-b-xl">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">{footer}</div>
      </div>
    )}
  </div>
);

export const FormSection = ({ title, subtitle, icon, children, className = '', padded = true }) => (
  <Card className={cx('rounded-2xl border-slate-200/90 shadow-soft', className)} padded={padded}>
    {(title || subtitle) && (
      <CardHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        className="mb-5 pb-3.5 border-b border-slate-100"
      />
    )}
    {children}
  </Card>
);

export const FormGrid = ({ cols = 2, children, className = '' }) => {
  const gridClass = cols === 3
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5'
    : cols === 1
      ? 'grid grid-cols-1 gap-4 sm:gap-5'
      : 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5';
  return <div className={cx(gridClass, className)}>{children}</div>;
};

export const FormField = ({ label, required, hint, error, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    {error && <p className="text-xs text-danger-600 font-medium mt-1">{error}</p>}
  </div>
);

export default FormPageLayout;
