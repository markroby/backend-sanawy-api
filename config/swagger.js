const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bible Sanawy API',
      version: '1.0.0',
      description: 'API documentation for the Bible Sanawy Backend'
    },
    servers: [
      { url: process.env.SWAGGER_SERVER_URL || 'http://localhost:6060' }
    ]
  },
  // Scan route files for JSDoc comments
  apis: [path.join(__dirname, '..', 'routes', '*.js')]
};

module.exports = swaggerJSDoc(options);
