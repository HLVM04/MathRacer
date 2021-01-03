var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var adminPassword = 'potato1234' // Set this to any password you like :) (I like potatoes)

var game_settings = { // Don't change this in code >:(
  goal: 5,
  game_state: 'Waiting',
  current_countdown: 5
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/client.js', (req, res) => {
  res.sendFile(__dirname + '/client.js');
});

app.get('/car.png', (req, res) => {
  res.sendFile(__dirname + '/car.png');
});

app.get('/admin', (req, res) => {
  var pswd = req.query.password // This is a stupid way of doing authentication, but I just needed something quick

  if (pswd == adminPassword) {
    res.sendFile(__dirname + '/admin.html');
  } else {
    res.sendStatus(403);
  }
});

users = {};

async function doCountdown() {
  while (game_settings.game_state == "Countdown") {
    await new Promise(r => setTimeout(r, 1000)); // Sleep 1 second
    if (game_settings.current_countdown <= 0) {
      game_settings.game_state = "Playing";
    } 
    else {
      game_settings.current_countdown -= 1;
    }
    
    io.emit('game_settings_update', game_settings);
  }
}

io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id);
    users[socket.id] = {Username: "", CurrentEquation: "", Score: 0}

    function generateNewEquation(pastEquationCorrect) {
      var equation = Math.floor(Math.random() * 10 + 1,5) + "+" + Math.floor(Math.random() * 10 + 1,5);
      users[socket.id].CurrentEquation = equation;
      socket.emit('new_equation', equation, pastEquationCorrect);
    }
    generateNewEquation();

    socket.emit('user_data', users);
    socket.emit('game_settings_update', game_settings);
  
    socket.on('submit_result', (result) => {
      var player = users[socket.id]

      var correctResult = eval(player.CurrentEquation);

      if (result == correctResult) {
        player.Score += 1;
        io.emit('player_update', socket.id, player);
      }
      generateNewEquation(result == correctResult);
    });

    socket.on('disconnect', () => {
        var username = users[socket.id].Username

        io.emit('player_left', socket.id);
        delete users[socket.id]
        console.log('user ' + username + ' disconnected');
    });

    socket.on('set_username', (username) => {
        users[socket.id].Username = username
        //console.log('User id ' + socket.id + ' set their username to ' + username);
        io.emit('username_set', socket.id, username);
    });

    socket.on('set_countdown', (password, countdown) => {
      if (password == adminPassword) {
        game_settings.current_countdown = countdown;
        game_settings.game_state = "Countdown";
        io.emit('game_settings_update', game_settings);
        doCountdown();
      }
    });

    socket.on('reset_game', (password) => {
      if (password == adminPassword) {
        game_settings.game_state = "Waiting";
        io.emit('game_settings_update', game_settings);

        for (let i in users) {
          users[i].Score = 0;
          io.emit('player_update', i, users[i]);
        }
      }
    });
});


http.listen(3000, () => {
  console.log('listening on *:3000');
});
