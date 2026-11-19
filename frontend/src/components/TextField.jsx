/**
 * Styled text input matching app form controls (not raw browser defaults).
 */
const TextField = ({
  value = '',
  onChange,
  placeholder = '',
  className = '',
  disabled = false,
  id,
  name,
  autoComplete = 'off',
  ...props
}) => (
  <input
    type="text"
    id={id}
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    autoComplete={autoComplete}
    className={`input-field bg-white text-slate-900 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
    {...props}
  />
);

export default TextField;
