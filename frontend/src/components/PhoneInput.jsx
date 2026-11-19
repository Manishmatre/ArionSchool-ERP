import { useState, useEffect } from 'react';

const PhoneInput = ({ 
  value, 
  onChange, 
  placeholder = 'Enter 10-digit phone number',
  className = '',
  required = false,
  name,
  id,
  maxLength = 10,
  ...props 
}) => {
  const [error, setError] = useState('');
  const [internalValue, setInternalValue] = useState('');

  // Keep internal value in sync with external value
  useEffect(() => {
    // Clean the external value and update internal state
    const cleanedValue = (value || '').replace(/\D/g, '').slice(0, maxLength);
    setInternalValue(cleanedValue);
  }, [value, maxLength]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Only allow numbers
    const numbersOnly = inputValue.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedValue = numbersOnly.slice(0, maxLength);
    
    // Set error if not exactly 10 digits (but don't show error while typing)
    if (limitedValue.length === 10) {
      setError('');
    } else if (limitedValue.length > 0) {
      setError('Phone number must be 10 digits');
    }
    
    // Update internal value
    setInternalValue(limitedValue);
    
    // Create a synthetic event with the cleaned value
        const syntheticEvent = {
      target: {
        name: name, // Explicitly pass the name prop
        value: limitedValue
      }
    };
    
    onChange(syntheticEvent);
  };

  return (
    <div>
      <input
        type="tel"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full ${error ? 'border-red-500' : ''} ${className}`}
        required={required}
        name={name}
        id={id}
        maxLength={maxLength}
        pattern="[0-9]{10}"
        inputMode="numeric"
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default PhoneInput;
