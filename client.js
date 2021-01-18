Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
  };

lerp = function(a,b,u) {
    return (1-u) * a + u * b;
  };
  
  function fade(element, property, start, end, duration) {
    var interval = 10;
    var steps = duration/interval;
    var step_u = 1.0/steps;
    var u = 0.0;
    var theInterval = setInterval(function(){
      if (u >= 1.0){ clearInterval(theInterval) }
      var r = parseInt(lerp(start.r, end.r, u));
      var g = parseInt(lerp(start.g, end.g, u));
      var b = parseInt(lerp(start.b, end.b, u));
      var colorname = 'rgb('+r+','+g+','+b+')';
      element.style.setProperty(property, colorname);
      u += step_u;
    }, interval);
  };

  $(function () {
    var socket = io();

    var game_settings = {
        goal: 5
    }

    function addPlayerDiv(playerId, player) {
      if (player.Username == undefined) {return;}
      var playerDivTemplate = $("<div id='playerDiv' style='height: 25px; margin: 5px; display: grid; grid-template-columns: 25% auto 5%;'><label style='overflow: hidden; white-space: nowrap; text-align: left; text-overflow: ellipsis;' id='name'>Name</label><div id='lane'><img style='max-height: 25px; -webkit-transform: translate(0%, 0); position: relative; left: 0%;' src='/car.png'></div><label id='score'>0</label></div>");
      $("#playerContainer").append(playerDivTemplate);
      playerDivTemplate.attr('id', playerId);
      playerDivTemplate.find("#name").html(player.Username);

      if (player.Placement != "") {
        playerDivTemplate.find("#score").html("#" + player.Placement);
      }
      else {
        playerDivTemplate.find("#score").html(player.Score);
      }
    }

    function checkResult() {
      var resultInput = $('#resultInput')
      var result = resultInput.val().trim()
      resultInput.val('');
      resultInput.focus();
      socket.emit('submit_result', result);
    }
    $("#checkButton").click(checkResult);
    $("#resultInput").on('keydown', function(e) {
      if (e.key == "Enter" || e.keyCode === 13) {
        checkResult();
      }
    });

    function setUsername() {
      $("#usernameBox").prop('hidden', true);
      var username = $('#usernameInput').val();
      socket.emit('set_username', username);
      update();
    };
    $("#setUsernameBtn").click(setUsername);
    $("#usernameInput").on('keydown', function(e) {
      if (e.key == "Enter" || e.keyCode === 13) {
        setUsername();
      }
    });

    socket.on('new_equation', function(equation, lastOneCorrect){
        equationLabel = $("#equationLabel")
        equationLabel.html(equation);

        var playerDiv = $('#' + socket.id)
        if (playerDiv.length) { // Use length to check if the div exists
            var hitGoal = game_settings.goal <= parseInt(playerDiv.find('#score').html())
            equationLabel.prop('hidden', hitGoal)
            $("#inputContainer").prop('hidden', hitGoal)
        }
        

        if (lastOneCorrect) {
            fade(equationLabel[0], 'color', {r:0, g:  255, b:  0}, {r:255, g:  255, b:  255}, 500);
        } else if (lastOneCorrect == false) {
            fade(equationLabel[0], 'color', {r:255, g:  0, b:  0}, {r:255, g:  255, b:  255}, 500);
        }
    });

    function update() {
        if ($("#usernameBox").prop('hidden')) {
            $("#gameContainer").prop('hidden', false);
            if (game_settings.game_state == "Waiting") {
                $("#countdownLabel").html('Waiting for players...');
                $("#countdownLabel").prop('hidden', false);
            } else {
                $("#countdownLabel").html(game_settings.current_countdown);
                $("#countdownLabel").prop('hidden', !(game_settings.game_state == "Countdown"));
            }
            $("#equationBox").prop('hidden', !(game_settings.game_state == "Playing"));
            $("#inputContainer").prop('hidden', !(game_settings.game_state == "Playing"));
            
            if (game_settings.game_state == "Playing") {
              $("#resultInput").focus();
            }
        }
    }

    socket.on('game_settings_update', function(new_game_settings){
        game_settings = new_game_settings;
        update();
    });

    socket.on('player_update', function(playerId, player){
      var playerDiv = $('#' + playerId)
      if (playerDiv == undefined) {return;};

      playerDiv.find("#name").html(player.Username);
      
      if (player.Placement != "") {
        playerDiv.find("#score").html("#" + player.Placement);

        if (socket.id == playerId) {
          $("#equationBox").prop('hidden', true);
          $("#inputContainer").prop('hidden', true);
        } 
      } else {
        playerDiv.find("#score").html(player.Score);
      }
      

      var progress = (player.Score / game_settings.goal * 100).clamp(0, 100)
      playerDiv.find("#lane").children().css("left", (progress).toString()+"%");
      playerDiv.find("#lane").children().css("-webkit-transform", 'translate(-' + (progress).toString() + "%" + ', 0)');
    });

    socket.on('user_data', function(players){
      for (const [id, player] of Object.entries(players)) {
        if (player.Username != "" && player.Username != undefined) {
          addPlayerDiv(id, player);
        }
      }
    });

    socket.on('player_left', function(playerId) {
      $('#' + playerId).remove();
    });

    socket.on('username_set', function(playerId, player){
      addPlayerDiv(playerId, player);
    });
  });