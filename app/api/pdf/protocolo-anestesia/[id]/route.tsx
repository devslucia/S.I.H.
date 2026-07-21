import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: "1.5cm 2cm", fontSize: 9, fontFamily: "Helvetica" },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#000", paddingBottom: 8, marginBottom: 12 },
  headerIcon: { fontSize: 20, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  headerSub: { fontSize: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 12, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: "35%", fontWeight: "bold" },
  value: { width: "65%" },
  table: { width: "100%", borderWidth: 1, borderColor: "#000", marginBottom: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc" },
  tableCell: { padding: 4, flex: 1 },
  tableHeader: { backgroundColor: "#f0f0f0", fontWeight: "bold" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 8, fontWeight: "bold" },
  greenBadge: { backgroundColor: "#dcfce7", color: "#166534" },
  amberBadge: { backgroundColor: "#fef3c7", color: "#92400e" },
  redBadge: { backgroundColor: "#fecaca", color: "#991b1b" },
  footer: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#000", paddingTop: 8, fontSize: 8 },
  firmLine: { marginTop: 40, borderTopWidth: 0.5, borderTopColor: "#000", width: 250, paddingTop: 4 },
});

function Membrete() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerIcon}>✚</Text>
      <View>
        <Text style={styles.headerTitle}>SANATORIO SIMES</Text>
        <Text style={styles.headerSub}>Córdoba N° 2344 — Posadas, Misiones</Text>
        <Text style={styles.headerSub}>Tel: 03765-430280 / 430283</Text>
      </View>
    </View>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value ?? "—"}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ProtocoloPDF({ protocolo, paciente, internacion }: any) {
  const p = protocolo;
  const ald = (p.aldreteActividad ?? 0) + (p.aldreteRespiracion ?? 0) + (p.aldreteCirculacion ?? 0) + (p.aldreteConciencia ?? 0) + (p.aldreteSpo2 ?? 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Membrete />

        {/* Cabecera paciente */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Paciente:</Text> {paciente.apellido}, {paciente.nombre}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>DNI:</Text> {paciente.dni}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>HC N°:</Text> {internacion.numero}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Grupo sanguíneo:</Text> {paciente.grupoSangre || "—"}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Fecha:</Text> {p.fechaCirugia ? new Date(p.fechaCirugia).toLocaleDateString("es-AR") : "—"}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 12 }}>PROTOCOLO DE ANESTESIA</Text>

        {/* Bloque 1 */}
        <SectionTitle>1. Identificación - Equipo</SectionTitle>
        <Field label="Anestesiólogo" value={`${p.anestesiologo || "—"} ${p.matriculaAnestesiologo ? `(Mat. ${p.matriculaAnestesiologo})` : ""}`} />
        <Field label="Cirujano" value={`${p.cirujano || "—"} ${p.matriculaCirujano ? `(Mat. ${p.matriculaCirujano})` : ""}`} />
        <Field label="Ayudantes" value={p.ayudantes} />
        <Field label="Peso" value={p.peso ? `${p.peso} kg` : "—"} />
        <Field label="Talla" value={p.talla ? `${p.talla} cm` : "—"} />

        {/* Bloque 2 */}
        <SectionTitle>2. Evaluación Preanestésica</SectionTitle>
        <Field label="Alergias" value={p.alergiaDetalle || "No especificadas"} />
        <Field label="ASA" value={`${p.clasificacionASA || "—"}${p.esEmergencia ? " (E) Emergencia" : ""}`} />
        <Field label="Ayuno sólidos" value={p.ayunoSolidos != null ? `${p.ayunoSolidos}h` : "—"} />
        <Field label="Ayuno líquidos" value={p.ayunoLiquidos != null ? `${p.ayunoLiquidos}h` : "—"} />
        <Field label="Última ingesta" value={p.ultimaIngesta} />
        <Field label="Estado psíquico" value={p.estadoPsiquico} />
        {p.premedicacion && p.premedicacion.length > 0 && (
          <Field label="Premedicación" value={p.premedicacion.map((pm: any) => `${pm.droga}${pm.dosis ? ` ${pm.dosis}` : ""} ${pm.via}${pm.hora ? ` (${pm.hora})` : ""}`).join("; ")} />
        )}
        {p.signosVitaPreop && (
          <Field label="SV Preoperatorios" value={`PAS: ${p.signosVitaPreop.pas ?? "—"} | PAD: ${p.signosVitaPreop.pad ?? "—"} | FC: ${p.signosVitaPreop.fc ?? "—"} | FR: ${p.signosVitaPreop.fr ?? "—"} | T: ${p.signosVitaPreop.temp ?? "—"}°C`} />
        )}
        <Field label="Mallampati" value={p.mallampati} />
        <Field label="Dist. tiromentoniana" value={p.distTiromentoniana != null ? `${p.distTiromentoniana} cm` : "—"} />
        <Field label="Apertura bucal" value={p.aperturaBucal != null ? `${p.aperturaBucal} cm` : "—"} />

        {/* Bloque 3 */}
        <SectionTitle>3. Técnica Anestésica</SectionTitle>
        <Field label="Técnica" value={(p.tecnicaAnestesia || []).join(" + ") || "—"} />
        {p.tecnicaAnestesia?.includes("conductiva") && (
          <>
            <Field label="Tipo conductiva" value={p.tipoConductiva} />
            <Field label="Sitio punción" value={p.sitioPuncion} />
            <Field label="Aguja" value={p.agujaDetalle} />
            <Field label="Catéter" value={p.cateter ? "Sí" : "No"} />
            <Field label="Fármaco" value={p.farmacoConductiva} />
          </>
        )}
        {p.tecnicaAnestesia?.includes("general") && (
          <>
            <Field label="Vía inducción" value={p.viaInduccion} />
            <Field label="Vía aérea" value={p.manejoViaAerea} />
            {p.intubacionSubtipo && <Field label="Subtipo intubación" value={p.intubacionSubtipo} />}
            {p.canulaFaringealTipo && <Field label="Cánula faríngea" value={p.canulaFaringealTipo} />}
            <Field label="N° tubo" value={p.nroTubo} />
            <Field label="FiO₂" value={p.fio2 != null ? `${p.fio2}%` : "—"} />
            <Field label="Oxígeno flujo" value={p.oxigenoFlujo != null ? `${p.oxigenoFlujo} L/min` : "—"} />
            <Field label="Modalidad ventilatoria" value={p.modalidadVentilatoria} />
            {p.modalidadVentFranja && p.modalidadVentFranja.length > 0 && (
              <Field label="Vent. por franja" value={p.modalidadVentFranja.map((f: any) => `${f.desde}'-${f.hasta}': ${f.modalidad}`).join("; ")} />
            )}
          </>
        )}

        {/* Bloque 4 - Tabla drogas */}
        {p.drogas && p.drogas.length > 0 && (
          <>
            <SectionTitle>4. Medicación administrada</SectionTitle>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Categoría</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Droga</Text>
                <Text style={styles.tableCell}>Dosis</Text>
                <Text style={styles.tableCell}>Vía</Text>
                <Text style={styles.tableCell}>Hora</Text>
              </View>
              {p.drogas.map((d: any, i: number) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{d.categoria}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{d.nombre}</Text>
                  <Text style={styles.tableCell}>{d.dosis} {d.unidad}</Text>
                  <Text style={styles.tableCell}>{d.via}</Text>
                  <Text style={styles.tableCell}>{d.horaAdministracion ? new Date(d.horaAdministracion).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Bloque 5 */}
        <SectionTitle>5. Balance de Líquidos</SectionTitle>
        <Field label="Diuresis" value={p.diuresis != null ? `${p.diuresis} ml` : "—"} />
        <Field label="Pérdida sanguínea" value={`${p.perdidaSanguinea || "—"}${p.perdidaSanguineaML ? ` (${p.perdidaSanguineaML} ml)` : ""}`} />
        <Field label="Posición" value={p.posicionOperatoria} />
        <Field label="Sondas" value={`${p.sondaNasogastrica ? "NG " : ""}${p.sondaVesical ? "Vesical" : ""}`} />
        <Field label="Tipo cirugía" value={p.tipoCirugia} />

        {/* Bloque 6 */}
        <SectionTitle>6. Recuperación</SectionTitle>
        <Field label="Estado egreso" value={(p.estadoEgreso || []).join(", ") || "—"} />
        <Field label="Destino" value={p.destinoPaciente} />
        <Field label="Escala de Aldrete" value={`${ald}/10${ald >= 9 ? " (Apto para traslado)" : ald >= 7 ? " (Monitoreo adicional)" : " (No apto)"}`} />

        {/* Firma */}
        {p.firmado && (
          <View style={styles.footer}>
            <Text>Firmado por: {p.nombreFirmante} {p.matriculaFirmante ? `(Mat. ${p.matriculaFirmante})` : ""}</Text>
            <Text>Fecha de firma: {p.firmadoEn ? new Date(p.firmadoEn).toLocaleString("es-AR") : "—"}</Text>
          </View>
        )}

        <View style={styles.firmLine}>
          <Text>Firma del Anestesiólogo</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const protocolo = await prisma.protocoloAnestesia.findUnique({
    where: { id: params.id },
    include: {
      drogas: true,
      hc: {
        include: {
          internacion: {
            include: {
              paciente: true,
            },
          },
        },
      },
    },
  });

  if (!protocolo) {
    return NextResponse.json({ error: "Protocolo no encontrado" }, { status: 404 });
  }

  const paciente = (protocolo as any).hc.internacion.paciente;
  const internacion = (protocolo as any).hc.internacion;

  const buffer = await renderToBuffer(
    React.createElement(ProtocoloPDF, {
      protocolo: {
        ...protocolo,
        drogas: (protocolo as any).drogas,
      },
      paciente,
      internacion,
    })
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="protocolo-anestesia-${params.id}.pdf"`,
    },
  });
}
