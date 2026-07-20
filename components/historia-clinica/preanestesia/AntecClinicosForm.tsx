"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import type { AntecClinicos } from "@/types";

interface AntecClinicosFormProps {
  value: AntecClinicos;
  onChange: (val: AntecClinicos) => void;
  disabled?: boolean;
}

interface CheckboxItem {
  key: string;
  label: string;
}

interface CategoryConfig {
  id: keyof AntecClinicos;
  label: string;
  checkboxes?: CheckboxItem[];
  type: "checkboxes" | "text";
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "cardiovasculares",
    label: "1. Cardiovasculares",
    type: "checkboxes",
    checkboxes: [
      { key: "hipertension", label: "Hipertensión" },
      { key: "hipotension", label: "Hipotensión" },
      { key: "arritmias", label: "Arritmias" },
      { key: "infartoPrevio", label: "Infarto previo" },
      { key: "disneaEsfuerzo", label: "Disnea de esfuerzo" },
      { key: "disneaReposo", label: "Disnea de reposo" },
      { key: "anginaPecho", label: "Angina de pecho" },
      { key: "insuficienciaCardiaca", label: "Insuficiencia cardíaca" },
      { key: "arterialPeriferica", label: "Arterial periférica" },
      { key: "varices", label: "Várices" },
    ],
  },
  {
    id: "respiratorios",
    label: "2. Respiratorios",
    type: "checkboxes",
    checkboxes: [
      { key: "asmaBronquial", label: "Asma bronquial" },
      { key: "broncoespasmo", label: "Broncoespasmo" },
      { key: "neumonia", label: "Neumonía" },
      { key: "neumonitis", label: "Neumonitis" },
      { key: "pleuresia", label: "Pleuresía" },
      { key: "tos", label: "Tos" },
      { key: "expectoracion", label: "Expectoración" },
      { key: "epoc", label: "EPOC" },
    ],
  },
  {
    id: "endocrinosMetabolicos",
    label: "3. Endócrinos y metabólicos",
    type: "checkboxes",
    checkboxes: [
      { key: "diabetes", label: "Diabetes" },
      { key: "obesidad", label: "Obesidad" },
      { key: "hipertiroidismo", label: "Hipertiroidismo" },
      { key: "hipotiroidismo", label: "Hipotiroidismo" },
    ],
  },
  {
    id: "digestivos",
    label: "4. Digestivos",
    type: "checkboxes",
    checkboxes: [
      { key: "esofago", label: "Esófago" },
      { key: "estomago", label: "Estómago" },
      { key: "intestino", label: "Intestino" },
      { key: "recto", label: "Recto" },
      { key: "ano", label: "Ano" },
      { key: "diarrea", label: "Diarrea" },
      { key: "vomitos", label: "Vómitos" },
      { key: "higado", label: "Hígado" },
      { key: "viasBiliares", label: "Vías biliares" },
    ],
  },
  {
    id: "hematologicos",
    label: "5. Hematológicos",
    type: "checkboxes",
    checkboxes: [
      { key: "anemia", label: "Anemia" },
      { key: "trastornoCoagulacion", label: "Trastorno de la coagulación" },
    ],
  },
  {
    id: "ginecobstetricos",
    label: "6. Ginecobstétricos",
    type: "checkboxes",
    checkboxes: [
      { key: "embarazos", label: "Embarazos" },
      { key: "partos", label: "Partos" },
      { key: "cesareas", label: "Cesáreas" },
    ],
  },
  {
    id: "nefrourologicos",
    label: "7. Nefrourológicos",
    type: "checkboxes",
    checkboxes: [
      { key: "nefrouropatias", label: "Nefrouropatías" },
      { key: "urolitiasis", label: "Urolitiasis" },
      { key: "hematuria", label: "Hematuria" },
      { key: "dialisis", label: "Diálisis" },
      { key: "sondaVesical", label: "Sonda vesical" },
    ],
  },
  {
    id: "neurologicos",
    label: "8. Neurológicos",
    type: "checkboxes",
    checkboxes: [
      { key: "meningoencefalitis", label: "Meningoencefalitis" },
      { key: "traumatismoCraneo", label: "Traumatismo de cráneo" },
      { key: "perdidaConocimiento", label: "Pérdida de conocimiento" },
      { key: "coma", label: "Coma" },
      { key: "convulsiones", label: "Convulsiones" },
      { key: "disritmia", label: "Disritmia" },
      { key: "paralysis", label: "Parálisis" },
    ],
  },
  {
    id: "traumaticos",
    label: "9. Traumatológicos",
    type: "checkboxes",
    checkboxes: [
      { key: "fracturas", label: "Fracturas" },
      { key: "hematomas", label: "Hematomas" },
      { key: "artritis", label: "Artritis" },
      { key: "artrosis", label: "Artrosis" },
      { key: "protesis", label: "Prótesis" },
    ],
  },
  {
    id: "habitosToxicos",
    label: "10. Hábitos tóxicos",
    type: "checkboxes",
    checkboxes: [
      { key: "tabaquismo", label: "Tabaquismo" },
      { key: "etilismo", label: "Etilismo" },
    ],
  },
  { id: "alimentacion", label: "11. Alimentación", type: "text" },
  { id: "medicamentosos", label: "12. Medicamentosos (medicación habitual)", type: "text" },
  { id: "otros", label: "13. Otros generales", type: "text" },
];

function countChecked(obj: any): number {
  if (!obj || typeof obj !== "object") return 0;
  return Object.values(obj).filter((v) => v === true).length;
}

function CategoryCheckboxes({
  category,
  data,
  onChange,
  disabled,
}: {
  category: CategoryConfig;
  data: any;
  onChange: (key: string, val: any) => void;
  disabled: boolean;
}) {
  if (!category.checkboxes) return null;

  const total = category.checkboxes.length;
  const checked = countChecked(data);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {category.checkboxes.map((cb) => (
          <label key={cb.key} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={!!data[cb.key]}
              onChange={(e) => onChange(cb.key, e.target.checked)}
              disabled={disabled}
              className="accent-accent"
            />
            {cb.label}
          </label>
        ))}
      </div>
      {data.otros !== undefined && (
        <VoiceTextarea
          label="Otros"
          value={data.otros || ""}
          onChange={(val) => onChange("otros", val)}
          placeholder="Especificar otros..."
          rows={2}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export function AntecClinicosForm({ value, onChange, disabled }: AntecClinicosFormProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const updateCategory = <K extends keyof AntecClinicos>(
    categoryId: K,
    field: string,
    val: any
  ) => {
    const current = value[categoryId];
    if (typeof current === "object" && current !== null) {
      onChange({
        ...value,
        [categoryId]: { ...(current as any), [field]: val },
      });
    } else {
      onChange({
        ...value,
        [categoryId]: val,
      });
    }
  };

  const totalCheckboxes = CATEGORIES.filter((c) => c.type === "checkboxes").reduce(
    (sum, c) => sum + (c.checkboxes?.length || 0),
    0
  );
  const totalChecked = CATEGORIES.filter((c) => c.type === "checkboxes").reduce(
    (sum, c) => sum + countChecked(value[c.id]),
    0
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-text uppercase tracking-wide">
          Antecedentes Clínicos
        </label>
        <span className="text-xs text-muted">
          {totalChecked}/{totalCheckboxes} seleccionados
        </span>
      </div>

      <div className="space-y-1">
        {CATEGORIES.map((cat) => {
          const isExpanded = expanded === cat.id;
          const catData = value[cat.id];
          const hasData =
            cat.type === "checkboxes"
              ? countChecked(catData) > 0
              : typeof catData === "string" && catData.length > 0;

          return (
            <div key={cat.id} className="border border-border/50 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(cat.id)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                  hasData
                    ? "bg-accent/5 hover:bg-accent/10"
                    : "hover:bg-border/30"
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
                      hasData ? "text-accent" : "text-text-secondary"
                    }`}
                  >
                    {cat.label}
                  </span>
                </div>
                {cat.type === "checkboxes" && cat.checkboxes && (
                  <span className="text-xs text-muted">
                    {countChecked(catData)}/{cat.checkboxes.length}
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-border/30">
                  {cat.type === "checkboxes" ? (
                    <CategoryCheckboxes
                      category={cat}
                      data={catData}
                      onChange={(field, val) => updateCategory(cat.id, field, val)}
                      disabled={disabled || false}
                    />
                  ) : (
                    <VoiceTextarea
                      value={(catData as string) || ""}
                      onChange={(val) => onChange({ ...value, [cat.id]: val })}
                      placeholder={`Ingrese ${cat.label.toLowerCase()}...`}
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
