const DateInput = ({ 
  value, 
  onChange, 
  placeholder = 'Select date',
  className = '',
  required = false,
  name,
  id,
  maxDate,
  minDate,
  ...props 
}) => {
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // If no value is provided, use today's date
  const displayValue = value || getTodayDate();

  return (
    <input
      type="date"
      value={displayValue}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full ${className}`}
      required={required}
      name={name}
      id={id}
      max={maxDate}
      min={minDate || '1900-01-01'}
      {...props}
    />
  );
};

export default DateInput;
