"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EditorEvolucionProps {
  onSave: (content: string) => Promise<void>;
}

function EditorEvolucion({ onSave }: EditorEvolucionProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [firmado, setFirmado] = useState(false);

  const now = new Date();
  const prefix = format(now, "dd/MM/yyyy HH:mm", { locale: es });

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave(`${prefix} - ${content}`);
      setFirmado(true);
    } finally {
      setSaving(false);
    }
  };

  if (firmado) {
    return (
      <div className="rounded-lg border-2 border-green-500/40 bg-[#161b27] p-4">
        <p className="text-xs text-green-400 mb-2">Firmado: {prefix}</p>
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escriba la evolución..."
        rows={8}
        className="w-full rounded-lg border border-[#1e2535] bg-[#161b27] px-3 py-2 text-sm text-gray-200 placeholder-gray-500 transition-colors focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40 resize-y"
      />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !content.trim()}>
          {saving ? "Guardando..." : "Firmar Evolución"}
        </Button>
      </div>
    </div>
  );
}

export { EditorEvolucion, type EditorEvolucionProps };
