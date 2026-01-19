import { useLayout, PAGE_WIDTH_OPTIONS, DIALOG_WIDTH_OPTIONS, type PageWidth, type DialogWidth } from '../context';
import { Icon } from './Icon';
import { Button } from './Button';

interface OptionCardProps {
  value: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function OptionCard({ label, description, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      className={`layout-option ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span className="layout-option-label">{label}</span>
      <span className="layout-option-desc">{description}</span>
    </button>
  );
}

export function LayoutSettings() {
  const { pageWidth, dialogWidth, setPageWidth, setDialogWidth, resetToDefaults } = useLayout();

  return (
    <div className="layout-settings">
      <div className="layout-setting-group">
        <label className="layout-setting-label">
          <Icon name="width_full" size={16} />
          Page Width
        </label>
        <div className="layout-options">
          {PAGE_WIDTH_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              value={opt.value}
              label={opt.label}
              description={opt.description}
              selected={pageWidth === opt.value}
              onClick={() => setPageWidth(opt.value as PageWidth)}
            />
          ))}
        </div>
      </div>

      <div className="layout-setting-group">
        <label className="layout-setting-label">
          <Icon name="open_in_new" size={16} />
          Dialog Width
        </label>
        <div className="layout-options">
          {DIALOG_WIDTH_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              value={opt.value}
              label={opt.label}
              description={opt.description}
              selected={dialogWidth === opt.value}
              onClick={() => setDialogWidth(opt.value as DialogWidth)}
            />
          ))}
        </div>
      </div>

      <div className="layout-reset">
        <Button variant="secondary" size="sm" onClick={resetToDefaults}>
          <Icon name="restart_alt" size={14} />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
