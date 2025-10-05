// jshint esversion:6
import express from 'express';
import xss from 'xss';
import { adminAuth, isConnected, isAdmin, getUser } from '../API/connectivity.js';
import cookieParser from 'cookie-parser';

export default function routeTimerFatal(io) {

    const TFNamespace = io.of('/timer_fatal');
    const router = express.Router();
    router.use(cookieParser());

    router.get('/', (req, res) => {
        res.render('timer_fatal/timer_fatalHome');
    });

    var rooms = [];
    var countdowns={};
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
                    res.redirect('/apps/timer_fatal/' + roomID);
                }
                else {
                    res.status(403).render('home', { titre: "Accès refusé", root: "../../", title: "Erreur",connected:isAdminRes });
                }});
        }
        else if (infos.action == 'join') {
            res.redirect('/apps/timer_fatal/' + infos.code);
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
            res.status(200).render('timer_fatal/host', { code: code, players: [] });
        }
        else if (listeCodes.includes(code) && room) {
            res.status(200).render('timer_fatal/player', { code: code, players: [] });
        }
        else {
            isConnected(req, res, (connected,role) => {
                res.status(404).render('home', { titre: "Pas de salles associées", root: "../../", title: "Erreur",connected:connected });
            });
        }

    });


    

    TFNamespace.on('connection', (socket) => {
        var p;
        var r;
        console.log(`[Connection] ${socket.id}`);

        function updateCountdown(room,players_selected) {
            room.state.time_counter+=1;
            if (players_selected.length>0){
                players_selected.forEach((player)=>{
                    if (player.timer>0){
                        player.timer-=1;
                    }
                    if (player.timer<=0){
                        player.timer=0;
                        TFNamespace.to(r.id).emit("temps écoulé",room,player.username);
                    }
                });
            }
        }

        socket.once('playerDataHost', (player) => {
            console.log("Receiving playerDataHost in TF");
            if (!/^[A-Za-z0-9]*[A-Za-z0-9\s]+[A-Za-z0-9]*$/.test(player.username)) {
                socket.disconnect();
            }
            else if (!rooms.find((room) => { return player.roomId === room.id; })) {
                player.username = xss(player.username);
                player.host = true;
                player.roomId = parseInt(player.roomId);
                player.timer = 0;
                player.player = true;
                p = player;
                r = { players: [], spectateurs: [], id: player.roomId, state: { free: true, start: false, buzzed: false, blocked: false, time_counter: 0, last_question_time: 0 },options:{time_start:60} };
                rooms.push(r);
                socket.join(p.roomId);
                console.log(`[Hosting TF] ${p.username} host la room ` + p.roomId);
                TFNamespace.to(socket.id).emit('host launch', p,r);
            }

        });

        socket.on('playerData', (player) => {
            try{
                console.log("Receiving playerData in Timer Fatal: "+JSON.stringify(player));
            if (!/^[A-Za-z0-9]*[A-Za-z0-9\s]+[A-Za-z0-9]*$/.test(player.username)) {
                TFNamespace.in(player.socketId).emit("error", "Choississez un pseudo qu'avec des caractères alphanumériques");
                
            }
            else if (!player.roomId) {
                TFNamespace.in(player.socketId).emit("error", "Vous n'avez pas de code de room");
            }
            else if (!listeCodes.includes(parseInt(player.roomId))) {
                TFNamespace.in(player.socketId).emit("error", "Ce code n'existe pas");
            }
            else {
                r = rooms.find((room) => { return player.roomId === room.id; })
                if (!r){
                    TFNamespace.in(player.socketId).emit("error", "Cette room n'existe pas");
                }
                else if ( r.players.find((player) => { return player.socketId === socket.id; })) {
                    TFNamespace.in(player.socketId).emit("error", "Player déjà présent dans la room");
                }
                else if ( r.players.find((play) => { return play.username === player.username; })) {
                    TFNamespace.in(player.socketId).emit("error", "Player déjà présent dans la room");
                }
                else {
                    console.log(`[Joining TF] ${player.username} join la room ` + player.roomId);
                    player.username = xss(player.username);
                    player.host = false;
                    player.roomId = parseInt(player.roomId);
                    player.timer = r.options.time_start;
                    player.state="blocked";
                    p = player;
                    r = rooms.find((room) => { return p.roomId === room.id; });
                    if (!r) {
                        socket.disconnect();
                    }
                    else {
                        if (r.players.length>=8 || r.state.start){
                            p=null;
                            // player.player = false;
                            // r.spectateurs.push(p);
                            // socket.join(p.roomId);
                            // TFNamespace.to(p.roomId).emit('new spectateur', r,p);
                            // TFNamespace.to(socket.id).emit("spectateur init", r, p);
                            TFNamespace.to(socket.id).emit("error","La salle est pleine (8 joueurs max)");
                    }
                        else{
                            player.player = true;
                            r.players.push(player);
                            TFNamespace.to(p.roomId).emit("new player", r, p);
                            socket.join(p.roomId);
                            TFNamespace.to(socket.id).emit("player init", r, p);
                        }
                    }
                }
                console.log("Room :"+JSON.stringify(r));
        }
            }catch(e){
                console.log(e);
                TFNamespace.to(p.roomId).emit("alert","Il y a un petit malin dans la salle")
            }

            
        });

        socket.on('change timer', (username,secondes)=>{
            try{
                if (p && p.host && secondes.match(/^-?[0-9]+$/)!=null) {
                    var player = r.players.find((player) => { return player.username === username; });
                    player.timer += parseInt(secondes);
                    if (player.timer<0){
                        player.timer=0;
                        TFNamespace.to(p.roomId).emit("temps écoulé",r,player.username);
                        TFNamespace.to(player.socketId).emit("block",);
                    }
                    TFNamespace.to(p.roomId).emit("update score",r);

                    console.log(`[TF ${r.id}] ${player.username} a maintenant ${player.timer} secondes`);
                }
            } catch(e)
            {
                console.error("Il y a eu un pb dans TF change timer : "+e);
                TFNamespace.to(p.roomId).emit("alert","Erreur pour changer les timer")
            }

        }); 

        socket.on('TF time', (time)=>{
            try{
                if (p && p.host && time.match(/^-?[0-9]+$/)!=null) {
                    r.options.time_start = parseInt(time);
                    r.players.forEach((player) => {
                        player.timer = r.options.time_start;
                    });
                    TFNamespace.to(p.roomId).emit("TF time set",r.options.time_start,r);
                    TFNamespace.to(p.roomId).emit("update score",r);
                    console.log(`[TF ${r.id}] Time set to ${r.options.time_start} seconds`);
                }
            } catch(e)
            {
                console.error("Il y a eu un pb dans TF time : "+e);
                TFNamespace.to(p.roomId).emit("alert","Erreur pour changer le temps de départ")
            }
        });

        socket.on("start game", () => {
            try {
                if (p && p.host && !r.state.start) {
                    r.state.start = true;
                    TFNamespace.to(p.roomId).emit("liberer");
                    r.state.free = true;
                    r.state.last_question_time=0;
                    r.state.time_counter=0;
                    if (countdowns[r.id]){
                        clearInterval(countdowns[r.id]);
                    }
                    countdowns[r.id] = setInterval(()=>{updateCountdown(r,r.players)},1000);
                    TFNamespace.to(p.roomId).emit("game started", r);
                    console.log(`[TF ${r.id}] Game started`);
                }
            } catch (error) {
                console.error("Il y a eu un pb dans TF start game : "+error);
                TFNamespace.to(p.roomId).emit("alert","Erreur pour démarrer la partie")
            }
        });

        socket.on("buzzed", (username) => {
            try {
                if (p && !p.host && r.state.start && r.state.free) {
                    var player = r.players.find((player) => { return player.username === username; });
                    if (player && player.timer>0 && r.state.start && r.state.free) {
                        r.state.free = false;
                        r.state.buzzed = true;
                        TFNamespace.to(p.roomId).emit("buzz", r,player.username);
                        console.log(`[TF ${r.id}] ${player.username} a buzzé`);
                        clearInterval(countdowns[r.id]);
                        r.state.last_question_time=r.state.time_counter;
                        r.state.time_counter=0;
                        countdowns[r.id]=setInterval(()=>{updateCountdown(r,[player])},1000);
                    }
                }
            } catch (error) {
                console.error("Il y a eu un pb dans TF buzzer : "+error);
                TFNamespace.to(p.roomId).emit("alert","Erreur lors d'un buzz")
            }
        });

        socket.on("answer", (isCorrect,username) => {
            try {
                if (p && p.host && r.state.start && r.state.buzzed) {
                    var player = r.players.find((player) => { return player.username === username; });
                    if (player) {
                        clearInterval(countdowns[r.id]);
                        if (isCorrect) {
                            console.log(`[TF ${r.id}] ${player.username} a répondu correctement`);
                            player.timer +=r.state.last_question_time+r.state.time_counter;
 
                        }
                        else {
                            console.log(`[TF ${r.id}] ${player.username} a répondu faux`);
                            r.players.forEach((pl)=>{
                                if (pl.username!==player.username){
                                    pl.timer+=r.state.last_question_time;
                                }
                            }); 
                        }
                        r.state.time_counter=0;
                        TFNamespace.to(p.roomId).emit("update score", r);
                        r.state.buzzed = false;
                        r.state.free = true;
                        TFNamespace.to(p.roomId).emit("liberer", r);
                        TFNamespace.to(p.roomId).emit("restart timer");
                        countdowns[r.id] = setInterval(()=>{updateCountdown(r,r.players)},1000);
                    }
                }
            } catch (error) {
                console.error("Il y a eu un pb dans TF answer : "+error);
                TFNamespace.to(p.roomId).emit("alert","Erreur lors de la validation d'une réponse")
            }
        });

        socket.on("stop timer", () => {
            try {
                if (p && p.host && r.state.start) {
                    clearInterval(countdowns[r.id]);
                    r.state.free = false;
                    r.state.buzzed = false;
                    r.state.blocked = true;
                    TFNamespace.to(p.roomId).emit("block", r);
                    TFNamespace.to(p.roomId).emit("stop timer");
                    console.log(`[TF ${r.id}] Timer stopped`);
                }
            } catch (error) {
                console.error("Il y a eu un pb dans TF stop timer : "+error);
                TFNamespace.to(p.roomId).emit("alert","Erreur pour stopper le timer")
            }
        });

        socket.on("restart timer", () => {
            try {
                if (p && p.host && r.state.start && r.state.blocked) {
                    clearInterval(countdowns[r.id]);
                    r.state.blocked = false;
                    r.state.free = true;
                    TFNamespace.to(p.roomId).emit("liberer", r);
                    var players_selected=r.players.filter((pl)=>pl.timer>0);
                    countdowns[r.id] = setInterval(()=>{updateCountdown(r,players_selected)},1000);
                    TFNamespace.to(p.roomId).emit("restart timer");
                    TFNamespace.to(p.roomId).emit("update score", r);
                    console.log(`[TF ${r.id}] Timer restarted`);
                }
            } catch (error) {
                console.error("Il y a eu un pb dans TF restart timer : "+error);
                TFNamespace.to(p.roomId).emit("alert","Erreur pour redémarrer le timer")
            }
        });




        socket.on("disconnect", () => {
            try {
                if (p && r) {
                    console.log(`[TF ${r.id}] ${socket.id} disconnected`);
                    
                    if (p.host) {
                        // Si c'est l'hôte qui se déconnecte, arrêter complètement la partie
                        console.log(`Bye bye host ${p.username}`);
                        TFNamespace.to(p.roomId).emit("host disconnected"); // Émettre un événement spécifique
                        clearInterval(countdowns[r.id]);
                        delete countdowns[r.id];
                        rooms = rooms.filter((room) => room.id !== p.roomId);
                        listeCodes = listeCodes.filter((code) => code !== p.roomId);
                        TFNamespace.in(p.roomId).disconnectSockets();
                    } else {
                        // Si c'est un joueur qui se déconnecte, continuer le jeu sans lui
                        console.log(`Bye bye player ${p.username}`);
                        
                        if (p.player) {
                            // Retirer le joueur de la liste
                            r.players = r.players.filter((player) => player.username !== p.username);
                            
                            // Si le joueur qui se déconnecte était en train de buzzer
                            if (r.state.buzzed) {
                                // Vérifier si c'est le joueur qui avait buzzé
                                const buzzedPlayer = r.players.find(pl => pl.timer <= r.options.time_start);
                                if (!buzzedPlayer) {
                                    // Le joueur qui avait buzzé s'est déconnecté, relancer le timer pour tous
                                    clearInterval(countdowns[r.id]);
                                    r.state.buzzed = false;
                                    r.state.free = true;
                                    r.state.time_counter = 0;
                                    TFNamespace.to(p.roomId).emit("liberer", r);
                                    countdowns[r.id] = setInterval(() => {updateCountdown(r, r.players)}, 1000);
                                }
                            }
                            
                            // Notifier les autres joueurs
                            TFNamespace.to(p.roomId).emit("remove player", r);
                            console.log(`[TF ${r.id}] Player ${p.username} removed, game continues with ${r.players.length} players`);
                            
                            // Si plus aucun joueur, arrêter le jeu
                            if (r.players.length === 0) {
                                clearInterval(countdowns[r.id]);
                                r.state.start = false;
                                r.state.free = false;
                                console.log(`[TF ${r.id}] No more players, game stopped`);
                            }
                        } else {
                            // Spectateur
                            r.spectateurs = r.spectateurs.filter((player) => player.username !== p.username);
                            TFNamespace.to(p.roomId).emit("remove spectateur", r, p);
                        }
                    }
                }
            } catch (error) {
                console.error("Il y a eu un pb dans TF disconnect : "+error);
            }
        });


        socket.on("kick", (socketId) => {
            try {
                if (p && p.host&&!r.state.start) {
                    var bool = false;
                    if (p.host && !r.state.start) {
                        console.log(`[TF ${r.id}] kick ${socketId}`);
                        bool = true;
                        TFNamespace.in(socketId).emit("error", "Vous avez été kické de la partie")
                        TFNamespace.in(socketId).disconnectSockets();
                    }
                    if (bool) {
                        TFNamespace.to(socket.id).emit("kick-success");
                    }
            }
            } catch (error) {
                console.error("Il y a eu un pb dans TF kick : "+error);
                TFNamespace.to(p.roomId).emit("TF alert","Erreur pour kick un joueur")
            }
 
        });



    });

    return router;
}
