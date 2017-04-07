const Round = require('./Round');
const pg = require('./Pg');
const Queries = require('./Queries');
const pgq = new Queries;

class Game {
  constructor(first_player) {
    this.player_one = first_player;
    this.player_two = null;
    this.winner = null;
    this.short_id = this.makeID();
    this.upsert()
  }

  activeRound(rounds) {
    return this.rounds.find(round => (round.hasWon() === null));
  }

  makeID() {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for(let i = 0; i < 8; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  upsert() {
    pgq.upsertItem('games', 'id', this)
  }
}

module.exports = Game;