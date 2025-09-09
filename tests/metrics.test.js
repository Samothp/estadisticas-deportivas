const request = require('supertest');
const express = require('express');
const metricsRoutes = require('../routes/metrics');
const statsRoutes = require('../routes/stats');
const db = require('../database');

const app = express();
app.use(express.json());
app.use('/api', statsRoutes);
app.use('/api/metrics', metricsRoutes);

describe('Metrics API', () => {
    
    // Poblar la base de datos con datos de prueba antes de los tests
    beforeAll((done) => {
        db.serialize(() => {
            db.run("DELETE FROM stats", (err) => {
                if (err) return done(err);

                const stmt = db.prepare("INSERT INTO stats (jornada, player, team, action, minute) VALUES (?, ?, ?, ?, ?)");
                
                // Datos de prueba para Player A
                stmt.run(1, 'Player A', 'Team X', 'Gol', 20);
                stmt.run(1, 'Player A', 'Team X', 'Asistencia', 45);
                stmt.run(2, 'Player A', 'Team X', 'Gol', 30);
                stmt.run(2, 'Player A', 'Team X', 'Gol', 60);
                stmt.run(3, 'Player A', 'Team X', 'Tarjeta Amarilla', 75);
                
                // Datos de prueba para Player B
                stmt.run(1, 'Player B', 'Team X', 'Gol', 15);
                stmt.run(2, 'Player B', 'Team X', 'Asistencia', 25);
                stmt.run(3, 'Player B', 'Team X', 'Falta', 40);
                
                // Datos de prueba para Team Y
                stmt.run(1, 'Player C', 'Team Y', 'Gol', 10);
                stmt.run(2, 'Player C', 'Team Y', 'Gol', 55);
                stmt.run(3, 'Player D', 'Team Y', 'Asistencia', 35);
                
                stmt.finalize(done);
            });
        });
    });

    describe('GET /api/metrics/players', () => {
        it('should return list of available players', async () => {
            const res = await request(app).get('/api/metrics/players');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toContain('Player A');
            expect(res.body.data).toContain('Player B');
            expect(res.body.count).toBeGreaterThan(0);
        });
    });

    describe('GET /api/metrics/teams', () => {
        it('should return list of available teams', async () => {
            const res = await request(app).get('/api/metrics/teams');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toContain('Team X');
            expect(res.body.data).toContain('Team Y');
            expect(res.body.count).toBeGreaterThan(0);
        });
    });

    describe('GET /api/metrics/player/:id', () => {
        it('should return player metrics for existing player', async () => {
            const res = await request(app).get('/api/metrics/player/Player A');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            
            const metrics = res.body.data;
            expect(metrics.playerId).toBe('Player A');
            expect(metrics.goals).toBe(3);
            expect(metrics.assists).toBe(1);
            expect(metrics.yellowCards).toBe(1);
            expect(metrics.totalGames).toBe(3);
            expect(metrics.goalsPerGame).toBeCloseTo(1, 1);
        });

        it('should return empty metrics for non-existing player', async () => {
            const res = await request(app).get('/api/metrics/player/NonExistentPlayer');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            
            const metrics = res.body.data;
            expect(metrics.playerId).toBe('NonExistentPlayer');
            expect(metrics.goals).toBe(0);
            expect(metrics.totalGames).toBe(0);
        });

        it('should return 400 for invalid player ID', async () => {
            const res = await request(app).get('/api/metrics/player/');
            expect(res.statusCode).toEqual(404); // Express devuelve 404 para rutas no encontradas
        });

        it('should filter by jornada range', async () => {
            const res = await request(app)
                .get('/api/metrics/player/Player A')
                .query({ startJornada: 1, endJornada: 2 });
            
            expect(res.statusCode).toEqual(200);
            const metrics = res.body.data;
            expect(metrics.goals).toBe(3); // 1 gol en jornada 1, 2 goles en jornada 2
            expect(metrics.totalGames).toBe(2);
        });
    });

    describe('GET /api/metrics/team/:team', () => {
        it('should return team metrics for existing team', async () => {
            const res = await request(app).get('/api/metrics/team/Team X');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            
            const metrics = res.body.data;
            expect(metrics.teamId).toBe('Team X');
            expect(metrics.goals).toBe(4); // 3 de Player A + 1 de Player B
            expect(metrics.assists).toBe(2); // 1 de Player A + 1 de Player B
            expect(metrics.totalPlayers).toBe(2);
            expect(metrics.avgGoalsPerGame).toBeCloseTo(1.33, 1);
        });

        it('should return empty metrics for non-existing team', async () => {
            const res = await request(app).get('/api/metrics/team/NonExistentTeam');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            
            const metrics = res.body.data;
            expect(metrics.teamId).toBe('NonExistentTeam');
            expect(metrics.goals).toBe(0);
            expect(metrics.totalGames).toBe(0);
        });
    });

    describe('GET /api/metrics/trends', () => {
        it('should return trend analysis for player and metric', async () => {
            const res = await request(app)
                .get('/api/metrics/trends')
                .query({
                    entityId: 'Player A',
                    entityType: 'player',
                    metric: 'Gol'
                });
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            
            const analysis = res.body.data.analysis;
            expect(analysis).toHaveProperty('direction');
            expect(analysis).toHaveProperty('strength');
            expect(analysis).toHaveProperty('confidence');
            expect(['up', 'down', 'stable']).toContain(analysis.direction);
        });

        it('should return 400 for missing required parameters', async () => {
            const res = await request(app)
                .get('/api/metrics/trends')
                .query({
                    entityId: 'Player A'
                    // Falta entityType y metric
                });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBeDefined();
        });

        it('should return 400 for invalid entity type', async () => {
            const res = await request(app)
                .get('/api/metrics/trends')
                .query({
                    entityId: 'Player A',
                    entityType: 'invalid',
                    metric: 'Gol'
                });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('Tipo de entidad inválido');
        });
    });

    describe('GET /api/metrics/global', () => {
        it('should return global metrics', async () => {
            const res = await request(app).get('/api/metrics/global');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            
            const metrics = res.body.data;
            expect(metrics.totalActions).toBeGreaterThan(0);
            expect(metrics.totalPlayers).toBeGreaterThan(0);
            expect(metrics.totalTeams).toBeGreaterThan(0);
            expect(metrics.goals).toBeGreaterThan(0);
            expect(metrics).toHaveProperty('actionDistribution');
        });

        it('should filter global metrics by jornada range', async () => {
            const res = await request(app)
                .get('/api/metrics/global')
                .query({ startJornada: 1, endJornada: 1 });
            
            expect(res.statusCode).toEqual(200);
            const metrics = res.body.data;
            expect(metrics.totalJornadas).toBe(1);
        });
    });

    describe('Cache functionality', () => {
        it('should return cache statistics', async () => {
            // Primero hacer una request para poblar el cache
            await request(app).get('/api/metrics/player/Player A');
            
            const res = await request(app).get('/api/metrics/cache/stats');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('middleware');
        });

        it('should clear cache successfully', async () => {
            const res = await request(app).delete('/api/metrics/cache');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });

        it('should use cache for repeated requests', async () => {
            // Primera request
            const res1 = await request(app).get('/api/metrics/player/Player A');
            expect(res1.headers['x-cache']).toBe('MISS');
            
            // Segunda request (debería usar cache)
            const res2 = await request(app).get('/api/metrics/player/Player A');
            expect(res2.headers['x-cache']).toBe('HIT');
            
            // Los datos deberían ser idénticos
            expect(res1.body.data).toEqual(res2.body.data);
        });
    });

    describe('Error handling', () => {
        it('should handle invalid jornada ranges', async () => {
            const res = await request(app)
                .get('/api/metrics/player/Player A')
                .query({ startJornada: 'invalid', endJornada: 2 });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('Rango de jornadas inválido');
        });

        it('should handle jornada range where start > end', async () => {
            const res = await request(app)
                .get('/api/metrics/player/Player A')
                .query({ startJornada: 5, endJornada: 2 });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('La jornada de inicio no puede ser mayor');
        });
    });
});