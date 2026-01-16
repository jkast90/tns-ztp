import { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

export function FormField({ label, name, id, error, ...inputProps }: FormFieldProps) {
  const fieldId = id || name;

  return (
    <div className={`form-group${error ? ' has-error' : ''}`}>
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        name={name}
        className={error ? 'input-error' : undefined}
        {...inputProps}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
