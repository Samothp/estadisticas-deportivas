const db = require('../database');

exports.getAllStats = (req, res) => {
    const { jornada } = req.query;
    let sql = "SELECT * FROM stats";
    const params = [];

    if (jornada) {
        sql += " WHERE jornada = ?";
        params.push(jornada);
    }

    sql += " ORDER BY jornada, minute";

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).send('Error al consultar las estadísticas');
            return console.error(err.message);
        }
        res.json(rows);
    });
};

exports.createStat = (req, res) => {
    const { player, team, action, minute, jornada } = req.body;

    // Validación de datos
    if (!player || typeof player !== 'string' || player.trim() === '') {
        return res.status(400).send('El campo "player" es inválido.');
    }
    if (team && typeof team !== 'string') { // team es opcional
        return res.status(400).send('El campo "team" es inválido.');
    }
    if (!action || typeof action !== 'string' || action.trim() === '') {
        return res.status(400).send('El campo "action" es inválido.');
    }
    if (minute == null || typeof minute !== 'number' || !Number.isInteger(minute) || minute < 0) {
        return res.status(400).send('El campo "minute" debe ser un número entero no negativo.');
    }
    if (jornada == null || typeof jornada !== 'number' || !Number.isInteger(jornada) || jornada <= 0) {
        return res.status(400).send('El campo "jornada" debe ser un número entero positivo.');
    }

    const sql = `INSERT INTO stats (player, team, action, minute, jornada) VALUES (?, ?, ?, ?, ?)`;
    const params = [player.trim(), team ? team.trim() : null, action.trim(), minute, jornada];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).send('Error al guardar la estadística');
            return console.error(err.message);
        }
        res.status(201).json({ 
            id: this.lastID, 
            player: player.trim(), 
            team: team ? team.trim() : null,
            action: action.trim(), 
            minute, 
            jornada 
        });
    });
};

exports.deleteStat = (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM stats WHERE id = ?`;

    db.run(sql, id, function(err) {
        if (err) {
            res.status(500).send('Error al eliminar la estadística');
            return console.error(err.message);
        }
        if (this.changes === 0) {
            return res.status(404).send('No se encontró la estadística para eliminar.');
        }
        res.status(204).send(); // 204 No Content
    });
};

exports.updateStat = (req, res) => {
    const { id } = req.params;
    const { player, team, action, minute, jornada } = req.body;

    // Validación de datos
    if (!player || typeof player !== 'string' || player.trim() === '') {
        return res.status(400).send('El campo "player" es inválido.');
    }
    if (team && typeof team !== 'string') { // team es opcional
        return res.status(400).send('El campo "team" es inválido.');
    }
    if (!action || typeof action !== 'string' || action.trim() === '') {
        return res.status(400).send('El campo "action" es inválido.');
    }
    if (minute == null || typeof minute !== 'number' || !Number.isInteger(minute) || minute < 0) {
        return res.status(400).send('El campo "minute" debe ser un número entero no negativo.');
    }
    if (jornada == null || typeof jornada !== 'number' || !Number.isInteger(jornada) || jornada <= 0) {
        return res.status(400).send('El campo "jornada" debe ser un número entero positivo.');
    }

    const sql = `UPDATE stats SET player = ?, team = ?, action = ?, minute = ?, jornada = ? WHERE id = ?`;
    const params = [player.trim(), team ? team.trim() : null, action.trim(), minute, jornada, id];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).send('Error al actualizar la estadística');
            return console.error(err.message);
        }
        if (this.changes === 0) {
            return res.status(404).send('No se encontró la estadística para actualizar.');
        }
        res.json({ 
            id: Number(id), 
            player: player.trim(), 
            team: team ? team.trim() : null,
            action: action.trim(), 
            minute, 
            jornada 
        });
    });
};

