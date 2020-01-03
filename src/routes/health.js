const express = require('express');

const router = express.Router();

/**
 * Route to test the health and readiness of the server.
 * for now this just returns 200 whenever it is invoked, which indicates
 * the server is ready to handle requests.
 *
 */
router.get('/health', (req, res) => {
  //TODO update to test connection to configured internal products api and mongodb
  res.end();
});

module.exports = router;
