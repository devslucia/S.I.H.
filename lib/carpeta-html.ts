// Renderizado a HTML imprimible de la carpeta de historia clínica.
// Movido fuera de la página para mantenerla legible.

export interface Usuario {
  id: string;
  nombre: string;
  rol: string;
}

export interface Quirofano {
  id: string;
  nombre: string;
  numero: number;
}

export interface DatosCarpeta {
  numero: number;
  paciente: {
    apellido: string;
    nombre: string;
    dni: string;
    sexo?: string | null;
    fechaNac: string;
    domicilio?: string | null;
    localidad?: string | null;
    telefono?: string | null;
    alergias: { sustancia: string }[];
  };
  tipoIngreso?: string | null;
  motivoIngreso?: string | null;
  diagnosticoCIE?: string | null;
  medicoSolicitante?: string | null;
  fechaIngreso: string;
  estado: string;
  cama?: { numero: string; sector?: { nombre: string } | null } | null;
  obraSocial?: { nombre?: string } | null;
  pases?: PaseCarpeta[];
  cirugias?: CirugiaCarpeta[];
  interconsultas?: InterconsultaCarpeta[];
  histClinica?: HistClinicaCarpeta | null;
}

export interface InterconsultaCarpeta {
  id: string;
  especialidad: string;
  motivo: string;
  estado: string;
  createdAt: string;
  medicoSolicitante?: { id?: string; nombre?: string | null; apellido?: string | null } | null;
  especialista?: { id?: string; nombre?: string | null; apellido?: string | null; especialidad?: string | null } | null;
}

export interface PaseCarpeta {
  fecha: string;
  origen?: string | null;
  destino?: string | null;
  medico?: string | null;
  observacion?: string | null;
}

export interface CirugiaCarpeta {
  cirujanoId?: string | null;
  anestesiologoId?: string | null;
  instrumentadorId?: string | null;
  circulante?: string | null;
  quirofano?: { nombre?: string } | null;
  estado: string;
  fechaProgramada: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  tipo: string;
  diagnosticoPreop?: string | null;
  diagnosticoPostop?: string | null;
  procedimiento?: string | null;
  hallazgos?: string | null;
  implantes?: ImplanteCarpeta[];
  medicamentos?: MedicamentoCarpeta[];
  practicas?: PracticaCarpeta[];
}

export interface ImplanteCarpeta {
  nombre?: string | null;
  codigo?: string | null;
  lado?: string | null;
  lote?: string | null;
  codigoCE?: string | null;
}

export interface MedicamentoCarpeta {
  nombre?: string | null;
  cantidad?: number | string | null;
  via?: string | null;
  horaAplicacion?: string | null;
}

export interface PracticaCarpeta {
  nombre?: string | null;
  codigo?: string | null;
  cantidad?: number | string | null;
}

export interface HistClinicaCarpeta {
  anamnesis?: AnamnesisCarpeta | null;
  evoluciones?: EvolucionCarpeta[];
  prescripciones?: PrescripcionCarpeta[];
  controlesEnfermeria?: ControlEnfermeriaCarpeta[];
  hojaEnfermeria?: HojaEnfermeriaCarpeta[];
  valoracionPreanestesia?: ValoracionPreanestesiaCarpeta | null;
  protocoloAnestesia?: ProtocoloAnestesiaCarpeta | null;
  epicrisis?: EpicrisisCarpeta | null;
}

export interface AnamnesisCarpeta {
  motivoConsulta?: string | null;
  enfermedadActual?: string | null;
  antecPatologicos?: string | null;
  antecFamiliares?: string | null;
  habitosToxicos?: string | null;
  factoresRiesgoCV?: string | null;
  otros?: string | null;
  estadoGeneral?: string | null;
  signosVitalesIngreso?: string | Record<string, string | number>;
  pielFaneras?: string | null;
  cabezaCuello?: string | null;
  torax?: string | null;
  apRespiratorio?: string | null;
  apCardiovascular?: string | null;
  abdomen?: string | null;
  snervioso?: string | null;
  extremidades?: string | null;
  diagPresuntivo?: string | null;
  diagDiferencial?: string | null;
  planEvaluacion?: string | null;
  planTerapeutico?: string | null;
}

export interface EvolucionCarpeta {
  fecha: string;
  contenido?: string | null;
  usuario?: { nombre?: string } | null;
}

export interface PrescripcionCarpeta {
  fecha: string;
  droga?: string | null;
  descripcion?: string | null;
  tipo?: string | null;
  dosis?: string | null;
  frecuencia?: string | null;
  via?: string | null;
  duracion?: string | null;
  estado?: string | null;
}

export interface ControlEnfermeriaCarpeta {
  fecha: string;
  hora?: string | null;
  datos?: {
    TA?: string | null;
    ta_s?: string | null;
    ta_d?: string | null;
    FC?: string | null;
    fc?: string | null;
    FR?: string | null;
    fr?: string | null;
    Temp?: string | null;
    temp?: string | null;
    SatO2?: string | null;
    sato2?: string | null;
    ingresos?: string | null;
    egresos?: string | null;
  };
  observacion?: string | null;
}

export interface HojaEnfermeriaCarpeta {
  fecha: string;
  seccion?: string | null;
  item?: string | null;
  stockItem?: { nombre?: string } | null;
  dosis?: string | null;
  via?: string | null;
  marcasHorarias?: string | null;
}

export interface ValoracionPreanestesiaCarpeta {
  antecQuirurgicos?: string | null;
  enfermedadesTratamiento?: string | null;
  laboratorio?: string | null;
  scoreASA?: number | null;
  anestesiaSugerida?: string | null;
  comentarios?: string | null;
}

export interface ProtocoloAnestesiaCarpeta {
  anestesiologo?: string | null;
  matriculaAnestesiologo?: string | null;
  cirujano?: string | null;
  matriculaCirujano?: string | null;
  ayudantes?: string | null;
  fechaCirugia?: string | null;
  alergiaDetalle?: string | null;
  clasificacionASA?: string | null;
  ayunoSolidos?: number | null;
  ayunoLiquidos?: number | null;
  estadoPsiquico?: string | null;
  mallampati?: string | null;
  distTiromentoniana?: number | null;
  aperturaBucal?: number | null;
  peso?: number | null;
  talla?: number | null;
  tecnicaAnestesia?: string[] | string | null;
  viaInduccion?: string | null;
  manejoViaAerea?: string | null;
  nroTubo?: string | null;
  dificultadViaAerea?: boolean | null;
  detalleViaAerea?: string | null;
  modalidadVentilatoria?: string | null;
  fio2?: number | null;
  premedicacion?: PremedicacionCarpeta[];
  signosVitaPreop?: SignosVitaPreopCarpeta | null;
  drogas?: DrogaCarpeta[];
  signosVitales?: SignoVitalIntraCarpeta[];
  posicionOperatoria?: string | null;
  diuresis?: number | null;
  perdidaSanguinea?: string | null;
  perdidaSanguineaML?: number | null;
  otrosEgresos?: string | null;
  sondaNasogastrica?: boolean;
  sondaVesical?: boolean;
  tipoCirugia?: string | null;
  liquidosIngresados?: LiquidoIngresadoCarpeta[];
  estadoEgreso?: string[] | string | null;
  destinoPaciente?: string | null;
  observaciones?: string | null;
}

export interface PremedicacionCarpeta {
  droga?: string | null;
  dosis?: string | null;
  via?: string | null;
  hora?: string | null;
}

export interface SignosVitaPreopCarpeta {
  pas?: string | null;
  pad?: string | null;
  fc?: string | null;
  fr?: string | null;
  temp?: string | null;
}

export interface DrogaCarpeta {
  categoria?: string | null;
  nombre?: string | null;
  dosis?: string | number | null;
  unidad?: string | null;
  via?: string | null;
  horaAdministracion?: string | null;
}

export interface SignoVitalIntraCarpeta {
  minuto?: string | null;
  pas?: string | number | null;
  pad?: string | number | null;
  fc?: string | number | null;
  fr?: string | number | null;
  temp?: string | number | null;
  spo2?: string | number | null;
  etco2?: string | number | null;
}

export interface LiquidoIngresadoCarpeta {
  tipo?: string | null;
  volumen?: string | number | null;
  ml?: string | number | null;
  lote?: string | null;
}

export interface EpicrisisCarpeta {
  diagIngreso?: string | null;
  diagEgreso?: string | null;
  codigosCIE?: string | null;
  resumenClinico?: string | null;
  estudiosRealizados?: string | null;
  tratamientosRealizados?: string | null;
  proximoControlFecha?: string | null;
  proximoControlLugar?: string | null;
  proximoControlMedico?: string | null;
  pendiente?: string | null;
  condicionEgreso?: string | null;
  destino?: string | null;
  medicacionAlta?: MedicacionAltaCarpeta[];
  indicacionesAlta?: string | null;
}

export interface MedicacionAltaCarpeta {
  droga?: string | null;
  dosis?: string | null;
  frecuencia?: string | null;
  duracion?: string | null;
}


export function generarHTMLCarpeta(data: DatosCarpeta, usuarios: Usuario[]): string {
  const paciente = data.paciente
  const hc = data.histClinica
  const pases = data.pases ?? []
  const cirugias = data.cirugias ?? []
  const anamnesis = hc?.anamnesis ?? null
  const evoluciones = hc?.evoluciones ?? []
  const prescripciones = hc?.prescripciones ?? []
  const controlesEnfermeria = hc?.controlesEnfermeria ?? []
  const hojasEnfermeria = hc?.hojaEnfermeria ?? []
  const valoracionPreanestesia = hc?.valoracionPreanestesia ?? null
  const protocoloAnestesia = hc?.protocoloAnestesia ?? null
  const epicrisis = hc?.epicrisis ?? null

  const resolveUser = (id: string | null | undefined): string => {
    if (!id) return '—'
    const u = usuarios.find((u) => u.id === id)
    return u ? u.nombre : id
  }

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
      <div style="font-weight:bold">S.I.H. — CARPETA CLÍNICA</div>
      <div style="text-align:right">Impreso: ${new Date().toLocaleString('es-AR')}</div>
      <div><strong>HISTORIA CLÍNICA N°:</strong> ${data.numero}</div>
      <div><strong>N° Control:</strong> ${data.numero}</div>
      <div><strong>Apellido y Nombres:</strong> ${paciente.apellido}, ${paciente.nombre}</div>
      <div><strong>D.N.I.:</strong> ${paciente.dni}</div>
      <div><strong>Fecha Nac.:</strong> ${new Date(paciente.fechaNac).toLocaleDateString('es-AR')}</div>
      <div><strong>Obra Social:</strong> ${data.obraSocial?.nombre ?? 'Particular'}</div>
      <div><strong>Médico:</strong> ${data.medicoSolicitante ?? '—'}</div>
      <div><strong>Ingreso:</strong> ${new Date(data.fechaIngreso).toLocaleDateString('es-AR')}</div>
      ${(paciente.alergias?.length ?? 0) > 0 ? `
        <div style="grid-column:1 / -1;margin-top:4px;border:1px solid #d32f2f;background:#fff5f5;color:#d32f2f;padding:4px 6px;font-weight:bold">
          ⚠ ALERGIAS: ${paciente.alergias.map((a) => a.sustancia).join(' · ')}
        </div>
      ` : ''}
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
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 6px; font-size: 9pt; }
  th { background: #f0f0f0; font-weight: bold; }
  h2 { text-align: center; font-size: 14pt; margin: 12px 0; text-transform: uppercase; }
  .section { margin-bottom: 12px; font-size: 9pt; }
  .field { margin-bottom: 6px; }
  .field strong { display: inline-block; min-width: 180px; }
  .no-break { page-break-inside: avoid; }
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
        ${paciente.alergias?.length > 0 ? `<div class="field" style="color:red"><strong>⚠ ALERGIAS:</strong> ${paciente.alergias.map((a) => a.sustancia).join(', ')}</div>` : ''}
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
      ${pases.length > 0 ? `
        <div class="section" style="margin-top:12px">
          <strong>PASES INTERNOS</strong>
          <table style="margin-top:6px">
            <thead><tr><th>Fecha</th><th>Origen</th><th>Destino</th><th>Médico</th><th>Observación</th></tr></thead>
            <tbody>${pases.map((p) => `<tr>
              <td>${new Date(p.fecha).toLocaleDateString('es-AR')}</td>
              <td>${p.origen ?? '—'}</td>
              <td>${p.destino ?? '—'}</td>
              <td>${p.medico ?? '—'}</td>
              <td>${p.observacion ?? ''}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      ` : ''}
    </div>
    ${pageBreak}
  `

  // HOJA 2 — Anamnesis
  if (anamnesis) {
    const a = anamnesis
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
              ['Signos Vitales Ingreso', a.signosVitalesIngreso ? (typeof a.signosVitalesIngreso === 'object' ? Object.entries(a.signosVitalesIngreso).map(([k,v]) => `${k}: ${v}`).join(' | ') : a.signosVitalesIngreso) : null],
              ['Piel y Faneras', a.pielFaneras],
              ['Cabeza y Cuello', a.cabezaCuello],
              ['Tórax', a.torax],
              ['Ap. Respiratorio', a.apRespiratorio],
              ['Ap. Cardiovascular', a.apCardiovascular],
              ['Abdomen', a.abdomen],
              ['Sistema Nervioso', a.snervioso],
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
  if (evoluciones.length > 0) {
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>EVOLUCIÓN MÉDICA</h2>
        <p style="font-size:8pt;text-align:center;font-style:italic;margin-bottom:12px">INGRESE FECHA Y HORA, FIRMA Y SELLO EN CADA NOTA DE EVALUACIÓN</p>
        <div style="border:1px solid #000;min-height:600px;padding:12px">
          ${evoluciones.map((ev, i: number) => `
            <div style="${i < evoluciones.length - 1 ? 'border-bottom:1px dashed #ccc;' : ''}padding-bottom:16px;margin-bottom:16px">
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
  if (prescripciones.length > 0) {
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
            ${prescripciones.map((p, i: number) => `
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
            ${Array.from({ length: Math.max(0, 8 - prescripciones.length) }).map(() => `<tr><td style="height:28px"></td><td></td><td></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${pageBreak}
    `
  }

  // HOJA 5 — Hoja de Enfermería (Controles + Medicación)
  if (controlesEnfermeria.length > 0 || hojasEnfermeria.length > 0) {
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>HOJA DE ENFERMERÍA</h2>
    `
    if (controlesEnfermeria.length > 0) {
      html += `
        <strong style="font-size:9pt">CONTROLES DE ENFERMERÍA</strong>
        <table style="margin-top:6px">
          <thead>
            <tr><th>FECHA</th><th>HORA</th><th>T/A</th><th>P</th><th>R</th><th>T°</th><th>SatO2</th><th>INGRESOS</th><th>EGRESOS</th><th>OBSERVACIONES</th><th>FIRMA</th></tr>
          </thead>
          <tbody>
            ${controlesEnfermeria.map((ctrl) => {
              const d = ctrl.datos || {}
              return `<tr>
                <td>${new Date(ctrl.fecha).toLocaleDateString('es-AR')}</td>
                <td>${ctrl.hora}</td>
                <td>${d.TA ?? (d.ta_s ? d.ta_s + '/' + d.ta_d : '')}</td>
                <td>${d.FC ?? d.fc ?? ''}</td>
                <td>${d.FR ?? d.fr ?? ''}</td>
                <td>${d.Temp ?? d.temp ?? ''}</td>
                <td>${d.SatO2 ?? d.sato2 ?? ''}</td>
                <td>${d.ingresos ?? ''}</td>
                <td>${d.egresos ?? ''}</td>
                <td style="font-size:8pt">${ctrl.observacion ?? ''}</td>
                <td></td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      `
    }
    if (hojasEnfermeria.length > 0) {
      html += `
        <div style="margin-top:16px">
          <strong style="font-size:9pt">APLICACIONES DE MEDICACIÓN</strong>
          <table style="margin-top:6px">
            <thead><tr><th>FECHA</th><th>SECCIÓN</th><th>ITEM</th><th>DOSIS</th><th>VÍA</th><th>MARCAS HORARIAS</th><th>FIRMA</th></tr></thead>
            <tbody>
              ${hojasEnfermeria.map((h) => `<tr>
                <td>${new Date(h.fecha).toLocaleDateString('es-AR')}</td>
                <td>${h.seccion ?? ''}</td>
                <td>${h.stockItem?.nombre ?? h.item ?? ''}</td>
                <td>${h.dosis ?? ''}</td>
                <td>${h.via ?? ''}</td>
                <td>${h.marcasHorarias ?? ''}</td>
                <td></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `
    }
    html += `</div>${pageBreak}`
  }

  // HOJA 6 — Interconsultas
  const interconsultas = data.interconsultas ?? []
  if (interconsultas.length > 0) {
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>INTERCONSULTAS</h2>
        ${interconsultas.map((ic) => `
          <div style="border-bottom:1px solid #ccc;padding-bottom:8px;margin-bottom:8px;font-size:9pt">
            <div><strong>${new Date(ic.createdAt).toLocaleString('es-AR')}</strong> — ${ic.especialidad}</div>
            <div style="white-space:pre-wrap;margin:4px 0">${ic.motivo}</div>
            <div style="font-size:8pt;color:#555">
              Solicitada por ${ic.medicoSolicitante ? (ic.medicoSolicitante.apellido + ', ' + ic.medicoSolicitante.nombre) : '—'}
              ${ic.especialista ? ' · Especialista: ' + ic.especialista.apellido + ', ' + ic.especialista.nombre : ' · Sin especialista asignado'}
              · Estado: ${ic.estado}
            </div>
          </div>
        `).join('')}
      </div>
      ${pageBreak}
    `
  }

  // HOJA 7 — Valoración Preanestésica
  if (valoracionPreanestesia) {
    const vp = valoracionPreanestesia
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>VALORACIÓN PREANESTÉSICA</h2>
        <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9pt">
          <div class="field"><strong>Antec. Quirúrgicos:</strong><div style="white-space:pre-wrap;border-bottom:1px solid #000;padding:2px">${vp.antecQuirurgicos ?? '—'}</div></div>
          <div class="field"><strong>Enfermedades en Tratamiento:</strong><div style="white-space:pre-wrap;border-bottom:1px solid #000;padding:2px">${vp.enfermedadesTratamiento ?? '—'}</div></div>
          <div class="field"><strong>Laboratorio:</strong><div style="white-space:pre-wrap;border-bottom:1px solid #000;padding:2px">${vp.laboratorio ?? '—'}</div></div>
          <div class="field"><strong>Score ASA:</strong> ${vp.scoreASA ?? '—'}</div>
          <div class="field"><strong>Anestesia Sugerida:</strong> ${vp.anestesiaSugerida ?? '—'}</div>
          <div class="field" style="grid-column:span 2"><strong>Comentarios:</strong><div style="white-space:pre-wrap;border-bottom:1px solid #000;padding:2px">${vp.comentarios ?? '—'}</div></div>
        </div>
        <div style="margin-top:24px;display:flex;justify-content:flex-end">
          <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:4px;font-size:9pt">Firma del Anestesiólogo</div>
        </div>
      </div>
      ${pageBreak}
    `
  }

  // HOJA 8 — Protocolo de Anestesia
  if (protocoloAnestesia) {
    const pa = protocoloAnestesia
    const drogas = pa.drogas || []
    const premedicacion = pa.premedicacion || []
    const liquidosIngresados = pa.liquidosIngresados || []
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>PROTOCOLO DE ANESTESIA</h2>
        <div class="section" style="font-size:9pt">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
            <div class="field"><strong>Anestesiólogo:</strong> ${pa.anestesiologo ?? '—'} ${pa.matriculaAnestesiologo ? '(' + pa.matriculaAnestesiologo + ')' : ''}</div>
            <div class="field"><strong>Cirujano:</strong> ${pa.cirujano ?? '—'} ${pa.matriculaCirujano ? '(' + pa.matriculaCirujano + ')' : ''}</div>
            <div class="field"><strong>Ayudantes:</strong> ${pa.ayudantes ?? '—'}</div>
            <div class="field"><strong>Fecha Cirugía:</strong> ${pa.fechaCirugia ? new Date(pa.fechaCirugia).toLocaleDateString('es-AR') : '—'}</div>
          </div>

          <strong>EVALUACIÓN PREANESTÉSICA</strong>
          <div style="border:1px solid #000;padding:8px;margin:6px 0">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
              <div><strong>Alergias:</strong> ${pa.alergiaDetalle ?? '—'}</div>
              <div><strong>Clasificación ASA:</strong> ${pa.clasificacionASA ?? '—'}</div>
              <div><strong>Ayuno sólidos:</strong> ${pa.ayunoSolidos ?? '—'}</div>
              <div><strong>Ayuno líquidos:</strong> ${pa.ayunoLiquidos ?? '—'}</div>
              <div><strong>Estado psíquico:</strong> ${pa.estadoPsiquico ?? '—'}</div>
              <div><strong>Mallampati:</strong> ${pa.mallampati ?? '—'}</div>
              <div><strong>Dist. Tiromentoniana:</strong> ${pa.distTiromentoniana ?? '—'}</div>
              <div><strong>Apertura bucal:</strong> ${pa.aperturaBucal ?? '—'}</div>
              <div><strong>Peso:</strong> ${pa.peso ?? '—'} kg</div>
              <div><strong>Talla:</strong> ${pa.talla ?? '—'} cm</div>
            </div>
            ${premedicacion.length > 0 ? `
              <div style="margin-top:8px"><strong>Premedicación:</strong>
                <table style="margin-top:4px">
                  <thead><tr><th>Droga</th><th>Dosis</th><th>Vía</th><th>Hora</th></tr></thead>
                  <tbody>${premedicacion.map((m) => `<tr><td>${m.droga}</td><td>${m.dosis}</td><td>${m.via}</td><td>${m.hora}</td></tr>`).join('')}</tbody>
                </table>
              </div>
            ` : ''}
            ${pa.signosVitaPreop ? `
              <div style="margin-top:6px"><strong>Signos Vitales Preoperatorios:</strong> PA: ${pa.signosVitaPreop.pas ?? ''}/${pa.signosVitaPreop.pad ?? ''} | FC: ${pa.signosVitaPreop.fc ?? ''} | FR: ${pa.signosVitaPreop.fr ?? ''} | Temp: ${pa.signosVitaPreop.temp ?? ''}</div>
            ` : ''}
          </div>

          <strong style="margin-top:8px;display:block">TÉCNICA ANESTÉSICA</strong>
          <div style="border:1px solid #000;padding:8px;margin:6px 0">
            <div><strong>Técnica:</strong> ${Array.isArray(pa.tecnicaAnestesia) ? pa.tecnicaAnestesia.join(', ') : (pa.tecnicaAnestesia ?? '—')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
              <div><strong>Vía de inducción:</strong> ${pa.viaInduccion ?? '—'}</div>
              <div><strong>Manejo vía aérea:</strong> ${pa.manejoViaAerea ?? '—'}</div>
              <div><strong>N° tubo:</strong> ${pa.nroTubo ?? '—'}</div>
              <div><strong>Modalidad ventilatoria:</strong> ${pa.modalidadVentilatoria ?? '—'}</div>
              <div><strong>FiO2:</strong> ${pa.fio2 ?? '—'}</div>
              ${pa.dificultadViaAerea ? `<div><strong>Dificultad vía aérea:</strong> ${pa.dificultadViaAerea}${pa.detalleViaAerea ? ' — ' + pa.detalleViaAerea : ''}</div>` : ''}
            </div>
          </div>

          ${drogas.length > 0 ? `
            <strong style="margin-top:8px;display:block">DROGAS UTILIZADAS</strong>
            <table style="margin-top:6px">
              <thead><tr><th>Categoría</th><th>Nombre</th><th>Dosis</th><th>Vía</th><th>Hora</th></tr></thead>
              <tbody>${drogas.map((d) => `<tr><td>${d.categoria ?? ''}</td><td>${d.nombre}</td><td>${d.dosis} ${d.unidad ?? ''}</td><td>${d.via ?? ''}</td><td>${d.horaAdministracion ? new Date(d.horaAdministracion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}</td></tr>`).join('')}</tbody>
            </table>
          ` : ''}

          ${Array.isArray(pa.signosVitales) && pa.signosVitales.length > 0 ? `
            <strong style="margin-top:10px;display:block">SIGNOS VITALES INTRAOPERATORIOS</strong>
            <table style="margin-top:6px">
              <thead><tr><th>Min</th><th>PA</th><th>FC</th><th>FR</th><th>T°</th><th>SpO2</th><th>EtCO2</th></tr></thead>
              <tbody>${pa.signosVitales.map((r) => `<tr><td>${r.minuto ?? ''}</td><td>${r.pas ?? ''}/${r.pad ?? ''}</td><td>${r.fc ?? ''}</td><td>${r.fr ?? ''}</td><td>${r.temp ?? ''}</td><td>${r.spo2 ?? ''}</td><td>${r.etco2 ?? ''}</td></tr>`).join('')}</tbody>
            </table>
          ` : ''}

          <strong style="margin-top:10px;display:block">BALANCE DE LÍQUIDOS</strong>
          <div style="border:1px solid #000;padding:8px;margin:6px 0">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
              <div><strong>Posición operatoria:</strong> ${pa.posicionOperatoria ?? '—'}</div>
              <div><strong>Diuresis:</strong> ${pa.diuresis ?? '—'} ml</div>
              <div><strong>Pérdida sanguínea:</strong> ${pa.perdidaSanguinea ?? '—'} ${pa.perdidaSanguineaML ? '(' + pa.perdidaSanguineaML + ' ml)' : ''}</div>
              <div><strong>Otros egresos:</strong> ${pa.otrosEgresos ?? '—'}</div>
              <div><strong>Sonda NG:</strong> ${pa.sondaNasogastrica ? 'Sí' : 'No'}</div>
              <div><strong>Sonda vesical:</strong> ${pa.sondaVesical ? 'Sí' : 'No'}</div>
              <div><strong>Tipo cirugía:</strong> ${pa.tipoCirugia ?? '—'}</div>
            </div>
            ${liquidosIngresados.length > 0 ? `
              <div style="margin-top:6px"><strong>Líquidos Ingresados:</strong>
                <table style="margin-top:4px">
                  <thead><tr><th>Tipo</th><th>Volumen (ml)</th><th>Lote</th></tr></thead>
                  <tbody>${liquidosIngresados.map((l) => `<tr><td>${l.tipo}</td><td>${l.volumen ?? l.ml ?? ''}</td><td>${l.lote ?? ''}</td></tr>`).join('')}</tbody>
                </table>
              </div>
            ` : ''}
          </div>

          <strong style="margin-top:10px;display:block">RECUPERACIÓN</strong>
          <div style="border:1px solid #000;padding:8px;margin:6px 0">
            <div><strong>Estado al egreso:</strong> ${Array.isArray(pa.estadoEgreso) ? pa.estadoEgreso.join(', ') : (pa.estadoEgreso ?? '—')}</div>
            <div><strong>Destino paciente:</strong> ${pa.destinoPaciente ?? '—'}</div>
            ${pa.observaciones ? `<div style="margin-top:4px"><strong>Observaciones:</strong> ${pa.observaciones}</div>` : ''}
          </div>
        </div>
        <div style="margin-top:24px;display:flex;justify-content:flex-end">
          <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:4px;font-size:9pt">Firma del Anestesiólogo</div>
        </div>
      </div>
      ${pageBreak}
    `
  }

  // HOJA 9 — Protocolo Quirúrgico (COMPLETO)
  if (cirugias.length > 0) {
    for (const cir of cirugias) {
      const implantes = cir.implantes || []
      const medicamentos = cir.medicamentos || []
      const practicas = cir.practicas || []
      html += `
        <div>
          ${membrete}
          ${headerPaciente}
          <h2>PROTOCOLO QUIRÚRGICO</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9pt;margin-bottom:12px">
            <div><strong>Cirujano:</strong> ${resolveUser(cir.cirujanoId)}</div>
            <div><strong>Anestesiólogo:</strong> ${resolveUser(cir.anestesiologoId)}</div>
            <div><strong>Instrumentador:</strong> ${resolveUser(cir.instrumentadorId)}</div>
            <div><strong>Circulante:</strong> ${cir.circulante ?? '—'}</div>
            <div><strong>Quirófano:</strong> ${cir.quirofano?.nombre ?? '—'}</div>
            <div><strong>Estado:</strong> ${cir.estado}</div>
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

          ${implantes.length > 0 ? `
            <div style="margin-top:12px" class="no-break">
              <strong style="font-size:9pt">IMPLANTES</strong>
              <table style="margin-top:4px">
                <thead><tr><th>Nombre</th><th>Código</th><th>Lado</th><th>Lote</th><th>Cód. CE</th></tr></thead>
                <tbody>${implantes.map((im) => `<tr><td>${im.nombre}</td><td>${im.codigo ?? '—'}</td><td>${im.lado ?? '—'}</td><td>${im.lote ?? '—'}</td><td>${im.codigoCE ?? '—'}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          ` : ''}

          ${medicamentos.length > 0 ? `
            <div style="margin-top:10px" class="no-break">
              <strong style="font-size:9pt">MEDICAMENTOS</strong>
              <table style="margin-top:4px">
                <thead><tr><th>Nombre</th><th>Cantidad</th><th>Vía</th><th>Hora Aplicación</th></tr></thead>
                <tbody>${medicamentos.map((m) => `<tr><td>${m.nombre}</td><td>${m.cantidad ?? '—'}</td><td>${m.via ?? '—'}</td><td>${m.horaAplicacion ?? '—'}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          ` : ''}

          ${practicas.length > 0 ? `
            <div style="margin-top:10px" class="no-break">
              <strong style="font-size:9pt">PRÁCTICAS</strong>
              <table style="margin-top:4px">
                <thead><tr><th>Nombre</th><th>Código</th><th>Cantidad</th></tr></thead>
                <tbody>${practicas.map((pr) => `<tr><td>${pr.nombre}</td><td>${pr.codigo ?? '—'}</td><td>${pr.cantidad ?? '—'}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          ` : ''}

          <div style="margin-top:24px;display:flex;justify-content:flex-end">
            <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:4px;font-size:9pt">Firma del Cirujano</div>
          </div>
        </div>
        ${pageBreak}
      `
    }
  }

  // HOJA 10 — Epicrisis (última, sin pageBreak)
  if (epicrisis) {
    const ep = epicrisis
    html += `
      <div>
        ${membrete}
        ${headerPaciente}
        <h2>EPICRISIS / INFORME DE ALTA</h2>
        <div style="font-size:9pt;display:flex;flex-direction:column;gap:10px">
          <div><strong>Diagnóstico de Ingreso:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:24px">${ep.diagIngreso ?? '—'}</div></div>
          <div><strong>Diagnóstico de Egreso:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:24px">${ep.diagEgreso ?? '—'}</div></div>
          ${ep.codigosCIE ? `<div><strong>Códigos CIE:</strong><div style="border-bottom:1px solid #000;padding:4px">${ep.codigosCIE}</div></div>` : ''}
          <div><strong>Resumen Clínico:</strong><div style="border:1px solid #000;min-height:80px;padding:6px;white-space:pre-wrap;line-height:1.6">${ep.resumenClinico ?? ''}</div></div>
          <div><strong>Estudios Realizados:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:40px">${ep.estudiosRealizados ?? ''}</div></div>
          <div><strong>Tratamientos Realizados:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:40px">${ep.tratamientosRealizados ?? ''}</div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div><strong>Próximo control:</strong><div style="border-bottom:1px solid #000;padding:4px">${ep.proximoControlFecha ? new Date(ep.proximoControlFecha).toLocaleDateString('es-AR') : '—'}</div></div>
            <div><strong>Lugar:</strong><div style="border-bottom:1px solid #000;padding:4px">${ep.proximoControlLugar ?? '—'}</div></div>
            <div><strong>Médico:</strong><div style="border-bottom:1px solid #000;padding:4px">${ep.proximoControlMedico ?? '—'}</div></div>
          </div>
          ${ep.pendiente ? `<div><strong>Pendiente:</strong><div style="border-bottom:1px solid #000;padding:4px;min-height:24px">${ep.pendiente}</div></div>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><strong>Condición al egreso:</strong> ${ep.condicionEgreso ?? '—'}</div>
            <div><strong>Destino:</strong> ${ep.destino ?? '—'}</div>
          </div>
          ${(ep.medicacionAlta ?? []).length > 0 ? `
            <div><strong>Medicación al Alta:</strong>
              <table style="margin-top:4px">
                <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead>
                <tbody>${(ep.medicacionAlta ?? []).map((m) => `<tr><td>${m.droga}</td><td>${m.dosis}</td><td>${m.frecuencia}</td><td>${m.duracion}</td></tr>`).join('')}</tbody>
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
