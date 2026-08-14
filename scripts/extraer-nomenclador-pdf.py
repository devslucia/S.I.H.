#!/usr/bin/env python3
"""Extrae items del Nomenclador Nacional (PDF GILSA, ~141 págs) a CSV.

Uso:
    python3 scripts/extraer-nomenclador-pdf.py ~/Descargas/Gilsa-Integral-Salud.pdf \
        --capitulos 00,01 --out prisma/seed-data/nomenclador_nacional_subset.csv
    (sin --capitulos: extrae todo el nomenclador; revisar columnas ambiguas
     antes de cargar el set completo)

Columnas de salida (separador ';', decimales con punto):
    codigo;descripcion;capitulo;seccion;uEspecialista;uAyudantes;uAnestesista;cantidadAyudantes;total;notas

Notas de fiabilidad:
- uEspecialista: valor tras "U." (confiable)
- uAyudantes + cantidadAyudantes: patron "1x"/"2x" (confiable)
- total: último número de la fila (columna TOTAL, confiable cuando existe)
- uAnestesista: el PDF muestra notas "(nn)" en esa columna, rara vez un número;
  no se parsea (queda vacío) — revisión humana en la carga completa.
- seccion: los encabezados de sección no llevan código; se deja vacío.
"""
import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

CODIGO_RE = re.compile(r"(\d{2}\.\d{2}\.\d{2})\.(?:\s|$)")
VALORES_RE = re.compile(r"U\.\s*([\d.,]+)|(\d)x\s*([\d.,]+)|\((\d+)\)")
NUMERO_RE = re.compile(r"\d[\d.,]*")
HEADERS = {"CODIGO", "NOMENCLADOR", "Página"}


def normalizar_num(txt: str):
    if txt is None:
        return None
    txt = txt.replace(",", ".").strip()
    try:
        return f"{float(txt):g}" if txt else None
    except ValueError:
        return None


def extraer(archivo: Path, capitulos: list[str] | None):
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        subprocess.run(
            ["pdftotext", "-layout", str(archivo), tmp_path], check=True
        )
        lineas = Path(tmp_path).read_text(encoding="utf-8", errors="replace").splitlines()
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    items = []
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        m = CODIGO_RE.search(linea)
        if not m or not linea.strip():
            i += 1
            continue
        codigo = m.group(1)
        if capitulos is not None and codigo[:2] not in capitulos:
            i += 1
            continue
        bloque = [linea]
        j = i + 1
        while j < len(lineas):
            sig = lineas[j].strip()
            if not sig or CODIGO_RE.search(sig) or any(sig.startswith(h) for h in HEADERS):
                break
            if "0177" in sig and "GILSA" in sig:
                break
            bloque.append(lineas[j])
            j += 1
        texto = " ".join(l.strip() for l in bloque)
        m2 = re.search(r"U\.", texto)
        parte_valores = texto[m2.start():] if m2 else ""
        parte_desc = texto[m.start() + len(m.group(1)) + 1: m2.start()] if m2 else texto[m.start() + len(m.group(1)) + 1:]
        descripcion = re.sub(r"\s+", " ", parte_desc).strip()
        if not descripcion:
            descripcion = "SIN DESCRIPCION"
        u_esp = u_ayu = u_ane = total = None
        cant_ayu = None
        notas = None
        for v in VALORES_RE.finditer(parte_valores):
            if v.group(1):
                u_esp = normalizar_num(v.group(1))
            if v.group(2) and v.group(3):
                cant_ayu = int(v.group(2))
                u_ayu = normalizar_num(v.group(3))
            if v.group(4):
                notas = v.group(4)
        numeros_reales = []
        for n in NUMERO_RE.finditer(parte_valores):
            val = n.group(0)
            pre = parte_valores[max(0, n.start() - 1): n.start()]
            pos = parte_valores[n.end(): n.end() + 1]
            if "(" in pre or ")" in pos:
                continue  # notas "(nn)" de la columna anestesista
            if val in {"1", "2"} and "x" in parte_valores[max(0, n.start() - 2): n.start() + 2]:
                continue  # cantidad del patron "1x"/"2x"
            numeros_reales.append(val)
        if len(numeros_reales) >= 3:
            total = normalizar_num(numeros_reales[-1])
        elif len(numeros_reales) == 2:
            primero, ultimo = (normalizar_num(numeros_reales[0]), normalizar_num(numeros_reales[1]))
            if primero and ultimo and float(ultimo) >= 5 * float(primero):
                total = ultimo
        items.append(
            (codigo, descripcion, codigo[:2], "", u_esp, u_ayu, u_ane, cant_ayu, total, notas)
        )
        i = j
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--capitulos", default=None, help="capítulos a extraer, ej: 00,01")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    capitulos = args.capitulos.split(",") if args.capitulos else None
    items = extraer(args.pdf, capitulos)
    with args.out.open("w", encoding="utf-8") as f:
        f.write("codigo;descripcion;capitulo;seccion;uEspecialista;uAyudantes;uAnestesista;cantidadAyudantes;total;notas\n")
        for it in items:
            f.write(";".join("" if v is None else str(v) for v in it) + "\n")
    print(f"extraidos {len(items)} items -> {args.out}")


if __name__ == "__main__":
    main()
