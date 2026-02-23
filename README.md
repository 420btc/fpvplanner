# FPV Route Planner

Planificador visual de rutas para FPV con edición en mapa, patrones automáticos y simulación en 3D.

## Funcionalidades

- Creación de waypoints por clic en el mapa
- Patrones automáticos (círculo, espiral, figura 8 y óvalo)
- Simulación de dron sincronizada en 2D y 3D
- Visualización 3D con trazado de ruta
- Guardado y carga de rutas
- Métricas básicas de distancia y altitud

## Tecnologías

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Leaflet + React Leaflet
- Three.js + React Three Fiber + Drei

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Scripts

- `npm run dev` inicia el entorno de desarrollo
- `npm run build` genera el build de producción
- `npm run preview` previsualiza el build
- `npm run test` ejecuta tests con Vitest

## Estructura

- `src/components` UI y vistas principales
- `src/hooks` estado y lógica de rutas
- `src/lib` utilidades y patrones
- `src/types` tipos de dominio
