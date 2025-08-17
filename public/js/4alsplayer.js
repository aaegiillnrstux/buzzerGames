// jshint esversion:6
var myplayer = {
    host: false,
    roomId: null,
    username: "",
    socketId: "",
    points:0,
};

var currentRoom;

var ding = new Audio('/components/Ding.mp3');
ding.preload = 'auto';
var start = new Audio('/components/start_of_4als.mp3');
start.preload = 'auto';
var timesup = new Audio('/components/times-up.mp3');
timesup.preload = 'auto';
var QALS = new Audio('/components/4ALS.mp3');
QALS.preload = 'auto';

const socket = io();

$("#form-pseudo").on('submit', function (e){
    e.preventDefault();
    myplayer.username= $('#username').val();
    myplayer.roomId=parseInt($("#code").val());
    myplayer.socketId=socket.id;

    $("#user-card").hide("slow");
    $("#user-card").empty();
    $('#app-div').show("slow");
    

    socket.emit("4ALSplayerData",myplayer);
});

socket.on("4ALS player init",(room,p)=>{
    myplayer=p;
    room.players.forEach((player)=>{
        if (player.host){
            $('#player-list').append(`<li class="list-group-item" id="${player.username}" >${player.username} (Host) </li>`);
        }
        else{
            $('#player-list').append(`<li class="list-group-item" id="${player.username}" >${player.username} <div class="score"><button type="button" id="${player.username}-score" class="btn btn-success score-point edit">${p.points}</button></div></li>`);
        }
    });
    currentRoom=room;
    
});

socket.on("4ALS remove player",(player)=>{
    console.log(`Bye bye ${player.username}`);
    $(`#${player.username}`).remove();
});

socket.on("4ALS new player",(player)=>{
    $('#player-list').append(`<li class="list-group-item" id="${player.username}" >${player.username} <div class="score"><button type="button" id="${player.username}-score" class="btn btn-success score-point edit">${player.points}</button></div></li>`);
});
socket.on("4ALS update score",(p)=>{
    updateScore(currentRoom,p)
});

socket.on("4ALS current player",(r)=>{
    currentplayer=currentRoom.state.currentPlayer;
    if (currentplayer!=null){
        $(`#${currentplayer}`).css('background-color','white');
    }
    if (r.state.currentPlayer){
        $(`#${r.state.currentPlayer}`).css('background-color','orange');
    }
    currentRoom=r;
});

socket.on("4ALS start",(r)=>{
    currentRoom=r;
    start.play();
    for (let i=0;i<5;i++){
        changeCouleurInterieur(i,false);
        changeCouleurExterieur(i,false);
    }
    changeCouleurExterieur(0,true);
    changeCouleurInterieur(0,true);
});

socket.on("4ALS answer",(bool,state)=>{
    if (state.start){
        
        if (bool){
            changeCouleurInterieur(state.score,true);
            if (state.maxScore>currentRoom.state.maxScore){
                changeCouleurExterieur(state.maxScore-1,false);
                changeCouleurExterieur(state.maxScore,true);
            }
            if (state.score!=4){
                ding.play();
            }
        }
        else{
            for (let i=1;i<5;i++){
                changeCouleurInterieur(i,false);
            }
        }
        currentRoom.state=state;
    }
});

socket.on("4ALS end",(r,player)=>{
    console.log("END",r,player);
    if (r.state.maxScore != 4){
        for (let i=0;i<5;i++){
            changeCouleurInterieur(i,false);
        }
        timesup.play();
    }
    else {
        QALS.play();

    }  
    updateScore(r,player);
})

socket.on("4ALS time",(time)=>{
    currentRoom.options.time=time;
});

socket.on("4ALS update score",(player,room)=>{
    currentRoom=room;
    $(`#${player.username}-score`).text(player.points);
});

document.addEventListener('visibilitychange', () => {
  const state = document.hidden ? 'hidden' : 'visible';
  socket.emit('4ALS playerVisibility', {
    username: player.username,
    state,           // 'hidden' ou 'visible'
    at: Date.now()
  });
});

window.addEventListener('blur', () => {
  socket.emit('4ALS playerBlur', {
    username: player.username,
    state: 'blur',
    at: Date.now()
  });
});

window.addEventListener('focus', () => {
  socket.emit('4ALS playerFocus', {
    username: player.username,
    state: 'focus',
    at: Date.now()
  });
});

socket.on("disconnect",()=>{
    alert("L'hôte s'est déconnecté");
    document.location.href="/";
});

socket.on("4ALSerror",(err)=>{
    alert(err);
    document.location.href="/";
});

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

function updateScore(r,p){
    currentRoom=r;
    $(`#${p.username}-score`).text(p.points);
}