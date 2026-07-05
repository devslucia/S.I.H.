import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const ENFERMERIA_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO"];

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 10, fontWeight: "bold", marginBottom: 6, marginTop: 12 },
  header: { fontSize: 8, color: "#666", marginBottom: 15 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 4 },
  cell: { width: "20%", paddingHorizontal: 4 },
  cellSmall: { width: "12%", paddingHorizontal: 4 },
  cellWide: { width: "28%", paddingHorizontal: 4 },
  cellBold: { fontWeight: "bold" },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, fontSize: 7, color: "#999", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 10, fontWeight: "bold", marginTop: 10, marginBottom: 4, backgroundColor: "#f0f0f0", padding: 4 },
  obsText: { fontSize: 8, color: "#444", marginTop: 2, marginLeft: 10 },
});

function HojaPDF({ internacion, controles, hojas }: { internacion: any; controles: any[]; hojas: any[] }) {
  const p = internacion.paciente;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Hoja de Enfermería</Text>
        <Text style={styles.header}>
          Paciente: {p.apellido}, {p.nombre} | DNI: {p.dni} | Internación: #{internacion.numero} | Cama: {internacion.cama?.numero || "—"} - {internacion.cama?.sector?.nombre || "—"}
        </Text>

        <Text style={styles.subtitle}>Signos Vitales</Text>
        <View style={[styles.row, { borderBottomWidth: 1 }]}>
          <Text style={[styles.cellSmall, styles.cellBold]}>Hora</Text>
          <Text style={[styles.cell, styles.cellBold]}>PA</Text>
          <Text style={[styles.cellSmall, styles.cellBold]}>FC</Text>
          <Text style={[styles.cellSmall, styles.cellBold]}>FR</Text>
          <Text style={[styles.cellSmall, styles.cellBold]}>T°</Text>
          <Text style={[styles.cellSmall, styles.cellBold]}>SatO2</Text>
          <Text style={[styles.cellWide, styles.cellBold]}>Obs</Text>
        </View>
        {controles.map((c, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.cellSmall}>{c.hora}</Text>
            <Text style={styles.cell}>{c.datos?.PA || "—"}</Text>
            <Text style={styles.cellSmall}>{c.datos?.FC || "—"}</Text>
            <Text style={styles.cellSmall}>{c.datos?.FR || "—"}</Text>
            <Text style={styles.cellSmall}>{c.datos?.["T°"] || "—"}</Text>
            <Text style={styles.cellSmall}>{c.datos?.SatO2 || "—"}</Text>
            <Text style={styles.cellWide}>{c.observacion || "—"}</Text>
          </View>
        ))}

        {hojas.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Material / Medicación / Procedimientos</Text>
            <View style={[styles.row, { borderBottomWidth: 1 }]}>
              <Text style={[styles.cellSmall, styles.cellBold]}>Hora</Text>
              <Text style={[styles.cell, styles.cellBold]}>Sección</Text>
              <Text style={[styles.cellWide, styles.cellBold]}>Item</Text>
              <Text style={[styles.cellSmall, styles.cellBold]}>Dosis</Text>
              <Text style={[styles.cellSmall, styles.cellBold]}>Vía</Text>
            </View>
            {hojas.map((h, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={styles.cellSmall}>{h.fecha ? new Date(h.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}</Text>
                <Text style={styles.cell}>{h.seccion}</Text>
                <Text style={styles.cellWide}>{h.item}</Text>
                <Text style={styles.cellSmall}>{h.dosis || "—"}</Text>
                <Text style={styles.cellSmall}>{h.via || "—"}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Text>Generado: {new Date().toLocaleString("es-AR")}</Text>
          <Text>S.I.H. — Sistema de Información Hospitalaria</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...ENFERMERIA_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const internacion = await prisma.internacion.findUnique({
    where: { id: params.internacionId },
    include: {
      paciente: { select: { nombre: true, apellido: true, dni: true } },
      cama: { select: { numero: true, sector: { select: { nombre: true } } } },
      histClinica: { select: { id: true } },
    },
  });

  if (!internacion?.histClinica) {
    return NextResponse.json({ error: "Internación o HC no encontrada" }, { status: 404 });
  }

  const [controles, hojas] = await Promise.all([
    prisma.controlEnfermeria.findMany({
      where: { hcId: internacion.histClinica.id },
      orderBy: { fecha: "asc" },
    }),
    prisma.hojaEnfermeria.findMany({
      where: { hcId: internacion.histClinica.id },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const pdfBuffer = await renderToBuffer(
    <HojaPDF internacion={internacion} controles={controles} hojas={hojas} />
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hoja-enfermeria-${internacion.paciente.apellido}.pdf"`,
    },
  });
}
