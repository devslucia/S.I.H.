# SIH — Reglas de proyecto

## Identidad visual (Clínica Premium)
- Producto: SIH · estilo clínica premium · serio, no genérico.
- Brand: `#0F4C5C` · Fondo: `#F7F6F3` · Superficie: `#FFFFFF`.
- Tipografías: IBM Plex Sans (UI), Source Serif 4 (datos clínicos/pacientes), IBM Plex Mono (etiquetas y estados).
- Casi sin sombras, radio ≤ 8px, densidad media-alta. Cero UI template tipo shadcn.
- Componentes base obligatorios: `PageHeader`, `OpsStat`, `AlertList`, `StatusBadge`, `PrimaryActionBar`, `PatientSearchPanel`, `BedPicker`, `BedMap`, `CamaDetailPanel`, `CirugiaCard`, `DateNavigator`.
- Siempre: tipos estrictos, no crear estilos one-off (crear componente reutilizable), validar `tsc`+`lint`+`build` por módulo.

## Regla permanente: Dashboard y navegación por rol
Cada rol ve un SIH distinto. No todos entran al mismo tablero ni con los mismos accesos.

| Rol | Enfoque del dashboard / home |
|-----|------------------------------|
| ADMIN | Visión completa del sanatorio |
| ADMISION | Camas, ingresos, pacientes en espera |
| MEDICO | Sus pacientes, quirófano asignado, HC, interconsultas |
| ANESTESIOLOGO | Cirugías asignadas, preanestesia, parte anestésico |
| INSTRUMENTADOR / CIRCULANTE | Quirófanos del día, libro operativo |
| ENFERMERO | Camas, controles, prescripciones, hoja de enfermería |
| SECRETARIA | Turnos, agenda de médicos asignados |

Aplica a:
1. Dashboard principal (KPIs y accesos según rol).
2. Sidebar (solo módulos permitidos).
3. Cada módulo (acciones visibles según permiso, no solo bloquear en API).

Estado: **el sidebar ya filtra por rol**; el dashboard aún muestra KPIs globales a todos → corregir en pasada final de coherencia.