// Form utilities for handling React change events

import type { ChangeEvent } from 'react';

type HTMLFormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Creates a change handler that works with React form elements
 * and converts them to the useForm handleChange format.
 *
 * @example
 * const { handleChange } = useForm({ ... });
 * const onChange = createChangeHandler(handleChange);
 * <input name="field" onChange={onChange} />
 */
export function createChangeHandler<T extends object>(
  handleChange: <K extends keyof T>(name: K, value: T[K]) => void
) {
  return (e: ChangeEvent<HTMLFormElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let parsedValue: unknown;
    if (type === 'checkbox') {
      parsedValue = checked;
    } else if (type === 'number') {
      parsedValue = parseInt(value, 10) || 0;
    } else {
      parsedValue = value;
    }

    handleChange(name as keyof T, parsedValue as T[keyof T]);
  };
}

/**
 * Parse a textarea value containing comma or newline separated items into an array
 */
export function parseListValue(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Format an array as a comma-separated string for display in a textarea
 */
export function formatListValue(items: string[]): string {
  return items.join(', ');
}
