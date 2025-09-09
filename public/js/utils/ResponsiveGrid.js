/**
 * ResponsiveGrid - Sistema de grid responsive para el dashboard
 * Maneja automáticamente el layout según el tamaño de pantalla
 */
class ResponsiveGrid {
    constructor() {
        this.container = null;
        this.currentBreakpoint = null;
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        };
        this.gridColumns = {
            mobile: 1,
            tablet: 2,
            desktop: 4
        };
        
        this.onResize = this.onResize.bind(this);
        this.resizeTimeout = null;
    }
    
    /**
     * Inicializa el sistema de grid responsive
     * @param {HTMLElement} container - Container del dashboard
     * @param {Object} options - Opciones de configuración
     */
    init(container, options = {}) {
        if (!container) {
            console.error('ResponsiveGrid: Container no proporcionado');
            return;
        }
        
        this.container = container;
        
        // Aplicar opciones personalizadas
        if (options.breakpoints) {
            this.breakpoints = { ...this.breakpoints, ...options.breakpoints };
        }
        if (options.gridColumns) {
            this.gridColumns = { ...this.gridColumns, ...options.gridColumns };
        }
        
        // Configurar grid inicial
        this.updateGrid();
        
        // Escuchar cambios de tamaño
        window.addEventListener('resize', this.onResize);
        
        console.log('ResponsiveGrid: Inicializado');
    }
    
    /**
     * Maneja el evento de resize de la ventana
     */
    onResize() {
        // Debounce para evitar múltiples llamadas
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.updateGrid();
        }, 150);
    }
    
    /**
     * Actualiza el grid según el tamaño actual de la ventana
     */
    updateGrid() {
        if (!this.container) return;
        
        const width = window.innerWidth;
        const newBreakpoint = this.getCurrentBreakpoint(width);
        
        // Solo actualizar si cambió el breakpoint
        if (newBreakpoint !== this.currentBreakpoint) {
            this.currentBreakpoint = newBreakpoint;
            this.applyGridLayout(newBreakpoint);
            this.updateWidgetSizes(newBreakpoint);
            this.emitBreakpointChange(newBreakpoint);
        }
    }
    
    /**
     * Obtiene el breakpoint actual basado en el ancho de ventana
     * @param {number} width - Ancho de la ventana
     * @returns {string} Breakpoint actual
     */
    getCurrentBreakpoint(width) {
        if (width < this.breakpoints.mobile) {
            return 'mobile';
        } else if (width < this.breakpoints.tablet) {
            return 'tablet';
        } else if (width < this.breakpoints.desktop) {
            return 'desktop';
        } else {
            return 'large';
        }
    }
    
    /**
     * Aplica el layout de grid para el breakpoint dado
     * @param {string} breakpoint - Breakpoint actual
     */
    applyGridLayout(breakpoint) {
        // Remover clases anteriores
        this.container.classList.remove('dashboard-grid-1', 'dashboard-grid-2', 'dashboard-grid-3', 'dashboard-grid-4', 'dashboard-grid-auto');
        
        // Aplicar nueva clase
        const columns = this.gridColumns[breakpoint] || this.gridColumns.desktop;
        
        if (columns === 'auto') {
            this.container.classList.add('dashboard-grid-auto');
        } else {
            this.container.classList.add(`dashboard-grid-${columns}`);
        }
        
        // Actualizar CSS custom properties
        this.container.style.setProperty('--grid-columns', columns);
        
        console.log(`ResponsiveGrid: Aplicado layout ${breakpoint} (${columns} columnas)`);
    }
    
    /**
     * Actualiza los tamaños de widgets según el breakpoint
     * @param {string} breakpoint - Breakpoint actual
     */
    updateWidgetSizes(breakpoint) {
        const widgets = this.container.querySelectorAll('.widget');
        
        widgets.forEach(widget => {
            this.updateWidgetSize(widget, breakpoint);
        });
    }
    
    /**
     * Actualiza el tamaño de un widget específico
     * @param {HTMLElement} widget - Elemento del widget
     * @param {string} breakpoint - Breakpoint actual
     */
    updateWidgetSize(widget, breakpoint) {
        const originalSize = widget.getAttribute('data-original-size') || 'medium';
        
        // Guardar tamaño original si no existe
        if (!widget.getAttribute('data-original-size')) {
            widget.setAttribute('data-original-size', originalSize);
        }
        
        // Remover clases de tamaño anteriores
        widget.classList.remove('widget-small', 'widget-medium', 'widget-large', 'widget-xlarge');
        
        // Aplicar tamaño según breakpoint
        let newSize = originalSize;
        
        switch (breakpoint) {
            case 'mobile':
                // En móvil, todos los widgets ocupan el ancho completo
                newSize = 'medium';
                break;
            case 'tablet':
                // En tablet, ajustar tamaños grandes
                if (originalSize === 'xlarge' || originalSize === 'large') {
                    newSize = 'medium';
                }
                break;
            case 'desktop':
            case 'large':
                // En desktop, usar tamaño original
                newSize = originalSize;
                break;
        }
        
        widget.classList.add(`widget-${newSize}`);
        widget.setAttribute('data-current-size', newSize);
    }
    
    /**
     * Emite evento de cambio de breakpoint
     * @param {string} breakpoint - Nuevo breakpoint
     */
    emitBreakpointChange(breakpoint) {
        const eventBus = window.EventBus?.getInstance();
        if (eventBus) {
            eventBus.emit('RESPONSIVE_BREAKPOINT_CHANGED', {
                breakpoint: breakpoint,
                width: window.innerWidth,
                columns: this.gridColumns[breakpoint] || this.gridColumns.desktop,
                timestamp: Date.now()
            });
        }
        
        // También emitir evento DOM para compatibilidad
        const event = new CustomEvent('responsiveBreakpointChanged', {
            detail: {
                breakpoint: breakpoint,
                width: window.innerWidth
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Agrega un nuevo widget al sistema responsive
     * @param {HTMLElement} widget - Elemento del widget
     */
    addWidget(widget) {
        if (this.currentBreakpoint) {
            this.updateWidgetSize(widget, this.currentBreakpoint);
        }
    }
    
    /**
     * Fuerza una actualización del grid
     */
    forceUpdate() {
        this.currentBreakpoint = null;
        this.updateGrid();
    }
    
    /**
     * Obtiene información del estado actual
     * @returns {Object} Estado del grid responsive
     */
    getState() {
        return {
            currentBreakpoint: this.currentBreakpoint,
            windowWidth: window.innerWidth,
            columns: this.gridColumns[this.currentBreakpoint] || this.gridColumns.desktop,
            breakpoints: this.breakpoints,
            gridColumns: this.gridColumns
        };
    }
    
    /**
     * Configura breakpoints personalizados
     * @param {Object} breakpoints - Nuevos breakpoints
     */
    setBreakpoints(breakpoints) {
        this.breakpoints = { ...this.breakpoints, ...breakpoints };
        this.forceUpdate();
    }
    
    /**
     * Configura columnas de grid personalizadas
     * @param {Object} gridColumns - Nuevas configuraciones de columnas
     */
    setGridColumns(gridColumns) {
        this.gridColumns = { ...this.gridColumns, ...gridColumns };
        this.forceUpdate();
    }
    
    /**
     * Destruye el sistema responsive
     */
    destroy() {
        window.removeEventListener('resize', this.onResize);
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.container = null;
        this.currentBreakpoint = null;
        
        console.log('ResponsiveGrid: Destruido');
    }
}

// Instancia singleton
let responsiveGridInstance = null;

/**
 * Obtiene la instancia singleton del ResponsiveGrid
 * @returns {ResponsiveGrid} Instancia del grid responsive
 */
ResponsiveGrid.getInstance = function() {
    if (!responsiveGridInstance) {
        responsiveGridInstance = new ResponsiveGrid();
    }
    return responsiveGridInstance;
};

// Hacer disponible globalmente
window.ResponsiveGrid = ResponsiveGrid;