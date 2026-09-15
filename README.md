# 🌿 GreenSense — Sistema de Monitoreo Inteligente de Invernaderos

Panel web en tiempo real para el monitoreo y control de invernaderos/viveros. Desarrollado como Trabajo Final de Integración de la carrera **Analista de Sistemas**.

---

## ✨ Funcionalidades

| Sección | Descripción |
|---|---|
| **Dashboard** | 4 tarjetas de estado de sensores (humedad de suelo, temperatura, humedad ambiente, luminosidad), gráfico histórico configurable (24 h / 7 d / 30 d) y panel de riego. |
| **Alertas** | Historial de alertas con filtro por nivel (crítica / advertencia) y por sensor. |
| **Configuración** | Umbrales mínimo/máximo por sensor, riego automático y horarios programados. |
| **Reportes** | Exportación de historial de riego, consumo de agua y alertas en CSV o Excel. |

Todas las páginas requieren sesión. El token se guarda **solo en memoria** (nunca en `localStorage`) para mayor seguridad; al refrescar la página hay que volver a loguearse.

---

## 🛠️ Stack técnico

| Tecnología | Rol |
|---|---|
| React 19 + TanStack Start (Vite) | Framework SPA |
| Tailwind CSS v4 | Estilos con sistema de diseño agro (verdes y tierras) |
| Recharts | Gráficos de líneas del histórico de sensores |
| TanStack Router | Navegación y file-based routing |
| TanStack Query | Caché y sincronización de datos REST |
| Axios | Cliente HTTP |
| Socket.io-client | Lecturas en tiempo real vía WebSocket |
| Sonner | Notificaciones (toasts) |

---

## 📁 Estructura de carpetas

```
src/
├── components/         # Componentes reutilizables
│   ├── AppShell.tsx        # Layout principal (sidebar + nav inferior móvil)
│   ├── TarjetaSensor.tsx   # Tarjeta de estado de un sensor
│   ├── GraficoLecturas.tsx # Gráfico de líneas (Recharts)
│   ├── PanelRiego.tsx      # Estado y control del riego
│   ├── PanelClima.tsx      # Widget de clima externo (EMA Center API)
│   ├── TablaAlertas.tsx    # Tabla de alertas generadas
│   ├── SelectorInvernadero.tsx
│   └── EstadoCarga.tsx     # Skeletons y mensajes de error
├── context/
│   └── AuthContext.tsx     # Contexto de autenticación (token en memoria)
├── hooks/
│   ├── useInvernaderos.ts  # Lista y selección de invernaderos
│   └── useLecturasEnVivo.ts # Histórico REST + stream WebSocket
├── lib/
│   └── sensores.ts         # Metadatos y helpers de evaluación de sensores
├── routes/                 # File-based routing (TanStack Router)
│   ├── __root.tsx
│   ├── index.tsx           # Dashboard
│   ├── login.tsx
│   ├── alertas.tsx
│   ├── configuracion.tsx
│   └── reportes.tsx
├── services/
│   ├── api.ts              # Capa única de llamadas HTTP (fácil de conectar al backend)
│   ├── mock.ts             # Datos de ejemplo con curva día/noche realista
│   └── socket.ts           # Conexión WebSocket (o simulada en modo mock)
└── types/
    └── greensense.ts       # Tipos de dominio del sistema
```

---

## 🚀 Instalación y puesta en marcha

### Requisitos

- [Bun](https://bun.sh/) ≥ 1.1 (el proyecto usa `bun.lock`)
- Node.js ≥ 18 (requerido por algunas dependencias nativas)

### Pasos

```sh
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd greensense

# 2. Instalar dependencias
bun install

# 3. Copiar las variables de entorno
cp .env.example .env

# 4. Editar .env con los datos del backend (ver sección siguiente)

# 5. Iniciar el servidor de desarrollo
bun run dev
```

La app quedará disponible en `http://localhost:5173`.

---

## ⚙️ Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```dotenv
# URL base del backend REST/WebSocket de GreenSense.
# No incluir barra final.
VITE_API_URL=http://localhost:3000

# URL del relay WebSocket (Node, puerto 3001) si se usa backend real.
# No incluir barra final.
VITE_WS_URL=http://localhost:3001

# URL pública de la estación de la EMA Center API (Laboratorio Gugler).
# Opcional: se usa en modo demo para traer el clima externo real desde el navegador
# (la API pública responde con CORS habilitado para cualquier origen).
VITE_EMA_URL=https://emacenter.gugler.com.ar/api/station/1/

# Activar modo demo (sin backend real).
# true  → datos simulados con curva día/noche; el WebSocket es un intervalo local.
#         El widget de clima consulta EMA Center directamente (datos reales).
# false → se consumen los endpoints reales definidos en VITE_API_URL.
VITE_USE_MOCK=true
```

> **Modo demo (por defecto):** con `VITE_USE_MOCK=true` la app funciona completamente sin backend.
> Se generan datos realistas de 3 invernaderos de ejemplo, incluyendo alertas y estados de riego.
> El widget **Clima externo** consulta la **EMA Center API** del Laboratorio Gugler directamente
> desde el navegador (CORS `*`), mostrando datos meteorológicos reales de la estación
> Aramburu_Centro (Paraná). Para pasar al backend real, cambiar `VITE_USE_MOCK=false` y apuntar
> `VITE_API_URL` al servidor: ahí el clima pasa a servirse con cache de 60 s por `EmaCenter`.

## ⚙️ Backend

El backend live se encuentra en `backend/` y es un proyecto **PHP 8 orientado a objetos**
con Composer (autoload por classmap), base SQLite en `backend/var/` y un relay WebSocket en Node:

```powershell
# 1) Instalar dependencias (una vez)
cd backend
composer install        # genera vendor/autoload.php

# 2) Backend REST (puerto 3000); crea y siembra la base al primer arranque
php -S 0.0.0.0:3000 -t public

# 3) Relay WebSocket (puerto 3001, lecturas en vivo) — en otra terminal
node relay/socket-relay.mjs
```

Arquitectura (16 archivos bajo `backend/src/`):

```
src/Dominio/      # Entidades puras: Lectura, Invernadero, Alerta, Configuracion,
                  #   Umbral/HorarioRiego, EstadoRiego y Tipos (SensorId, NivelAlerta)
src/Persistencia/ # Conexion (singleton + esquema + seed), Repositorio (base) y Repositorios
src/Servicios/    # Casos de uso: Autenticacion, Simulador, Riego y Alertas (patrón Strategy)
src/Http/         # Router (front controller + auth Bearer) y Respuesta (JSON/CORS/descargas)
```

Credenciales de prueba: `productor@greensense.ar` / `demo1234`.

---

## 🌐 API REST esperada

Todos los endpoints se implementan en `src/services/api.ts`. Cuando el backend esté disponible, solo hay que configurar las variables de entorno.

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Login; devuelve `{ token, nombre }` |
| `GET` | `/api/invernaderos` | Lista de invernaderos del usuario |
| `GET` | `/api/invernaderos/:id/lecturas?desde=&hasta=` | Histórico de lecturas por rango |
| `GET` | `/api/invernaderos/:id/lecturas/ultima` | Última lectura de cada sensor |
| `GET` | `/api/invernaderos/:id/alertas` | Alertas generadas para el invernadero |
| `GET` | `/api/invernaderos/:id/riego` | Estado actual del riego |
| `POST` | `/api/invernaderos/:id/riego` | Activar/desactivar riego manual |
| `GET` | `/api/invernaderos/:id/configuracion` | Umbrales y horarios configurados |
| `PUT` | `/api/invernaderos/:id/configuracion` | Guardar configuración |
| `GET` | `/api/reportes/:tipo?formato=csv\|excel&desde=&hasta=` | URL de descarga de reporte |
| `GET` | `/api/contexto-climatico` | Clima externo de la estación EMA Center (cache 60 s) |

**WebSocket:** `${VITE_WS_URL}/lecturas` (por defecto `${VITE_API_URL}/ws/lecturas`)  
Evento recibido: `nueva_lectura` → `{ invernaderoId, sensor, valor, timestamp }`

---

## 🔐 Autenticación

En modo demo, cualquier correo electrónico válido con una contraseña de 4 o más caracteres inicia sesión.

Las credenciales de prueba precargadas en el formulario son:
- **Email:** `productor@greensense.ar`
- **Contraseña:** `demo1234`

---

## 📊 Datos de ejemplo (mock)

El archivo `src/services/mock.ts` genera datos con un patrón **día/noche realista**:

- **Luminosidad:** campana sinusoidal entre las 6:00 y las 20:00 (0 lux de noche, ~1.900 lux al mediodía).
- **Temperatura:** sigue a la luminosidad con ~2 h de retardo (mínimo de madrugada, máximo ~16:00).
- **Humedad ambiente:** inversa a la temperatura (máximo de noche, mínimo a la tarde).
- **Humedad de suelo:** decae lentamente y sube de golpe en los riegos de las 7:00 y las 19:00.

Se incluyen **3 invernaderos** y **4 alertas de ejemplo** para mostrar el funcionamiento de los filtros.

---

## 🏗️ Build de producción

```sh
bun run build
bun run preview
```

---

*Proyecto académico — Trabajo Final de Integración, Carrera Analista de Sistemas.*
