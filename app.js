// jshint esversion:6
import { Server } from 'socket.io';
import express from "express";
import https from "https";
import http from "http";
import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import { adminAuth, isConnected, getUser } from './API/connectivity.js';

dotenv.config();
// const options = {
//     key: fs.readFileSync('key.pem'),
//     cert: fs.readFileSync('cert.pem')
//     };

mongoose.connect(process.env.MONGOLINK,{useNewUrlParser: true, useUnifiedTopology: true});

const app = express();
// const server = https.createServer(options,app);
const server = http.createServer(app);
const port = process.env.PORT || 8080;
const HOST = '192.168.1.130';
const io = new Server(server);
import routeBuzzerFunction from './routes/buzzer.js';
import route4alsFunction from './routes/4als.js';
import routeFafFunction from './routes/faf.js';
import routeBunkaFunction from './routes/conquiztador.js';
import routeTimerFatalFunction from './routes/timer_fatal.js';
// import routeCenturieFunction from './routes/centurie.js';
import routeLoginAPIFunction from './API/loginAPI.js';
import routeQuizzAPIFunction from './API/quizzAPI.js';
// import routeQPUCFunction from './routes/qpuc.js';

const routeBuzzer=routeBuzzerFunction(io);
const route4als=route4alsFunction(io);
const routeFaf=routeFafFunction(io);
const routeBunka=routeBunkaFunction(io);
const routeTimerFatal=routeTimerFatalFunction(io);
// const routeCenturie=routeCenturieFunction(io);
const routeLoginAPI=routeLoginAPIFunction(io);
const routeQuizzAPI=routeQuizzAPIFunction(io);
// const routeQPUC=routeQPUCFunction(io);


/**
 * @type {Socket}
 */
app.use(express.urlencoded({
    extended: true
  }));
app.use(express.json()); 
app.set('view engine', 'ejs');
app.use('/jquery', express.static('node_modules/jquery/dist'));
app.use('/bootstrap/css', express.static('node_modules/bootstrap/dist/css')); 
app.use('/bootstrap/js', express.static('node_modules/bootstrap/dist/js'));
app.use('/ejs', express.static('node_modules/ejs'));
app.use(express.static('public'));
app.use('/apps/buzzer',routeBuzzer);
app.use('/apps/4als',route4als);
app.use('/apps/faf',routeFaf);
app.use('/apps/bunka',routeBunka);
app.use('/apps/timer_fatal',routeTimerFatal);
// app.use('/centurie',routeCenturie);
// app.use('/apps/qpuc',routeQPUC);
app.use('/api',routeLoginAPI);
// app.use('/api',routeQuizzAPI);
app.use(cookieParser());

 
server.listen(process.env.PORT || port, function(err){ //on a précisé le HOST ici
     if (err) console.log("Error in server setup");
     console.log("Server listening on Port", port);
 });

app.get('/home', (req, res) => {
    isConnected(req, res, (connected,role) => {
        res.render('home', {titre:"Welcome !",root:"",title:"Accueil", connected: connected,admin:(role=='admin') });
    });
});

app.get('/apps/login',(req, res) => {
    isConnected(req, res, (connected) => {
        if (connected) {
            res.redirect('home');
        }
        else {
            res.render('login', { connected: connected,admin:false });
        }
    });
    
});

app.get('/', (req, res) => {
    res.redirect('home');
});

app.get('/apps/register', (req, res) => {
    isConnected(req, res, (connected,role) => {
        if (connected) {
            res.redirect('home');
        }
        else {
            res.render('register', { connected: connected,admin:false });
        }
    });
});

app.get('/apps/logout', (req, res) => {
    isConnected(req, res, (connected,role) => {
        if (connected) {
            res.cookie('token', '', { maxAge: 1 });        
        }
        res.redirect('../home');
    });
});

app.get('/profil', (req, res) => {
    getUser(req, res, (user) => {
        if (user) {
            res.render('profil', { user: user, connected: true,admin: (user.role=='admin') });
        }
        else {
            res.redirect('logout');
        }
    });
});




app.get('/close',(req,res)=>{
    res.set("Connection", "close");
});
//this is just testing

