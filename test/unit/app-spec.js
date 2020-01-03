const request = require('supertest');
const app = require('../../src/app');
describe('app', ()=> {
  it('should return 404 for unknown routes', (done) => {
    request(app)
      .get('/uknonwn/123')
      .send()
      .expect(404, done);
  });
});
