"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Activity, Pill, Syringe,
  Stethoscope, Thermometer, ClipboardList, BookOpen, Printer, AlertCircle, Loader2, CalendarPlus
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface PacienteInfo {
  id: string; nombre: string; apellido: string; dni: string;
  fechaNac?: string; sexo?: string;
}

interface InternacionCompleta {
  id: string;
  numero: number;
  paciente: PacienteInfo;
  cama?: { numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
  fechaIngreso: string;
  estado: string;
  motivoIngreso?: string;
  diagnosticoCIE?: string;
  medicoSolicitante?: string;
  tipoIngreso?: string;
}

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
}

const tabs = [
  { id: "anamnesis", label: "Anamnesis", icon: FileText },
  { id: "evolucion", label: "Evolución", icon: Activity },
  { id: "prescripciones", label: "Prescripciones", icon: Pill },
  { id: "enfermeria", label: "Enfermería", icon: Syringe },
  { id: "preanestesia", label: "Preanestesia", icon: Stethoscope },
  { id: "protocolo-anestesia", label: "Protocolo Anestesia", icon: Thermometer },
  { id: "protocolo-quirurgico", label: "Protocolo Quirúrgico", icon: ClipboardList },
  { id: "epicrisis", label: "Epicrisis", icon: BookOpen },
];

function generarHTMLCarpeta(data: any): string {
  const paciente = data.paciente
  const hc = data.histClinica

  const membrete = `
    <div style="display:flex;align-items:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:16px">
      <span style="font-size:24px;margin-right:12px">✚</span>
      <div>
        <div style="font-size:16pt;font-weight:bold">SANATORIO SIMES</div>
        <div style="font-size:9pt">Córdoba N° 2344 — Posadas, Misiones | Tel: 03765-430280 / 430283</div>
      </div>
    </div>
  `

  const headerPaciente = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9pt;border-bottom:1px solid #000;margin-bottom:12px;padding-bottom:8px">
      <div><strong>HISTORIA CLÍNICA N°:</strong> ${data.numero}</div>
      <div><strong>N° Control:</strong> ${data.numero}</div>
      <div><strong>Apellido y Nombres:</strong> ${paciente.apellido}, ${paciente.nombre}</div>
      <div><strong>D.N.I.:</strong> ${paciente.dni}</div>
      <div><strong>Fecha Nac.:</strong> ${new Date(paciente.fechaNac).toLocaleDateString('es-AR')}</div>
      <div><strong>Obra Social:</strong> ${data.obraSocial?.nombre ?? 'Particular'}</div>
      <div><strong>Médico:</strong> ${data.medicoSolicitante ?? '—'}</div>
      <div><strong>Ingreso:</strong> ${new Date(data.fechaIngreso).toLocaleDateString('es-AR')}</div>
    </div>
  `

  const pageBreak = `<div style="page-break-after:always"></div>`

  let html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<title>Carpeta Completa — ${paciente.apellido}, ${paciente.nombre}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; background: #fff; margin: 0; padding: 0; }
  @page { margin: 1.5cm 2cm; size: A4 portrait; }
  @media print { body { -webkit-print-color-adjust: exact; } }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 6px; font-size: 9pt; }
  th { background: #f0f0f0; font-weight: bold; }
  h2 { text-align: center; font-size: 14pt; margin: 12px 0; text-transform: uppercase; }
  .section { margin-bottom: 12px; font-size: 9pt; }
  .field { margin-bottom: 6px; }
  .field strong { display: inline-block; min-width: 180px; }
</style>
</head>
<body>
`

  // HOJA 1 — Informe de Hospitalización
  html += `
    <div>
      ${membrete}
      ${headerPaciente}
      <h2>INFORME DE HOSPITALIZACIÓN</h2>
      <div class="section">
        <div class="field"><strong>Apellido y Nombre:</strong> ${paciente.apellido}, ${paciente.nombre}</div>
        <div class="field"><strong>DNI:</strong> ${paciente.dni}</div>
        <div class="field"><strong>Sexo:</strong> ${paciente.sexo}</div>
        <div class="field"><strong>Fecha de Nacimiento:</strong> ${new Date(paciente.fechaNac).toLocaleDateString('es-AR')}</div>
        <div class="field"><strong>Domicilio:</strong> ${paciente.domicilio ?? '—'}</div>
        <div class="field"><strong>Localidad:</strong> ${paciente.localidad ?? '—'}</div>
        <div class="field"><strong>Teléfono:</strong> ${paciente.telefono ?? '—'}</div>
        ${paciente.alergias?.length > 0 ? `<div class="field" style="color:red"><strong>⚠ ALERGIAS:</strong> ${paciente.alergias.map((a: any) => a.sustancia).join(', ')}</div>` : ''}
      </div>
      <div class="section">
        <div class="field"><strong>N° de Internación:</strong> ${data.numero}</div>
        <div class="field"><strong>Fecha de Ingreso:</strong> ${new Date(data.fechaIngreso).toLocaleString('es-AR')}</div>
        <div class="field"><strong>Tipo de Ingreso:</strong> ${data.tipoIngreso}</div>
        <div class="field"><strong>Motivo:</strong> ${data.motivoIngreso ?? '—'}</div>
        <div class="field"><strong>Diagnóstico CIE:</strong> ${data.diagnosticoCIE ?? '—'}</div>
        <div class="field"><strong>Médico Solicitante:</strong> ${data.medicoSolicitante ?? '—'}</div>
        <div class="field"><strong>Cama:</strong> ${data.cama ? data.cama.numero + ' - ' + (data.cama.sector?.nombre ?? '') : '—'}</div>
        <div class="field"><strong>Obra Social:</strong> ${data.obraSocial?.nombre ?? 'Particular'}</div>
        <div class="field"><strong>Estado:</strong> ${data.estado}</div>
      </div>
    </div>
    ${pageBreak}
  `

  // HOJA 2 — Anamnesis
  if (hc?.anamnesis) {
    const a = hc.anamnesis
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>ANAMNESIS</h2>
        <table>
          <tbody>
            ${[
              ['Motivo de Consulta', a.motivoConsulta],
              ['Enfermedad Actual', a.enfermedadActual],
              ['Antec. Patológicos', a.antecPatologicos],
              ['Antec. Familiares', a.antecFamiliares],
              ['Hábitos Tóxicos', a.habitosToxicos],
              ['Factores de Riesgo CV', a.factoresRiesgoCV],
              ['Otros', a.otros],
            ].map(([label, val]) => `
              <tr>
                <td style="font-weight:bold;width:35%;vertical-align:top">${label}</td>
                <td style="vertical-align:top;min-height:40px;white-space:pre-wrap">${val || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <br>
        <strong>EXAMEN FÍSICO</strong>
        <table style="margin-top:8px">
          <tbody>
            ${[
              ['Estado General', a.estadoGeneral],
              ['Signos Vitales Ingreso', a.signosVitalesIngreso ? JSON.stringify(a.signosVitalesIngreso) : null],
              ['Piel y Faneras', a.pielFaneras],
              ['Cabeza y Cuello', a.cabezaCuello],
              ['Tórax', a.torax],
              ['Ap. Respiratorio', a.apRespiratorio],
              ['Ap. Cardiovascular', a.apCardiovascular],
              ['Abdomen', a.abdomen],
              ['Sistema Nervioso', a.sNervioso],
              ['Extremidades', a.extremidades],
            ].map(([label, val]) => `
              <tr>
                <td style="font-weight:bold;width:35%;vertical-align:top">${label}</td>
                <td style="vertical-align:top;white-space:pre-wrap">${val || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;font-size:9pt;white-space:pre-wrap">
          <div><strong>Diag. Presuntivo:</strong><br>${a.diagPresuntivo || '—'}</div>
          <div><strong>Diag. Diferencial:</strong><br>${a.diagDiferencial || '—'}</div>
          <div><strong>Plan de Evaluación:</strong><br>${a.planEvaluacion || '—'}</div>
          <div><strong>Plan Terapéutico:</strong><br>${a.planTerapeutico || '—'}</div>
        </div>
      </div>
      ${pageBreak}
    `
  }

  // HOJA 3 — Evoluciones
  if (hc?.evoluciones?.length > 0) {
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>EVOLUCIÓN MÉDICA</h2>
        <p style="font-size:8pt;text-align:center;font-style:italic;margin-bottom:12px">INGRESE FECHA Y HORA, FIRMA Y SELLO EN CADA NOTA DE EVALUACIÓN</p>
        <div style="border:1px solid #000;min-height:600px;padding:12px">
          ${hc.evoluciones.map((ev: any, i: number) => `
            <div style="${i < hc.evoluciones.length - 1 ? 'border-bottom:1px dashed #ccc;' : ''}padding-bottom:16px;margin-bottom:16px">
              <div style="font-weight:bold;font-size:9pt;margin-bottom:4px">
                ${new Date(ev.fecha).toLocaleDateString('es-AR')} — ${new Date(ev.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                ${ev.usuario ? ' — ' + ev.usuario.nombre : ''}
              </div>
              <div style="font-size:10pt;line-height:1.8;white-space:pre-wrap">${ev.contenido || '—'}</div>
              <div style="margin-top:12px;font-size:8pt">Firma y Sello: _______________________________</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${pageBreak}
    `
  }

  // HOJA 4 — Prescripciones
  if (hc?.prescripciones?.length > 0) {
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>PRESCRIPCIONES Y ÓRDENES MÉDICAS</h2>
        <table>
          <thead>
            <tr>
              <th style="width:20%">FECHA Y HORA<br>FIRMA DEL MÉDICO</th>
              <th>INDICACIONES MÉDICAS</th>
              <th style="width:15%">FIRMA DE LA<br>ENFERMERA</th>
            </tr>
          </thead>
          <tbody>
            ${hc.prescripciones.map((p: any, i: number) => `
              <tr>
                <td style="vertical-align:top;font-size:8pt">${new Date(p.fecha).toLocaleDateString('es-AR')}</td>
                <td style="vertical-align:top">
                  ${i + 1}) ${p.droga || p.descripcion || p.tipo}
                  ${p.dosis ? ' — ' + p.dosis : ''}
                  ${p.frecuencia ? ' — ' + p.frecuencia : ''}
                  ${p.via ? ' — Vía ' + p.via : ''}
                  ${p.duracion ? ' — ' + p.duracion : ''}
                  <span style="font-size:8pt;color:#666"> [${p.estado}]</span>
                </td>
                <td></td>
              </tr>
            `).join('')}
            ${Array.from({ length: Math.max(0, 8 - hc.prescripciones.length) }).map(() => `<tr><td style="height:28px"></td><td></td><td></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${pageBreak}
    `
  }

  // HOJA 5 — Hoja de Enfermería (Controles)
  if (hc?.controlesEnfermeria?.length > 0) {
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>HOJA DE ENFERMERÍA</h2>
        <table>
          <thead>
            <tr><th>FECHA</th><th>HORA</th><th>T/A</th><th>P</th><th>R</th><th>T°</th><th>SatO2</th><th>INGRESOS</th><th>EGRESOS</th><th>OBSERVACIONES</th><th>FIRMA</th></tr>
          </thead>
          <tbody>
            ${hc.controlesEnfermeria.map((ctrl: any) => {
              const d = ctrl.datos || {}
              return `<tr>
                <td>${new Date(ctrl.fecha).toLocaleDateString('es-AR')}</td>
                <td>${ctrl.hora}</td>
                <td>${d.TA ?? (d.ta_s ? d.ta_s + '/' + d.ta_d : '')}</td>
                <td>${d.FC ?? d.fc ?? ''}</td>
                <td>${d.FR ?? d.fr ?? ''}</td>
                <td>${d.Temp ?? d.temp ?? ''}</td>
                <td>${d.SatO2 ?? d.sato2 ?? ''}</td>
                <td></td><td></td>
                <td style="font-size:8pt">${ctrl.observacion ?? ''}</td>
                <td></td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
      ${pageBreak}
    `
  }

  // HOJA 6 — Protocolo Quirúrgico
  if (data.cirugias?.length > 0) {
    for (const cir of data.cirugias) {
      html += `
        <div>
          ${membrete}
          ${headerPaciente}
          <h2>PROTOCOLO QUIRÚRGICO</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9pt;margin-bottom:12px">
            <div><strong>Cirujano:</strong> ${cir.cirujanoId ?? '—'}</div>
            <div><strong>Anestesiólogo:</strong> ${cir.anestesiologoId ?? '—'}</div>
            <div><strong>Instrumentador:</strong> ${cir.instrumentadorId ?? '—'}</div>
            <div><strong>Circulante:</strong> ${cir.circulante ?? '—'}</div>
          </div>
          <table style="margin-bottom:12px">
            <tr><th>Fecha</th><th>Inicio</th><th>Fin</th><th>Tipo</th></tr>
            <tr>
              <td>${new Date(cir.fechaProgramada).toLocaleDateString('es-AR')}</td>
              <td>${cir.horaInicio ?? '—'}</td>
              <td>${cir.horaFin ?? '—'}</td>
              <td>${cir.tipo}</td>
            </tr>
          </table>
          <div style="font-size:9pt;margin-bottom:6px"><strong>Diagnóstico Preoperatorio:</strong> ${cir.diagnosticoPreop ?? '—'}</div>
          <div style="font-size:9pt;margin-bottom:6px"><strong>Diagnóstico Postoperatorio:</strong> ${cir.diagnosticoPostop ?? '—'}</div>
          <div style="font-size:9pt;margin-bottom:6px"><strong>Procedimiento:</strong> ${cir.procedimiento ?? '—'}</div>
          <div style="font-size:9pt;margin-top:12px"><strong>Hallazgos:</strong>
            <div style="border:1px solid #000;min-height:180px;padding:8px;margin-top:4px;white-space:pre-wrap;line-height:1.8;font-size:10pt">${cir.hallazgos ?? ''}</div>
          </div>
          <div style="margin-top:24px;display:flex;justify-content:flex-end">
            <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:4px;font-size:9pt">Firma del Cirujano</div>
          </div>
        </div>
        ${pageBreak}
      `
    }
  }

  // HOJA 7 — Epicrisis (última, sin pageBreak)
  if (hc?.epicrisis) {
    const ep = hc.epicrisis
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>EPICRISIS / INFORME DE ALTA</h2>
        <div style="font-size:9pt;display:flex;flex-direction:column;gap:10px">
          <div><strong>Diagnóstico de Ingreso:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:24px">${ep.diagIngreso ?? '—'}</div></div>
          <div><strong>Diagnóstico de Egreso:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:24px">${ep.diagEgreso ?? '—'}</div></div>
          <div><strong>Resumen Clínico:</strong><div style="border:1px solid #000;min-height:80px;padding:6px;white-space:pre-wrap;line-height:1.6">${ep.resumenClinico ?? ''}</div></div>
          <div><strong>Estudios Realizados:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:40px">${ep.estudiosRealizados ?? ''}</div></div>
          <div><strong>Tratamientos Realizados:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:40px">${ep.tratamientosRealizados ?? ''}</div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div><strong>Próximo control:</strong><div style="border-bottom:1px solid #000;padding:4px">${ep.proximoControlFecha ? new Date(ep.proximoControlFecha).toLocaleDateString('es-AR') : '—'}</div></div>
            <div><strong>Lugar:</strong><div style="border-bottom:1px solid #000;padding:4px">${ep.proximoControlLugar ?? '—'}</div></div>
            <div><strong>Médico:</strong><div style="border-bottom:1px solid #000;padding:4px">${ep.proximoControlMedico ?? '—'}</div></div>
          </div>
          <div><strong>Pendiente:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:24px">${ep.pendiente ?? ''}</div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><strong>Condición al egreso:</strong> ${ep.condicionEgreso ?? '—'}</div>
            <div><strong>Destino:</strong> ${ep.destino ?? '—'}</div>
          </div>
          ${ep.medicacionAlta?.length > 0 ? `
            <div><strong>Medicación al Alta:</strong>
              <table style="margin-top:4px">
                <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead>
                <tbody>${ep.medicacionAlta.map((m: any) => `<tr><td>${m.droga}</td><td>${m.dosis}</td><td>${m.frecuencia}</td><td>${m.duracion}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          ` : ''}
          <div><strong>Indicaciones al Alta:</strong><div style="border:1px solid #000;min-height:60px;padding:6px;white-space:pre-wrap">${ep.indicacionesAlta ?? ''}</div></div>
        </div>
        <div style="margin-top:32px;display:flex;justify-content:space-between">
          <div style="text-align:center;width:180px;border-top:1px solid #000;padding-top:4px;font-size:9pt">Firma</div>
          <div style="text-align:center;width:180px;border-top:1px solid #000;padding-top:4px;font-size:9pt">Sello</div>
          <div style="text-align:center;width:180px;border-top:1px solid #000;padding-top:4px;font-size:9pt">Fecha</div>
        </div>
      </div>
    `
  }

  html += `</body></html>`
  return html
}

export default function HistoriaClinicaPage() {
  const params = useParams();
  const router = useRouter();
  const [internacion, setInternacion] = useState<InternacionCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCirugiaModal, setShowCirugiaModal] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cirugiaForm, setCirugiaForm] = useState({
    fechaProgramada: new Date().toISOString().split("T")[0],
    horaProgramada: "08:00",
    quirofanoNumero: 1,
    tipo: "PROGRAMADA" as const,
    cirujanoId: "",
    anestesiologoId: "",
    procedimiento: "",
    diagnosticoPreop: "",
  });
  const [savingCirugia, setSavingCirugia] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/internaciones/${params.internacionId}`);
        console.log('[HC] GET /api/internaciones status:', res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error('[HC] Error response:', text);
          if (!cancelled) setError(`Error ${res.status}: ${res.statusText}`);
          return;
        }

        const json = await res.json();
        console.log('[HC] Data recibida:', json?.paciente?.apellido, json?.paciente?.nombre);
        if (!cancelled) setInternacion(json);
      } catch (err) {
        console.error('[HC] Fetch error:', err);
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (params.internacionId) fetchData();
    return () => { cancelled = true; };
  }, [params.internacionId]);

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((d) => setUsuarios(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handleCrearCirugia = async () => {
    setSavingCirugia(true);
    try {
      const res = await fetch("/api/quirofano/cirugias/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cirugiaForm,
          internacionId: params.internacionId,
          quirofanoNumero: Number(cirugiaForm.quirofanoNumero),
        }),
      });
      if (res.ok) {
        setShowCirugiaModal(false);
        router.push("/quirofano");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCirugia(false);
    }
  };

  const imprimirCarpeta = async () => {
    try {
      const res = await fetch(`/api/internaciones/${params.internacionId}/carpeta-completa`);
      if (!res.ok) { console.error('Error fetching carpeta:', res.status); return; }
      const data = await res.json();
      const html = generarHTMLCarpeta(data);
      const ventana = window.open('', '_blank', 'width=800,height=600');
      if (!ventana) { alert('Permitir ventanas emergentes para imprimir'); return; }
      ventana.document.write(html);
      ventana.document.close();
      ventana.onload = () => { ventana.print(); };
    } catch (err) {
      console.error('Error al imprimir:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 text-[#00d4a1] animate-spin" />
        <span className="ml-3 text-[#94a3b8]">Cargando historia clínica...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-400 font-medium mb-1">Error al cargar la historia clínica</p>
            <p className="text-red-300/70 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-red-400 underline hover:text-red-300"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!internacion) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-[#6b7280]">Internación no encontrada.</p>
      </div>
    );
  }

  const p = internacion.paciente;
  if (!p) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-[#6b7280]">La internación no tiene datos de paciente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#6b7280] hover:text-[#f1f5f9] transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCirugiaModal(true)}
            variant="secondary"
            size="sm"
          >
            <CalendarPlus size={14} /> Programar Cirugía
          </Button>
          <Button
            onClick={imprimirCarpeta}
            size="sm"
          >
            <Printer size={14} /> Imprimir Carpeta
          </Button>
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#1e2535] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00d4a1]/20 flex items-center justify-center text-[#00d4a1] font-medium shrink-0">
            {(p.nombre?.[0] || '?')}{(p.apellido?.[0] || '?')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#f1f5f9] font-medium truncate">
              {p.apellido}, {p.nombre}
            </p>
            <p className="text-[#6b7280] text-xs">
              DNI: {p.dni} | Internación #{internacion.numero}
              {internacion.cama && <> | Cama: {internacion.cama.numero} - {internacion.cama.sector.nombre}</>}
            </p>
          </div>
          <Badge variant={internacion.estado === "ACTIVA" ? "success" : "default"}>
            {internacion.estado}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/historia-clinica/${params.internacionId}/${tab.id}`)}
              className="bg-[#161b27] border border-[#1e2535] rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[#00d4a1]/30 transition-colors"
            >
              <Icon size={24} className="text-[#00d4a1]" />
              <span className="text-sm text-[#f1f5f9] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <Modal open={showCirugiaModal} onClose={() => setShowCirugiaModal(false)} title="Programar Cirugía" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Fecha</label>
              <input
                type="date"
                value={cirugiaForm.fechaProgramada}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, fechaProgramada: e.target.value })}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Hora</label>
              <input
                type="time"
                value={cirugiaForm.horaProgramada}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, horaProgramada: e.target.value })}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Quirófano N°</label>
              <input
                type="number"
                min={1}
                max={20}
                value={cirugiaForm.quirofanoNumero}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, quirofanoNumero: Number(e.target.value) })}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Tipo</label>
              <select
                value={cirugiaForm.tipo}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, tipo: e.target.value as any })}
                className="input-field text-sm w-full"
              >
                <option value="PROGRAMADA">Programada</option>
                <option value="URGENCIA">Urgencia</option>
                <option value="EMERGENCIA">Emergencia</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Cirujano</label>
              <select
                value={cirugiaForm.cirujanoId}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, cirujanoId: e.target.value })}
                className="input-field text-sm w-full"
              >
                <option value="">Seleccionar...</option>
                {usuarios.filter((u) => u.rol === "MEDICO").map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Anestesiólogo</label>
              <select
                value={cirugiaForm.anestesiologoId}
                onChange={(e) => setCirugiaForm({ ...cirugiaForm, anestesiologoId: e.target.value })}
                className="input-field text-sm w-full"
              >
                <option value="">Seleccionar...</option>
                {usuarios.filter((u) => u.rol === "ANESTESIOLOGO").map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Procedimiento</label>
            <input
              type="text"
              value={cirugiaForm.procedimiento}
              onChange={(e) => setCirugiaForm({ ...cirugiaForm, procedimiento: e.target.value })}
              className="input-field text-sm w-full"
              placeholder="Descripción del procedimiento"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Diagnóstico Preoperatorio</label>
            <input
              type="text"
              value={cirugiaForm.diagnosticoPreop}
              onChange={(e) => setCirugiaForm({ ...cirugiaForm, diagnosticoPreop: e.target.value })}
              className="input-field text-sm w-full"
              placeholder="Diagnóstico preoperatorio"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCirugiaModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearCirugia} disabled={savingCirugia}>
              {savingCirugia ? "Creando..." : "Programar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
