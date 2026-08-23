import * as XLSX from "xlsx";
import { importarAlfabeta } from "../lib/farmacia-import";

async function main() {
  const ruta = process.argv[2] || "/home/devlucia/Descargas/UGP_CAPITAL_VADIN-IPSM_JULIO_2026.xls";
  console.log(`Leyendo ${ruta}...`);

  const wb = XLSX.readFile(ruta);
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    console.error("No se encontró ninguna hoja en el archivo");
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  console.log(`Filas leídas: ${rows.length}`);

  const t0 = Date.now();
  const resultado = await importarAlfabeta(rows);

  console.log("\n=== RESULTADO IMPORT ALFABETA ===");
  console.log(`Procesados:   ${resultado.procesados}`);
  console.log(`Creados:      ${resultado.creados}`);
  console.log(`Actualizados: ${resultado.actualizados}`);
  console.log(`Omitidos:     ${resultado.omitidos}`);
  if (resultado.errores.length > 0) {
    console.log("\nPrimeros errores:");
    for (const e of resultado.errores) console.log(`  - ${e}`);
    if (resultado.omitidos > resultado.errores.length) {
      console.log(`  ... y ${resultado.omitidos - resultado.errores.length} más`);
    }
  }
  console.log(`\nDuración: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  });
