import { SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  error?: string;
}

export function SelectField({ label, name, id, options, error, ...selectProps }: SelectFieldProps) {
  const fieldId = id || name;

  return (
    <div className={`form-group${error ? ' has-error' : ''}`}>
      <label htmlFor={fieldId}>{label}</label>
      <select
        id={fieldId}
        name={name}
        className={error ? 'input-error' : undefined}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
