"use client";

import { Plus, Trash2 } from "lucide-react";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import type { EffectiveRole } from "@/lib/quirofano-rbac";

const inputClass = "w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
const labelClass = "text-xs text-muted font-medium mb-1 block";
const btnClass = "px-4 py-2 text-sm rounded font-medium transition-colors";
const btnTeal = `${btnClass} bg-accent text-black hover:bg-accent/90`;

const POSICIONES = ["Decúbito dorsal", "Decúbito ventral", "Decúbito lateral", "Trendelenburg", "Anti-Trendelenburg", "Litotomía"];
const SANGRE_PERDIDA = ["No", "Sí - Leve", "Sí - Moderada", "Sí - Grave"];

interface TabIngresosEgresosProps {
  formData: any;
  update: (field: string, value: any) => void;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  canEdit: (field: string) => boolean;
}

export function TabIngresosEgresos({ formData, update, isReadOnly, effectiveRole, canEdit }: TabIngresosEgresosProps) {
  const isInstrumentador = effectiveRole === "INSTRUMENTADOR" || effectiveRole === "CIRCULANTE" || effectiveRole === "ADMIN";
  const isAnestesiologo = effectiveRole === "ANESTESIOLOGO" || effectiveRole === "ADMIN";
  // MEDICO also can edit vitals (confirmed exception)
  const canEditVitals = isAnestesiologo || effectiveRole === "MEDICO";

  const totalIngresos = formData?.balanceIngresos?.reduce((s: number, i: any) => s + Number(i.volumen || 0), 0) || 0;
  const totalEgresos = formData?.balanceEgresos?.reduce((s: number, i: any) => s + Number(i.volumen || 0), 0) || 0;
  const balanceTotal = totalIngresos - totalEgresos;

  const disabledBalance = isReadOnly || !isInstrumentador;
  const disabledVitals = isReadOnly || !canEditVitals;
  const disabledObs = isReadOnly || !isAnestesiologo;
  const disabledPosicion = isReadOnly || !isInstrumentador;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Balance de Líquidos */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Balance de Líquidos Intraoperatorio</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted font-medium">Ingresos</span>
              {!disabledBalance && <button onClick={() => {
                const arr = formData?.balanceIngresos || [];
                update("balanceIngresos", [...arr, { tipo: "SF", volumen: "", hora: "" }]);
              }} className="text-accent text-xs flex items-center gap-1"><Plus size={12} /> Agregar</button>}
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-2 py-1">Tipo</th><th className="px-2 py-1">Vol (ml)</th><th className="px-2 py-1">Hora</th>
                {!disabledBalance && <th className="px-2 py-1"></th>}
              </tr></thead>
              <tbody>
                {(formData?.balanceIngresos || []).map((i: any, idx: number) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-2 py-1"><select value={i.tipo} disabled={disabledBalance}
                      onChange={e => { const arr = [...formData.balanceIngresos]; arr[idx].tipo = e.target.value; update("balanceIngresos", arr); }}
                      className="bg-transparent border border-border rounded text-xs text-foreground w-full"><option value="SF">SF</option><option value="Plasma">Plasma</option><option value="Sangre">Sangre</option><option value="Medicación IV">Medicación IV</option><option value="Otro">Otro</option></select></td>
                    <td className="px-2 py-1"><input type="number" value={i.volumen} disabled={disabledBalance}
                      onChange={e => { const arr = [...formData.balanceIngresos]; arr[idx].volumen = e.target.value; update("balanceIngresos", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-20" /></td>
                    <td className="px-2 py-1"><input type="time" value={i.hora} disabled={disabledBalance}
                      onChange={e => { const arr = [...formData.balanceIngresos]; arr[idx].hora = e.target.value; update("balanceIngresos", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-20" /></td>
                    {!disabledBalance && <td className="px-2 py-1"><button onClick={() => {
                      const arr = formData.balanceIngresos.filter((_: any, j: number) => j !== idx); update("balanceIngresos", arr);
                    }} className="text-red"><Trash2 size={12} /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-accent mt-2">Total ingresos: {totalIngresos} ml</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted font-medium">Egresos</span>
              {!disabledBalance && <button onClick={() => {
                const arr = formData?.balanceEgresos || [];
                update("balanceEgresos", [...arr, { tipo: "Diuresis", volumen: "", hora: "" }]);
              }} className="text-accent text-xs flex items-center gap-1"><Plus size={12} /> Agregar</button>}
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-2 py-1">Tipo</th><th className="px-2 py-1">Vol (ml)</th><th className="px-2 py-1">Hora</th>
                {!disabledBalance && <th className="px-2 py-1"></th>}
              </tr></thead>
              <tbody>
                {(formData?.balanceEgresos || []).map((e: any, idx: number) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-2 py-1"><select value={e.tipo} disabled={disabledBalance}
                      onChange={ev => { const arr = [...formData.balanceEgresos]; arr[idx].tipo = ev.target.value; update("balanceEgresos", arr); }}
                      className="bg-transparent border border-border rounded text-xs text-foreground w-full"><option value="Diuresis">Diuresis</option><option value="Drenaje">Drenaje</option><option value="Pérdida estimada">Pérdida estimada</option></select></td>
                    <td className="px-2 py-1"><input type="number" value={e.volumen} disabled={disabledBalance}
                      onChange={ev => { const arr = [...formData.balanceEgresos]; arr[idx].volumen = ev.target.value; update("balanceEgresos", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-20" /></td>
                    <td className="px-2 py-1"><input type="time" value={e.hora} disabled={disabledBalance}
                      onChange={ev => { const arr = [...formData.balanceEgresos]; arr[idx].hora = ev.target.value; update("balanceEgresos", arr); }}
                      className="bg-transparent border-none text-sm text-foreground w-20" /></td>
                    {!disabledBalance && <td className="px-2 py-1"><button onClick={() => {
                      const arr = formData.balanceEgresos.filter((_: any, j: number) => j !== idx); update("balanceEgresos", arr);
                    }} className="text-red"><Trash2 size={12} /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-accent mt-2">Total egresos: {totalEgresos} ml</p>
          </div>
        </div>
        <div className={`mt-3 p-3 rounded text-sm font-medium ${balanceTotal >= 0 ? "bg-accent/10 text-accent" : "bg-red/10 text-red"}`}>
          Balance total: {balanceTotal >= 0 ? "+" : ""}{balanceTotal} ml
        </div>
      </div>

      {/* Signos Vitales Intraoperatorios */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Signos Vitales Intraoperatorios</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted text-xs uppercase tracking-wide">
              <th className="px-3 py-2">Hora</th><th className="px-3 py-2">TA Sist.</th><th className="px-3 py-2">TA Diast.</th>
              <th className="px-3 py-2">FC</th><th className="px-3 py-2">SatO2</th><th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">Obs.</th>
              {!disabledVitals && <th className="px-3 py-2"></th>}
            </tr></thead>
            <tbody>
              {(formData?.signosVitalesIntraop || []).map((sv: any, idx: number) => (
                <tr key={idx} className="border-t border-border">
                  <td className="px-3 py-1"><input type="time" value={sv.hora || ""} disabled={disabledVitals}
                    onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].hora = e.target.value; update("signosVitalesIntraop", arr); }}
                    className="bg-transparent border-none text-sm text-foreground w-20" /></td>
                    <td className="px-3 py-1"><input type="number" value={sv.taSistolica || ""} disabled={disabledVitals}
                    onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].taSistolica = e.target.value; update("signosVitalesIntraop", arr); }}
                    className="bg-transparent border-none text-sm text-foreground w-16" /></td>
                  <td className="px-3 py-1"><input type="number" value={sv.taDiastolica || ""} disabled={disabledVitals}
                    onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].taDiastolica = e.target.value; update("signosVitalesIntraop", arr); }}
                    className="bg-transparent border-none text-sm text-foreground w-16" /></td>
                  <td className="px-3 py-1"><input type="number" value={sv.fc || ""} disabled={disabledVitals}
                    onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].fc = e.target.value; update("signosVitalesIntraop", arr); }}
                    className="bg-transparent border-none text-sm text-foreground w-16" /></td>
                  <td className="px-3 py-1"><input type="number" value={sv.satO2 || ""} disabled={disabledVitals}
                    onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].satO2 = e.target.value; update("signosVitalesIntraop", arr); }}
                    className="bg-transparent border-none text-sm text-foreground w-16" /></td>
                  <td className="px-3 py-1"><input type="number" step="0.1" value={sv.temp || ""} disabled={disabledVitals}
                    onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].temp = e.target.value; update("signosVitalesIntraop", arr); }}
                    className="bg-transparent border-none text-sm text-foreground w-16" /></td>
                  <td className="px-3 py-1"><input type="text" value={sv.observacion || ""} disabled={disabledVitals}
                    onChange={e => { const arr = [...formData.signosVitalesIntraop]; arr[idx].observacion = e.target.value; update("signosVitalesIntraop", arr); }}
                    className="bg-transparent border-none text-sm text-foreground w-28" /></td>
                  {!disabledVitals && <td className="px-3 py-1"><button onClick={() => {
                    const arr = formData.signosVitalesIntraop.filter((_: any, j: number) => j !== idx); update("signosVitalesIntraop", arr);
                  }} className="text-red"><Trash2 size={12} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!disabledVitals && (
          <button onClick={() => {
            const arr = formData?.signosVitalesIntraop || [];
            update("signosVitalesIntraop", [...arr, { hora: "", taSistolica: "", taDiastolica: "", fc: "", satO2: "", temp: "", observacion: "" }]);
          }} className={`${btnTeal} flex items-center gap-1 text-xs mt-3`}>
            <Plus size={14} /> Agregar registro
          </button>
        )}
      </div>

      {/* Observaciones del Anestesiólogo */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Observaciones del Anestesiólogo</h3>
        <VoiceTextarea value={formData?.observacionesAnestesia || ""} onChange={(v) => update("observacionesAnestesia", v)}
          disabled={disabledObs} rows={4} placeholder="Observaciones anestesiológicas..." />
      </div>

      {/* Posición y Accesorios */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Posición y Accesorios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Posición operatoria</label>
            <select value={formData?.posicionOperatoria || ""} onChange={e => update("posicionOperatoria", e.target.value)}
              disabled={disabledPosicion} className={inputClass}>
              <option value="">Seleccionar</option>{POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Sonda</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={!!formData?.sondaNasogastrica} onChange={e => update("sondaNasogastrica", e.target.checked)}
                  disabled={disabledPosicion}
                  className="w-4 h-4 rounded border-border bg-background text-accent" /> Nasogástrica
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={!!formData?.sondaVesical} onChange={e => update("sondaVesical", e.target.checked)}
                  disabled={disabledPosicion}
                  className="w-4 h-4 rounded border-border bg-background text-accent" /> Vesical
              </label>
            </div>
          </div>
          <div>
            <label className={labelClass}>Diuresis intraoperatoria (cc)</label>
            <input type="number" value={formData?.diuresisIntraop ?? ""}
              onChange={e => update("diuresisIntraop", e.target.value ? Number(e.target.value) : null)}
              disabled={disabledPosicion} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sangre perdida</label>
            <select value={formData?.sangrePerdida || ""} onChange={e => update("sangrePerdida", e.target.value)}
              disabled={disabledPosicion} className={inputClass}>
              <option value="">Seleccionar</option>{SANGRE_PERDIDA.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
