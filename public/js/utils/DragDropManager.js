/**
 * DragDropManager - Sistema de drag & drop personalizado para widgets
 * Maneja el arrastre y reordenamiento de widgets en el dashboard
 */
class DragDropManager {
    constructor() {
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedWidget = null;
        this.placeholder = null;
        this.startPosition = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.container = null;
        this.enabled = false;
        
        this.onDragStart = this.onDragStart.bind(this);
        this.onDragMove = this.onDragMove.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
    }
    
    /**
     * Habilita el drag & drop en un container
     * @param {HTMLElement} container - Container del dashboard
     */
    enable(container) {
        if (!container) {
            console.error('DragDropManager: Container no proporcionado');
            return;
        }
        
        this.container = container;
        this.enabled = true;
        
        // Agregar event listeners
        this.setupEventListeners();
        
        // Hacer widgets arrastrables
        this.makeWidgetsDraggable();
        
        console.log('DragDropManager: Habilitado');
    }
    
    /**
     * Deshabilita el drag & drop
     */
    disable() {
        this.enabled = false;
        this.removeEventListeners();
        this.makeWidgetsNonDraggable();
        
        console.log('DragDropManager: Deshabilitado');
    }
    
    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        document.addEventListener('mousemove', this.onDragMove);
        document.addEventListener('mouseup', this.onDragEnd);
        document.addEventListener('touchmove', this.onDragMove, { passive: false });
        document.addEventListener('touchend', this.onDragEnd);
    }
    
    /**
     * Remueve los event listeners
     */
    removeEventListeners() {
        document.removeEventListener('mousemove', this.onDragMove);
        document.removeEventListener('mouseup', this.onDragEnd);
        document.removeEventListener('touchmove', this.onDragMove);
        document.removeEventListener('touchend', this.onDragEnd);
    }
    
    /**
     * Hace que los widgets sean arrastrables
     */
    makeWidgetsDraggable() {
        if (!this.container) return;
        
        const widgets = this.container.querySelectorAll('.widget');
        widgets.forEach(widget => {
            this.makeWidgetDraggable(widget);
        });
    }
    
    /**
     * Hace que los widgets no sean arrastrables
     */
    makeWidgetsNonDraggable() {
        if (!this.container) return;
        
        const widgets = this.container.querySelectorAll('.widget');
        widgets.forEach(widget => {
            this.makeWidgetNonDraggable(widget);
        });
    }
    
    /**
     * Hace un widget específico arrastrable
     * @param {HTMLElement} widget - Elemento del widget
     */
    makeWidgetDraggable(widget) {
        if (!widget) return;
        
        widget.setAttribute('draggable', 'false'); // Deshabilitar HTML5 drag
        widget.style.cursor = 'move';
        
        // Agregar event listeners para mouse y touch
        widget.addEventListener('mousedown', this.onDragStart);
        widget.addEventListener('touchstart', this.onDragStart, { passive: false });
        
        // Agregar clase CSS
        widget.classList.add('draggable');
    }
    
    /**
     * Hace un widget específico no arrastrable
     * @param {HTMLElement} widget - Elemento del widget
     */
    makeWidgetNonDraggable(widget) {
        if (!widget) return;
        
        widget.style.cursor = '';
        widget.removeEventListener('mousedown', this.onDragStart);
        widget.removeEventListener('touchstart', this.onDragStart);
        widget.classList.remove('draggable');
    }
    
    /**
     * Maneja el inicio del arrastre
     * @param {Event} e - Evento del mouse/touch
     */
    onDragStart(e) {
        if (!this.enabled) return;
        
        // Prevenir si se hace clic en botones de control
        if (e.target.closest('.widget-controls')) {
            return;
        }
        
        e.preventDefault();
        
        this.isDragging = true;
        this.draggedElement = e.currentTarget;
        this.draggedWidget = this.getWidgetFromElement(this.draggedElement);
        
        // Obtener posición inicial
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        this.startPosition = { x: clientX, y: clientY };
        
        // Calcular offset del mouse respecto al elemento
        const rect = this.draggedElement.getBoundingClientRect();
        this.offset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
        
        // Crear placeholder
        this.createPlaceholder();
        
        // Agregar clases CSS
        this.draggedElement.classList.add('dragging');
        this.container.classList.add('drag-active');
        
        // Emitir evento
        this.emitEvent('dragStart', {
            widget: this.draggedWidget,
            element: this.draggedElement
        });
    }
    
    /**
     * Maneja el movimiento durante el arrastre
     * @param {Event} e - Evento del mouse/touch
     */
    onDragMove(e) {
        if (!this.isDragging || !this.draggedElement) return;
        
        e.preventDefault();
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        // Mover el elemento
        this.draggedElement.style.position = 'fixed';
        this.draggedElement.style.left = `${clientX - this.offset.x}px`;
        this.draggedElement.style.top = `${clientY - this.offset.y}px`;
        this.draggedElement.style.zIndex = '1000';
        this.draggedElement.style.pointerEvents = 'none';
        
        // Encontrar el elemento sobre el que estamos
        const elementBelow = document.elementFromPoint(clientX, clientY);
        const targetWidget = elementBelow ? elementBelow.closest('.widget') : null;
        
        if (targetWidget && targetWidget !== this.draggedElement) {
            this.updatePlaceholderPosition(targetWidget, clientY);
        }
        
        // Emitir evento
        this.emitEvent('dragMove', {
            widget: this.draggedWidget,
            position: { x: clientX, y: clientY }
        });
    }
    
    /**
     * Maneja el final del arrastre
     * @param {Event} e - Evento del mouse/touch
     */
    onDragEnd(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        
        // Obtener nueva posición
        const newPosition = this.getNewPosition();
        
        // Restaurar estilos del elemento
        this.resetDraggedElementStyles();
        
        // Insertar en nueva posición
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.insertBefore(this.draggedElement, this.placeholder);
        }
        
        // Limpiar
        this.cleanup();
        
        // Actualizar layout
        this.updateLayout(newPosition);
        
        // Emitir evento
        this.emitEvent('dragEnd', {
            widget: this.draggedWidget,
            newPosition: newPosition
        });
        
        // Reset estado
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedWidget = null;
    }
    
    /**
     * Crea un placeholder para mostrar dónde se insertará el widget
     */
    createPlaceholder() {
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'widget-placeholder';
        this.placeholder.style.height = this.draggedElement.offsetHeight + 'px';
        this.placeholder.style.border = '2px dashed var(--color-primary)';
        this.placeholder.style.borderRadius = 'var(--border-radius)';
        this.placeholder.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        this.placeholder.style.margin = '0';
        this.placeholder.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-primary); font-weight: bold;">Soltar aquí</div>';
        
        // Insertar después del elemento arrastrado
        this.draggedElement.parentNode.insertBefore(this.placeholder, this.draggedElement.nextSibling);
    }
    
    /**
     * Actualiza la posición del placeholder
     * @param {HTMLElement} targetWidget - Widget objetivo
     * @param {number} mouseY - Posición Y del mouse
     */
    updatePlaceholderPosition(targetWidget, mouseY) {
        if (!this.placeholder || targetWidget === this.draggedElement) return;
        
        const rect = targetWidget.getBoundingClientRect();
        const middle = rect.top + rect.height / 2;
        
        if (mouseY < middle) {
            // Insertar antes del target
            targetWidget.parentNode.insertBefore(this.placeholder, targetWidget);
        } else {
            // Insertar después del target
            targetWidget.parentNode.insertBefore(this.placeholder, targetWidget.nextSibling);
        }
    }
    
    /**
     * Obtiene la nueva posición del widget
     * @returns {number} Nueva posición
     */
    getNewPosition() {
        if (!this.placeholder) return -1;
        
        const widgets = Array.from(this.container.querySelectorAll('.widget:not(.dragging)'));
        return widgets.indexOf(this.placeholder);
    }
    
    /**
     * Restaura los estilos del elemento arrastrado
     */
    resetDraggedElementStyles() {
        if (!this.draggedElement) return;
        
        this.draggedElement.style.position = '';
        this.draggedElement.style.left = '';
        this.draggedElement.style.top = '';
        this.draggedElement.style.zIndex = '';
        this.draggedElement.style.pointerEvents = '';
        this.draggedElement.classList.remove('dragging');
    }
    
    /**
     * Limpia elementos temporales
     */
    cleanup() {
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
            this.placeholder = null;
        }
        
        if (this.container) {
            this.container.classList.remove('drag-active');
        }
    }
    
    /**
     * Actualiza el layout después del drag & drop
     * @param {number} newPosition - Nueva posición
     */
    updateLayout(newPosition) {
        if (!this.draggedWidget || newPosition === -1) return;
        
        // Obtener DashboardManager y actualizar layout
        const dashboardManager = window.DashboardManager?.getInstance();
        if (dashboardManager) {
            dashboardManager.updateWidgetPosition(this.draggedWidget.id, newPosition);
        }
    }
    
    /**
     * Obtiene el widget asociado a un elemento DOM
     * @param {HTMLElement} element - Elemento DOM
     * @returns {Object|null} Widget o null
     */
    getWidgetFromElement(element) {
        const widgetId = element.getAttribute('data-widget-id');
        if (!widgetId) return null;
        
        const dashboardManager = window.DashboardManager?.getInstance();
        return dashboardManager ? dashboardManager.widgets.get(widgetId) : null;
    }
    
    /**
     * Emite un evento del drag & drop
     * @param {string} eventName - Nombre del evento
     * @param {Object} data - Datos del evento
     */
    emitEvent(eventName, data) {
        const eventBus = window.EventBus?.getInstance();
        if (eventBus) {
            eventBus.emit(`DRAG_DROP_${eventName.toUpperCase()}`, data);
        }
    }
    
    /**
     * Agrega un nuevo widget al sistema de drag & drop
     * @param {HTMLElement} widget - Elemento del widget
     */
    addWidget(widget) {
        if (this.enabled) {
            this.makeWidgetDraggable(widget);
        }
    }
    
    /**
     * Remueve un widget del sistema de drag & drop
     * @param {HTMLElement} widget - Elemento del widget
     */
    removeWidget(widget) {
        this.makeWidgetNonDraggable(widget);
    }
    
    /**
     * Obtiene el estado actual del drag & drop
     * @returns {Object} Estado actual
     */
    getState() {
        return {
            enabled: this.enabled,
            isDragging: this.isDragging,
            draggedWidget: this.draggedWidget ? this.draggedWidget.id : null
        };
    }
}

// CSS adicional para drag & drop
const dragDropCSS = `
.widget.draggable {
    transition: transform 0.2s ease;
}

.widget.dragging {
    transform: rotate(5deg);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    opacity: 0.9;
}

.dashboard-container.drag-active {
    background-color: rgba(0, 123, 255, 0.05);
}

.widget-placeholder {
    grid-column: span 1;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}

.widget.draggable:hover {
    transform: translateY(-2px);
}

.widget.draggable:active {
    transform: scale(1.02);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .widget.dragging {
        transform: rotate(2deg) scale(0.95);
    }
}
`;

// Inyectar CSS
const style = document.createElement('style');
style.textContent = dragDropCSS;
document.head.appendChild(style);

// Instancia singleton
let dragDropInstance = null;

/**
 * Obtiene la instancia singleton del DragDropManager
 * @returns {DragDropManager} Instancia del manager
 */
DragDropManager.getInstance = function() {
    if (!dragDropInstance) {
        dragDropInstance = new DragDropManager();
    }
    return dragDropInstance;
};

// Hacer disponible globalmente
window.DragDropManager = DragDropManager;