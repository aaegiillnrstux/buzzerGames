// jshint esversion:6
var myplayer = {
    host: true,
    roomId: null,
    player: true,
    username: "",
    socketId: "",
    points:0,
};
const exterieurMatrices = ["matrix(0.024755, 0.999694, -1.000075, 0.009348, 329.05073, 100.564487)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 327.700571, 26.306825)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 325.900431, -47.950544)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 324.457346, -122.505451)"];
const interieurMatrices =  ["matrix(0.024755, 0.999694, -1.000075, 0.009348, 329.950785, 100.864505)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 327.700571, 26.606885)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 326.800516, -48.100683)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 325.26359, -122.495312)"];
const textMatrices = ["matrix(2.541135, 0, 0, 1.978724, -341.147898, 151.203053)","matrix(2.541135, 0, 0, 1.978724, -348.952189, 76.573061)","matrix(2.541135, 0, 0, 1.978724, -349.005961, 3.215738)","matrix(2.541135, 0, 0, 1.978724, -351.706218, -73.291895)"];
const socket = io("/faf");

lowLag.init();
lowLag.load('/components/Ding.mp3');
lowLag.load('/components/times-up.mp3');
lowLag.load('/components/buzzsound.mp3');


var currentRoom;
var currentPlayer;
var roundTime=20;
var period=100;
var step=10*period/roundTime;
var countdownInterval;
var boite=4;
var buzzedPlayer=null;


$("#form-pseudo").on('submit', function (e){
    e.preventDefault();
    myplayer.username= $('#username').val();
    myplayer.roomId=$("#code").val();
    myplayer.socketId=socket.id;

    $("#user-card").hide("slow");
    $("#user-card").empty();
    $('#app-div').show("slow");
    $('#settings-button').show("slow");
    $('#settings-button').on("click", (e)=>{
        if ($('#settings').is(':visible')){
            $('#settings').hide("slow");
        }
        else{
            $('#settings').show("slow");
        }
    });

    socket.emit("FAFplayerDataHost",myplayer);
});

$('#Start').on('click',(e)=>{
    if (currentRoom.players.length<2){
        alert("Il faut au moins deux joueurs pour commencer");
        return;
    }
    if (currentRoom.state.start){
        alert("La partie a déjà commencé");
        return;
    }
    if (currentRoom.state.main==null){
        alert("Aucun joueur n'a encore la main");
        return;
    }
    $('#Start').hide("slow");
    $('#settings-button').hide("slow");
    socket.emit("FAF start");
    

});

$('#faf-time-button').on('click',(e)=>{
    roundTime=$('#faf-time').val();
    socket.emit("FAF time",roundTime);
});

$('#faf-whitelist-button').on('click',(e)=>{
    if ($("#faf-whitelistCheckbox").is(":checked")){
        socket.emit("FAF whitelist",true,$('#faf-whitelist').val());
    }
    else{
        socket.emit("FAF whitelist",false,"");
    }
    
});

$(function(){
    $(document).keydown(function(e){
        if (currentRoom.state.buzzed){
            if (e.key ==="v" || e.key ===" "){
                vrai();
            }
            if (e.key ==="f" || e.key ==="Delete"){
                faux();
            }

    }});
});

$('#Vrai').on('click',(e)=>{
    vrai();
    
});

$('#Faux').on('click',(e)=>{
    faux();
    
});

function vrai(){
    if (currentRoom&&currentRoom.state.start&&currentRoom.state.buzzed){
        socket.emit("FAF answer",true);
        
    }
    $('#validate-answer').hide();
}

function faux(){
    if (currentRoom&&currentRoom.state.start&&currentRoom.state.buzzed){
        socket.emit("FAF answer",false);
    }
    $('#validate-answer').hide();
}

socket.on('FAF host launch',(player,room)=>{
    myplayer=player;
    currentRoom=room;
});

socket.on('FAF new spectateur',(room,spectateur)=>{
    currentRoom=room;
    $('#spectateurs-list').append(`<li class="list-group-item" id="spectateur-${spectateur.username}">${spectateur.username} <div class="btn-group btn-group-sm" role="group"> <button type="button" id="${spectateur.socketId}-kick" class="btn btn-secondary kick">kick</button> </div> </span></li>`);
    $(document).on('click',`#${spectateur.socketId}-kick`,(e)=>{
        e.preventDefault();
        console.log('kick');
        socket.emit("FAF kick",spectateur.socketId);
    });
});

socket.on("FAF new player",(room,player)=>{
    console.log("new player : "+JSON.stringify(player));
    currentRoom=room;
    var i=1;
    if (1<=room.players.length<=2){
        room.players.forEach((player)=>{
            addPlayer(player,i);
            i++;
        });
    }
    
});

socket.on("FAF current player",async (room)=>{
    currentRoom=room;
    if (currentPlayer!=null){
        $(`#joueur-${currentPlayer}`).css('background-color','whitesmoke');
    }
    currentPlayer=room.players[room.state.main].username;
    if (room.players[0].username==currentPlayer){
        moveBoites(true);
    }
    else {
        moveBoites(false);
    }
    $(`#joueur-${currentPlayer}`).css('background-color','orange');
    $('#Start').show("slow");
});

socket.on("FAF remove player",(room)=>{
    currentRoom=room;
    if (room.players.length==0 || room.players.length==1){
        i=1;
        room.players.forEach((player)=>{
            addPlayer(player,i);
            i++;
        });
        while (i<=2){
            $(`#joueur${i}-name`).text(`Joueur ${i}`);
            $(`#joueur${i}-score-div`).html("");
            i++;
        }
    }
    else {
        alert("Inconsistence du nombre de joueur: "+ JSON.stringify(room));
        document.location.href="/";
    }
})

socket.on("FAF remove spectateur",(room,player)=>{
    currentRoom=room;
    $(`#${player.username}`).remove();
});

socket.on("FAF time", (room) => {
    currentRoom=room;
    modalUpdate("Le temps a été changé");
});


socket.on("FAF start", (room) => {
    for (var i=1;i<=4;i++){
        changeCouleurInterieur(i,100);
        changeCouleurExterieur(i,100);
    }
    step=10*period/roundTime;
    countdownInterval=setInterval(updateCountdown,period);
    currentRoom=room;
});

socket.on("FAF buzzed", (room,player)=>{
    console.log("buzzed")
    buzzedPlayer=player;
    currentRoom=room;
    lowLag.play('/components/buzzsound.mp3');
    clearInterval(countdownInterval);
    $('#validate-answer').show();

})

socket.on("FAF switch", async (room)=>{
    for (let element of currentRoom.state.pointsRule[currentRoom.state.mainInGame][0]) {
        await moveBoite(element,currentRoom.state.mainInGame==0,room.state.start);
    }
    currentRoom=room;
    $('#validate-answer').hide();

    $(`#joueur-${room.players[room.state.mainInGame].username}`).css('background-color','orange');
    $(`#joueur-${room.players[1-room.state.mainInGame].username}`).css('background-color','whitesmoke');
    countdownInterval=setInterval(updateCountdown,period);
    socket.emit("FAF restart");
});

socket.on("FAF main", (room)=>{
    currentRoom=room;
    console.log("changement de couleur");
    $(`#joueur-${room.players[room.state.mainInGame].username}`).css('background-color','orange');
    $(`#joueur-${room.players[1-room.state.mainInGame].username}`).css('background-color','whitesmoke');
})

socket.on("FAF end", (bool,room) => {
    currentRoom=room;
    $(`#joueur-${room.players[0].username}`).css('background-color','whitesmoke');
    $(`#joueur-${room.players[1].username}`).css('background-color','whitesmoke');
    currentPlayer=null;
    $('#Start').show("slow");
    $('#settings-button').show("slow");
    boite=4;
    if (!bool){
        lowLag.play('/components/times-up.mp3');
    }
    else {
        lowLag.play('/components/Ding.mp3');
    }
});
    
socket.on("FAF update score",(player,room)=>{
    currentRoom=room;
    $(`#${player.username}-score`).text(player.points);
});


socket.on("disconnect",()=>{
    alert("L'hôte s'est déconnecté");
    document.location.href="/";
});

socket.on("FAF error",(err)=>{
    alert(err);
    document.location.href="/";
});
socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
});

socket.on("kick-success",(room)=>{
    currentRoom=room;
    modalUpdate("Le joueur a bien été kické");
});

socket.on("FAF whitelist",(room)=>{
    currentRoom=room;
    modalUpdate("La whitelist a bien été modifiée");
});

socket.on("FAF alert",(message)=>{
    alert(message);
});

function addPlayer(player,i){
    $(`#joueur${i}-name`).data("username",player.username);
    $(`#joueur${i}-name`).html(`<h3 id="joueur-${player.username}">${player.username}</h3> <button type="button" id="${player.socketId}-kick" class="btn btn-secondary kick">kick</button>`);
    $(`#joueur-${player.username}`).data("place",i);
    $(`#joueur${i}-score-div`).html(`<button type="button" id="${player.username}-score" class="btn btn-success score-point edit" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
    $(document).off('click', `#${player.username}-score`);
    $(document).on('click',`#${player.username}-score`,(e)=>{
        e.preventDefault();
        console.log('score '+player.username);
        $('#pseudo-modal').text(`${player.username}`);
        $('#modal-score-label').text("Donnez le nombre de points à ajouter ou à enlever (mettre un - ) :");
        $('#btn-validate').attr("data-username", `${player.username}`);
        $('#btn-validate').off('click');
        $('#btn-validate').on('click',(e)=>{
            validerPoints(e.target);
        });
    });
    $(document).off('click', `#${player.username}-kick`);
    $(document).on('click',`#${player.socketId}-kick`,(e)=>{
        if (!currentRoom.state.start){
            e.preventDefault();
            console.log('kick');
            socket.emit("FAF kick",player.socketId);
        }
    });
    $(document).off('click', `#joueur-${player.username}`);
    $(document).on('click',`#joueur-${player.username}`,(e)=>{
        if (!currentRoom.state.start&&currentRoom.state.main!=player.username){
            socket.emit("FAF current player",player.username,i-1);
        }
    });
}

function changeCouleurInterieur(n, percent){
    $(`#grad-interieur-${n}-orange`).attr('offset', `${percent}%`);
    $(`#grad-interieur-${n}-blue`).attr('offset', `${percent}%`);
}

function changeCouleurExterieur(n,bool){
    if (!bool){
        $(`#exterieur-${n}`).css('fill','rgb(216, 216, 216)');
    }
    else
        $(`#exterieur-${n}`).css('fill','darkorange');
}

function updateCountdown(){
    updateColor(boite);
    if ($(`#grad-interieur-${boite}-orange`).attr('offset')=="0%"&&$(`#grad-interieur-${boite}-blue`).attr('offset')=="0%"){
        if (boite==1){
            boite=4;
            clearInterval(countdownInterval);
            socket.emit("FAF end");
        }
        else{
            boite--;
            changeCouleurExterieur(boite+1,false);
            socket.emit("FAF main",boite);
        }
    }
}

function updateColor(n){
    if ($(`#grad-interieur-${n}-orange`).attr('offset')=="100%"&&$(`#grad-interieur-${n}-blue`).attr('offset')=="100%"){
        var newPercent = Math.max(0, extractNumberFromPercent($(`#grad-interieur-${n}-orange`).attr('offset')) - step / (n*10));
        $(`#grad-interieur-${n}-orange`).attr('offset',`${newPercent}%`);
        return
    }
    else if ($(`#grad-interieur-${n}-blue`).attr('offset')!="0%"){
        var newPercentOrange = Math.max(0, extractNumberFromPercent($(`#grad-interieur-${n}-orange`).attr('offset')) - step / (n*10));
        var newPercentBlue = Math.max(0, extractNumberFromPercent($(`#grad-interieur-${n}-blue`).attr('offset')) - step / (n*10));
        $(`#grad-interieur-${n}-orange`).attr('offset',`${newPercentOrange}%`);
        $(`#grad-interieur-${n}-blue`).attr('offset',`${newPercentBlue}%`);
        return
    }
}

function extractNumberFromPercent(percent){
    return parseFloat(percent.substring(0,percent.length-1));
}

function validerPoints(target){
    $('#btn-validate').off('click');
    socket.emit("FAF change points",target.dataset.username,$("#score-input").val());
}

const moveX=25;
const pas=100;
const temps=500;
async function moveBoite(n,main,start){
    if (!start){
        if (!main){
            for (var i=0;i<=pas;i++){
                $(`#interieur-${n}`).attr('transform',`${interieurMatrices[n-1]} translate(0,${moveX*i/pas}) `);
                $(`#exterieur-${n}`).attr('transform',`${exterieurMatrices[n-1]} translate(0,${moveX*i/pas})`);
                $(`#text-${n}`).attr('transform',`${textMatrices[n-1]} translate(-${moveX*i/(pas*2.5)},0)`);
                await sleep(temps/pas);
            }
        }else {
            for (var i=0;i<=pas;i++){
                $(`#interieur-${n}`).attr('transform',`${interieurMatrices[n-1]} translate(0,-${moveX*i/pas}) `);	
                $(`#exterieur-${n}`).attr('transform',`${exterieurMatrices[n-1]} translate(0,-${moveX*i/pas})`);
                $(`#text-${n}`).attr('transform',`${textMatrices[n-1]} translate(${moveX*i/(pas*2.5)},0)`);
                await sleep(temps/pas);
            }
        }
    }
    else {
        if (!main){
            for (var i=0;i<=pas;i++){
                $(`#interieur-${n}`).attr('transform',`${interieurMatrices[n-1]} translate(0,-${moveX*(pas-i)/pas}) `);
                $(`#exterieur-${n}`).attr('transform',`${exterieurMatrices[n-1]} translate(0,-${moveX*(pas-i)/pas})`);
                $(`#text-${n}`).attr('transform',`${textMatrices[n-1]} translate(${moveX*(pas-i)/(pas*2.5)},0)`);
                
                await sleep(temps/pas);
            }
            await moveBoite(n,main,false)
        }else {
            for (var i=0;i<=pas;i++){
                $(`#interieur-${n}`).attr('transform',`${interieurMatrices[n-1]} translate(0,${moveX*(pas-i)/pas}) `);	
                $(`#exterieur-${n}`).attr('transform',`${exterieurMatrices[n-1]} translate(0,${moveX*(pas-i)/pas})`);
                $(`#text-${n}`).attr('transform',`${textMatrices[n-1]} translate(-${moveX*(pas-i)/(pas*2.5)},0)`);
                
                await sleep(temps/pas);
            }
            await moveBoite(n,main,false)
        }
    }
}

function moveBoites(bool){
    for (var i=1;i<=4;i++){
        moveBoite(i,bool^(i%2==0),currentRoom.state.start);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

function modalUpdate(message){
    $("#success-alert").html(`<strong>${message} </strong>`);
    $("#success-alert").fadeTo(2000, 500).slideUp(500, function(){
        $("#success-alert").slideUp(500);
    });
}

