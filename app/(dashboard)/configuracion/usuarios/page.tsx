"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, AlertTriangle, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { formatUserName } from "@/lib/utils";

const ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA", "SECRETARIA"] as const;

const rolTone: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  ADMIN: "danger",
  MEDICO: "info",
  ENFERMERO: "success",
  ANESTESIOLOGO: "warning",
  INSTRUMENTADOR: "neutral",
  ADMISION: "neutral",
  FACTURACION: "neutral",
  FARMACIA: "neutral",
  SECRETARIA: "warning",
};

interface Usuario {
  id: string;
  nombre: string;
  apellido?: string | null;
  email: string;
  rol: string;
  matricula?: string | null;
  especialidad?: string | null;
}

const EMPTY_FORM = { nombre: "", apellido: "", email: "", password: "", rol: "MEDICO", matricula: "", especialidad: "" };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios");
      if (res.ok) setUsuarios(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (u: Usuario) => {
    setForm({
      nombre: u.nombre,
      apellido: u.apellido || "",
      email: u.email,
      password: "",
      rol: u.rol,
      matricula: u.matricula || "",
      especialidad: u.especialidad || "",
    });
    setEditingId(u.id);
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    const payload: {
      nombre: string;
      apellido: string | null;
      email: string;
      rol: string;
      matricula: string | null;
      especialidad: string | null;
      password?: string;
    } = {
      nombre: form.nombre,
      apellido: form.apellido || null,
      email: form.email,
      rol: form.rol,
      matricula: form.matricula || null,
      especialidad: form.especialidad || null,
    };

    try {
      if (editingId) {
        if (form.password) payload.password = form.password;
        const res = await fetch(`/api/usuarios/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setSuccess("Usuario actualizado correctamente.");
          resetForm();
          fetchUsuarios();
        } else {
          const data = await res.json();
          setError(data.error || "Error al actualizar");
        }
      } else {
        if (!form.password) {
          setError("La contraseña es requerida para crear un usuario");
          return;
        }
        payload.password = form.password;
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setSuccess("Usuario creado correctamente.");
          resetForm();
          fetchUsuarios();
        } else {
          const data = await res.json();
          setError(data.error || "Error al crear");
        }
      }
    } catch {
      setError("Error de conexión");
    }
  };

  const medicos = usuarios.filter((u) => u.rol === "MEDICO").length;
  const recepcion = usuarios.filter((u) => ["ADMISION", "SECRETARIA", "FACTURACION", "FARMACIA"].includes(u.rol)).length;

  if (loading) return <div className="space-y-2"><div className="skeleton h-24" /><div className="skeleton h-48" /></div>;

  const field = "flex flex-col gap-1";
  const label = "text-[11px] font-mono uppercase tracking-widest text-muted";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuración · Usuarios"
        title="Gestionar usuarios"
        description="Crear, editar y administrar los usuarios del sistema y sus roles."
        actions={
          !showForm && (
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary inline-flex items-center gap-1.5 text-[13px]">
              <Plus size={15} /> Nuevo usuario
            </button>
          )
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-3 gap-5">
        <OpsStat label="Usuarios" value={usuarios.length} sub="Cuentas activas" tone="info" />
        <OpsStat label="Médicos" value={medicos} sub="Con perfil clínico" tone="neutral" />
        <OpsStat label="Recepción" value={recepcion} sub="Adm. + secretarias + fact." tone="neutral" />
      </section>

      {success && (
        <div className="flex items-center gap-2 text-[13px] text-success border border-success/25 bg-success/10 rounded-md px-3 py-2">
          <Check size={14} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[13px] text-error border border-error/25 bg-error/10 rounded-md px-3 py-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {usuarios.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-[13px] text-muted">No hay usuarios registrados.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted text-[11px] font-mono uppercase tracking-widest">
                  <th className="px-4 py-2.5 text-left">Nombre</th>
                  <th className="px-4 py-2.5 text-left">Email</th>
                  <th className="px-4 py-2.5 text-left">Rol</th>
                  <th className="px-4 py-2.5 text-left">Matrícula</th>
                  <th className="px-4 py-2.5 text-left">Especialidad</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-2.5 text-text">{formatUserName(u)}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-muted">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge tone={rolTone[u.rol] || "neutral"} label={u.rol} />
                    </td>
                    <td className="px-4 py-2.5 text-muted">{u.matricula || "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{u.especialidad || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => handleEdit(u)} className="p-1.5 rounded-md text-muted hover:text-brand hover:bg-brand-soft transition-colors" title="Editar">
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={resetForm}
        title={editingId ? "Editar usuario" : "Nuevo usuario"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={field}>
              <label className={label}>Nombre *</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field text-[13px]" required />
            </div>
            <div className={field}>
              <label className={label}>Apellido *</label>
              <input type="text" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} className="input-field text-[13px]" required />
            </div>
            <div className={field}>
              <label className={label}>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field text-[13px]" required />
            </div>
            <div className={field}>
              <label className={label}>Contraseña {editingId ? "(vacío = no cambiar)" : "*"}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field text-[13px]" {...(!editingId ? { required: true } : {})} />
            </div>
            <div className={field}>
              <label className={label}>Rol *</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="select-field text-[13px]" required>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label className={label}>Matrícula</label>
              <input type="text" value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} className="input-field text-[13px]" placeholder="Opcional" />
            </div>
            <div className={`${field} sm:col-span-2`}>
              <label className={label}>Especialidad</label>
              <input type="text" value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} className="input-field text-[13px]" placeholder="Opcional" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[12px] text-error border border-error/25 bg-error/10 rounded-md px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={resetForm} className="btn-secondary text-[13px]">Cancelar</button>
            <button type="submit" className="btn-primary text-[13px]">
              {editingId ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}