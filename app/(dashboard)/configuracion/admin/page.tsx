"use client";

import { useState, useEffect } from "react";
import { Bed, Building2, Heart, Activity, Trash2, X, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

type Tab = "sectores" | "camas" | "obras-sociales" | "quirofanos" | "rangos-vitales";

interface Sector {
  id: string;
  nombre: string;
  codigo: string;
  _count?: { camas: number };
}

interface Cama {
  id: string;
  numero: string;
  estado: string;
  tipo?: string;
  sector: { id: string; nombre: string };
}

interface ObraSocial {
  id: string;
  codigo: string;
  nombre: string;
  sigla: string;
  descripcion: string;
  razonSocial: string;
  domicilio: string | null;
  localidad: string | null;
  tipoContribucion: string;
  tipoIva: string;
  cuit: string;
  estadoAmbulatorio: string;
  estadoInternacion: string;
  porcentajeDescMedicamentos: number;
  activa: boolean;
}

interface Quirofano {
  id: string;
  numero: number;
  nombre: string;
  piso?: string | null;
  disponible: boolean;
}

interface RangoVital {
  id: string;
  parametro: string;
  minimo: number;
  maximo: number;
  unidad: string;
}

const ESTADOS_CAMA = ["LIBRE", "OCUPADA", "MANTENIMIENTO", "RESERVADA"];

const th = "px-4 py-2.5 text-left text-[11px] font-mono uppercase tracking-widest text-muted whitespace-nowrap";
const td = "px-4 py-2.5";
const Empty = ({ text }: { text: string }) => (
  <div className="border border-dashed border-border rounded-lg py-10 text-center">
    <p className="text-[13px] text-muted">{text}</p>
  </div>
);

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>("sectores");
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [quirofanos, setQuirofanos] = useState<Quirofano[]>([]);
  const [rangos, setRangos] = useState<RangoVital[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, c, o, q, r] = await Promise.all([
        fetch("/api/sectores").then((r) => r.json()),
        fetch("/api/camas").then((r) => r.json()),
        fetch("/api/obras-sociales?all=true").then((r) => r.json()),
        fetch("/api/quirofanos").then((r) => r.json()),
        fetch("/api/rangos-vitales").then((r) => r.json()),
      ]);
      setSectores(Array.isArray(s) ? s : []);
      setCamas(Array.isArray(c) ? c : []);
      setObras(Array.isArray(o) ? o : []);
      setQuirofanos(Array.isArray(q) ? q : []);
      setRangos(Array.isArray(r) ? r : []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "sectores", label: "Sectores", icon: Building2 },
    { id: "camas", label: "Camas", icon: Bed },
    { id: "obras-sociales", label: "Obras sociales", icon: Heart },
    { id: "quirofanos", label: "Quirófanos", icon: Activity },
    { id: "rangos-vitales", label: "Rangos vitales", icon: Activity },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuración · Sistema"
        title="Administrar sistema"
        description="Sectores, camas, obras sociales, quirófanos y rangos de signos vitales del sanatorio."
      />

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-mono uppercase tracking-wide border transition-colors",
              tab === t.id
                ? "bg-accent-button text-white border-accent-button"
                : "bg-surface text-muted border-border hover:border-border-hover hover:text-text"
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2"><div className="skeleton h-24" /><div className="skeleton h-48" /></div>
      ) : (
        <div className="border border-border rounded-lg bg-surface p-4">
          {tab === "sectores" && <SectoresTab sectores={sectores} onRefresh={fetchAll} />}
          {tab === "camas" && <CamasTab camas={camas} sectores={sectores} onRefresh={fetchAll} />}
          {tab === "obras-sociales" && <ObrasTab obras={obras} onRefresh={fetchAll} />}
          {tab === "quirofanos" && <QuirofanosTab quirofanos={quirofanos} onRefresh={fetchAll} />}
          {tab === "rangos-vitales" && <RangosTab rangos={rangos} onRefresh={fetchAll} />}
        </div>
      )}
    </div>
  );
}

function SectoresTab({ sectores, onRefresh }: { sectores: Sector[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ nombre: "", codigo: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Sector | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing ? { id: editing, ...form } : form;
      await fetch("/api/sectores", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setForm({ nombre: "", codigo: "" });
      setEditing(null);
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setPendingDelete(null);
    await fetch(`/api/sectores?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-medium text-text">Sectores</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field text-[13px]" />
        <input placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input-field text-[13px]" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.nombre || !form.codigo} className="btn-primary text-[13px]">{editing ? "Actualizar" : "Crear"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ nombre: "", codigo: "" }); }} className="btn-secondary text-[13px]"><X size={14} /></button>}
        </div>
      </div>
      {sectores.length === 0 ? (
        <Empty text="Sin sectores." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border"><th className={th}>Nombre</th><th className={th}>Código</th><th className={th}>Camas</th><th className={th}>Acciones</th></tr></thead>
            <tbody>
              {sectores.map((s) => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                  <td className={td + " text-text"}>{s.nombre}</td>
                  <td className={td + " font-mono text-muted"}>{s.codigo}</td>
                  <td className={td + " text-muted"}>{s._count?.camas || 0}</td>
                  <td className={td}>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(s.id); setForm({ nombre: s.nombre, codigo: s.codigo }); }} className="text-[12px] text-brand hover:underline">Editar</button>
                      <button onClick={() => setPendingDelete(s)} className="text-[12px] text-muted hover:text-error transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar sector"
        message={
          pendingDelete ? (
            <>
              Se eliminará el sector <strong className="text-text">{pendingDelete.nombre}</strong>.
              Esta acción no se puede deshacer.
            </>
          ) : ""
        }
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function CamasTab({ camas, sectores, onRefresh }: { camas: Cama[]; sectores: Sector[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ numero: "", sectorId: "", tipo: "ESTANDAR" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Cama | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await fetch("/api/camas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ numero: "", sectorId: "", tipo: "ESTANDAR" });
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setPendingDelete(null);
    await fetch(`/api/camas?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleEstado = async (id: string, estado: string) => {
    await fetch("/api/camas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, estado }) });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-medium text-text">Camas</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input placeholder="Número" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="input-field text-[13px]" />
        <select value={form.sectorId} onChange={(e) => setForm({ ...form, sectorId: e.target.value })} className="select-field text-[13px]">
          <option value="">Sector…</option>
          {sectores.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="select-field text-[13px]">
          <option value="ESTANDAR">Estándar</option>
          <option value="TERAPIA_INTENSIVA">Terapia Intensiva</option>
          <option value="GUARDIA">Guardia</option>
        </select>
        <button onClick={handleCreate} disabled={saving || !form.numero || !form.sectorId} className="btn-primary text-[13px]">Crear cama</button>
      </div>
      {camas.length === 0 ? (
        <Empty text="Sin camas registradas." />
      ) : (
        <div className="max-h-[400px] overflow-y-auto border border-border rounded-lg">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border text-muted"><th className={th}>N°</th><th className={th}>Sector</th><th className={th}>Tipo</th><th className={th}>Estado</th><th className={th}>Acciones</th></tr></thead>
            <tbody>
              {camas.map((c) => (
                <tr key={c.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                  <td className={td + " text-text font-mono"}>{c.numero}</td>
                  <td className={td + " text-muted"}>{c.sector.nombre}</td>
                  <td className={td + " text-muted"}>{c.tipo || "—"}</td>
                  <td className={td}>
                    <select value={c.estado} onChange={(e) => handleEstado(c.id, e.target.value)} className="select-field text-[12px] py-1">
                      {ESTADOS_CAMA.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td className={td}>
                    <button onClick={() => setPendingDelete(c)} className="text-muted hover:text-error transition-colors"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar cama"
        message={
          pendingDelete ? (
            <>
              Se eliminará la cama <strong className="text-text">{pendingDelete.numero}</strong> del sector {pendingDelete.sector.nombre}.
              Esta acción no se puede deshacer.
            </>
          ) : ""
        }
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

const TIPO_CONTRIBUCION = ["INSCRIPTO", "NO_INSCRIPTO", "EXENTO", "MONOTRIBUTO", "CONSUMIDOR_FINAL"];

const IVA_LABEL: Record<string, string> = { IVA_0: "0 %", IVA_10_5: "10.5 %", IVA_21: "21 %" };

const COBERTURA_BADGE: Record<string, { tone: "success" | "danger"; label: string }> = {
  ACTIVA: { tone: "success", label: "ACTIVA" },
  SUSPENDIDA: { tone: "danger", label: "SUSPENDIDA" },
};

const EMPTY_OS_FORM = {
  codigo: "", nombre: "", sigla: "", descripcion: "", razonSocial: "", cuit: "",
  domicilio: "", localidad: "", tipoContribucion: "CONSUMIDOR_FINAL", tipoIva: "IVA_21",
  estadoAmbulatorio: "ACTIVA", estadoInternacion: "ACTIVA", porcentajeDescMedicamentos: "0", activa: true,
};

function ObrasTab({ obras, onRefresh }: { obras: ObraSocial[]; onRefresh: () => void }) {
  const [form, setForm] = useState(EMPTY_OS_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY_OS_FORM, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const method = editing ? "PUT" : "POST";
      const body = {
        ...(editing ? { id: editing } : {}),
        ...form,
        domicilio: form.domicilio || null,
        localidad: form.localidad || null,
        porcentajeDescMedicamentos: Number(form.porcentajeDescMedicamentos),
      };
      const res = await fetch("/api/obras-sociales", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar");
        return;
      }
      setForm(EMPTY_OS_FORM);
      setEditing(null);
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleToggle = async (id: string, activa: boolean) => {
    await fetch("/api/obras-sociales", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, activa: !activa }) });
    onRefresh();
  };

  const startEdit = (o: ObraSocial) => {
    setEditing(o.id);
    setForm({
      codigo: o.codigo, nombre: o.nombre, sigla: o.sigla, descripcion: o.descripcion, razonSocial: o.razonSocial,
      cuit: o.cuit, domicilio: o.domicilio ?? "", localidad: o.localidad ?? "",
      tipoContribucion: o.tipoContribucion, tipoIva: o.tipoIva,
      estadoAmbulatorio: o.estadoAmbulatorio, estadoInternacion: o.estadoInternacion,
      porcentajeDescMedicamentos: String(o.porcentajeDescMedicamentos), activa: o.activa,
    });
  };

  const cancelEdit = () => { setEditing(null); setForm(EMPTY_OS_FORM); setError(null); };

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-medium text-text">Obras sociales</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input placeholder="Código" value={form.codigo} onChange={(e) => set("codigo", e.target.value)} className="input-field text-[13px]" />
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} className="input-field text-[13px]" />
        <input placeholder="Sigla" value={form.sigla} onChange={(e) => set("sigla", e.target.value)} className="input-field text-[13px]" />
        <input placeholder="CUIT (20-12345678-9)" value={form.cuit} onChange={(e) => set("cuit", e.target.value)} className="input-field text-[13px]" />
        <input placeholder="Descripción" value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} className="input-field text-[13px]" />
        <input placeholder="Razón social" value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} className="input-field text-[13px]" />
        <input placeholder="Domicilio (opcional)" value={form.domicilio} onChange={(e) => set("domicilio", e.target.value)} className="input-field text-[13px]" />
        <input placeholder="Localidad (opcional)" value={form.localidad} onChange={(e) => set("localidad", e.target.value)} className="input-field text-[13px]" />
        <select value={form.tipoContribucion} onChange={(e) => set("tipoContribucion", e.target.value)} className="select-field text-[13px]">
          {TIPO_CONTRIBUCION.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
        <select value={form.tipoIva} onChange={(e) => set("tipoIva", e.target.value)} className="select-field text-[13px]">
          {Object.entries(IVA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={form.estadoAmbulatorio} onChange={(e) => set("estadoAmbulatorio", e.target.value)} className="select-field text-[13px]">
          <option value="ACTIVA">Ambulatorio: ACTIVA</option>
          <option value="SUSPENDIDA">Ambulatorio: SUSPENDIDA</option>
        </select>
        <select value={form.estadoInternacion} onChange={(e) => set("estadoInternacion", e.target.value)} className="select-field text-[13px]">
          <option value="ACTIVA">Internación: ACTIVA</option>
          <option value="SUSPENDIDA">Internación: SUSPENDIDA</option>
        </select>
        <input type="number" min={0} max={100} placeholder="Desc. medicamentos %" value={form.porcentajeDescMedicamentos} onChange={(e) => set("porcentajeDescMedicamentos", e.target.value)} className="input-field text-[13px]" />
        <label className="flex items-center gap-2 text-[13px] text-muted select-none">
          <input type="checkbox" checked={form.activa} onChange={(e) => set("activa", e.target.checked)} className="accent-accent-button" />
          Activa
        </label>
        <div className="flex gap-2 items-center">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-[13px]">{editing ? "Actualizar" : "Crear"}</button>
          {editing && <button onClick={cancelEdit} className="btn-secondary text-[13px]"><X size={14} /></button>}
        </div>
      </div>
      {error && <p className="text-[12px] text-error">{error}</p>}
      {obras.length === 0 ? (
        <Empty text="Sin obras sociales." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border text-muted"><th className={th}>Nombre</th><th className={th}>CUIT</th><th className={th}>Contribución</th><th className={th}>IVA</th><th className={th}>Desc. med.</th><th className={th}>Ambulatorio</th><th className={th}>Internación</th><th className={th}>Estado</th><th className={th}>Acciones</th></tr></thead>
            <tbody>
              {obras.map((o) => (
                <tr key={o.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                  <td className={td}>
                    <span className="text-text font-medium">{o.nombre}</span>
                    <span className="block font-mono text-[11px] text-muted">{o.sigla} · {o.codigo}</span>
                  </td>
                  <td className={td + " font-mono text-muted whitespace-nowrap"}>{o.cuit}</td>
                  <td className={td + " text-muted"}>{o.tipoContribucion.replace("_", " ")}</td>
                  <td className={td + " text-muted tabular-nums"}>{IVA_LABEL[o.tipoIva] ?? o.tipoIva}</td>
                  <td className={td + " text-muted tabular-nums"}>{o.porcentajeDescMedicamentos}%</td>
                  <td className={td}>
                    <StatusBadge tone={COBERTURA_BADGE[o.estadoAmbulatorio]?.tone ?? "neutral"} label={COBERTURA_BADGE[o.estadoAmbulatorio]?.label ?? o.estadoAmbulatorio} dot />
                  </td>
                  <td className={td}>
                    <StatusBadge tone={COBERTURA_BADGE[o.estadoInternacion]?.tone ?? "neutral"} label={COBERTURA_BADGE[o.estadoInternacion]?.label ?? o.estadoInternacion} dot />
                  </td>
                  <td className={td}>
                    <StatusBadge tone={o.activa ? "success" : "neutral"} label={o.activa ? "Activa" : "Inactiva"} dot={o.activa} />
                  </td>
                  <td className={td}>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => startEdit(o)} className="text-[12px] text-brand hover:underline">Editar</button>
                      <button onClick={() => handleToggle(o.id, o.activa)} className="text-[12px] text-warning hover:underline">{o.activa ? "Desactivar" : "Activar"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuirofanosTab({ quirofanos, onRefresh }: { quirofanos: Quirofano[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ numero: 0, nombre: "", piso: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Quirofano | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing ? { id: editing, ...form } : form;
      await fetch("/api/quirofanos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setForm({ numero: 0, nombre: "", piso: "" });
      setEditing(null);
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setPendingDelete(null);
    await fetch(`/api/quirofanos?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleToggle = async (id: string, disponible: boolean) => {
    await fetch("/api/quirofanos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, disponible: !disponible }) });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-medium text-text">Quirófanos</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input type="number" placeholder="N°" value={form.numero || ""} onChange={(e) => setForm({ ...form, numero: Number(e.target.value) })} className="input-field text-[13px]" />
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field text-[13px]" />
        <input placeholder="Piso (opcional)" value={form.piso} onChange={(e) => setForm({ ...form, piso: e.target.value })} className="input-field text-[13px]" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.numero || !form.nombre} className="btn-primary text-[13px]">{editing ? "Actualizar" : "Crear"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ numero: 0, nombre: "", piso: "" }); }} className="btn-secondary text-[13px]"><X size={14} /></button>}
        </div>
      </div>
      {quirofanos.length === 0 ? (
        <Empty text="Sin quirófanos." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border text-muted"><th className={th}>N°</th><th className={th}>Nombre</th><th className={th}>Piso</th><th className={th}>Disponible</th><th className={th}>Acciones</th></tr></thead>
            <tbody>
              {quirofanos.map((q) => (
                <tr key={q.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                  <td className={td + " font-mono text-muted"}>{q.numero}</td>
                  <td className={td + " text-text"}>{q.nombre}</td>
                  <td className={td + " text-muted"}>{q.piso || "—"}</td>
                  <td className={td}>
                    <StatusBadge tone={q.disponible ? "success" : "neutral"} label={q.disponible ? "Disponible" : "No disponible"} dot={q.disponible} />
                  </td>
                  <td className={td}>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => { setEditing(q.id); setForm({ numero: q.numero, nombre: q.nombre, piso: q.piso || "" }); }} className="text-[12px] text-brand hover:underline">Editar</button>
                      <button onClick={() => handleToggle(q.id, q.disponible)} className="text-[12px] text-warning hover:underline">{q.disponible ? "Deshabilitar" : "Habilitar"}</button>
                      <button onClick={() => setPendingDelete(q)} className="text-muted hover:text-error transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar quirófano"
        message={
          pendingDelete ? (
            <>
              Se eliminará el quirófano <strong className="text-text">{pendingDelete.nombre}</strong> ({pendingDelete.numero}).
              Esta acción no se puede deshacer.
            </>
          ) : ""
        }
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function RangosTab({ rangos, onRefresh }: { rangos: RangoVital[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ parametro: "", minimo: 0, maximo: 0, unidad: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RangoVital | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing ? { id: editing, ...form } : form;
      await fetch("/api/rangos-vitales", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setForm({ parametro: "", minimo: 0, maximo: 0, unidad: "" });
      setEditing(null);
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setPendingDelete(null);
    await fetch(`/api/rangos-vitales?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-medium text-text">Rangos de signos vitales</p>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input placeholder="Parámetro (ej: FC)" value={form.parametro} onChange={(e) => setForm({ ...form, parametro: e.target.value })} className="input-field text-[13px]" />
        <input type="number" placeholder="Mínimo" value={form.minimo || ""} onChange={(e) => setForm({ ...form, minimo: Number(e.target.value) })} className="input-field text-[13px]" />
        <input type="number" placeholder="Máximo" value={form.maximo || ""} onChange={(e) => setForm({ ...form, maximo: Number(e.target.value) })} className="input-field text-[13px]" />
        <input placeholder="Unidad" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} className="input-field text-[13px]" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.parametro || !form.unidad} className="btn-primary text-[13px]">{editing ? "Actualizar" : "Crear"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ parametro: "", minimo: 0, maximo: 0, unidad: "" }); }} className="btn-secondary text-[13px]"><X size={14} /></button>}
        </div>
      </div>
      {rangos.length === 0 ? (
        <Empty text="Sin rangos vitales." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border text-muted"><th className={th}>Parámetro</th><th className={th}>Mínimo</th><th className={th}>Máximo</th><th className={th}>Unidad</th><th className={th}>Acciones</th></tr></thead>
            <tbody>
              {rangos.map((r) => (
                <tr key={r.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                  <td className={td + " text-text font-mono"}>{r.parametro}</td>
                  <td className={td + " text-muted tabular-nums"}>{r.minimo}</td>
                  <td className={td + " text-muted tabular-nums"}>{r.maximo}</td>
                  <td className={td + " text-muted"}>{r.unidad}</td>
                  <td className={td}>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => { setEditing(r.id); setForm({ parametro: r.parametro, minimo: r.minimo, maximo: r.maximo, unidad: r.unidad }); }} className="text-[12px] text-brand hover:underline">Editar</button>
                      <button onClick={() => setPendingDelete(r)} className="text-muted hover:text-error transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar rango"
        message={
          pendingDelete ? (
            <>
              Se eliminará el rango <strong className="text-text">{pendingDelete.parametro}</strong> ({pendingDelete.minimo}–{pendingDelete.maximo} {pendingDelete.unidad}).
              Esta acción no se puede deshacer.
            </>
          ) : ""
        }
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}