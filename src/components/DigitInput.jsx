import { useState } from 'react';

function DigitInput({ label, maxDigits, value, onChange, placeholder, onComplete }) {
  const [touched, setTouched] = useState(false);

  const handleChange = (e) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    const truncated = digitsOnly.slice(0, maxDigits);

    onChange(truncated);

    if (truncated.length === maxDigits && onComplete) {
      onComplete(truncated);
    }
  };

  const isComplete = value.length === maxDigits;
  const isPartial = value.length > 0 && value.length < maxDigits;

  return (
    <div className="digit-input-wrapper">
      {label && <label className="digit-input-label">{label}</label>}

      <input
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        maxLength={maxDigits}
        placeholder={placeholder || `Enter ${maxDigits}-digit number`}
        className={`digit-input ${isComplete ? 'digit-input--complete' : ''}`}
      />

      <div className="digit-input-meta">
        <span className={isPartial && touched ? 'digit-input-warning' : 'digit-input-count'}>
          {value.length} / {maxDigits} digits
        </span>
      </div>
    </div>
  );
}

export default DigitInput;