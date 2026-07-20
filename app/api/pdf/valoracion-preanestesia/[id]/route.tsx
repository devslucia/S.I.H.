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
import type { AntecClinicos, ExamenFisico } from "@/types";

const styles = StyleSheet.create({
  page: { padding: "1.5cm 2cm", fontSize: 9, fontFamily: "Helvetica" },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#000", paddingBottom: 8, marginBottom: 12 },
  headerIcon: { fontSize: 20, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  headerSub: { fontSize: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 12, marginBottom: 6, textTransform: "uppercase" },
  subsectionTitle: { fontSize: 9, fontWeight: "bold", marginTop: 8, marginBottom: 4, backgroundColor: "#f0f0f0", padding: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: "35%", fontWeight: "bold" },
  value: { width: "65%" },
  checkboxRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 2 },
  checkbox: { width: "50%", fontSize: 8 },
  textBlock: { marginBottom: 4, padding: 4, borderWidth: 0.5, borderColor: "#ccc" },
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

function SubSectionTitle({ children }: { children: string }) {
  return <Text style={styles.subsectionTitle}>{children}</Text>;
}

function CheckboxList({ items }: { items: { label: string; checked: boolean }[] }) {
  const checkedItems = items.filter((i) => i.checked);
  if (checkedItems.length === 0) return <Text style={{ fontSize: 8, color: "#666" }}>Ninguno seleccionado</Text>;
  return (
    <View style={styles.checkboxRow}>
      {checkedItems.map((item, i) => (
        <Text key={i} style={styles.checkbox}>☑ {item.label}</Text>
      ))}
    </View>
  );
}

function renderAntecClinicos(ac: AntecClinicos | null | undefined) {
  if (!ac) return <Text style={{ fontSize: 8, color: "#666" }}>No completado</Text>;

  const sections = [
    {
      title: "Cardiovasculares",
      items: [
        { label: "Hipertensión", checked: ac.cardiovasculares.hipertension },
        { label: "Hipotensión", checked: ac.cardiovasculares.hipotension },
        { label: "Arritmias", checked: ac.cardiovasculares.arritmias },
        { label: "Infarto previo", checked: ac.cardiovasculares.infartoPrevio },
        { label: "Disnea de esfuerzo", checked: ac.cardiovasculares.disneaEsfuerzo },
        { label: "Disnea de reposo", checked: ac.cardiovasculares.disneaReposo },
        { label: "Angina de pecho", checked: ac.cardiovasculares.anginaPecho },
        { label: "Insuficiencia cardíaca", checked: ac.cardiovasculares.insuficienciaCardiaca },
        { label: "Arterial periférica", checked: ac.cardiovasculares.arterialPeriferica },
        { label: "Várices", checked: ac.cardiovasculares.varices },
      ],
      otros: ac.cardiovasculares.otros,
    },
    {
      title: "Respiratorios",
      items: [
        { label: "Asma bronquial", checked: ac.respiratorios.asmaBronquial },
        { label: "Broncoespasmo", checked: ac.respiratorios.broncoespasmo },
        { label: "Neumonía", checked: ac.respiratorios.neumonia },
        { label: "Neumonitis", checked: ac.respiratorios.neumonitis },
        { label: "Pleuresía", checked: ac.respiratorios.pleuresia },
        { label: "Tos", checked: ac.respiratorios.tos },
        { label: "Expectoración", checked: ac.respiratorios.expectoracion },
        { label: "EPOC", checked: ac.respiratorios.epoc },
      ],
      otros: ac.respiratorios.otros,
    },
    {
      title: "Endócrinos y metabólicos",
      items: [
        { label: "Diabetes", checked: ac.endocrinosMetabolicos.diabetes },
        { label: "Obesidad", checked: ac.endocrinosMetabolicos.obesidad },
        { label: "Hipertiroidismo", checked: ac.endocrinosMetabolicos.hipertiroidismo },
        { label: "Hipotiroidismo", checked: ac.endocrinosMetabolicos.hipotiroidismo },
      ],
      otros: ac.endocrinosMetabolicos.otros,
    },
    {
      title: "Digestivos",
      items: [
        { label: "Esófago", checked: ac.digestivos.esofago },
        { label: "Estómago", checked: ac.digestivos.estomago },
        { label: "Intestino", checked: ac.digestivos.intestino },
        { label: "Recto", checked: ac.digestivos.recto },
        { label: "Ano", checked: ac.digestivos.ano },
        { label: "Diarrea", checked: ac.digestivos.diarrea },
        { label: "Vómitos", checked: ac.digestivos.vomitos },
        { label: "Hígado", checked: ac.digestivos.higado },
        { label: "Vías biliares", checked: ac.digestivos.viasBiliares },
      ],
      otros: ac.digestivos.otros,
    },
    {
      title: "Hematológicos",
      items: [
        { label: "Anemia", checked: ac.hematologicos.anemia },
        { label: "Trastorno de la coagulación", checked: ac.hematologicos.trastornoCoagulacion },
      ],
      otros: ac.hematologicos.otros,
    },
    {
      title: "Ginecobstétricos",
      items: [
        { label: "Embarazos", checked: ac.ginecobstetricos.embarazos },
        { label: "Partos", checked: ac.ginecobstetricos.partos },
        { label: "Cesáreas", checked: ac.ginecobstetricos.cesareas },
      ],
      otros: ac.ginecobstetricos.otros,
    },
    {
      title: "Nefrourológicos",
      items: [
        { label: "Nefrouropatías", checked: ac.nefrourologicos.nefrouropatias },
        { label: "Urolitiasis", checked: ac.nefrourologicos.urolitiasis },
        { label: "Hematuria", checked: ac.nefrourologicos.hematuria },
        { label: "Diálisis", checked: ac.nefrourologicos.dialisis },
        { label: "Sonda vesical", checked: ac.nefrourologicos.sondaVesical },
      ],
      otros: ac.nefrourologicos.otros,
    },
    {
      title: "Neurológicos",
      items: [
        { label: "Meningoencefalitis", checked: ac.neurologicos.meningoencefalitis },
        { label: "Traumatismo de cráneo", checked: ac.neurologicos.traumatismoCraneo },
        { label: "Pérdida de conocimiento", checked: ac.neurologicos.perdidaConocimiento },
        { label: "Coma", checked: ac.neurologicos.coma },
        { label: "Convulsiones", checked: ac.neurologicos.convulsiones },
        { label: "Disritmia", checked: ac.neurologicos.disritmia },
        { label: "Parálisis", checked: ac.neurologicos.paralysis },
      ],
      otros: ac.neurologicos.otros,
    },
    {
      title: "Traumatológicos",
      items: [
        { label: "Fracturas", checked: ac.traumaticos.fracturas },
        { label: "Hematomas", checked: ac.traumaticos.hematomas },
        { label: "Artritis", checked: ac.traumaticos.artritis },
        { label: "Artrosis", checked: ac.traumaticos.artrosis },
        { label: "Prótesis", checked: ac.traumaticos.protesis },
      ],
      otros: ac.traumaticos.otros,
    },
    {
      title: "Hábitos tóxicos",
      items: [
        { label: "Tabaquismo", checked: ac.habitosToxicos.tabaquismo },
        { label: "Etilismo", checked: ac.habitosToxicos.etilismo },
      ],
      otros: ac.habitosToxicos.otros,
    },
  ];

  return (
    <>
      {sections.map((sec, i) => (
        <View key={i}>
          <SubSectionTitle>{sec.title}</SubSectionTitle>
          <CheckboxList items={sec.items} />
          {sec.otros && <Text style={{ fontSize: 8, fontStyle: "italic" }}>Otros: {sec.otros}</Text>}
        </View>
      ))}
      {ac.alimentacion && (
        <View>
          <SubSectionTitle>Alimentación</SubSectionTitle>
          <Text style={styles.textBlock}>{ac.alimentacion}</Text>
        </View>
      )}
      {ac.medicamentosos && (
        <View>
          <SubSectionTitle>Medicamentosos</SubSectionTitle>
          <Text style={styles.textBlock}>{ac.medicamentosos}</Text>
        </View>
      )}
      {ac.otros && (
        <View>
          <SubSectionTitle>Otros</SubSectionTitle>
          <Text style={styles.textBlock}>{ac.otros}</Text>
        </View>
      )}
    </>
  );
}

function renderExamenFisico(ef: ExamenFisico | null | undefined, sexo: string) {
  if (!ef) return <Text style={{ fontSize: 8, color: "#666" }}>No completado</Text>;

  return (
    <>
      {ef.psiquismo && <Field label="Psiquismo" value={ef.psiquismo} />}
      <SubSectionTitle>Cabeza y cuello</SubSectionTitle>
      {ef.cabezaCuello.movilidad && <Field label="Movilidad" value={ef.cabezaCuello.movilidad} />}
      {ef.cabezaCuello.mallampati && <Field label="Mallampati" value={`Class ${ef.cabezaCuello.mallampati}`} />}
      <Field label="Prótesis dental" value={ef.cabezaCuello.protesisDental ? "Sí" : "No"} />
      {ef.cabezaCuello.otros && <Text style={{ fontSize: 8, fontStyle: "italic" }}>Otros: {ef.cabezaCuello.otros}</Text>}
      {ef.cardiovascular && (
        <View>
          <SubSectionTitle>Cardiovascular / TA / FC / ECG</SubSectionTitle>
          <Text style={styles.textBlock}>{ef.cardiovascular}</Text>
        </View>
      )}
      {ef.respiratorio && (
        <View>
          <SubSectionTitle>Respiratorio / FR</SubSectionTitle>
          <Text style={styles.textBlock}>{ef.respiratorio}</Text>
        </View>
      )}
      {sexo === "FEMENINO" && ef.embarazo && (
        <Field label="Embarazo" value={ef.embarazo === "si" ? "Sí" : ef.embarazo === "ignora" ? "Ignora" : "Niega"} />
      )}
      {ef.otros && (
        <View>
          <SubSectionTitle>Otros</SubSectionTitle>
          <Text style={styles.textBlock}>{ef.otros}</Text>
        </View>
      )}
    </>
  );
}

function PreanestesiaPDF({ preanestesia, paciente, internacion }: any) {
  const p = preanestesia;
  const ac = p.antecClinicos as AntecClinicos | null;
  const ef = p.examenFisico as ExamenFisico | null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Membrete />

        {/* Cabecera paciente */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Paciente:</Text> {paciente.apellido}, {paciente.nombre}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>DNI:</Text> {paciente.dni}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Sexo:</Text> {paciente.sexo}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>HC N°:</Text> {internacion.numero}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Fecha:</Text> {new Date(p.createdAt).toLocaleDateString("es-AR")}</Text>
            <Text style={{ width: "50%", fontSize: 8 }}><Text style={{ fontWeight: "bold" }}>Score ASA:</Text> {p.scoreASA ?? "—"}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 12 }}>VALORACIÓN PREANESTÉSICA</Text>

        {/* Datos generales */}
        <Field label="Peso" value={p.peso != null ? `${p.peso} kg` : "—"} />
        <Field label="Talla" value={p.talla != null ? `${p.talla} cm` : "—"} />
        <Field label="Diagnóstico preoperatorio" value={p.diagnosticoPreoperatorio || "—"} />
        <Field label="Cirugía propuesta" value={`${p.cirugiaPropuestaTipo || "—"}${p.cirugiaPropuestaDesc ? ` — ${p.cirugiaPropuestaDesc}` : ""}`} />
        <Field label="Antecedentes Quirúrgicos" value={p.antecQuirurgicos || "—"} />
        <Field label="Enfermedades en Tratamiento" value={p.enfermedadesTratamiento || "—"} />
        <Field label="Laboratorio" value={p.laboratorio || "—"} />
        <Field label="Anestesia Sugerida" value={p.anestesiaSugerida || "—"} />
        <Field label="Comentarios" value={p.comentarios || "—"} />

        {/* Antecedentes Clínicos */}
        <SectionTitle>Antecedentes Clínicos</SectionTitle>
        {renderAntecClinicos(ac)}

        {/* Examen Físico */}
        <SectionTitle>Examen Físico</SectionTitle>
        {renderExamenFisico(ef, paciente.sexo)}

        {/* Firma */}
        {p.firmadaAt && (
          <View style={styles.footer}>
            <Text>Fecha de firma: {new Date(p.firmadaAt).toLocaleString("es-AR")}</Text>
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

  const preanestesia = await prisma.valoracionPreanestesia.findUnique({
    where: { id: params.id },
    include: {
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

  if (!preanestesia) {
    return NextResponse.json({ error: "Valoración preanestésica no encontrada" }, { status: 404 });
  }

  const paciente = (preanestesia as any).hc.internacion.paciente;
  const internacion = (preanestesia as any).hc.internacion;

  const buffer = await renderToBuffer(
    React.createElement(PreanestesiaPDF, {
      preanestesia,
      paciente,
      internacion,
    })
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="valoracion-preanestesia-${params.id}.pdf"`,
    },
  });
}
