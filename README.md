# XAC Studio — Sistema de Gestión y Administración (AdminSite PPI)

Sistema web integral de gestión operativa y administrativa para barberías y salones de estética profesional. Desarrollado bajo una arquitectura Single Page Application (SPA) modular, reactiva y desacoplada, orientada al control de inventario en tiempo real, facturación ágil de mostrador (POS), programación de turnos y generación de balances financieros.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React 19, TypeScript (strict), Vite 8.
* **Estilos & Diseño:** Tailwind CSS 3 con tokens de diseño propios, Lucide React, framer-motion.
* **Enrutamiento:** React Router 7 (`createBrowserRouter`, rutas por rol y carga diferida).
* **Backend as a Service:** Firebase Authentication + Cloud Firestore con reglas de seguridad versionadas (`firestore.rules`).
* **Pruebas:** Vitest (dominio, plantillas de correo, verificación de tokens) y pruebas de `firestore.rules` contra el emulador de Firebase. CI en GitHub Actions.
* **Servidor:** funciones de Vercel en `api/` con lógica portable en `server/` (correo automático, ver `docs/CORREO.md`).

## 👥 Perfiles

| Perfil | Entrada | Alcance |
|---|---|---|
| Administrador | `/` | Negocio completo: agenda, caja, inventario, gastos, rentabilidad, usuarios, auditoría. |
| Barbero | `/barbero` | Solo su agenda, su disponibilidad y sus ingresos atribuibles. |
| Cliente | `/portal` | Reservas, catálogo, historial y perfil propios. Registro público con verificación de correo. |

## 🚀 Puesta en marcha

```bash
npm install
cp .env.example .env   # completar con la configuración web de Firebase
npm run dev
```

Antes de usarla, publica `firestore.rules` y crea el primer administrador: ver [docs/IMPLEMENTACION.md](docs/IMPLEMENTACION.md#4-configuración-requerida).

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas unitarias |
| `npm run test:rules` | Reglas de seguridad y correo contra el emulador de Firestore (requiere Java 11+) |
| `npm run typecheck` | Comprobación de tipos |
| `npm run lint` | ESLint |
| `npm run build` | Build de producción |

## 📚 Documentación

* [docs/AUDITORIA.md](docs/AUDITORIA.md): diagnóstico inicial, riesgos y plan.
* [docs/IMPLEMENTACION.md](docs/IMPLEMENTACION.md): arquitectura, rutas, modelo de datos, reglas, configuración, pruebas y pendientes.

---

## 📁 Arquitectura del Proyecto (`src/`)

```text
src/
├── components/   # UI reutilizable (common/, appointments/, barbers/, charts/)
├── context/      # Sesión y perfil (AuthProvider, useAuth/useSession)
├── domain/       # Reglas de negocio puras y probadas (finanzas, disponibilidad, estados, validación)
├── hooks/        # useAsync, useAvailability, useFinanceData, useSettings
├── layouts/      # AppLayout, Sidebar y navegación por rol, notificaciones
├── pages/        # Pantallas por módulo (admin, barber/, portal/, auth/)
├── routes/       # Rutas y guardas (ProtectedRoute, RoleRoute, PublicOnlyRoute)
├── services/     # Acceso a Firebase (transacciones, auditoría, notificaciones)
├── types/        # Modelos TypeScript
└── utils/        # Exportación CSV
```
