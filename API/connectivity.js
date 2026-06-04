// jshint esversion:8
import jwt from 'jsonwebtoken';
import User from '../model/user.js';

function adminAuth(req, res, next) {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect('login');
      } else {
        if (decodedToken.triviarole === 'hote') {
          next();
        } else {
          res.redirect('login');
        }
      }
    });
  } else {
    res.redirect('login');
  }
}

function isAdmin(req, res, next) {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        next(false);
      } else {
        if (decodedToken.triviarole === 'hote') {
          next(true);
        } else {
          next(false);
        }
      }
    });
  } else {
    next(false);
  }
}

function isConnected(req, res, next) {
  if (req.cookies.token) {
    const token = req.cookies.token;
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        next(false, null);
      } else {
        if (decodedToken.triviarole) {
          next(true, decodedToken.triviarole);
        }
      }
    });
  } else {
    next(false, null);
  }
}

function getUser(req, res, next) {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        console.log('Issue while verifying token: ' + err.message);
        next(null);
      } else {
        // find user in db thanks to username in decodedToken
        const user = await User.findOne({
          username: decodedToken.username
        }).lean();
        if (!user) {
          console.log('User' + decodedToken.username + 'not found');
          next(null);
        } else {
          next(user);
        }
      }
    });
  } else {
    next(null);
  }
}

export { adminAuth, isAdmin, isConnected, getUser };
