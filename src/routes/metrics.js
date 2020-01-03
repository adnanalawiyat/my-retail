const express = require('express');
const promClient = require('prom-client');
const router = express.Router();

// collect metrics every 10 seconds
promClient.collectDefaultMetrics({timeout: 1000});

/**
 * Route exposing prometheus metrics for monitoring. This allows the application to
 * be monitored by prometheus server https://prometheus.io/
 */
router.get('/metrics', (req, res) => {
  res.send(promClient.register.metrics());
});

module.exports = router;
