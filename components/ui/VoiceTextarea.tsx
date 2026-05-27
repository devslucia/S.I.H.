"use client";

import { VoiceInput } from "./VoiceInput";

interface VoiceTextareaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function VoiceTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  label,
  disabled,
  className = "",
}: VoiceTextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`w-full bg-[#161b27] border border-[#1e2535] rounded-lg px-3 py-2 
                     text-[#f1f5f9] text-sm resize-none focus:outline-none 
                     focus:border-[#00d4a1] focus:ring-1 focus:ring-[#00d4a1]/30
                     pr-10 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        />
        {!disabled && (
          <div className="absolute top-2 right-2">
            <VoiceInput
              onTranscript={(text) =>
                onChange(value ? value + " " + text : text)
              }
              language="es-AR"
              continuous={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
