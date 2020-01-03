const express = require('express');

const rp = require('request-promise-native');
const nconf = require('nconf');
const product_url = nconf.get('products_base_url');
const errors = require('request-promise-native/errors');
const EXCLUDES_PARAM="taxonomy,price,promotion,bulk_ship,rating_and_review_reviews,rating_and_review_statistics,question_answer_statistics";
const ALLOWED_CURRENCIES_CODES = [
  'USD',
  'EUR',
  'GBP'
];
const VALID_PRICE_REGEX = /^\d+(,\d{3})*(\.\d{1,2})?$/;

let _mongodbClient;

/**
 * Get MongoDb prices collection
 * @returns {Promise<Collection>}
 */
const getPricesCollection = async () => {
  if (!_mongodbClient) {
    const mongodb_url = nconf.get('mongodb_url');
    const mongo = require('mongodb').MongoClient;
    _mongodbClient = await mongo.connect(mongodb_url);
  }

  if (!_mongodbClient.isConnected()){
    await _mongodbClient.connect();
  }

  return _mongodbClient.db('mr-products').collection('prices');

};

/**
 * Gracefully handle shutdown signal by making sure all operations to MongoDB is done
 * and close the connection.
 */
process.on('SIGTERM', async ()=> {
  console.log('*** Shutdown signal received');
  if(!_mongodbClient && !_mongodbClient.isConnected()) {
    await _mongodbClient.close();
    process.exit(0);
  }
});

const router = express.Router();

/**
 * Route to provide product details.
 */
router.get('/products/:productId(\\d+)', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);

    const prodDetails = await rp({
      uri: `${product_url}/pdp/tcin/${productId}?excludes=${EXCLUDES_PARAM}`,
      method: 'GET',
      json: true
    });

    const result = {
      id: productId,
      name: prodDetails.product.item['product_description'].title
    };

    const prices = await getPricesCollection();
    const pricing = await prices.findOne({product_id: productId});

    if(pricing) {
      result['current_price'] = {
        value: pricing.value,
        currency_code: pricing.currency_code
      }
    }

    res.json(result);

  } catch(e) {
    console.error(e);
    if(e instanceof errors.StatusCodeError && e.statusCode === 404) {
      res.send(404);
    } else {
      res.send(500);
    }
  }

});

/**
 * Route for updating an existing product price. Note that this is not meant to
 * add a price that didn't exist
 */
router.put('/products/:productId(\\d+)', async (req, res) => {
  try {
    if('application/json' !== req.headers['content-type']) {
      return res.send(415);
    }
    const productId = parseInt(req.params.productId);
    const pricing_api_key = nconf.get('pricing_api_key');
    if(pricing_api_key && (!req.header('x-api-key') || req.header('x-api-key') !== pricing_api_key)) {
      return res.send(401);
    }

    const product = req.body;
    if (!(product
      && product.current_price
      && product.current_price.value
      && VALID_PRICE_REGEX.test(product.current_price.value)
      && product.current_price.currency_code
      && ALLOWED_CURRENCIES_CODES.includes( product.current_price.currency_code))) {
      // TODO add seperate error body for each violation
      return res.send(400);
    }

    const prices = await getPricesCollection();
    const updateResult = await prices.findOneAndUpdate({product_id: productId}, {
      $set: {
        value: product.current_price.value,
        currency_code: product.current_price.currency_code
      }
    });
    if(!updateResult.value) { // if value is null, there is no document matching this product id
      res.send(404);
    } else if (updateResult.ok) { // if ok is not truthy, operation failed
      res.send(204);
    } else {
      res.send(500);
    }

  } catch(e) {
    console.error(e);
    res.send(500);
  }

});

module.exports = router;
