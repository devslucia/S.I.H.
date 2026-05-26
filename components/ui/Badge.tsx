import React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-400/10 text-green-400 border-green-400/25",
  warning: "bg-amber-400/10 text-amber-400 border-amber-400/25",
  error: "bg-red-400/10 text-red-400 border-red-400/25",
  info: "bg-[#00d4a1]/10 text-[#00d4a1] border-[#00d4a1]/25",
  default: "bg-gray-500/10 text-gray-400 border-gray-500/25",
};

function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export { Badge, type BadgeProps };
