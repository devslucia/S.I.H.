"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/utils";

interface CarpetaCompleta {
  id: string;
  numero: number;
  fechaIngreso: string;
  fechaEgreso: string | null;
  motivoIngreso: string | null;
  diagnosticoCIE: string | null;
  medicoSolicitante: string | null;
  tipoIngreso: string;
  estado: string;
  paciente: {
    id: string; dni: string; apellido: string; nombre: string;
    sexo: string; fechaNac: string; cuil: string | null;
    domicilio: string | null; localidad: string | null;
    telefono: string | null; grupoSangre: string | null;
    alergias: { sustancia: string; severidad: string | null; observacion: string | null }[];
  };
  cama: { numero: string; sector: { nombre: string } } | null;
  obraSocial: { nombre: string; sigla: string } | null;
  pases: { camaAnterior: string | null; camaNueva: string; sector: string; fecha: string }[];
  histClinica: {
    anamnesis: {
      motivoConsulta: string | null; enfermedadActual: string | null;
      antecPatologicos: string | null; antecFamiliares: string | null;
      habitosToxicos: string | null; factoresRiesgoCV: string | null;
      otros: string | null; estadoGeneral: string | null;
      signosVitalesIngreso: any; abdomen: string | null;
      diagPresuntivo: string | null; diagDiferencial: string | null;
      planEvaluacion: string | null; planTerapeutico: string | null;
      firmadoAt: string | null; firmadoPor: string | null;
    } | null;
    evoluciones: { fecha: string; contenido: string; usuario: { nombre: string; rol: string }; firmada: boolean }[];
    prescripciones: { fecha: string; tipo: string; droga: string | null; dosis: string | null; frecuencia: string | null; via: string | null; descripcion: string | null; estado: string; usuario: { nombre: string } }[];
    controlesEnfermeria: { fecha: string; hora: string; tipo: string; datos: any; observacion: string | null; usuario: { nombre: string } }[];
    hojaEnfermeria: { fecha: string; seccion: string; item: string; dosis: string | null; via: string | null; marcasHorarias: any }[];
    valoracionPreanestesia: {
      antecQuirurgicos: string | null; enfermedadesTratamiento: string | null;
      laboratorio: string | null; scoreASA: number | null;
      anestesiaSugerida: string | null; comentarios: string | null;
      firmadaAt: string | null;
    } | null;
    protocoloAnestesia: {
      fechaInicio: string | null; fechaFin: string | null;
      estadoPsicoPreop: string | null; scoreASA: number | null;
      anestesiaGeneral: any; drogas: any[];
      signosVitales: any[]; posicionOperatoria: string | null;
      sangredPerdida: string | null; diuresisIntraop: number | null;
      cirugiaRealizada: string | null; firmadaAt: string | null;
    } | null;
    epicrisis: {
      diagIngreso: string | null; diagEgreso: string | null;
      codigosCIE: string[]; resumenClinico: string | null;
      estudiosRealizados: string | null; tratamientosRealizados: string | null;
      condicionEgreso: string | null; destino: string | null;
      medicacionAlta: any[]; indicacionesAlta: string | null;
      proximoControlFecha: string | null; proximoControlLugar: string | null;
      firmadaAt: string | null;
    } | null;
  } | null;
  cirugias: {
    id: string; quirofanoNumero: number; fechaProgramada: string;
    horaProgramada: string; tipo: string; estado: string;
    procedimiento: string | null; diagnosticoPreop: string | null;
    diagnosticoPostop: string | null; hallazgos: string | null;
    horaInicio: string | null; horaFin: string | null;
    implantes: { codigo: string; nombre: string; lote: string | null; codigoCE: string | null }[];
  }[];
  cargosFacturacion: { concepto: string; cantidad: number; precioUnitario: number; total: number; origen: string; fecha: string }[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-section">
      <h3 className="text-teal font-semibold text-base mb-2 border-b border-border pb-1">{title}</h3>
      <div className="text-sm text-gray-300 space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p><span className="text-gray-500">{label}:</span> {value}</p>
  );
}

export default function ImprimirCarpetaPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CarpetaCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/internaciones/${params.internacionId}/carpeta-completa`);
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.internacionId]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 text-teal animate-spin" />
      <span className="ml-2 text-muted">Cargando carpeta completa...</span>
    </div>
  );

  if (!data) return <p className="text-muted text-sm">No se encontraron datos.</p>;

  const p = data.paciente;
  const hc = data.histClinica;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Volver
        </button>
        <Button onClick={handlePrint}>
          <Printer size={16} /> Imprimir Carpeta
        </Button>
      </div>

      <div ref={printRef} className="print-area space-y-6">
        {/* Header */}
        <div className="print-header text-center border-b-2 border-teal pb-3 mb-4">
          <h1 className="text-xl font-bold text-white">SANATORIO SIMES</h1>
          <p className="text-xs text-muted">Córdoba N° 2344 — Posadas, Misiones</p>
          <p className="text-xs text-muted">Tel: 03765-430280 / 430283</p>
          <h2 className="text-lg font-semibold text-teal mt-2">CARPETA COMPLETA DEL PACIENTE</h2>
          <p className="text-xs text-muted">Generado: {new Date().toLocaleString("es-AR")}</p>
        </div>

        {/* Datos del Paciente */}
        <Section title="DATOS DEL PACIENTE">
          <Field label="Apellido y Nombre" value={`${p.apellido}, ${p.nombre}`} />
          <Field label="DNI" value={p.dni} />
          <Field label="Sexo" value={p.sexo} />
          <Field label="Fecha de Nacimiento" value={formatDate(p.fechaNac)} />
          <Field label="CUIL" value={p.cuil} />
          <Field label="Domicilio" value={p.domicilio} />
          <Field label="Localidad" value={p.localidad} />
          <Field label="Teléfono" value={p.telefono} />
          <Field label="Grupo Sanguíneo" value={p.grupoSangre} />
          {p.alergias.length > 0 && (
            <div className="mt-1">
              <span className="text-red font-medium">⚠ ALERGIAS: </span>
              {p.alergias.map((a, i) => (
                <span key={i} className="text-red">{a.sustancia}{a.severidad ? ` (${a.severidad})` : ""}{i < p.alergias.length - 1 ? ", " : ""}</span>
              ))}
            </div>
          )}
        </Section>

        {/* Internación */}
        <Section title="DATOS DE INTERNACIÓN">
          <Field label="N° de Internación" value={`#${data.numero}`} />
          <Field label="Fecha de Ingreso" value={formatDateTime(data.fechaIngreso)} />
          <Field label="Fecha de Egreso" value={data.fechaEgreso ? formatDateTime(data.fechaEgreso) : "—"} />
          <Field label="Tipo de Ingreso" value={data.tipoIngreso} />
          <Field label="Estado" value={data.estado} />
          <Field label="Motivo de Ingreso" value={data.motivoIngreso} />
          <Field label="Diagnóstico CIE" value={data.diagnosticoCIE} />
          <Field label="Médico Solicitante" value={data.medicoSolicitante} />
          <Field label="Cama" value={data.cama ? `${data.cama.numero} - ${data.cama.sector.nombre}` : null} />
          <Field label="Obra Social" value={data.obraSocial ? `${data.obraSocial.nombre} (${data.obraSocial.sigla})` : null} />

          {data.pases.length > 0 && (
            <div className="mt-2">
              <span className="text-gray-500">Pases internos:</span>
              <ul className="list-disc list-inside ml-2">
                {data.pases.map((pase, i) => (
                  <li key={i} className="text-xs text-gray-400">
                    {formatDateTime(pase.fecha)} — {pase.camaAnterior ? `${pase.camaAnterior} → ` : ""}{pase.camaNueva} ({pase.sector})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Anamnesis */}
        {hc?.anamnesis && (
          <Section title="ANAMNESIS">
            <Field label="Motivo de Consulta" value={hc.anamnesis.motivoConsulta} />
            <Field label="Enfermedad Actual" value={hc.anamnesis.enfermedadActual} />
            <Field label="Antecedentes Patológicos" value={hc.anamnesis.antecPatologicos} />
            <Field label="Antecedentes Familiares" value={hc.anamnesis.antecFamiliares} />
            <Field label="Hábitos Tóxicos" value={hc.anamnesis.habitosToxicos} />
            <Field label="Factores de Riesgo CV" value={hc.anamnesis.factoresRiesgoCV} />
            <Field label="Estado General" value={hc.anamnesis.estadoGeneral} />
            {hc.anamnesis.signosVitalesIngreso && (
              <p><span className="text-gray-500">Signos Vitales Ingreso:</span> {JSON.stringify(hc.anamnesis.signosVitalesIngreso)}</p>
            )}
            <Field label="Abdomen" value={hc.anamnesis.abdomen} />
            <Field label="Diagnóstico Presuntivo" value={hc.anamnesis.diagPresuntivo} />
            <Field label="Diagnóstico Diferencial" value={hc.anamnesis.diagDiferencial} />
            <Field label="Plan de Evaluación" value={hc.anamnesis.planEvaluacion} />
            <Field label="Plan Terapéutico" value={hc.anamnesis.planTerapeutico} />
            {hc.anamnesis.firmadoAt && (
              <p className="text-green-400 text-xs mt-1">
                ✍ Firmado por {hc.anamnesis.firmadoPor} — {formatDateTime(hc.anamnesis.firmadoAt)}
              </p>
            )}
          </Section>
        )}

        {/* Evoluciones */}
        {hc?.evoluciones && hc.evoluciones.length > 0 && (
          <Section title="EVOLUCIONES MÉDICAS">
            {hc.evoluciones.map((ev, i) => (
              <div key={i} className="border-l-2 border-border pl-3 ml-1 mb-2">
                <p className="text-xs text-muted">{formatDateTime(ev.fecha)} — {ev.usuario.nombre} ({ev.usuario.rol})</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{ev.contenido}</p>
                {ev.firmada && <p className="text-xs text-green-400">✅ Firmada</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Prescripciones */}
        {hc?.prescripciones && hc.prescripciones.length > 0 && (
          <Section title="PRESCRIPCIONES Y ÓRDENES MÉDICAS">
            <table className="w-full text-xs text-gray-300 mb-2">
              <thead><tr className="text-gray-500 border-b border-border">
                <th className="text-left py-1 pr-2">Fecha</th>
                <th className="text-left py-1 pr-2">Tipo</th>
                <th className="text-left py-1 pr-2">Indicación</th>
                <th className="text-left py-1 pr-2">Dosis</th>
                <th className="text-left py-1 pr-2">Frecuencia</th>
                <th className="text-left py-1 pr-2">Vía</th>
                <th className="text-left py-1 pr-2">Estado</th>
              </tr></thead>
              <tbody>
                {hc.prescripciones.map((p, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1 pr-2">{formatDateTime(p.fecha)}</td>
                    <td className="py-1 pr-2">{p.tipo}</td>
                    <td className="py-1 pr-2">{p.droga || p.descripcion || "—"}</td>
                    <td className="py-1 pr-2">{p.dosis || "—"}</td>
                    <td className="py-1 pr-2">{p.frecuencia || "—"}</td>
                    <td className="py-1 pr-2">{p.via || "—"}</td>
                    <td className="py-1 pr-2">
                      <span className={p.estado === "BLOQUEADA_ALERGIA" ? "text-red" : p.estado === "ACTIVA" ? "text-green-400" : "text-gray-400"}>
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Controles de Enfermería */}
        {hc?.controlesEnfermeria && hc.controlesEnfermeria.length > 0 && (
          <Section title="CONTROLES DE ENFERMERÍA">
            {hc.controlesEnfermeria.map((c, i) => (
              <div key={i} className="border-b border-border/50 pb-1 mb-1">
                <p className="text-xs text-muted">{formatDate(c.fecha)} {c.hora} — {c.tipo} — {c.usuario.nombre}</p>
                <p className="text-xs text-gray-300">Datos: {JSON.stringify(c.datos)}</p>
                {c.observacion && <p className="text-xs text-gray-400">Obs: {c.observacion}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Hoja de Enfermería */}
        {hc?.hojaEnfermeria && hc.hojaEnfermeria.length > 0 && (
          <Section title="HOJA DE ENFERMERÍA — MEDICACIÓN">
            <table className="w-full text-xs text-gray-300">
              <thead><tr className="text-gray-500 border-b border-border">
                <th className="text-left py-1 pr-2">Fecha</th>
                <th className="text-left py-1 pr-2">Sección</th>
                <th className="text-left py-1 pr-2">Item</th>
                <th className="text-left py-1 pr-2">Dosis</th>
                <th className="text-left py-1 pr-2">Vía</th>
                <th className="text-left py-1 pr-2">Horas</th>
              </tr></thead>
              <tbody>
                {hc.hojaEnfermeria.map((h, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1 pr-2">{formatDate(h.fecha)}</td>
                    <td className="py-1 pr-2">{h.seccion}</td>
                    <td className="py-1 pr-2">{h.item}</td>
                    <td className="py-1 pr-2">{h.dosis || "—"}</td>
                    <td className="py-1 pr-2">{h.via || "—"}</td>
                    <td className="py-1 pr-2">
                      {h.marcasHorarias ? Object.entries(h.marcasHorarias as Record<string, boolean>).filter(([,v]) => v).map(([k]) => k).join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Valoración Preanestésica */}
        {hc?.valoracionPreanestesia && (
          <Section title="VALORACIÓN PREANESTÉSICA">
            <Field label="Antecedentes Quirúrgicos" value={hc.valoracionPreanestesia.antecQuirurgicos} />
            <Field label="Enfermedades en Tratamiento" value={hc.valoracionPreanestesia.enfermedadesTratamiento} />
            <Field label="Laboratorio" value={hc.valoracionPreanestesia.laboratorio} />
            <Field label="Score ASA" value={hc.valoracionPreanestesia.scoreASA?.toString() || null} />
            <Field label="Anestesia Sugerida" value={hc.valoracionPreanestesia.anestesiaSugerida} />
            <Field label="Comentarios" value={hc.valoracionPreanestesia.comentarios} />
            {hc.valoracionPreanestesia.firmadaAt && (
              <p className="text-green-400 text-xs mt-1">✍ Firmada — {formatDateTime(hc.valoracionPreanestesia.firmadaAt)}</p>
            )}
          </Section>
        )}

        {/* Protocolo de Anestesia */}
        {hc?.protocoloAnestesia && (
          <Section title="PROTOCOLO DE ANESTESIA">
            <Field label="Fecha Inicio" value={hc.protocoloAnestesia.fechaInicio ? formatDateTime(hc.protocoloAnestesia.fechaInicio) : null} />
            <Field label="Fecha Fin" value={hc.protocoloAnestesia.fechaFin ? formatDateTime(hc.protocoloAnestesia.fechaFin) : null} />
            <Field label="Estado Psico Preop" value={hc.protocoloAnestesia.estadoPsicoPreop} />
            <Field label="Score ASA" value={hc.protocoloAnestesia.scoreASA?.toString() || null} />
            <Field label="Anestesia General" value={hc.protocoloAnestesia.anestesiaGeneral ? JSON.stringify(hc.protocoloAnestesia.anestesiaGeneral) : null} />
            <Field label="Posición Operatoria" value={hc.protocoloAnestesia.posicionOperatoria} />
            <Field label="Sangre Perdida" value={hc.protocoloAnestesia.sangredPerdida} />
            <Field label="Diuresis Intraop" value={hc.protocoloAnestesia.diuresisIntraop?.toString() || null} />
            <Field label="Cirugía Realizada" value={hc.protocoloAnestesia.cirugiaRealizada} />
            {hc.protocoloAnestesia.drogas && hc.protocoloAnestesia.drogas.length > 0 && (
              <div className="mt-1">
                <span className="text-gray-500">Drogas administradas:</span>
                <ul className="list-disc list-inside ml-2">
                  {hc.protocoloAnestesia.drogas.map((d: any, i: number) => (
                    <li key={i} className="text-xs text-gray-400">
                      {d.droga || d.nombre} {d.dosis ? `— ${d.dosis}` : ""}{d.hora ? ` @${d.hora}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hc.protocoloAnestesia.firmadaAt && (
              <p className="text-green-400 text-xs mt-1">✍ Firmada — {formatDateTime(hc.protocoloAnestesia.firmadaAt)}</p>
            )}
          </Section>
        )}

        {/* Cirugías */}
        {data.cirugias.length > 0 && (
          <Section title="PROTOCOLO QUIRÚRGICO / CIRUGÍAS">
            {data.cirugias.map((cir, i) => (
              <div key={i} className="border border-border rounded-lg p-3 mb-2">
                <p className="text-sm font-medium text-white">QF #{cir.quirofanoNumero} — {cir.estado}</p>
                <p className="text-xs text-muted">{formatDate(cir.fechaProgramada)} {cir.horaProgramada}</p>
                <Field label="Procedimiento" value={cir.procedimiento} />
                <Field label="Diagnóstico Preop" value={cir.diagnosticoPreop} />
                <Field label="Diagnóstico Postop" value={cir.diagnosticoPostop} />
                <Field label="Hallazgos" value={cir.hallazgos} />
                <Field label="Horario" value={cir.horaInicio && cir.horaFin ? `${cir.horaInicio} — ${cir.horaFin}` : null} />
                {cir.implantes.length > 0 && (
                  <div className="mt-1">
                    <span className="text-gray-500 text-xs">Implantes:</span>
                    <ul className="list-disc list-inside ml-2">
                      {cir.implantes.map((imp, j) => (
                        <li key={j} className="text-xs text-gray-400">
                          {imp.nombre} ({imp.codigo}){imp.lote ? ` — Lote: ${imp.lote}` : ""}{imp.codigoCE ? ` — CE: ${imp.codigoCE}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Epicrisis */}
        {hc?.epicrisis && (
          <Section title="EPICRISIS / INFORME DE ALTA">
            <Field label="Diagnóstico de Ingreso" value={hc.epicrisis.diagIngreso} />
            <Field label="Diagnóstico de Egreso" value={hc.epicrisis.diagEgreso} />
            {hc.epicrisis.codigosCIE.length > 0 && (
              <p><span className="text-gray-500">Códigos CIE:</span> {hc.epicrisis.codigosCIE.join(", ")}</p>
            )}
            <Field label="Resumen Clínico" value={hc.epicrisis.resumenClinico} />
            <Field label="Estudios Realizados" value={hc.epicrisis.estudiosRealizados} />
            <Field label="Tratamientos Realizados" value={hc.epicrisis.tratamientosRealizados} />
            <Field label="Condición de Egreso" value={hc.epicrisis.condicionEgreso} />
            <Field label="Destino" value={hc.epicrisis.destino} />
            <Field label="Indicaciones de Alta" value={hc.epicrisis.indicacionesAlta} />
            <Field label="Próximo Control" value={hc.epicrisis.proximoControlFecha ? formatDate(hc.epicrisis.proximoControlFecha) : null} />
            <Field label="Lugar de Control" value={hc.epicrisis.proximoControlLugar} />
            {hc.epicrisis.firmadaAt && (
              <p className="text-green-400 text-xs mt-1">✍ Firmada — {formatDateTime(hc.epicrisis.firmadaAt)}</p>
            )}
          </Section>
        )}

        {/* Cargos de Facturación */}
        {data.cargosFacturacion.length > 0 && (
          <Section title="CARGOS DE FACTURACIÓN">
            <table className="w-full text-xs text-gray-300">
              <thead><tr className="text-gray-500 border-b border-border">
                <th className="text-left py-1 pr-2">Fecha</th>
                <th className="text-left py-1 pr-2">Concepto</th>
                <th className="text-right py-1 pr-2">Cant.</th>
                <th className="text-right py-1 pr-2">P.Unit.</th>
                <th className="text-right py-1 pr-2">Total</th>
              </tr></thead>
              <tbody>
                {data.cargosFacturacion.map((c, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1 pr-2">{formatDate(c.fecha)}</td>
                    <td className="py-1 pr-2">{c.concepto}</td>
                    <td className="py-1 pr-2 text-right">{c.cantidad}</td>
                    <td className="py-1 pr-2 text-right">${Number(c.precioUnitario).toFixed(2)}</td>
                    <td className="py-1 pr-2 text-right">${Number(c.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium text-white">
                  <td colSpan={4} className="py-2 text-right pr-2">TOTAL:</td>
                  <td className="py-2 text-right">
                    ${data.cargosFacturacion.reduce((sum, c) => sum + Number(c.total), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Section>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-area { padding: 0.5in; }
          .print-header h1 { color: #000 !important; }
          .print-header p { color: #666 !important; }
          .print-section { page-break-inside: avoid; margin-bottom: 16px; }
          .print-section h3 { color: #00695c !important; border-bottom-color: #ccc !important; }
          .print-section p { color: #333 !important; }
          .print-section .text-gray-300 { color: #333 !important; }
          .print-section .text-gray-400 { color: #555 !important; }
          .print-section .text-gray-500 { color: #777 !important; }
          .print-section .text-muted { color: #777 !important; }
          .print-section .text-teal { color: #00695c !important; }
          .print-section .text-red { color: #d32f2f !important; }
          .print-section .text-green-400 { color: #2e7d32 !important; }
          .print-section .text-white { color: #000 !important; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ccc !important; padding: 4px 8px; }
          .card, div[class*="card"] { border: 1px solid #ddd !important; background: white !important; }
        }
      `}</style>
    </div>
  );
}
