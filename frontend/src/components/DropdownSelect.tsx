import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

export interface DropdownOption {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}

interface Props {
  options: DropdownOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  icon?: string;
  showCheckmark?: boolean;
  className?: string;
}

export function DropdownSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  icon = 'menu',
  showCheckmark = true,
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className={`dropdown-select ${className}`} ref={dropdownRef}>
      <button
        className="dropdown-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        type="button"
      >
        <Icon name={icon} size={20} />
        <span className="dropdown-select-label">
          {selectedOption?.label || placeholder}
        </span>
        <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={20} />
      </button>

      {isOpen && (
        <div className="dropdown-select-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.id}
              className={`dropdown-select-item${option.id === value ? ' active' : ''}`}
              onClick={() => handleSelect(option.id)}
              role="option"
              aria-selected={option.id === value}
              type="button"
            >
              {option.icon && <Icon name={option.icon} size={18} />}
              <div className="dropdown-select-item-content">
                <span className="dropdown-select-item-label">{option.label}</span>
                {option.description && (
                  <span className="dropdown-select-item-description">
                    {option.description}
                  </span>
                )}
              </div>
              {showCheckmark && option.id === value && (
                <Icon name="check" size={18} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
