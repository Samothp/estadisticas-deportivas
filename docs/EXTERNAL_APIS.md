# Configuración de APIs Externas

Esta guía te ayudará a configurar las APIs externas para obtener datos reales de LaLiga en tu aplicación de estadísticas deportivas.

## 🚀 Configuración Rápida

### 1. Ejecutar el Script de Configuración

```bash
node scripts/setup-external-apis.js
```

Este script interactivo te guiará a través de:
- Registro en Football-Data.org
- Configuración de API key
- Prueba de conectividad
- Configuración automática del archivo .env

### 2. Configuración Manual (Alternativa)

Si prefieres configurar manualmente:

1. **Obtener API Key de Football-Data.org:**
   - Ve a https://www.football-data.org/client/register
   - Regístrate con tu email
   - Confirma tu email
   - Copia tu API key desde el dashboard

2. **Configurar Variables de Entorno:**
   
   Crea o edita el archivo `.env` en la raíz del proyecto:
   ```env
   # Football-Data.org API Configuration
   FOOTBALL_DATA_API_KEY=tu_api_key_aqui
   FOOTBALL_DATA_ENABLED=true
   ```

3. **Reiniciar el Servidor:**
   ```bash
   node index.js
   ```

## 📊 Endpoints Disponibles

### Estado y Monitoreo

- `GET /api/external/health` - Estado de salud de las APIs
- `GET /api/external/test-connection` - Probar conectividad
- `GET /api/external/providers` - Información de proveedores

### Datos de LaLiga

- `GET /api/external/teams` - Equipos de LaLiga
- `GET /api/external/teams/:teamId/players` - Jugadores de un equipo
- `GET /api/external/matches` - Partidos de LaLiga
- `GET /api/external/matches/live` - Partidos en vivo
- `GET /api/external/standings` - Clasificación de LaLiga

### Administración

- `POST /api/external/providers/:provider/reset-circuit-breaker` - Resetear circuit breaker

## 🔧 Configuración Avanzada

### Límites de la API Gratuita

**Football-Data.org (Plan Gratuito):**
- ✅ 10 requests por minuto
- ✅ Datos básicos de equipos y jugadores
- ✅ Resultados de partidos
- ✅ Clasificaciones
- ❌ Eventos detallados de partidos
- ❌ Actualizaciones en tiempo real

### Variables de Entorno Adicionales

```env
# Configuración de rate limiting
FOOTBALL_DATA_REQUESTS_PER_MINUTE=10

# Habilitar/deshabilitar proveedor
FOOTBALL_DATA_ENABLED=true

# Nivel de logging
LOG_LEVEL=info

# Entorno (development/production)
NODE_ENV=development
```

### Configuración de Cache

El sistema incluye cache automático para optimizar el uso de la API:

- **Equipos:** 24 horas
- **Jugadores:** 12 horas  
- **Partidos:** 1 hora
- **Partidos en vivo:** 5 minutos
- **Clasificación:** 1 hora

## 🛠️ Troubleshooting

### Error: "API key no configurada"

**Solución:**
1. Verifica que el archivo `.env` existe
2. Confirma que `FOOTBALL_DATA_API_KEY` está configurada
3. Reinicia el servidor

### Error: "Rate limit exceeded"

**Solución:**
1. Espera 1 minuto antes de hacer más requests
2. El sistema automáticamente respeta los límites
3. Considera actualizar a un plan de pago para más requests

### Error: "401 Unauthorized"

**Solución:**
1. Verifica que tu API key sea correcta
2. Confirma que tu cuenta esté activa
3. Revisa que no hayas excedido los límites mensuales

### Error: "Circuit breaker activo"

**Solución:**
1. Espera 1 minuto para recuperación automática
2. O resetea manualmente: `POST /api/external/providers/footballData/reset-circuit-breaker`

## 📈 Monitoreo

### Verificar Estado de las APIs

```bash
curl http://localhost:3000/api/external/health
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "configValid": true,
    "providers": {
      "footballData": {
        "isHealthy": true,
        "failureCount": 0,
        "requestCount": 5
      }
    }
  }
}
```

### Probar Conectividad

```bash
curl http://localhost:3000/api/external/test-connection
```

### Obtener Equipos de LaLiga

```bash
curl http://localhost:3000/api/external/teams
```

## 🔄 Sincronización Automática

El sistema incluye sincronización automática (próximamente):

- **Equipos:** Diariamente a las 2 AM
- **Jugadores:** Cada 12 horas
- **Partidos:** Cada 6 horas
- **Partidos en vivo:** Cada 5 minutos (solo en días de partido)

## 💡 Consejos de Uso

1. **Desarrollo:** Usa el plan gratuito para pruebas
2. **Producción:** Considera un plan de pago para más requests
3. **Cache:** El sistema automáticamente cachea datos para optimizar uso
4. **Monitoreo:** Revisa regularmente `/api/external/health`
5. **Límites:** Respeta los rate limits para evitar bloqueos

## 🆘 Soporte

Si tienes problemas:

1. Ejecuta el script de configuración: `node scripts/setup-external-apis.js`
2. Verifica el estado: `GET /api/external/health`
3. Revisa los logs del servidor
4. Consulta la documentación de Football-Data.org: https://www.football-data.org/documentation/quickstart

## 🔮 Próximas Funcionalidades

- [ ] Sincronización automática programada
- [ ] Soporte para múltiples proveedores (API-Sports)
- [ ] Dashboard de administración web
- [ ] Alertas automáticas por email/webhook
- [ ] Cache distribuido con Redis
- [ ] Métricas de rendimiento detalladas