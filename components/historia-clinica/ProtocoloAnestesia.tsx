"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {ArrowLeft, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Printer, PenLine, AlertTriangle, Clock, Trash2} from "lucide-react";



import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { protocoloAnestesiaSchema } from "@/lib/validations/protocolo-anestesia";
import type { ProtocoloAnestesiaFormData } from "@/lib/validations/protocolo-anestesia";
import type { SignoVitalRegistro, BoloRegistro, InfusionRegistro, PremedicacionItem, AlergiaData, PacienteData, InternacionData } from "@/types";
import { EscalaAldrete } from "./anestesia/EscalaAldrete";
import { PanelDrogas } from "./anestesia/PanelDrogas";
import { GraficoSignosVitales } from "./anestesia/GraficoSignosVitales";
import { useToast } from "@/components/ui/Toast";

interface ProtocoloAnestesiaProps {
  internacionId: string;
  cirugiaId?: string;
}

function onlyArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Object.keys(value).length > 0) return [value as T];
  return fallback;
}

function normalizeAperturaBucal(value: unknown): "+3" | "-3" | null {
  if (typeof value === "number" && Number.isFinite(value)) return value >= 3 ? "+3" : "-3";
  if (typeof value === "string" && (value === "+3" || value === "-3")) return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const num = parseFloat(value.trim());
    return num >= 3 ? "+3" : "-3";
  }
  return null;
}

function calcularIMCCliente(peso?: number | null, talla?: number | null): number | null {
  if (!peso || !talla || peso <= 0 || talla <= 0) return null;
  const tallaMetros = talla >= 3 ? talla / 100 : talla;
  const imc = peso / (tallaMetros * tallaMetros);
  if (!Number.isFinite(imc) || imc <= 0) return null;
  return Math.round(imc * 10) / 10;
}

function normalizeSignosVitaPreop(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const aliases: Record<string, string> = { PA: "pas", PAD: "pad", FC: "fc", FR: "fr", T: "temp", "T°": "temp" };
  const out: Record<string, number> = {};
  for (const [k, raw] of Object.entries(obj)) {
    const key = aliases[k] ?? k;
    if (key === "spo2" || key === "SpO2") continue;
    if (typeof raw === "string" && (key === "pas" || k === "PA") && raw.includes("/")) {
      const [s, d] = raw.split("/").map((x) => parseFloat(x.replace(",", ".")));
      if (!Number.isNaN(s)) out["pas"] = s;
      if (!Number.isNaN(d)) out["pad"] = d;
      continue;
    }
    const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", ".").replace("%", ""));
    if (!Number.isNaN(num) && ["pas", "pad", "fc", "fr", "temp"].includes(key)) out[key] = num;
  }
  return Object.keys(out).length ? out : null;
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
  const [alergiasPaciente, setAlergiasPaciente] = useState<AlergiaData[]>([]);
  const [pacienteData, setPacienteData] = useState<PacienteData | null>(null);
  const [internacionData, setInternacionData] = useState<InternacionData | null>(null);
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
  const anestesiologoAsignadoRef = useRef("");
  const { toast } = useToast();
  const signosVitalesRef = useRef<SignoVitalRegistro[]>([]);
  const savingSignosRef = useRef(false);
  const pendingSignosRef = useRef<SignoVitalRegistro[] | null>(null);

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
      preoxigenacion: false,
      intubacion: false,
      entubacionEsofagica: false,
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
              signosVitalesRef.current = p.signosVitales;
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
              antecedentesImportancia: p.antecedentesImportancia || "",
              clasificacionASA: p.clasificacionASA || "",
              esEmergencia: p.esEmergencia || false,
              grupoSangre: p.grupoSangre || "",
              ayunoSolidos: p.ayunoSolidos ?? null,
              ayunoLiquidos: p.ayunoLiquidos ?? null,
              ultimaIngesta: p.ultimaIngesta || "",
              estadoPsiquico: p.estadoPsiquico || "",
              premedicacion: onlyArray<PremedicacionItem>(p.premedicacion),
              preoxigenacion: p.preoxigenacion || false,
              preoxigenacionDetalle: p.preoxigenacionDetalle || "",
              signosVitaPreop: normalizeSignosVitaPreop(p.signosVitaPreop),
              mallampati: p.mallampati || "",
              distTiromentoniana: p.distTiromentoniana ?? null,
              aperturaBucal: normalizeAperturaBucal(p.aperturaBucal),
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
              intubacion: p.intubacion || false,
              intubacionSubtipo: p.intubacionSubtipo || "",
              entubacionEsofagica: p.entubacionEsofagica || false,
              canulaFaringealTipo: p.canulaFaringealTipo || "",
              nroTubo: p.nroTubo || "",
              conManguito: p.conManguito ?? null,
              dificultadViaAerea: p.dificultadViaAerea ?? null,
              detalleViaAerea: p.detalleViaAerea || "",
              modalidadVentilatoria: p.modalidadVentilatoria || "",
              modalidadVentFranja: onlyArray(p.modalidadVentFranja),
              fio2: p.fio2 ?? null,
              oxigenoFlujo: p.oxigenoFlujo ?? null,
              peso: p.peso ?? null,
              talla: p.talla ?? null,
              imc: p.imc ?? null,
              liquidosIngresados: onlyArray(p.liquidosIngresados),
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

          // Autocompletar identificación con el anestesiólogo asignado a la cirugía.
          // Respeta ediciones manuales: solo sobrescribe si el campo está vacío o si el
          // valor guardado proviene de un autocompletado previo (trackeado en sessionStorage).
          const asignado = data.anestesiologoAsignado;
          const storageKey = `sih-pa-anestesiologo-${internacionId}`;
          if (asignado) {
            const nombreAsignado = asignado.nombre;
            anestesiologoAsignadoRef.current = nombreAsignado;
            let autocompletadoPrevio = "";
            try {
              autocompletadoPrevio = sessionStorage.getItem(storageKey) || "";
            } catch {
              autocompletadoPrevio = "";
            }
            const actual = form.getValues("anestesiologo") || "";
            const esAutocompletadoPrevio = !actual || (autocompletadoPrevio !== "" && actual === autocompletadoPrevio);
            const matriculaActual = form.getValues("matriculaAnestesiologo") || "";
            if (
              esAutocompletadoPrevio &&
              (actual !== nombreAsignado || matriculaActual !== (asignado.matricula || ""))
            ) {
              form.setValue("anestesiologo", nombreAsignado, { shouldDirty: true });
              form.setValue("matriculaAnestesiologo", asignado.matricula || "", { shouldDirty: true });
            }
            try {
              sessionStorage.setItem(storageKey, nombreAsignado);
            } catch {
              // almacenamiento no disponible: el placeholder no se pierde en esta sesión
            }
          } else {
            anestesiologoAsignadoRef.current = "";
            try {
              sessionStorage.removeItem(storageKey);
            } catch {
              // almacenamiento no disponible
            }
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
    if (loading || firmado) return;
    if (!protocoloId && !form.formState.isDirty) return;
    const fingerprint = JSON.stringify({ ...debouncedValues, signosVitales: signosVitalesRef.current });
    if (fingerprint === debouncedFingerprint.current) return;
    if (autoSaveRef.current || savingSignosRef.current) return;

    autoSaveRef.current = true;
    setSaving(true);
    setSaveError(false);

    const save = async () => {
      try {
        const payload = {
          ...debouncedValues,
          signosVitales: signosVitalesRef.current,
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
          const creado = await res.json();
          if (creado?.id && !protocoloId) setProtocoloId(creado.id);
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
  }, [debouncedValues, loading, firmado, protocoloId, internacionId, signosVitales, cirugiaId, form.formState.isDirty]);

  // Toggle sección
  const toggleSeccion = (key: string) => {
    setSecciones((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Persistencia inmediata de signos vitales intraoperatorios
  const persistSignos = useCallback(
    (registros: SignoVitalRegistro[], minuto: number) => {
      if (firmado) return;
      if (savingSignosRef.current) {
        pendingSignosRef.current = registros;
        return;
      }
      savingSignosRef.current = true;

      const persist = async () => {
        try {
          const payload = {
            ...form.getValues(),
            signosVitales: registros,
            drogas: form.getValues("drogas") || [],
            cirugiaId: cirugiaId || undefined,
          };
          const res = await fetch(`/api/historia-clinica/${internacionId}/protocolo-anestesia`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            debouncedFingerprint.current = JSON.stringify({
              ...form.getValues(),
              signosVitales: registros,
            });
            const hora = horaInicio
              ? new Date(horaInicio.getTime() + minuto * 60000).toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
              : "";
            toast(
              "success",
              hora
                ? `Signos vitales intraoperatorios guardados (${hora})`
                : "Signos vitales intraoperatorios guardados"
            );
          } else if (res.status === 403) {
            setFirmado(true);
          } else {
            setSaveError(true);
          }
        } catch {
          setSaveError(true);
        } finally {
          savingSignosRef.current = false;
          if (pendingSignosRef.current) {
            const next = pendingSignosRef.current;
            pendingSignosRef.current = null;
            persistSignos(next, next[next.length - 1]?.minuto ?? minuto);
          }
        }
      };
      persist();
    },
    [firmado, form, internacionId, cirugiaId, horaInicio, toast]
  );

  // Guardar signos vitales
  const handleAddRegistro = useCallback(
    (registro: SignoVitalRegistro) => {
      const prev = signosVitalesRef.current;
      const existing = prev.findIndex((s) => s.minuto === registro.minuto);
      const next =
        existing >= 0
          ? prev.map((s, i) => (i === existing ? { ...s, ...registro } : s))
          : [...prev, registro].sort((a, b) => a.minuto - b.minuto);
      signosVitalesRef.current = next;
      setSignosVitales(next);
      persistSignos(next, registro.minuto);
    },
    [persistSignos]
  );

  const handleAddEvento = useCallback(
    (minuto: number, evento: string) => {
      const prev = signosVitalesRef.current;
      const existing = prev.findIndex((s) => s.minuto === minuto);
      const next =
        existing >= 0
          ? prev.map((s, i) => (i === existing ? { ...s, eventos: [...(s.eventos || []), evento] } : s))
          : [...prev, { minuto, eventos: [evento] }].sort((a, b) => a.minuto - b.minuto);
      signosVitalesRef.current = next;
      setSignosVitales(next);
      persistSignos(next, minuto);
    },
    [persistSignos]
  );

  // FASE 3: bolos e infusiones (arrays por minuto en el registro intraoperatorio)
  const handleAddBolo = useCallback(
    (minuto: number, bolo: BoloRegistro) => {
      const prev = signosVitalesRef.current;
      const existing = prev.findIndex((s) => s.minuto === minuto);
      const next =
        existing >= 0
          ? prev.map((s, i) => (i === existing ? { ...s, bolos: [...(s.bolos || []), bolo] } : s))
          : [...prev, { minuto, bolos: [bolo] }].sort((a, b) => a.minuto - b.minuto);
      signosVitalesRef.current = next;
      setSignosVitales(next);
      persistSignos(next, minuto);
    },
    [persistSignos]
  );

  const handleAddInfusion = useCallback(
    (infusion: InfusionRegistro) => {
      const minuto = infusion.inicio;
      const infusionConId = { ...infusion, id: infusion.id ?? crypto.randomUUID() };
      const prev = signosVitalesRef.current;
      const existing = prev.findIndex((s) => s.minuto === minuto);
      const next =
        existing >= 0
          ? prev.map((s, i) => (i === existing ? { ...s, infusiones: [...(s.infusiones || []), infusionConId] } : s))
          : [...prev, { minuto, infusiones: [infusionConId] }].sort((a, b) => a.minuto - b.minuto);
      signosVitalesRef.current = next;
      setSignosVitales(next);
      persistSignos(next, minuto);
    },
    [persistSignos]
  );

  const handleUpdateInfusion = useCallback(
    (id: string, fin: number) => {
      const prev = signosVitalesRef.current;
      const next = prev.map((s) => {
        if (!Array.isArray(s.infusiones) || !s.infusiones.some((i) => i.id === id)) return s;
        return { ...s, infusiones: s.infusiones.map((i) => (i.id === id ? { ...i, fin } : i)) };
      });
      const huboCambio = JSON.stringify(next) !== JSON.stringify(prev);
      if (!huboCambio) return;
      signosVitalesRef.current = next;
      setSignosVitales(next);
      persistSignos(next, fin);
    },
    [persistSignos]
  );

  // Iniciar hora si no existe
  useEffect(() => {
    if (!horaInicio && !loading && protocoloId) {
      setHoraInicio(new Date());
      if (!form.getValues("fechaCirugia")) {
        form.setValue("fechaCirugia", new Date().toISOString().slice(0, 16), { shouldDirty: true });
      }
    }
  }, [horaInicio, loading, protocoloId, form]);

  // Recalcular IMC en vivo (readonly; el servidor lo persiste como fuente de verdad)
  const pesoWatch = form.watch("peso");
  const tallaWatch = form.watch("talla");
  useEffect(() => {
    const imc = calcularIMCCliente(pesoWatch, tallaWatch);
    // Sin shouldDirty: evita PUT espurio al cargar; el typing del usuario ya marca dirty
    form.setValue("imc", imc, { shouldDirty: false });
  }, [pesoWatch, tallaWatch, form]);

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
          {saved && <span className="text-xs text-brand flex items-center gap-1"><CheckCircle size={12} /> Guardado</span>}
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
              {alergiasPaciente.map((a) => a.sustancia).join(", ")}
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
            <span className="text-sm font-medium text-brand uppercase tracking-wide">{sec.label}</span>
            {secciones[sec.key] ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
          </button>

          {secciones[sec.key] && (
            <div className="px-5 pb-5 space-y-4">

              {/* === SECCIÓN 1: Identificación === */}
              {sec.key === "identificacion" && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <Input label="Anestesiólogo" placeholder={anestesiologoAsignadoRef.current || "Ingresar anestesiólogo a cargo..."} {...form.register("anestesiologo")} disabled={firmado} />
                    <Input label="Matrícula Anestesiólogo" placeholder="Matrícula..." {...form.register("matriculaAnestesiologo")} disabled={firmado} />
                    <Input label="Cirujano Principal" {...form.register("cirujano")} disabled={firmado} />
                    <Input label="Matrícula Cirujano" {...form.register("matriculaCirujano")} disabled={firmado} />
                    <Input label="Ayudante(s)" {...form.register("ayudantes")} disabled={firmado} />
                    <Input label="Fecha Cirugía" type="datetime-local" {...form.register("fechaCirugia")} disabled={firmado} />
                    <Input label="Peso (kg)" type="number" step="0.1" {...form.register("peso", { valueAsNumber: true })} disabled={firmado} />
                    <Input label="Talla (cm)" type="number" step="0.1" {...form.register("talla", { valueAsNumber: true })} disabled={firmado} />
                    <div className="space-y-1">
                      <label className="block text-sm text-muted">IMC (calculado)</label>
                      <div className={`flex items-center rounded-md border px-3 py-2 text-sm ${form.watch("imc") ? "border-border bg-surface-active text-text" : "border-border/60 bg-background text-muted"}`}>
                        {form.watch("imc") ? `${form.watch("imc")} kg/m²` : "—"}
                      </div>
                    </div>
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

                  {/* Antecedentes de importancia */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted">Antecedentes de importancia</label>
                    <textarea
                      {...form.register("antecedentesImportancia")}
                      placeholder="Cardiopatías, HTA, diabetes, antecedentes anestésicos, etc."
                      rows={3}
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
                              ? "bg-accent/15 text-accent"
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
                              ? "bg-accent/15 text-accent"
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
                              ? "bg-accent/15 text-accent"
                              : "bg-border text-text-secondary hover:bg-surface-active"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Dist. tiromentoniana (cm)" type="number" step="0.1" {...form.register("distTiromentoniana", { valueAsNumber: true })} disabled={firmado} />
                      <div className="space-y-1">
                        <label className="block text-sm text-muted">Apertura bucal</label>
                        <div className="flex gap-2">
                          {(["+3", "-3"] as const).map((ab) => (
                            <button
                              key={ab}
                              type="button"
                              disabled={firmado}
                              onClick={() => form.setValue("aperturaBucal", ab, { shouldDirty: true })}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                form.watch("aperturaBucal") === ab
                                  ? "bg-accent/15 text-accent"
                                  : "bg-border text-text-secondary hover:bg-surface-active"
                              }`}
                            >
                              {ab}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted">Tres traveses (+3) / menos (−3)</p>
                      </div>
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
                          const prev = onlyArray<PremedicacionItem>(form.getValues("premedicacion"));
                          form.setValue("premedicacion", [...prev, { droga: "", dosis: "", hora: "" }], { shouldDirty: true });
                        }}>+ Agregar</Button>
                    </div>
                    {onlyArray<PremedicacionItem>(form.watch("premedicacion")).length === 0 && (
                      <p className="text-xs text-muted italic">Sin premedicación registrada</p>
                    )}
                    {onlyArray<PremedicacionItem>(form.watch("premedicacion")).map((_: PremedicacionItem, idx: number) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 rounded bg-background border border-border/50 items-end">
                        <Input label="Droga" {...form.register(`premedicacion.${idx}.droga`)} disabled={firmado} />
                        <Input label="Dosis" {...form.register(`premedicacion.${idx}.dosis`)} disabled={firmado} />
                        <div className="flex gap-2 items-end">
                          <Input label="Hora" type="time" {...form.register(`premedicacion.${idx}.hora`)} disabled={firmado} className="flex-1" />
                          <Button type="button" variant="danger" size="sm" disabled={firmado}
                            onClick={() => {
                              const prev = onlyArray<PremedicacionItem>(form.getValues("premedicacion"));
                              form.setValue("premedicacion", prev.filter((_, i) => i !== idx), { shouldDirty: true });
                            }}><Trash2 size={12} /></Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Preoxigenación */}
                  <div className="space-y-2">
                    <label className="block text-sm text-muted">Preoxigenación</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="radio" checked={form.watch("preoxigenacion") === true}
                          onChange={() => form.setValue("preoxigenacion", true, { shouldDirty: true })} disabled={firmado}
                          className="accent-accent" /> SÍ
                      </label>
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="radio" checked={form.watch("preoxigenacion") === false}
                          onChange={() => form.setValue("preoxigenacion", false, { shouldDirty: true })} disabled={firmado}
                          className="accent-accent" /> NO
                      </label>
                    </div>
                    {form.watch("preoxigenacion") && (
                      <Input
                        label="Detalle"
                        placeholder="Tiempo, FiO₂, técnica..."
                        {...form.register("preoxigenacionDetalle")}
                        disabled={firmado}
                      />
                    )}
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
                                  ? "bg-accent/15 text-accent"
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
                                  ? "bg-accent/15 text-accent"
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
                                  ? "bg-accent/15 text-accent"
                                  : "bg-border text-text-secondary hover:bg-surface-active"
                              }`}>{va}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs text-muted">Intubación traqueal</label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input type="radio" checked={form.watch("intubacion") === true}
                              onChange={() => form.setValue("intubacion", true, { shouldDirty: true })} disabled={firmado}
                              className="accent-accent" /> SÍ
                          </label>
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input type="radio" checked={form.watch("intubacion") === false}
                              onChange={() => form.setValue("intubacion", false, { shouldDirty: true })} disabled={firmado}
                              className="accent-accent" /> NO
                          </label>
                        </div>
                      </div>
                      {(form.watch("intubacion") || manejoViaAerea === "Intubación traqueal") && (
                        <div className="space-y-2">
                          <label className="block text-xs text-muted">Subtipo de intubación</label>
                          <div className="flex flex-wrap gap-2">
                            {INTUBACION_SUBTIPO.map((ist) => (
                              <button key={ist} type="button" disabled={firmado}
                                onClick={() => form.setValue("intubacionSubtipo", ist, { shouldDirty: true })}
                                className={`px-3 py-1 rounded-lg text-xs ${
                                  form.watch("intubacionSubtipo") === ist
                                    ? "bg-accent/15 text-accent"
                                    : "bg-border text-text-secondary hover:bg-surface-active"
                                }`}>{ist}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <input type="checkbox" {...form.register("entubacionEsofagica")} disabled={firmado} className="accent-red-400" />
                        Entubación esofágica accidental
                      </label>
                      {(manejoViaAerea === "Máscara laríngea" || manejoViaAerea === "Cánula faríngea") && (
                        <div className="space-y-2">
                          <label className="block text-xs text-muted">Tipo de cánula</label>
                          <div className="flex flex-wrap gap-2">
                            {CANULA_FARINGEAL.map((cf) => (
                              <button key={cf} type="button" disabled={firmado}
                                onClick={() => form.setValue("canulaFaringealTipo", cf, { shouldDirty: true })}
                                className={`px-3 py-1 rounded-lg text-xs ${
                                  form.watch("canulaFaringealTipo") === cf
                                    ? "bg-accent/15 text-accent"
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
                                    ? "bg-accent/15 text-accent"
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
                  horaInicio={horaInicio}
                  onAddRegistro={handleAddRegistro}
                  onAddEvento={handleAddEvento}
                  onAddBolo={handleAddBolo}
                  onAddInfusion={handleAddInfusion}
                  onUpdateInfusion={handleUpdateInfusion}
                  readOnly={firmado}
                />
              )}

              {/* === SECCIÓN 5: Balance de Líquidos === */}
              {sec.key === "balance" && (
                <>
                  {/* Fluidos */}
                  <BalanceLiquidos disabled={firmado} />

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
                                ? "bg-accent/15 text-accent"
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
                                ? "bg-accent/15 text-accent"
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
                            ? "bg-accent/15 text-accent"
                            : "bg-border text-text-secondary hover:bg-surface-active"
                        }`}>Programada</button>
                      <button type="button" disabled={firmado}
                        onClick={() => form.setValue("tipoCirugia", "urgencia", { shouldDirty: true })}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          form.watch("tipoCirugia") === "urgencia"
                            ? "bg-error/15 text-error"
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
                              ? "bg-accent/15 text-accent"
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
      <Modal open={showFirmarModal} onClose={() => setShowFirmarModal(false)} title="Firmar Protocolo" size="md">
        <div className="space-y-4">
          <Input label="Nombre y apellido del anestesiólogo" value={firmarNombre} onChange={(e) => setFirmarNombre(e.target.value)} />
          <Input label="Matrícula" value={firmarMatricula} onChange={(e) => setFirmarMatricula(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowFirmarModal(false)}>Cancelar</Button>
            <Button onClick={handleFirmar} disabled={!firmarNombre.trim()}>
              <PenLine size={14} /> Firmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Sub-componente de balance de líquidos inline
function BalanceLiquidos({ disabled }: { disabled: boolean }) {
  const [liquidos, setLiquidos] = useState<{ tipo: string; volumen: number; lote?: string }[]>([
    { tipo: "Solución Fisiológica (NaCl 0.9%)", volumen: 0 },
    { tipo: "Ringer Lactato", volumen: 0 },
    { tipo: "Coloide", volumen: 0 },
    { tipo: "Sangre/glóbulos rojos", volumen: 0, lote: "" },
    { tipo: "Plasma", volumen: 0, lote: "" },
    { tipo: "Plaquetas", volumen: 0, lote: "" },
    { tipo: "Otro", volumen: 0 },
  ]);

  const handleChange = (idx: number, field: "volumen" | "lote", value: string) => {
    setLiquidos((prev) => {
      const updated = [...prev];
      if (field === "volumen") {
        updated[idx].volumen = parseFloat(value) || 0;
      } else {
        updated[idx].lote = value;
      }
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
                    className="w-full text-right rounded border border-border bg-background px-2 py-1 text-xs text-text focus:outline-none focus:border-brand"
                  />
                </td>
                <td className="py-1.5 px-2">
                  {l.lote !== undefined ? (
                    <input
                      type="text"
                      value={l.lote}
                      onChange={(e) => handleChange(idx, "lote", e.target.value)}
                      disabled={disabled}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text focus:outline-none focus:border-brand"
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-1.5 px-2 text-brand">TOTAL</td>
              <td className="py-1.5 px-2 text-right text-brand">{totalIngresos} ml</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { ProtocoloAnestesiaComponent, type ProtocoloAnestesiaProps };
