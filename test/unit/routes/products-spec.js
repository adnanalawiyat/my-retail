const request = require('supertest');
const mock = require('mock-require');
// used to make sure nodejs require cache is not used
const _require = mock.reRequire;

describe('/products', ()=> {
  let app, req, productMock, priceMock, priceUpdateResultsMock, pricingApiKeyMock;
  const validProductDetails = {
    product: {
      item: {
        product_description: {
          title: 'My Product Title'
        }
      }
    }
  };

  beforeEach(()=> {
    pricingApiKeyMock = null;
    // mock mongodb and internal products api
    const getProductMock = ()=> productMock;
    const findOneMock = ()=> priceMock;
    const findAndUpdateMock = ()=> priceUpdateResultsMock;
    const getPricingApiKeyMock = ()=> pricingApiKeyMock;
    mock('mongodb', {
      MongoClient: {
        connect: ()=> {
          return {
            close: ()=> {},
            isConnected: ()=> true,
            db: () => {
              return {
                collection: ()=> {
                  return {
                    findOne: ()=> {
                      const _priceMock = findOneMock();
                      if(typeof _priceMock === 'function') {
                        _priceMock();
                      } else {
                        return _priceMock;
                      }
                    },
                    findOneAndUpdate: ()=> {
                      const _priceUpdateResultMock = findAndUpdateMock();
                      if(typeof _priceUpdateResultMock === 'function') {
                        _priceUpdateResultMock();
                      } else {
                        return _priceUpdateResultMock;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    mock('request-promise-native', ()=> {
      const _mock = getProductMock();
      if (typeof _mock === 'function') {
        _mock();
      } else {
        return _mock;
      }
    });

    mock('nconf', {
      env: ()=> this,
      file: ()=> this,
      defaults: ()=> this,
      get: (key)=> {
        if(key === 'pricing_api_key') {
          return getPricingApiKeyMock();
        } else {
          return '';
        }
      }
    });

    // need to initialize fresh state of app to allow mocking. jasmine seems to run
    // all tests in one context v.s. mocha where below should not be necessary.
    // too late to switch now :) and jasmine is more self contained.
    _require('../../../src/routes/products');
    app = _require('../../../src/app');

  });

  afterEach(()=> {
    productMock = null;
    priceUpdateResultsMock = null;
    priceMock = null;
  });

  describe('GET', ()=> {
    beforeEach(()=> {
      req = request(app)
        .get(`/products/123`);
    });

    it('should return 200 containing product name and price for valid product id', (done) => {
      productMock = validProductDetails;
      priceMock = {
        value: 22.99,
        currency_code: 'USD'
      };

      req.send().expect(200, (err, resp) => {
        expect(resp.body).toEqual({
          "id": 123,
          "name": "My Product Title",
          "current_price": {
            "value": 22.99,
            "currency_code": "USD"
          }
        });
        done(err);
      });
    });

    it('should return 200 containing product name without price when valid product does not have pricing data', (done) => {
      productMock = validProductDetails;
      priceMock = null;

      req.send().expect(200, (err, resp) => {
        expect(resp.body).toEqual({
          "id": 123,
          "name": "My Product Title"
        });
        done(err);
      });
    });

    it('should return 404 when product id is not an integer', (done) => {
      request(app)
      .get('/products/bogus')
      .send()
      .expect(404, done);
    });

    it('should return 404 when product does not exist', (done) => {
      const StatusCodeError = require('request-promise-native/errors').StatusCodeError;
      productMock = ()=> {
        throw new StatusCodeError(404);
      };
      req.send().expect(404, done);
    });

    it('should return 500 when products internal url errors out errors out', (done) => {
      productMock = ()=> {throw new Error('bla bla')};
      req.send().expect(500, done);
    });

    it('should return 500 when mongodb connection errors out', (done) => {
      productMock = validProductDetails;
      priceMock = ()=> {throw Error('bla bla')};
      req.send().expect(500, done);
    });
  });

  describe('PUT', ()=> {
    let body;
    const successUpdateResult = {
      value: {},
      ok: 1
    };
    beforeEach(()=> {
      body = {
        "current_price": {
          "value": 22.21,
          "currency_code": 'USD'
        }
      };
      req = request(app)
        .put('/products/123')
        .set('content-type', 'application/json');
    });

    it('should return 415 when content-type is not application/json', (done)=> {
      request(app)
      .put('/products/123')
      .set('content-type', 'application/vnd+hacker+json')
      .send(body)
      .expect(415, done);
    });

    it('should return 401 when x-api-key is missing', (done) => {
      pricingApiKeyMock = 'validApi';
      req.send(body).expect(401, done);
    });

    it('should return 401 when x-api-key is invalid', (done) => {
      pricingApiKeyMock = 'validApi';
      req.set('x-api-key', 'hacked-api').send(body).expect(401, done);
    });

    it('should return 204 when x-api-key is valid', (done) => {
      priceUpdateResultsMock = successUpdateResult;
      pricingApiKeyMock = 'validApi';
      req.set('x-api-key', 'validApi').send(body).expect(204, done);
    });

    it('should return 204 when updating valid product price and x-api-key is not required', (done) => {
      priceUpdateResultsMock = successUpdateResult;
      req.send(body).expect(204, done);
    });

    it('should return 404 when product does not exist', (done) => {
      priceUpdateResultsMock = {
        value: null
      };
      req.send(body).expect(404, done);
    });

    it('should return 500 when result of updating object is not successful', (done) => {
      priceUpdateResultsMock = {
        value: {},
        ok: false
      };
      req.send(body).expect(500, done);
    });

    it('should return 400 when body is empty', (done) => {
      request(app)
      .put('/products/123')
      .send({})
      .expect(400, done);
    });

    it('should return 400 when price is invalid', (done) => {
      body.current_price.value = 22.223;
      request(app)
      .put('/products/123')
      .send(body)
      .expect(400, done);
    });

    it('should return 400 when currency_code is invalid', (done) => {
      body.current_price.currency_code = 'ALL';
      request(app)
      .put('/products/123')
      .send(body)
      .expect(400, done);
    });

    it('should return 400 when payload does not have expected data', (done) => {
      body = {
        id: '123',
        bogusAttribute: 'lemon'
      };
      request(app)
      .put('/products/123')
      .send(body)
      .expect(400, done);
    });

  });
});
