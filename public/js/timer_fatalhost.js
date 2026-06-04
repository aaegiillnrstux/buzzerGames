var myplayer = {
  host: true,
  roomId: null,
  player: true,
  username: '',
  socketId: '',
  points: 0
};
var currentRoom;
var countdown;
const socket = io('/timer_fatal');

lowLag.init();
lowLag.load('/components/Ding.mp3');
lowLag.load('/components/times-up.mp3');
lowLag.load('/components/buzzsound.mp3');

$('#form-pseudo').on('submit', function (e) {
  e.preventDefault();
  myplayer.username = $('#username').val();
  myplayer.roomId = $('#code').val();
  myplayer.socketId = socket.id;

  $('#user-card').hide('slow');
  $('#user-card').empty();
  $('#app-div').show('slow');
  $('#settings-button').show('slow');
  $('#settings-button').on('click', (e) => {
    if ($('#settings').is(':visible')) {
      $('#settings').hide('slow');
    } else {
      $('#settings').show('slow');
    }
  });

  socket.emit('playerDataHost', myplayer);
});

$('#timer-fatal-time-button').on('click', (e) => {
  roundTime = $('#timer-fatal-time').val();
  socket.emit('TF time', roundTime);
});

$('#btn-start-game').on('click', (e) => {
  socket.emit('start game');
  $('#settings').hide('slow');
  $('#settings-button').hide('slow');
  $('#btn-start-game').hide();
  $('#btn-stop-timer').show();
  $('#btn-passer').show();
  $('#btn-restart-timer').hide();
});

$('#btn-stop-timer').on('click', (e) => {
  stop_timer();
});

$('#btn-passer').on('click', (e) => {
  socket.emit('passer');
  stop_timer();
});

function stop_timer() {
  socket.emit('stop timer');
  $('#btn-stop-timer').hide();
  $('#btn-passer').hide();
  $('#btn-restart-timer').show();
}

$('#btn-restart-timer').on('click', (e) => {
  restart_timer();
});
function restart_timer() {
  socket.emit('restart timer');
  $('#btn-restart-timer').hide();
  $('#btn-stop-timer').show();
  $('#btn-passer').show();
}

$(function () {
  $(document).keydown(function (e) {
    if (currentRoom.state.buzzed) {
      if (e.key === 'v' || e.key === ' ') {
        vrai($('#validate-answer').data('buzzed'));
      }
      if (e.key === 'f' || e.key === 'Delete') {
        faux($('#validate-answer').data('buzzed'));
      }
    }
  });
});

$('#Vrai').on('click', (e) => {
  vrai($('#validate-answer').data('buzzed'));
});

$('#Faux').on('click', (e) => {
  faux($('#validate-answer').data('buzzed'));
});

function vrai(buzzed_username) {
  if (currentRoom && currentRoom.state.start && currentRoom.state.buzzed) {
    socket.emit('answer', true, buzzed_username);
  }
  $('#validate-answer').hide();
  $('#btn-stop-timer').show();
  $(`#joueur-${buzzed_username}`).css('background-color', '');
}

function faux(buzzed_username) {
  if (currentRoom && currentRoom.state.start && currentRoom.state.buzzed) {
    socket.emit('answer', false, buzzed_username);
  }
  $('#validate-answer').hide();
  $('#btn-stop-timer').show();
  $(`#joueur-${buzzed_username}`).css('background-color', '');
}

socket.on('new player', (room, player) => {
  console.log('[TF] new player : ' + JSON.stringify(player));
  currentRoom = room;
  var i = 1;
  if (1 <= room.players.length <= 8) {
    room.players.forEach((player) => {
      addPlayer(player, i);
      i++;
    });
  }
});

socket.on('host launch', (player, room) => {
  myplayer = player;
  currentRoom = room;
});

socket.on('update score', (room) => {
  currentRoom = room;
  room.players.forEach((player) => {
    let last_timer = unconvertTime($(`#${player.username}-timer`).text());
    $(`#${player.username}-timer`).text(convertTime(player.timer));
    if (last_timer > player.timer) {
      $(`#joueur-${player.username}`).css('background-color', 'red');
      setTimeout(() => {
        $(`#joueur-${player.username}`).css('background-color', '');
      }, 500);
    } else if (last_timer < player.timer) {
      $(`#joueur-${player.username}`).css('background-color', 'lightgreen');
      setTimeout(() => {
        $(`#joueur-${player.username}`).css('background-color', '');
      }, 500);
    }
  });
});

socket.on('clear orange', () => {
  selected_players = currentRoom.players.filter((p) => p.timer > 0);
  currentRoom.players.forEach((player) => {
    $(`#joueur-${player.username}`).css('background-color', '');
  });
});

socket.on('liberer', (r) => {
  currentRoom = r;
  liberer();
});

socket.on('block', (r) => {
  currentRoom = r;
  block();
});

function updateCountdown(room, players_selected) {
  if (players_selected.length > 0) {
    players_selected.forEach((player) => {
      if (player.timer > 0) {
        player.timer -= 1;
      }
      if (player.timer <= 0) {
        player.timer = 0;
      }
      $(`#${player.username}-timer`).text(convertTime(player.timer));
    });
  }
}

socket.on('game started', (room) => {
  currentRoom = room;
  countdown = setInterval(() => updateCountdown(currentRoom, currentRoom.players), 1000);
});

socket.on('TF time set', (time, room) => {
  currentRoom = room;
  alert('Le temps par manche a été réglé à ' + time + ' secondes');
});

socket.on('buzz', (room, username) => {
  currentRoom = room;

  console.log('[TF] buzz : ' + username);

  buzzed();
  $(`#current-timer`).text(convertTime(currentRoom.state.time_counter));
  $(`#joueur-${username}`).css('background-color', 'orange');
  $('#validate-answer').data('buzzed', username);
  $('#validate-answer').show();
  $('#btn-stop-timer').hide();
  clearInterval(countdown);
  countdown = setInterval(() => {
    updateCountdown(
      currentRoom,
      currentRoom.players.filter((p) => p.username === username)
    );
  }, 1000);
});

socket.on('stop timer', () => {
  $('#btn-restart-timer').show();
  $('#btn-stop-timer').hide();
  $('#btn-passer').hide();
  $('#validate-answer').hide();
  console.log('stop timer');
  clearInterval(countdown);
});

socket.on('restart timer', () => {
  clearInterval(countdown);

  console.log('restart timer');
  countdown = setInterval(() => updateCountdown(currentRoom, currentRoom.players), 1000);
});

socket.on('temps écoulé', (room, username) => {
  console.log('temps écoulé ' + username);
  socket.emit('answer', false, username);
  currentRoom = room;
  stop_timer();
  lowLag.play('/components/times-up.mp3');
  $(`#joueur-${username}`).css('background-color', 'grey');
});

socket.on('remove player', (room) => {
  console.log('Statut des joueurs avant déconnexion: ' + JSON.stringify(currentRoom.players));
  currentRoom = room;
  if (currentRoom.state.start && countdown) {
    clearInterval(countdown);
    socket.emit('stop timer');
  }
  var i = 1;
  if (1 <= room.players.length && room.players.length <= 8) {
    i = 1;
    room.players.forEach((player) => {
      addPlayer(player, i);
      i++;
    });
    while (i <= 8) {
      $(`#player-name-${i}`).text(`Joueur ${i}`);
      $(`#player-timer-${i}`).html('');
      i++;
    }
  } else {
    alert('Inconsistence du nombre de joueur: ' + JSON.stringify(room));
    document.location.href = '/';
  }
});

function addPlayer(player, i) {
  $(`#player-name-${i}`).data('username', player.username);
  $(`#player-name-${i}`).html(
    `<h3 id="joueur-${player.username}">${player.username}</h3> <button type="button" id="${player.socketId}-kick" class="btn btn-secondary kick">kick</button>`
  );
  $(`#joueur-${player.username}`).data('place', i);
  $(`#player-timer-${i}`).html(
    `<button type="button" id="${player.username}-timer" class="btn btn-success score-point edit" data-bs-toggle="modal" data-bs-target="#modalGivePoints">${convertTime(player.timer)}</button>`
  );

  $(document).off('click', `#${player.username}-timer`);
  $(document).on('click', `#${player.username}-timer`, (e) => {
    e.preventDefault();
    console.log('score ' + player.username);
    $('#pseudo-modal').text(`${player.username}`);
    $('#modal-score-label').text('Donnez le nombre de secondes à ajouter ou à enlever (mettre un - ) :');
    $('#btn-validate').attr('data-username', `${player.username}`);
    $('#btn-validate').off('click');
    $('#btn-validate').on('click', (e) => {
      validerPoints(e.target);
    });
  });
  $(document).off('click', `#${player.username}-kick`);
  $(document).on('click', `#${player.socketId}-kick`, (e) => {
    if (!currentRoom.state.start) {
      e.preventDefault();
      console.log('kick');
      socket.emit('kick', player.socketId);
    }
  });
}

function buzzerAction() {
  lowLag.play('/components/buzzsound.mp3');
  buzzed();
}

function liberer() {
  $('#buzzer-state').text('BUZZ');
  $('#buzzer-circle').attr('fill', 'green');
}

function block() {
  $('#buzzer-state').text('Bloqué');
  $('#buzzer-circle').attr('fill', 'yellow');
}

function buzzed() {
  $('#buzzer-state').text('Buzzed');
  $('#buzzer-circle').attr('fill', 'red');
}

function validerPoints(target) {
  $('#btn-validate').off('click');
  socket.emit('change timer', target.dataset.username, $('#score-input').val());
}

function convertTime(time) {
  var minutes = Math.floor(time / 60);
  var seconds = time % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function unconvertTime(str) {
  let parts = str.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

socket.on('disconnect', () => {
  alert("L'hôte s'est déconnecté");
  document.location.href = '/';
});

socket.on('error', (err) => {
  alert(err);
  document.location.href = '/';
});

socket.on('alert', (message) => {
  alert(message);
});
