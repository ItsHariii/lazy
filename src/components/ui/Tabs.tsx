import type { ReactNode } from "react";

type TabItem<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

type TabsProps<T extends string> = {
  label: string;
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
};

export function Tabs<T extends string>({
  label,
  items,
  activeId,
  onChange,
}: TabsProps<T>) {
  return (
    <div aria-label={label} className="tabs" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={activeId === item.id}
          className="tabs__button"
          key={item.id}
          onClick={() => onChange(item.id)}
          role="tab"
          type="button"
        >
          {item.icon ? <span className="tabs__icon">{item.icon}</span> : null}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
