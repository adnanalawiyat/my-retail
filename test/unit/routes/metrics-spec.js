const request = require('supertest');
const app = require('../../../src/app');
describe('/metrics', ()=> {
  it('should return 200', (done) => {
    request(app)
      .get('/metrics')
      .send()
      .expect(200, done);
  });
});
