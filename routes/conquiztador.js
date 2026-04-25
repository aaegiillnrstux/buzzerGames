// jshint esversion:6
import express from 'express';
import xss from 'xss';
import { adminAuth, isConnected, isAdmin, getUser } from '../API/connectivity.js';
import cookieParser from 'cookie-parser';


export default function (io) {
    const ConquiztadorNS = io.of("/conquiztador");

    const router = express.Router();
    router.use(cookieParser());

    var rooms = [];
    var listeCodes = [];

    router.get('/', (req, res) => {
        res.render('conquiztador/conquiztadorHome');
    });

    router.post('/', (req, res) => {
        const infos = req.body;
        let roomID = 0;
        if (infos.action == "host") {
            isAdmin(req, res, (isAdminRes) => {
                if (isAdminRes) {

                    roomID = Math.floor(Math.random() * 899999) + 100000;
                    listeCodes.push(parseInt(roomID));
                    console.log("[Hosting] room " + roomID);
                    res.redirect('/apps/bunka/' + roomID);
                }
                else{
                    res.status(403).render('home', { titre: "Accès refusé", root: "../../", title: "Erreur",connected:isAdminRes });
                }
            });
        }
        else if (infos.action == 'join') {
            res.redirect('/apps/bunka/' + infos.code);
        }
    });

    router.get('/:code', (req, res) => {
        const code = parseInt(req.params.code);
        const room = rooms.find((room) => { return code === room.id; });
        console.log("[Joining conquiztador] " + code );

        console.log(listeCodes);
        if (listeCodes.includes(code) && !room) {
            res.status(200).render('conquiztador/host', { code: code, players: [] });
        }
        else if (listeCodes.includes(code) && room) {
            res.status(200).render('conquiztador/player', { code: code, players: [] });
        }
        else {
            isConnected(req, res, (connected,role) => {
                res.status(404).render('home', { titre: "Pas de salles associées", root: "../../", title: "Erreur",connected:connected });
            });
        }

    });

    ConquiztadorNS.on('connection', (socket) => {
        var p;
        var r;
        console.log(`[Connection] ${socket.id}`);

        socket.once('Conquiz playerDataHost', (player,themesList,barLength) => {
            console.log("Receiving playerDataHost in Conquiz");
            if (!/^[a-z0-9]+$/i.test(player.username)) {
                socket.disconnect();
            }
            else if (!rooms.find((room) => { return player.roomId === room.id; })) {
                player.username = xss(player.username);
                player.host = true;
                player.roomId = parseInt(player.roomId);
                player.points = 0;
                player.player = true;
                p = player;
                r = { players: [], spectateurs: [], id: player.roomId, state: { manche: 1, buzzed: false, block: false, currentPointsManche2: 0, main:null,themesList:themesList,questionid:null,question:null,usedBlocks:[],finaleQuestions:null},options:{roundTime:10,whitelistEnabled:false,whitelist:[],couleurs:["#162d94","#ffa500"],barLength:parseInt(barLength)||18} };
                rooms.push(r);
                socket.join(p.roomId);
                console.log(`[Hosting Conquiz] ${p.username} host la room ` + p.roomId);
                ConquiztadorNS.to(socket.id).emit('Conquiz host launch', p,r);
            }

        });
            

        socket.on('Conquiz playerData', (player) => {
            console.log("Receiving playerData in Conquiz: "+JSON.stringify(player));
            if (!/^[a-z0-9]+$/i.test(player.username)) {
                ConquiztadorNS.in(player.socketId).emit("Conquiz error", "Choississez un pseudo qu'avec des caractères alphanumériques (et sans espaces ! =p)");
                
            }
            else if (!player.roomId) {
                ConquiztadorNS.in(player.socketId).emit("Conquiz error", "Vous n'avez pas de code de room");
            }
            else if (!listeCodes.includes(parseInt(player.roomId))) {
                ConquiztadorNS.in(player.socketId).emit("Conquiz error", "Ce code n'existe pas");
            }
            else {
                r = rooms.find((room) => { return player.roomId === room.id; })
                if (!r){
                    ConquiztadorNS.in(player.socketId).emit("Conquiz error", "Cette room n'existe pas");
                }
                else if ( r.players.find((player) => { return player.socketId === socket.id; })) {
                    ConquiztadorNS.in(player.socketId).emit("Conquiz error", "Player déjà présent dans la room");
                }
                else {
                    console.log(`[Joining Conquiz] ${player.username} join la room ` + player.roomId);
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
                        if (r.players.length>=2 || (r.options.whitelistEnabled && !r.options.whitelist.includes(player.username))){
                            player.player = false;
                            r.spectateurs.push(p);
                            socket.join(p.roomId);
                            ConquiztadorNS.to(p.roomId).emit('Conquiz new spectateur', r,p);
                            ConquiztadorNS.to(socket.id).emit("Conquiz spectateur init", r, p);
                    }
                        else{
                            player.player = true;
                            r.players.push(player);
                            ConquiztadorNS.to(p.roomId).emit("Conquiz new player", r, p);
                            socket.join(p.roomId);
                            ConquiztadorNS.to(socket.id).emit("Conquiz player init", r, p);
                        }
                    }
                }
                console.log("Room :"+JSON.stringify(r));
        }
        });

        socket.on("Conquiz whitelist",(bool,whitelist)=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] whitelist : `+bool);
                r.options.whitelistEnabled=bool;
                if (bool){
                    if (/^[A-Za-z0-9\s;]+$/.test(whitelist)){
                        r.options.whitelist=whitelist.split(";");
                    }
                    else{
                        socket.emit("Conquiz alert","La whitelist n'est pas valide");
                    }
                }
                ConquiztadorNS.to(p.roomId).emit("Conquiz whitelist", r);
            }
        });

        socket.on("Conquiz kick", (socketId) => {
            if (p && p.host&&!r.state.start) {
                var bool = false;
                if (p.host && !r.state.start) {
                    console.log(`[Conquiz ${r.id}] kick ${socketId}`);
                    bool = true;
                    ConquiztadorNS.in(socketId).emit("error", "Vous avez été kické de la partie")
                    ConquiztadorNS.in(socketId).disconnectSockets();
                }
                if (bool) {
                    ConquiztadorNS.to(socket.id).emit("kick-success");
                }
        }
        });

        socket.on("Conquiz theme",()=>{
            if (p && p.host) {
                ConquiztadorNS.to(p.roomId).emit("Conquiz theme");
            }
        })

        socket.on("Conquiz suspense",()=>{
            if (p && p.host) {
                ConquiztadorNS.to(p.roomId).emit("Conquiz suspense");
            }
        });

        socket.on("Conquiz estimation",(question)=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] estimation : `+question);
                r.players.forEach((player)=>
                    ConquiztadorNS.in(player.socketId).emit("Conquiz estimation", question));
                }
        });

        socket.on("Conquiz estimation reponse",(reponse)=>{
            //check if reponse is a number
            if (!isNaN(reponse)){
                ConquiztadorNS.to(p.roomId).emit("Conquiz estimation reponse", reponse,p);
            }

        });

        socket.on("Conquiz estimation validation",(username)=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] estimation validation : `+username);
                r.state.manche=1;
                ConquiztadorNS.to(p.roomId).emit("Conquiz estimation validation",r);
            }
        })

        socket.on("Conquiz couleurs",(couleur1,couleur2)=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] couleurs : `+couleur1+" "+couleur2);
                r.options.couleurs[0]=couleur1;
                r.options.couleurs[1]=couleur2;
                ConquiztadorNS.to(p.roomId).emit("Conquiz couleurs", r);
            }
        });

        socket.on("Conquiz current player", (player,rang) => {
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] ${player} a la main `);
                r.state.main=rang;
                ConquiztadorNS.to(p.roomId).emit("Conquiz current player", r);
            }
        });

        socket.on("Conquiz question", (question,id,points) => {
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] ${question.question}`);
                r.state.questionid=id;
                r.state.question=question;
                ConquiztadorNS.to(p.roomId).emit("Conquiz question",r,question,points);
            }
        });

        socket.on("Conquiz question manche2", (question)=> {
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] ${question}`);
                r.state.question=question;
                ConquiztadorNS.to(p.roomId).emit("Conquiz question manche2",r,question);
            }
        });

        socket.on("Conquiz reponses manche2", (reponse, bool_reponse)=> {
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] reponse manche2 : ${reponse} (${bool_reponse})`);
                ConquiztadorNS.to(p.roomId).emit("Conquiz reponses manche2",reponse,bool_reponse);
            }
        });

        socket.on("Conquiz answer",(bool,points)=>{
            if (p && p.host && points) {
                if (bool){
                    ConquiztadorNS.to(p.roomId).emit("Conquiz son",true);
                }
                else{
                    ConquiztadorNS.to(p.roomId).emit("Conquiz son",false);
                }
                console.log(`[Conquiz ${r.id}] answer is ${bool} for ${r.players[r.state.main].username}`);
                r.state.usedBlocks.push([r.state.questionid,bool]);
                r.state.question=null;
                r.state.questionid=null;
                ConquiztadorNS.to(p.roomId).emit("Conquiz remove question",bool,r);
                if (bool){
                    updateScore(points,r.state.main);
                }
                r.state.main=1-r.state.main;
                ConquiztadorNS.to(p.roomId).emit("Conquiz current player", r);
                
            }
        });

        socket.on("Conquiz update score",(rang,points)=>{
            if (p && p.host && points.match(/^-?[0-9]+$/)!=null) {
                updateScore(points,rang);
                if (r.players[0].points==18 || r.players[1].points==18){
                    ConquiztadorNS.to(p.roomId).emit("Conquiz end");
                }
                else if (points>0){
                    ConquiztadorNS.to(p.roomId).emit("Conquiz son",true);
                }
                else{
                    ConquiztadorNS.to(p.roomId).emit("Conquiz son",false);
                }
            }
            
        });

        socket.on("Conquiz start finale",()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] start finale`);
                r.state.manche=3;
                ConquiztadorNS.to(p.roomId).emit("Conquiz start finale",r);
            }});

        socket.on("Conquiz start manche2",()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] start manche2`);
                r.state.manche=2;
                ConquiztadorNS.to(p.roomId).emit("Conquiz start manche2",r);
            }});
        socket.on("Conquiz start manche1",()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] start manche1`);
                r.state.manche=1;
                ConquiztadorNS.to(p.roomId).emit("Conquiz start manche1",r);
            }});

        socket.on("Conquiz finale questions",(finaleQuestions)=>{
            if (p && p.host && validateArray(finaleQuestions)) {
                console.log(`[Conquiz ${r.id}] Questions finales`);
                r.state.finaleQuestions=finaleQuestions;
                ConquiztadorNS.to(p.roomId).emit("Conquiz finale questions",r);
            }});

        socket.on("Conquiz launch finale",()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] launch finale`);
                ConquiztadorNS.to(p.roomId).emit("Conquiz launch finale",r);
            }});
        
        socket.on("Conquiz block finale", ()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] block finale`);
                r.state.block=true;
                ConquiztadorNS.to(p.roomId).emit("Conquiz block finale",r);
            }});
        
        socket.on("Conquiz unblock finale", ()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] unblock finale`);
                r.state.block=false;
                ConquiztadorNS.to(p.roomId).emit("Conquiz unblock finale",r);
            }});

        socket.on("Conquiz finale answer", (nb)=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] finale answer ${nb}`);
                ConquiztadorNS.to(p.roomId).emit("Conquiz finale answer",nb);
            }});
            
        socket.on("Conquiz finale unanswer", (nb)=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] finale unanswer ${nb}`);
                ConquiztadorNS.to(p.roomId).emit("Conquiz finale unanswer",nb);
            }});
        
        socket.on("Conquiz finale suspense", ()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] finale suspens`);
                ConquiztadorNS.to(p.roomId).emit("Conquiz finale suspense");
            }});
    
        socket.on("Conquiz libere",()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] libere`);
                r.state.buzzed=false;
                ConquiztadorNS.to(p.roomId).emit("Conquiz libere",r);
            }});

        socket.on("Conquiz buzzed",(username)=>{
            if (!r.state.buzzed && p.player){
                r.state.buzzed=true;
                console.log(`[Conquiz ${r.id}] buzzed`);
                var rang;
                if (r.players[0].username==username){
                    rang=1
                }
                else{
                    rang=2
                }
                ConquiztadorNS.to(p.roomId).emit("Conquiz buzzed",r,rang);
            }});

        socket.on("Conquiz block",()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] block`);
                ConquiztadorNS.to(p.roomId).emit("Conquiz block",r);
            }}
        );
        
        socket.on("Conquiz remove current player",()=>{
            if (p && p.host) {
                console.log(`[Conquiz ${r.id}] remove current player`);
                r.state.main=null;
                ConquiztadorNS.to(p.roomId).emit("Conquiz remove current player", r);
            }});

        socket.on("Conquiz update currentPoints",(currentPoints)=>{
            if (p && p.host) {
                r.state.currentPointsManche2=currentPoints;
                ConquiztadorNS.to(p.roomId).emit("Conquiz update currentPoints",currentPoints);
            }
        })

        socket.on("disconnect", () => {
            console.log(`[Conquiz] ${socket.id} disconnected`);
            if (p && !p.host) {
                console.log(`Bye bye ${p.username}`);
                if (p.player){
                    if (r) {
                        r.players = r.players.filter((player) => player.username !== p.username);
                    }
                    ConquiztadorNS.to(p.roomId).emit("Conquiz remove player", r);
                }
                else{
                    
                    if (r) {
                        r.spectateurs = r.spectateurs.filter((player) => player.username !== p.username);
                        console.log(r.spectateurs);
                    }
                    ConquiztadorNS.to(p.roomId).emit("Conquiz remove spectateur", r,p);
                }

            }
            else if (p && p.host) {
                console.log(`Bye bye host ${p.username}`);
                ConquiztadorNS.in(p.roomId).disconnectSockets();
                rooms = rooms.filter((room) => room.id !== p.roomId);
                listeCodes = listeCodes.filter((code) => code !== p.roomId);
            }
        });
        
        function updateScore(point,rang){
            if (p && p.host && r.players[rang] && r.players[1-rang]) {
                console.log(`[Conquiz ${r.id}] update score`);
                r.players[rang].points+=parseInt(point);
                if (r.players[rang].points+r.players[1-rang].points>r.options.barLength){
                    r.players[1-rang].points = r.options.barLength-r.players[rang].points;
                }
                if (r.players[rang].points<0){
                    r.players[1-rang].points-=r.players[rang].points;
                    r.players[rang].points=0;
                }
                if (r.players[1-rang].points<0){
                    r.players[rang].points-=r.players[1-rang].points;
                    r.players[1-rang].points=0;
                }
                if (r.players[rang].points>r.options.barLength){
                    r.players[rang].points=r.options.barLength;
                }
                console.log(`[Conquiz ${r.id}] ${r.players[rang].username} a maintenant ${r.players[rang].points} points`);
                ConquiztadorNS.to(p.roomId).emit("Conquiz update score",r.players[rang],r);
                ConquiztadorNS.to(p.roomId).emit("Conquiz update score",r.players[1-rang],r);
            }
        }

        function validateArray(arr) {
            if (arr.length !== 10) {
              return false;
            }
          
            for (let i = 0; i < arr.length; i++) {
              const element = arr[i];
              if (typeof element !== 'object' || !('question' in element) || !('answer' in element)) {
                return false;
              }
            }
          
            return true;
          }
});

    return router;
}
