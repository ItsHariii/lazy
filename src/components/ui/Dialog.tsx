import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

type DialogProps = {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ title, description, open, onClose, children }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-describedby={description ? "dialog-description" : undefined}
        aria-labelledby="dialog-title"
        aria-modal="true"
        className="dialog"
        role="dialog"
      >
        <div className="dialog__header">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {description ? <p id="dialog-description">{description}</p> : null}
          </div>
          <IconButton icon={<X size={18} />} label="Close dialog" onClick={onClose} />
        </div>
        <div className="dialog__body">{children}</div>
      </section>
    </div>
  );
}
