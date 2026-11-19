import React from 'react';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  success: 'btn-success',
};

const Button = ({
  as: Tag = 'button',
  variant = 'primary',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  className = '',
  children,
  ...rest
}) => (
  <Tag className={`${VARIANTS[variant] || VARIANTS.primary} ${className}`} {...rest}>
    {loading ? (
      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
    ) : (
      Icon && <Icon className="text-base" />
    )}
    {children}
    {IconRight && <IconRight className="text-base" />}
  </Tag>
);

export default Button;
