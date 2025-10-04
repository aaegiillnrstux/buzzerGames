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

const socket = io("/conquiztador");

var currentRoom;
var currentPlayer;
var tempsMovement=1;
var nbPas=50;

const konamiCode = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];
var konamiIndex=0;
var konamiActive=false;
$(document).keydown(function(event) {
    if (event.key === konamiCode[konamiIndex]) {
        konamiIndex++; // Move to the next position in the sequence

        // If all keys in the sequence have been pressed, execute the code
        if (konamiIndex === konamiCode.length) {
            $('body').css('background-color', 'pink'); // Change the background color to pink
            $('body').css('background-image', 'none'); // Add a background image
            $('#app-konami-question').show();
            konamiActive=true;
            konamiIndex = 0; // Reset the index for future input
        }
    } else {
        konamiIndex = 0; // Reset the index if the key pressed does not match the sequence
    }
});

lowLag.init();
lowLag.load('/components/Bonne_reponse.mp3');
lowLag.load('/components/Bonne_reponse__VICTOIRE2.mp3');
lowLag.load('/components/Buzzer_Joueur_1_Champion.mp3');
lowLag.load('/components/Buzzer_Joueur_2_Challenger.mp3');
lowLag.load('/components/Suspense_2.mp3');
lowLag.load('/components/Mauvaise_reponse.mp3');
lowLag.load('/components/Presentation_des_3_themes.mp3');
lowLag.load('/components/Suspense_final.mp3');
lowLag.load('/components/Ding.mp3');


$("#form-pseudo").on('submit', function (e){
    e.preventDefault();
    myplayer.username= $('#username').val();
    myplayer.roomId=parseInt($("#code").val());
    myplayer.socketId=socket.id;

    $("#user-card").hide("slow");
    $("#user-card").empty();
    $('#app-div-manche1').show("slow");
    

    socket.emit("Conquiz playerData",myplayer);
});

socket.on("Conquiz player init",(room,p)=>{
    myplayer=p;
    currentRoom=room;
    nbPlayers=room.players.length;
    var i = 1;
    if (1<=room.players.length<=2){
        room.players.forEach((player)=>{
            $(`.joueur${i}-name`).html(`<h3 class="joueur-${player.username}">${player.username}</h3>`);
            $(`.joueur${i}-score-div`).html(`<button type="button" class="btn btn-success score-point edit ${player.username}-score" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
            i++;
        });
    }
    for (let i = 1; i <= 3; i++) {
        $(`#theme${i}`).text(room.state.themesList[i-1]);
    }
    catchup();
});

socket.on("Conquiz spectateur init",(room,p)=>{
    myplayer=p;
    currentRoom=room;
    nbPlayers=room.players.length;
    var i = 1;
    if (1<=room.players.length<=2){
        room.players.forEach((player)=>{
            $(`.joueur${i}-name`).html(`<h3 class="joueur-${player.username}">${player.username}</h3>`);
            $(`.joueur${i}-score-div`).html(`<button type="button" class="btn btn-success score-point edit ${player.username}-score" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
            i++;
        });
    }
    for (let i = 1; i <= 3; i++) {
        $(`#theme${i}`).text(room.state.themesList[i-1]);
    }
    $("#spec-message").show();
    catchup();
});


socket.on("Conquiz new player",(room,player)=>{
    var i=1;
    currentRoom=room;
    if (1<=room.players.length<=2){
        room.players.forEach((player)=>{
            $(`.joueur${i}-name`).html(`<h3 class="joueur-${player.username}">${player.username}</h3>`);
            $(`.joueur${i}-score-div`).html(`<button type="button" class="btn btn-success score-point edit ${player.username}-score" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
            i++;
        });
    }
    
});

socket.on("Conquiz remove player",(room)=>{
    currentRoom=room;
    if (room.players.length==0 || room.players.length==1){
        i=1;
        room.players.forEach((player)=>{
            $(`.joueur${i}-name`).text(player.username);
            $(`.joueur${i}-score-div`).html(`<button type="button" class="btn btn-success score-point edit ${player.username}-score" data-bs-toggle="modal" data-bs-target="#modalGivePoints">0</button>`);
            i++;
        });
        while (i<=2){
            $(`.joueur${i}-name`).text(`Joueur ${i}`);
            $(`.joueur${i}-score-div`).html("");
            i++;
        }
    }
})

socket.on("Conquiz current player",async (room)=>{
    currentRoom=room;
    $(`.joueur-${room.players[0].username}`).css('background-color','whitesmoke');
    $(`.joueur-${room.players[1].username}`).css('background-color','whitesmoke');
    currentPlayer=room.players[room.state.main].username;
    $(`.joueur-${currentPlayer}`).css('background-color','orange');
});

socket.on("Conquiz estimation",(question)=>{
    $("#conquiz-estimation-question").text(question);
    $("#modal-manche0").modal("show");
    $("#conquiz-manche0-button").on('click',function(){
        var estimation = parseInt($("#conquiz-estimation-reponse-input").val());
        if (isNaN(estimation)){
            alert("Veuillez entrer un nombre");
            return;
        }
        else{
            $("#modal-manche0").modal("hide");
        }
        socket.emit("Conquiz estimation reponse",estimation);
    });
})

socket.on("Conquiz estimation validation",(room)=>{
    currentRoom=room;
    $(`modal-manche0`).modal("hide");
});

socket.on("Conquiz theme", async (i)=>{
    lowLag.play('/components/Presentation_des_3_themes.mp3');
    $("#theme1").css("visibility","visible");
    await sleep(1300);
    $("#theme2").css("visibility","visible");
    await sleep(1300);
    $("#theme3").css("visibility","visible");
})

socket.on("Conquiz suspense",()=>{
    lowLag.play('/components/Suspense_2.mp3');
});

socket.on("Conquiz update score",(player,room)=>{
    currentRoom=room;
    $(`.${player.username}-score`).text(player.points);
    if (room.state.manche==2){
        moveBarre(room.players[0].points,room.players[1].points)
    }
});

socket.on("Conquiz couleurs",(room)=>{
    currentRoom=room;
    $('#grad-interieur-blue').css("stop-color",room.options.couleurs[0]);
    $('#grad-interieur-orange').css("stop-color",room.options.couleurs[1]);
});

socket.on("Conquiz question", (room,question,points) => {
    currentRoom=room;
    if (!konamiActive){
        afficherQuestion(question);
    }
    else{
        $("#konami-question").text(question.toUpperCase());
        $("#konami-number-number").text(points);
    }
    
})

socket.on("Conquiz question manche2", (room,question) => {
    currentRoom=room;
    if (konamiActive){
        $("#konami-question").text(question.toUpperCase());
    }
})

socket.on("Conquiz remove question", (bool,r) => {
    if (bool){
        $(`#${currentRoom.state.questionid}`).addClass("good-block");
    }
    else{
        $(`#${currentRoom.state.questionid}`).addClass("bad-block");
    }
    currentRoom=r;
    console.log("remove question");
    $("#modalQuestion").modal("hide");
})

socket.on("Conquiz finale questions", (room) => {
    currentRoom=room;
    
    setFinaleQuestions(room.state.finaleQuestions);
});

socket.on("Conquiz start finale", (room) => {
    currentRoom=room;
    $('#app-div-manche2').hide("slow");
    $('#app-div-finale').show("slow");
});

socket.on("Conquiz start manche2", (room) => {
    console.log("start manche2");
    currentRoom=room;
    const maxPoints = room.options?.barLength || 18;
    drawTicks(maxPoints);
    $('#app-div-manche1').hide("slow");
    $('#app-div-manche2').show("slow");
    if (konamiActive){
        $("#konami-number-number").text(1);
    }
    moveBarre(room.players[0].points,room.players[1].points);
});

socket.on("Conquiz start manche1", (room) => {
    console.log("start manche1");
    currentRoom=room;
    $('#app-div-manche2').hide("slow");
    $('#app-div-manche1').show("slow");
});

socket.on("Conquiz remove current player", (room) => {
    currentRoom=room;
    room.players.forEach((player)=>{
        $(`.joueur-${player.username}`).css('background-color','whitesmoke');
    });
    currentPlayer=null;
});

socket.on("Conquiz end", ()=>{
    lowLag.play('/components/Bonne_reponse__VICTOIRE2.mp3');
});


socket.on("disconnect",()=>{
    alert("L'hôte s'est déconnecté");
    document.location.href="/";
});

socket.on("Conquiz error",(err)=>{
    alert(err);
});

socket.on("Conquiz libere", (r)=>{
    currentRoom=r;
    myplayer.state="free";
    currentRoom.players.forEach((player)=>{
        $(`.joueur-${player.username}`).css('background-color','whitesmoke');
    });
    liberer();
});

socket.on("Conquiz buzzed", (room,rang)=>{
    if (rang==1){
        lowLag.play('/components/Buzzer_Joueur_1_Champion.mp3');
    }
    else{
        lowLag.play('/components/Buzzer_Joueur_2_Challenger.mp3');
    }
    $(`.joueur${rang}-card`).css('background-color',room.options.couleurs[rang-1]);
    console.log("buzzed")
    currentRoom=room;
    myplayer.state="buzzed";
    currentPlayer=rang-1;
    $("#buzzer").off('click');
    $("#buzzer-state").text("Buzzed");
    $("#buzzer-circle").attr('fill',"red");
})

socket.on("Conquiz block", (r)=>{
    currentRoom=r;
    myplayer.state="blocked";
    block();

});

socket.on("Conquiz block finale",(r)=>{
    currentRoom=r;
    hideFinaleQuestions();
});

socket.on("Conquiz unblock finale",(r)=>{
    currentRoom=r;
    setFinaleQuestions(r.state.finaleQuestions);
});

socket.on("Conquiz finale answer",(number)=>{
    $(`#finale-${number}`).addClass("good-block");
    $(`#finale-${number}`).toggleClass('active');
    // lowLag.play('/components/Ding.mp3');
    $(`#finale-${number}`).text(currentRoom.state.finaleQuestions[number-1].answer);
})

socket.on("Conquiz finale unanswer",(number)=>{
    $(`#finale-${number}`).removeClass("good-block");
    $(`#finale-${number}`).toggleClass('active');
    $(`#finale-${number}`).text(currentRoom.state.finaleQuestions[number-1].question);
});

socket.on("Conquiz finale suspense",()=>{
    lowLag.play('/components/Suspense_final.mp3');

})
socket.on("Conquiz son",(bool)=>{
    if (bool){
        lowLag.play('/components/Bonne_reponse.mp3');
    }
    else{
        lowLag.play('/components/Mauvaise_reponse.mp3');
    }
})

socket.on("Conquiz end", ()=>{
    lowLag.play('/components/Bonne_reponse__VICTOIRE.mp3');
});

socket.on("Conquiz update currentPoints",(currentPoints)=>{
    lowLag.play('/components/Change.mp3');
    if (konamiActive){
        $("#konami-number-number").text(currentPoints);
    }
    
    $("#success-alert").html(`<strong>Nous passons à ${currentPoints} </strong>`);
    $("#success-alert").fadeTo(2000, 500).slideUp(500, function(){
        $("#success-alert").slideUp(500);
    });
})

function catchup(){
    $('#grad-interieur-blue').css("stop-color",currentRoom.options.couleurs[0]);
    $('#grad-interieur-orange').css("stop-color",currentRoom.options.couleurs[1]);
    if (currentRoom.state.manche==1){
        $('#app-div-manche2').hide("slow");
        $('#app-div-manche1').show("slow");
        currentRoom.state.usedBlocks.forEach(([blockid,bool])=>{
            $(`#${blockid}`).addClass("used-block");
            if (bool){
                $(`#${blockid}`).addClass("good-block");
            }
            else{
                $(`#${blockid}`).addClass("bad-block");
            }
        }
        );
        if (currentRoom.state.question!=null){
            afficherQuestion(currentRoom.state.question);
        }
    }
    else if (currentRoom.state.manche==2){
        $('#app-div-manche1').hide("slow");
        $('#app-div-manche2').show("slow");
        moveBarre(currentRoom.players[0].points,currentRoom.players[1].points);
    }
    else if (currentRoom.state.manche==0){
        $('#app-div-manche1').show("slow");
        $('#app-div-manche2').hide("slow");
        $('modal-manche0').modal("show");
        $('#manche0-modal').text("Estimation en cours, veuillez patienter")
    }
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
    for (let i =1;i<=2;i++){
        $(`.joueur${i}-card`).css('background-color','');
    }
}

function buzzed(){
    socket.emit("Conquiz buzzed",myplayer.username)
    myplayer.state="buzzed";
    $("#buzzer").off('click');
    $("#buzzer-state").text("Buzzed");
    $("#buzzer-circle").attr('fill',"red");
    $(document).off('keydown');
}

function liberer(){
    console.log("libere");
    $("#buzzer-state").text("BUZZ");
    $("#buzzer-circle").attr('fill',"green");
    $("#buzzer").on('click',buzzerAction);
    for (let i =1;i<=2;i++){
        $(`.joueur${i}-card`).css('background-color','');
    }
    $(document).keydown(function(e){
            if (e.code === "Space"){
                buzzerAction();
            }
        });
}

function drawTicks(maxPoints) {
    const tickContainer = document.getElementById("bar-ticks");
    if (!tickContainer) return;

    tickContainer.innerHTML = ""; // Clear existing ticks

    for (let i = 1; i < maxPoints; i++) {
        const x = (800 / maxPoints) * i;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x);
        line.setAttribute("x2", x);
        line.setAttribute("y1", 0);
        line.setAttribute("y2", 40);
        line.setAttribute("stroke", "black");
        tickContainer.appendChild(line);
    }
}

async function moveBarre(pointsA,pointsB){
    console.log(pointsA,pointsB);
    var unPoint=100.0/currentRoom.options?.barLength;
    var baseA = 100-extractNumberFromPercent($("#grad-interieur-white-1").attr("offset"));
    var ecartA = pointsA*unPoint-baseA;
    var baseB = extractNumberFromPercent($("#grad-interieur-white-2").attr("offset"));
    var ecartB = pointsB*unPoint-baseB;
    console.log(ecartA,ecartB,baseA,baseB);
    for (let i =0;i<=nbPas;i++){
        $("#grad-interieur-white-1").attr("offset",`${100.0-baseA-ecartA*i/nbPas}%`);
        var offsetB=baseB+ecartB*i/nbPas;
        $("#grad-interieur-white-2").attr("offset",`${offsetB}%`);
        $("#grad-interieur-orange").attr("offset",`${offsetB}%`);
        await sleep(tempsMovement*1000/nbPas);
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractNumberFromPercent(percent){
    return parseFloat(percent.substring(0,percent.length-1));
}

function afficherQuestion(question){
    $("#question-div").text(question);
    $(`#${currentRoom.state.questionid}`).removeClass("block");
    $(`#${currentRoom.state.questionid}`).addClass("used-block");
    $("#modalQuestion").modal("show");
}

function setFinaleQuestions(questions){
    for (let i = 1; i <= 10; i++) {
        if ($(`#finale-${i}`).hasClass("good-block")){
            $(`#finale-${i}`).text(questions[i-1].answer);
        }
        else{
            if (checkImage(questions[i-1].question)){
                $(`#finale-${i}`).html(`<img src="${questions[i-1].question}" alt="Image question ${i}" style="width:100%; height:100%; object-fit:contain;">`);
            }
            else{
                $(`#finale-${i}`).text(questions[i-1].question);
            }
        }
    }
}

function setFinaleQuestions(questions){
    for (let i = 1; i <= 10; i++) {
        if (checkImage(questions[i-1].question)){
            $(`#finale-${i}`).html(`<img src="${questions[i-1].question}" alt="Image question ${i}" style="width:100%; height:100%; object-fit:contain;">`);
        }
        else{
            $(`#finale-${i}`).text(questions[i-1].question);
        }
    }
}

function checkImage(question){
    return /\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(question.trim());
}


function hideFinaleQuestions(){
    for (let i = 1; i <= 10; i++) {
        $(`#finale-${i}`).text("");
    }
}