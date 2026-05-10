import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../../utils/classNames";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

export function Button({
  children,
  className,
  variant = "secondary",
  size = "md",
  icon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames("button", `button--${variant}`, `button--${size}`, className)}
      type={type}
      {...props}
    >
      {icon ? <span className="button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
