"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Pencil, X, CheckCircle, AlertTriangle } from "lucide-react";

const ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION", "FACTURACION", "FARMACIA"] as const;

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  matricula?: string | null;
  especialidad?: string | null;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "MEDICO",
    matricula: "",
    especialidad: "",
  });

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
    setForm({ nombre: "", email: "", password: "", rol: "MEDICO", matricula: "", especialidad: "" });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (u: Usuario) => {
    setForm({
      nombre: u.nombre,
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

    const payload: Record<string, any> = {
      nombre: form.nombre,
      email: form.email,
      rol: form.rol,
      matricula: form.matricula || null,
      especialidad: form.especialidad || null,
    };

    if (editingId) {
      if (form.password) payload.password = form.password;
      try {
        const res = await fetch(`/api/usuarios/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setSuccess("Usuario actualizado correctamente");
          resetForm();
          fetchUsuarios();
        } else {
          const data = await res.json();
          setError(data.error || "Error al actualizar");
        }
      } catch {
        setError("Error de conexión");
      }
    } else {
      if (!form.password) {
        setError("La contraseña es requerida para crear un usuario");
        return;
      }
      payload.password = form.password;
      try {
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setSuccess("Usuario creado correctamente");
          resetForm();
          fetchUsuarios();
        } else {
          const data = await res.json();
          setError(data.error || "Error al crear");
        }
      } catch {
        setError("Error de conexión");
      }
    }
  };

  if (loading) return <p className="text-muted text-sm">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-accent" />
          <h2 className="text-xl font-medium text-white">Gestionar Usuarios</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            <Plus size={16} /> Nuevo Usuario
          </button>
        )}
      </div>

      {success && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2 text-success text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red/10 border border-red/30 rounded-lg flex items-center gap-2 text-red text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">{editingId ? "Editar Usuario" : "Nuevo Usuario"}</h3>
            <button type="button" onClick={resetForm} className="text-muted hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">
                Contraseña {editingId ? "(dejar vacío para no cambiar)" : "*"}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field w-full"
                {...(!editingId ? { required: true } : {})}
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Rol *</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="input-field w-full"
                required
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Matrícula</label>
              <input
                type="text"
                value={form.matricula}
                onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                className="input-field w-full"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Especialidad</label>
              <input
                type="text"
                value={form.especialidad}
                onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
                className="input-field w-full"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-muted hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
            >
              {editingId ? "Guardar Cambios" : "Crear Usuario"}
            </button>
          </div>
        </form>
      )}

      {usuarios.length === 0 ? (
        <p className="text-muted text-sm">No hay usuarios registrados.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted font-medium">Nombre</th>
                <th className="text-left p-3 text-muted font-medium">Email</th>
                <th className="text-left p-3 text-muted font-medium">Rol</th>
                <th className="text-left p-3 text-muted font-medium">Matrícula</th>
                <th className="text-left p-3 text-muted font-medium">Especialidad</th>
                <th className="text-right p-3 text-muted font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-background/50">
                  <td className="p-3 text-white">{u.nombre}</td>
                  <td className="p-3 text-muted">{u.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-accent/10 text-accent border border-accent/30">
                      {u.rol}
                    </span>
                  </td>
                  <td className="p-3 text-muted">{u.matricula || "—"}</td>
                  <td className="p-3 text-muted">{u.especialidad || "—"}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleEdit(u)}
                      className="p-1.5 text-muted hover:text-accent transition-colors"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
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
