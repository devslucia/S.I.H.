export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcularPreciosUnitarios(input: {
  precioCompra?: number | string | null;
  precioVenta?: number | string | null;
  fraccion?: number | string | null;
}) {
  const compra = input.precioCompra != null && input.precioCompra !== "" ? Number(input.precioCompra) : NaN;
  const venta = input.precioVenta != null && input.precioVenta !== "" ? Number(input.precioVenta) : NaN;
  const f = input.fraccion != null && input.fraccion !== "" ? Number(input.fraccion) : NaN;

  return {
    precioUnidadCompra: !Number.isNaN(compra) && !Number.isNaN(f) && f > 0 ? redondear2(compra / f) : null,
    precioUnidadVenta: !Number.isNaN(venta) && !Number.isNaN(f) && f > 0 ? redondear2(venta / f) : null,
  };
}

export function formatearPrecio(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}