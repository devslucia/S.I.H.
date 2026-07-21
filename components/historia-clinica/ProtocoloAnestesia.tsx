"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Save, CheckCircle, AlertCircle, ChevronDown, ChevronRight,
  Printer, PenLine, AlertTriangle, Clock, Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { protocoloAnestesiaSchema } from "@/lib/validations/protocolo-anestesia";
import type { ProtocoloAnestesiaFormData } from "@/lib/validations/protocolo-anestesia";
import type { SignoVitalRegistro, PremedicacionItem } from "@/types";
import { EscalaAldrete } from "./anestesia/EscalaAldrete";
import { PanelDrogas } from "./anestesia/PanelDrogas";
import { GraficoSignosVitales } from "./anestesia/GraficoSignosVitales";

interface ProtocoloAnestesiaProps {
  internacionId: string;
  cirugiaId?: string;
}

const SECCIONES = [
  { key: "identificacion", label: "1. Identificación" },
  { key: "preanesia", label: "2. Evaluación Preanestésica" },
  { key: "tecnica", label: "3. Técnica Anestésica" },
  { key: "registro", label: "4. Registro Intraoperatorio" },
  { key: "balance", label: "5. Balance de Líquidos" },
  { key: "recuperacion", label: "6. Recuperación y Firma" },
];

const ESTADO_PSICOS = ["Normal", "Ansioso", "Hiperemotivo", "Excitado", "Deprimido", "Comatoso"];
const MALLAMPATI = ["I", "II", "III", "IV"];
const TIPOS_CONDUCTIVA = ["Peridural", "Raquídea", "Troncular", "Plexual", "Local", "Regional I.V."];
const VIA_AEREA = ["Intubación traqueal", "Máscara facial", "Máscara laríngea", "Cánula faríngea", "Cánula nasal (bigotera)"];
const INTUBACION_SUBTIPO = ["OR (orotraqueal)", "NS (nasotraqueal)", "Pack F."];
const CANULA_FARINGEAL = ["Oral", "Nasal"];
const MODALIDAD_VENT = ["Espontánea", "Asistida", "Controlada", "Mecánica", "Manual"];
const POSICIONES = ["Supino", "Prono", "Lateral derecho", "Lateral izquierdo", "Litotomía", "Trendelenburg", "Anti-Trendelenburg", "Sentado", "Otro"];
const DESTINOS = ["URPA", "Internación general", "UTI", "Ambulatorio"];
const EGRESO_CHECKBOXES = ["Consciente", "Ventilando espontáneamente", "Intubado", "Vigil", "Excitable"];

function ProtocoloAnestesiaComponent({ internacionId, cirugiaId }: ProtocoloAnestesiaProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [protocoloId, setProtocoloId] = useState<string | null>(null);
  const [firmado, setFirmado] = useState(false);
  const [firmadoData, setFirmadoData] = useState<{ nombre: string; fecha: string } | null>(null);
  const [alergiasPaciente, setAlergiasPaciente] = useState<any[]>([]);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [internacionData, setInternacionData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [secciones, setSecciones] = useState<Record<string, boolean>>({
    identificacion: true,
    preanesia: true,
    tecnica: true,
    registro: true,
    balance: true,
    recuperacion: true,
  });
  const [signosVitales, setSignosVitales] = useState<SignoVitalRegistro[]>([]);
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [showFirmarModal, setShowFirmarModal] = useState(false);
  const [firmarNombre, setFirmarNombre] = useState("");
  const [firmarMatricula, setFirmarMatricula] = useState("");
  const autoSaveRef = useRef(false);

  const form = useForm<ProtocoloAnestesiaFormData>({
    resolver: zodResolver(protocoloAnestesiaSchema),
    defaultValues: {
      esEmergencia: false,
      checklistEquipoAnes: false,
      checklistReanimacion: false,
      checklistMonitores: false,
      checklistPosicion: false,
      tecnicaAnestesia: [],
      sondaNasogastrica: false,
      sondaVesical: false,
      estadoEgreso: [],
      premedicacion: [],
      modalidadVentFranja: [],
    },
  });

  const watchedValues = form.watch();
  const debouncedValues = useDebounce(watchedValues, 800);
  const debouncedFingerprint = useRef("");

  // Calcular minuto actual
  const minutoActual = React.useMemo(() => {
    if (!horaInicio) return 0;
    const diff = Date.now() - horaInicio.getTime();
    return Math.floor(diff / (1000 * 60));
  }, [horaInicio]);

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/historia-clinica/${internacionId}/protocolo-anestesia`);
        if (res.ok) {
          const data = await res.json();
          setPacienteData(data.paciente);
          setInternacionData(data.internacion);
          setAlergiasPaciente(data.paciente?.alergias || []);

          if (data.protocolo && data.protocolo.id) {
            const p = data.protocolo;
            setProtocoloId(p.id);
            setFirmado(p.firmado);
            if (p.firmado) {
              setFirmadoData({ nombre: p.nombreFirmante || "", fecha: p.firmadoEn || "" });
            }
            if (p.signosVitales && Array.isArray(p.signosVitales)) {
              setSignosVitales(p.signosVitales);
            }
            if (p.fechaCirugia) {
              setHoraInicio(new Date(p.fechaCirugia));
            }

            form.reset({
              anestesiologo: p.anestesiologo || "",
              matriculaAnestesiologo: p.matriculaAnestesiologo || "",
              cirujano: p.cirujano || "",
              matriculaCirujano: p.matriculaCirujano || "",
              ayudantes: p.ayudantes || "",
              fechaCirugia: p.fechaCirugia ? new Date(p.fechaCirugia).toISOString().slice(0, 16) : "",
              alergiaDetalle: p.alergiaDetalle || "",
              clasificacionASA: p.clasificacionASA || "",
              esEmergencia: p.esEmergencia || false,
              grupoSangre: p.grupoSangre || "",
              ayunoSolidos: p.ayunoSolidos ?? null,
              ayunoLiquidos: p.ayunoLiquidos ?? null,
              ultimaIngesta: p.ultimaIngesta || "",
              estadoPsiquico: p.estadoPsiquico || "",
              premedicacion: p.premedicacion || [],
              signosVitaPreop: p.signosVitaPreop || null,
              mallampati: p.mallampati || "",
              distTiromentoniana: p.distTiromentoniana ?? null,
              aperturaBucal: p.aperturaBucal ?? null,
              checklistEquipoAnes: p.checklistEquipoAnes || false,
              checklistReanimacion: p.checklistReanimacion || false,
              checklistMonitores: p.checklistMonitores || false,
              checklistPosicion: p.checklistPosicion || false,
              tecnicaAnestesia: p.tecnicaAnestesia || [],
              tipoConductiva: p.tipoConductiva || "",
              posicionPuncion: p.posicionPuncion || "",
              sitioPuncion: p.sitioPuncion || "",
              agujaDetalle: p.agujaDetalle || "",
              cateter: p.cateter ?? null,
              farmacoConductiva: p.farmacoConductiva || "",
              viaInduccion: p.viaInduccion || "",
              manejoViaAerea: p.manejoViaAerea || "",
              intubacionSubtipo: p.intubacionSubtipo || "",
              canulaFaringealTipo: p.canulaFaringealTipo || "",
              nroTubo: p.nroTubo || "",
              conManguito: p.conManguito ?? null,
              dificultadViaAerea: p.dificultadViaAerea ?? null,
              detalleViaAerea: p.detalleViaAerea || "",
              modalidadVentilatoria: p.modalidadVentilatoria || "",
              modalidadVentFranja: p.modalidadVentFranja || [],
              fio2: p.fio2 ?? null,
              oxigenoFlujo: p.oxigenoFlujo ?? null,
              peso: p.peso ?? null,
              talla: p.talla ?? null,
              liquidosIngresados: p.liquidosIngresados || [],
              diuresis: p.diuresis ?? null,
              perdidaSanguinea: p.perdidaSanguinea || "",
              perdidaSanguineaML: p.perdidaSanguineaML ?? null,
              otrosEgresos: p.otrosEgresos || "",
              posicionOperatoria: p.posicionOperatoria || "",
              sondaNasogastrica: p.sondaNasogastrica || false,
              sondaVesical: p.sondaVesical || false,
              tipoCirugia: p.tipoCirugia || "",
              observaciones: p.observaciones || "",
              estadoEgreso: p.estadoEgreso || [],
              destinoPaciente: p.destinoPaciente || "",
              aldreteActividad: p.aldreteActividad ?? null,
              aldreteRespiracion: p.aldreteRespiracion ?? null,
              aldreteCirculacion: p.aldreteCirculacion ?? null,
              aldreteConciencia: p.aldreteConciencia ?? null,
              aldreteSpo2: p.aldreteSpo2 ?? null,
              drogas: p.drogas || [],
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [internacionId]);

  // Auto-guardado con debounce
  useEffect(() => {
    if (loading || firmado || !protocoloId) return;
    const fingerprint = JSON.stringify(debouncedValues);
    if (fingerprint === debouncedFingerprint.current) return;
    if (autoSaveRef.current) return;

    autoSaveRef.current = true;
    setSaving(true);
    setSaveError(false);

    const save = async () => {
      try {
        const payload = {
          ...debouncedValues,
          signosVitales,
          drogas: debouncedValues.drogas || [],
          cirugiaId: cirugiaId || undefined,
        };
        const res = await fetch(`/api/historia-clinica/${internacionId}/protocolo-anestesia`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          debouncedFingerprint.current = fingerprint;
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } else if (res.status === 403) {
          setFirmado(true);
        } else {
          setSaveError(true);
        }
      } catch {
        setSaveError(true);
      } finally {
        setSaving(false);
        autoSaveRef.current = false;
      }
    };
    save();
  }, [debouncedValues, loading, firmado, protocoloId, internacionId, signosVitales, cirugiaId]);

  // Toggle sección
  const toggleSeccion = (key: string) => {
    setSecciones((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Guardar signos vitales
  const handleAddRegistro = useCallback((registro: SignoVitalRegistro) => {
    setSignosVitales((prev) => {
      const existing = prev.findIndex((s) => s.minuto === registro.minuto);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], ...registro };
        return updated;
      }
      return [...prev, registro].sort((a, b) => a.minuto - b.minuto);
    });
  }, []);

  const handleAddEvento = useCallback((minuto: number, evento: string) => {
    setSignosVitales((prev) => {
      const existing = prev.findIndex((s) => s.minuto === minuto);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          eventos: [...(updated[existing].eventos || []), evento],
        };
        return updated;
      }
      return [...prev, { minuto, eventos: [evento] }].sort((a, b) => a.minuto - b.minuto);
    });
  }, []);

  // Iniciar hora si no existe
  useEffect(() => {
    if (!horaInicio && !loading && protocoloId) {
      setHoraInicio(new Date());
      form.setValue("fechaCirugia", new Date().toISOString().slice(0, 16));
    }
  }, [horaInicio, loading, protocoloId, form]);

  // Firmar protocolo
  const handleFirmar = async () => {
    if (!firmarNombre.trim()) return;
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/protocolo-anestesia/firmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocoloId,
          nombreFirmante: firmarNombre,
          matriculaFirmante: firmarMatricula,
        }),
      });
      if (res.ok) {
        setFirmado(true);
        setFirmadoData({ nombre: firmarNombre, fecha: new Date().toISOString() });
        setShowFirmarModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Imprimir PDF
  const handlePrint = () => {
    window.open(`/api/pdf/protocolo-anestesia/${protocoloId}`, "_blank");
  };

  if (loading) {
    return <p className="text-muted text-sm">Cargando protocolo de anestesia...</p>;
  }

  const toggleTecnica = (val: string) => {
    const current = form.getValues("tecnicaAnestesia") || [];
    const updated = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
    form.setValue("tecnicaAnestesia", updated, { shouldDirty: true });
  };

  const toggleEgreso = (val: string) => {
    const current = form.getValues("estadoEgreso") || [];
    const updated = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
    form.setValue("estadoEgreso", updated, { shouldDirty: true });
  };

  const tecnicaConductiva = (form.watch("tecnicaAnestesia") || []).includes("conductiva");
  const tecnicaGeneral = (form.watch("tecnicaAnestesia") || []).includes("general");
  const manejoViaAerea = form.watch("manejoViaAerea");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-text transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-text">Protocolo de Anestesia</h2>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-muted flex items-center gap-1"><Clock size={12} /> Guardando…</span>}
          {saved && <span className="text-xs text-accent flex items-center gap-1"><CheckCircle size={12} /> Guardado</span>}
          {saveError && <span className="text-xs text-error flex items-center gap-1"><AlertCircle size={12} /> Error al guardar</span>}

          {firmado ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle size={12} /> Firmado {firmadoData?.nombre}
            </Badge>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={handlePrint} disabled={!protocoloId}>
                <Printer size={14} />
              </Button>
              <Button size="sm" onClick={() => setShowFirmarModal(true)} disabled={!protocoloId}>
                <PenLine size={14} /> Firmar
              </Button>
            </>
          )}
          {firmado && (
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer size={14} /> Imprimir
            </Button>
          )}
        </div>
      </div>

      {/* Banner firma */}
      {firmado && firmadoData && (
        <div className="rounded-lg border border-success/25 bg-success/5 p-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-success" />
          <span className="text-sm text-success">
            Protocolo firmado por {firmadoData.nombre} el {formatDateTime(firmadoData.fecha)}
          </span>
        </div>
      )}

      {/* Banner alergias */}
      {alergiasPaciente.length > 0 && !firmado && (
        <div className="rounded-lg border border-error/25 bg-error/5 p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-error mt-0.5 shrink-0" />
          <div>
            <span className="text-sm font-medium text-error">ALERTA: Alergias del paciente: </span>
            <span className="text-sm text-error">
              {alergiasPaciente.map((a: any) => a.sustancia).join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Datos paciente (solo lectura) */}
      {pacienteData && (
        <div className="card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted">Paciente:</span> <span className="text-text">{pacienteData.apellido}, {pacienteData.nombre}</span></div>
            <div><span className="text-muted">DNI:</span> <span className="text-text">{pacienteData.dni}</span></div>
            <div><span className="text-muted">Sexo:</span> <span className="text-text">{pacienteData.sexo}</span></div>
            <div><span className="text-muted">Nac.:</span> <span className="text-text">{new Date(pacienteData.fechaNac).toLocaleDateString("es-AR")}</span></div>
            <div><span className="text-muted">Grupo sanguíneo:</span> <span className="text-text font-medium">{pacienteData.grupoSangre || "—"}</span></div>
            {internacionData?.obraSocial && (
              <div><span className="text-muted">Obra Social:</span> <span className="text-text">{internacionData.obraSocial.nombre}</span></div>
            )}
            {internacionData?.cama && (
              <div><span className="text-muted">Cama:</span> <span className="text-text">{internacionData.cama.numero} - {internacionData.cama.sector?.nombre}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Secciones */}
      {SECCIONES.map((sec) => (
        <div key={sec.key} className="card overflow-hidden">
          <button
            onClick={() => toggleSeccion(sec.key)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-border/30 transition-colors"
          >
            <span className="text-sm font-medium text-accent uppercase tracking-wide">{sec.label}</span>
            {secciones[sec.key] ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
          </button>

          {secciones[sec.key] && (
            <div className="px-5 pb-5 space-y-4">

              {/* === SECCIÓN 1: Identificación === */}
              {sec.key === "identificacion" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input label="Anestesiólogo" {...form.register("anestesiologo")} disabled={firmado} />
                    <Input label="Matrícula Anestesiólogo" {...form.register("matriculaAnestesiologo")} disabled={firmado} />
                    <Input label="Cirujano Principal" {...form.register("cirujano")} disabled={firmado} />
                    <Input label="Matrícula Cirujano" {...form.register("matriculaCirujano")} disabled={firmado} />
                    <Input label="Ayudante(s)" {...form.register("ayudantes")} disabled={firmado} />
                    <Input label="Fecha Cirugía" type="datetime-local" {...form.register("fechaCirugia")} disabled={firmado} />
                    <Input label="Peso (kg)" type="number" step="0.1" {...form.register("peso", { valueAsNumber: true })} disabled={firmado} />
                    <Input label="Talla (cm)" type="number" step="0.1" {...form.register("talla", { valueAsNumber: true })} disabled={firmado} />
                  </div>
                </>
              )}

              {/* === SECCIÓN 2: Evaluación Preanestésica === */}
              {sec.key === "preanesia" && (
                <>
                  {/* Alergias */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-error">Alergias</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="radio" checked={form.watch("alergiaDetalle") !== "" && form.watch("alergiaDetalle") != null}
                          onChange={() => {}} disabled={firmado}
                          className="accent-red-400" /> SÍ
                      </label>
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="radio" checked={!form.watch("alergiaDetalle")}
                          onChange={() => form.setValue("alergiaDetalle", "", { shouldDirty: true })} disabled={firmado}
                          className="accent-red-400" /> NO
                      </label>
                    </div>
                    <textarea
                      {...form.register("alergiaDetalle")}
                      placeholder="Especificar alergias..."
                      rows={2}
                      disabled={firmado}
                      className="input-field min-h-[60px] resize-y"
                    />
                  </div>

                  {/* ASA */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted">Clasificación ASA</label>
                    <div className="flex flex-wrap gap-2">
                      {["I", "II", "III", "IV", "V", "VI"].map((asa) => (
                        <button
                          key={asa}
                          type="button"
                          disabled={firmado}
                          onClick={() => form.setValue("clasificacionASA", asa, { shouldDirty: true })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            form.watch("clasificacionASA") === asa
                              ? "bg-accent text-black"
                              : "bg-border text-text-secondary hover:bg-surface-active"
                          }`}
                        >
                          ASA {asa}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-text-secondary mt-2">
                      <input type="checkbox" {...form.register("esEmergencia")} disabled={firmado} className="accent-accent" />
                      (E) Emergencia
                    </label>
                  </div>

                  {/* Ayuno */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Último ayuno - Sólidos (horas)" type="number" min={0} {...form.register("ayunoSolidos", { valueAsNumber: true })} disabled={firmado} />
                    <Input label="Último ayuno - Líquidos (horas)" type="number" min={0} {...form.register("ayunoLiquidos", { valueAsNumber: true })} disabled={firmado} />
                  </div>

                  {/* Estado psíquico */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted">Estado psíquico preoperatorio</label>
                    <div className="flex flex-wrap gap-2">
                      {ESTADO_PSICOS.map((ep) => (
                        <button
                          key={ep}
                          type="button"
                          disabled={firmado}
                          onClick={() => form.setValue("estadoPsiquico", ep, { shouldDirty: true })}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            form.watch("estadoPsiquico") === ep
                              ? "bg-accent text-black"
                              : "bg-border text-text-secondary hover:bg-surface-active"
                          }`}
                        >
                          {ep}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vía aérea */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted uppercase tracking-wide">Evaluación de vía aérea</label>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted self-center">Mallampati:</span>
                      {MALLAMPATI.map((m) => (
                        <button
                          key={m}
                          type="button"
                          disabled={firmado}
                          onClick={() => form.setValue("mallampati", m, { shouldDirty: true })}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            form.watch("mallampati") === m
                              ? "bg-accent text-black"
                              : "bg-border text-text-secondary hover:bg-surface-active"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Dist. tiromentoniana (cm)" type="number" step="0.1" {...form.register("distTiromentoniana", { valueAsNumber: true })} disabled={firmado} />
                      <Input label="Apertura bucal (cm)" type="number" step="0.1" {...form.register("aperturaBucal", { valueAsNumber: true })} disabled={firmado} />
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted">Checklist de seguridad</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { name: "checklistEquipoAnes" as const, label: "Equipo de anestesia y gases verificado" },
                        { name: "checklistReanimacion" as const, label: "Equipo de reanimación y drogas críticas disponible" },
                        { name: "checklistMonitores" as const, label: "Monitores colocados y alarmas configuradas" },
                        { name: "checklistPosicion" as const, label: "Posición del paciente y zonas de compresión controladas" },
                      ].map((item) => (
                        <label key={item.name} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                          <input type="checkbox" {...form.register(item.name)} disabled={firmado} className="accent-accent" />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Premedicación */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm text-muted uppercase tracking-wide">Premedicación</label>
                      <Button type="button" variant="secondary" size="sm" disabled={firmado}
                        onClick={() => {
                          const prev = form.getValues("premedicacion") || [];
                          form.setValue("premedicacion", [...prev, { droga: "", dosis: "", via: "", hora: "" }], { shouldDirty: true });
                        }}>+ Agregar</Button>
                    </div>
                    {(form.watch("premedicacion") || []).length === 0 && (
                      <p className="text-xs text-muted italic">Sin premedicación registrada</p>
                    )}
                    {(form.watch("premedicacion") || []).map((_: PremedicacionItem, idx: number) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2 rounded bg-background border border-border/50 items-end">
                        <Input label="Droga" {...form.register(`premedicacion.${idx}.droga`)} disabled={firmado} />
                        <Input label="Dosis" {...form.register(`premedicacion.${idx}.dosis`)} disabled={firmado} />
                        <Input label="Vía" {...form.register(`premedicacion.${idx}.via`)} disabled={firmado} />
                        <div className="flex gap-2 items-end">
                          <Input label="Hora" type="time" {...form.register(`premedicacion.${idx}.hora`)} disabled={firmado} className="flex-1" />
                          <Button type="button" variant="danger" size="sm" disabled={firmado}
                            onClick={() => {
                              const prev = form.getValues("premedicacion") || [];
                              form.setValue("premedicacion", prev.filter((_: any, i: number) => i !== idx), { shouldDirty: true });
                            }}><Trash2 size={12} /></Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Signos vitales preoperatorios */}
                  <div className="space-y-3">
                    <label className="block text-sm text-muted uppercase tracking-wide">Signos Vitales Preoperatorios (baseline)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <Input label="PAS (mmHg)" type="number" min={0} {...form.register("signosVitaPreop.pas", { valueAsNumber: true })} disabled={firmado} />
                      <Input label="PAD (mmHg)" type="number" min={0} {...form.register("signosVitaPreop.pad", { valueAsNumber: true })} disabled={firmado} />
                      <Input label="FC (lpm)" type="number" min={0} {...form.register("signosVitaPreop.fc", { valueAsNumber: true })} disabled={firmado} />
                      <Input label="FR (rpm)" type="number" min={0} {...form.register("signosVitaPreop.fr", { valueAsNumber: true })} disabled={firmado} />
                      <Input label="Temp (°C)" type="number" min={0} step={0.1} {...form.register("signosVitaPreop.temp", { valueAsNumber: true })} disabled={firmado} />
                    </div>
                  </div>
                </>
              )}

              {/* === SECCIÓN 3: Técnica Anestésica === */}
              {sec.key === "tecnica" && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm text-muted">Técnica anestésica</label>
                    <div className="flex gap-3">
                      {["conductiva", "general"].map((t) => (
                        <label key={t} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(form.watch("tecnicaAnestesia") || []).includes(t)}
                            onChange={() => toggleTecnica(t)}
                            disabled={firmado}
                            className="accent-accent"
                          />
                          {t === "conductiva" ? "Conductiva/Regional" : "General"}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Conductiva */}
                  {tecnicaConductiva && (
                    <div className="space-y-3 p-3 rounded-lg bg-background border border-border/50">
                      <h4 className="text-sm font-medium text-text-secondary">Anestesia Conductiva/Regional</h4>
                      <div className="space-y-2">
                        <label className="block text-xs text-muted">Tipo</label>
                        <div className="flex flex-wrap gap-2">
                          {TIPOS_CONDUCTIVA.map((tc) => (
                            <button key={tc} type="button" disabled={firmado}
                              onClick={() => form.setValue("tipoConductiva", tc, { shouldDirty: true })}
                              className={`px-3 py-1 rounded-lg text-xs ${
                                form.watch("tipoConductiva") === tc
                                  ? "bg-accent text-black"
                                  : "bg-border text-text-secondary hover:bg-surface-active"
                              }`}>{tc}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="Posición durante punción" {...form.register("posicionPuncion")} disabled={firmado} />
                        <Input label="Sitio de punción" {...form.register("sitioPuncion")} disabled={firmado} />
                        <Input label="Tipo y calibre de aguja" {...form.register("agujaDetalle")} disabled={firmado} />
                        <Input label="Fármaco y dosis" {...form.register("farmacoConductiva")} disabled={firmado} />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="checkbox" {...form.register("cateter")} disabled={firmado} className="accent-accent" />
                        Catéter
                      </label>
                    </div>
                  )}

                  {/* General */}
                  {tecnicaGeneral && (
                    <div className="space-y-3 p-3 rounded-lg bg-background border border-border/50">
                      <h4 className="text-sm font-medium text-text-secondary">Anestesia General</h4>
                      <div className="space-y-2">
                        <label className="block text-xs text-muted">Vía de inducción</label>
                        <div className="flex gap-3">
                          {["Inhalatoria", "Endovenosa"].map((v) => (
                            <button key={v} type="button" disabled={firmado}
                              onClick={() => form.setValue("viaInduccion", v, { shouldDirty: true })}
                              className={`px-3 py-1 rounded-lg text-xs ${
                                form.watch("viaInduccion") === v
                                  ? "bg-accent text-black"
                                  : "bg-border text-text-secondary hover:bg-surface-active"
                              }`}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs text-muted">Manejo de vía aérea</label>
                        <div className="flex flex-wrap gap-2">
                          {VIA_AEREA.map((va) => (
                            <button key={va} type="button" disabled={firmado}
                              onClick={() => form.setValue("manejoViaAerea", va, { shouldDirty: true })}
                              className={`px-3 py-1 rounded-lg text-xs ${
                                form.watch("manejoViaAerea") === va
                                  ? "bg-accent text-black"
                                  : "bg-border text-text-secondary hover:bg-surface-active"
                              }`}>{va}</button>
                          ))}
                        </div>
                      </div>
                      {manejoViaAerea === "Intubación traqueal" && (
                        <div className="space-y-2">
                          <label className="block text-xs text-muted">Subtipo de intubación</label>
                          <div className="flex flex-wrap gap-2">
                            {INTUBACION_SUBTIPO.map((ist) => (
                              <button key={ist} type="button" disabled={firmado}
                                onClick={() => form.setValue("intubacionSubtipo", ist, { shouldDirty: true })}
                                className={`px-3 py-1 rounded-lg text-xs ${
                                  form.watch("intubacionSubtipo") === ist
                                    ? "bg-accent text-black"
                                    : "bg-border text-text-secondary hover:bg-surface-active"
                                }`}>{ist}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {(manejoViaAerea === "Máscara laríngea" || manejoViaAerea === "Cánula faríngea") && (
                        <div className="space-y-2">
                          <label className="block text-xs text-muted">Tipo de cánula</label>
                          <div className="flex flex-wrap gap-2">
                            {CANULA_FARINGEAL.map((cf) => (
                              <button key={cf} type="button" disabled={firmado}
                                onClick={() => form.setValue("canulaFaringealTipo", cf, { shouldDirty: true })}
                                className={`px-3 py-1 rounded-lg text-xs ${
                                  form.watch("canulaFaringealTipo") === cf
                                    ? "bg-accent text-black"
                                    : "bg-border text-text-secondary hover:bg-surface-active"
                                }`}>{cf}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="N° tubo" {...form.register("nroTubo")} disabled={firmado} />
                        <div className="flex items-end gap-4">
                          <label className="flex items-center gap-2 text-sm text-text-secondary pb-2">
                            <input type="checkbox" {...form.register("conManguito")} disabled={firmado} className="accent-accent" />
                            Con manguito
                          </label>
                          <label className="flex items-center gap-2 text-sm text-text-secondary pb-2">
                            <input type="checkbox" {...form.register("dificultadViaAerea")} disabled={firmado} className="accent-red-400" />
                            Dificultad vía aérea
                          </label>
                        </div>
                      </div>
                      {form.watch("dificultadViaAerea") && (
                        <Input label="Detalle dificultad vía aérea" {...form.register("detalleViaAerea")} disabled={firmado} />
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs text-muted">Modalidad ventilatoria</label>
                          <div className="flex flex-wrap gap-2">
                            {MODALIDAD_VENT.map((mv) => (
                              <button key={mv} type="button" disabled={firmado}
                                onClick={() => form.setValue("modalidadVentilatoria", mv, { shouldDirty: true })}
                                className={`px-3 py-1 rounded-lg text-xs ${
                                  form.watch("modalidadVentilatoria") === mv
                                    ? "bg-accent text-black"
                                    : "bg-border text-text-secondary hover:bg-surface-active"
                                }`}>{mv}</button>
                            ))}
                          </div>
                        </div>
                        <Input label="FiO₂ administrada (%)" type="number" min={0} max={100} step={1} {...form.register("fio2", { valueAsNumber: true })} disabled={firmado} />
                        <Input label="Oxígeno flujo (L/min)" type="number" min={0} step={0.5} {...form.register("oxigenoFlujo", { valueAsNumber: true })} disabled={firmado} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* === SECCIÓN 4: Registro Intraoperatorio === */}
              {sec.key === "registro" && (
                <GraficoSignosVitales
                  signosVitales={signosVitales}
                  minutoActual={minutoActual}
                  onAddRegistro={handleAddRegistro}
                  onAddEvento={handleAddEvento}
                  readOnly={firmado}
                />
              )}

              {/* === SECCIÓN 5: Balance de Líquidos === */}
              {sec.key === "balance" && (
                <>
                  {/* Fluidos */}
                  <BalanceLiquidos control={form.control} register={form.register} disabled={firmado} />

                  {/* Egresos */}
                  <div className="space-y-3">
                    <label className="block text-sm text-muted uppercase tracking-wide">Egresos</label>
                    <Input label="Diuresis intraoperatoria (ml)" type="number" min={0} {...form.register("diuresis", { valueAsNumber: true })} disabled={firmado} />
                    <div className="space-y-2">
                      <label className="block text-xs text-muted">Pérdida sanguínea estimada</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { val: "no_significativa", label: "No significativa" },
                          { val: "leve", label: "Leve (<500ml)" },
                          { val: "moderada", label: "Moderada (500–1000ml)" },
                          { val: "grave", label: "Grave (>1000ml)" },
                        ].map((opt) => (
                          <button key={opt.val} type="button" disabled={firmado}
                            onClick={() => form.setValue("perdidaSanguinea", opt.val, { shouldDirty: true })}
                            className={`px-3 py-1 rounded-lg text-xs ${
                              form.watch("perdidaSanguinea") === opt.val
                                ? "bg-accent text-black"
                                : "bg-border text-text-secondary hover:bg-surface-active"
                            }`}>{opt.label}</button>
                        ))}
                      </div>
                      {(form.watch("perdidaSanguinea") === "leve" || form.watch("perdidaSanguinea") === "moderada" || form.watch("perdidaSanguinea") === "grave") && (
                        <Input label="Volumen estimado (ml)" type="number" min={0} {...form.register("perdidaSanguineaML", { valueAsNumber: true })} disabled={firmado} />
                      )}
                    </div>
                    <Input label="Otros egresos" {...form.register("otrosEgresos")} disabled={firmado} />
                  </div>

                  {/* Posición y sondas */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="block text-xs text-muted">Posición operatoria</label>
                      <div className="flex flex-wrap gap-2">
                        {POSICIONES.map((p) => (
                          <button key={p} type="button" disabled={firmado}
                            onClick={() => form.setValue("posicionOperatoria", p, { shouldDirty: true })}
                            className={`px-3 py-1 rounded-lg text-xs ${
                              form.watch("posicionOperatoria") === p
                                ? "bg-accent text-black"
                                : "bg-border text-text-secondary hover:bg-surface-active"
                            }`}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="checkbox" {...form.register("sondaNasogastrica")} disabled={firmado} className="accent-accent" />
                        Sonda nasogástrica
                      </label>
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="checkbox" {...form.register("sondaVesical")} disabled={firmado} className="accent-accent" />
                        Sonda vesical
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" disabled={firmado}
                        onClick={() => form.setValue("tipoCirugia", "programada", { shouldDirty: true })}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          form.watch("tipoCirugia") === "programada"
                            ? "bg-accent text-black"
                            : "bg-border text-text-secondary hover:bg-surface-active"
                        }`}>Programada</button>
                      <button type="button" disabled={firmado}
                        onClick={() => form.setValue("tipoCirugia", "urgencia", { shouldDirty: true })}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          form.watch("tipoCirugia") === "urgencia"
                            ? "bg-error text-black"
                            : "bg-border text-text-secondary hover:bg-surface-active"
                        }`}>Urgencia</button>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="space-y-1">
                    <label className="block text-sm text-muted">Observaciones / Complicaciones</label>
                    <textarea
                      {...form.register("observaciones")}
                      rows={4}
                      disabled={firmado}
                      className="input-field min-h-[100px] resize-y"
                      placeholder="Observaciones y complicaciones..."
                    />
                  </div>
                </>
              )}

              {/* === SECCIÓN 6: Recuperación y Firma === */}
              {sec.key === "recuperacion" && (
                <>
                  {/* Estado egreso */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted">Estado al egreso de quirófano</label>
                    <div className="flex flex-wrap gap-3">
                      {EGRESO_CHECKBOXES.map((eg) => (
                        <label key={eg} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(form.watch("estadoEgreso") || []).includes(eg)}
                            onChange={() => toggleEgreso(eg)}
                            disabled={firmado}
                            className="accent-accent"
                          />
                          {eg}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Destino */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted">Destino del paciente</label>
                    <div className="flex flex-wrap gap-2">
                      {DESTINOS.map((d) => (
                        <button key={d} type="button" disabled={firmado}
                          onClick={() => form.setValue("destinoPaciente", d, { shouldDirty: true })}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            form.watch("destinoPaciente") === d
                              ? "bg-accent text-black"
                              : "bg-border text-text-secondary hover:bg-surface-active"
                          }`}>{d}</button>
                      ))}
                    </div>
                  </div>

                  {/* Aldrete */}
                  <EscalaAldrete control={form.control} readOnly={firmado} />

                  {/* Drogas */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted uppercase tracking-wide">Medicación administrada</label>
                    <PanelDrogas control={form.control} readOnly={firmado} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Modal firmar */}
      {showFirmarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-medium text-text">Firmar Protocolo</h3>
            <Input label="Nombre y apellido del anestesiólogo" value={firmarNombre} onChange={(e) => setFirmarNombre(e.target.value)} />
            <Input label="Matrícula" value={firmarMatricula} onChange={(e) => setFirmarMatricula(e.target.value)} />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowFirmarModal(false)}>Cancelar</Button>
              <Button onClick={handleFirmar} disabled={!firmarNombre.trim()}>
                <PenLine size={14} /> Firmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-componente de balance de líquidos inline
function BalanceLiquidos({ control, register, disabled }: { control: any; register: any; disabled: boolean }) {
  const [liquidos, setLiquidos] = useState<{ tipo: string; volumen: number; lote?: string }[]>([
    { tipo: "Solución Fisiológica (NaCl 0.9%)", volumen: 0 },
    { tipo: "Ringer Lactato", volumen: 0 },
    { tipo: "Coloide", volumen: 0 },
    { tipo: "Sangre/glóbulos rojos", volumen: 0, lote: "" },
    { tipo: "Plasma", volumen: 0, lote: "" },
    { tipo: "Plaquetas", volumen: 0, lote: "" },
    { tipo: "Otro", volumen: 0 },
  ]);

  const handleChange = (idx: number, field: string, value: any) => {
    setLiquidos((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = field === "volumen" ? (parseFloat(value) || 0) : value;
      return updated;
    });
  };

  const totalIngresos = liquidos.reduce((sum, l) => sum + (l.volumen || 0), 0);

  return (
    <div className="space-y-2">
      <label className="block text-sm text-muted uppercase tracking-wide">Ingresos</label>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 px-2 text-left text-muted font-medium">Tipo de fluido</th>
              <th className="py-2 px-2 text-right text-muted font-medium w-28">Volumen (ml)</th>
              <th className="py-2 px-2 text-left text-muted font-medium w-32">N° Unidad/Lote</th>
            </tr>
          </thead>
          <tbody>
            {liquidos.map((l, idx) => (
              <tr key={idx} className="border-b border-border/50">
                <td className="py-1.5 px-2 text-text text-xs">{l.tipo}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min={0}
                    value={l.volumen || ""}
                    onChange={(e) => handleChange(idx, "volumen", e.target.value)}
                    disabled={disabled}
                    className="w-full text-right rounded border border-border bg-background px-2 py-1 text-xs text-text focus:outline-none focus:border-accent"
                  />
                </td>
                <td className="py-1.5 px-2">
                  {l.lote !== undefined ? (
                    <input
                      type="text"
                      value={l.lote}
                      onChange={(e) => handleChange(idx, "lote", e.target.value)}
                      disabled={disabled}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text focus:outline-none focus:border-accent"
                    />
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-1.5 px-2 text-accent">TOTAL</td>
              <td className="py-1.5 px-2 text-right text-accent">{totalIngresos} ml</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { ProtocoloAnestesiaComponent, type ProtocoloAnestesiaProps };
