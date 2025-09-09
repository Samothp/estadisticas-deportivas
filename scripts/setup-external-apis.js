#!/usr/bin/env node

/**
 * Script de configuración para APIs externas
 * Ayuda a configurar las credenciales y probar la conectividad
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { validateConfig } = require('../config/external-apis');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupFootballDataAPI() {
    console.log('\n🏈 Configuración de Football-Data.org');
    console.log('=====================================');
    console.log('Para obtener una API key gratuita:');
    console.log('1. Ve a https://www.football-data.org/client/register');
    console.log('2. Regístrate con tu email');
    console.log('3. Confirma tu email');
    console.log('4. Copia tu API key desde el dashboard\n');
    
    const apiKey = await question('Ingresa tu API key de Football-Data.org: ');
    
    if (!apiKey || apiKey.trim() === '') {
        console.log('❌ API key no proporcionada. Saltando configuración.');
        return null;
    }
    
    return apiKey.trim();
}

async function createEnvFile(apiKey) {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    // Leer .env existente si existe
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Agregar o actualizar la API key
    const apiKeyLine = `FOOTBALL_DATA_API_KEY=${apiKey}`;
    
    if (envContent.includes('FOOTBALL_DATA_API_KEY=')) {
        // Reemplazar línea existente
        envContent = envContent.replace(/FOOTBALL_DATA_API_KEY=.*/, apiKeyLine);
    } else {
        // Agregar nueva línea
        if (envContent && !envContent.endsWith('\n')) {
            envContent += '\n';
        }
        envContent += `\n# Football-Data.org API Configuration\n${apiKeyLine}\nFOOTBALL_DATA_ENABLED=true\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Configuración guardada en ${envPath}`);
}

async function testConnection(apiKey) {
    console.log('\n🔍 Probando conexión con Football-Data.org...');
    
    try {
        // Configurar temporalmente la API key
        process.env.FOOTBALL_DATA_API_KEY = apiKey;
        
        const FootballDataProvider = require('../services/external/FootballDataProvider');
        const provider = new FootballDataProvider({ apiKey });
        
        const isConnected = await provider.testConnection();
        
        if (isConnected) {
            console.log('✅ Conexión exitosa con Football-Data.org');
            
            // Probar obtener equipos de LaLiga
            console.log('📋 Obteniendo equipos de LaLiga...');
            const teams = await provider.getTeams('PD');
            console.log(`✅ Se obtuvieron ${teams.length} equipos de LaLiga`);
            
            // Mostrar algunos equipos como ejemplo
            if (teams.length > 0) {
                console.log('\n📋 Algunos equipos encontrados:');
                teams.slice(0, 5).forEach(team => {
                    console.log(`   - ${team.name} (${team.shortName})`);
                });
                if (teams.length > 5) {
                    console.log(`   ... y ${teams.length - 5} más`);
                }
            }
            
            return true;
        } else {
            console.log('❌ No se pudo conectar con Football-Data.org');
            return false;
        }
    } catch (error) {
        console.log(`❌ Error de conexión: ${error.message}`);
        
        if (error.message.includes('401') || error.message.includes('403')) {
            console.log('💡 Verifica que tu API key sea correcta y esté activa');
        } else if (error.message.includes('429')) {
            console.log('💡 Has excedido el límite de requests. Espera un momento e intenta de nuevo');
        }
        
        return false;
    }
}

async function showNextSteps() {
    console.log('\n🎉 ¡Configuración completada!');
    console.log('============================');
    console.log('Próximos pasos:');
    console.log('1. Reinicia tu servidor Node.js para cargar las nuevas variables de entorno');
    console.log('2. Ve al dashboard y verifica que los widgets muestren datos reales');
    console.log('3. Los datos se sincronizarán automáticamente según la configuración');
    console.log('\n📊 Información del plan gratuito de Football-Data.org:');
    console.log('- 10 requests por minuto');
    console.log('- Datos básicos de equipos, jugadores y partidos');
    console.log('- Resultados de partidos (sin eventos detallados)');
    console.log('- Perfecto para desarrollo y pruebas');
    console.log('\n💡 Para más funcionalidades, considera actualizar a un plan de pago');
}

async function main() {
    console.log('🚀 Configuración de APIs Externas para Estadísticas Deportivas');
    console.log('==============================================================');
    
    // Validar configuración actual
    const validation = validateConfig();
    
    if (validation.warnings.length > 0) {
        console.log('\n⚠️  Advertencias:');
        validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (validation.errors.length > 0) {
        console.log('\n❌ Errores de configuración:');
        validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Configurar Football-Data.org
    const apiKey = await setupFootballDataAPI();
    
    if (apiKey) {
        // Crear/actualizar archivo .env
        await createEnvFile(apiKey);
        
        // Probar conexión
        const connectionSuccess = await testConnection(apiKey);
        
        if (connectionSuccess) {
            await showNextSteps();
        } else {
            console.log('\n❌ La configuración se guardó pero la conexión falló.');
            console.log('Verifica tu API key y conexión a internet, luego reinicia el servidor.');
        }
    } else {
        console.log('\n⏭️  Configuración saltada. Puedes ejecutar este script más tarde.');
        console.log('Para configurar manualmente, agrega FOOTBALL_DATA_API_KEY a tu archivo .env');
    }
    
    rl.close();
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error durante la configuración:', error);
        process.exit(1);
    });
}

module.exports = { main };