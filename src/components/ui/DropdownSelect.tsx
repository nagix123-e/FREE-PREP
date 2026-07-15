export type DropdownOption = {
  label: string;
  value: string;
};

type DropdownSelectProps = {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  value: string;
};

export function DropdownSelect({ className = "", label, onChange, options, value }: DropdownSelectProps) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`dropdown-select ${className}`.trim()}>
      <div className="dropdown-select__label">{label}</div>
      <ul className="menu dropdown-menu">
        <li className="item">
          <button className="link" type="button">
            <span className="dropdown-menu__text">{selected?.label ?? "Select"}</span>
            <svg viewBox="0 0 320 512" aria-hidden="true">
              <path d="M143 352.3 7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0L160 256l96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.3 9.5-24.5 9.5-33.9.2z" />
            </svg>
          </button>
          <ul className="submenu">
            {options.map((option) => (
              <li className="submenu-item" key={option.value || "__empty"}>
                <button
                  className="submenu-link"
                  onClick={() => onChange(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}
