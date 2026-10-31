# Correo automático: configuración

El sistema envía correos automáticos al reservar, confirmar, cancelar o reprogramar una cita, y un recordatorio el día anterior a las 8:00 (hora de Bogotá). Mientras no esté configurado, las funciones responden `503` y la app sigue funcionando con los avisos internos de la campana.

## Qué recibe cada perfil

| Evento | Cliente | Barbero | Administración |
|---|---|---|---|
| Reserva del cliente | "Recibimos tu solicitud" | "Nueva cita" | "Nueva solicitud de cita" |
| Reserva en mostrador (admin) | "¡Tu cita está confirmada!" | "Nueva cita" | — |
| Confirmación | "¡Tu cita fue confirmada!" | — | — |
| Cancelación | "Tu cita fue cancelada" (con motivo) | "Cita cancelada" | "Cita cancelada" (si no la canceló un admin) |
| Reprogramación | "Tu cita fue reprogramada" | "Cita reprogramada" | — |
| Día anterior, 8:00 | "Recordatorio: tu cita es mañana" | — | — |

Nadie recibe correo de su propia acción. Cada correo se envía una sola vez: queda registrado en `mailLog`, que la app no puede leer ni escribir.

## Variables de entorno (Vercel → Settings → Environment Variables)

**No pegues estos valores en el chat ni en el código.**

| Variable | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Contenido completo del JSON de la cuenta de servicio (paso 1) |
| `GMAIL_USER` | Correo de Gmail que envía, p. ej. `xacbarberstudio@gmail.com` |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de 16 letras (paso 2) |
| `APP_URL` | `https://adminsite-ppi.vercel.app` (o el dominio propio) |
| `CRON_SECRET` | Texto aleatorio largo (paso 3); habilita el recordatorio diario |
| `STUDIO_NAME` | Opcional. Por defecto "XAC Barber Studio" |

### 1. Cuenta de servicio de Firebase
Firebase Console → ⚙️ Configuración del proyecto → **Cuentas de servicio** → **Generar nueva clave privada**. Se descarga un `.json`: ábrelo, copia todo el contenido y pégalo como valor de `FIREBASE_SERVICE_ACCOUNT`. Después **borra el archivo** del computador. Esta clave da acceso total a la base de datos.

### 2. Contraseña de aplicación de Gmail
1. En la cuenta de Gmail de la barbería, activa la **verificación en dos pasos** (myaccount.google.com → Seguridad).
2. Ve a myaccount.google.com/apppasswords, crea una llamada "ADMINSITE" y copia las 16 letras en `GMAIL_APP_PASSWORD`.

Gmail gratuito permite unos 500 correos al día, suficiente para una barbería.

### 3. CRON_SECRET
Cualquier texto aleatorio de 32 caracteres o más. Puedes generarlo en una terminal con:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Aplicar
Después de guardar las variables: Vercel → Deployments → el último → **Redeploy**. Para probar, reserva una cita con una cuenta de cliente: el barbero y el admin deben recibir el correo en menos de un minuto (revisa spam la primera vez).

## Cómo está construido (portable para Hostinger)
- `server/`: lógica sin dependencia del hosting.
  - `appointmentMail.ts`: verifica el token de Firebase, lee la cita en el servidor, autoriza y envía.
  - `emailTemplates.ts`: plantillas.
  - `config.ts`: variables de entorno.
  - `http.ts`: utilidades HTTP sobre Node puro.
- `api/notificar.ts` y `api/recordatorios.ts`: adaptadores de Vercel con la firma `(req, res)` de Node. En Hostinger (plan con Node.js) sirven igual montados en un servidor Express. El cron diario se reemplaza por una tarea programada que llame a `/api/recordatorios` con `Authorization: Bearer <CRON_SECRET>`.
- Pruebas: `server/*.test.ts` (plantillas y verificación del token) y `tests/rules/appointmentMail.test.ts`, de extremo a extremo con el emulador y un buzón falso.
