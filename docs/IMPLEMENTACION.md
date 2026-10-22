# ADMINSITE — Implementación, configuración y pruebas

Complementa [AUDITORIA.md](AUDITORIA.md). Stack sin cambios: React 19 + TypeScript + Vite + Tailwind + Firebase (Auth + Firestore), plan **Spark** (sin Cloud Functions).

## 1. Decisiones de arquitectura

| Decisión | Motivo |
|---|---|
| Autorización en `firestore.rules`, no en el frontend | La API key web es pública; solo las reglas protegen los datos. |
| Rol en `users/{uid}.role`; nadie puede escribir su propio rol | El registro público solo puede crear `role: 'client'`. Sin perfil o sin rol válido **no hay acceso** (antes se asumía admin). |
| Datos privados en colecciones separadas (`serviceCosts`, `productCosts`, `saleCosts`, `barberPrivate`) | Firestore no oculta campos: si un documento es legible, lo es completo. Clientes y barberos leen catálogo y ventas sin ver costos. |
| Bloqueos de agenda `slots/{barberId}_{fecha}_{HHmm}` (15 min) en transacción | Dos reservas simultáneas sobre la misma franja: una falla. Las reglas además rechazan *update* de un bloqueo existente. |
| Ingreso reconocido = venta `paid` | Una cita completada no es ingreso; se cobra en Caja con `appointmentId` (una sola vez, validado en transacción y reglas). Elimina la doble contabilización del reporte anterior. |
| Ventas, anulaciones y movimientos de inventario en una transacción, con ids deterministas | Sin stock negativo, sin movimientos duplicados, reintentos idempotentes (`saleId` generado una vez por cobro). |
| Funciones puras en `src/domain/` | Fórmulas financieras, disponibilidad y transiciones de estado probadas sin Firebase. |
| Gráficos SVG propios | Sin dependencias nuevas (solo se autorizó `vitest`). |

## 2. Funcionalidades y rutas

**Públicas:** `/login`, `/registro` (solo clientes), `/recuperar`.

**Administrador** (`role: admin`)
| Ruta | Función |
|---|---|
| `/` | Dashboard de rentabilidad: ingresos, utilidad bruta/neta, márgenes, ticket promedio, costos, gastos, citas por estado, comparación con el periodo anterior, agenda del día, existencias bajas. |
| `/citas` | Agenda general por rango/barbero/estado; agendar con disponibilidad real (barbero específico o "cualquiera"); confirmar, iniciar, finalizar, no asistió, cancelar con motivo, reprogramar. `?nueva=1` abre el formulario. |
| `/ventas` | Caja: servicios y productos, descuento, efectivo/transferencia/datáfono (solo registro), citas completadas por cobrar. |
| `/historial` | Ventas y citas con filtros (fechas, barbero, método, estado, texto), anulación con motivo, CSV y PDF (impresión). |
| `/reportes` | Estado de resultados con periodo anterior, evolución diaria ingresos vs costos vs gastos, rentabilidad por servicio y producto, desempeño por barbero, clientes recurrentes, CSV/PDF. |
| `/clientes` | Búsqueda, paginación, alta de mostrador, edición, activar/desactivar, historial de citas y pagos. |
| `/barberos` | Alta, horario semanal con descansos, ausencias, teléfono y comisión privados, creación de cuenta de acceso. |
| `/servicios` | Precio, duración, costo directo, margen; cambios auditados. |
| `/productos` | Precio, costo promedio ponderado, entradas, ajustes con motivo, historial de movimientos, alertas de existencias bajas. |
| `/gastos` | Gastos operativos por fecha y categoría; anulación (no borrado). |
| `/usuarios` | Cambio de rol con confirmación, activar/desactivar, alta de administradores. |
| `/auditoria` | Registro inmutable de acciones sensibles. |
| `/configuracion` | Datos del estudio y políticas (antelación de cancelación, antelación mínima, ventana de reserva). |

**Barbero** (`role: barber`, vinculado a `barberId`): `/barbero` (citas de hoy con acciones rápidas, próximas, completadas del mes, servicios cobrados atribuibles, comisión solo si existe política), `/barbero/agenda` (próximas e historial con filtros), `/barbero/disponibilidad` (su jornada y ausencias).

**Cliente** (`role: client`): `/portal`, `/portal/reservar` (servicio → barbero o cualquiera → fecha/hora disponibles → confirmar; requiere correo verificado), `/portal/citas` (cancelar/reprogramar dentro de la política), `/portal/catalogo`, `/portal/historial` (servicios y pagos propios), `/portal/perfil`.

**Todos:** campana de notificaciones en tiempo real (reservas, cambios de estado, reprogramaciones).

## 3. Modelo de datos (Firestore)

| Colección | Contenido | Lectura | Escritura |
|---|---|---|---|
| `users/{uid}` | displayName, email, role, phone, barberId, active | propio, admin | propio (nombre/teléfono), registro como client, admin |
| `clients/{id}` | fullName, email, phone, notes, status, userId | propio (id = uid), admin | propio (campos limitados), admin |
| `barbers/{id}` | fullName, specialty, status, userId, schedule, blockedDates | autenticados | admin; barbero propio (schedule, blockedDates) |
| `barberPrivate/{id}` | phone, commissionRate | admin, barbero propio | admin |
| `services/{id}` · `serviceCosts/{id}` | catálogo · directCost | autenticados · admin | admin |
| `products/{id}` · `productCosts/{id}` | catálogo y existencias · avgCost | autenticados · admin | admin |
| `inventoryMovements/{id}` | tipo, cantidad, saldo, costo, motivo | admin | admin (crear; inmutable) |
| `appointments/{id}` | cliente, barbero, servicio (precio y duración validados contra el catálogo), date, time, startAt, slotIds, status, saleId | admin, barbero asignado, cliente dueño | ver reglas de transición |
| `slots/{barberId_fecha_HHmm}` | appointmentId, barberId, date | autenticados | crear solo si pertenece a una cita activa; nunca actualizar |
| `sales/{id}` · `saleCosts/{id}` | ítems, subtotal, descuento, total, método, estado · costos al momento de la venta | admin, barbero de la venta, cliente de la venta · admin | admin (crear, anular) |
| `expenses/{id}` | fecha, categoría, monto, estado | admin | admin (crear, anular) |
| `auditLogs/{id}` | acción, entidad, actor, detalle sin datos personales | admin | crear con actor = usuario; inmutable |
| `notifications/{id}` | userId, título, cuerpo, leído | destinatario | crear con actor = usuario; destinatario marca leída |
| `config/business` | políticas | autenticados | admin |

Estados de cita: `pending → confirmed → in_progress → completed`; `pending|confirmed → cancelled`; `confirmed → no_show`. El cliente solo cancela (o reprograma, y vuelve a `pending`) con la antelación configurada.

Datos antiguos: la lectura es tolerante (ventas sin estado cuentan como pagadas, sin costos → indicadores marcados incompletos). Citas antiguas sin `barberId`/`slotIds` no bloquean agenda. No hay script de migración (se confirmó que son datos de prueba).

## 4. Configuración requerida

### Variables de entorno (`.env`, ver `.env.example`)
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. No hay secretos de servidor. En Vercel se configuran como variables del proyecto.

### Pasos en la consola de Firebase (obligatorios)
1. **Publicar las reglas:** Firestore › Reglas › pegar `firestore.rules` › Publicar. (Con Firebase CLI: `firebase deploy --only firestore:rules`; la CLI no se instaló por decisión del responsable.) **Sin este paso la seguridad descrita no aplica.**
2. **Authentication › Método de acceso:** habilitar Correo/contraseña. Activar *Protección contra la enumeración de correos*.
3. **Authentication › Configuración › Dominios autorizados:** agregar el dominio de Vercel (para los enlaces de verificación y recuperación).
4. **Primer administrador:** crear el usuario en Authentication y, en Firestore, el documento `users/{UID}` con `{ email, displayName, role: "admin", phone: "", barberId: null, active: true }`. Los siguientes administradores y barberos se crean desde la app.
5. **Configuración del negocio:** entrar a `/configuracion` y guardar (crea `config/business`). Mientras no exista, las reglas usan 3 h de antelación para cancelar.
6. Plantillas de correo (opcional): Authentication › Plantillas, en español.

### Verificación de cuenta
Se usa **verificación por enlace de Firebase Authentication** (proveedor real, gratuito): expira, es de un solo uso y Firebase limita los envíos. Las reglas exigen `email_verified` para que un cliente reserve. **No** se implementó código OTP por correo ni SMS:
- SMS (Firebase Phone Auth) requiere plan Blaze y facturación por mensaje.
- Un OTP propio por correo necesita backend (Cloud Functions, Blaze) y un proveedor de correo (p. ej. SendGrid/Resend) con su API key en secretos del servidor.
Si el profesor exige código numérico, ese es el bloqueo y la ruta de implementación.

## 5. Pruebas ejecutadas (resultados reales)

| Comando | Resultado |
|---|---|
| `npm test` (vitest 5.0.3) | 4 archivos, **32 pruebas OK** |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin errores (antes: 9 errores preexistentes, corregidos) |
| `npm run build` | OK (advertencia de tamaño por Firebase; páginas cargadas por ruta) |
| Navegador (dev) | Redirección a `/login` sin sesión desde rutas de admin y cliente; validación del registro; vista móvil 375 px; consola sin errores |

Cubierto por pruebas unitarias: fórmulas de ingresos/costos/utilidad/márgenes con casos conocidos, ingresos cero, ventas anuladas, costos faltantes, límites de periodo en zona horaria de Bogotá, rankings, desempeño por barbero; motor de disponibilidad (jornada, descanso, franjas ocupadas, antelación, días bloqueados, reprogramación, "cualquier barbero"); transiciones de estado y política de cancelación; validaciones.

**No verificado automáticamente** (requiere el proyecto Firebase con reglas publicadas o el emulador, que no se instaló):
- Las reglas de Firestore no se han ejecutado contra el emulador. Se escribieron con cuidado pero deben probarse con el checklist de la sección 6.
- Flujos completos con sesión (reserva, cobro, anulación, permisos cruzados) no se ejecutaron: hacerlo implicaba crear cuentas en tu proyecto real.

Para pruebas de reglas automatizadas: `npm i -D firebase-tools @firebase/rules-unit-testing` y el emulador (Java 21 ya está instalado).

## 6. Cómo probar los tres perfiles (checklist de aceptación)

Preparación: `npm install`, `.env` completo, reglas publicadas, primer admin creado (sección 4), `npm run dev`.

**Administrador**
1. Ingresar → `/`. Guardar `/configuracion`.
2. `/servicios`: crear "Corte" 30.000 COP, 30 min, costo 5.000. `/productos`: crear "Cera" 20.000 COP con 10 unidades a 8.000.
3. `/barberos`: crear barbero, ajustar horario, *Acceso* con un correo tuyo → llega correo para definir contraseña.
4. Vender en `/ventas` 1 corte + 2 ceras → Dashboard: ingresos 70.000, costos 21.000, utilidad bruta 49.000 (70 %). Inventario de Cera = 8 y movimiento "Salida (venta)".
5. Registrar gasto de 20.000 → utilidad neta 29.000 (41,4 %).
6. `/historial`: anular la venta → ingresos vuelven a 0, Cera = 10, auditoría registra la anulación. Reintentar anular: rechazado.

**Cliente**
1. `/registro` → correo de verificación. Antes de verificar, `/portal/reservar` lo pide.
2. Verificar, "Ya verifiqué", reservar con barbero específico → aparece en `/citas` del admin y como notificación del barbero.
3. Con otra cuenta cliente, intentar la misma hora → ya no se ofrece; si dos navegadores confirman a la vez, uno recibe "Ese horario acaba de ser reservado".
4. Cancelar con antelación suficiente → la hora vuelve a estar disponible. Dentro del límite → botón deshabilitado y rechazo en reglas.
5. En la consola del navegador, `getDocs(collection(db,'appointments'))` sin filtro o leer `clients/{otro}` → *permission-denied*.

**Barbero**
1. Ingresar → `/barbero` muestra solo sus citas; confirmar, iniciar, finalizar.
2. Intentar abrir `/reportes` o `/ventas` → redirige a `/barbero`. Leer `saleCosts`, `expenses` o citas de otro barbero desde consola → *permission-denied*.
3. La cita finalizada aparece en Caja (admin) como "por cobrar"; al cobrarla, el barbero ve el ingreso atribuible y su comisión solo si el admin configuró porcentaje.

## 7. Pendiente / requiere decisión

- **OTP por correo o SMS, recordatorios programados y notificaciones por correo/SMS/push:** requieren plan Blaze + Cloud Functions + proveedor. Hoy las notificaciones son dentro de la app.
- **Riesgo residual de reglas:** la cita valida la primera y la última franja; un cliente malicioso que fabrique peticiones podría omitir franjas intermedias. Cerrarlo del todo requiere validar en servidor (Cloud Function) o probar una regla con verificación explícita por franja en el emulador.
- **Notificaciones:** cualquier usuario con perfil puede crear notificaciones para otro (spam posible, sin acceso a datos). Mitigación completa con Cloud Functions.
- **Pasarela de pagos:** no integrada (se registra el medio de pago). Si se requiere, Wompi o Mercado Pago necesitan backend para firmar transacciones y webhooks.
- Programa de fidelización: no implementado (no hay reglas de negocio definidas).
- Políticas por defecto (3 h de cancelación, 60 min de antelación, 30 días de ventana, horario sugerido L–V 9–19, S 9–17) son **valores configurables, no políticas aprobadas**.
