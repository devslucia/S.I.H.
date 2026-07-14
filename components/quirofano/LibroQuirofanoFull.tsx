"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/Badge";
import { Save, Printer, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { ProtocoloAnestesiaComponent } from "@/components/historia-clinica/ProtocoloAnestesia";
import { getEffectiveRole, canEditField, canCloseSurgery, getPendingItems, type EffectiveRole } from "@/lib/quirofano-rbac";
import { TabCirugia } from "./tabs/TabCirugia";
import { TabPracticasMed } from "./tabs/TabPracticasMed";
import { TabParto } from "./tabs/TabParto";
import { TabParteQuirurgico } from "./tabs/TabParteQuirurgico";
import { TabIngresosEgresos } from "./tabs/TabIngresosEgresos";
import { TabReprogramaciones } from "./tabs/TabReprogramaciones";
import { PendingChecklist } from "./tabs/PendingChecklist";
import { CloseConfirmationModal } from "./tabs/CloseConfirmationModal";
import type { PendingItem } from "@/lib/quirofano-rbac";

type CirugiaData = any;
type UsuarioData = { id: string; nombre: string; email: string; rol: string; matricula?: string; especialidad?: string };

const TABS = ["Cirugía", "Prácticas/Med", "Parto/Cesárea", "Parte Quirúrgico", "Ingresos/Egresos", "Reprogramaciones", "Protocolo Anestesia"];

const btnClass = "px-4 py-2 text-sm rounded font-medium transition-colors";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-accent/90`;
const btnOutline = `${btnClass} border border-border text-muted hover:text-foreground hover:border-muted`;
const btnDanger = `${btnClass} bg-red/20 text-red hover:bg-red/30`;

export default function LibroQuirofanoFull() {
  const params = useParams();
  const cirugiaId = params.cirugiaId as string;
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<CirugiaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioData[]>([]);
  const [formData, setFormData] = useState<CirugiaData>({});
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  const isReadOnly = data?.estado === "COMPLETADA" || data?.estado === "REPROGRAMADA";

  // Resolver el rol efectivo del usuario en esta cirugía
  const effectiveRole: EffectiveRole = (() => {
    if (!data || !session?.user?.id) return "MEDICO";
    return getEffectiveRole(data, session.user.id, session.user.rol);
  })();

  // Función para verificar si el usuario puede editar un campo
  const canEdit = useCallback((field: string): boolean => {
    return canEditField(effectiveRole, field);
  }, [effectiveRole]);

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
        setPendingItems(getPendingItems(d));
      }
      if (userRes.ok) setUsuarios(await userRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [cirugiaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        setPendingItems(getPendingItems(updated));
      } else if (res.status === 403) {
        const err = await res.json();
        alert(`Sin permiso para modificar: ${err.fields?.join(", ") || "campos no autorizados"}`);
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
    setShowCloseModal(false);
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

  const update = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

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
            <h2 className="text-lg font-medium text-foreground">Libro de Quirófano</h2>
            <p className="text-xs text-muted">
              {paciente ? `${paciente.apellido}, ${paciente.nombre}` : "—"} | {data?.procedimiento || "Sin procedimiento"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={data?.estado === "COMPLETADA" ? "success" : data?.estado === "EN_CURSO" ? "warning" : "info"}>
            {data?.estado}
          </Badge>
          <span className="text-xs text-muted px-2 py-1 bg-background rounded">
            Tu rol: <span className="font-medium text-foreground">{effectiveRole}</span>
          </span>
        </div>
      </div>

      {/* Patient info bar */}
      <div className="px-6 py-2 border-b border-border bg-surface/50 shrink-0">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span><span className="font-medium text-muted">Paciente:</span> {paciente ? `${paciente.apellido}, ${paciente.nombre}` : "—"}</span>
          <span><span className="font-medium text-muted">N° HC:</span> {paciente?.dni || "—"}</span>
          <span><span className="font-medium text-muted">N° Internación:</span> {internacion?.numero || "—"}</span>
          <span><span className="font-medium text-muted">Obra Social:</span> {internacion?.obraSocial?.nombre || "—"}</span>
          <span><span className="font-medium text-muted">Cama:</span> {internacion?.cama?.numero || "—"}</span>
        </div>
      </div>

      {/* Pending checklist */}
      <div className="px-6 pt-4 shrink-0">
        <PendingChecklist items={pendingItems} effectiveRole={effectiveRole} onNavigate={setActiveTab} />
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border bg-surface shrink-0 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === i ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
            }`}
          >{tab}</button>
        ))}
      </div>

      {/* Tab content - scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 0 && (
          <TabCirugia formData={formData} update={update} isReadOnly={isReadOnly}
            effectiveRole={effectiveRole} canEdit={canEdit} usuarios={usuarios} />
        )}

        {activeTab === 1 && (
          <TabPracticasMed data={data} formData={formData} update={update} isReadOnly={isReadOnly}
            effectiveRole={effectiveRole} canEdit={canEdit} cirugiaId={cirugiaId} onRefresh={fetchData} />
        )}

        {activeTab === 2 && (
          <TabParto formData={formData} update={update} isReadOnly={isReadOnly}
            effectiveRole={effectiveRole} canEdit={canEdit} />
        )}

        {activeTab === 3 && (
          <TabParteQuirurgico data={data} formData={formData} update={update} isReadOnly={isReadOnly}
            effectiveRole={effectiveRole} canEdit={canEdit} onImprimir={handleImprimir}
            cirugiaId={cirugiaId} onRefresh={fetchData} />
        )}

        {activeTab === 4 && (
          <TabIngresosEgresos formData={formData} update={update} isReadOnly={isReadOnly}
            effectiveRole={effectiveRole} canEdit={canEdit} />
        )}

        {activeTab === 5 && (
          <TabReprogramaciones data={data} isReadOnly={isReadOnly}
            effectiveRole={effectiveRole} cirugiaId={cirugiaId} onRefresh={fetchData} />
        )}

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
          {data?.estado === "EN_CURSO" && canCloseSurgery(effectiveRole) && (
            <button onClick={() => setShowCloseModal(true)} disabled={saving}
              className={`${btnDanger} flex items-center gap-2 ${saving ? "opacity-50 cursor-not-allowed" : ""}`}>
              <CheckCircle size={16} /> Cerrar cirugía
            </button>
          )}
        </div>
      </div>

      {/* Modal: Confirmar cierre */}
      {showCloseModal && (
        <CloseConfirmationModal
          pendingItems={pendingItems}
          onConfirm={cerrarCirugia}
          onCancel={() => setShowCloseModal(false)}
        />
      )}
    </div>
  );
}
