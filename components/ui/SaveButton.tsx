"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  saving: boolean;
  /** true durante ~2 s tras un guardado exitoso (ver `useSavedFlag`) */
  saved?: boolean;
  label?: React.ReactNode;
  savingLabel?: string;
  savedLabel?: string;
  icon?: React.ElementType | null;
  variant?: "primary" | "secondary";
}

/**
 * Botón de guardado con los tres estados visibles: normal → Guardando… → Guardado.
 */
export function SaveButton({
  saving,
  saved = false,
  label = "Guardar",
  savingLabel = "Guardando…",
  savedLabel = "Guardado",
  icon: Icon = Save,
  variant = "primary",
  className,
  disabled,
  type = "submit",
  ...props
}: SaveButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || saving}
      aria-busy={saving}
      className={cn(
        variant === "primary" ? "btn-primary" : "btn-secondary",
        saved && !saving && variant === "primary" && "!bg-success hover:!bg-success",
        className
      )}
      {...props}
    >
      {saving ? (
        <>
          <Loader2 size={15} className="animate-spin" aria-hidden /> {savingLabel}
        </>
      ) : saved ? (
        <>
          <Check size={15} aria-hidden /> {savedLabel}
        </>
      ) : (
        <>
          {Icon && <Icon size={15} aria-hidden />} {label}
        </>
      )}
    </button>
  );
}

/** Flag "Guardado" temporal: `const [saved, markSaved] = useSavedFlag();` y llamar `markSaved()` al guardar OK. */
export function useSavedFlag(ms = 2000): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const mark = () => {
    clearTimeout(timer.current);
    setSaved(true);
    timer.current = setTimeout(() => setSaved(false), ms);
  };
  return [saved, mark];
}
