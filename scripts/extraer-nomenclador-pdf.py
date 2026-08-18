#!/usr/bin/env python3
"""Extrae items del Nomenclador Nacional (PDF GILSA, ~141 págs) a CSV.

v3: parseo por POSICIÓN ABSOLUTA contra el encabezado de columnas que se
    repite en cada página del PDF. El header ("CODIGO ... HONORARIOS GASTOS
    TOTAL" + "... Especialista Ayudantes Anestesista") varía su posición por
    página, así que las columnas se anclan en cada página a ese header.

Uso:
    python3 scripts/extraer-nomenclador-pdf.py ~/Descargas/Gilsa-Integral-Salud-1.pdf \
        --out prisma/seed-data/nomenclador_nacional.csv

Columnas de salida (separador ';', decimales con punto):
    codigo;descripcion;capitulo;seccion;uEspecialista;uAyudantes;uAnestesista;cantidadAyudantes;gastos;total;notas

Notas de fiabilidad:
- uEspecialista/uAyudantes/uAnestesista/gastos/total: números alineados a las
  columnas del header de cada página (confiable; columna vacía -> campo vacío)
- cantidadAyudantes: patrón "Nx" (confiable); sin "Nx" con valor en columna
  Ayudantes -> 1 ayudante implícito
- notas: referencias "(nn)" de las columnas anestesista/gastos/total, unidas
- seccion: título de sección (ej "OPERACIONES EN EL CRANEO") del encabezado
  NN.NN que precede a los ítems
- capitulo: 2 primeros dígitos del código
"""
import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

CODIGO_RE = re.compile(r"^\s*(\d{2}\.\d{2}\.\d{2})\.\s")
SECCION_RE = re.compile(r"^\s*(\d{2}\.\d{2})\s{2,}([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9.,/\- ]*)$")
NOTA_RE = re.compile(r"\((\d{1,2})\)")
NUMERO_RE = re.compile(r"(\d[\d.,]*)")
MARGEN = 3


def normalizar_num(txt: str):
    if txt is None:
        return None
    txt = txt.replace(",", ".").strip()
    try:
        return f"{float(txt):g}" if txt else None
    except ValueError:
        return None


def num_col(linea: str, rango: tuple[int, int], saltar: list[int]) -> str | None:
    """Primer número cuya posición absoluta cae en [ini, fin)."""
    ini, fin = rango
    for m in NUMERO_RE.finditer(linea):
        if m.start() < ini:
            continue
        if m.start() >= fin:
            break
        if m.start() not in saltar:
            return m.group(1)
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

    # columnas actuales: se actualizan con el header de cada página
    cols = {"esp": 72, "ayu": 95, "anest": 117, "gastos": 131, "total": 145}

    def rango(nombre: str) -> tuple[int, int]:
        nombres = ["esp", "ayu", "anest", "gastos", "total"]
        ini = cols[nombre] - MARGEN
        i = nombres.index(nombre)
        fin = cols[nombres[i + 1]] if i + 1 < len(nombres) else 10**6
        return (ini, fin)

    items = []
    seccion_actual = None
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        if "GASTOS" in linea and "TOTAL" in linea and "CODIGO" in linea[:20]:
            cols["gastos"] = linea.find("GASTOS")
            cols["total"] = linea.find("TOTAL")
            if i + 1 < len(lineas) and "NOMENCLADOR" in lineas[i + 1]:
                l2 = lineas[i + 1]
                cols["esp"] = l2.find("Especialista")
                cols["ayu"] = l2.find("Ayudantes")
                cols["anest"] = l2.find("Anestesista")
            i += 2
            continue
        # título de sección: "NN.NN   TITULO" sin código de ítem
        sm = SECCION_RE.match(linea)
        if sm and not CODIGO_RE.match(linea):
            seccion_actual = sm.group(2).strip()
            i += 1
            continue
        m = CODIGO_RE.match(linea)
        if not m or "U." not in linea:
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
            if not sig or CODIGO_RE.match(lineas[j]) or SECCION_RE.match(lineas[j]):
                break
            if "GASTOS" in lineas[j] and "TOTAL" in lineas[j]:
                break
            bloque.append(lineas[j])
            j += 1
        primero = bloque[0]
        # descripción: entre el código y el primer "U."
        ud = primero.find("U.")
        parte_desc = primero[m.end(): ud] if ud >= 0 else primero[m.end():]
        descripcion = re.sub(r"\s+", " ", parte_desc).strip()
        if not descripcion:
            descripcion = "SIN DESCRIPCION"
        # valores: solo el primer renglón (columna U.); filas "$" se ignoran
        saltar = [mm.start() for mm in re.finditer(r"(\d{1,2})x\s", primero)]
        u_esp = normalizar_num(num_col(primero, rango("esp"), saltar))
        u_ayu = normalizar_num(num_col(primero, rango("ayu"), saltar))
        u_ane = normalizar_num(num_col(primero, rango("anest"), saltar))
        gastos = normalizar_num(num_col(primero, rango("gastos"), saltar))
        total = normalizar_num(num_col(primero, rango("total"), saltar))
        mx = re.search(r"(\d{1,2})x\s", primero)
        cant_ayu = int(mx.group(1)) if mx else (1 if u_ayu else None)
        notas = ",".join(NOTA_RE.findall(" ".join(l.strip() for l in bloque))) or None
        items.append(
            (codigo, descripcion, codigo[:2], seccion_actual or "",
             u_esp, u_ayu, u_ane, cant_ayu, gastos, total, notas)
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
        f.write("codigo;descripcion;capitulo;seccion;uEspecialista;uAyudantes;uAnestesista;cantidadAyudantes;gastos;total;notas\n")
        for it in items:
            f.write(";".join("" if v is None else str(v) for v in it) + "\n")
    print(f"extraidos {len(items)} items -> {args.out}")


if __name__ == "__main__":
    main()