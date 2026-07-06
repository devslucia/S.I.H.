"use client";

import { useState, useEffect } from "react";
import { Bed, Building2, Heart, Activity, Trash2, Plus, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

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

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "sectores", label: "Sectores", icon: Building2 },
    { id: "camas", label: "Camas", icon: Bed },
    { id: "obras-sociales", label: "Obras Sociales", icon: Heart },
    { id: "quirofanos", label: "Quirófanos", icon: Activity },
    { id: "rangos-vitales", label: "Rangos Vitales", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-text">Configuración del Sistema</h2>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === t.id ? "bg-accent/20 text-accent border border-accent/30" : "bg-black/20 text-muted border border-border hover:bg-border/30"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando...</p>
      ) : (
        <div className="card p-4">
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
    if (!confirm("¿Eliminar sector?")) return;
    await fetch(`/api/sectores?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text">Sectores</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field text-sm" />
        <input placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input-field text-sm" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.nombre || !form.codigo} className="btn-primary text-sm">{editing ? "Actualizar" : "Crear"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ nombre: "", codigo: "" }); }} className="btn-secondary text-sm"><X size={14} /></button>}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-muted border-b border-border"><th className="text-left py-2">Nombre</th><th className="text-left py-2">Código</th><th className="text-left py-2">Camas</th><th className="text-left py-2">Acciones</th></tr></thead>
        <tbody>
          {sectores.map((s) => (
            <tr key={s.id} className="border-b border-border/30">
              <td className="py-2 text-text">{s.nombre}</td>
              <td className="py-2 text-muted">{s.codigo}</td>
              <td className="py-2 text-muted">{s._count?.camas || 0}</td>
              <td className="py-2 flex gap-2">
                <button onClick={() => { setEditing(s.id); setForm({ nombre: s.nombre, codigo: s.codigo }); }} className="text-xs text-accent">Editar</button>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-red"><Trash2 size={12} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CamasTab({ camas, sectores, onRefresh }: { camas: Cama[]; sectores: Sector[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ numero: "", sectorId: "", tipo: "ESTANDAR" });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await fetch("/api/camas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ numero: "", sectorId: "", tipo: "ESTANDAR" });
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar cama?")) return;
    await fetch(`/api/camas?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleEstado = async (id: string, estado: string) => {
    await fetch("/api/camas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, estado }) });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text">Camas</h3>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input placeholder="Número" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="input-field text-sm" />
        <select value={form.sectorId} onChange={(e) => setForm({ ...form, sectorId: e.target.value })} className="input-field text-sm">
          <option value="">Sector...</option>
          {sectores.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input-field text-sm">
          <option value="ESTANDAR">Estándar</option>
          <option value="TERAPIA_INTENSIVA">Terapia Intensiva</option>
          <option value="GUARDIA">Guardia</option>
        </select>
        <button onClick={handleCreate} disabled={saving || !form.numero || !form.sectorId} className="btn-primary text-sm">Crear</button>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted border-b border-border"><th className="text-left py-2">N°</th><th className="text-left py-2">Sector</th><th className="text-left py-2">Tipo</th><th className="text-left py-2">Estado</th><th className="text-left py-2">Acciones</th></tr></thead>
          <tbody>
            {camas.map((c) => (
              <tr key={c.id} className="border-b border-border/30">
                <td className="py-2 text-text">{c.numero}</td>
                <td className="py-2 text-muted">{c.sector.nombre}</td>
                <td className="py-2 text-muted">{c.tipo || "—"}</td>
                <td className="py-2">
                  <select value={c.estado} onChange={(e) => handleEstado(c.id, e.target.value)} className="input-field text-xs py-1">
                    {ESTADOS_CAMA.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
                <td className="py-2">
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ObrasTab({ obras, onRefresh }: { obras: ObraSocial[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ codigo: "", nombre: "", sigla: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing ? { id: editing, ...form } : form;
      await fetch("/api/obras-sociales", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setForm({ codigo: "", nombre: "", sigla: "" });
      setEditing(null);
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleToggle = async (id: string, activa: boolean) => {
    await fetch("/api/obras-sociales", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, activa: !activa }) });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text">Obras Sociales</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input-field text-sm" />
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field text-sm" />
        <input placeholder="Sigla" value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value })} className="input-field text-sm" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.codigo || !form.nombre || !form.sigla} className="btn-primary text-sm">{editing ? "Actualizar" : "Crear"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ codigo: "", nombre: "", sigla: "" }); }} className="btn-secondary text-sm"><X size={14} /></button>}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-muted border-b border-border"><th className="text-left py-2">Código</th><th className="text-left py-2">Nombre</th><th className="text-left py-2">Sigla</th><th className="text-left py-2">Estado</th><th className="text-left py-2">Acciones</th></tr></thead>
        <tbody>
          {obras.map((o) => (
            <tr key={o.id} className="border-b border-border/30">
              <td className="py-2 text-muted">{o.codigo}</td>
              <td className="py-2 text-text">{o.nombre}</td>
              <td className="py-2 text-muted">{o.sigla}</td>
              <td className="py-2"><Badge variant={o.activa ? "success" : "default"}>{o.activa ? "Activa" : "Inactiva"}</Badge></td>
              <td className="py-2 flex gap-2">
                <button onClick={() => { setEditing(o.id); setForm({ codigo: o.codigo, nombre: o.nombre, sigla: o.sigla }); }} className="text-xs text-accent">Editar</button>
                <button onClick={() => handleToggle(o.id, o.activa)} className="text-xs text-amber">{o.activa ? "Desactivar" : "Activar"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuirofanosTab({ quirofanos, onRefresh }: { quirofanos: Quirofano[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ numero: 0, nombre: "", piso: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!confirm("¿Eliminar quirófano?")) return;
    await fetch(`/api/quirofanos?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleToggle = async (id: string, disponible: boolean) => {
    await fetch("/api/quirofanos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, disponible: !disponible }) });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text">Quirófanos</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input type="number" placeholder="N°" value={form.numero || ""} onChange={(e) => setForm({ ...form, numero: Number(e.target.value) })} className="input-field text-sm" />
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field text-sm" />
        <input placeholder="Piso (opcional)" value={form.piso} onChange={(e) => setForm({ ...form, piso: e.target.value })} className="input-field text-sm" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.numero || !form.nombre} className="btn-primary text-sm">{editing ? "Actualizar" : "Crear"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ numero: 0, nombre: "", piso: "" }); }} className="btn-secondary text-sm"><X size={14} /></button>}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-muted border-b border-border"><th className="text-left py-2">N°</th><th className="text-left py-2">Nombre</th><th className="text-left py-2">Piso</th><th className="text-left py-2">Disponible</th><th className="text-left py-2">Acciones</th></tr></thead>
        <tbody>
          {quirofanos.map((q) => (
            <tr key={q.id} className="border-b border-border/30">
              <td className="py-2 text-muted">{q.numero}</td>
              <td className="py-2 text-text">{q.nombre}</td>
              <td className="py-2 text-muted">{q.piso || "—"}</td>
              <td className="py-2"><Badge variant={q.disponible ? "success" : "default"}>{q.disponible ? "Sí" : "No"}</Badge></td>
              <td className="py-2 flex gap-2">
                <button onClick={() => { setEditing(q.id); setForm({ numero: q.numero, nombre: q.nombre, piso: q.piso || "" }); }} className="text-xs text-accent">Editar</button>
                <button onClick={() => handleToggle(q.id, q.disponible)} className="text-xs text-amber">{q.disponible ? "Deshabilitar" : "Habilitar"}</button>
                <button onClick={() => handleDelete(q.id)} className="text-xs text-red"><Trash2 size={12} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RangosTab({ rangos, onRefresh }: { rangos: RangoVital[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ parametro: "", minimo: 0, maximo: 0, unidad: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!confirm("¿Eliminar rango?")) return;
    await fetch(`/api/rangos-vitales?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text">Rangos de Signos Vitales</h3>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input placeholder="Parámetro (ej: FC)" value={form.parametro} onChange={(e) => setForm({ ...form, parametro: e.target.value })} className="input-field text-sm" />
        <input type="number" placeholder="Mínimo" value={form.minimo || ""} onChange={(e) => setForm({ ...form, minimo: Number(e.target.value) })} className="input-field text-sm" />
        <input type="number" placeholder="Máximo" value={form.maximo || ""} onChange={(e) => setForm({ ...form, maximo: Number(e.target.value) })} className="input-field text-sm" />
        <input placeholder="Unidad" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} className="input-field text-sm" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.parametro || !form.unidad} className="btn-primary text-sm">{editing ? "Actualizar" : "Crear"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm({ parametro: "", minimo: 0, maximo: 0, unidad: "" }); }} className="btn-secondary text-sm"><X size={14} /></button>}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-muted border-b border-border"><th className="text-left py-2">Parámetro</th><th className="text-left py-2">Mínimo</th><th className="text-left py-2">Máximo</th><th className="text-left py-2">Unidad</th><th className="text-left py-2">Acciones</th></tr></thead>
        <tbody>
          {rangos.map((r) => (
            <tr key={r.id} className="border-b border-border/30">
              <td className="py-2 text-text">{r.parametro}</td>
              <td className="py-2 text-muted">{r.minimo}</td>
              <td className="py-2 text-muted">{r.maximo}</td>
              <td className="py-2 text-muted">{r.unidad}</td>
              <td className="py-2 flex gap-2">
                <button onClick={() => { setEditing(r.id); setForm({ parametro: r.parametro, minimo: r.minimo, maximo: r.maximo, unidad: r.unidad }); }} className="text-xs text-accent">Editar</button>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-red"><Trash2 size={12} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
