# Tamiz Pro

Sistema interno de operación gastronómica para **planificar, producir, preparar, expedir y administrar eventos**.

Construido con Next.js (App Router) + Prisma sobre MySQL, con autenticación por JWT y paneles operativos para cada etapa del flujo.

## Contenido
- [Qué resuelve](#qué-resuelve)
- [Módulos funcionales](#módulos-funcionales)
- [Stack técnico](#stack-técnico)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Modelo de datos (resumen)](#modelo-de-datos-resumen)
- [Autenticación y permisos](#autenticación-y-permisos)
- [API interna (resumen)](#api-interna-resumen)
- [Flujos operativos clave](#flujos-operativos-clave)
- [Troubleshooting](#troubleshooting)

## Qué resuelve
Tamiz Pro centraliza la operación diaria de eventos:
- consolidación de comandas y platos,
- planificación de necesidades de producción por fecha,
- gestión de producción y observaciones,
- entrega de materia prima,
- expedición (checklist de despacho),
- picking con desglose recursivo de elaboraciones,
- administración de usuarios y roles.

## Módulos funcionales
- `Calendario`: vista semanal de eventos y navegación al detalle por evento.
- `Planificación`: cálculo de producción desde recetas PT/MP y carga de ajustes.
- `Producción`: tablero operativo semanal, comentarios, acciones de adelantar/atrasar y exportación a Excel.
- `Entrega de MP`: seguimiento de materia prima con impresión/exportes.
- `Expedición`: checklist por evento y exportación a Excel.
- `Picking`: desglose recursivo por comanda, totales por elaboración y exportación a Excel.
- `Importar`: importación de maestro de recetas desde archivo Excel.
- `Usuarios`: ABM de cuentas, roles y cambio de contraseña.

## Stack técnico
- **Frontend**: Next.js 15, React 19, TypeScript, React Bootstrap, React Select, React Toastify, FullCalendar.
- **Backend**: Route Handlers de Next.js (`src/app/api/**`).
- **ORM / DB**: Prisma + MySQL.
- **Auth**: JWT en cookie `httpOnly` + middleware de protección.
- **Documentos/Reportes**: jsPDF + autotable, JSZip, xlsx/xlsx-js-style.

## Requisitos
- Node.js 20+
- npm 10+
- MySQL accesible desde la app

## Puesta en marcha
1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno (ver sección siguiente).

3. Sincronizar esquema Prisma:

```bash
npm run prisma:push
npm run prisma:generate
```

Si preferís migraciones versionadas:

```bash
npm run prisma:migrate
```

4. Ejecutar en desarrollo:

```bash
npm run dev
```

5. Abrir en navegador:
- `http://localhost:3000`
- login en `http://localhost:3000/acceso`

### Seed opcional
Existe un script de seed básico en `scripts/seed.ts`.

```bash
npx tsx scripts/seed.ts
```

## Variables de entorno
Crear `.env` con al menos:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"
JWT_SECRET="tu_clave_jwt"
API_KEY="clave_para_ingesta_externa_comandas"
```

Notas:
- `DATABASE_URL` lo usa Prisma.
- `JWT_SECRET` se usa para firmar/verificar sesión.
- `API_KEY` protege la ingesta externa (`/api/comanda`).
- La app trabaja en zona horaria `America/Argentina/Buenos_Aires` en rutas API.

## Scripts disponibles
- `npm run dev`: inicia entorno de desarrollo (Turbopack).
- `npm run build`: genera cliente Prisma y build productivo.
- `npm run start`: levanta build en modo producción.
- `npm run lint`: análisis estático (ESLint).
- `npm run prisma:migrate`: crea/aplica migraciones.
- `npm run prisma:push`: sincroniza esquema Prisma contra DB.
- `npm run prisma:generate`: genera cliente Prisma.
- `npm run prisma:refresh`: `db push + generate`.
- `npm run prisma:studio`: abre Prisma Studio.

## Modelo de datos (resumen)
Definido en `prisma/schema.prisma`.

Entidades principales:
- `User`, `Role`: usuarios y permisos.
- `Comanda`, `Plato`: eventos y platos asociados.
- `Receta`: maestro de recetas (PT/MP).
- `Produccion`: cantidades, comentarios y seguimiento operativo.
- `PlatoOculto`: control de visibilidad de platos.
- `Expedicion`: estado de despacho por comanda.

## Autenticación y permisos
- Login por `POST /api/login` (valida credenciales y setea cookie `token`).
- Logout por `POST /api/logout`.
- `middleware.ts` protege todas las rutas de app salvo `/acceso`.
- Roles operativos:
  - `admin`: gestión completa (incluye usuarios).
  - `editor`: operación diaria sin ABM de usuarios.
  - `consultor`: acceso de consulta en paneles restringidos.

## API interna (resumen)
Todas las rutas viven en `src/app/api`.

### Seguridad / sesión
- `POST /api/login`
- `POST /api/logout`
- `GET /api/session`
- `GET /api/usuarios/actual`

### Usuarios
- `GET|POST|PUT|DELETE /api/usuarios`

### Calendario / eventos / planificación
- `GET /api/calendario`
- `GET /api/evento`
- `GET /api/eventosPlanificacion`
- `GET|POST /api/planificacion`
- `GET|POST /api/planificacion/adelantarEvento`

### Producción
- `GET|POST /api/produccion`
- `POST /api/produccion/adelantar`
- `POST /api/produccion/atrasar`
- `POST /api/produccion/comentario`
- `POST /api/produccion/plato`
- `GET|POST /api/produccionItem`
- `GET|POST /api/produccionPrevia`

### Picking / expedición / detalle
- `GET /api/picking`
- `GET /api/picking/eventos`
- `GET /api/expedicion`
- `GET /api/expedicion/evento`
- `GET|POST|DELETE /api/exEvento`
- `GET /api/platoDetalle`

### Recetas / catálogos / importación
- `GET|POST /api/platos`
- `GET /api/recetas`
- `POST /api/importar/recetas`
- `GET|POST /api/entregaMP`
- `POST|PUT /api/materiaPrima`
- `POST|PUT /api/productoTerminado`
- `POST /api/pdf`
- `GET /api/generarPDF`
- `GET|POST|DELETE /api/ocultos`

### Integración externa
- `POST|DELETE /api/comanda`
- Requiere header `x-api-key` con valor `API_KEY`.

## Flujos operativos clave
1. **Ingreso de eventos/comandas**
- Sistema externo consume `POST /api/comanda`.
- Se registran comandas y platos en DB.

2. **Planificación y producción**
- Planificación calcula necesidades a partir del maestro de recetas.
- Producción ajusta cantidades y observaciones por día/salón.

3. **Picking / Entrega MP / Expedición**
- Picking desglosa elaboraciones por comanda.
- Entrega MP y Expedición completan control operativo y checklist.
- Módulos con exportaciones Excel y generación de PDF donde corresponde.

## Troubleshooting
- **No conecta a DB**: validar `DATABASE_URL` y permisos de usuario MySQL.
- **Prisma desactualizado**: ejecutar `npm run prisma:push && npm run prisma:generate`.
- **Sesión no persiste**: revisar `JWT_SECRET` y cookies del navegador.
- **401 en `/api/comanda`**: falta o no coincide `x-api-key`.
- **Build con reportes/PDF**: verificar dependencias instaladas (`jspdf`, `xlsx`, `xlsx-js-style`, `jszip`).

---

Si vas a extender el sistema, recomendación:
- mantener nuevas rutas bajo `src/app/api/<modulo>` con contrato consistente,
- documentar cambios funcionales en este README,
- agregar validaciones de entrada y códigos HTTP coherentes por endpoint.
