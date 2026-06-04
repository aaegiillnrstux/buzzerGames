// jshint esversion:6
import express from 'express';
import xss from 'xss';
import { adminAuth, isConnected, getUser } from '../API/connectivity.js';
import cookieParser from 'cookie-parser';

export default function (io) {
  const router = express.Router();
  router.use(cookieParser());

  var rooms = [{ players: [], id: 123456789 }];
  var listeCodes = [];

  var typicalRoom = {
    everyone: [],
    allowedPlayers: [],
    players: [],
    id: 12345678,
    mode: '9pg' || '4als' || 'jd' || 'faf',
    state: 'buzzed||locked||free',
    options: { '9pg': {}, '4als': {}, jd: {}, faf: {} }
  };
  var typicalPlayer = { role: 'host||player||spectator', roomId: null, username: '', socketId: '' };

  router.get('/', (req, res) => {
    isConnected(req, res, (connected, role) => {
      res.render('qpuc/qpucHome', { allowed: role == 'admin' });
    });
  });

  router.post('/', (req, res) => {
    const infos = req.body;
    let roomID = 0;
    if (infos.action == 'host') {
      roomID = Math.floor(Math.random() * 899999) + 100000;
      listeCodes.push(parseInt(roomID));
      console.log('[Hosting] QPUC ' + roomID);
      res.redirect('/apps/qpuc/' + roomID);
    }
  });

  router.get('/:code', (req, res) => {
    const code = parseInt(req.params.code);
    const room = rooms.find((room) => {
      return code === room.id;
    });
    if (listeCodes.includes(code) && !room) {
      res.status(200).render('qpuc/host', { code: code, players: [] });
    } else if (listeCodes.includes(code) && room) {
      res.status(200).render('qpuc/player', { code: code, players: [] });
    } else {
      res.status(404).render('home', { titre: 'Pas de salles associées', root: '../../', title: 'Erreur' });
    }
  });

  io.on('connection', (socket) => {
    var p;
    var r;
    console.log(`[Connection] ${socket.id}`);

    socket.once('playerDataHost', (player, playerlist) => {
      console.log('Receiving playerDataHost');
      if (!/^[A-Za-z0-9]*$/.test(player.username)) {
        socket.disconnect();
      } else if (
        !rooms.find((room) => {
          return player.roomId === room.id;
        })
      ) {
        playerlist = player.replace(' ', '').split(',');
        player.username = xss(player.username);
        player.role = 'host';
        player.roomId = parseInt(player.roomId);
        p = player;
        r = {
          everyone: [p],
          allowedPlayers: playerlist,
          players: [],
          id: player.roomId,
          mode: 'settings',
          state: 'locked',
          options: { '9pg': {}, '4als': {}, jd: {}, faf: {} }
        };
        rooms.push(r);
        socket.join(p.roomId);
        console.log(`[Hosting] ${p.username} host la room ` + p.roomId);
        io.to(socket.id).emit('hostLaunch', p);
      }
    });
  });

  return router;
}
