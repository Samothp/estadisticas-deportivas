# ⚽ Estadísticas Deportivas - Dashboard Avanzado

Una aplicación web moderna para el registro, análisis y visualización de estadísticas deportivas en tiempo real. Diseñada para entrenadores, analistas deportivos y equipos que buscan insights profundos sobre el rendimiento de jugadores y equipos.

## 🚀 Características Principales

### ✅ Funcionalidades Actuales
- **Registro en tiempo real** de estadísticas durante partidos
- **Cronómetro integrado** para seguimiento temporal preciso
- **Gestión completa** de jugadores, equipos y acciones
- **Visualización básica** con gráficos de goleadores
- **Filtrado por jornada** y búsqueda de estadísticas
- **API REST completa** con operaciones CRUD

### 🔥 Próximas Funcionalidades (En Desarrollo)
- **Dashboard configurable** con widgets personalizables
- **Métricas avanzadas** (promedios, tendencias, comparativas)
- **Visualizaciones interactivas** (timeline, heatmaps, scatter plots)
- **Exportación profesional** (PDF con gráficos, CSV, imágenes)
- **Filtros avanzados** con múltiples criterios simultáneos
- **Resúmenes automáticos** con insights y alertas
- **Diseño responsive** optimizado para móviles y tablets
- **PWA** con capacidades offline

## 🛠️ Tecnologías

### Backend
- **Node.js** con Express.js
- **SQLite** para persistencia de datos
- **Jest** para testing unitario

### Frontend
- **Vanilla JavaScript** (ES6+)
- **Chart.js** para visualizaciones
- **CSS Grid** para layouts responsivos
- **Progressive Web App** capabilities

## 📦 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm o yarn

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/estadisticas-deportivas.git
cd estadisticas-deportivas

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:3000`

### Configuración de Base de Datos
La base de datos SQLite se crea automáticamente al iniciar la aplicación por primera vez. No requiere configuración adicional.

## 🎮 Uso de la Aplicación

### 1. Registro de Estadísticas
1. Ve a la sección "Introducción de datos"
2. Haz clic en "Iniciar Partido" para comenzar el cronómetro
3. Selecciona la jornada, jugador, equipo y tipo de acción
4. Las estadísticas se registran automáticamente con el minuto actual

### 2. Visualización de Datos
1. Ve a la sección "Estadísticas"
2. Filtra por jornada específica o ve todas las estadísticas
3. Visualiza el gráfico de goleadores automáticamente generado
4. Edita o elimina estadísticas según sea necesario

### 3. Dashboard Avanzado (Próximamente)
- Widgets configurables con drag & drop
- Métricas calculadas automáticamente
- Gráficos interactivos avanzados
- Exportación profesional de reportes

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage
```

## 📊 Roadmap de Desarrollo

Consulta nuestro [ROADMAP.md](ROADMAP.md) para ver el plan detallado de desarrollo con 5 fases principales:

1. **Fase 1**: Funcionalidades Nuevas Básicas (4-6 semanas)
2. **Fase 2**: Experiencia de Usuario Premium (3-4 semanas)
3. **Fase 3**: Funcionalidades Avanzadas (4-5 semanas)
4. **Fase 4**: Optimización y Robustez (3-4 semanas)
5. **Fase 5**: Infraestructura y Testing (2-3 semanas)

## 🏗️ Arquitectura del Proyecto

```
estadisticas-deportivas/
├── controllers/          # Lógica de negocio
├── routes/              # Definición de rutas API
├── public/              # Archivos estáticos
│   ├── js/             # JavaScript del frontend
│   └── css/            # Estilos CSS
├── tests/              # Tests unitarios e integración
├── .kiro/              # Especificaciones y documentación
│   └── specs/          # Specs detallados por funcionalidad
├── database.js         # Configuración de base de datos
├── index.js           # Punto de entrada del servidor
└── index.html         # Interfaz principal
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Estándares de Código
- Usar ES6+ features
- Comentarios en español para lógica compleja
- Tests unitarios para nuevas funcionalidades
- Seguir la estructura modular existente

## 📝 API Documentation

### Endpoints Principales

#### Estadísticas
- `GET /api/stats` - Obtener todas las estadísticas
- `GET /api/stats?jornada=X` - Filtrar por jornada
- `POST /api/stats` - Crear nueva estadística
- `PUT /api/stats/:id` - Actualizar estadística
- `DELETE /api/stats/:id` - Eliminar estadística

#### Métricas (Próximamente)
- `GET /api/metrics/player/:id` - Métricas de jugador
- `GET /api/metrics/team/:team` - Métricas de equipo
- `GET /api/metrics/trends` - Análisis de tendencias

## 📄 Licencia

Este proyecto está bajo la Licencia ISC. Ver el archivo `LICENSE` para más detalles.

## 🐛 Reportar Problemas

Si encuentras algún bug o tienes una sugerencia, por favor:
1. Revisa los [issues existentes](https://github.com/tu-usuario/estadisticas-deportivas/issues)
2. Crea un nuevo issue con una descripción detallada
3. Incluye pasos para reproducir el problema si es un bug

## 📞 Contacto

- **Desarrollador**: [Tu Nombre]
- **Email**: tu-email@ejemplo.com
- **GitHub**: [@tu-usuario](https://github.com/tu-usuario)

---

⭐ Si este proyecto te resulta útil, ¡no olvides darle una estrella en GitHub!