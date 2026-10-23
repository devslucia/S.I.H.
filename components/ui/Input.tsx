import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, required, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id || autoId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="field-label"
          >
            {label}
            {required && <span className="text-error ml-0.5" aria-hidden>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background",
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-border focus:border-brand focus:ring-brand/20 hover:border-border-hover",
            className
          )}
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} role="alert" className="field-error">{error}</span>
        )}
        {hint && !error && (
          <span id={`${inputId}-hint`} className="text-[11px] text-muted">{hint}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, type InputProps };
