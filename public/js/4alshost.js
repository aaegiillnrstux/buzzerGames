// jshint esversion:6
var myplayer = {
    host: true,
    roomId: null,
    username: "",
    socketId: "",
};

const socket = io();

var currentRoom;
var roundTime=45;
var countdownInterval;
var currentplayer;

var ding = new Audio('/components/Ding.mp3');
ding.preload = 'auto';
var start = new Audio('/components/start_of_4als.mp3');
start.preload = 'auto';
var timesup = new Audio('/components/times-up.mp3');
timesup.preload = 'auto';
var QALS = new Audio('/components/4ALS.mp3');
QALS.preload = 'auto';

$(function(){
    $(document).keydown(function(e){
            if (e.key ==="v" || e.key ===" "){
                vrai();
            }
            if (e.key ==="f" || e.key ==="Delete"){
                faux();
            }

    });
});


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

    socket.emit("4ALSplayerDataHost",myplayer);
});

$('#Start').on('click',(e)=>{
    $('#Start').hide("slow");
    $('#settings-button').hide("slow");
    $('#countdown').text(roundTime);
    socket.emit("4ALS start");
    countdownInterval=setInterval(updateCountdown,1000);
});

$('#Vrai').on('click',(e)=>{
    vrai();
});

$('#Faux').on('click',(e)=>{
    faux();
});

$('#4als-time-button').on('click',(e)=>{
    roundTime=$('#4als-time').val();
    $('#countdown').text(roundTime);
    socket.emit("4ALS time",roundTime);
});

socket.on('4ALS host launch',(player,room)=>{
    $('#player-list').append(`<li class="list-group-item">${player.username} (Host) </li>`);
    myplayer=player;
    currentRoom=room;
});

socket.on("4ALS new player",(player)=>{
    $('#player-list').append(`<li class="list-group-item" id="${player.username}">${player.username} <div class="btn-group btn-group-sm" role="group"> <button type="button" id="${player.socketId}-kick" class="btn btn-secondary kick">kick</button></div><div class="score"> <button type="button" id="${player.username}-score" class="btn btn-success score-point edit" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button> </div> </span></li>`);
    $(document).on('click',`#${player.socketId}-kick`,(e)=>{
        e.stopPropagation();
        e.preventDefault();
        if (!currentRoom.state.start){
            e.preventDefault();
            console.log('kick');
            if (currentplayer && currentplayer===player.username){
                socket.emit("4ALS current player",null);
            }
            $('#countdown').hide("slow");
            $('#Start').hide("slow");
            $('#settings-button').show("slow");

            socket.emit("4ALSkick",player.socketId);
        }
    });
    $(document).on('click',`#${player.username}-score`,(e)=>{
        e.preventDefault();
        e.stopPropagation();
        console.log('score '+player.username);
        $('#pseudo-modal').text(`${player.username}`);
        $('#modal-score-label').text("Donnez le nombre de points à ajouter ou à enlever (mettre un - ) :");
        $('#btn-validate').attr("data-username", `${player.username}`);
        $('#btn-validate').on('click',(e)=>{
            validerPoints(e.target);
        });
    });
    $(document).on('click',`#${player.username}`,(e)=>{
        if (!currentRoom.state.start){
            socket.emit("4ALS current player",player.username);
        }
    });
        
});

socket.on("4ALS current player",(r)=>{
    currentplayer=currentRoom.state.currentPlayer;
    if (currentplayer!=null){
        $(`#${currentplayer}`).css('background-color','white');
    }
    if (r.state.currentPlayer!=null){
        console.log(r.state.currentPlayer)
        $(`#${r.state.currentPlayer}`).css('background-color','orange');
        $('#start-timer').show("slow");
        $('#countdown').text(roundTime);
        $('#countdown').show("slow");
        $('#Start').show("slow");
    }
    
    currentRoom=r;
}
);

socket.on("4ALS start", (room) => {
    currentRoom=room;
    
    start.play();
    for (let i=0;i<5;i++){
        changeCouleurInterieur(i,false);
        changeCouleurExterieur(i,false);
    }
    changeCouleurExterieur(0,true);
    changeCouleurInterieur(0,true);
});

socket.on("4ALS end", (room,p)=>{
    currentRoom=room;
    console.log("END",room)
    if (room.state.maxScore != 4){
        for (let i=0;i<5;i++){
            changeCouleurInterieur(i,false);
        }
        timesup.play();
    }
    else {
        
        QALS.play();
        clearInterval(countdownInterval);
        $('#countdown').hide("slow");
        $('#settings-button').show("slow");
    }  
    $(`#${p.username}-score`).text(p.points);
    
})

socket.on("4ALS answer",(bool,state)=>{
    
    if (bool){

        changeCouleurInterieur(state.score,true);
        if (state.maxScore>currentRoom.state.maxScore){
            changeCouleurExterieur(currentRoom.state.maxScore,false);
            changeCouleurExterieur(state.maxScore,true);
        }
        if (state.score==4){
            socket.emit("4ALS end");
        }
        else {
            
            ding.play();
        }
    }
    else{
        for (let i=1;i<5;i++){
            changeCouleurInterieur(i,false);
        }
    }
    currentRoom.state=state;
});

socket.on("4ALS update score",(player,room)=>{
    currentRoom=room;
    $(`#${player.username}-score`).text(player.points);
});




socket.on("4ALS remove player",(player)=>{
    console.log(`Bye bye ${player.username}`);
    $(`#${player.username}`).remove();
});



socket.on("disconnect",()=>{
    alert("L'hôte s'est déconnecté");
    document.location.href="/";
});

socket.on("4ALSerror",(err)=>{
    alert(err);
    document.location.href="/";
});

socket.on("4ALS alert",(err)=>{
    alert(err);
});

function updateCountdown(){
    const time = parseInt($('#countdown').text());
    if (time<=0){
        $('#countdown').hide("slow");
        $('#Start').show("slow");
        $('#settings-button').show("slow");
        socket.emit("4ALS end");
        clearInterval(countdownInterval);
    }
    else {
        $('#countdown').text(time-1);
    }
}

function changeCouleurInterieur(n, bool){
    if (!bool){
        $(`#interieur-${n}`).css('fill','rgb(22, 45, 148)');
    }
    else
        $(`#interieur-${n}`).css('fill','orange');

}

function changeCouleurExterieur(n,bool){
    if (!bool){
        $(`#exterieur-${n}`).css('fill','rgb(216, 216, 216)');
    }
    else
        $(`#exterieur-${n}`).css('fill','darkorange');
}

function validerPoints(target){
    $('#btn-validate').off('click');
    socket.emit("4ALS change points",target.dataset.username,$("#score-input").val());
}

function vrai(){
    if (currentRoom&&currentRoom.state.start){
        socket.emit("4ALS answer",true);
        
    }
}

function faux(){
    if (currentRoom&&currentRoom.state.start){
        socket.emit("4ALS answer",false);
    }
}