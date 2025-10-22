const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');

const app = express();
const PORT = process.env.SWAGGER_PORT || 6061;

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Swagger preview running at http://localhost:${PORT}/api-docs`));
