"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";

interface Epicrisis {
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

export default function EpicrisisPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<Epicrisis>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/epicrisis`);
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

  useEffect(() => { fetchData(); }, [params.internacionId]);

  const handleChange = (key: keyof Epicrisis, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/epicrisis`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
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
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/epicrisis/firmar`, {
        method: "POST",
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <p className="text-muted text-sm">Cargando epicrisis...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-white">Epicrisis</h2>
        </div>
        <div className="flex items-center gap-3">
          {data.firmadaAt ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle size={12} /> Firmado {formatDateTime(data.firmadaAt)}
            </Badge>
          ) : (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertCircle size={12} /> Sin firmar
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
          </Button>
          {!data.firmadaAt && (
            <Button variant="danger" onClick={handleFirmar} disabled={signing}>
              <LogOut size={16} /> {signing ? "Firmando..." : "Firmar y Dar de Alta"}
            </Button>
          )}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Diagnóstico de Ingreso" name="diagIngreso" value={data.diagIngreso || ""}
            onChange={(e) => handleChange("diagIngreso", e.target.value)} />
          <Input label="Diagnóstico de Egreso" name="diagEgreso" value={data.diagEgreso || ""}
            onChange={(e) => handleChange("diagEgreso", e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Condición de Egreso</label>
            <select value={data.condicionEgreso || ""} onChange={(e) => handleChange("condicionEgreso", e.target.value)} className="select-field">
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
            <select value={data.destino || ""} onChange={(e) => handleChange("destino", e.target.value)} className="select-field">
              <option value="">Seleccionar...</option>
              <option value="DOMICILIO">Domicilio</option>
              <option value="INT_DOMICILIARIA">Internación Domiciliaria</option>
              <option value="OTRO_EFECTOR">Otro Efecto</option>
              <option value="UTI">UTI</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Resumen Clínico</label>
          <textarea value={data.resumenClinico || ""}
            onChange={(e) => handleChange("resumenClinico", e.target.value)}
            className="input-field min-h-[100px] resize-y" rows={4} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Estudios Realizados</label>
          <textarea value={data.estudiosRealizados || ""}
            onChange={(e) => handleChange("estudiosRealizados", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Tratamientos Realizados</label>
          <textarea value={data.tratamientosRealizados || ""}
            onChange={(e) => handleChange("tratamientosRealizados", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Indicaciones de Alta</label>
          <textarea value={data.indicacionesAlta || ""}
            onChange={(e) => handleChange("indicacionesAlta", e.target.value)}
            className="input-field min-h-[80px] resize-y" rows={3} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Próximo Control - Fecha" name="proximoControlFecha" type="date"
            value={data.proximoControlFecha ? data.proximoControlFecha.slice(0, 10) : ""}
            onChange={(e) => handleChange("proximoControlFecha", e.target.value ? new Date(e.target.value).toISOString() : null)} />
          <Input label="Próximo Control - Lugar" name="proximoControlLugar" value={data.proximoControlLugar || ""}
            onChange={(e) => handleChange("proximoControlLugar", e.target.value)} />
          <Input label="Próximo Control - Médico" name="proximoControlMedico" value={data.proximoControlMedico || ""}
            onChange={(e) => handleChange("proximoControlMedico", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Pendiente</label>
          <textarea value={data.pendiente || ""}
            onChange={(e) => handleChange("pendiente", e.target.value)}
            className="input-field min-h-[60px] resize-y" rows={2} />
        </div>
      </div>
    </div>
  );
}
