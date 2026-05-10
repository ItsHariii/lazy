import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

type MenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
};

type MenuProps = {
  label: string;
  items: MenuItem[];
};

export function Menu({ label, items }: MenuProps) {
  return (
    <details className="menu">
      <summary aria-label={label} className="menu__trigger" title={label}>
        <MoreHorizontal aria-hidden="true" size={18} />
      </summary>
      <div className="menu__content" role="menu">
        {items.map((item) => (
          <button
            className="menu__item"
            key={item.label}
            onClick={() => {
              item.onSelect();
            }}
            role="menuitem"
            type="button"
          >
            {item.icon ? <span className="menu__icon">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
