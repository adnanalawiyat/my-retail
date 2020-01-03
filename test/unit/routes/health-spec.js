const request = require('supertest');
const app = require('../../../src/app');
describe('/health', ()=> {
  it('should be healthy', (done) => {
    request(app)
      .get('/health')
      .send()
      .expect(200, done);
  });
});
