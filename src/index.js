const nconf = require('nconf');
const path = require('path');

/**
 * initialize application configuration from following in order presented blow:
 *
 *  1. from command-line arguments
 *  2. from environment variables
 *  3. from <root>/configuration.json file
 *
 *  The following is what can be configured:
 *  - products_base_url: such as https://apis.myretail.io/v1
 *  - mongodb_url: url to MongoDB instance holding pricing data such as mongodb://localhost:27017
 *  - pricing_api_key: api key that needs to be passed in x-api-key header to update products pricing via /products/{productId} PUT route
 *  - port: the port number this application will be served on (if not specified defaults to 9090)
 *
 *  see https://www.npmjs.com/package/nconf for more details on how nconf works
 */
nconf.argv()
  .env()
  .file(path.join(__dirname, '../configuration.json'))
  .defaults({
    port: 9090
  });

const app = require('./app');
const port = nconf.get('port');
app.listen(port, () => {
  console.info('myRetail products service is listening on port', port);
});
