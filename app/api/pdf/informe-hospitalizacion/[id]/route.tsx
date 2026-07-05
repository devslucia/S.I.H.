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

function InformePDF({ paciente, internacion, alergias }: any) {
  const fechaIngreso = internacion.fechaIngreso ? new Date(internacion.fechaIngreso).toLocaleDateString("es-AR") : "—";
  const fechaEgreso = internacion.fechaEgreso ? new Date(internacion.fechaEgreso).toLocaleDateString("es-AR") : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Membrete />

        <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
            INFORME DE HOSPITALIZACIÓN
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Paciente:</Text> {paciente.apellido}, {paciente.nombre}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>DNI:</Text> {paciente.dni}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>HC N°:</Text> {internacion.numero}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Fecha Ingreso:</Text> {fechaIngreso}</Text>
            {fechaEgreso && (
              <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Fecha Egreso:</Text> {fechaEgreso}</Text>
            )}
          </View>
        </View>

        <SectionTitle>Datos del Paciente</SectionTitle>
        <Field label="Apellido y Nombre" value={`${paciente.apellido}, ${paciente.nombre}`} />
        <Field label="DNI" value={paciente.dni} />
        <Field label="Sexo" value={paciente.sexo} />
        <Field label="Fecha de Nacimiento" value={paciente.fechaNac ? new Date(paciente.fechaNac).toLocaleDateString("es-AR") : "—"} />
        <Field label="CUIL" value={paciente.cuil} />
        <Field label="Domicilio" value={`${paciente.domicilio || "—"}${paciente.localidad ? `, ${paciente.localidad}` : ""}`} />
        <Field label="Teléfono" value={paciente.telefono} />

        <SectionTitle>Datos de la Internación</SectionTitle>
        <Field label="Tipo de Ingreso" value={internacion.tipoIngreso} />
        <Field label="Motivo de Ingreso" value={internacion.motivoIngreso} />
        <Field label="Diagnóstico CIE" value={internacion.diagnosticoCIE} />
        <Field label="Médico Solicitante" value={internacion.medicoSolicitante} />
        <Field label="Obra Social" value={internacion.obraSocial ? `${internacion.obraSocial.nombre} (${internacion.obraSocial.sigla})` : "—"} />
        <Field label="N° Afiliado" value={internacion.nroAfiliado} />
        <Field label="Tipo Beneficiario" value={internacion.tipoBeneficiario} />
        {internacion.cama && (
          <Field label="Cama" value={`${internacion.cama.numero} — ${internacion.cama.sector?.nombre || "—"}`} />
        )}

        {alergias && alergias.length > 0 && (
          <>
            <SectionTitle>Alergias Conocidas</SectionTitle>
            {alergias.map((a: any, idx: number) => (
              <Text key={idx} style={{ marginBottom: 2, fontSize: 9 }}>
                • {a.sustancia}{a.severidad ? ` (${a.severidad})` : ""}{a.observacion ? ` — ${a.observacion}` : ""}
              </Text>
            ))}
          </>
        )}

        <SectionTitle>Evolución Clínica</SectionTitle>
        <Text style={{ fontSize: 9, marginBottom: 4 }}>
          El paciente fue internado el {fechaIngreso} por motivo de: {internacion.motivoIngreso || "no especificado"}.
          {internacion.diagnosticoCIE ? ` Diagnóstico al ingreso: ${internacion.diagnosticoCIE}.` : ""}
          {fechaEgreso ? ` Se dio de alta el ${fechaEgreso}.` : " Se encuentra internado actualmente."}
        </Text>

        <View style={styles.footer}>
          <Text>Documento generado automáticamente por el Sistema de Información Hospitalaria (S.I.H.)</Text>
          <Text>Sanatorio SIMES — Posadas, Misiones</Text>
        </View>

        <View style={styles.firmLine}>
          <Text style={{ fontSize: 8, textAlign: "center" }}>Firma y sello del médico tratante</Text>
        </View>
      </Page>
    </Document>
  );
}

const INFORME_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(...INFORME_ROLES);
  if (error) return error;

  const internacion = await prisma.internacion.findUnique({
    where: { id: params.id },
    include: {
      paciente: { include: { alergias: true } },
      cama: { include: { sector: true } },
      obraSocial: true,
    },
  });

  if (!internacion) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    <InformePDF
      paciente={internacion.paciente}
      internacion={internacion}
      alergias={internacion.paciente.alergias}
    />
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-hospitalizacion-${internacion.numero}.pdf"`,
    },
  });
}
