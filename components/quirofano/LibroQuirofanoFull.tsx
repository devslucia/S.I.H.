"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatDateTime } from "@/lib/utils";
import { ProtocoloAnestesiaComponent } from "@/components/historia-clinica/ProtocoloAnestesia";
import {
  X, Save, Printer, CheckCircle, Plus, Trash2,
  Search, Syringe, Microscope, Activity, User, Hash, Clock,
  Baby, Stethoscope, Heart, BarChart3, Calendar, AlertTriangle, Thermometer
} from "lucide-react";

type CirugiaData = any;
type UsuarioData = { id: string; nombre: string; email: string; rol: string; matricula?: string; especialidad?: string };
type StockItemData = { id: string; nombre: string; presentacion?: string; stockActual: number; principioActivo?: string };

const TABS = ["Cirugía", "Prácticas/Med", "Parto/Cesárea", "Parte Quirúrgico", "Ingresos/Egresos", "Reprogramaciones", "Protocolo Anestesia"];
const SUB_TABS_PARTE = ["Parte Quirúrgico", "Evolución Post Int.", "Indicaciones Postop."];
const POSICIONES = ["Decúbito dorsal", "Decúbito ventral", "Decúbito lateral", "Trendelenburg", "Anti-Trendelenburg", "Litotomía"];
const MOTIVOS_REPROG = ["Falta de insumos", "Emergencia", "Paciente no apto", "Cirujano no disponible", "Falta de cama UTI", "Otro"];
const SANGRE_PERDIDA = ["No", "Sí - Leve", "Sí - Moderada", "Sí - Grave"];

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent";
const labelClass = "text-xs text-muted font-medium mb-1 block";
const btnClass = "px-4 py-2 text-sm rounded font-medium transition-colors";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-accent/90`;
const btnOutline = `${btnClass} border border-border text-muted hover:text-white hover:border-muted`;
const btnDanger = `${btnClass} bg-red/20 text-red hover:bg-red/30`;

export default function LibroQuirofanoFull() {
  const params = useParams();
  const cirugiaId = params.cirugiaId as string;
  const [activeTab, setActiveTab] = useState(0);
  const [subTab, setSubTab] = useState(0);
  const [data, setData] = useState<CirugiaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioData[]>([]);
  const [stockItems, setStockItems] = useState<StockItemData[]>([]);
  const [stockQuery, setStockQuery] = useState("");
  const [showStockModal, setShowStockModal] = useState(false);
  const [medForm, setMedForm] = useState<any>({ cantidad: 1, via: "EV", horaAplicacion: "", observacion: "" });
  const [practicaForm, setPracticaForm] = useState<any>({ fecha: "", hora: "", practica: "", laboratorio: "", cargoPor: "", actoQuirurgico: "" });
  const [implanteForm, setImplanteForm] = useState<any>({ codigo: "", nombre: "", lote: "", modelo: "", lado: "" });
  const [reprogForm, setReprogForm] = useState<any>({ nuevaFecha: "", motivo: "" });
  const [showReprogModal, setShowReprogModal] = useState(false);
  const [showImplanteModal, setShowImplanteModal] = useState(false);
  const [showPracticaModal, setShowPracticaModal] = useState(false);
  const [formData, setFormData] = useState<CirugiaData>({});

  const isReadOnly = data?.estado === "COMPLETADA" || data?.estado === "REPROGRAMADA";
  const esParto = data?.procedimiento?.toLowerCase().includes("parto") || data?.procedimiento?.toLowerCase().includes("cesárea") || data?.procedimiento?.toLowerCase().includes("cesarea");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cirRes, userRes] = await Promise.all([
        fetch(`/api/quirofano/${cirugiaId}/libro`),
        fetch("/api/usuarios"),
      ]);
      if (cirRes.ok) {
        const d = await cirRes.json();
        setData(d);
        setFormData({ ...d });
      }
      if (userRes.ok) setUsuarios(await userRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [cirugiaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const searchStock = async (q: string) => {
    setStockQuery(q);
    if (q.length < 2) return;
    const res = await fetch(`/api/farmacia/stock-search?q=${encodeURIComponent(q)}`);
    if (res.ok) setStockItems(await res.json());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/quirofano/${cirugiaId}/libro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        setFormData({ ...updated });
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const cerrarCirugia = async () => {
    if (!formData.horaFin) return alert("Debe cargar la hora fin antes de cerrar la cirugía.");
    setSaving(true);
    await fetch(`/api/quirofano/${cirugiaId}/libro`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, estado: "COMPLETADA" }),
    });
    setSaving(false);
    fetchData();
  };

  const handleImprimir = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const paciente = data?.internacion?.paciente;
    const internacion = data?.internacion;
    w.document.write(`
      <html><head><title>Libro de Quirófano - ${data?.procedimiento || ""}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 11px; padding: 20px; color: #000; }
        .letterhead { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .letterhead h1 { font-size: 18px; margin: 0; }
        .letterhead p { font-size: 11px; margin: 2px 0; color: #555; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td, th { border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 10px; }
        th { background: #eee; }
        .section { margin: 15px 0; }
        .section h3 { font-size: 12px; border-bottom: 1px solid #999; padding-bottom: 3px; }
        .row { display: flex; gap: 20px; }
        .col { flex: 1; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="letterhead">
        <h1>SANATORIO SIMES</h1>
        <p>Córdoba N° 2344, Posadas, Misiones | Tel: 03765-430280/430283</p>
        <h2>LIBRO DE QUIRÓFANO</h2>
        <p><strong>${data?.procedimiento || "Procedimiento"}</strong> - Estado: ${data?.estado}</p>
      </div>
      <div class="section"><h3>Datos del Paciente</h3>
      <p><strong>Nombre:</strong> ${paciente?.apellido || ""}, ${paciente?.nombre || ""} | <strong>HC:</strong> ${"—"} | <strong>N° Internación:</strong> ${internacion?.numero || "—"} | <strong>Obra Social:</strong> ${internacion?.obraSocial?.nombre || "—"} | <strong>Cama:</strong> ${internacion?.cama?.numero || "—"}</p>
      </div>
      <div class="section"><h3>Cirugía</h3>
      <div class="row"><div class="col"><p><strong>Fecha Prog.:</strong> ${data?.fechaProgramada ? formatDateTime(data.fechaProgramada) : "—"}</p>
      <p><strong>Hora Inicio:</strong> ${data?.horaInicio || "—"} | <strong>Hora Fin:</strong> ${data?.horaFin || "—"}</p>
      <p><strong>Diagnóstico Preop.:</strong> ${data?.diagnosticoPreop || "—"}</p>
      <p><strong>Diagnóstico Postop.:</strong> ${data?.diagnosticoPostop || "—"}</p></div>
      <div class="col"><p><strong>Score ASA:</strong> ${data?.scoreASA || "—"}</p>
      <p><strong>Quirófano:</strong> ${data?.quirofano?.nombre || data?.quirofanoId || "—"}</p>
      <p><strong>Tipo:</strong> ${data?.tipo || "—"}</p>
      <p><strong>Arco C:</strong> ${data?.arcoC ? "Sí" : "No"} | <strong>ARM:</strong> ${data?.arm ? "Sí" : "No"} | <strong>Ecógrafo:</strong> ${data?.ecografo ? "Sí" : "No"}</p></div></div>
      </div>
      <div class="section"><h3>Equipo Interviniente</h3>
      <table><tr><th>Rol</th><th>Nombre</th></tr>
      ${data?.cirujano ? `<tr><td>Cirujano</td><td>${data.cirujano.nombre}</td></tr>` : ""}
      ${data?.ayudante1 ? `<tr><td>1er Ayudante</td><td>${data.ayudante1.nombre}</td></tr>` : ""}
      ${data?.ayudante2 ? `<tr><td>2do Ayudante</td><td>${data.ayudante2.nombre}</td></tr>` : ""}
      ${data?.anestesiologo ? `<tr><td>Anestesiólogo</td><td>${data.anestesiologo.nombre}</td></tr>` : ""}
      ${data?.instrumentador ? `<tr><td>Instrumentador</td><td>${data.instrumentador.nombre}</td></tr>` : ""}
      ${data?.circulante ? `<tr><td>Circulante</td><td>${data.circulante.nombre}</td></tr>` : ""}
      </table></div>
      <div class="section"><h3>Operación y Hallazgos</h3><p>${data?.hallazgos || "—"}</p></div>
      ${data?.implantes?.length ? `<div class="section"><h3>Implantes</h3><table><tr><th>Código</th><th>Nombre</th><th>Lote</th><th>Lado</th></tr>${data.implantes.map((i: any) => `<tr><td>${i.codigo}</td><td>${i.nombre}</td><td>${i.lote || "—"}</td><td>${i.lado || "—"}</td></tr>`).join("")}</table></div>` : ""}
      ${data?.medicamentos?.length ? `<div class="section"><h3>Medicamentos</h3><table><tr><th>Nombre</th><th>Cant</th><th>Vía</th><th>Hora</th></tr>${data.medicamentos.map((m: any) => `<tr><td>${m.nombre}</td><td>${m.cantidad}</td><td>${m.via || "—"}</td><td>${m.horaAplicacion || "—"}</td></tr>`).join("")}</table></div>` : ""}
      <script>window.print();window.close();</script>
      </body></html>
    `);
    w.document.close();
  };

  const addMedicamento = async (item: StockItemData) => {
    if (!medForm.cantidad || medForm.cantidad < 1) return alert("Ingrese cantidad válida");
    const res = await fetch(`/api/quirofano/${cirugiaId}/medicamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockItemId: item.id, cantidad: medForm.cantidad, via: medForm.via, horaAplicacion: medForm.horaAplicacion, observacion: medForm.observacion }),
    });
    if (res.ok) { fetchData(); setShowStockModal(false); setMedForm({ cantidad: 1, via: "EV", horaAplicacion: "", observacion: "" }); }
    else { const e = await res.json(); alert(e.error || "Error al agregar medicamento"); }
  };

  const deleteMedicamento = async (medId: string) => {
    if (!confirm("¿Anular este medicamento? Se revertirá el stock.")) return;
    await fetch(`/api/quirofano/${cirugiaId}/medicamentos/${medId}`, { method: "DELETE" });
    fetchData();
  };

  const addPractica = async () => {
    const res = await fetch(`/api/quirofano/${cirugiaId}/practicas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(practicaForm),
    });
    if (res.ok) { fetchData(); setShowPracticaModal(false); setPracticaForm({ fecha: "", hora: "", practica: "", laboratorio: "", cargoPor: "", actoQuirurgico: "" }); }
  };

  const deletePractica = async (id: string) => {
    if (!confirm("¿Eliminar práctica?")) return;
    await fetch(`/api/quirofano/${cirugiaId}/practicas?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const addImplante = async () => {
    await fetch(`/api/quirofano/${cirugiaId}/implantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(implanteForm),
    });
    setShowImplanteModal(false);
    setImplanteForm({ codigo: "", nombre: "", lote: "", modelo: "", lado: "" });
    fetchData();
  };

  const addReprogramacion = async () => {
    if (!reprogForm.nuevaFecha || !reprogForm.motivo) return alert("Complete fecha y motivo");
    const res = await fetch(`/api/quirofano/${cirugiaId}/reprogramaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reprogForm),
    });
    if (res.ok) { setShowReprogModal(false); setReprogForm({ nuevaFecha: "", motivo: "" }); fetchData(); }
  };

  const update = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

  const totalIngresos = formData?.balanceIngresos?.reduce((s: number, i: any) => s + Number(i.volumen || 0), 0) || 0;
  const totalEgresos = formData?.balanceEgresos?.reduce((s: number, i: any) => s + Number(i.volumen || 0), 0) || 0;
  const balanceTotal = totalIngresos - totalEgresos;

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted">Cargando libro de quirófano...</p></div>;
  if (!data) return <div className="flex items-center justify-center h-64"><p className="text-muted">Cirugía no encontrada.</p></div>;

  const paciente = data?.internacion?.paciente;
  const internacion = data?.internacion;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface shrink-0 rounded-t-xl">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">Libro de Quirófano</h2>
            <p className="text-xs text-muted">
              {paciente ? `${paciente.apellido}, ${paciente.nombre}` : "—"} | {data?.procedimiento || "Sin procedimiento"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={data?.estado === "COMPLETADA" ? "success" : data?.estado === "EN_CURSO" ? "warning" : "info"}>
            {data?.estado}
          </Badge>
        </div>
      </div>

      {/* Patient info bar */}
      <div className="px-6 py-2 border-b border-border bg-surface/50 shrink-0">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span><span className="font-medium text-gray-400">Paciente:</span> {paciente ? `${paciente.apellido}, ${paciente.nombre}` : "—"}</span>
          <span><span className="font-medium text-gray-400">N° HC:</span> {paciente?.dni || "—"}</span>
          <span><span className="font-medium text-gray-400">N° Internación:</span> {internacion?.numero || "—"}</span>
          <span><span className="font-medium text-gray-400">Obra Social:</span> {internacion?.obraSocial?.nombre || "—"}</span>
          <span><span className="font-medium text-gray-400">Cama:</span> {internacion?.cama?.numero || "—"}</span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border bg-surface shrink-0 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === i ? "border-accent text-accent" : "border-transparent text-muted hover:text-white"
            }`}
          >{tab}</button>
        ))}
      </div>

      {/* Tab content - scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: Cirugía */}
        {activeTab === 0 && (
          <div className="space-y-6 max-w-5xl">
            <div className="card p-5">
              <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Datos Generales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><label className={labelClass}>Fecha inicio</label>
                  <input type="date" value={formData?.fechaProgramada?.split("T")[0] || ""} onChange={e => update("fechaProgramada", e.target.value ? new Date(e.target.value).toISOString() : null)} disabled={isReadOnly} className={inputClass} /></div>
                <div><label className={labelClass}>Hora inicio</label>
                  <input type="time" value={formData?.horaInicio || ""} onChange={e => update("horaInicio", e.target.value)} disabled={isReadOnly} className={inputClass} /></div>
                <div><label className={labelClass}>Fecha fin</label>
                  <input type="date" value={formData?.horaFin && formData.fechaProgramada?.split("T")[0] || formData?.fechaProgramada?.split("T")[0] || ""} onChange={() => {}} disabled className={inputClass} /></div>
                <div><label className={labelClass}>Hora fin</label>
                  <input type="time" value={formData?.horaFin || ""} onChange={e => update("horaFin", e.target.value)} disabled={isReadOnly} className={inputClass} /></div>
                <div className="md:col-span-2"><VoiceTextarea label="Diagnóstico preoperatorio" value={formData?.diagnosticoPreop || ""} onChange={(v) => update("diagnosticoPreop", v)} disabled={isReadOnly} rows={3} /></div>
                <div className="md:col-span-2"><VoiceTextarea label="Diagnóstico postoperatorio" value={formData?.diagnosticoPostop || ""} onChange={(v) => update("diagnosticoPostop", v)} disabled={isReadOnly} rows={3} /></div>
                <div className="md:col-span-2"><VoiceTextarea label="Procedimiento quirúrgico" value={formData?.procedimiento || ""} onChange={(v) => update("procedimiento", v)} disabled={isReadOnly} rows={3} /></div>
                <div className="md:col-span-2"><VoiceTextarea label="Intervenciones agregadas" value={formData?.intervencionesAgregadas || ""} onChange={(v) => update("intervencionesAgregadas", v)} disabled={isReadOnly} rows={3} /></div>
                <div><label className={labelClass}>Score ASA</label>
                  <select value={formData?.scoreASA || ""} onChange={e => update("scoreASA", e.target.value ? Number(e.target.value) : null)} disabled={isReadOnly} className={inputClass}>
                    <option value="">Seleccionar</option>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>ASA {n}</option>)}
                  </select></div>
                <div><label className={labelClass}>Quirófano N°</label>
                   <input type="text" value={formData?.quirofanoId || ""} onChange={e => update("quirofanoId", e.target.value)} disabled={isReadOnly} className={inputClass} /></div>
                <div><label className={labelClass}>Tipo</label>
                  <select value={formData?.tipo || ""} onChange={e => update("tipo", e.target.value)} disabled={isReadOnly} className={inputClass}>
                    <option value="PROGRAMADA">Programada</option><option value="URGENCIA">Urgencia</option><option value="EMERGENCIA">Emergencia</option>
                  </select></div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Equipo Interviniente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Cirujano principal", field: "cirujanoId" },
                  { label: "1er Ayudante", field: "ayudante1Id" },
                  { label: "2do Ayudante", field: "ayudante2Id" },
                  { label: "Anestesiólogo", field: "anestesiologoId" },
                  { label: "Instrumentador", field: "instrumentadorId" },
                ].map(({ label, field }) => (
                  <div key={field}><label className={labelClass}>{label}</label>
                    <select value={formData?.[field] || ""} onChange={e => update(field, e.target.value || null)} disabled={isReadOnly} className={inputClass}>
                      <option value="">Seleccionar</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
                    </select></div>
                ))}
                <div><label className={labelClass}>Circulante</label>
                  <select value={formData?.circulanteId || ""} onChange={e => update("circulanteId", e.target.value || null)} disabled={isReadOnly} className={inputClass}>
                    <option value="">Seleccionar</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
                  </select></div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Equipamiento y Muestras</h3>
              <div className="flex flex-wrap gap-6 mb-4">
                {[
                  { label: "ARCO EN C", field: "arcoC" },
                  { label: "ARM", field: "arm" },
                  { label: "Ecógrafo", field: "ecografo" },
                ].map(({ label, field }) => (
                  <label key={field} className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={!!formData?.[field]} onChange={e => update(field, e.target.checked)} disabled={isReadOnly}
                      className="w-4 h-4 rounded border-border bg-background text-accent focus:ring-accent" />
                    {label}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClass}>Muestras patológicas (cantidad)</label>
                  <input type="number" value={formData?.muestrasPatologicas || ""} onChange={e => update("muestrasPatologicas", e.target.value ? Number(e.target.value) : null)} disabled={isReadOnly} className={inputClass} /></div>
                <div><label className={labelClass}>Muestras bacteriológicas (cantidad)</label>
                  <input type="number" value={formData?.muestrasBacteriologicas || ""} onChange={e => update("muestrasBacteriologicas", e.target.value ? Number(e.target.value) : null)} disabled={isReadOnly} className={inputClass} /></div>
                <div><label className={labelClass}>Observaciones muestras patológicas</label>
                  <input type="text" value={formData?.muestrasPatologicasObs || ""} onChange={e => update("muestrasPatologicasObs", e.target.value)} disabled={isReadOnly} className={inputClass} /></div>
                <div><label className={labelClass}>Observaciones muestras bacteriológicas</label>
                  <input type="text" value={formData?.muestrasBacteriologicasObs || ""} onChange={e => update("muestrasBacteriologicasObs", e.target.value)} disabled={isReadOnly} className={inputClass} /></div>
              </div>
            </div>

            <div className="card p-5">
              <VoiceTextarea label="Observaciones generales" value={formData?.observaciones || ""} onChange={(v) => update("observaciones", v)} disabled={isReadOnly} rows={4} placeholder="Observaciones del quirófano..." />
            </div>
          </div>
        )}

        {/* TAB 2: Prácticas / Medicamentos */}
        {activeTab === 1 && (
          <div className="space-y-6 max-w-5xl">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Prácticas Asociadas</h3>
                {!isReadOnly && (
                  <button onClick={() => setShowPracticaModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                    <Plus size={14} /> Agregar práctica
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                    <th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Hora</th><th className="px-3 py-2">Práctica</th>
                    <th className="px-3 py-2">Laboratorio</th><th className="px-3 py-2">Cargó</th><th className="px-3 py-2">Acto Quir.</th>
                    {!isReadOnly && <th className="px-3 py-2"></th>}
                  </tr></thead>
                  <tbody>
                    {data?.practicas?.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted">Sin prácticas registradas</td></tr>}
                    {data?.practicas?.map((p: any) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-3 py-2">{formatDateTime(p.fecha)}</td>
                        <td className="px-3 py-2">{p.hora}</td>
                        <td className="px-3 py-2">{p.practica}</td>
                        <td className="px-3 py-2">{p.laboratorio || "—"}</td>
                        <td className="px-3 py-2">{p.cargoPor || "—"}</td>
                        <td className="px-3 py-2">{p.actoQuirurgico || "—"}</td>
                        {!isReadOnly && <td className="px-3 py-2"><button onClick={() => deletePractica(p.id)} className="text-red hover:text-red/80"><Trash2 size={14} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Medicamentos / Descartables</h3>
                {!isReadOnly && (
                  <button onClick={() => setShowStockModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                    <Plus size={14} /> Agregar medicamento
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                    <th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Presentación</th><th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Vía</th><th className="px-3 py-2">Hora</th><th className="px-3 py-2">Obs.</th>
                    {!isReadOnly && <th className="px-3 py-2"></th>}
                  </tr></thead>
                  <tbody>
                    {data?.medicamentos?.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted">Sin medicamentos registrados</td></tr>}
                    {data?.medicamentos?.map((m: any) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-3 py-2">{m.nombre}</td>
                        <td className="px-3 py-2">{m.presentacion || "—"}</td>
                        <td className="px-3 py-2">{String(m.cantidad)}</td>
                        <td className="px-3 py-2">{m.via || "—"}</td>
                        <td className="px-3 py-2">{m.horaAplicacion || "—"}</td>
                        <td className="px-3 py-2">{m.observacion || "—"}</td>
                        {!isReadOnly && <td className="px-3 py-2"><button onClick={() => deleteMedicamento(m.id)} className="text-red hover:text-red/80"><Trash2 size={14} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Parto / Cesárea */}
        {activeTab === 2 && (
          <div className="max-w-3xl">
            {!esParto ? (
              <div className="card p-8 text-center">
                <Baby size={48} className="mx-auto text-muted mb-3" />
                <p className="text-muted text-sm">No aplica para este procedimiento</p>
                <p className="text-xs text-muted mt-1">Este módulo solo está disponible para procedimientos que contengan "parto" o "cesárea".</p>
              </div>
            ) : (
              <div className="card p-5">
                <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Datos del Parto / Cesárea</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><label className={labelClass}>Hora de nacimiento</label>
                    <input type="time" value={formData?.horaNacimiento || ""} onChange={e => update("horaNacimiento", e.target.value)} disabled={isReadOnly} className={inputClass} /></div>
                  <div><label className={labelClass}>Sexo del RN</label>
                    <select value={formData?.sexoRN || ""} onChange={e => update("sexoRN", e.target.value)} disabled={isReadOnly} className={inputClass}>
                      <option value="">Seleccionar</option><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option><option value="OTRO">Otro</option>
                    </select></div>
                  <div><label className={labelClass}>Peso (gramos)</label>
                    <input type="number" value={formData?.pesoRN || ""} onChange={e => update("pesoRN", e.target.value ? Number(e.target.value) : null)} disabled={isReadOnly} className={inputClass} /></div>
                  <div><label className={labelClass}>Apgar 1 min</label>
                    <input type="number" min="0" max="10" value={formData?.apgar1 ?? ""} onChange={e => update("apgar1", e.target.value !== "" ? Number(e.target.value) : null)} disabled={isReadOnly} className={inputClass} /></div>
                  <div><label className={labelClass}>Apgar 5 min</label>
                    <input type="number" min="0" max="10" value={formData?.apgar5 ?? ""} onChange={e => update("apgar5", e.target.value !== "" ? Number(e.target.value) : null)} disabled={isReadOnly} className={inputClass} /></div>
                  <div><label className={labelClass}>Tipo de parto</label>
                    <select value={formData?.tipoParto || ""} onChange={e => update("tipoParto", e.target.value)} disabled={isReadOnly} className={inputClass}>
                      <option value="">Seleccionar</option><option value="VAGINAL">Vaginal</option><option value="CESAREA">Cesárea</option><option value="INSTRUMENTADO">Instrumentado</option>
                    </select></div>
                </div>
                <div className="mt-4"><label className={labelClass}>Complicaciones</label>
                  <textarea rows={3} value={formData?.complicacionesParto || ""} onChange={e => update("complicacionesParto", e.target.value)} disabled={isReadOnly}
                    className={`${inputClass} resize-y`} placeholder="Detalle complicaciones..." /></div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Parte Quirúrgico */}
        {activeTab === 3 && (
          <div className="space-y-6 max-w-5xl">
            {/* Sub-tabs */}
            <div className="flex gap-1 border-b border-border pb-1">
              {SUB_TABS_PARTE.map((st, i) => (
                <button key={i} onClick={() => setSubTab(i)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                    subTab === i ? "bg-surface text-accent border border-border border-b-0" : "text-muted hover:text-white"
                  }`}
                >{st}</button>
              ))}
            </div>

            {/* Sub-tab A: Parte Quirúrgico */}
            {subTab === 0 && (
              <div className="space-y-6">
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Parte Quirúrgico</h3>
                    <div className="flex gap-2">
                      {!isReadOnly && (
                        <button onClick={() => setShowPracticaModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                          <Plus size={14} /> Agregar
                        </button>
                      )}
                      <button onClick={handleImprimir} className={`${btnOutline} flex items-center gap-1 text-xs`}>
                        <Printer size={14} /> Imprimir
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                        <th className="px-3 py-2">#</th><th className="px-3 py-2">Fecha inicio</th><th className="px-3 py-2">Hora inicio</th>
                        <th className="px-3 py-2">Fecha fin</th><th className="px-3 py-2">Hora fin</th><th className="px-3 py-2">Cirujano</th>
                        <th className="px-3 py-2">Cirugía realizada</th>
                      </tr></thead>
                      <tbody>
                        <tr className="border-t border-border">
                          <td className="px-3 py-2">1</td>
                          <td className="px-3 py-2">{data?.fechaProgramada ? formatDateTime(data.fechaProgramada) : "—"}</td>
                          <td className="px-3 py-2">{data?.horaInicio || "—"}</td>
                          <td className="px-3 py-2">{data?.horaFin ? formatDateTime(data.fechaProgramada) : "—"}</td>
                          <td className="px-3 py-2">{data?.horaFin || "—"}</td>
                          <td className="px-3 py-2">{data?.cirujano?.nombre || "—"}</td>
                          <td className="px-3 py-2">{data?.procedimiento || "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card p-5">
                  <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Operación y Hallazgos</h3>
                  <VoiceTextarea value={formData?.hallazgos || ""} onChange={(v) => update("hallazgos", v)} disabled={isReadOnly} rows={8} placeholder="Narrativa completa de la cirugía..." />
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Implantes</h3>
                    {!isReadOnly && (
                      <button onClick={() => setShowImplanteModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                        <Plus size={14} /> Agregar implante
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                        <th className="px-3 py-2">Código</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Lote</th>
                        <th className="px-3 py-2">Modelo</th><th className="px-3 py-2">Lado</th>
                      </tr></thead>
                      <tbody>
                        {data?.implantes?.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted">Sin implantes registrados</td></tr>}
                        {data?.implantes?.map((imp: any) => (
                          <tr key={imp.id} className="border-t border-border">
                            <td className="px-3 py-2">{imp.codigo}</td><td className="px-3 py-2">{imp.nombre}</td>
                            <td className="px-3 py-2">{imp.lote || "—"}</td><td className="px-3 py-2">{imp.modelo || "—"}</td>
                            <td className="px-3 py-2">{imp.lado || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab B: Evolución Post Int. */}
            {subTab === 1 && (
              <div className="card p-5">
                <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Evolución Postoperatoria Inmediata</h3>
                <VoiceTextarea value={formData?.evolucionPostInt || ""} onChange={(v) => update("evolucionPostInt", v)} disabled={isReadOnly} rows={12} placeholder={`[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}]\nEscriba la evolución aquí...`} />
              </div>
            )}

            {/* Sub-tab C: Indicaciones Postoperatorias */}
            {subTab === 2 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Indicaciones Postoperatorias</h3>
                  {!isReadOnly && (
                    <button onClick={() => {
                      const arr = formData?.indicacionesPostoperatorias || [];
                      update("indicacionesPostoperatorias", [...arr, { indicacion: "", dosis: "", frecuencia: "", via: "", observaciones: "" }]);
                    }} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                      <Plus size={14} /> Agregar indicación
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                      <th className="px-3 py-2">Indicación</th><th className="px-3 py-2">Dosis</th><th className="px-3 py-2">Frecuencia</th>
                      <th className="px-3 py-2">Vía</th><th className="px-3 py-2">Observaciones</th>
                      {!isReadOnly && <th className="px-3 py-2"></th>}
                    </tr></thead>
                    <tbody>
                      {(!formData?.indicacionesPostoperatorias || formData.indicacionesPostoperatorias.length === 0) && (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-muted">Sin indicaciones registradas</td></tr>
                      )}
                      {(formData?.indicacionesPostoperatorias || []).map((ind: any, idx: number) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="px-3 py-1"><input type="text" value={ind.indicacion} disabled={isReadOnly}
                            onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].indicacion = e.target.value; update("indicacionesPostoperatorias", arr); }}
                            className="bg-transparent border-none text-sm text-white w-full focus:outline-none" /></td>
                          <td className="px-3 py-1"><input type="text" value={ind.dosis} disabled={isReadOnly}
                            onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].dosis = e.target.value; update("indicacionesPostoperatorias", arr); }}
                            className="bg-transparent border-none text-sm text-white w-full focus:outline-none" /></td>
                          <td className="px-3 py-1"><input type="text" value={ind.frecuencia} disabled={isReadOnly}
                            onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].frecuencia = e.target.value; update("indicacionesPostoperatorias", arr); }}
                            className="bg-transparent border-none text-sm text-white w-full focus:outline-none" /></td>
                          <td className="px-3 py-1"><input type="text" value={ind.via} disabled={isReadOnly}
                            onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].via = e.target.value; update("indicacionesPostoperatorias", arr); }}
                            className="bg-transparent border-none text-sm text-white w-full focus:outline-none" /></td>
                          <td className="px-3 py-1"><input type="text" value={ind.observaciones} disabled={isReadOnly}
                            onChange={e => { const arr = [...formData.indicacionesPostoperatorias]; arr[idx].observaciones = e.target.value; update("indicacionesPostoperatorias", arr); }}
                            className="bg-transparent border-none text-sm text-white w-full focus:outline-none" /></td>
                          {!isReadOnly && <td className="px-3 py-1"><button onClick={() => {
                            const arr = formData.indicacionesPostoperatorias.filter((_: any, i: number) => i !== idx);
                            update("indicacionesPostoperatorias", arr);
                          }} className="text-red hover:text-red/80"><Trash2 size={14} /></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Ingresos/Egresos/Observaciones */}
        {activeTab === 4 && (
          <div className="space-y-6 max-w-5xl">
            <div className="card p-5">
              <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Balance de Líquidos Intraoperatorio</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted font-medium">Ingresos</span>
                    {!isReadOnly && <button onClick={() => {
                      const arr = formData?.balanceIngresos || [];
                      update("balanceIngresos", [...arr, { tipo: "SF", volumen: "", hora: "" }]);
                    }} className="text-accent text-xs flex items-center gap-1"><Plus size={12} /> Agregar</button>}
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                      <th className="px-2 py-1">Tipo</th><th className="px-2 py-1">Vol (ml)</th><th className="px-2 py-1">Hora</th>
                      {!isReadOnly && <th className="px-2 py-1"></th>}
                    </tr></thead>
                    <tbody>
                      {(formData?.balanceIngresos || []).map((i: any, idx: number) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="px-2 py-1"><select value={i.tipo} disabled={isReadOnly}
                            onChange={e => { const arr = [...formData.balanceIngresos]; arr[idx].tipo = e.target.value; update("balanceIngresos", arr); }}
                            className="bg-transparent border border-border rounded text-xs text-white w-full"><option value="SF">SF</option><option value="Plasma">Plasma</option><option value="Sangre">Sangre</option><option value="Medicación IV">Medicación IV</option><option value="Otro">Otro</option></select></td>
                          <td className="px-2 py-1"><input type="number" value={i.volumen} disabled={isReadOnly}
                            onChange={e => { const arr = [...formData.balanceIngresos]; arr[idx].volumen = e.target.value; update("balanceIngresos", arr); }}
                            className="bg-transparent border-none text-sm text-white w-20" /></td>
                          <td className="px-2 py-1"><input type="time" value={i.hora} disabled={isReadOnly}
                            onChange={e => { const arr = [...formData.balanceIngresos]; arr[idx].hora = e.target.value; update("balanceIngresos", arr); }}
                            className="bg-transparent border-none text-sm text-white w-20" /></td>
                          {!isReadOnly && <td className="px-2 py-1"><button onClick={() => {
                            const arr = formData.balanceIngresos.filter((_: any, j: number) => j !== idx); update("balanceIngresos", arr);
                          }} className="text-red"><Trash2 size={12} /></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-accent mt-2">Total ingresos: {totalIngresos} ml</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted font-medium">Egresos</span>
                    {!isReadOnly && <button onClick={() => {
                      const arr = formData?.balanceEgresos || [];
                      update("balanceEgresos", [...arr, { tipo: "Diuresis", volumen: "", hora: "" }]);
                    }} className="text-accent text-xs flex items-center gap-1"><Plus size={12} /> Agregar</button>}
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                      <th className="px-2 py-1">Tipo</th><th className="px-2 py-1">Vol (ml)</th><th className="px-2 py-1">Hora</th>
                      {!isReadOnly && <th className="px-2 py-1"></th>}
                    </tr></thead>
                    <tbody>
                      {(formData?.balanceEgresos || []).map((e: any, idx: number) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="px-2 py-1"><select value={e.tipo} disabled={isReadOnly}
                            onChange={ev => { const arr = [...formData.balanceEgresos]; arr[idx].tipo = ev.target.value; update("balanceEgresos", arr); }}
                            className="bg-transparent border border-border rounded text-xs text-white w-full"><option value="Diuresis">Diuresis</option><option value="Drenaje">Drenaje</option><option value="Pérdida estimada">Pérdida estimada</option></select></td>
                          <td className="px-2 py-1"><input type="number" value={e.volumen} disabled={isReadOnly}
                            onChange={ev => { const arr = [...formData.balanceEgresos]; arr[idx].volumen = ev.target.value; update("balanceEgresos", arr); }}
                            className="bg-transparent border-none text-sm text-white w-20" /></td>
                          <td className="px-2 py-1"><input type="time" value={e.hora} disabled={isReadOnly}
                            onChange={ev => { const arr = [...formData.balanceEgresos]; arr[idx].hora = ev.target.value; update("balanceEgresos", arr); }}
                            className="bg-transparent border-none text-sm text-white w-20" /></td>
                          {!isReadOnly && <td className="px-2 py-1"><button onClick={() => {
                            const arr = formData.balanceEgresos.filter((_: any, j: number) => j !== idx); update("balanceEgresos", arr);
                          }} className="text-red"><Trash2 size={12} /></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-accent mt-2">Total egresos: {totalEgresos} ml</p>
                </div>
              </div>
              <div className={`mt-3 p-3 rounded text-sm font-medium ${balanceTotal >= 0 ? "bg-accent/10 text-accent" : "bg-red/10 text-red"}`}>
                Balance total: {balanceTotal >= 0 ? "+" : ""}{balanceTotal} ml
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Signos Vitales Intraoperatorios</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                    <th className="px-3 py-2">Hora</th><th className="px-3 py-2">TA Sist.</th><th className="px-3 py-2">TA Diast.</th>
                    <th className="px-3 py-2">FC</th><th className="px-3 py-2">SatO2</th><th className="px-3 py-2">Temp</th>
                    <th className="px-3 py-2">Obs.</th>
                    {!isReadOnly && <th className="px-3 py-2"></th>}
                  </tr></thead>
                  <tbody>
                    {(formData?.signosVitalesIntraop || []).map((sv: any, idx: number) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="px-3 py-1"><input type="time" value={sv.hora || ""} disabled={isReadOnly}
                          onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].hora = e.target.value; update("signosVitalesIntraop", arr); }}
                          className="bg-transparent border-none text-sm text-white w-20" /></td>
                        <td className="px-3 py-1"><input type="number" value={sv.taSistolica || ""} disabled={isReadOnly}
                          onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].taSistolica = e.target.value; update("signosVitalesIntraop", arr); }}
                          className="bg-transparent border-none text-sm text-white w-14" /></td>
                        <td className="px-3 py-1"><input type="number" value={sv.taDiastolica || ""} disabled={isReadOnly}
                          onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].taDiastolica = e.target.value; update("signosVitalesIntraop", arr); }}
                          className="bg-transparent border-none text-sm text-white w-14" /></td>
                        <td className="px-3 py-1"><input type="number" value={sv.fc || ""} disabled={isReadOnly}
                          onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].fc = e.target.value; update("signosVitalesIntraop", arr); }}
                          className="bg-transparent border-none text-sm text-white w-14" /></td>
                        <td className="px-3 py-1"><input type="number" value={sv.satO2 || ""} disabled={isReadOnly}
                          onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].satO2 = e.target.value; update("signosVitalesIntraop", arr); }}
                          className="bg-transparent border-none text-sm text-white w-14" /></td>
                        <td className="px-3 py-1"><input type="number" step="0.1" value={sv.temp || ""} disabled={isReadOnly}
                          onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].temp = e.target.value; update("signosVitalesIntraop", arr); }}
                          className="bg-transparent border-none text-sm text-white w-14" /></td>
                        <td className="px-3 py-1"><input type="text" value={sv.observacion || ""} disabled={isReadOnly}
                          onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].observacion = e.target.value; update("signosVitalesIntraop", arr); }}
                          className="bg-transparent border-none text-sm text-white w-24" /></td>
                        {!isReadOnly && <td className="px-3 py-1"><button onClick={() => {
                          const arr = formData.signosVitalesIntraop.filter((_: any, j: number) => j !== idx); update("signosVitalesIntraop", arr);
                        }} className="text-red"><Trash2 size={12} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isReadOnly && (
                <button onClick={() => {
                  const arr = formData?.signosVitalesIntraop || [];
                  update("signosVitalesIntraop", [...arr, { hora: "", taSistolica: "", taDiastolica: "", fc: "", satO2: "", temp: "", observacion: "" }]);
                }} className={`${btnTeal} flex items-center gap-1 text-xs mt-3`}>
                  <Plus size={14} /> Agregar registro
                </button>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Observaciones del Anestesiólogo</h3>
              <VoiceTextarea value={formData?.observacionesAnestesia || ""} onChange={(v) => update("observacionesAnestesia", v)} disabled={isReadOnly} rows={4} placeholder="Observaciones anestesiológicas..." />
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Posición y Accesorios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className={labelClass}>Posición operatoria</label>
                  <select value={formData?.posicionOperatoria || ""} onChange={e => update("posicionOperatoria", e.target.value)} disabled={isReadOnly} className={inputClass}>
                    <option value="">Seleccionar</option>{POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div><label className={labelClass}>Sonda</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={!!formData?.sondaNasogastrica} onChange={e => update("sondaNasogastrica", e.target.checked)} disabled={isReadOnly}
                        className="w-4 h-4 rounded border-border bg-background text-accent" /> Nasogástrica
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={!!formData?.sondaVesical} onChange={e => update("sondaVesical", e.target.checked)} disabled={isReadOnly}
                        className="w-4 h-4 rounded border-border bg-background text-accent" /> Vesical
                    </label>
                  </div></div>
                <div><label className={labelClass}>Diuresis intraoperatoria (cc)</label>
                  <input type="number" value={formData?.diuresisIntraop ?? ""} onChange={e => update("diuresisIntraop", e.target.value ? Number(e.target.value) : null)} disabled={isReadOnly} className={inputClass} /></div>
                <div><label className={labelClass}>Sangre perdida</label>
                  <select value={formData?.sangrePerdida || ""} onChange={e => update("sangrePerdida", e.target.value)} disabled={isReadOnly} className={inputClass}>
                    <option value="">Seleccionar</option>{SANGRE_PERDIDA.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Reprogramaciones */}
        {activeTab === 5 && (
          <div className="max-w-4xl">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-accent uppercase tracking-wide">Historial de Reprogramaciones</h3>
                {!isReadOnly && (
                  <button onClick={() => setShowReprogModal(true)} className={`${btnTeal} flex items-center gap-1 text-xs`}>
                    <Calendar size={14} /> Agregar reprogramación
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                    <th className="px-3 py-2">#</th><th className="px-3 py-2">Fecha original</th><th className="px-3 py-2">Nueva fecha</th>
                    <th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Registrado por</th><th className="px-3 py-2">Fecha registro</th>
                  </tr></thead>
                  <tbody>
                    {data?.reprogramaciones?.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-muted">Sin reprogramaciones</td></tr>}
                    {data?.reprogramaciones?.map((r: any, idx: number) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{formatDateTime(r.fechaOriginal)}</td>
                        <td className="px-3 py-2">{formatDateTime(r.nuevaFecha)}</td>
                        <td className="px-3 py-2">{r.motivo}</td>
                        <td className="px-3 py-2">{r.registradoPor}</td>
                        <td className="px-3 py-2">{formatDateTime(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: Protocolo de Anestesia */}
        {activeTab === 6 && data?.internacion?.id && (
          <div className="max-w-5xl">
            <ProtocoloAnestesiaComponent internacionId={data.internacion.id} cirugiaId={cirugiaId} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-surface shrink-0">
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || isReadOnly}
            className={`${btnTeal} flex items-center gap-2 ${(saving || isReadOnly) ? "opacity-50 cursor-not-allowed" : ""}`}>
            <Save size={16} /> {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          <button onClick={handleImprimir} className={`${btnOutline} flex items-center gap-2`}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
        <div className="flex gap-3">
          {data?.estado === "EN_CURSO" && (
            <button onClick={cerrarCirugia} disabled={saving}
              className={`${btnDanger} flex items-center gap-2 ${saving ? "opacity-50 cursor-not-allowed" : ""}`}>
              <CheckCircle size={16} /> Cerrar cirugía
            </button>
          )}
        </div>
      </div>

      {/* Modal: Agregar medicamento (buscar en stock) */}
      {showStockModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowStockModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-white">Agregar medicamento / descartable</h3>
              <button onClick={() => setShowStockModal(false)} className="text-muted hover:text-white"><X size={18} /></button>
            </div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" value={stockQuery} onChange={e => searchStock(e.target.value)} placeholder="Buscar por nombre..." className={`${inputClass} pl-9`} autoFocus />
            </div>
            {stockItems.length > 0 && (
              <div className="max-h-40 overflow-y-auto mb-4 border border-border rounded">
                {stockItems.map(item => (
                  <button key={item.id} onClick={() => addMedicamento(item)}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-background transition-colors border-b border-border last:border-b-0">
                    <span className="font-medium">{item.nombre}</span>
                    <span className="text-muted ml-2">Stock: {String(item.stockActual)}</span>
                    {item.presentacion && <span className="text-muted ml-2">({item.presentacion})</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Cantidad</label>
                <input type="number" min="1" value={medForm.cantidad} onChange={e => setMedForm({ ...medForm, cantidad: Number(e.target.value) })} className={inputClass} /></div>
              <div><label className={labelClass}>Vía</label>
                <select value={medForm.via} onChange={e => setMedForm({ ...medForm, via: e.target.value })} className={inputClass}>
                  <option value="EV">EV</option><option value="IM">IM</option><option value="SC">SC</option><option value="VO">VO</option><option value="Tópica">Tópica</option><option value="Inhalatoria">Inhalatoria</option>
                </select></div>
              <div><label className={labelClass}>Hora aplicación</label>
                <input type="time" value={medForm.horaAplicacion} onChange={e => setMedForm({ ...medForm, horaAplicacion: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Observación</label>
                <input type="text" value={medForm.observacion} onChange={e => setMedForm({ ...medForm, observacion: e.target.value })} className={inputClass} /></div>
            </div>
            <p className="text-xs text-muted mt-3">Seleccione un item de la lista para agregarlo.</p>
          </div>
        </div>
      )}

      {/* Modal: Agregar práctica */}
      {showPracticaModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowPracticaModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-white">Agregar práctica</h3>
              <button onClick={() => setShowPracticaModal(false)} className="text-muted hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Fecha</label><input type="date" value={practicaForm.fecha} onChange={e => setPracticaForm({ ...practicaForm, fecha: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Hora</label><input type="time" value={practicaForm.hora} onChange={e => setPracticaForm({ ...practicaForm, hora: e.target.value })} className={inputClass} /></div>
              <div className="col-span-2"><label className={labelClass}>Práctica</label><input type="text" value={practicaForm.practica} onChange={e => setPracticaForm({ ...practicaForm, practica: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Laboratorio</label><input type="text" value={practicaForm.laboratorio} onChange={e => setPracticaForm({ ...practicaForm, laboratorio: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Cargó</label><input type="text" value={practicaForm.cargoPor} onChange={e => setPracticaForm({ ...practicaForm, cargoPor: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Acto quirúrgico</label><input type="text" value={practicaForm.actoQuirurgico} onChange={e => setPracticaForm({ ...practicaForm, actoQuirurgico: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowPracticaModal(false)} className={btnOutline}>Cancelar</button>
              <button onClick={addPractica} className={btnTeal}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar implante */}
      {showImplanteModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowImplanteModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-white">Agregar implante</h3>
              <button onClick={() => setShowImplanteModal(false)} className="text-muted hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Código</label><input type="text" value={implanteForm.codigo} onChange={e => setImplanteForm({ ...implanteForm, codigo: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Nombre</label><input type="text" value={implanteForm.nombre} onChange={e => setImplanteForm({ ...implanteForm, nombre: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Lote</label><input type="text" value={implanteForm.lote} onChange={e => setImplanteForm({ ...implanteForm, lote: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Modelo</label><input type="text" value={implanteForm.modelo} onChange={e => setImplanteForm({ ...implanteForm, modelo: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Lado</label>
                <select value={implanteForm.lado} onChange={e => setImplanteForm({ ...implanteForm, lado: e.target.value })} className={inputClass}>
                  <option value="">Seleccionar</option><option value="Izquierdo">Izquierdo</option><option value="Derecho">Derecho</option><option value="Bilateral">Bilateral</option>
                </select></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowImplanteModal(false)} className={btnOutline}>Cancelar</button>
              <button onClick={addImplante} className={btnTeal}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reprogramación */}
      {showReprogModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center" onClick={() => setShowReprogModal(false)}>
          <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-white">Reprogramar cirugía</h3>
              <button onClick={() => setShowReprogModal(false)} className="text-muted hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className={labelClass}>Nueva fecha propuesta</label>
                <input type="datetime-local" value={reprogForm.nuevaFecha} onChange={e => setReprogForm({ ...reprogForm, nuevaFecha: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Motivo</label>
                <select value={reprogForm.motivo} onChange={e => setReprogForm({ ...reprogForm, motivo: e.target.value })} className={inputClass}>
                  <option value="">Seleccionar</option>{MOTIVOS_REPROG.map(m => <option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><label className={labelClass}>Detalle adicional</label>
                <textarea rows={3} className={`${inputClass} resize-y`} placeholder="Detalle..." /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowReprogModal(false)} className={btnOutline}>Cancelar</button>
              <button onClick={addReprogramacion} className={`${btnTeal} flex items-center gap-2`}><Calendar size={14} /> Confirmar reprogramación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
