// jshint esversion:6
import express from 'express';
import xss from 'xss';
import { adminAuth, isConnected, isAdmin, getUser } from '../API/connectivity.js';
import cookieParser from 'cookie-parser';


export default function (io) {

    const fafNamespace = io.of("/faf");

    const test = " test";
    const router = express.Router();
    router.use(cookieParser());

    router.get('/',  (req, res) => {
        res.render('faf/fafHome');
    });
    var rooms = [{ players: [], id: 123456789, spectateurs:[], state: { start: false,main:null},options:{roundTime:20}}];
    var listeCodes = [];

    router.post('/',  (req, res) => {
        const infos = req.body;
        let roomID = 0;
        if (infos.action == "host") {  
            isAdmin(req, res, (isAdminRes) => {
                if (isAdminRes) {
                    roomID = Math.floor(Math.random() * 899999) + 100000;
                    listeCodes.push(parseInt(roomID));
                    console.log("[Hosting] room " + roomID);
                    res.redirect('/apps/faf/' + roomID);
                }
                else {
                    res.status(403).render('home', { titre: "Accès refusé", root: "../../", title: "Erreur",connected:isAdminRes });
                }});  
        }
        else if (infos.action == 'join') {
            res.redirect('/apps/faf/' + infos.code);
        }
    });

    router.get('/:code', (req, res) => {
        const code = parseInt(req.params.code);
        const room = rooms.find((room) => { return code === room.id; });
        console.log("[Joining FAF] " + code );

        console.log(listeCodes);
        if (listeCodes.includes(code) && !room) {
            res.status(200).render('faf/host', { code: code, players: [] });
        }
        else if (listeCodes.includes(code) && room) {
            res.status(200).render('faf/player', { code: code, players: [] });
        }
        else {
            isConnected(req, res, (connected,role) => {
                res.status(404).render('home', { titre: "Pas de salles associées", root: "../../", title: "Erreur",connected:connected });
            });
        }

    });

    fafNamespace.on('connection', (socket) => {
        var p;
        var r;
        console.log(`[Connection] ${socket.id}`);

        socket.once('FAFplayerDataHost', (player) => {
            console.log("Receiving playerDataHost in FAF");
            if (!/^[A-Za-z0-9]*[A-Za-z0-9\s]+[A-Za-z0-9]*$/.test(player.username)) {
                socket.disconnect();
            }
            else if (!rooms.find((room) => { return player.roomId === room.id; })) {
                player.username = xss(player.username);
                player.host = true;
                player.roomId = parseInt(player.roomId);
                player.points = 0;
                player.player = true;
                p = player;
                r = { players: [], spectateurs: [], id: player.roomId, state: { start: false, pointsRule: [[[4],[2]],[[3],[1]]], main: null, mainInGame: null,buzzed:false},options:{roundTime:20,whitelistEnabled:false,whitelist:[]} };
                rooms.push(r);
                socket.join(p.roomId);
                console.log(`[Hosting FAF] ${p.username} host la room ` + p.roomId);
                fafNamespace.to(socket.id).emit('FAF host launch', p,r);
            }

        });
            

        socket.on('FAFplayerData', (player) => {
            console.log("Receiving playerData in FAF: "+JSON.stringify(player));
            if (!/^[A-Za-z0-9]*[A-Za-z0-9\s]+[A-Za-z0-9]*$/.test(player.username)) {
                fafNamespace.in(player.socketId).emit("FAF error", "Choississez un pseudo qu'avec des caractères alphanumériques");
                
            }
            else if (!player.roomId) {
                fafNamespace.in(player.socketId).emit("FAF error", "Vous n'avez pas de code de room");
            }
            else if (!listeCodes.includes(parseInt(player.roomId))) {
                fafNamespace.in(player.socketId).emit("FAF error", "Ce code n'existe pas");
            }
            else {
                r = rooms.find((room) => { return player.roomId === room.id; })
                if (!r){
                    fafNamespace.in(player.socketId).emit("FAF error", "Cette room n'existe pas");
                }
                else if ( r.players.find((player) => { return player.socketId === socket.id; })) {
                    fafNamespace.in(player.socketId).emit("FAF error", "Player déjà présent dans la room");
                }
                else if ( r.players.find((play) => { return play.username === player.username; })) {
                    fafNamespace.in(player.socketId).emit("FAF error", "Player déjà présent dans la room");
                }
                else if (r.options.whitelistEnabled && !r.options.whitelist.includes(player.username)) {
                    fafNamespace.in(player.socketId).emit("FAF error", "Vous n'êtes pas dans la whitelist");
                }
                else {
                    console.log(`[Joining FAF] ${player.username} join la room ` + player.roomId);
                    player.username = xss(player.username);
                    player.host = false;
                    player.roomId = parseInt(player.roomId);
                    player.points = 0;
                    player.state="blocked";
                    p = player;
                    r = rooms.find((room) => { return p.roomId === room.id; });
                    if (!r) {
                        socket.disconnect();
                    }
                    else {
                        if (r.players.length>=2){
                            player.player = false;
                            r.spectateurs.push(p);
                            socket.join(p.roomId);
                            fafNamespace.to(p.roomId).emit('FAF new spectateur', r,p);
                            fafNamespace.to(socket.id).emit("FAF spectateur init", r, p);
                    }
                        else{
                            player.player = true;
                            r.players.push(player);
                            fafNamespace.to(p.roomId).emit("FAF new player", r, p);
                            socket.join(p.roomId);
                            fafNamespace.to(socket.id).emit("FAF player init", r, p);
                        }
                    }
                }
                console.log("Room :"+JSON.stringify(r));
        }
        });

        socket.on("FAF time", (roundTime) => {
            if (p && p.host) {
                console.log(`[FAF ${r.id}] Time : `+roundTime);
                r.options.roundTime = roundTime;
                fafNamespace.to(p.roomId).emit("FAF time", r);
            }
        });

        socket.on("FAF current player", (player,rang) => {
            if (p && p.host) {
                console.log(`[FAF ${r.id}] ${player} a la main `);
                r.state.main=rang;
                fafNamespace.to(p.roomId).emit("FAF current player", r);
                if (rang==0){
                    r.state.pointsRule=[[[4],[2]],[[3],[1]]];
                }
                else{
                    r.state.pointsRule=[[[3],[1]],[[4],[2]]];
                }
            }
        });

        socket.on("FAF whitelist",(bool,whitelist)=>{
            if (p && p.host) {
                console.log(`[FAF ${r.id}] whitelist : `+bool);
                r.options.whitelistEnabled=bool;
                if (bool){
                    if (/^[A-Za-z0-9\s;]+$/.test(whitelist)){
                        r.options.whitelist=whitelist.split(";");
                    }
                    else{
                        socket.emit("FAF alert","La whitelist n'est pas valide");
                    }
                }
                fafNamespace.to(p.roomId).emit("FAF whitelist", r);
            }
        });

        socket.on("FAF start",()=>{
            if (p && p.host&&!r.state.start) {
                console.log(`[FAF ${r.id}] start `);
                r.state.start = true;
                fafNamespace.to(p.roomId).emit("FAF start",r);
                var player = r.players[r.state.main];
                r.state.mainInGame=r.state.main;
                player.state="free";
                fafNamespace.to(player.socketId).emit("FAF free",r);
            }
        });

        socket.on("FAF buzzed",(player)=>{
            if (p && !p.host&&r.state.start&&!r.state.buzzed&&r.players[r.state.mainInGame].username==player&&r.players[r.state.mainInGame].state=="free") {
                console.log(`[FAF ${r.id}] ${player} buzzed `);
                p.state="blocked";
                r.state.buzzed=true;
                fafNamespace.to(p.roomId).emit("FAF buzzed",r,player);
            }
        })

        socket.on("FAF answer",(answer)=>{
            if (p && p.host&&r.state.start) {
                console.log(`[FAF ${r.id}] ${r.state.mainInGame} answered ${answer}`);
                r.state.buzzed=false;
                var player = r.players[r.state.mainInGame];
                if (answer){
                    player.points+=r.state.pointsRule[r.state.mainInGame][0][0];
                    console.log(`[FAF ${r.id}] ${player.username} a maintenant ${player.points} points`);
                    r.state.start = false;
                    r.state.main=null;
                    r.state.mainInGame=null;
                    fafNamespace.to(p.roomId).emit("FAF update score",player,r);
                    fafNamespace.to(p.roomId).emit("FAF end",true,r);
                    fafNamespace.to(p.roomId).emit("FAF block",r)
                }
                else {
                    console.log(` [FAF ${r.id}] ${player.username} a perdu la main`);
                    console.log(JSON.stringify(r.state.pointsRule));
                    if (r.state.pointsRule[1-r.state.mainInGame].length==0){
                        r.state.pointsRule[1-r.state.mainInGame].push([]);
                    }
                    var tab = r.state.pointsRule[r.state.mainInGame].shift();
                    for (let el of tab){
                        r.state.pointsRule[1-r.state.mainInGame][0].unshift(el);
                    }
                    console.log(JSON.stringify(r.state.pointsRule));
                    r.state.mainInGame=1-r.state.mainInGame;
                    
                    fafNamespace.to(p.roomId).emit("FAF switch", r);
                }
            }
        });

        socket.on("FAF restart",()=>{
            if (p && p.host&&r.state.start) {
                r.players[r.state.mainInGame].state="free";
                r.players[1-r.state.mainInGame].state="blocked";
                fafNamespace.to(r.players[r.state.mainInGame].socketId).emit("FAF free",r);
                fafNamespace.to(r.players[1-r.state.mainInGame].socketId).emit("FAF block",r);
            }
        });

        socket.on("FAF main",(boite)=>{
            if (p && p.host&&r.state.start) {
                console.log("changement de main",JSON.stringify(r.state.pointsRule));
                r.state.pointsRule[r.state.mainInGame][0] = r.state.pointsRule[r.state.mainInGame][0].filter(item => item !== boite+1);
                if (r.state.pointsRule[r.state.mainInGame][0].length==0){
                    r.state.pointsRule[r.state.mainInGame].shift();
                    if (r.state.pointsRule[1-r.state.mainInGame][0].includes(boite)){
                        r.state.mainInGame=1-r.state.mainInGame;
                        r.players[r.state.mainInGame].state="free";
                        r.players[1-r.state.mainInGame].state="blocked";
                        fafNamespace.to(r.players[r.state.mainInGame].socketId).emit("FAF free",r);
                        fafNamespace.to(r.players[1-r.state.mainInGame].socketId).emit("FAF block",r);
                        fafNamespace.to(p.roomId).emit("FAF main", r);
                    }
                    else{
                        socket.emit("FAF error","Un problème imprévu a eu lieu lors du contrôle des boites");
                        console.log("Un problème imprévu a eu lieu lors du contrôle des boites");
                        console.log(JSON.stringify(r));
                    }
                }
                else if ( r.state.pointsRule[r.state.mainInGame][0].includes(boite) ){

                }
                else{
                    socket.emit("FAF error","Un problème imprévu a eu lieu lors du contrôle des boites");
                    console.log("Un problème imprévu a eu lieu lors du contrôle des boites");
                    console.log(JSON.stringify(r));
                }
                console.log("changement de main",JSON.stringify(r.state.pointsRule));
        }
        })


        socket.on("FAF end",()=>{
            if (p && p.host&&r.state.start) {
                console.log(`[FAF ${r.id}] end `);
                r.state.start = false;
                r.state.main=null;
                r.state.mainInGame=null;
                r.state.buzzed=false;
                for (let i=0;i<2;i++){
                    r.players[i].state="blocked";
                    fafNamespace.to(r.players[i].socketId).emit("FAF blocked",r);
                }
                fafNamespace.to(p.roomId).emit("FAF end",false,r);
            }
        });

        socket.on('FAF change points', (username,points)=>{
            if (p && p.host && points.match(/^-?[0-9]+$/)!=null) {
                var player = r.players.find((player) => { return player.username === username; });
                player.points += parseInt(points);
                fafNamespace.to(p.roomId).emit("FAF update score",player,r);
                console.log(`[FAF ${r.id}] ${player.username} a maintenant ${player.points} points`);
            }
        });     

        socket.on("FAF kick", (socketId) => {
            if (p && p.host&&!r.state.start) {
                var bool = false;
                if (p.host && !r.state.start) {
                    console.log(`[FAF ${r.id}] kick ${socketId}`);
                    bool = true;
                    fafNamespace.in(socketId).emit("error", "Vous avez été kické de la partie")
                    fafNamespace.in(socketId).disconnectSockets();
                }
                if (bool) {
                    fafNamespace.to(socket.id).emit("kick-success");
                }
        }
        });

        socket.on("disconnect", () => {
            console.log(`[FAF] ${socket.id} disconnected`);
            if (p && !p.host) {
                console.log(`Bye bye ${p.username}`);

                if (p.player){

                    
                    if (r) {
                        if (r.state.start){
                            fafNamespace.in(p.roomId).disconnectSockets();
                            fafNamespace.in(p.roomId).emit("FAF error", "Un joueur a quitté la partie, veuillez la relancer et remettre les points");
                        }
                        r.players = r.players.filter((player) => player.username !== p.username);
                        r.spectateurs = r.spectateurs.filter((player) => player.username !== p.username);
                        
                    }
                    fafNamespace.to(p.roomId).emit("FAF remove player", r);
                }
                else{
                    
                    if (r) {
                        r.spectateurs = r.spectateurs.filter((player) => player.username !== p.username);
                    }
                    fafNamespace.to(p.roomId).emit("FAF remove spectateur", r,p);
                }

            }
            else if (p && p.host) {
                console.log(`Bye bye host ${p.username}`);
                fafNamespace.in(p.roomId).disconnectSockets();
                rooms = rooms.filter((room) => room.id !== p.roomId);
                listeCodes = listeCodes.filter((code) => code !== p.roomId);
            }
        });


    });

    return router;
}