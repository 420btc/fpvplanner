

# 🚁 Planificador de Rutas FPV 3D

Aplicación para dibujar y visualizar rutas de drones FPV en 3D con curvas Bezier sobre un mapa real.

## Funcionalidades principales

### 1. Mapa 2D interactivo (vista principal)
- Mapa base usando **Leaflet** (OpenStreetMap) donde el usuario puede hacer clic para colocar puntos de control (waypoints)
- Los puntos se conectan con una curva Bezier suave de color azul
- Cada punto tiene un control de **altitud** ajustable con un slider
- Se pueden arrastrar los puntos para reposicionarlos
- Botones para agregar/eliminar puntos y limpiar la ruta

### 2. Vista 3D de la ruta
- Visualización 3D usando **React Three Fiber** que muestra la ruta en el espacio
- La ruta se renderiza como un tubo/línea 3D azul con curvas Bezier suaves
- Plano de terreno como referencia visual
- Cámara orbital para rotar y explorar la ruta desde cualquier ángulo
- Los waypoints visibles como esferas en 3D

### 3. Animación de simulación
- Botón "Simular vuelo" que anima una esfera (drone) recorriendo la ruta paso a paso
- Controles de play/pause y velocidad de simulación
- Vista de cámara que sigue al drone durante la simulación

### 4. Panel de información de ruta
- Distancia total estimada
- Altitud mínima y máxima
- Número de waypoints
- Lista editable de puntos con coordenadas y altitud

### 5. Guardar rutas localmente
- Las rutas se guardan en localStorage del navegador
- Se pueden nombrar, guardar, cargar y eliminar rutas anteriores

## Diseño de la interfaz
- **Layout dividido**: mapa 2D a la izquierda, vista 3D a la derecha (paneles redimensionables)
- **Panel lateral** con la lista de waypoints y controles
- **Barra superior** con nombre de ruta, botones de guardar/cargar y simulación
- Tema oscuro para mejor visualización de las rutas azules brillantes

## Tecnologías
- **Leaflet + react-leaflet** para el mapa 2D
- **React Three Fiber + Drei** para la vista 3D
- **Three.js CubicBezierCurve3** para las curvas suaves
- **localStorage** para persistencia de rutas

