const knex = require('./Pg');

knex.schema.createTableIfNotExists('games', function (table) {
  table.increments();
  table.string('player_one');
  table.string('player_two');
  table.string('winner');
  table.string('short_id');
  table.timestamps();
}).then( console.log("Ensured games table") );

knex.schema.createTableIfNotExists('rounds', function (table) {
  table.increments();
  table.string('player_one');
  table.string('player_two');
  table.string('pone_move');
  table.string('ptwo_move');
  table.string('winner');
  table.integer('game_id');
  table.timestamps();
}).then( console.log("Ensured rounds table") );

/*
 * @param {string} tableName - The name of the database table
 * @param {string} conflictTarget - The column in the table which has a unique index constraint
 * @param {Object} itemData - a hash of properties to be inserted/updated into the row
 * @returns {Promise} - A Promise which resolves to the inserted/updated row
 */

class Queries {
  upsertItem(tableName, conflictTarget, itemData) {
   let exclusions = Object.keys(itemData)
       .filter(c => c !== conflictTarget)
       .map(c => knex.raw('?? = EXCLUDED.??', [c, c]).toString())
       .join(",\n");

   let insertString = knex(tableName).insert(itemData).toString();
   let conflictString = knex.raw(` ON CONFLICT (??) DO UPDATE SET ${exclusions} RETURNING *;`, conflictTarget).toString();
   let query = (insertString + conflictString).replace(/\?/g, '\\?');
   return knex.raw(query)
       .on('query', data => console.log('Knex: ' + data.sql))
       .then(result => result.rows[0]);
 };
};

module.exports = Queries;