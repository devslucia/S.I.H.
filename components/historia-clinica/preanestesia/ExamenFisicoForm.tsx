"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { Input } from "@/components/ui/Input";
import type { ExamenFisico, PsiquismoValor, MallampatiValor, EmbarazoValor } from "@/types";

interface ExamenFisicoFormProps {
  value: ExamenFisico;
  onChange: (val: ExamenFisico) => void;
  patientSex?: string;
  disabled?: boolean;
}

const PSIQUISMO_OPTIONS: PsiquismoValor[] = ["Normal", "Ansioso", "Hiperemotivo", "Excitado", "Deprimido", "Comatoso"];
const MALLAMPATI_OPTIONS: MallampatiValor[] = ["I", "II", "III", "IV"];
const EMBARAZO_OPTIONS: { val: EmbarazoValor; label: string }[] = [
  { val: "si", label: "Sí" },
  { val: "ignora", label: "Ignora" },
  { val: "niega", label: "Niega" },
];

export function ExamenFisicoForm({ value, onChange, patientSex, disabled }: ExamenFisicoFormProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const isFemenino = patientSex === "FEMENINO";

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const updateField = <K extends keyof ExamenFisico>(field: K, val: ExamenFisico[K]) => {
    onChange({ ...value, [field]: val });
  };

  const updateCabezaCuello = (field: string, val: any) => {
    onChange({
      ...value,
      cabezaCuello: { ...value.cabezaCuello, [field]: val },
    });
  };

  const hasData = (section: string): boolean => {
    switch (section) {
      case "psiquismo":
        return value.psiquismo !== "";
      case "cabezaCuello":
        return (
          value.cabezaCuello.movilidad !== "" ||
          value.cabezaCuello.mallampati !== "" ||
          value.cabezaCuello.protesisDental ||
          value.cabezaCuello.otros !== ""
        );
      case "cardiovascular":
        return value.cardiovascular !== "";
      case "respiratorio":
        return value.respiratorio !== "";
      case "embarazo":
        return value.embarazo !== "";
      case "otros":
        return value.otros !== "";
      default:
        return false;
    }
  };

  const sections = [
    { id: "psiquismo", label: "1. Psiquismo" },
    { id: "cabezaCuello", label: "2. Cabeza y cuello" },
    { id: "cardiovascular", label: "3. Examen cardiovascular / TA / FC / ECG" },
    { id: "respiratorio", label: "4. Examen respiratorio / FR" },
    ...(isFemenino ? [{ id: "embarazo", label: "5. Embarazo" }] : []),
    { id: "otros", label: isFemenino ? "6. Otros" : "5. Otros" },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text uppercase tracking-wide">
        Examen Físico
      </label>

      <div className="space-y-1">
        {sections.map((sec) => {
          const isExpanded = expanded === sec.id;
          const hasInfo = hasData(sec.id);

          return (
            <div key={sec.id} className="border border-border/50 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(sec.id)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                  hasInfo ? "bg-accent/5 hover:bg-accent/10" : "hover:bg-border/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-muted" />
                  ) : (
                    <ChevronRight size={14} className="text-muted" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      hasInfo ? "text-accent" : "text-text-secondary"
                    }`}
                  >
                    {sec.label}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-border/30">
                  {/* Psiquismo */}
                  {sec.id === "psiquismo" && (
                    <div className="flex flex-wrap gap-2">
                      {PSIQUISMO_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => updateField("psiquismo", opt)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            value.psiquismo === opt
                              ? "bg-accent text-black"
                              : "bg-border text-text-secondary hover:bg-surface-active"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cabeza y cuello */}
                  {sec.id === "cabezaCuello" && (
                    <div className="space-y-3">
                      <Input
                        label="Movilidad"
                        value={value.cabezaCuello.movilidad}
                        onChange={(e) => updateCabezaCuello("movilidad", e.target.value)}
                        placeholder="Ej: Limitada, normal..."
                        disabled={disabled}
                      />
                      <div className="space-y-1">
                        <label className="block text-xs text-muted">Mallampati</label>
                        <div className="flex flex-wrap gap-2">
                          {MALLAMPATI_OPTIONS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              disabled={disabled}
                              onClick={() => updateCabezaCuello("mallampati", m)}
                              className={`px-3 py-1 rounded-lg text-sm ${
                                value.cabezaCuello.mallampati === m
                                  ? "bg-accent text-black"
                                  : "bg-border text-text-secondary hover:bg-surface-active"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value.cabezaCuello.protesisDental}
                          onChange={(e) => updateCabezaCuello("protesisDental", e.target.checked)}
                          disabled={disabled}
                          className="accent-accent"
                        />
                        Prótesis dental
                      </label>
                      <VoiceTextarea
                        label="Otros (cabeza y cuello)"
                        value={value.cabezaCuello.otros}
                        onChange={(val) => updateCabezaCuello("otros", val)}
                        placeholder="Observaciones..."
                        rows={2}
                        disabled={disabled}
                      />
                    </div>
                  )}

                  {/* Cardiovascular */}
                  {sec.id === "cardiovascular" && (
                    <VoiceTextarea
                      value={value.cardiovascular}
                      onChange={(val) => updateField("cardiovascular", val)}
                      placeholder="TA, FC, ruidos cardíacos, soplos, ECG..."
                      rows={3}
                      disabled={disabled}
                    />
                  )}

                  {/* Respiratorio */}
                  {sec.id === "respiratorio" && (
                    <VoiceTextarea
                      value={value.respiratorio}
                      onChange={(val) => updateField("respiratorio", val)}
                      placeholder="FR, ruidos respiratorios, estertores, sibilancias..."
                      rows={3}
                      disabled={disabled}
                    />
                  )}

                  {/* Embarazo */}
                  {sec.id === "embarazo" && (
                    <div className="space-y-2">
                      <label className="block text-xs text-muted">Embarazo</label>
                      <div className="flex gap-3">
                        {EMBARAZO_OPTIONS.map((opt) => (
                          <label key={opt.val} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                            <input
                              type="radio"
                              name="embarazo"
                              checked={value.embarazo === opt.val}
                              onChange={() => updateField("embarazo", opt.val)}
                              disabled={disabled}
                              className="accent-accent"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Otros */}
                  {sec.id === "otros" && (
                    <VoiceTextarea
                      value={value.otros}
                      onChange={(val) => updateField("otros", val)}
                      placeholder="Otros hallazgos del examen físico..."
                      rows={3}
                      disabled={disabled}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
