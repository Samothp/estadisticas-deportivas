# Implementation Plan - Dashboard Avanzado y Estadísticas Mejoradas

- [x] 1. Setup de infraestructura base y sistema de widgets

  - Crear estructura de directorios para el nuevo sistema modular
  - Implementar clase base BaseWidget y factory pattern para widgets
  - Configurar grid system CSS responsive con breakpoints
  - _Requirements: 3.1, 3.2_

- [x] 1.1 Crear estructura modular del proyecto




  - Crear directorios: `/public/js/widgets/`, `/public/js/charts/`, `/public/js/utils/`
  - Implementar módulo principal `DashboardManager` con patrón singleton
  - Crear archivo de configuración `dashboard-config.js` con layouts y settings
  - _Requirements: 3.1_

- [x] 1.2 Implementar sistema base de widgets
  - Crear clase abstracta `BaseWidget` con métodos render(), update(), configure()
  - Implementar `WidgetFactory` para crear widgets dinámicamente por tipo
  - Crear sistema de eventos para comunicación entre widgets
  - _Requirements: 3.2, 3.3_

- [x] 1.3 Configurar grid system responsive



  - Implementar CSS Grid layout con 12 columnas y breakpoints móvil/tablet/desktop
  - Crear clases CSS para tamaños de widget (small, medium, large, xlarge)
  - Integrar librería Sortable.js para drag & drop functionality
  - _Requirements: 3.2_

- [x] 2. Implementar Metrics Calculator y API extendida


  - Crear servicio MetricsCalculator con cálculos de estadísticas avanzadas
  - Extender statsController con endpoints para métricas calculadas
  - Implementar cache básico en memoria para optimizar cálculos repetitivos
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.1 Crear MetricsCalculator service


  - Implementar cálculos de métricas por jugador: goles/partido, asistencias/partido, eficiencia
  - Crear métodos para métricas de equipo: promedio goles, distribución acciones
  - Implementar análisis de tendencias con detección de mejoras/deterioros >20%
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.2 Extender API con endpoints de métricas


  - Crear ruta GET `/api/metrics/player/:id` para métricas de jugador
  - Crear ruta GET `/api/metrics/team/:team` para métricas de equipo
  - Crear ruta GET `/api/metrics/trends` para análisis de tendencias
  - Implementar validación de parámetros y manejo de errores
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.3 Implementar sistema de cache básico



  - Crear clase `MetricsCache` con TTL de 5 minutos para cálculos
  - Implementar invalidación de cache cuando se agregan nuevas estadísticas
  - Crear middleware de cache para endpoints de métricas
  - _Requirements: 1.1, 1.2_

- [x] 3. Desarrollar Advanced Charts Engine


  - Extender Chart.js con 4 nuevos tipos de gráficos interactivos
  - Implementar TimelineChart para evolución temporal de métricas
  - Crear ComparisonChart para comparativas entre entidades
  - Desarrollar HeatmapChart para visualización de intensidad
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.1 Crear AdvancedChartEngine base


  - Implementar clase `AdvancedChartEngine` con factory pattern para tipos de gráficos
  - Crear configuración base común para todos los gráficos (tooltips, responsividad)
  - Implementar sistema de temas para consistencia visual
  - _Requirements: 2.1, 2.6_

- [x] 3.2 Implementar TimelineChart


  - Crear gráfico de líneas temporal con múltiples series de datos
  - Implementar zoom interactivo y navegación por rangos de jornadas
  - Agregar marcadores para eventos significativos (hitos, cambios de tendencia)
  - _Requirements: 2.2, 2.6_

- [x] 3.3 Desarrollar ComparisonChart


  - Crear gráfico de barras horizontales para comparar hasta 5 entidades
  - Implementar normalización de métricas para comparación justa
  - Agregar colores distintivos y leyenda interactiva
  - _Requirements: 2.3, 2.6_

- [x] 3.4 Crear HeatmapChart


  - Implementar matriz de calor para intensidad por jugador/minuto
  - Crear escala de colores configurable con leyenda explicativa
  - Agregar interactividad para drill-down a detalles específicos
  - _Requirements: 2.5, 2.6_

- [x] 4. Implementar widgets específicos del dashboard



  - Crear TopPlayersWidget con ranking de goleadores
  - Desarrollar TeamStatsWidget con métricas de equipo
  - Implementar TrendChartWidget con gráficos de tendencias
  - Crear RecentActionsWidget con últimas acciones registradas
  - _Requirements: 3.1, 3.5_

- [x] 4.1 Crear TopPlayersWidget



  - Implementar widget que muestre top 5 goleadores con fotos placeholder
  - Agregar información de equipo, goles y tendencia para cada jugador
  - Implementar configuración para cambiar número de jugadores mostrados
  - _Requirements: 3.5_

- [x] 4.2 Desarrollar TeamStatsWidget




  - Crear widget con métricas clave del equipo seleccionado
  - Mostrar promedio de goles, distribución de acciones, rendimiento por jornada
  - Implementar selector de equipo en configuración del widget
  - _Requirements: 3.3, 3.5_

- [x] 4.3 Implementar TrendChartWidget





  - Crear widget con gráfico de tendencias configurable
  - Permitir selección de métrica y entidad (jugador/equipo) a mostrar
  - Integrar con TimelineChart para visualización temporal
  - _Requirements: 3.3, 3.5_

- [x] 4.4 Crear RecentActionsWidget


  - Implementar widget que muestre las últimas 10 acciones registradas
  - Agregar filtros por tipo de acción y equipo
  - Incluir timestamps relativos y enlaces a detalles completos
  - _Requirements: 3.5_

- [ ] 5. Desarrollar sistema de filtros avanzados
  - Crear FilterEngine con soporte para múltiples criterios simultáneos
  - Implementar filtros por jugador, equipo, acción, rango de minutos y jornadas
  - Agregar funcionalidad para guardar y cargar combinaciones de filtros
  - Crear interfaz de usuario intuitiva para gestión de filtros
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.1 Crear FilterEngine core
  - Implementar clase `FilterEngine` con Map para filtros activos
  - Crear métodos para agregar, remover y combinar filtros con lógica AND
  - Implementar serialización/deserialización para persistencia de filtros
  - _Requirements: 5.1, 5.2_

- [ ] 5.2 Implementar tipos de filtros específicos
  - Crear filtros por jugador con autocompletado
  - Implementar filtro por equipo con selector múltiple
  - Crear filtro por tipo de acción con checkboxes
  - Desarrollar filtros de rango para minutos y jornadas con sliders
  - _Requirements: 5.1, 5.5_

- [ ] 5.3 Crear interfaz de filtros avanzados
  - Diseñar panel lateral colapsible para filtros
  - Implementar chips visuales para filtros activos con opción de remover
  - Crear botones para limpiar todos los filtros y aplicar filtros guardados
  - _Requirements: 5.3, 5.4, 5.6_

- [ ] 5.4 Implementar búsqueda por texto libre
  - Crear campo de búsqueda con sugerencias automáticas
  - Implementar búsqueda en nombres de jugadores, equipos y acciones
  - Agregar highlighting de términos encontrados en resultados
  - _Requirements: 5.4_

- [ ] 6. Crear sistema de exportación
  - Implementar ExportService para generar reportes en PDF, CSV e imágenes
  - Crear generación de PDF con gráficos usando jsPDF y html2canvas
  - Desarrollar exportación de CSV con datos filtrados actuales
  - Agregar exportación de gráficos individuales como imágenes PNG
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 6.1 Crear ExportService base
  - Implementar clase `ExportService` con métodos para cada formato
  - Crear templates para reportes PDF con header, footer y estilos
  - Implementar sistema de progreso para exportaciones largas
  - _Requirements: 6.1_

- [ ] 6.2 Implementar exportación a PDF
  - Crear generación de PDF con portada, gráficos en alta resolución y tablas
  - Implementar captura de gráficos con html2canvas para inclusión en PDF
  - Agregar metadatos del reporte (fecha, filtros aplicados, autor)
  - _Requirements: 6.2, 6.5_

- [ ] 6.3 Desarrollar exportación a CSV
  - Crear exportación de datos filtrados con headers descriptivos
  - Implementar formateo de datos para compatibilidad con Excel
  - Agregar opción de incluir métricas calculadas en la exportación
  - _Requirements: 6.3_

- [ ] 6.4 Crear exportación de gráficos individuales
  - Implementar captura de gráficos individuales en alta resolución (300 DPI)
  - Agregar títulos, leyendas y metadatos a las imágenes exportadas
  - Crear opción de descarga directa o preview antes de descargar
  - _Requirements: 6.4_

- [ ] 7. Implementar generador de resúmenes automáticos
  - Crear SummaryGenerator que analice datos y genere insights automáticos
  - Implementar detección de cambios significativos y hitos alcanzados
  - Desarrollar templates para diferentes tipos de resúmenes
  - Crear interfaz para visualizar y gestionar resúmenes generados
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7.1 Crear SummaryGenerator core
  - Implementar análisis automático de rendimiento por jornada
  - Crear detección de mejoras/deterioros significativos (>20% cambio)
  - Implementar identificación de hitos (10 goles, 5 tarjetas, etc.)
  - _Requirements: 4.1, 4.3, 4.5_

- [ ] 7.2 Desarrollar templates de resúmenes
  - Crear template para resumen de jornada con mejores/peores rendimientos
  - Implementar template para alertas de cambios significativos
  - Crear template para hitos alcanzados con contexto histórico
  - _Requirements: 4.2, 4.4, 4.5_

- [ ] 7.3 Crear interfaz de resúmenes
  - Implementar lista de resúmenes por jornada con búsqueda y filtrado
  - Crear vista detallada de resumen con gráficos automáticos
  - Agregar sistema de notificaciones para nuevos resúmenes
  - _Requirements: 4.2, 4.4_

- [ ] 8. Integrar y configurar dashboard completo
  - Conectar todos los componentes en la interfaz principal
  - Implementar persistencia de configuración de widgets en localStorage
  - Crear modo de edición del dashboard con drag & drop
  - Realizar testing de integración y optimización de performance
  - _Requirements: 3.4, 3.6_

- [ ] 8.1 Integrar componentes en dashboard principal
  - Modificar index.html para incluir nueva sección de dashboard avanzado
  - Conectar DashboardManager con sistema de navegación existente
  - Implementar carga lazy de widgets para optimizar performance inicial
  - _Requirements: 3.1, 3.4_

- [ ] 8.2 Implementar persistencia de configuración
  - Crear sistema de guardado de layout de widgets en localStorage
  - Implementar restauración automática de configuración al cargar página
  - Agregar opción de reset a configuración por defecto
  - _Requirements: 3.4_

- [ ] 8.3 Crear modo de edición del dashboard
  - Implementar toggle entre modo visualización y edición
  - Activar drag & drop solo en modo edición con indicadores visuales
  - Crear panel de configuración para cada widget con opciones específicas
  - _Requirements: 3.2, 3.3_

- [ ] 8.4 Testing de integración y optimización
  - Crear tests para carga completa del dashboard con múltiples widgets
  - Implementar tests de performance para datasets grandes (1000+ estadísticas)
  - Optimizar consultas y cálculos para tiempo de respuesta < 2 segundos
  - Verificar compatibilidad responsive en todos los breakpoints
  - _Requirements: 1.5, 2.6, 3.6, 5.5, 5.6_