"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Membrete } from "@/components/print/Membrete";
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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p style={{ margin: '2px 0', fontSize: '9pt' }}>
      <strong>{label}:</strong> {value}
    </p>
  );
}

function HeaderPaciente({ paciente, internacion }: { paciente: CarpetaCompleta["paciente"]; internacion: CarpetaCompleta }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '4px',
      fontSize: '9pt',
      borderBottom: '1px solid #000',
      marginBottom: '12px',
      paddingBottom: '8px'
    }}>
      <div><strong>HISTORIA CLÍNICA N°:</strong> {internacion.numero}</div>
      <div><strong>N° Control:</strong> {internacion.numero}</div>
      <div><strong>Apellido y Nombres:</strong> {paciente.apellido}, {paciente.nombre}</div>
      <div><strong>D.N.I.:</strong> {paciente.dni}</div>
      <div><strong>Fecha Nac.:</strong> {new Date(paciente.fechaNac).toLocaleDateString('es-AR')}</div>
      <div><strong>Obra Social:</strong> {internacion.obraSocial?.nombre ?? 'Particular'}</div>
      <div><strong>Médico Cabecera:</strong> {internacion.medicoSolicitante ?? '—'}</div>
      <div><strong>Fecha Ingreso:</strong> {new Date(internacion.fechaIngreso).toLocaleDateString('es-AR')}</div>
    </div>
  );
}

function FormPage({ children }: { children: React.ReactNode }) {
  return <div className="page-break no-page-break">{children}</div>;
}

function FormTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: '13pt', fontWeight: 'bold', margin: '0 0 10px 0', textAlign: 'center' }}>{children}</h2>;
}

export default function ImprimirCarpetaPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CarpetaCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/internaciones/${params.internacionId}/carpeta-completa`);
        console.log('[IMPRIMIR] Status:', res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error('[IMPRIMIR] Error:', text);
          if (!cancelled) setError(`Error ${res.status}: ${res.statusText}`);
          return;
        }

        const json = await res.json();
        console.log('[IMPRIMIR] Data keys:', Object.keys(json));
        console.log('[IMPRIMIR] histClinica:', !!json.histClinica);
        console.log('[IMPRIMIR] cirugias:', Array.isArray(json.cirugias) ? `${json.cirugias.length} items` : typeof json.cirugias);
        if (json.histClinica) {
          console.log('[IMPRIMIR] HC keys:', Object.keys(json.histClinica));
          console.log('[IMPRIMIR] anamnesis:', !!json.histClinica.anamnesis);
          console.log('[IMPRIMIR] evoluciones:', Array.isArray(json.histClinica.evoluciones) ? json.histClinica.evoluciones.length : 0);
          console.log('[IMPRIMIR] prescripciones:', Array.isArray(json.histClinica.prescripciones) ? json.histClinica.prescripciones.length : 0);
          console.log('[IMPRIMIR] hojaEnfermeria:', Array.isArray(json.histClinica.hojaEnfermeria) ? json.histClinica.hojaEnfermeria.length : 0);
          console.log('[IMPRIMIR] controlesEnfermeria:', Array.isArray(json.histClinica.controlesEnfermeria) ? json.histClinica.controlesEnfermeria.length : 0);
          console.log('[IMPRIMIR] valoracionPreanestesia:', !!json.histClinica.valoracionPreanestesia);
          console.log('[IMPRIMIR] protocoloAnestesia:', !!json.histClinica.protocoloAnestesia);
          console.log('[IMPRIMIR] epicrisis:', !!json.histClinica.epicrisis);
        }

        if (!cancelled) setData(json);
      } catch (err) {
        console.error('[IMPRIMIR] Fetch error:', err);
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (params.internacionId) fetchData();
    return () => { cancelled = true; };
  }, [params.internacionId]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 text-[#00d4a1] animate-spin" />
      <span className="ml-2 text-[#94a3b8]">Cargando carpeta completa...</span>
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto mt-12 p-6">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-red-400 font-medium mb-1">Error al cargar la carpeta completa</p>
          <p className="text-red-300/70 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-red-400 underline hover:text-red-300">
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-[#6b7280] text-sm">No se encontraron datos de la internación.</p>
    </div>
  );

  const p = data.paciente;
  const hc = data.histClinica;

  return (
    <div>
      <div className="no-print space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Volver
          </button>
          <Button onClick={handlePrint}>
            <Printer size={16} /> Imprimir Carpeta
          </Button>
        </div>
      </div>

      <div className="print-only">
        {/* HOJA 1 — Informe de Hospitalización */}
        <FormPage>
          <Membrete />
          <HeaderPaciente paciente={p} internacion={data} />
          <FormTitle>INFORME DE HOSPITALIZACIÓN</FormTitle>
          <Field label="Apellido y Nombre" value={`${p.apellido}, ${p.nombre}`} />
          <Field label="DNI" value={p.dni} />
          <Field label="Sexo" value={p.sexo} />
          <Field label="Fecha de Nacimiento" value={formatDate(p.fechaNac)} />
          <Field label="Domicilio" value={p.domicilio} />
          <Field label="Localidad" value={p.localidad} />
          <Field label="Teléfono" value={p.telefono} />
          <Field label="Grupo Sanguíneo" value={p.grupoSangre} />
          {p.alergias.length > 0 && (
            <p style={{ color: '#d32f2f', fontWeight: 'bold', marginTop: '4px' }}>
              ⚠ ALERGIAS: {p.alergias.map(a => a.sustancia + (a.severidad ? ` (${a.severidad})` : '')).join(', ')}
            </p>
          )}
          <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ccc' }} />
          <Field label="N° de Internación" value={`#${data.numero}`} />
          <Field label="Fecha de Ingreso" value={formatDateTime(data.fechaIngreso)} />
          <Field label="Fecha de Egreso" value={data.fechaEgreso ? formatDateTime(data.fechaEgreso) : '—'} />
          <Field label="Tipo de Ingreso" value={data.tipoIngreso} />
          <Field label="Estado" value={data.estado} />
          <Field label="Motivo de Ingreso" value={data.motivoIngreso} />
          <Field label="Diagnóstico CIE" value={data.diagnosticoCIE} />
          <Field label="Médico Solicitante" value={data.medicoSolicitante} />
          <Field label="Cama" value={data.cama ? `${data.cama.numero} - ${data.cama.sector.nombre}` : null} />
          <Field label="Obra Social" value={data.obraSocial ? `${data.obraSocial.nombre} (${data.obraSocial.sigla})` : null} />
          {data.pases.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <strong style={{ fontSize: '9pt' }}>Pases internos:</strong>
              <ul style={{ margin: '2px 0 0 16px', fontSize: '8pt' }}>
                {data.pases.map((pase, i) => (
                  <li key={i}>
                    {formatDateTime(pase.fecha)} — {pase.camaAnterior ? `${pase.camaAnterior} → ` : ''}{pase.camaNueva} ({pase.sector})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.cargosFacturacion.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <strong style={{ fontSize: '9pt' }}>Cargos de Facturación:</strong>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginTop: '4px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '3px' }}>Concepto</th>
                    <th style={{ border: '1px solid #000', padding: '3px' }}>Cant.</th>
                    <th style={{ border: '1px solid #000', padding: '3px' }}>P.Unit.</th>
                    <th style={{ border: '1px solid #000', padding: '3px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cargosFacturacion.map((c, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #000', padding: '3px' }}>{c.concepto}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{c.cantidad}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>${Number(c.precioUnitario).toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>${Number(c.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FormPage>

        {/* HOJA 2 — Anamnesis */}
        {hc?.anamnesis && (
          <FormPage>
            <Membrete />
            <HeaderPaciente paciente={p} internacion={data} />
            <FormTitle>ANAMNESIS</FormTitle>
            <Field label="Motivo de Consulta" value={hc.anamnesis.motivoConsulta} />
            <Field label="Enfermedad Actual" value={hc.anamnesis.enfermedadActual} />
            <Field label="Antecedentes Patológicos" value={hc.anamnesis.antecPatologicos} />
            <Field label="Antecedentes Familiares" value={hc.anamnesis.antecFamiliares} />
            <Field label="Hábitos Tóxicos" value={hc.anamnesis.habitosToxicos} />
            <Field label="Factores de Riesgo CV" value={hc.anamnesis.factoresRiesgoCV} />
            <Field label="Estado General" value={hc.anamnesis.estadoGeneral} />
            <Field label="Abdomen" value={hc.anamnesis.abdomen} />
            <Field label="Diagnóstico Presuntivo" value={hc.anamnesis.diagPresuntivo} />
            <Field label="Diagnóstico Diferencial" value={hc.anamnesis.diagDiferencial} />
            <Field label="Plan de Evaluación" value={hc.anamnesis.planEvaluacion} />
            <Field label="Plan Terapéutico" value={hc.anamnesis.planTerapeutico} />
            {hc.anamnesis.firmadoAt && (
              <p style={{ color: '#2e7d32', fontSize: '8pt', marginTop: '8px' }}>
                ✍ Firmado por {hc.anamnesis.firmadoPor} — {formatDateTime(hc.anamnesis.firmadoAt)}
              </p>
            )}
          </FormPage>
        )}

        {/* HOJA 3 — Evoluciones */}
        {hc?.evoluciones && hc.evoluciones.length > 0 && (
          <FormPage>
            <Membrete />
            <HeaderPaciente paciente={p} internacion={data} />
            <FormTitle>EVOLUCIÓN MÉDICA</FormTitle>
            <p style={{ fontSize: '8pt', marginBottom: '8px' }}>
              (INGRESE FECHA Y HORA, FIRMA Y SELLO EN CADA NOTA DE EVALUACIÓN)
            </p>
            {hc.evoluciones.map((ev) => (
              <div key={ev.fecha} style={{ borderBottom: '1px solid #ccc', paddingBottom: '6px', marginBottom: '6px' }}>
                <strong style={{ fontSize: '9pt' }}>{formatDateTime(ev.fecha)} — {ev.usuario.nombre}</strong>
                <p style={{ fontSize: '9pt', margin: '2px 0', whiteSpace: 'pre-wrap' }}>{ev.contenido}</p>
              </div>
            ))}
          </FormPage>
        )}

        {/* HOJA 4 — Prescripciones */}
        {hc?.prescripciones && hc.prescripciones.length > 0 && (
          <FormPage>
            <Membrete />
            <HeaderPaciente paciente={p} internacion={data} />
            <FormTitle>PRESCRIPCIONES Y ÓRDENES MÉDICAS</FormTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '15%' }}>
                    FECHA Y HORA / FIRMA MÉDICO
                  </th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>
                    INDICACIONES MÉDICAS (Medicación - Dieta - Controles - Estudios)
                  </th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '15%' }}>
                    FIRMA ENFERMERA
                  </th>
                </tr>
              </thead>
              <tbody>
                {hc.prescripciones.map((p, i) => (
                  <tr key={i}>
                    <td style={{ border: '1px solid #000', padding: '4px', fontSize: '8pt' }}>
                      {formatDate(p.fecha)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}>
                      {i + 1}) {p.droga || p.descripcion || '—'} {p.dosis ? `${p.dosis}` : ''}{p.frecuencia ? ` ${p.frecuencia}` : ''}{p.via ? ` — ${p.via}` : ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormPage>
        )}

        {/* HOJA 5 — Hoja de Enfermería */}
        {((hc?.hojaEnfermeria && hc.hojaEnfermeria.length > 0) || (hc?.controlesEnfermeria && hc.controlesEnfermeria.length > 0)) && (
          <FormPage>
            <Membrete />
            <HeaderPaciente paciente={p} internacion={data} />
            <FormTitle>HOJA DE ENFERMERÍA</FormTitle>
            {hc?.hojaEnfermeria && hc.hojaEnfermeria.length > 0 && (
              <>
                <h3 style={{ fontSize: '10pt', fontWeight: 'bold', margin: '6px 0' }}>Medicación Administrada</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Fecha</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Sección</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Item</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Dosis</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Vía</th>
                      <th style={{ border: '1px solid #000', padding: '3px' }}>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hc.hojaEnfermeria.map((h, i) => (
                      <tr key={i}>
                        <td style={{ border: '1px solid #000', padding: '3px' }}>{formatDate(h.fecha)}</td>
                        <td style={{ border: '1px solid #000', padding: '3px' }}>{h.seccion}</td>
                        <td style={{ border: '1px solid #000', padding: '3px' }}>{h.item}</td>
                        <td style={{ border: '1px solid #000', padding: '3px' }}>{h.dosis || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '3px' }}>{h.via || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '3px' }}>
                          {h.marcasHorarias ? Object.entries(h.marcasHorarias as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k).join(', ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {hc?.controlesEnfermeria && hc.controlesEnfermeria.length > 0 && (
              <>
                <h3 style={{ fontSize: '10pt', fontWeight: 'bold', margin: '8px 0 4px 0' }}>Controles</h3>
                {hc.controlesEnfermeria.map((c, i) => (
                  <div key={i} style={{ borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '4px', fontSize: '8pt' }}>
                    <strong>{formatDate(c.fecha)} {c.hora}</strong> — {c.tipo} — {c.usuario.nombre}<br />
                    Datos: {JSON.stringify(c.datos)}{c.observacion ? ` — Obs: ${c.observacion}` : ''}
                  </div>
                ))}
              </>
            )}
          </FormPage>
        )}

        {/* HOJA 6 — Valoración Preanestésica */}
        {hc?.valoracionPreanestesia && (
          <FormPage>
            <Membrete />
            <HeaderPaciente paciente={p} internacion={data} />
            <FormTitle>VALORACIÓN PREANESTÉSICA</FormTitle>
            <Field label="Antecedentes Quirúrgicos" value={hc.valoracionPreanestesia.antecQuirurgicos} />
            <Field label="Enfermedades en Tratamiento" value={hc.valoracionPreanestesia.enfermedadesTratamiento} />
            <Field label="Laboratorio" value={hc.valoracionPreanestesia.laboratorio} />
            <Field label="Score ASA" value={hc.valoracionPreanestesia.scoreASA?.toString() || null} />
            <Field label="Anestesia Sugerida" value={hc.valoracionPreanestesia.anestesiaSugerida} />
            <Field label="Comentarios" value={hc.valoracionPreanestesia.comentarios} />
            {hc.valoracionPreanestesia.firmadaAt && (
              <p style={{ color: '#2e7d32', fontSize: '8pt', marginTop: '8px' }}>
                ✍ Firmada — {formatDateTime(hc.valoracionPreanestesia.firmadaAt)}
              </p>
            )}
          </FormPage>
        )}

        {/* HOJA 7 — Protocolo de Anestesia */}
        {hc?.protocoloAnestesia && (
          <FormPage>
            <Membrete />
            <HeaderPaciente paciente={p} internacion={data} />
            <FormTitle>PROTOCOLO DE ANESTESIA</FormTitle>
            <Field label="Fecha Inicio" value={hc.protocoloAnestesia.fechaInicio ? formatDateTime(hc.protocoloAnestesia.fechaInicio) : null} />
            <Field label="Fecha Fin" value={hc.protocoloAnestesia.fechaFin ? formatDateTime(hc.protocoloAnestesia.fechaFin) : null} />
            <Field label="Estado Psico Preop" value={hc.protocoloAnestesia.estadoPsicoPreop} />
            <Field label="Score ASA" value={hc.protocoloAnestesia.scoreASA?.toString() || null} />
            <Field label="Posición Operatoria" value={hc.protocoloAnestesia.posicionOperatoria} />
            <Field label="Sangre Perdida" value={hc.protocoloAnestesia.sangredPerdida} />
            <Field label="Diuresis Intraop" value={hc.protocoloAnestesia.diuresisIntraop?.toString() || null} />
            <Field label="Cirugía Realizada" value={hc.protocoloAnestesia.cirugiaRealizada} />
            {hc.protocoloAnestesia.drogas && hc.protocoloAnestesia.drogas.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                <strong style={{ fontSize: '9pt' }}>Drogas administradas:</strong>
                <ul style={{ margin: '2px 0 0 16px', fontSize: '8pt' }}>
                  {hc.protocoloAnestesia.drogas.map((d: any, i: number) => (
                    <li key={i}>{d.droga || d.nombre}{d.dosis ? ` — ${d.dosis}` : ''}{d.hora ? ` @${d.hora}` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {hc.protocoloAnestesia.firmadaAt && (
              <p style={{ color: '#2e7d32', fontSize: '8pt', marginTop: '8px' }}>
                ✍ Firmada — {formatDateTime(hc.protocoloAnestesia.firmadaAt)}
              </p>
            )}
          </FormPage>
        )}

        {/* HOJA 8 — Protocolo Quirúrgico */}
        {(data.cirugias?.length ?? 0) > 0 && (
          <FormPage>
            <Membrete />
            <HeaderPaciente paciente={p} internacion={data} />
            <FormTitle>PROTOCOLO QUIRÚRGICO</FormTitle>
            {data.cirugias.map((cir, i) => (
              <div key={cir.id} style={{ border: '1px solid #000', padding: '8px', marginBottom: '8px' }}>
                <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                  Cirugía #{i + 1} — QF {cir.quirofanoNumero} — {cir.estado}
                </p>
                <p style={{ fontSize: '8pt', margin: '0 0 4px 0' }}>
                  {formatDate(cir.fechaProgramada)} {cir.horaProgramada}
                </p>
                <Field label="Procedimiento" value={cir.procedimiento} />
                <Field label="Diagnóstico Preop" value={cir.diagnosticoPreop} />
                <Field label="Diagnóstico Postop" value={cir.diagnosticoPostop} />
                <Field label="Hallazgos" value={cir.hallazgos} />
                <Field label="Horario" value={cir.horaInicio && cir.horaFin ? `${cir.horaInicio} — ${cir.horaFin}` : null} />
                {cir.implantes.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <strong style={{ fontSize: '8pt' }}>Implantes:</strong>
                    <ul style={{ margin: '2px 0 0 16px', fontSize: '8pt' }}>
                      {cir.implantes.map((imp, j) => (
                        <li key={j}>
                          {imp.nombre} ({imp.codigo}){imp.lote ? ` — Lote: ${imp.lote}` : ''}{imp.codigoCE ? ` — CE: ${imp.codigoCE}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </FormPage>
        )}

        {/* HOJA 9 — Epicrisis (última, sin page-break) */}
        {hc?.epicrisis && (
          <div className="no-page-break">
            <Membrete />
            <HeaderPaciente paciente={p} internacion={data} />
            <FormTitle>EPICRISIS / INFORME DE ALTA</FormTitle>
            <Field label="Diagnóstico de Ingreso" value={hc.epicrisis.diagIngreso} />
            <Field label="Diagnóstico de Egreso" value={hc.epicrisis.diagEgreso} />
            {hc.epicrisis.codigosCIE.length > 0 && (
              <p style={{ fontSize: '9pt' }}><strong>Códigos CIE:</strong> {hc.epicrisis.codigosCIE.join(', ')}</p>
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
              <p style={{ color: '#2e7d32', fontSize: '8pt', marginTop: '8px' }}>
                ✍ Firmada — {formatDateTime(hc.epicrisis.firmadaAt)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
