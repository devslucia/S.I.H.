# UX/UI para lanzamiento: sistema de diseño y criterios

**Fecha:** 2026-10-23
**Alcance:** mejora transversal sobre la UI existente. No se rediseñó desde cero, no se cambió lógica de negocio ni permisos (RBAC) y no se agregaron librerías nuevas.

## Sistema de diseño

### Piezas base (`components/ui/`)

| Pieza | Uso |
|---|---|
| `EstadoBadge` + `lib/estados.ts` | Única fuente de etiquetas y colores de estado: internación, cirugía, turno, prescripción, cama, guardia y carpeta. Antes había unas 12 copias con textos y tonos distintos (por ejemplo POSTQUIRURGICO aparecía en ámbar o en azul según la pantalla, y en el dashboard los turnos COMPLETADO/PRESENTE salían en crudo). |
| `States.tsx` | `LoadingState`, `SkeletonRows`, `EmptyState` (con ícono, descripción y CTA), `ErrorState` (con «Reintentar») y `AccessDenied`. Reemplazan unos 25 «Cargando...» y «No hay...» sueltos. |
| `Field.tsx` | `Field` (label + asterisco de obligatorio + error debajo del campo) y `FormSection` (agrupa campos con título). |
| `SaveButton.tsx` | Botón de guardado con tres estados (Guardar → Guardando… → ✓ Guardado) y el hook `useSavedFlag()`. |
| `Button` | Muestra spinner y texto a la vez mientras carga, foco visible solo con teclado, variante `danger-solid` y `aria-busy`. |
| `Input` | Asterisco rojo si es `required`, error con `role="alert"` y `aria-invalid`/`aria-describedby`, tipografía sans (antes era mono en todos los campos). |
| `Modal` | `role="dialog"`, foco inicial en el primer campo y restauración del foco al cerrar, botón «Cerrar» accesible, pie de acciones opcional (`footer`) y header fijo con el cuerpo scrolleable. Se quitó el «drag para cerrar», que podía cerrar el modal al seleccionar texto. |
| `Toast` | Borde lateral por tipo y más tiempo en pantalla para errores (7 s) y advertencias (6 s). No apila duplicados, muestra como máximo 4, usa `aria-live`, ocupa todo el ancho en mobile y su contexto es estable (memoizado). |
| `ConfirmDialog` | Tono `danger` o `primary`, `busyLabel` y botón destructivo sólido. |
| `OpsStat` (KPI) | Ahora es una card con borde de tono, valor más grande con separador de miles es-AR y chevron cuando es navegable. |

### Clases globales (`app/globals.css`)

- **Botones:** `btn-primary`, `btn-secondary`, `btn-danger`, `btn-danger-solid`, `btn-ghost` y el modificador `btn-sm`. Todos tienen foco visible, estado activo y `cursor-not-allowed` cuando están deshabilitados.
- **Formularios:** `field-label` y `field-error`. `input-field` marca en rojo los campos con `aria-invalid` y atenúa los deshabilitados y los de solo lectura.
- **Tablas:** `data-table`, con encabezado uniforme, hover por fila y bordes. Se aplica a 24 tablas.
- **Filtros y vistas:** `chip-active` / `chip-inactive`. Reemplazan el teal sólido, que generaba mucho ruido visual.
- **Mensajes inline:** `alert-error`, `alert-warning`, `alert-info`.
- **Foco por teclado:** visible en links y en elementos con `role="button"`.

### Contraste (WCAG AA)

- Modo oscuro: el acento sube a `120 170 186`. Contra el fondo `brand-soft` pasó de 3,7:1 a 5,4:1, que es el caso de la navegación activa y los chips.
- Modo claro: la advertencia baja a `163 72 6`. Sobre su propio fondo tintado pasó de 4,4:1 a 5,2:1.
- Placeholders con `text-muted` completo (≥ 4,7:1).
- Se quitaron colores fijos que rompían el modo oscuro: `bg-amber-50` en admisión, `bg-white` en farmacia y `bg-black/50` en facturación.

## Navegación y layout

- **Sidebar:** agrupado por tarea (Pacientes, Atención clínica, Gestión) y filtrado con la tabla única `lib/navegacion.ts`. Marca el ítem activo con barra lateral y `aria-current`, muestra el rol en español («Enfermería», no «ENFERMERO») y mientras carga la sesión muestra un skeleton en vez de todos los módulos.
- **Topbar:** breadcrumbs reales, por ejemplo «Historias clínicas › Paciente › Prescripciones», con links a los niveles superiores.
- **Contenido:** ancho máximo de 1600 px para pantallas grandes y link «Ir al contenido» para quienes navegan con teclado.

## Módulos

- **Login:** logo, labels asociados a los campos, autocompletado del navegador, mostrar u ocultar la contraseña, error con ícono y spinner en «Ingresando…».
- **Dashboard por rol:**
  - Saludo según la hora del día.
  - Los KPI y los accesos rápidos solo llevan link si el rol puede abrir ese módulo. Antes, por ejemplo, SECRETARIA y FARMACIA tenían links a Quirófano, Admisión o Enfermería que terminaban en 403.
  - Error con reintento, skeleton con la forma real de la pantalla y en mobile los KPI van en 2 columnas.
  - Se corrigió el texto «s/in actividad» → «Sin actividad».
- **Admisión:** asteriscos de obligatorio consistentes, error de CUIL debajo del campo, aviso de DNI duplicado legible en modo oscuro, errores con ícono y textos en voseo.
- **Historia clínica:**
  - Las altas médica, de enfermería y administrativa piden confirmación y explican la consecuencia (por ejemplo «libera la cama»).
  - Las alergias se ven en el encabezado.
  - Hay estados de error y de «no encontrada».
  - **Subpantallas** (evolución, prescripciones, anamnesis, epicrisis, enfermería, preanestesia, protocolo quirúrgico, medicación adicional): tienen un encabezado común (`HcSubpageHeader`) con un banner del paciente siempre visible (nombre, DNI, edad, cama, estado y **alergias**), «Volver a la historia clínica» y la acción principal arriba.
  - **Prescripción no medicamentosa:** muestra solo los campos del tipo elegido (dieta, estudio o práctica), valida que no quede vacía y muestra el error debajo del campo.
- **Enfermería:** el bloque de «Indicaciones nuevas» quedó compacto (3 ítems y «Ver todas») para que la lista de pacientes se vea sin scrollear, y los toggles de vista son chips.
- **Quirófano y libro:**
  - Mismo estilo de labels en todas las pestañas.
  - «Tu rol: Cirujano / ayudante» en lugar de «ROL: MEDICO».
  - Guardar borrador muestra «Guardado».
  - Las tablas de prácticas, implantes y medicamentos usan `data-table`.
- **Guardia:** fecha en formato dd/mm/aaaa y filtro de fecha de ancho fijo.
- **Farmacia:** KPI con separador de miles y acciones por fila compactas.
- **Facturación:** importes en formato argentino ($ 1.234,56) y filtros con chips.
- **Configuración:** tablas unificadas y labels consistentes.
- **Accesibilidad:** 36 botones que solo tenían ícono ahora tienen `aria-label` («Eliminar», «Editar», «Cerrar», «Actualizar»…). Las iniciales de los avatares van en mayúscula.

## Pendiente de pulido (no bloquea el lanzamiento)

- `Field` y `FormSection` quedaron creados pero todavía no se usan en ninguna pantalla. Los formularios críticos (admisión y prescripciones) muestran el error debajo del campo con `Input` (`required` + `error`). Falta migrar a `Field`/`FormSection` los formularios largos de configuración, de la anestesia (grilla intraoperatoria) y del panel médico.
- El panel médico tiene su propio formulario de prescripción, distinto al de la HC: conviene unificarlos.
- Algunas tablas internas de enfermería y anestesia mantienen su estilo propio por densidad.
- SECRETARIA no puede leer `/api/obras-sociales` (es un permiso actual, no se tocó). El consultorio funciona, pero deja un 403 en la consola.
