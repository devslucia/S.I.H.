import React from "react";
import Link from "next/link";
import { AlertCircle, Inbox, Loader2, Lock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estados de pantalla unificados: cargando, vacío, error y sin permiso.
 * Usar en lugar de textos sueltos tipo "Cargando..." / "No hay datos".
 */

interface LoadingStateProps {
  label?: string;
  className?: string;
  /** compacto: una línea inline (dentro de cards/secciones) */
  compact?: boolean;
}

export function LoadingState({ label = "Cargando…", className, compact }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center text-muted",
        compact ? "gap-2 py-2 text-[12px]" : "justify-center gap-2.5 py-12 text-[13px]",
        className
      )}
    >
      <Loader2 size={compact ? 14 : 16} className="animate-spin text-brand" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

interface SkeletonRowsProps {
  rows?: number;
  className?: string;
}

/** Placeholder de tabla/listado mientras carga. */
export function SkeletonRows({ rows = 5, className }: SkeletonRowsProps) {
  return (
    <div className={cn("space-y-2 p-4", className)} role="status" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-9" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ElementType;
  /** CTA opcional: botón o link ya armado */
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
  /** Recuadro punteado: para usar suelto en la página (no dentro de una card) */
  bordered?: boolean;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className, compact, bordered }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        bordered && "border border-dashed border-border rounded-lg bg-surface/40",
        compact ? "py-6 px-4 gap-1.5" : "py-12 px-6 gap-2",
        className
      )}
    >
      <div className={cn("rounded-full bg-surface-hover flex items-center justify-center text-muted", compact ? "w-8 h-8" : "w-11 h-11 mb-1")}>
        <Icon size={compact ? 15 : 20} aria-hidden />
      </div>
      <p className={cn("font-medium text-text", compact ? "text-[13px]" : "text-sm")}>{title}</p>
      {description && <p className="text-[12px] text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = "No se pudo cargar la información", message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center text-center py-12 px-6 gap-2", className)}
    >
      <div className="w-11 h-11 mb-1 rounded-full bg-error/10 flex items-center justify-center text-error">
        <AlertCircle size={20} aria-hidden />
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {message && <p className="text-[12px] text-muted max-w-sm">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary text-[13px] mt-2 py-1.5">
          <RefreshCw size={13} /> Reintentar
        </button>
      )}
    </div>
  );
}

interface AccessDeniedProps {
  message?: React.ReactNode;
  backHref?: string;
  className?: string;
}

export function AccessDenied({
  message = "Tu rol no tiene permiso para ver esta sección. Si lo necesitás, pedí acceso al administrador.",
  backHref = "/",
  className,
}: AccessDeniedProps) {
  return (
    <div className={cn("card flex flex-col items-center justify-center text-center py-14 px-6 gap-2", className)}>
      <div className="w-11 h-11 mb-1 rounded-full bg-warning/10 flex items-center justify-center text-warning">
        <Lock size={20} aria-hidden />
      </div>
      <p className="text-sm font-medium text-text">Sin permiso</p>
      <p className="text-[12px] text-muted max-w-sm">{message}</p>
      <Link href={backHref} className="btn-secondary text-[13px] mt-2 py-1.5">
        Volver al inicio
      </Link>
    </div>
  );
}
