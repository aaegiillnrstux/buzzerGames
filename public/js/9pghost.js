// jshint esversion:6
const player = {
    host: true,
    roomId: null,
    username: "",
    socketId: "",
    buzzed:false,
    locked:false,
    free:false
};

const socket = io();

lowLag.init();
lowLag.load('/components/buzzsound.mp3');
lowLag.load('/components/Ding.mp3');

let start = false;

$(".modes").on('click',(e)=>{
    e.preventDefault();
    socket.emit("changeMode",e.target.id);
    $(".modes").removeClass('text-light bg-dark');
    $(`#${e.target.id}`).addClass('text-light bg-dark');
});

$("#liberer").on('click',(e)=>{
    liberer("all");
});
$("#bloquer").on('click',(e)=>{
    block("all");
});
$('#reset').on('click',(e)=>{
    console.log("reset");
    socket.emit("resetPoints");
});

$('#btn-points').on('change',(e)=>{
    socket.emit("changePointsMode",$('#btn-points').is(':checked'));
});

$('#btn-9pg').on('change',(e)=>{
    console.log($('#btn-9pg').is(':checked'));
    socket.emit("change9PGMode",$('#btn-9pg').is(':checked'));
});

$(function(){
    $(document).keydown(function(e){
        if (start){
        if (e.key ==="b"){
            block("all");
        }
        if (e.key ==="l"){
            liberer("all");
        }
    }
    });
});

$("#form-pseudo").on('submit', function (e){
    e.preventDefault();
    player.username= $('#username').val();
    player.roomId=$("#code").val();
    player.socketId=socket.id;

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

    socket.emit("playerDataHost",player);
});

socket.on('host launch',(player)=>{
    $('#player-list').append(`<li class="list-group-item">${player.username} (Host) </li>`);
    start=true;
});

socket.on("new player",(player,bool)=>{
    $('#player-list').append(`<li class="list-group-item" id="${player.username}">${player.username} <div class="btn-group btn-group-sm" role="group"> <button type="button" id="${player.socketId}-kick" class="btn btn-secondary kick">kick</button> <button type="button" id="${player.socketId}-block" class="btn btn-warning block">block</button></div><div class="score" style="display: none;"> <button type="button" id="${player.socketId}-score" class="btn btn-success score-point edit" data-bs-toggle="modal" data-bs-target="#modalGivePoints">Edit</button> </div> </span></li>`);
    afficheScore(bool,player);
    $(document).on('click',`#${player.socketId}-kick`,(e)=>{
        e.preventDefault();
        console.log('kick');
        socket.emit("kick",player.socketId);
    });
    $(document).on('click',`#${player.socketId}-block`,(e)=>{
        e.preventDefault();
        console.log('block '+player.username);
        const blockButton = $(`#${player.socketId}-block`);
        const buttonText = blockButton.text();
        if (buttonText === "block"){
            blockButton.text("unblock");
        }
        else{
            blockButton.text("block");
        }
        socket.emit("soloblock",player.socketId);
    });
    $(document).on('click',`#${player.socketId}-score`,(e)=>{
        e.preventDefault();
        console.log('score '+player.username);
        $('#pseudo-modal').text(`${player.username}`);
        $('#modal-score-label').text("Donnez le nombre de points à ajouter ou à enlever (mettre un - ) :");
        $('#btn-validate').attr("data-username", `${player.username}`);
        $('#btn-validate').on('click',(e)=>{
            validerPoints(e.target);
        });
    });

        
});


socket.on("remove player",(player)=>{
    console.log(`Bye bye ${player.username}`);
    $(`#${player.username}`).remove();
});

socket.on("modeChanged",()=>{
    $("#success-alert").html("<strong>Mode changed </strong>");
    $("#success-alert").fadeTo(2000, 500).slideUp(500, function(){
        $("#success-alert").slideUp(500);
    });
});

socket.on("kick-success",()=>{
    $("#success-alert").html("<strong>Played kicked </strong>");
    $("#success-alert").fadeTo(2000, 500).slideUp(500, function(){
        $("#success-alert").slideUp(500);
    });
});

socket.on("libere",()=>{
    liberer();
});
socket.on("block",()=>{
    block();
});
socket.on("buzzed",()=>{
    soundPlay();
    buzzed();
});

socket.on("player buzz",(buzzes,bool,npg)=>{
    console.log(JSON.stringify(buzzes));
    $('.check-buzz').off('click');
    $('#buzzing-list').empty();
    buzzes.forEach((buzz)=>{
        var htmlcode = `<li class="list-group-item"  >${buzz.player}  `;
        if (bool & !npg){
            htmlcode += `<i class="fa-solid fa-circle-check check-buzz" style="color:green" data-username="${buzz.player}" id="${buzz.player}-check" data-bs-toggle="modal" data-bs-target="#modalGivePoints"></i>`;
        }
        else if (npg){
            htmlcode += `<i class="fa-solid fa-circle-check check-buzz" style="color:green" data-username="${buzz.player}" id="${buzz.player}-check"></i>`;
        }
        htmlcode += '</li>';
        $('#buzzing-list').append(htmlcode);
        $(`#${buzz.player}-check`).on('click',(e)=>{
            if (npg){
                socket.emit("change points 9PG",e.target.dataset.username);
                liberer("all");
            }
            else{
                $('#pseudo-modal').text(`${buzz.player}`);
                $('#btn-validate').attr("data-username", `${buzz.player}`);
                $('#btn-validate').on('click',(e)=>{
                    validerPoints(e.target);
                });
            }

        });
    });
    
});

socket.on("show scores",(r)=>{
    $('#reset').show("slow");
    r.players.forEach((p)=>{
        afficheScore(true,p);
    });
    $("#success-alert").html("<strong>Points remis à 0 </strong>");
    $("#success-alert").fadeTo(2000, 500).slideUp(500, function(){
        $("#success-alert").slideUp(500);
    });

});

socket.on("unshow scores",(r)=>{
    $('#reset').hide();
    r.players.forEach((p)=>{
        afficheScore(false,p);
    });
    $("#success-alert").html("<strong>Points désactivés </strong>");
    $("#success-alert").fadeTo(2000, 500).slideUp(500, function(){
        $("#success-alert").slideUp(500);
    });
});

socket.on("update score",(p)=>{
    var score = $(`#${p.socketId}-score`);

    score.text(p.points);
});

socket.on("qualifie",(p)=>{
    $(`#${p.username}`).css('background-color', 'green');
    lowLag.play('/components/Ding.mp3');
})

socket.on("unqualifie",(p)=>{
    $(`#${p.username}`).css('background-color', 'white');
});


socket.on("clear buzz",()=>{
    console.log("clear");
    $('#buzzing-list').empty();
});

socket.on("disconnect",()=>{
    alert("L'hôte s'est déconnecté");
    document.location.href="/";
});

socket.on("error",(err)=>{
    alert(err);
    document.location.href="/";
});

function liberer(str="only"){
    socket.emit("libere",str);
    $("#buzzer-state").text("BUZZ");
    $("#buzzer-circle").attr('fill',"green");
}

function block(str="only"){
    socket.emit("block",str);
    $("#buzzer-state").text("Bloqué");
    $("#buzzer-circle").attr('fill',"yellow");
}

function buzzed(){
    socket.emit("buzz");
    $("#buzzer-state").text("Buzzed");
    $("#buzzer-circle").attr('fill',"red");
}

function soundPlay(){
    lowLag.play('/components/buzzsound.mp3');
}

function afficheScore(bool,p){
    var score;
    if (bool){
        score = $(`#${p.username}`).children('.score');
        score.show();
        score=score.children('.score-point');
        score.text(p.points);
    }
    else{
        score = $(`#${p.username}`).children('.score');
        score.hide();
    }
    
}

function validerPoints(target){
    $('#btn-validate').off('click');
    liberer("all");
    socket.emit("change points",target.dataset.username,$("#score-input").val());
}

