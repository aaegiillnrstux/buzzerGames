// jshint esversion:6
var myplayer = {
    host: false,
    roomId: null,
    player: false,
    username: "",
    socketId: "",
    timer:0,
    state:"blocked"
};
var currentRoom;
var countdown;
lowLag.init();
lowLag.load('/components/Ding.mp3');
lowLag.load('/components/times-up.mp3');
lowLag.load('/components/buzzsound.mp3');

const socket = io("/timer_fatal");

$("#form-pseudo").on('submit', function (e){
    e.preventDefault();
    myplayer.username= $('#username').val();
    myplayer.roomId=parseInt($("#code").val());
    myplayer.socketId=socket.id;

    $("#user-card").hide("slow");
    $("#user-card").empty();
    $('#app-div').show("slow");
    

    socket.emit("playerData",myplayer);
});

socket.on("player init",(room,p)=>{
    myplayer=p;
    currentRoom=room;
    nbPlayers=room.players.length;
    var i = 1;
    if (1<=room.players.length<=8){
        room.players.forEach((player)=>{
            addPlayer(player,i);
            i++;
        });
    }
    $("#faf-grid").hide();
    $("#buzzer").show();
});
socket.on("game started", (room)=>{
    currentRoom=room;
    countdown=setInterval(()=>{
        updateCountdown(currentRoom,currentRoom.players);
    }, 1000);
});

function updateCountdown(room,players_selected) {
    if (players_selected.length>0){
        players_selected.forEach((player)=>{
            if (player.timer>0){
                player.timer-=1;
            }
            if (player.timer<=0){
                player.timer=0;
            }
            $(`#${player.username}-timer`).text(convertTime(player.timer));
        });
    }
}


socket.on("new player",(room,player)=>{
    console.log("[TF] new player : "+JSON.stringify(player));
    currentRoom=room;
    var i=1;
    if (1<=room.players.length<=8){
        room.players.forEach((player)=>{
            addPlayer(player,i);
            i++;
        });
    }
});

function addPlayer(player,i){
    $(`#player-name-${i}`).html(`<h3 id="joueur-${player.username}">${player.username}</h3>`);
    $(`#player-timer-${i}`).html(`<button type="button" id="${player.username}-timer" class="btn btn-success score-point edit">${convertTime(player.timer)}</button>`);
}

socket.on("remove player",(room)=>{
    currentRoom=room;
    if (currentRoom.state.start && countdown){
        clearInterval(countdown);
        socket.emit("stop timer");
    }
    var i=1;
    if (1<=room.players.length && room.players.length<=8){
        i=1;
        room.players.forEach((player)=>{
            addPlayer(player,i);
            i++;
        });
        while (i<=8){
            $(`#player-name-${i}`).text(`Joueur ${i}`);
            $(`#player-timer-${i}`).html("");
            i++;
        }
    }
    else {
        alert("Inconsistence du nombre de joueur: "+ JSON.stringify(room));
        document.location.href="/";
    }
})
socket.on("update score",(room)=>{
    currentRoom=room;
    room.players.forEach((player)=>{
        const timerElement = $(`#${player.username}-timer`);
        if (timerElement.length > 0) {
            let last_timer = unconvertTime(timerElement.text());
            if (!isNaN(last_timer)) {
                if (last_timer > player.timer) {
                    $(`#joueur-${player.username}`).css('background-color', 'red');
                    setTimeout(() => {
                        $(`#joueur-${player.username}`).css('background-color', '');
                    }, 500);
                }
                else if (last_timer < player.timer) {
                    $(`#joueur-${player.username}`).css('background-color', 'lightgreen');
                    setTimeout(() => {
                        $(`#joueur-${player.username}`).css('background-color', '');
                    }, 500);
                }
            }
            timerElement.text(convertTime(player.timer));
        }
    });
});

socket.on("clear orange",()=>{
    currentRoom.players.forEach((player)=>{
        $(`#joueur-${player.username}`).css('background-color','');
    });
});

socket.on("buzz",(room,username)=>{
    currentRoom=room;
    console.log("[TF] buzz : "+username);

    if (myplayer.username===username){
        buzzed();
    }
    else {
        block();
    }
    $(`#joueur-${username}`).css('background-color','orange');
    clearInterval(countdown);
    countdown=setInterval(()=>{
        updateCountdown(currentRoom,currentRoom.players.filter((p)=>p.username===username));
    },1000);
});

socket.on("TF time set",(time,room)=>{
    currentRoom=room;
});

socket.on("stop timer", () => {
    clearInterval(countdown);
});

socket.on("restart timer", () => {
    clearInterval(countdown);
    console.log("restart timer");
    countdown=setInterval(() => updateCountdown(currentRoom,currentRoom.players), 1000);
});

socket.on("temps écoulé",(room,username)=>{
    currentRoom=room;
    lowLag.play('/components/times-up.mp3');
    $(`#joueur-${username}`).css('background-color','grey');
});

socket.on("liberer", (r)=>{
    currentRoom=r;
    liberer();
});

socket.on("block", (r)=>{
    currentRoom=r;
    block();
});

function convertTime(time) {
    var minutes = Math.floor(time / 60);
    var seconds = time % 60;
    return `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

function unconvertTime(str) {
    if (!str || typeof str !== 'string') return 0;
    let parts = str.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes * 60 + seconds;
}

function liberer(){
    console.log("libere");
    $("#buzzer-state").text("BUZZ");
    $("#buzzer-circle").attr('fill',"green");
    $("#buzzer").on('click',buzzerAction);
    $(document).keydown(function(e){
            if (e.code === "Space"){
                buzzerAction();
            }
        });
}

function buzzerAction(){
    lowLag.play('/components/buzzsound.mp3');
    buzzed();
}

function block(){
    console.log("block");
    $("#buzzer-state").text("Bloqué");
    $("#buzzer-circle").attr('fill',"yellow");
    $("#buzzer").off('click');
    $(document).off('keydown');
}

function buzzed(){
    socket.emit("buzzed",myplayer.username)
    myplayer.state="buzzed";
    $("#buzzer").off('click');
    $("#buzzer-state").text("Buzzed");
    $("#buzzer-circle").attr('fill',"red");
    $(document).off('keydown');
}

socket.on("disconnect",()=>{
    alert("L'hôte s'est déconnecté");
    document.location.href="/";
});

socket.on("error",(err)=>{
    alert(err);
    document.location.href="/";
});

socket.on("alert",(message)=>{
    alert(message);
});


