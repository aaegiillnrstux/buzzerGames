// jshint esversion:6
var myplayer = {
    host: false,
    roomId: null,
    player: false,
    username: "",
    socketId: "",
    points:0,
    state:"blocked"
};
const exterieurMatrices = ["matrix(0.024755, 0.999694, -1.000075, 0.009348, 329.05073, 100.564487)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 327.700571, 26.306825)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 325.900431, -47.950544)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 324.457346, -122.505451)"];
const interieurMatrices =  ["matrix(0.024755, 0.999694, -1.000075, 0.009348, 329.950785, 100.864505)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 327.700571, 26.606885)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 326.800516, -48.100683)","matrix(0.024755, 0.999694, -1.000075, 0.009348, 325.26359, -122.495312)"];
const textMatrices = ["matrix(2.541135, 0, 0, 1.978724, -341.147898, 151.203053)","matrix(2.541135, 0, 0, 1.978724, -348.952189, 76.573061)","matrix(2.541135, 0, 0, 1.978724, -349.005961, 3.215738)","matrix(2.541135, 0, 0, 1.978724, -351.706218, -73.291895)"];

var currentRoom;
var currentPlayer;
var roundTime=20;
var period=100;
var step=10*period/roundTime;
var countdownInterval;
var boite=4;
lowLag.init();
lowLag.load('/components/Ding.mp3');
lowLag.load('/components/times-up.mp3');
lowLag.load('/components/buzzsound.mp3');

const socket = io("/faf");

$("#form-pseudo").on('submit', function (e){
    e.preventDefault();
    myplayer.username= $('#username').val();
    myplayer.roomId=parseInt($("#code").val());
    myplayer.socketId=socket.id;

    $("#user-card").hide("slow");
    $("#user-card").empty();
    $('#app-div').show("slow");
    

    socket.emit("FAFplayerData",myplayer);
});

socket.on("FAF player init",(room,p)=>{
    myplayer=p;
    currentRoom=room;
    nbPlayers=room.players.length;
    var i = 1;
    if (1<=room.players.length<=2){
        room.players.forEach((player)=>{
            $(`#joueur${i}-name`).html(`<h3 id="joueur-${player.username}">${player.username}</h3>`);
            $(`#joueur${i}-score-div`).html(`<button type="button" id="${player.username}-score" class="btn btn-success score-point edit" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
            i++;
        });
    }
    $("#faf-grid").hide();
    $("#buzzer").show();
});

socket.on("FAF spectateur init",(room,p)=>{
    myplayer=p;
    currentRoom=room;
    nbPlayers=room.players.length;
    var i = 1;
    if (1<=room.players.length<=2){
        room.players.forEach((player)=>{
            $(`#joueur${i}-name`).html(`<h3 id="joueur-${player.username}">${player.username}</h3>`);
            $(`#joueur${i}-score-div`).html(`<button type="button" id="${player.username}-score" class="btn btn-success score-point edit" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
            i++;
        });
    }
    $("#spec-message").show();
    $("#faf-grid").show();
    $("#buzzer").hide();
});

socket.on("FAF new player",(room,player)=>{
    var i=1;
    currentRoom=room;
    if (1<=room.players.length<=2){
        room.players.forEach((player)=>{
            $(`#joueur${i}-name`).html(`<h3 id="joueur-${player.username}">${player.username}</h3>`);
            $(`#joueur${i}-score-div`).html(`<button type="button" id="${player.username}-score" class="btn btn-success score-point edit" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
            i++;
        });
    }
    
});

socket.on("FAF current player",(room)=>{
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
});

socket.on("FAF time", (room) => {
    roundTime=room.options.roundTime;
    currentRoom=room;
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

socket.on("FAF switch", async (room)=>{
    for (let element of currentRoom.state.pointsRule[currentRoom.state.mainInGame][0]) {
        await moveBoite(element,currentRoom.state.mainInGame==0,room.state.start);
    }
    currentRoom=room;
    $(`#joueur-${room.players[room.state.mainInGame].username}`).css('background-color','orange');
    $(`#joueur-${room.players[1-room.state.mainInGame].username}`).css('background-color','whitesmoke');
    countdownInterval=setInterval(updateCountdown,period);
});

socket.on("FAF main", (room)=>{
    currentRoom=room;
    console.log("changement de couleur");
    clearInterval(countdownInterval);
    changeCouleurExterieur(boite,false);
    changeCouleurInterieur(boite,0);
    boite--;
    changeCouleurExterieur(boite,true);
    countdownInterval=setInterval(updateCountdown,period);
    $(`#joueur-${room.players[room.state.mainInGame].username}`).css('background-color','orange');
    $(`#joueur-${room.players[1-room.state.mainInGame].username}`).css('background-color','whitesmoke');
})

socket.on("FAF free", (r)=>{
    currentRoom=r;
    myplayer.state="free";
    liberer();
});

socket.on("FAF buzzed", (room,player)=>{
    console.log("buzzed")
    clearInterval(countdownInterval);
    currentRoom=room;
    lowLag.play('/components/buzzsound.mp3');
    if (myplayer.username==player){
        
        $("#buzzer").off('click');
        $("#buzzer-state").text("Buzzed");
        $("#buzzer-circle").attr('fill',"red");
    }
    else {
        $("#buzzer").off('click');
        $("#buzzer-state").text("Bloqué");
        $("#buzzer-circle").attr('fill',"yellow");
    }
    
    

})

socket.on("FAF block", (r)=>{
    currentRoom=r;
    myplayer.state="blocked";
    block();
});

socket.on("FAF end", (bool,room) => {
    block();
    boite=4;
    currentRoom=room;
    $(`#joueur-${room.players[0].username}`).css('background-color','whitesmoke');
    $(`#joueur-${room.players[1].username}`).css('background-color','whitesmoke');
    currentPlayer=null;
    if (!bool){
        lowLag.play('/components/times-up.mp3');
    }
    else {
        lowLag.play('/components/Ding.mp3');
    }
});


socket.on("FAF remove player",(room)=>{
    currentRoom=room;
    if (room.players.length==0 || room.players.length==1){
        i=1;
        room.players.forEach((player)=>{
            $(`#joueur${i}-name`).text(player.username);
            $(`#joueur${i}-score-div`).html(`<button type="button" id="${player.username}-score" class="btn btn-success score-point edit" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
            i++;
        });
        while (i<=2){
            $(`#joueur${i}-name`).text(`Joueur ${i}`);
            $(`#joueur${i}-score-div`).html("");
            i++;
        }
    }
})

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
    console.log(boite);
    document.location.href="/";
});

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
    socket.emit("FAF buzzed",myplayer.username)
    myplayer.state="buzzed";
    $("#buzzer").off('click');
    $("#buzzer-state").text("Buzzed");
    $("#buzzer-circle").attr('fill',"red");
    $(document).off('keydown');
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
        clearInterval(countdownInterval);

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