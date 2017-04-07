// This mess is part of a hackathon

const SOFA = require('sofa-js');
const Bot = require('./lib/Bot');
const unit = require('ethjs-unit');
const Game = require('./lib/Game');
const Round = require('./lib/Round');
const knex = require('./lib/Pg');
const Queries = require('./lib/Queries');
const pgq = new Queries;

let bot = new Bot();

bot.onEvent = function(session, message) {
  switch (message.type) {
    case "Message":
      onMessage(session, message);
      break;
    case "Command":
      playRound(session.address, message.content.value);
      break;
    case "PaymentRequest":
      session.reply("No money yet - stay tuned!");
      break;
  }
}

function onMessage(session, message) {
  joinQueue(session)
}

function continueGame(session, game) {
  session.reply(SOFA.Message(rpsPrompt));
}

function findGameWinner(game, processed_round) {
  knex('rounds').where({'game_id': game.id}).select()
    .then(function(result) { findWinner(result, processed_round) })
    .catch(function(result) {console.log(result + " FAIL")})
};

function joinQueue(session) {
  knex('games').where({'player_two': null}).select()
    .then(function(result) { startOrCreate(session, result, session.address); })
    .catch(function(result) {console.log(result + " FAIL")})
};

function playRound(player, value) {
  knex.raw('select * from rounds where (player_two = :player or player_one = :player) and winner IS NULL LIMIT 1;', {'player': player})
    .then(function(result) { processRound(result.rows[0], player, value); })
    .catch(function(result) {console.log(result + " ROUND FAIL")})
};

function startOrCreate(session, search_results, address) {
  if (search_results[0] === undefined) {
      new Game(address);
      session.reply("You're in the queue - we're waiting for another player to join.");
    } else if (search_results[0].player_one === address) {
      session.reply("You are in the queue waiting on another player to join");
      console.log('Pretend they started a new game - log for now');
    } else if (search_results[0].player_one && search_results[0].player_two === null) {
      beginGame(session, address, search_results[0]);
    } else {
      console.log('How did we get here?');
  }
};

function beginGame(session, player_two, game) {
  game.player_two = player_two;
  pgq.upsertItem('games', 'id', game);
  bot.client.send(game.player_one, "Player two has joined, game on!");
  session.reply("Player one is already here - game on!");

  new Round(game);
};

function processRound(round, player, value) {
  let threadPlayer = null
  if (round.player_one === player) {
    round.pone_move = value;
    threadPlayer = 'player_one';
  } else if (round.player_two === player) {
    round.ptwo_move = value;
    threadPlayer = 'player_two';
  }

  let processed_round = roundWon(round);

  if (processed_round.winner) {
    if (processed_round.winner === 'tie') {
      bot.client.send(processed_round.player_one, "The round is a tie!");
      bot.client.send(processed_round.player_two, "The round is a tie!");
    } else if (processed_round.winner === 'player_one'){
      bot.client.send(processed_round.player_one, `${processed_round.pone_move} beats ${processed_round.ptwo_move}! You take the round!`);
      bot.client.send(processed_round.player_two, `${processed_round.pone_move} beats ${processed_round.ptwo_move}! Your opponent takes the round!`);
    } else if (processed_round.winner === 'player_two'){
      bot.client.send(processed_round.player_one, `${processed_round.ptwo_move} beats ${processed_round.pone_move}! Your opponent takes the round!`);
      bot.client.send(processed_round.player_two, `${processed_round.ptwo_move} beats ${processed_round.pone_move}! You take the round!`);
    };

    knex('games').where({'id': round.game_id}).select()
      .then(function(result) {findGameWinner(result[0], processed_round)})
      .catch(function(result) {console.log(result + " GAME WINNER FAIL")});
  } else {
    bot.client.send(round[threadPlayer], "We're waiting on your opponent to decide - we'll alert you when the round is completed.");
  };
};

// Who won the game?
function findWinner(rounds, processed_round) {
  rounds.push(processed_round);
  let required = 2
  let map = {}
  rounds.forEach(function(round){
    map[round.winner] = ++map[round.winner] || 1
  });
  console.log(map)

  delete map['null']
  delete map['tie']

  let winner = (Object.keys(map).find(key => map[key] >= 2) || null);
  pgq.upsertItem('rounds', 'id', processed_round);

  if (winner) {
    knex('games').where({'id': processed_round.game_id})
      .update({'winner': winner})
      .then(function(result) {console.log(result)})
      .catch(function(result) {console.log(result)});
    bot.client.send(processed_round[winner], "You have won the game! Start a new one by messaging me again.");
    let loser = null
    if (winner === 'player_one') {
      loser = 'player_two';
    } else {
      loser = 'player_one';
    };
    bot.client.send(processed_round[loser], "You have lost the game - you can start a new one by messaging me again!");
  } else {
    let gameMock = { id: processed_round.game_id, player_one: processed_round.player_one, player_two: processed_round.player_two }
    new Round(gameMock)
  };
};

function roundWon(round) {
  let choices = ['rock', 'paper', 'scissors'];
  let map = {};

  // We always compare player 1 vs player 2
  choices.forEach(function(choice, i) {
      map[choice] = {};
      map[choice][choice] = 'tie';
      map[choice][choices[(i+1)%3]] = 'player_two';
      map[choice][choices[(i+2)%3]] = 'player_one';
  })

  if (round.pone_move === null || round.ptwo_move === null) {
    pgq.upsertItem('rounds', 'id', round);
    return round;
  } else {

    round.winner = (map[round.pone_move] || {})[round.ptwo_move] || console.log(JSON.stringify(round));
    return round;
  }
}
