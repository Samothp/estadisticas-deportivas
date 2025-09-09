const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

db.serialize(() => {
    // Creación de la tabla (actualizada para incluir la jornada, el equipo y el tipo de estadística)
    db.run(`CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player TEXT NOT NULL,
        team TEXT,
        action TEXT NOT NULL,
        minute INTEGER NOT NULL,
        jornada INTEGER,
        stat_type TEXT
    )`, (err) => {
        if (err) {
            return console.error("Error al crear la tabla:", err.message);
        }
    });

    // Añadir la columna 'jornada' si no existe (para bases de datos antiguas)
    db.run("ALTER TABLE stats ADD COLUMN jornada INTEGER", (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error al añadir la columna 'jornada':", err.message);
        }
    });

    // Añadir la columna 'team' si no existe (para bases de datos antiguas)
    db.run("ALTER TABLE stats ADD COLUMN team TEXT", (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error al añadir la columna 'team':", err.message);
        }
    });

    // Añadir la columna 'stat_type' si no existe (para bases de datos antiguas)
    db.run("ALTER TABLE stats ADD COLUMN stat_type TEXT", (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error al añadir la columna 'stat_type':", err.message);
        }
    });
});

module.exports = db;

module.exports = db;

