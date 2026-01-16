import { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export function FormField({ label, name, id, ...inputProps }: FormFieldProps) {
  const fieldId = id || name;

  return (
    <div className="form-group">
      <label htmlFor={fieldId}>{label}</label>
      <input id={fieldId} name={name} {...inputProps} />
    </div>
  );
}
