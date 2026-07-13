import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-3xl",
};

function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-h-[90vh] overflow-y-auto",
          "bg-surface border border-border rounded-xl shadow-2xl",
          "animate-scale-in",
          sizeStyles[size],
          "max-w-[calc(100vw-2rem)]"
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface/95 backdrop-blur-sm rounded-t-xl">
          {title && (
            <h2 className="text-base font-display font-semibold text-text">{title}</h2>
          )}
          <button
            onClick={onClose}
            className={cn(
              "rounded-lg p-1.5 text-muted hover:text-text hover:bg-surface-hover transition-colors",
              !title && "ml-auto"
            )}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export { Modal, type ModalProps };
