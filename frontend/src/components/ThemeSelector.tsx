import { useState } from 'react';
import type { Theme } from '../core';
import { Icon } from './Icon';
import { Drawer } from './Drawer';

export type { Theme };

interface ThemeSelectorProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const themes: { value: Theme; icon: string; label: string; description: string }[] = [
  { value: 'dark', icon: 'dark_mode', label: 'Dark', description: 'Dark background with blue accents' },
  { value: 'light', icon: 'light_mode', label: 'Light', description: 'Light background with blue accents' },
  { value: 'plain', icon: 'check_box_outline_blank', label: 'Plain', description: 'Minimal styling, no gradients' },
];

export function ThemeSelector({ theme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentTheme = themes.find((t) => t.value === theme);

  return (
    <>
      <ThemeSelectorToggle
        currentIcon={currentTheme?.icon || 'palette'}
        onClick={() => setIsOpen(true)}
      />

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Theme"
      >
        <div className="theme-options">
          {themes.map(({ value, icon, label, description }) => (
            <button
              key={value}
              className={`theme-option ${theme === value ? 'active' : ''}`}
              onClick={() => {
                onThemeChange(value);
                setIsOpen(false);
              }}
            >
              <Icon name={icon} size={24} />
              <div className="theme-option-text">
                <span className="theme-option-label">{label}</span>
                <span className="theme-option-description">{description}</span>
              </div>
              {theme === value && <Icon name="check" size={20} className="theme-option-check" />}
            </button>
          ))}
        </div>
      </Drawer>
    </>
  );
}

interface ThemeSelectorToggleProps {
  currentIcon: string;
  onClick: () => void;
}

export function ThemeSelectorToggle({ currentIcon, onClick }: ThemeSelectorToggleProps) {
  return (
    <button
      className="theme-toggle"
      onClick={onClick}
      title="Change theme"
    >
      <Icon name={currentIcon} size={20} />
    </button>
  );
}
