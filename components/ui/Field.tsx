import React from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Envoltorio de campo de formulario: label + (*) obligatorio + control + error/ayuda debajo.
 * Funciona con inputs nativos (`input-field`, `select-field`) o componentes propios.
 */
export function Field({ label, htmlFor, required, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && (
          <span className="text-error ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Agrupa campos relacionados con un título: evita formularios largos sin jerarquía. */
export function FormSection({ title, description, icon: Icon, actions, className, children }: FormSectionProps) {
  return (
    <section className={cn("card", className)}>
      <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && <Icon size={15} className="text-brand mt-0.5 shrink-0" aria-hidden />}
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-text">{title}</h2>
            {description && <p className="text-[12px] text-muted mt-0.5">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
