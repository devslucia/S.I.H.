"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, X, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Paciente {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  sexo: string;
  fechaNac: string;
  cuil?: string;
  domicilio?: string;
  localidad?: string;
  telefono?: string;
  alergias?: { id: string; descripcion: string }[];
}

const initialForm = {
  dni: "",
  apellido: "",
  nombre: "",
  sexo: "MASCULINO",
  fechaNac: "",
  cuil: "",
  domicilio: "",
  localidad: "",
  provincia: "",
  telefono: "",
};

export default function AdmisionPage() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const fetchPacientes = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const query = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/pacientes${query}`);
      if (res.ok) { const d = await res.json(); setPacientes(Array.isArray(d) ? d : []); }
    } catch (err) {
      console.error("Error fetching pacientes", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPacientes(search);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm(initialForm);
        fetchPacientes(search);
      }
    } catch (err) {
      console.error("Error creating paciente", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">Identificación de Pacientes</h2>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Nuevo Paciente
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por DNI, nombre o apellido..."
            className="input-field pl-10"
          />
        </div>
        <Button type="submit" size="sm">
          Buscar
        </Button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <p className="text-muted text-sm">Cargando pacientes...</p>
        ) : pacientes.length === 0 ? (
          <p className="text-muted text-sm">No se encontraron pacientes.</p>
        ) : (
          pacientes.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/admision/${p.id}`)}
              className="card p-4 flex items-center justify-between cursor-pointer hover:border-teal/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center text-teal font-medium text-sm">
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div>
                  <p className="text-white font-medium">{p.apellido}, {p.nombre}</p>
                  <p className="text-muted text-xs">DNI: {p.dni} | {p.sexo} | {p.telefono || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.alergias && p.alergias.length > 0 && (
                  <Badge variant="error" className="flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {p.alergias.length} alergia(s)
                  </Badge>
                )}
                <span className="text-muted text-xs">{p.localidad || ""}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Paciente" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="DNI" name="dni" value={form.dni} onChange={handleChange} required />
            <Input label="Apellido" name="apellido" value={form.apellido} onChange={handleChange} required />
            <Input label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Sexo</label>
              <select name="sexo" value={form.sexo} onChange={handleChange} className="select-field">
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <Input label="Fecha de Nacimiento" name="fechaNac" type="date" value={form.fechaNac} onChange={handleChange} required />
            <Input label="CUIL" name="cuil" value={form.cuil} onChange={handleChange} />
            <Input label="Domicilio" name="domicilio" value={form.domicilio} onChange={handleChange} />
            <Input label="Localidad" name="localidad" value={form.localidad} onChange={handleChange} />
            <Input label="Provincia" name="provincia" value={form.provincia} onChange={handleChange} />
            <Input label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
