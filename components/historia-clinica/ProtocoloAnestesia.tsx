"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Save, CheckCircle, AlertCircle, ChevronDown, ChevronRight,
  Printer, PenLine, AlertTriangle, Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { protocoloAnestesiaSchema } from "@/lib/validations/protocolo-anestesia";
import type { ProtocoloAnestesiaFormData } from "@/lib/validations/protocolo-anestesia";
import type { SignoVitalRegistro } from "@/types";
import { EscalaAldrete } from "./anestesia/EscalaAldrete";
import { PanelDrogas } from "./anestesia/PanelDrogas";
import { GraficoSignosVitales } from "./anestesia/GraficoSignosVitales";

interface ProtocoloAnestesiaProps {
  internacionId: string;
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
const MODALIDAD_VENT = ["Espontánea", "Asistida", "Controlada", "Mecánica", "Manual"];
const POSICIONES = ["Supino", "Prono", "Lateral derecho", "Lateral izquierdo", "Litotomía", "Trendelenburg", "Anti-Trendelenburg", "Sentado", "Otro"];
const DESTINOS = ["URPA", "Internación general", "UTI", "Ambulatorio"];
const EGRESO_CHECKBOXES = ["Consciente", "Ventilando espontáneamente", "Intubado", "Vigil", "Excitable"];

function ProtocoloAnestesiaComponent({ internacionId }: ProtocoloAnestesiaProps) {
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
              ayunoSolidos: p.ayunoSolidos ?? null,
              ayunoLiquidos: p.ayunoLiquidos ?? null,
              estadoPsiquico: p.estadoPsiquico || "",
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
              nroTubo: p.nroTubo || "",
              conManguito: p.conManguito ?? null,
              dificultadViaAerea: p.dificultadViaAerea ?? null,
              detalleViaAerea: p.detalleViaAerea || "",
              modalidadVentilatoria: p.modalidadVentilatoria || "",
              fio2: p.fio2 ?? null,
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
  }, [debouncedValues, loading, firmado, protocoloId, internacionId, signosVitales]);

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
    return <p className="text-gray-500 text-sm">Cargando protocolo de anestesia...</p>;
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-white">Protocolo de Anestesia</h2>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> Guardando…</span>}
          {saved && <span className="text-xs text-[#00d4a1] flex items-center gap-1"><CheckCircle size={12} /> Guardado</span>}
          {saveError && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> Error al guardar</span>}

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
        <div className="rounded-lg border border-green-400/25 bg-green-400/5 p-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-400" />
          <span className="text-sm text-green-400">
            Protocolo firmado por {firmadoData.nombre} el {formatDateTime(firmadoData.fecha)}
          </span>
        </div>
      )}

      {/* Banner alergias */}
      {alergiasPaciente.length > 0 && !firmado && (
        <div className="rounded-lg border border-red-400/25 bg-red-400/5 p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-sm font-medium text-red-400">ALERTA: Alergias del paciente: </span>
            <span className="text-sm text-red-300">
              {alergiasPaciente.map((a: any) => a.sustancia).join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Datos paciente (solo lectura) */}
      {pacienteData && (
        <div className="card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Paciente:</span> <span className="text-gray-200">{pacienteData.apellido}, {pacienteData.nombre}</span></div>
            <div><span className="text-gray-500">DNI:</span> <span className="text-gray-200">{pacienteData.dni}</span></div>
            <div><span className="text-gray-500">Sexo:</span> <span className="text-gray-200">{pacienteData.sexo}</span></div>
            <div><span className="text-gray-500">Nac.:</span> <span className="text-gray-200">{new Date(pacienteData.fechaNac).toLocaleDateString("es-AR")}</span></div>
            {internacionData?.obraSocial && (
              <div><span className="text-gray-500">Obra Social:</span> <span className="text-gray-200">{internacionData.obraSocial.nombre}</span></div>
            )}
            {internacionData?.cama && (
              <div><span className="text-gray-500">Cama:</span> <span className="text-gray-200">{internacionData.cama.numero} - {internacionData.cama.sector?.nombre}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Secciones */}
      {SECCIONES.map((sec) => (
        <div key={sec.key} className="card overflow-hidden">
          <button
            onClick={() => toggleSeccion(sec.key)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-[#1e2535]/30 transition-colors"
          >
            <span className="text-sm font-medium text-[#00d4a1] uppercase tracking-wide">{sec.label}</span>
            {secciones[sec.key] ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
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
                    <label className="block text-sm font-medium text-red-400">Alergias</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input type="radio" checked={form.watch("alergiaDetalle") !== "" && form.watch("alergiaDetalle") != null}
                          onChange={() => {}} disabled={firmado}
                          className="accent-red-400" /> SÍ
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300">
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
                    <label className="block text-sm text-gray-400">Clasificación ASA</label>
                    <div className="flex flex-wrap gap-2">
                      {["I", "II", "III", "IV", "V", "VI"].map((asa) => (
                        <button
                          key={asa}
                          type="button"
                          disabled={firmado}
                          onClick={() => form.setValue("clasificacionASA", asa, { shouldDirty: true })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            form.watch("clasificacionASA") === asa
                              ? "bg-[#00d4a1] text-black"
                              : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                          }`}
                        >
                          ASA {asa}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-300 mt-2">
                      <input type="checkbox" {...form.register("esEmergencia")} disabled={firmado} className="accent-[#00d4a1]" />
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
                    <label className="block text-sm text-gray-400">Estado psíquico preoperatorio</label>
                    <div className="flex flex-wrap gap-2">
                      {ESTADO_PSICOS.map((ep) => (
                        <button
                          key={ep}
                          type="button"
                          disabled={firmado}
                          onClick={() => form.setValue("estadoPsiquico", ep, { shouldDirty: true })}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            form.watch("estadoPsiquico") === ep
                              ? "bg-[#00d4a1] text-black"
                              : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                          }`}
                        >
                          {ep}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vía aérea */}
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-400 uppercase tracking-wide">Evaluación de vía aérea</label>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 self-center">Mallampati:</span>
                      {MALLAMPATI.map((m) => (
                        <button
                          key={m}
                          type="button"
                          disabled={firmado}
                          onClick={() => form.setValue("mallampati", m, { shouldDirty: true })}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            form.watch("mallampati") === m
                              ? "bg-[#00d4a1] text-black"
                              : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
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
                    <label className="block text-sm text-gray-400">Checklist de seguridad</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { name: "checklistEquipoAnes" as const, label: "Equipo de anestesia y gases verificado" },
                        { name: "checklistReanimacion" as const, label: "Equipo de reanimación y drogas críticas disponible" },
                        { name: "checklistMonitores" as const, label: "Monitores colocados y alarmas configuradas" },
                        { name: "checklistPosicion" as const, label: "Posición del paciente y zonas de compresión controladas" },
                      ].map((item) => (
                        <label key={item.name} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input type="checkbox" {...form.register(item.name)} disabled={firmado} className="accent-[#00d4a1]" />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* === SECCIÓN 3: Técnica Anestésica === */}
              {sec.key === "tecnica" && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-400">Técnica anestésica</label>
                    <div className="flex gap-3">
                      {["conductiva", "general"].map((t) => (
                        <label key={t} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(form.watch("tecnicaAnestesia") || []).includes(t)}
                            onChange={() => toggleTecnica(t)}
                            disabled={firmado}
                            className="accent-[#00d4a1]"
                          />
                          {t === "conductiva" ? "Conductiva/Regional" : "General"}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Conductiva */}
                  {tecnicaConductiva && (
                    <div className="space-y-3 p-3 rounded-lg bg-[#0f1117] border border-[#1e2535]/50">
                      <h4 className="text-sm font-medium text-gray-300">Anestesia Conductiva/Regional</h4>
                      <div className="space-y-2">
                        <label className="block text-xs text-gray-500">Tipo</label>
                        <div className="flex flex-wrap gap-2">
                          {TIPOS_CONDUCTIVA.map((tc) => (
                            <button key={tc} type="button" disabled={firmado}
                              onClick={() => form.setValue("tipoConductiva", tc, { shouldDirty: true })}
                              className={`px-3 py-1 rounded-lg text-xs ${
                                form.watch("tipoConductiva") === tc
                                  ? "bg-[#00d4a1] text-black"
                                  : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
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
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input type="checkbox" {...form.register("cateter")} disabled={firmado} className="accent-[#00d4a1]" />
                        Catéter
                      </label>
                    </div>
                  )}

                  {/* General */}
                  {tecnicaGeneral && (
                    <div className="space-y-3 p-3 rounded-lg bg-[#0f1117] border border-[#1e2535]/50">
                      <h4 className="text-sm font-medium text-gray-300">Anestesia General</h4>
                      <div className="space-y-2">
                        <label className="block text-xs text-gray-500">Vía de inducción</label>
                        <div className="flex gap-3">
                          {["Inhalatoria", "Endovenosa"].map((v) => (
                            <button key={v} type="button" disabled={firmado}
                              onClick={() => form.setValue("viaInduccion", v, { shouldDirty: true })}
                              className={`px-3 py-1 rounded-lg text-xs ${
                                form.watch("viaInduccion") === v
                                  ? "bg-[#00d4a1] text-black"
                                  : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                              }`}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs text-gray-500">Manejo de vía aérea</label>
                        <div className="flex flex-wrap gap-2">
                          {VIA_AEREA.map((va) => (
                            <button key={va} type="button" disabled={firmado}
                              onClick={() => form.setValue("manejoViaAerea", va, { shouldDirty: true })}
                              className={`px-3 py-1 rounded-lg text-xs ${
                                form.watch("manejoViaAerea") === va
                                  ? "bg-[#00d4a1] text-black"
                                  : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                              }`}>{va}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="N° tubo" {...form.register("nroTubo")} disabled={firmado} />
                        <div className="flex items-end gap-4">
                          <label className="flex items-center gap-2 text-sm text-gray-300 pb-2">
                            <input type="checkbox" {...form.register("conManguito")} disabled={firmado} className="accent-[#00d4a1]" />
                            Con manguito
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-300 pb-2">
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
                          <label className="block text-xs text-gray-500">Modalidad ventilatoria</label>
                          <div className="flex flex-wrap gap-2">
                            {MODALIDAD_VENT.map((mv) => (
                              <button key={mv} type="button" disabled={firmado}
                                onClick={() => form.setValue("modalidadVentilatoria", mv, { shouldDirty: true })}
                                className={`px-3 py-1 rounded-lg text-xs ${
                                  form.watch("modalidadVentilatoria") === mv
                                    ? "bg-[#00d4a1] text-black"
                                    : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                                }`}>{mv}</button>
                            ))}
                          </div>
                        </div>
                        <Input label="FiO₂ administrada (%)" type="number" min={0} max={100} step={1} {...form.register("fio2", { valueAsNumber: true })} disabled={firmado} />
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
                    <label className="block text-sm text-gray-400 uppercase tracking-wide">Egresos</label>
                    <Input label="Diuresis intraoperatoria (ml)" type="number" min={0} {...form.register("diuresis", { valueAsNumber: true })} disabled={firmado} />
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-500">Pérdida sanguínea estimada</label>
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
                                ? "bg-[#00d4a1] text-black"
                                : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
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
                      <label className="block text-xs text-gray-500">Posición operatoria</label>
                      <div className="flex flex-wrap gap-2">
                        {POSICIONES.map((p) => (
                          <button key={p} type="button" disabled={firmado}
                            onClick={() => form.setValue("posicionOperatoria", p, { shouldDirty: true })}
                            className={`px-3 py-1 rounded-lg text-xs ${
                              form.watch("posicionOperatoria") === p
                                ? "bg-[#00d4a1] text-black"
                                : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                            }`}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input type="checkbox" {...form.register("sondaNasogastrica")} disabled={firmado} className="accent-[#00d4a1]" />
                        Sonda nasogástrica
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input type="checkbox" {...form.register("sondaVesical")} disabled={firmado} className="accent-[#00d4a1]" />
                        Sonda vesical
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" disabled={firmado}
                        onClick={() => form.setValue("tipoCirugia", "programada", { shouldDirty: true })}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          form.watch("tipoCirugia") === "programada"
                            ? "bg-[#00d4a1] text-black"
                            : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                        }`}>Programada</button>
                      <button type="button" disabled={firmado}
                        onClick={() => form.setValue("tipoCirugia", "urgencia", { shouldDirty: true })}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          form.watch("tipoCirugia") === "urgencia"
                            ? "bg-red-400 text-black"
                            : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                        }`}>Urgencia</button>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="space-y-1">
                    <label className="block text-sm text-gray-400">Observaciones / Complicaciones</label>
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
                    <label className="block text-sm text-gray-400">Estado al egreso de quirófano</label>
                    <div className="flex flex-wrap gap-3">
                      {EGRESO_CHECKBOXES.map((eg) => (
                        <label key={eg} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(form.watch("estadoEgreso") || []).includes(eg)}
                            onChange={() => toggleEgreso(eg)}
                            disabled={firmado}
                            className="accent-[#00d4a1]"
                          />
                          {eg}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Destino */}
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-400">Destino del paciente</label>
                    <div className="flex flex-wrap gap-2">
                      {DESTINOS.map((d) => (
                        <button key={d} type="button" disabled={firmado}
                          onClick={() => form.setValue("destinoPaciente", d, { shouldDirty: true })}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            form.watch("destinoPaciente") === d
                              ? "bg-[#00d4a1] text-black"
                              : "bg-[#1e2535] text-gray-300 hover:bg-[#263040]"
                          }`}>{d}</button>
                      ))}
                    </div>
                  </div>

                  {/* Aldrete */}
                  <EscalaAldrete control={form.control} readOnly={firmado} />

                  {/* Drogas */}
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-400 uppercase tracking-wide">Medicación administrada</label>
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
            <h3 className="text-lg font-medium text-white">Firmar Protocolo</h3>
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
      <label className="block text-sm text-gray-400 uppercase tracking-wide">Ingresos</label>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2535]">
              <th className="py-2 px-2 text-left text-gray-400 font-medium">Tipo de fluido</th>
              <th className="py-2 px-2 text-right text-gray-400 font-medium w-28">Volumen (ml)</th>
              <th className="py-2 px-2 text-left text-gray-400 font-medium w-32">N° Unidad/Lote</th>
            </tr>
          </thead>
          <tbody>
            {liquidos.map((l, idx) => (
              <tr key={idx} className="border-b border-[#1e2535]/50">
                <td className="py-1.5 px-2 text-gray-200 text-xs">{l.tipo}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min={0}
                    value={l.volumen || ""}
                    onChange={(e) => handleChange(idx, "volumen", e.target.value)}
                    disabled={disabled}
                    className="w-full text-right rounded border border-[#1e2535] bg-[#0f1117] px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#00d4a1]"
                  />
                </td>
                <td className="py-1.5 px-2">
                  {l.lote !== undefined ? (
                    <input
                      type="text"
                      value={l.lote}
                      onChange={(e) => handleChange(idx, "lote", e.target.value)}
                      disabled={disabled}
                      className="w-full rounded border border-[#1e2535] bg-[#0f1117] px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#00d4a1]"
                    />
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-1.5 px-2 text-[#00d4a1]">TOTAL</td>
              <td className="py-1.5 px-2 text-right text-[#00d4a1]">{totalIngresos} ml</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { ProtocoloAnestesiaComponent, type ProtocoloAnestesiaProps };
