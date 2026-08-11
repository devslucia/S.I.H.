export function normalizarTexto(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export interface StockItemInfo {
  id?: string;
  nTroquel?: string | null;
  nombre: string;
  presentacion?: string | null;
  laboratorio?: string | null;
  principioActivo?: string | null;
}

export function matchesStockItem(item: StockItemInfo, query: string): boolean {
  const q = normalizarTexto(query);
  if (!q) return true;
  return [item.nTroquel, item.nombre, item.presentacion, item.laboratorio, item.principioActivo]
    .some((v) => v != null && v !== "" && normalizarTexto(v).includes(q));
}

export function etiquetaStockItem(item: StockItemInfo): string {
  return [item.nTroquel, item.nombre, item.presentacion].filter(Boolean).join(" · ");
}