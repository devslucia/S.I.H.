import { NextRequest, NextResponse } from "next/server";

const PROMPT_MEDICACION = `Sos un asistente de enfermería hospitalaria argentina.
Extraé del siguiente texto dictado los datos de administración de medicación.
Respondé SOLO con JSON válido, sin explicaciones.

Texto: "TEXTO_Aquí"

Formato de respuesta:
{
  "medicamento": "nombre del medicamento",
  "dosis": número o null,
  "unidad": "mg" | "mcg" | "ml" | "g" | "UI" | null,
  "via": "IV" | "IM" | "SC" | "VO" | "SL" | "INH" | null,
  "hora": "HH:MM" o null,
  "observacion": "texto libre adicional o null"
}`;

const PROMPT_SIGNOS_VITALES = `Extraé signos vitales del siguiente texto dictado por una enfermera argentina.
Respondé SOLO con JSON válido.

Texto: "TEXTO_Aquí"

Formato:
{
  "pas": número o null,
  "pad": número o null,
  "fc": número o null,
  "fr": número o null,
  "temperatura": número o null,
  "spo2": número o null,
  "observacion": "texto adicional o null"
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { texto, tipo } = body as { texto: string; tipo: "medicacion" | "signos_vitales" };

    if (!texto || !tipo) {
      return NextResponse.json({ error: "texto y tipo requeridos" }, { status: 400 });
    }

    const basePrompt = tipo === "medicacion" ? PROMPT_MEDICACION : PROMPT_SIGNOS_VITALES;
    const prompt = basePrompt.replace("TEXTO_Aquí", texto);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return NextResponse.json({ error: "Error al procesar con IA" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "No se pudo extraer JSON de la respuesta", raw: text }, { status: 422 });
    }

    const resultado = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ resultado });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return NextResponse.json({ error: "Timeout: la IA tardó demasiado" }, { status: 504 });
    }
    console.error("Parse error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
