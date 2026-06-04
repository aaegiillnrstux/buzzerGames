// jshint esversion:6
import express from 'express';
import xss from 'xss';
import cookieParser from 'cookie-parser';
import { adminAuth, isConnected, getUser } from '../API/connectivity.js';

export default function (io) {
  const router = express.Router();
  router.use(cookieParser());

  router.all('*', (req, res, next) => {
    res.send('Désolé, je code encore cette partie...');
  });
  router.get('/', (req, res) => {
    res.redirect('centurie/home');
  });
  router.get('/login', (req, res) => {
    isConnected(req, res, (connected) => {
      if (connected) {
        res.redirect('home');
      } else {
        res.render('centurie/login', { connected: connected, admin: false });
      }
    });
  });
  router.get('/register', (req, res) => {
    isConnected(req, res, (connected, role) => {
      if (connected) {
        res.redirect('home');
      } else {
        res.render('centurie/register', { connected: connected, admin: false });
      }
    });
  });
  router.get('/home', (req, res) => {
    isConnected(req, res, (connected, role) => {
      res.render('centurie/home', { connected: connected, admin: role == 'admin' });
    });
  });

  router.get('/logout', (req, res) => {
    isConnected(req, res, (connected, role) => {
      if (connected) {
        res.cookie('token', '', { maxAge: 1 });
      }
      res.redirect('home');
    });
  });

  router.get('/profil', (req, res) => {
    getUser(req, res, (user) => {
      if (user) {
        console.log(user);
        res.render('centurie/profil', { user: user, connected: true, admin: user.role == 'admin' });
      } else {
        res.redirect('logout');
      }
    });
  });

  router.get('/redaction', adminAuth, (req, res) => {
    res.render('centurie/redaction', { connected: true, admin: true });
  });

  router.get('/dashboard', adminAuth, (req, res) => {
    res.render('centurie/dashboard', { connected: true, admin: true });
  });

  return router;
}
