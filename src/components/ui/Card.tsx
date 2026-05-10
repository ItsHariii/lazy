import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "../../utils/classNames";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "article" | "section" | "div";
};

export function Card({ children, className, as: Element = "article", ...props }: CardProps) {
  return (
    <Element className={classNames("card", className)} {...props}>
      {children}
    </Element>
  );
}
