"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatDateTime } from "@/lib/utils";

interface EpicrisisData {
  id?: string;
  diagIngreso?: string;
  diagEgreso?: string;
  resumenClinico?: string;
  estudiosRealizados?: string;
  tratamientosRealizados?: string;
  condicionEgreso?: string;
  destino?: string;
  indicacionesAlta?: string;
  proximoControlFecha?: string;
  proximoControlLugar?: string;
  proximoControlMedico?: string;
  pendiente?: string;
  firmadaAt?: string | null;
}

interface EpicrisisFormProps {
  internacionId: string;
  readOnly?: boolean;
  onSaved?: () => void;
  onSigned?: () => void;
}

export function EpicrisisForm({ internacionId, readOnly = false, onSaved, onSigned }: EpicrisisFormProps) {
  const [data, setData] = useState<EpicrisisData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/historia-clinica/${internacionId}/epicrisis`);
        if (res.ok) {
          const d = await res.json();
          if (d && d.id) setData(d);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [internacionId]);

  const handleChange = (key: keyof EpicrisisData, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/epicrisis`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFirmar = async () => {
    setSigning(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/epicrisis/firmar`, {
        method: "POST",
      });
      if (res.ok) {
        const d = await res.json();
        setData((prev) => ({ ...prev, firmadaAt: d.firmadaAt || new Date().toISOString() }));
        onSigned?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <p className="text-muted text-sm">Cargando epicrisis...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        {data.firmadaAt ? (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle size={12} /> Firmado {formatDateTime(data.firmadaAt)}
          </Badge>
        ) : (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertCircle size={12} /> Sin firmar
          </Badge>
        )}
        {!readOnly && (
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
          </Button>
        )}
        {!readOnly && !data.firmadaAt && (
          <Button variant="danger" onClick={handleFirmar} disabled={signing}>
            <LogOut size={16} /> {signing ? "Firmando..." : "Firmar y Dar de Alta"}
          </Button>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Diagnóstico de Ingreso" name="diagIngreso" value={data.diagIngreso || ""}
            onChange={(e) => handleChange("diagIngreso", e.target.value)} disabled={readOnly} />
          <Input label="Diagnóstico de Egreso" name="diagEgreso" value={data.diagEgreso || ""}
            onChange={(e) => handleChange("diagEgreso", e.target.value)} disabled={readOnly} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Condición de Egreso</label>
            <select value={data.condicionEgreso || ""} onChange={(e) => handleChange("condicionEgreso", e.target.value)} className="select-field" disabled={readOnly}>
              <option value="">Seleccionar...</option>
              <option value="MEJORADO">Mejorado</option>
              <option value="CURADO">Curado</option>
              <option value="SIN_CAMBIOS">Sin Cambios</option>
              <option value="DERIVADO">Derivado</option>
              <option value="FALLECIDO">Fallecido</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Destino</label>
            <select value={data.destino || ""} onChange={(e) => handleChange("destino", e.target.value)} className="select-field" disabled={readOnly}>
              <option value="">Seleccionar...</option>
              <option value="DOMICILIO">Domicilio</option>
              <option value="INT_DOMICILIARIA">Internación Domiciliaria</option>
              <option value="OTRO_EFECTOR">Otro Efecto</option>
              <option value="UTI">UTI</option>
            </select>
          </div>
        </div>
        <VoiceTextarea label="Resumen Clínico" value={data.resumenClinico || ""} onChange={(v) => handleChange("resumenClinico", v)} rows={6} disabled={readOnly} />
        <VoiceTextarea label="Estudios Realizados" value={data.estudiosRealizados || ""} onChange={(v) => handleChange("estudiosRealizados", v)} rows={3} disabled={readOnly} />
        <VoiceTextarea label="Tratamientos Realizados" value={data.tratamientosRealizados || ""} onChange={(v) => handleChange("tratamientosRealizados", v)} rows={3} disabled={readOnly} />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Indicaciones de Alta</label>
          <textarea value={data.indicacionesAlta || ""}
            onChange={(e) => handleChange("indicacionesAlta", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} disabled={readOnly} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Próximo Control - Fecha" name="proximoControlFecha" type="date"
            value={data.proximoControlFecha ? data.proximoControlFecha.slice(0, 10) : ""}
            onChange={(e) => handleChange("proximoControlFecha", e.target.value ? new Date(e.target.value).toISOString() : null)} disabled={readOnly} />
          <Input label="Próximo Control - Lugar" name="proximoControlLugar" value={data.proximoControlLugar || ""}
            onChange={(e) => handleChange("proximoControlLugar", e.target.value)} disabled={readOnly} />
          <Input label="Próximo Control - Médico" name="proximoControlMedico" value={data.proximoControlMedico || ""}
            onChange={(e) => handleChange("proximoControlMedico", e.target.value)} disabled={readOnly} />
        </div>
        <VoiceTextarea label="Pendiente" value={data.pendiente || ""} onChange={(v) => handleChange("pendiente", v)} rows={2} disabled={readOnly} />
      </div>
    </div>
  );
}
