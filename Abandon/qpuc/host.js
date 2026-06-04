// jshint esversion:8
const socket = io();

const player = {
  host: true,
  roomId: null,
  username: '',
  socketId: ''
};

var room = {
  everyone: [],
  allowedPlayers: [],
  players: [],
  id: 0,
  mode: '9pg' || '4als' || 'jd' || 'faf',
  state: 'buzzed||locked||free',
  options: { '9pg': {}, '4als': {}, jd: {}, faf: {} }
};

function updateRoom(r) {}

$('form-pseudo').on('submit', function (e) {
  e.preventDefault();
  player.username = $('#username').val();
  player.code = $('#code').val();
  var playerlist = $('#playerlist').val();
  $('#user-card').hide('slow');
  $('#user-card').empty();
  $('#settings').show('slow');
  socket.emit('playerDataHost', player, playerlist);
});

socket.on('hostLaunch', (p, r) => {});
