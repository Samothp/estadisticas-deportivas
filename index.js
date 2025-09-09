const express = require('express');
const path = require('path');
const statsRoutes = require('./routes/stats');

const app = express();
const port = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos (el index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
app.use('/api', statsRoutes);

// Servir el archivo HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`El servidor está escuchando en http://localhost:${port}`);
});
