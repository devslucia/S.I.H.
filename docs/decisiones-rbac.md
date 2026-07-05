# Decisión: Row Level Security (RLS) en Supabase

**Fecha:** 2026-07-05  
**Estado:** Cerrada — RLS no implementada  
**Fase del proyecto:** Fase 2 (seguridad de datos)

---

## Contexto

El sistema S.I.H. (Sistema de Información Hospitalaria) es una aplicación Next.js que se conecta a una base de datos PostgreSQL en Supabase mediante Prisma ORM. La autenticación maneja 8 roles (ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR, ADMISION, FACTURACION, FARMACIA) con un sistema de RBAC completo implementado a nivel de API (Fase 1).

Se evaluó implementar Row Level Security (RLS) como capa adicional de protección de datos.

## Opciones evaluadas

### Opción A: Migrar a Supabase Auth
- Reemplazar NextAuth por Supabase Auth para login
- Mapear `auth.uid()` → `Usuario.id` en policies RLS
- **Rechazada por:** Alto riesgo (rompe login actual), requiere reescribir toda la autenticación, migrar passwords, cambiar frontend

### Opción B: Session variables de PostgreSQL
- Usar `SET LOCAL app.current_user_id` antes de cada query Prisma
- Policies RLS con `current_setting('app.current_user_id')::uuid`
- **Rechazada por:** Prisma usa PgBouncer (connection pooling). `SET LOCAL` solo vive dentro de una transacción. Requeriría envolver cada operación en transacciones explícitas, agregando complejidad y overhead de performance

### Opción C: JWT custom claims
- Generar JWT firmado con secret de Supabase, pasar `auth.jwt() ->> 'id'` en policies
- **Rechazada por:** Supabase Auth espera JWTs firmados con su propio secret, no con `NEXTAUTH_SECRET`. Requiere generar JWTs paralelos y configurar Supabase para aceptarlos

### Opción D: No usar RLS, reforzar API layer ✅
- La Fase 1 ya implementa `requireRole()` + `isInternacionVisibleForUser()` en los 59 endpoints
- Credenciales de service role solo en servidor (`.env`, no expuestas al cliente)
- **Seleccionada por:** Cobre el 95% de superficie de ataque con complejidad mínima

## Por qué RLS no habría funcionado (incluso si se hubiese implementado)

Verificación técnica realizada el 2026-07-05:

```
rol: postgres
rolsuper: false  
rolbypassrls: true  ← clave
```

La conexión `DATABASE_URL` usa el rol `postgres` de Supabase, que tiene `BYPASSRLS = true`. Esto significa que **todas las queries de Prisma habrían bypaseado cualquier policy RLS**, making las policies inútiles sin antes crear un rol de Postgres restringido específico para la aplicación.

## Qué garantiza la seguridad en su lugar

1. **RBAC a nivel API (Fase 1):** `requireRole()` valida el rol del usuario en cada endpoint antes de procesar cualquier query
2. **Filtro de pertenencia (Fase 1):** `isInternacionVisibleForUser()` verifica que la internación le pertenezca al usuario (MEDICO solo ve sus tratados, ANESTESIOLOGO solo ve sus cirugías)
3. **Credenciales de service role solo en servidor:** Las credenciales de Supabase están en `.env` (server-side only), nunca se exponen al cliente
4. **Middleware de autenticación:** Todas las rutas API requieren sesión válida (NextAuth JWT)

## Riesgo residual

El único escenario no protegido es si alguien obtiene acceso directo a la base de datos con credenciales de service role (por ejemplo, mediante acceso al `.env` o al servidor). Este riesgo se mitiga con:
- Acceso restringido al servidor y al archivo `.env`
- Logs de acceso a la base de datos (Supabase dashboard)
- Rotación periódica de credenciales

## Revisión futura

Si en el futuro se necesita RLS (por ejemplo, si se agrega un cliente móvil que accede directamente a Supabase), se deberá:
1. Crear un rol de Postgres restringido para la app (no usar `postgres`)
2. Migrar a Supabase Auth o implementar session variables
3. Crear policies RLS por tabla

---

*Documento generado como parte del checkpoint de Fase 2 del sistema S.I.H.*
