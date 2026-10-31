# Guion de demostración — ADMINSITE (XAC Barber Studio)

URL: https://adminsite-ppi.vercel.app · Duración sugerida: 15–20 min.

## Antes de la clase (15 min, en este orden)

1. Entrar como **admin** (`samueltryhard12@gmail.com`).
2. **Configuración** → *Guardar configuración*. Luego, en *Datos de la versión anterior*, pulsar **Migrar** (mueve el costo de "cera ego" y el teléfono de juan manco a datos privados).
3. **Barberos → juan manco → Horario**: marcar días y horas → *Guardar disponibilidad*.
4. **Barberos → juan manco → Acceso**: crear su cuenta con un correo al que tengas acceso; abrir el correo y definir la contraseña.
5. **Servicios**: editar "clasico" y "Premium" y poner su *costo directo* (p. ej. 5.000 y 8.000).
6. Registrar una **cuenta de cliente** con otro correo y **verificarla** desde el correo (así no dependes del correo en vivo).
7. Tener abiertas 3 ventanas: admin (normal), barbero y cliente (incógnito / otro navegador).

## Recorrido

### 1. Seguridad y roles (2 min)
- Mostrar que el **registro público** solo crea clientes.
- Con la sesión del cliente, escribir `/reportes` en la URL → lo devuelve a su portal.
- Explicar: *"La seguridad no está en los botones sino en las reglas de Firestore: aunque alguien manipule la app, el servidor rechaza leer datos de otros o modificar roles y precios."*

### 2. Reserva del cliente (4 min)
- **Reservar**: servicio → barbero (o "Cualquier barbero") → fecha → solo aparecen horas realmente libres → confirmar.
- Mostrar la **campana del admin** ("Nueva reserva") y la del **barbero**.
- Intentar reservar la **misma hora** con otra cuenta → ya no aparece. Explicar el **bloqueo de franjas de 15 min en transacción**: si dos personas confirman al mismo tiempo, una recibe "Ese horario acaba de ser reservado".
- **Mis citas**: cancelar o reprogramar respeta la antelación configurada.
- **Admin → Citas → Día por barbero**: una columna por barbero. Dos citas a las 11:00 con barberos distintos quedan una al lado de la otra; en la misma columna nunca se cruzan porque el bloqueo de franjas lo impide. Lo sombreado es fuera de la jornada o el descanso.

### 3. Barbero (3 min)
- **Mi agenda → Calendario**: ve solo sus citas. Clic en la cita → *Confirmar* → *Iniciar* → *Finalizar*.
- **Mi día**: completadas del mes, ingresos atribuibles y comisión (solo si el admin configuró un %).
- **Disponibilidad**: puede marcar un día libre; desaparece de las horas ofrecidas al cliente.
- Explicar: *"El barbero no ve ingresos globales, costos, gastos ni citas de otros barberos."*

### 4. Caja e inventario (3 min)
- **Caja**: aparece la cita en *"Citas completadas por cobrar"* → cobrar (añadir 1 producto, descuento opcional, método de pago) → *Registrar cobro*.
- **Inventario**: las existencias bajaron y hay un movimiento "Salida (venta)".
- **Historial** → *Comprobante* (imprimible / PDF) → *Anular* con motivo → el stock vuelve y la venta deja de contar como ingreso.
- Explicar: *"Una cita completada no es ingreso hasta que se cobra, y solo se puede cobrar una vez: no hay doble contabilización."*

### 5. Rentabilidad (3 min)
- **Gastos**: registrar un gasto (p. ej. arriendo).
- **Dashboard** (periodo *Hoy*): ingresos, utilidad bruta, utilidad neta, márgenes y comparación con el periodo anterior.
- **Reportes**: estado de resultados, gráfico ingresos vs costos vs gastos, rentabilidad por servicio y producto, desempeño por barbero; exportar CSV/PDF.
- Fórmulas: utilidad bruta = ingresos − costos directos; margen bruto = utilidad bruta / ingresos × 100; utilidad neta = utilidad bruta − gastos operativos. Si falta un costo, el sistema lo marca **incompleto** en lugar de inventarlo.

### 6. Control (1 min)
- **Auditoría**: cambios de precio, cobros, anulaciones, cambios de estado y de rol con responsable y fecha.
- **Usuarios y roles**: cambiar un rol pide confirmación y queda auditado.

## Preguntas probables

| Pregunta | Respuesta |
|---|---|
| ¿Y si dos clientes reservan a la vez? | Transacción + documento de bloqueo por franja; las reglas impiden sobrescribirlo. Además, cada franja exige la anterior de la misma cita, así una cita larga no puede dejar huecos. |
| ¿Cómo evitan que un cliente vea datos de otro? | Reglas de Firestore por rol y propiedad; las consultas del cliente solo traen sus documentos. |
| ¿Hay correos automáticos? | Sí: funciones en el servidor (Vercel) verifican el token de Firebase, leen la cita en el servidor y envían un correo por perfil, una sola vez por evento, más un recordatorio diario a las 8:00. Se activan con las credenciales (docs/CORREO.md). Los SMS requieren un proveedor de pago. |
| ¿Cómo se calcula el costo de un producto? | Costo promedio ponderado con cada entrada de inventario; se congela en la venta. |
| ¿Pruebas? | 49 pruebas unitarias (finanzas, disponibilidad, estados, plantillas, verificación de tokens) y 47 contra el emulador de Firebase: 39 intentan romper las reglas de seguridad (escalar rol, ver datos ajenos, alterar precios, doble reserva, avisos falsos) y 8 prueban el correo de extremo a extremo. Corren solas en GitHub Actions con cada cambio. |

## Si algo falla en vivo
- **No salen horas** → el barbero no tiene horario (la pantalla lo indica) o el día está bloqueado.
- **"Cuenta sin perfil"** → la cuenta existe en Authentication pero no tiene documento en `users`.
- **No llega el correo** → revisar spam; *Reenviar* tiene espera de 60 s.
