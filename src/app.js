const express = require('express');
const health = require('./routes/health');
const metrics = require('./routes/metrics');
const products = require('./routes/products');
const morgan = require('morgan');

const app = express();
app.use(health);
app.use(metrics);
app.use(morgan('tiny'));
app.use(express.json());
app.use(products);
// anything else get 404
app.all('*', (req, res)=> res.status(404).end());

module.exports = app;
