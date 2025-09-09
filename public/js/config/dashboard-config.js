/**
 * Configuración del Dashboard Avanzado
 * Define layouts, breakpoints y configuraciones por defecto
 */
const DashboardConfig = {
    // Breakpoints para responsive design
    breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
    },
    
    // Configuración del grid system
    grid: {
        columns: {
            mobile: 1,
            tablet: 2,
            desktop: 4
        },
        gap: '1rem',
        minRowHeight: '200px'
    },
    
    // Tamaños disponibles para widgets
    widgetSizes: {
        small: { w: 1, h: 1, minWidth: '250px', minHeight: '200px' },
        medium: { w: 2, h: 1, minWidth: '500px', minHeight: '200px' },
        large: { w: 2, h: 2, minWidth: '500px', minHeight: '400px' },
        xlarge: { w: 4, h: 2, minWidth: '100%', minHeight: '400px' }
    },
    
    // Layout por defecto del dashboard
    defaultLayout: {
        widgets: [
            {
                id: 'top-players-1',
                type: 'TopPlayersWidget',
                size: 'medium',
                position: { x: 0, y: 0 },
                settings: {
                    title: 'Top Goleadores',
                    maxPlayers: 5,
                    metric: 'goals',
                    refreshInterval: 30000 // 30 segundos
                }
            },
            {
                id: 'team-stats-1',
                type: 'TeamStatsWidget',
                size: 'medium',
                position: { x: 2, y: 0 },
                settings: {
                    title: 'Estadísticas de Equipo',
                    selectedTeam: null, // Se selecciona dinámicamente
                    refreshInterval: 30000
                }
            },
            {
                id: 'trend-chart-1',
                type: 'TrendChartWidget',
                size: 'large',
                position: { x: 0, y: 1 },
                settings: {
                    title: 'Tendencias de Rendimiento',
                    chartType: 'timeline',
                    metric: 'goals',
                    entityType: 'player',
                    refreshInterval: 60000 // 1 minuto
                }
            },
            {
                id: 'recent-actions-1',
                type: 'RecentActionsWidget',
                size: 'medium',
                position: { x: 2, y: 1 },
                settings: {
                    title: 'Últimas Acciones',
                    maxActions: 10,
                    refreshInterval: 15000 // 15 segundos
                }
            }
        ]
    },
    
    // Configuración de temas
    themes: {
        light: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            background: '#ffffff',
            surface: '#f8f9fa',
            text: '#212529',
            textSecondary: '#6c757d'
        },
        dark: {
            primary: '#0d6efd',
            secondary: '#6c757d',
            success: '#198754',
            warning: '#ffc107',
            danger: '#dc3545',
            background: '#212529',
            surface: '#343a40',
            text: '#ffffff',
            textSecondary: '#adb5bd'
        }
    },
    
    // Configuración de gráficos
    charts: {
        defaultOptions: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: true
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: {
                        display: true
                    }
                }
            }
        },
        colors: {
            primary: ['#007bff', '#0056b3', '#004085'],
            success: ['#28a745', '#1e7e34', '#155724'],
            warning: ['#ffc107', '#e0a800', '#d39e00'],
            danger: ['#dc3545', '#c82333', '#bd2130'],
            info: ['#17a2b8', '#138496', '#117a8b']
        }
    },
    
    // Configuración de animaciones
    animations: {
        duration: 300,
        easing: 'ease-in-out',
        enabled: true
    },
    
    // Configuración de actualización automática
    autoRefresh: {
        enabled: true,
        globalInterval: 30000, // 30 segundos por defecto
        maxRetries: 3,
        retryDelay: 5000 // 5 segundos entre reintentos
    },
    
    // Configuración de notificaciones
    notifications: {
        position: 'top-right',
        duration: 3000,
        maxVisible: 5
    },
    
    // Configuración de exportación
    export: {
        formats: ['pdf', 'csv', 'png'],
        defaultFormat: 'pdf',
        pdfOptions: {
            format: 'A4',
            orientation: 'portrait',
            margin: '1cm'
        }
    },
    
    // URLs de la API
    api: {
        baseUrl: '/api',
        endpoints: {
            stats: '/stats',
            metrics: '/metrics',
            players: '/metrics/players',
            teams: '/metrics/teams',
            trends: '/metrics/trends'
        }
    },
    
    // Configuración de cache
    cache: {
        enabled: true,
        ttl: 300000, // 5 minutos
        maxSize: 100 // máximo 100 entradas en cache
    }
};

// Función para obtener configuración responsive
DashboardConfig.getResponsiveConfig = function() {
    const width = window.innerWidth;
    
    if (width < this.breakpoints.mobile) {
        return {
            columns: this.grid.columns.mobile,
            deviceType: 'mobile'
        };
    } else if (width < this.breakpoints.tablet) {
        return {
            columns: this.grid.columns.tablet,
            deviceType: 'tablet'
        };
    } else {
        return {
            columns: this.grid.columns.desktop,
            deviceType: 'desktop'
        };
    }
};

// Función para obtener tema actual
DashboardConfig.getCurrentTheme = function() {
    const savedTheme = localStorage.getItem('dashboard-theme');
    return savedTheme || 'light';
};

// Función para aplicar tema
DashboardConfig.applyTheme = function(themeName) {
    const theme = this.themes[themeName];
    if (!theme) {
        console.error(`Tema ${themeName} no encontrado`);
        return;
    }
    
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
    });
    
    localStorage.setItem('dashboard-theme', themeName);
};

// Hacer disponible globalmente
window.DashboardConfig = DashboardConfig;