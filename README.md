# GreenThumb Dashboard

Prompt



Quiero que desarrolles el frontend de un dashboard web llamado GreenSense, un sistema de monitoreo y control inteligente para invernaderos/viveros. Es un proyecto académico (Trabajo Final de Integración de Analista de Sistemas), así que necesito código prolijo, comentado y con buenas prácticas, no un prototipo descartable.



Stack técnico

React 18 con Vite

Tailwind CSS para estilos

Recharts para gráficos

React Router para navegación

Axios para consumo de API REST

Socket.io-client para datos en tiempo real vía WebSocket

Diseño responsive (debe verse bien en tablet, porque se va a usar en el invernadero)

Contexto funcional



El sistema recibe datos de sensores (humedad de suelo, temperatura, humedad ambiente, luminosidad) desde uno o más invernaderos, vía un backend que expone:



GET /api/invernaderos — lista de invernaderos del usuario

GET /api/invernaderos/:id/lecturas?desde=&hasta= — histórico de lecturas

GET /api/invernaderos/:id/lecturas/ultima — última lectura de cada sensor

GET /api/invernaderos/:id/alertas — alertas generadas

POST /api/invernaderos/:id/riego — activar/desactivar riego manual

GET /api/invernaderos/:id/configuracion — umbrales configurados

PUT /api/invernaderos/:id/configuracion — actualizar umbrales

GET /api/reportes/:tipo?formato=csv|excel — descarga de reportes

WebSocket en /ws/lecturas que emite un evento nueva_lectura con { invernaderoId, sensor, valor, timestamp }

Páginas / secciones que necesito

Login — formulario simple, email + contraseña, guardar token en memoria (no localStorage)

Dashboard principal

Selector de invernadero (si hay más de uno)

4 tarjetas de estado actual: humedad de suelo, temperatura, humedad ambiente, luz — cada una con valor actual, ícono, y color según si está en rango normal, alerta o crítico

Gráfico de líneas con el histórico de las últimas 24hs de cada variable (Recharts), actualizándose en vivo por WebSocket

Selector de rango temporal (24hs / 7 días / 30 días)

Panel de estado del riego: si está activo o no, último riego, próximo riego programado, botón para activar/desactivar riego manual

Alertas

Listado de alertas generadas (tabla), con filtro por fecha y tipo (crítica/advertencia)

Cada alerta muestra: fecha, sensor, valor que la disparó, umbral configurado, si ya fue vista

Configuración

Formulario para definir umbrales por sensor (mínimo/máximo) por invernadero

Configuración de horarios de riego automático

Gestión de invernaderos (agregar/editar/eliminar)

Reportes

Selector de tipo de reporte (histórico de riego, consumo de agua estimado, alertas por período)

Selector de rango de fechas

Botón de exportar a Excel/CSV

Vista previa en tabla antes de descargar

Requisitos de diseño

Paleta de colores relacionada a naturaleza/agro: verdes y tierras, nada de colores genéricos de SaaS corporativo

Tipografía clara y legible, pensada para leerse rápido desde el celular estando en el campo

Estados de alerta bien visibles (rojo/naranja) sin ser agresivos

Sidebar o navbar simple con las 4 secciones

Loading states y manejo de errores de conexión (importante: el sistema puede perder conexión con el invernadero)

Datos de ejemplo (mientras no está el backend)



Generá un mock con datos realistas: humedad de suelo entre 20-70%, temperatura entre 15-35°C, humedad ambiente 40-90%, luz 0-2000 lux, con variación tipo curva día/noche a lo largo de 24hs (no valores aleatorios sin patrón). Simulá también 3-4 alertas de ejemplo.



Entregables

Estructura de carpetas clara (components, pages, hooks, services)

Un archivo services/api.js centralizando las llamadas a la API, fácil de reemplazar cuando el backend esté listo

Componentes reutilizables (tarjeta de sensor, gráfico, tabla de alertas)

README con instrucciones de instalación y variables de entorno necesarias (URL del backend)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e06bacd4-c097-4a2a-b69d-43ba112122e0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
