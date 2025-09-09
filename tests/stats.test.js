const request = require('supertest');
const express = require('express');
const statsRoutes = require('../routes/stats');
const db = require('../database'); // Importar la BD para preparar los tests

const app = express();
app.use(express.json());
app.use('/api', statsRoutes);

describe('Stats API', () => {

    // Poblar la base de datos con datos de prueba antes de los tests
    beforeAll((done) => {
        db.serialize(() => {
            db.run("DELETE FROM stats", (err) => { // Limpiar la tabla
                if (err) return done(err);

                const stmt = db.prepare("INSERT INTO stats (jornada, player, action, minute) VALUES (?, ?, ?, ?)");
                stmt.run(1, 'Player A', 'Goal', 20); // Jornada 1
                stmt.run(1, 'Player B', 'Assist', 20); // Jornada 1
                stmt.run(2, 'Player A', 'Goal', 55); // Jornada 2
                stmt.finalize(done); // Marcar como 'hecho' cuando la inserción termina
            });
        });
    });

    describe('GET /api/stats', () => {
        it('should return all stats when no filter is applied', async () => {
            const res = await request(app).get('/api/stats');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(3);
        });

        it('should return filtered stats when a jornada query is provided', async () => {
            const res = await request(app).get('/api/stats?jornada=1');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(2);
            res.body.forEach(stat => {
                expect(stat.jornada).toBe(1);
            });
        });

        it('should return an empty array for a jornada with no stats', async () => {
            const res = await request(app).get('/api/stats?jornada=99');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(0);
        });
    });

    describe('POST /api/stats', () => {
        it('should create a new stat and return it', async () => {
            const newStat = { jornada: 3, player: 'Player C', action: 'Yellow Card', minute: 78 };
            const res = await request(app).post('/api/stats').send(newStat);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.player).toBe('Player C');
        });
    });

    describe('PUT /api/stats/:id', () => {
        it('should update an existing stat', async () => {
            const statsRes = await request(app).get('/api/stats?jornada=2');
            const statToUpdate = statsRes.body[0];
            const updatedData = { ...statToUpdate, player: 'Player A Updated' };

            const res = await request(app).put(`/api/stats/${statToUpdate.id}`).send(updatedData);
            expect(res.statusCode).toEqual(200);
            expect(res.body.player).toBe('Player A Updated');
        });
    });

    describe('DELETE /api/stats/:id', () => {
        it('should delete an existing stat', async () => {
            const statsRes = await request(app).get('/api/stats?jornada=1');
            const statToDelete = statsRes.body[0];
            
            const res = await request(app).delete(`/api/stats/${statToDelete.id}`);
            expect(res.statusCode).toEqual(204);
        });
    });
});

