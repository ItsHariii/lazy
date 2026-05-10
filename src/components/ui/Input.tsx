import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
};

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helperText?: string;
};

export function Input({ label, helperText, id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <input className="field__input" id={inputId} {...props} />
      {helperText ? <span className="field__helper">{helperText}</span> : null}
    </label>
  );
}

export function TextArea({ label, helperText, id, ...props }: TextAreaProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <textarea className="field__input field__textarea" id={inputId} {...props} />
      {helperText ? <span className="field__helper">{helperText}</span> : null}
    </label>
  );
}
