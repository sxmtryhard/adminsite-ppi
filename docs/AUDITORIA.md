# ADMINSITE — Auditoría técnica (Fase 1)

Fecha: 2026-10-22 · Rama: `main` (commit `c236d89`, con cambios locales sin confirmar en `src/index.css` y `appointments.service.ts`).

## 1. Arquitectura real

| Aspecto | Hallazgo |
|---|---|
| Stack | React 19, TypeScript 6 (strict), Vite 8, Tailwind 3, React Router 7 (`createBrowserRouter`), framer-motion, lucide-react. **No** hay shadcn/ui (solo componentes propios `Button`, `Input`, `Modal`, `StatusBadge`). El README dice "React 18 / Router v6": desactualizado. |
| Backend | No hay backend propio. El navegador habla directamente con Firebase (Auth + Firestore). `storage` se inicializa pero no se usa. |
| Persistencia | Firestore, colecciones: `users`, `clients`, `barbers`, `services`, `appointments`, `products`, `sales`. |
| Reglas de seguridad | **No existen en el repositorio** (`firestore.rules`, `firebase.json` ausentes). Se desconoce qué reglas tiene el proyecto en la consola. |
| Despliegue | Vercel (SPA rewrite). |
| Pruebas | Ninguna. No hay runner de pruebas instalado. |
| Calidad | `tsc -b` pasa. `eslint .` falla con 9 errores preexistentes (7× `set-state-in-effect`, 1× `only-export-components`, 1× `no-empty`). |
| Requisito Java/Spring Boot | No hay evidencia en el repositorio. Pendiente de confirmar con el responsable. |

## 2. Estado funcional por módulo

| Módulo | Estado | Observaciones |
|---|---|---|
| Login | Funcional (solo email/contraseña) | Sin registro, verificación, recuperación ni límite de intentos propio. |
| Roles | **Inexistente en la práctica** | `AuthContext` asigna `role: 'admin'` por defecto si no hay documento `users/{uid}` o si falta el campo → **todo usuario autenticado es administrador**. `ProtectedRoute` solo comprueba sesión. |
| Dashboard | Parcial | "Ingresos" = suma de precios de citas completadas; ignora ventas POS. |
| Clientes | CRUD básico | Sin edición; borrado físico; no ligado a cuentas de usuario. |
| Barberos | CRUD básico | Sin cuenta de usuario, sin horarios/disponibilidad. |
| Servicios | CRUD básico | Tiene duración; no tiene costo directo. Sin edición de precio. |
| Citas | Parcial | Barbero como **texto libre**; hora libre; **sin control de solapamiento**; sin estados "confirmada/en curso"; borrado físico. |
| Productos | Parcial | Costo y precio existen; ajustes de stock sin historial; stock puede quedar negativo. |
| POS / ventas | Parcial | Venta y descuento de stock **no atómicos** (venta se guarda aunque falle el stock); sin control de stock en servidor; barbero texto libre; no se puede anular. |
| Historial | Parcial | Solo ventas; filtro "card" no contemplado. |
| Reportes | **Incorrecto** | Suma citas completadas + ventas POS: si un servicio se cobra en POS después de la cita, **se cuenta dos veces**. No hay costos, gastos, utilidad ni márgenes. |
| Configuración | **Solo visual** | El botón "Guardar" no persiste nada. |
| Header | **Decorativo** | Buscador, campana y "+ Nueva Cita" no hacen nada. Sidebar muestra badge "4" fijo y usuario "Samuel Correa" quemado. |
| Portal cliente / espacio barbero | Inexistentes | |
| Auditoría, gastos, inventario con movimientos, notificaciones | Inexistentes | |

## 3. Riesgos de seguridad (priorizados)

1. **Escalada de privilegios por defecto**: cualquier cuenta autenticada es tratada como admin.
2. **Sin reglas Firestore versionadas**: la seguridad real depende de una configuración desconocida en consola; si está en modo prueba, cualquiera con la API key (pública por diseño) puede leer/escribir todo.
3. **Autorización solo en el frontend**: los filtros de UI no protegen datos.
4. **Operaciones críticas no atómicas**: venta/stock, cita/contador de cliente.
5. **Doble reserva** posible (sin bloqueo de franja).
6. **Doble contabilización** de ingresos en reportes.
7. `console.error` con objetos de error completos en producción (bajo riesgo, pero ruido).

## 4. Decisión de arquitectura propuesta

Mantener React + Firebase (no migrar). La autorización se implementa en **reglas de Firestore versionadas** (rol leído de `users/{uid}`; el usuario nunca puede escribir su propio rol) y las operaciones críticas con **transacciones** del SDK cliente validadas por reglas:

- **Anti doble reserva**: documento de bloqueo por barbero y franja (`slots/{barberId}_{fecha}_{HH:mm}`) creado en la misma transacción que la cita; las reglas exigen que no exista → el segundo cliente falla aunque ambos reserven a la vez.
- **Ventas**: transacción que crea la venta, descuenta stock (rechaza si queda negativo) y registra movimientos de inventario con id determinista (sin duplicados).
- **Finanzas**: ingreso reconocido = ventas en estado `paid` no anuladas. Las citas completadas **no** son ingreso por sí mismas: generan un cobro (venta) vinculado `appointmentId`, que es lo único que se contabiliza.

Lo que **no** se puede hacer de forma segura solo con el cliente y requiere Cloud Functions (plan Blaze, de pago por uso): códigos de verificación propios por correo/SMS con expiración y hash, rate-limit de envíos, creación de cuentas del personal sin cerrar sesión del admin con garantías de servidor, recordatorios programados. Ver preguntas abiertas.

## 5. Plan priorizado

1. Identidad y permisos: roles reales, registro de clientes, verificación de email (Firebase Auth), recuperación de contraseña, rutas y navegación por rol, `firestore.rules`.
2. Operaciones: barberos ligados a usuarios, horarios, motor de disponibilidad, reservas con bloqueo de franja, estados y transiciones válidas.
3. Finanzas: ventas atómicas, anulaciones, inventario con movimientos, gastos, costos de servicio, dashboard de rentabilidad con fórmulas probadas.
4. Portal cliente y espacio barbero.
5. Auditoría, configuración persistente, pruebas (unitarias + reglas con emulador), documentación.
