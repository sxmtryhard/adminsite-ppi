# XAC Studio — Sistema de Gestión y Administración (AdminSite PPI)

Sistema web integral de gestión operativa y administrativa para barberías y salones de estética profesional. Desarrollado bajo una arquitectura Single Page Application (SPA) modular, reactiva y desacoplada, orientada al control de inventario en tiempo real, facturación ágil de mostrador (POS), programación de turnos y generación de balances financieros.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React 18, TypeScript, Vite.
* **Estilos & Diseño:** Tailwind CSS, Lucide React (iconografía vectorial).
* **Enrutamiento:** React Router DOM (v6 con `createBrowserRouter` y rutas protegidas).
* **Backend as a Service (BaaS):** Firebase (Firestore Database, Firebase Authentication).
* **Control de Versiones:** Git & GitHub.

---

## 📁 Arquitectura del Proyecto (`src/`)

```text
adminsite-ppi/
├── public/                 # Activos estáticos públicos
├── src/
│   ├── components/         # Componentes UI reutilizables (Botones, Modales, Badges)
│   ├── context/            # Estado global (AuthContext, sesión de usuario)
│   ├── layouts/            # Estructuras de vista (AppLayout, Sidebar de navegación)
│   ├── lib/                # Configuración de librerías base y helpers del cliente
│   ├── pages/              # Módulos y vistas principales
│   │   ├── appointments/   # Agenda interactiva de turnos y recordatorios
│   │   ├── auth/           # Login y autenticación de administradores
│   │   ├── barbers/        # Gestión del staff de barberos
│   │   ├── clients/        # Directorio y registro de clientes
│   │   ├── dashboard/      # Panel general de métricas en tiempo real
│   │   ├── history/        # Historial de ventas y arqueo de caja con exportación
│   │   ├── pos/            # Punto de venta (POS), mostrador y facturación
│   │   ├── products/       # Control de inventario y stock físico
│   │   ├── reports/        # Balance financiero y rendimiento por barbero
│   │   ├── services/       # Catálogo y tarifas de servicios
│   │   └── settings/       # Preferencias de la barbería
│   ├── routes/             # Tabla de rutas y guardianes (`ProtectedRoute`)
│   ├── services/           # Capa de datos desacoplada (Firebase Firestore/Auth)
│   ├── types/              # Definiciones e interfaces de TypeScript
│   ├── utils/              # Funciones utilitarias (exportador CSV, formateadores)
│   ├── App.tsx             # Componente raíz
│   ├── index.css           # Directivas globales de Tailwind CSS
│   └── main.tsx            # Punto de entrada de la aplicación
├── .env                    # Variables de entorno locales (ignorado por Git)
├── .gitignore              # Configuración de exclusión de Git
└── vite.config.ts          # Configuración del bundler Vite y alias de rutas (@/)
