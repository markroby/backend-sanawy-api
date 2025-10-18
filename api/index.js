// api/index.js
// Vercel serverless entry
const serverless = require('serverless-http');
const app = require('../server');  // uses module.exports from server.js
module.exports = (req, res) => serverless(app)(req, res);
