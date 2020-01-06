# myRetail products service

This is a microservice responsible for exposing product data via a RESTful api. It is designed to run as a cloud native application, in a Docker container. Currently the following routes are available:

* `GET /products/{productId}` to get product name, price for a given product id. Response format:
```json
{
    "id": 13860428,
    "name": "The Big Lebowski (Blu-ray)",
    "current_price": {
        "value": 22.99,
        "currency_code": "USD"
    }
}
```

* `PUT /products/{productId}` to update product pricing for a given product id. Payload format:
```json
{
    "current_price": {
        "value": 22.10,
        "currency_code": "USD"
    }
}
```

This service relies on external backends (rest api and MongoDB instance). Being a cloud native application, the service has zero knowledge of how backend components are provisioned or initialized. It only expects following
characteristics:

* **MongoDB**: containing `mr-products` database with `prices` collection, where each price document contains
  the following attributes:

```json
{
    "product_id": "numerical product id",
    "value": "currency decimal format",
    "currency_code": "USD, EUR, or GBP"
}
```

* **RESTful api**: Exposing `<baseUrl>/pdb/tcin/{productId}` route. The base url is configurable  via `products_base_url` environment variable. The route above is expected to contain following structure:

```json
{
  "product": {
    "item": {
     "product_description": {
      "title": "product title"
     }
   }
 }
}
```


## Technologies used:

* [ExpressJS](https://expressjs.com/): web application framework
* [mongodb](https://www.npmjs.com/package/mongodb): sdk to connect to MongoDB instance
* [morgan](https://www.npmjs.com/package/morgan): for logging http requests
* [nconf](https://www.npmjs.com/package/nconf): for configuring the application
* [prom-client](https://www.npmjs.com/package/prom-client): to allow for application monitoring
* [request-promise-native](https://www.npmjs.com/package/request-promise-native): http client to interact with internal products api


## Setup

### To Run for development and demos (requires [nodejs](https://nodejs.org/) and [docker](https://www.docker.com/products/docker-desktop))

* Start a MongoDB docker instance as follows
```bash
mkdir -p ~/data
docker run --name mdb -d -p 27017:27017 -v ~/data:/data/db mongo
```

* Connect to the MongoDB instance:
```
docker exec -it mdb mongo 'mongodb://localhost:27017/mr-products'
```
* Seed some prices and exit:
```bash
db.prices.insertMany([
    {product_id: 13860428, value: 11.99,currency_code: 'USD'},
    {product_id: 15117729, value: 2.99,currency_code: 'GBP'},
    {product_id: 16483589, value: 3.99,currency_code: 'USD'},
    {product_id: 16696652, value: 1.99,currency_code: 'USD'},
    {product_id: 16752456, value: 200,currency_code: 'EUR'},
    {product_id: 15643793, value: 0.21,currency_code: 'USD'},
])
```
* Create `configuration.json` at root of this project (adjacent to package.json) with following content and update
  `products_base_url` to appropriate value where the rest api is available such as `https://products.myretail.com/v2`

```json
{
  "products_base_url": "",
  "mongodb_url": "mongodb://localhost:27017",
  "pricing_api_key": "myapikey"
}
```

* Finally start the application
```
npm install
npm run start
```

* Product details example:

```
curl --location --request GET 'http://localhost:9090/products/13860428'
```

* Update product pricing example:

```
curl --location --request PUT 'http://localhost:9090/products/13860428' \
--header 'Content-Type: application/json' \
--header 'x-api-key: myapikey' \
--data-raw '{
    "current_price": {
        "value": 33.10,
        "currency_code": "USD"
    }
}'
```

### To Run Tests (requires [nodejs](https://nodejs.org/))
```
npm install
npm run test
```

### To Run in production mode (requires [docker](https://www.docker.com/products/docker-desktop))
* Build the docker image:
```
docker build -t myretail .
```

* Start docker container using below command after filling the values for environment variables:

```
docker run -d \
-e products_base_url= \
-e mongodb_url= \
-e pricing_api_key= \
-p 9090:9090 myretail
```
