type NeonCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
};

export function NeonCheckbox({ ariaLabel, checked, onChange }: NeonCheckboxProps) {
  return (
    <span className="neon-checkbox">
      <input
        aria-label={ariaLabel}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="neon-checkbox__frame">
        <span className="neon-checkbox__box" />
        <span className="neon-checkbox__glow" />
        <span className="neon-checkbox__borders" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
        <span className="neon-checkbox__check-container">
          <svg className="neon-checkbox__check" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.2 4.2L19 7" />
          </svg>
        </span>
        <span className="neon-checkbox__particles" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <span key={index} />)}
        </span>
        <span className="neon-checkbox__rings" aria-hidden="true">
          <span className="ring" />
          <span className="ring" />
          <span className="ring" />
        </span>
        <span className="neon-checkbox__sparks" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
      </span>
    </span>
  );
}
