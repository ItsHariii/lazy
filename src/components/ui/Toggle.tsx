import { useId } from "react";

type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className="toggle">
      <span className="toggle__copy">
        <span className="toggle__label" id={labelId}>
          {label}
        </span>
        {description ? (
          <span className="toggle__description" id={descriptionId}>
            {description}
          </span>
        ) : null}
      </span>
      <button
        aria-checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={labelId}
        className="toggle__control"
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span className="toggle__thumb" />
      </button>
    </div>
  );
}
