# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir al proyecto de Estadísticas Deportivas! Esta guía te ayudará a entender cómo participar efectivamente en el desarrollo.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno](#configuración-del-entorno)
- [Estándares de Código](#estándares-de-código)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Funcionalidades](#sugerir-funcionalidades)

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas este código. Por favor reporta comportamientos inaceptables.

### Nuestros Estándares

- Usar lenguaje acogedor e inclusivo
- Respetar diferentes puntos de vista y experiencias
- Aceptar críticas constructivas de manera elegante
- Enfocarse en lo que es mejor para la comunidad
- Mostrar empatía hacia otros miembros de la comunidad

## 🚀 Cómo Contribuir

### Tipos de Contribuciones Bienvenidas

1. **🐛 Reportar bugs** - Ayúdanos a identificar y corregir problemas
2. **💡 Sugerir funcionalidades** - Propón nuevas características
3. **📝 Mejorar documentación** - Clarifica o expande la documentación
4. **🔧 Contribuir código** - Implementa fixes o nuevas funcionalidades
5. **🧪 Escribir tests** - Mejora la cobertura de testing
6. **🎨 Mejorar UI/UX** - Propón mejoras de diseño

### Antes de Empezar

1. **Revisa el [ROADMAP.md](ROADMAP.md)** para entender la dirección del proyecto
2. **Consulta los [issues existentes](https://github.com/tu-usuario/estadisticas-deportivas/issues)** para evitar duplicados
3. **Lee las especificaciones** en `.kiro/specs/` para funcionalidades complejas

## 🛠️ Configuración del Entorno

### Prerrequisitos

- Node.js (versión 14 o superior)
- npm o yarn
- Git

### Setup Local

```bash
# 1. Fork el repositorio en GitHub

# 2. Clonar tu fork
git clone https://github.com/TU-USUARIO/estadisticas-deportivas.git
cd estadisticas-deportivas

# 3. Agregar el repositorio original como upstream
git remote add upstream https://github.com/USUARIO-ORIGINAL/estadisticas-deportivas.git

# 4. Instalar dependencias
npm install

# 5. Crear rama para tu contribución
git checkout -b feature/mi-nueva-funcionalidad

# 6. Iniciar servidor de desarrollo
npm start
```

### Verificar Configuración

```bash
# Ejecutar tests
npm test

# Verificar que el servidor inicia correctamente
npm start
# Debería estar disponible en http://localhost:3000
```

## 📏 Estándares de Código

### JavaScript

- **ES6+** features preferidas
- **Camel case** para variables y funciones
- **Pascal case** para clases
- **Const/let** en lugar de var
- **Arrow functions** cuando sea apropiado

```javascript
// ✅ Bueno
const calculatePlayerMetrics = (playerId, jornadaRange) => {
    const metrics = {
        goalsPerGame: 0,
        assistsPerGame: 0
    };
    return metrics;
};

// ❌ Evitar
var calculate_player_metrics = function(player_id, jornada_range) {
    var metrics = {};
    return metrics;
}
```

### CSS

- **Mobile-first** approach
- **CSS Grid** y **Flexbox** para layouts
- **Variables CSS** para temas y colores
- **BEM methodology** para naming

```css
/* ✅ Bueno */
.dashboard-widget {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
}

.dashboard-widget__header {
    font-size: var(--font-size-lg);
}

.dashboard-widget--large {
    grid-column: span 2;
}
```

### HTML

- **Semantic HTML5** elements
- **Accessibility** attributes (ARIA labels, alt text)
- **Progressive enhancement**

### Comentarios

- **Español** para comentarios de lógica de negocio
- **Inglés** para comentarios técnicos/código
- **JSDoc** para funciones públicas

```javascript
/**
 * Calcula métricas avanzadas para un jugador específico
 * @param {string} playerId - ID del jugador
 * @param {Object} jornadaRange - Rango de jornadas {start, end}
 * @returns {Object} Métricas calculadas
 */
const calculatePlayerMetrics = (playerId, jornadaRange) => {
    // Obtener estadísticas del jugador en el rango especificado
    const stats = getPlayerStats(playerId, jornadaRange);
    
    // TODO: Implementar cálculo de eficiencia
    return processMetrics(stats);
};
```

## 🔄 Proceso de Pull Request

### 1. Preparación

```bash
# Asegúrate de estar actualizado con upstream
git fetch upstream
git checkout main
git merge upstream/main

# Crear nueva rama
git checkout -b feature/descripcion-corta
```

### 2. Desarrollo

- **Commits pequeños y frecuentes** con mensajes descriptivos
- **Tests** para nueva funcionalidad
- **Documentación** actualizada si es necesario

### 3. Antes del PR

```bash
# Ejecutar tests
npm test

# Verificar que no hay errores de linting
npm run lint

# Asegurarse de que el servidor inicia
npm start
```

### 4. Crear Pull Request

#### Título del PR
- **Descriptivo y conciso**
- **Prefijo por tipo**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

Ejemplos:
- `feat: agregar widget de top goleadores al dashboard`
- `fix: corregir cálculo de métricas de equipo`
- `docs: actualizar guía de instalación`

#### Descripción del PR

```markdown
## 📝 Descripción
Breve descripción de los cambios realizados.

## 🎯 Tipo de Cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva funcionalidad (cambio que agrega funcionalidad)
- [ ] Breaking change (fix o feature que causa que funcionalidad existente no funcione como se esperaba)
- [ ] Documentación

## 🧪 Testing
- [ ] Tests unitarios agregados/actualizados
- [ ] Tests manuales realizados
- [ ] Todos los tests pasan

## 📋 Checklist
- [ ] Mi código sigue los estándares del proyecto
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado mi código, particularmente en áreas difíciles de entender
- [ ] He realizado los cambios correspondientes a la documentación
- [ ] Mis cambios no generan nuevas advertencias
- [ ] He agregado tests que prueban que mi fix es efectivo o que mi feature funciona

## 📸 Screenshots (si aplica)
Agregar screenshots para cambios de UI.

## 🔗 Issues Relacionados
Fixes #123
```

### 5. Revisión

- **Responde a comentarios** de manera constructiva
- **Realiza cambios solicitados** en commits adicionales
- **Mantén la conversación** profesional y enfocada

## 🐛 Reportar Bugs

### Antes de Reportar

1. **Busca en issues existentes** para evitar duplicados
2. **Verifica** que sea realmente un bug y no un error de configuración
3. **Prueba** con la última versión del código

### Template de Bug Report

```markdown
## 🐛 Descripción del Bug
Una descripción clara y concisa del bug.

## 🔄 Pasos para Reproducir
1. Ve a '...'
2. Haz clic en '....'
3. Desplázate hacia abajo hasta '....'
4. Ve el error

## ✅ Comportamiento Esperado
Una descripción clara de lo que esperabas que pasara.

## ❌ Comportamiento Actual
Una descripción clara de lo que realmente pasó.

## 📸 Screenshots
Si aplica, agrega screenshots para ayudar a explicar el problema.

## 🖥️ Información del Sistema
- OS: [ej. Windows 10, macOS 12.1, Ubuntu 20.04]
- Navegador: [ej. Chrome 96, Firefox 95, Safari 15]
- Versión de Node.js: [ej. 16.13.0]

## 📋 Contexto Adicional
Agrega cualquier otro contexto sobre el problema aquí.
```

## 💡 Sugerir Funcionalidades

### Template de Feature Request

```markdown
## 🚀 Descripción de la Funcionalidad
Una descripción clara y concisa de la funcionalidad que te gustaría ver.

## 🎯 Problema que Resuelve
¿Qué problema resuelve esta funcionalidad? ¿Por qué es útil?

## 💭 Solución Propuesta
Una descripción clara de lo que quieres que pase.

## 🔄 Alternativas Consideradas
Una descripción clara de cualquier solución alternativa que hayas considerado.

## 📋 Contexto Adicional
Agrega cualquier otro contexto o screenshots sobre la funcionalidad aquí.

## 🎨 Mockups/Wireframes (opcional)
Si tienes ideas visuales, compártelas aquí.
```

## 🏷️ Labels y Milestones

### Labels Principales

- `bug` - Algo no está funcionando
- `enhancement` - Nueva funcionalidad o solicitud
- `documentation` - Mejoras o adiciones a la documentación
- `good first issue` - Bueno para nuevos contribuidores
- `help wanted` - Se necesita ayuda extra
- `question` - Información adicional solicitada
- `wontfix` - Esto no será trabajado

### Milestones

Los milestones corresponden a las fases del roadmap:
- `Fase 1: Funcionalidades Básicas`
- `Fase 2: UX Premium`
- `Fase 3: Funcionalidades Avanzadas`
- `Fase 4: Optimización`
- `Fase 5: Infraestructura`

## 🎉 Reconocimiento

Todos los contribuidores serán reconocidos en:
- **README.md** en la sección de contribuidores
- **CHANGELOG.md** en las notas de release
- **GitHub releases** con menciones específicas

## ❓ ¿Preguntas?

Si tienes preguntas sobre cómo contribuir:

1. **Revisa la documentación** existente
2. **Busca en issues** por preguntas similares
3. **Crea un issue** con el label `question`
4. **Contacta** a los maintainers directamente

¡Gracias por contribuir! 🙌