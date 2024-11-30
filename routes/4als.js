// jshint esversion:6
import express from 'express';
import xss from 'xss';
import { adminAuth, isConnected, isAdmin,getUser } from '../API/connectivity.js';
import cookieParser from 'cookie-parser';


export default function (io) {

    const test = " test";
    const router = express.Router();
    router.use(cookieParser());

    router.get('/', (req, res) => {
        res.render('4als/4alsHome');
    });
    var rooms = [{ players: [], id: 123456789, state: { currentPlayer:null, start: false, maxScore: 0,score:0 },options:{roundTime:45}}];
    var listeCodes = [];

    router.post('/', (req, res) => {
        const infos = req.body;
        let roomID = 0;
        if (infos.action == "host") {
            isAdmin(req, res, (isAdminRes) => {
                if (isAdminRes) {
                    roomID = Math.floor(Math.random() * 899999) + 100000;
                    listeCodes.push(parseInt(roomID));
                    console.log("[Hosting] room " + roomID);
                    res.redirect('/apps/4als/' + roomID);
                }
                else {
                    res.status(403).render('home', { titre: "Accès refusé", root: "../../", title: "Erreur",connected:isAdminRes });
                }});
        }
        else if (infos.action == 'join') {
            res.redirect('/apps/4als/' + infos.code);
        }
    });

    router.get('/:code', (req, res) => {
        const code = parseInt(req.params.code);
        const room = rooms.find((room) => { return code === room.id; });
        console.log("[JOIN] " + code + " " + room + "");
        //log each room of rooms
        console.log("Rooms :");
        rooms.forEach((room) => {
            console.log(room.id);
        });
        console.log(listeCodes);
        if (listeCodes.includes(code) && !room) {
            res.status(200).render('4als/host', { code: code, players: [] });
        }
        else if (listeCodes.includes(code) && room) {
            res.status(200).render('4als/player', { code: code, players: [] });
        }
        else {
            isConnected(req, res, (connected,role) => {
                res.status(404).render('home', { titre: "Pas de salles associées", root: "../../", title: "Erreur",connected:connected });
            });
        }

    });

    io.on('connection', (socket) => {
        var p;
        var r;

        console.log(`[Connection] ${socket.id}`);

        socket.once('4ALSplayerDataHost', (player) => {
            console.log("Receiving playerDataHost in 4ALS");
            if (!/^[A-Za-z0-9]*[A-Za-z0-9\s]+[A-Za-z0-9]*$/.test(player.username)) {
                socket.disconnect();
            }
            else if (!rooms.find((room) => { return player.roomId === room.id; })) {
                player.username = xss(player.username);
                player.host = true;
                player.roomId = parseInt(player.roomId);
                p = player;
                r = { players: [p], id: player.roomId, state: { currentPlayer:null, start: false, maxScore: 0,score:0 }, options: { roundTime: 45 } };
                rooms.push(r);
                socket.join(p.roomId);
                console.log(`[Hosting 4ALS] ${p.username} host la room ` + p.roomId);
                io.to(socket.id).emit('4ALS host launch', p,r);
            }

        });

        socket.on('4ALSplayerData', (player) => {
            try{
                if (!/^[A-Za-z0-9]*[A-Za-z0-9\s]+[A-Za-z0-9]*$/.test(player.username)) {
                    io.in(player.socketId).emit("4ALS error", "Choississez un pseudo qu'avec des caractères alphanumériques");
                    
                }
                else {
                    console.log(`[Joining] ${player.username} join la room ` + player.roomId);
                    player.username = xss(player.username);
                    player.host = false;
                    player.roomId = parseInt(player.roomId);
                    player.points = 0;
    
                    p = player;
                    r = rooms.find((room) => { return p.roomId === room.id; });
                    if (!r) {
                        socket.disconnect();
                    }
                    else {
                        r.players.push(player);
                        io.to(p.roomId).emit("4ALS new player", p);
                        socket.join(p.roomId);
                        io.to(socket.id).emit("4ALS player init", r, p);
                    }
                }
            } catch(e){
                console.error("Il y a eu un pb dans 4ALSplayerData : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur lors de la connexion")
            }
            
        });

        socket.on("4ALS current player", (player) => {
            try{
                if (p && p.host) {
                    console.log(`[4ALS ${r.id}]current player : `+player);
                    r.state.currentPlayer=player;
                    r.state.score=0;
                    r.state.maxScore=0;
                    io.to(p.roomId).emit("4ALS current player", r);
                }
            }
            catch(e){
                console.error("Il y a eu un pb dans 4ALS current player : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur pour changer de joueur")
            }

        });

        socket.on("4ALS start", () => {
            try{
                if (p && p.host) {
                    r.state.start = true;
                    io.to(p.roomId).emit("4ALS start", r);
                }
            }
            catch(e){
                console.error("Il y a eu un pb dans 4ALS start : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur pour commencer le 4ALS")
            }
        });

        socket.on("4ALS end", () => {
            try{    
                if (p && p.host) {
                    try{
                        r.state.start = false;
                        var player = r.players.find((player) => { return player.username === r.state.currentPlayer; });
                        player.points=r.state.maxScore;
                        r.state.score=0;
                        io.to(p.roomId).emit("4ALS end", r,player);
                    }
                    catch(e){
                        console.error("Il y a eu un pb dans 4ALS end : "+e);
                        io.in(p.roomID).emit("4ALS error","Il y a eu un problème lors du 4 à la suite")
                        io.in(p.roomID).disconnectSockets();
                    }
                    
                }
            }
            catch(e){
                console.error("Il y a eu un pb dans 4ALS end : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur à la fin du 4ALS")
            }
            
        });


        socket.on("disconnect", () => {
            try{
                console.log(`[Disconnection] ${socket.id}`);
                if (p && !p.host) {
                    console.log(`Bye bye ${p.username}`);
    
                    io.to(p.roomId).emit("4ALS remove player", p);
                    if (r) {
                        r.players = r.players.filter((player) => player.username !== p.username);
                    }
    
                }
                else if (p && p.host) {
                    console.log(`Bye bye host ${p.username}`);
                    io.in(p.roomId).disconnectSockets();
                    rooms = rooms.filter((room) => room.id !== p.roomId);
                    listeCodes = listeCodes.filter((code) => code !== p.roomId);
                }
            } catch(e){
                console.error("Il y a eu un pb dans 4ALS disconnect : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur lors de la déconnexion")
            }
        });

        socket.on("4ALS answer", (bool) => {
            try{
                if (p && p.host&&r.state.start){
                    if (bool){
                        r.state.score++;
                        if (r.state.score>r.state.maxScore){
                            r.state.maxScore=r.state.score;
                        }
                    }
                    else{
                        r.state.score=0;
                    }
                    io.to(p.roomId).emit("4ALS answer", bool,r.state);
                } 
            } catch(e){
                console.error("Il y a eu un pb dans 4ALS answer : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur lors de la réponse")
            }

        });

        socket.on("4ALS time", (time) => {
            try{    
                if (p && p.host) {
                    r.options.roundTime=time;
                    io.to(p.roomId).emit("4ALS time", time);
                }
            } catch(e){
                console.error("Il y a eu un pb dans 4ALS time : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur pour changer le temps")
            }

        });

        socket.on('4ALS change points', (username,points)=>{
            // check if points integer
            try{
                if (p && p.host && points.match(/^-?[0-9]+$/)!=null) {
                    var player = r.players.find((player) => { return player.username === username; });
                    player.points += parseInt(points);
                    io.to(p.roomId).emit("4ALS update score",player,r);
                }
            }catch(e){
                console.error("Il y a eu un pb dans 4ALS change points : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur pour changer les points")
            }

        });


        socket.on("4ALSlatencyIn",(start)=>{
            p.ping=(Date.now()-start)/2;
        });

        socket.on("4ALSkick", (socketId) => {
            try{
                var bool = false;
                if (p.host) {
                    bool = true;
                    io.in(socketId).disconnectSockets();
                    
                }
                if (bool) {
                    io.to(socket.id).emit("kick-success");
                }
            } catch(e){
                console.error("Il y a eu un pb dans 4ALS kick : "+e);
                io.in(p.roomID).emit("4ALS alert","Erreur pour kick")
            }

        });


        setInterval(() => {
            const start = Date.now();
            if (p){
                io.in(p.roomId).emit("4ALSlatencyOut", start);
            }
            
          }, 10000);
    });
  
    function resetPoints(r){
        try{
            r.players.forEach((p)=>{
                p.points=0;
            });
        }
        catch(e){
            console.error("Il y a eu un pb dans resetPoints : "+e);
        }
    }
    return router;


}
