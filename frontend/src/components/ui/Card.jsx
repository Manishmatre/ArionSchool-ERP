import React from 'react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Generic surface card with optional hover elevation and padding.
 */
export const Card = ({ as: Tag = 'div', hover = false, padded = true, className = '', children, ...rest }) => (
  <Tag
    className={cx('card', hover && 'card-hover', padded && 'card-pad', className)}
    {...rest}
  >
    {children}
  </Tag>
);

/**
 * Card header with title, optional subtitle and right-aligned action.
 */
export const CardHeader = ({ title, subtitle, action, icon: Icon, className = '' }) => (
  <div className={cx('flex items-start justify-between gap-3 mb-4', className)}>
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
          <Icon className="text-lg" />
        </span>
      )}
      <div className="min-w-0">
        {title && <h3 className="section-title truncate">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export default Card;
