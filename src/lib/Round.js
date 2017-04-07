const SOFA = require('sofa-js');
const Bot = require('./Bot');
const Queries = require('./Queries');
const pgq = new Queries;
let bot = new Bot();

let rpsPrompt = {
  body:  "Choose your throw...",
  controls: [
    {type: "button", label: "Rock", value: "rock"},
    {type: "button", label: "Paper", value: "paper"},
    {type: "button", label: "Scissors", value: "scissors"}
  ],
  showKeyboard: false
}

class Round {
  constructor(game) {
    this.player_one = game.player_one;
    this.player_two = game.player_two;
    this.pone_move = null;
    this.ptwo_move = null;
    this.winner = null;
    this.game_id = game.id;
    this.upsert();

    bot.client.send(game.player_one, SOFA.Message(rpsPrompt));
    bot.client.send(game.player_two, SOFA.Message(rpsPrompt));
  }

  hasWon() {
    var choices = ['rock', 'paper', 'scissors'];
    var map = {};

    // We always compare player 1 vs player 2
    choices.forEach(function(choice, i) {
        map[choice] = {};
        map[choice][choice] = 'tie';
        map[choice][choices[(i+1)%3]] = 'player_one';
        map[choice][choices[(i+2)%3]] = 'player_otwo';
    })

    if (this.pone_move === null || this.ptwo_move === null) {
      return null;
    } else {
      return this.winner = (map[this.pone_move] || {})[this.ptwo_move] || "Invalid move detected";
    }
  }

  upsert() {
    pgq.upsertItem('rounds', 'id', this)
  }
}

module.exports = Round;