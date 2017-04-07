var knex = require('knex');

module.exports = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 8,
      requestTimeout: 80000
    },
    acquireConnectionTimeout: 90000
});
