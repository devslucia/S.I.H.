import { requireRole } from "@/lib/rbac";
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

const RECETA_ROLES = ["ADMIN", "MEDICO"];

const styles = StyleSheet.create({
  page: { padding: "1.5cm 2cm", fontSize: 9, fontFamily: "Helvetica" },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#000", paddingBottom: 8, marginBottom: 12 },
  headerIcon: { fontSize: 20, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  headerSub: { fontSize: 8 },
  title: { fontSize: 12, fontWeight: "bold", textAlign: "center", marginVertical: 10, textTransform: "uppercase" },
  sectionTitle: { fontSize: 10, fontWeight: "bold", marginTop: 12, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: "35%", fontWeight: "bold" },
  value: { width: "65%" },
  medRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 4 },
  medNombre: { width: "40%", fontWeight: "bold" },
  medDosis: { width: "20%" },
  medVia: { width: "15%" },
  medFrecuencia: { width: "25%" },
  footer: { marginTop: 30, borderTopWidth: 1, borderTopColor: "#000", paddingTop: 8, fontSize: 8 },
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
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}

export async function GET(req: NextRequest, { params }: { params: { turnoId: string } }) {
  const { session, error } = await requireRole(...RECETA_ROLES);
  if (error) return error;

  const turno = await prisma.turnoConsultorio.findUnique({
    where: { id: params.turnoId },
    include: {
      medico: { select: { id: true, nombre: true, apellido: true } },
      paciente: { select: { id: true, nombre: true, apellido: true, dni: true, fechaNac: true } },
      obraSocial: { select: { nombre: true, sigla: true } },
      episodio: {
        include: {
          prescripciones: {
            include: { usuario: { select: { nombre: true, apellido: true } } },
            orderBy: { fecha: "desc" },
          },
        },
      },
    },
  });

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const rol = (session.user as any).rol as string;
  if (rol === "MEDICO" && turno.medicoId !== session.user.id) {
    return NextResponse.json({ error: "No tiene acceso a este turno" }, { status: 403 });
  }

  const prescripciones = turno.episodio?.prescripciones ?? [];
  const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const pdfBuffer = await renderToBuffer(
    React.createElement(Document, null,
      React.createElement(Page, { size: "A4", style: styles.page },
        React.createElement(Membrete),
        React.createElement(Text, { style: { textAlign: "right", fontSize: 8, marginBottom: 8 } }, `Fecha: ${fecha}`),
        React.createElement(Text, { style: styles.title }, "Receta / Constancia"),
        React.createElement(Field, { label: "Paciente", value: `${turno.paciente.apellido}, ${turno.paciente.nombre}` }),
        React.createElement(Field, { label: "DNI", value: turno.paciente.dni }),
        turno.obraSocial && React.createElement(Field, { label: "Obra Social", value: `${turno.obraSocial.sigla || turno.obraSocial.nombre}` }),
        React.createElement(Field, { label: "Médico", value: `Dr. ${turno.medico.apellido}, ${turno.medico.nombre}` }),
        React.createElement(Field, { label: "Fecha consulta", value: new Date(turno.fecha).toLocaleDateString("es-AR") }),
        turno.motivo && React.createElement(Field, { label: "Motivo", value: turno.motivo }),
        prescripciones.length > 0 && React.createElement(View, null,
          React.createElement(Text, { style: styles.sectionTitle }, "Prescripciones"),
          React.createElement(View, { style: [styles.medRow, { backgroundColor: "#f0f0f0" }] },
            React.createElement(Text, { style: [styles.medNombre, { fontWeight: "bold" }] }, "Medicamento"),
            React.createElement(Text, { style: [styles.medDosis, { fontWeight: "bold" }] }, "Dosis"),
            React.createElement(Text, { style: [styles.medVia, { fontWeight: "bold" }] }, "Vía"),
            React.createElement(Text, { style: [styles.medFrecuencia, { fontWeight: "bold" }] }, "Frecuencia"),
          ),
          ...prescripciones.map((p: any) =>
            React.createElement(View, { key: p.id, style: styles.medRow },
              React.createElement(Text, { style: styles.medNombre }, p.droga || p.descripcion || "—"),
              React.createElement(Text, { style: styles.medDosis }, p.dosis || "—"),
              React.createElement(Text, { style: styles.medVia }, p.via || "—"),
              React.createElement(Text, { style: styles.medFrecuencia }, p.frecuencia || "—"),
            )
          ),
        ),
        prescripciones.length === 0 && React.createElement(Text, { style: { marginTop: 10, fontStyle: "italic" } }, "No hay prescripciones registradas."),
        React.createElement(View, { style: styles.footer },
          React.createElement(Text, null, `Turno N° ${turno.id.slice(0, 8).toUpperCase()}`),
        ),
        React.createElement(View, { style: styles.firmLine },
          React.createElement(Text, null, `Dr. ${turno.medico.apellido}, ${turno.medico.nombre}`),
          React.createElement(Text, { style: { fontSize: 8 } }, "Médico/a"),
        ),
      )
    )
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receta-${turno.paciente.apellido.toLowerCase()}-${turno.paciente.nombre.toLowerCase()}.pdf"`,
    },
  });
}
