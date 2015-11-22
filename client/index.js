var socket = io();
var userId = "user";


//$('form').submit(function() {
//    socket.emit('chat message', {value: $('#m').val(), userId: userId});
//   $('#m').val('');
//    return false;
//});

$("#led-link").on('click', function(e){
    socket.emit('toogle led', {value: 0, userId: userId});
});

$("#calibrate-link").on('click', function(e){
    socket.emit('calibrate range', {value: 0, userId: userId});
});
//$("#diode-link").hide();

$("#diode-link").on('click', function(e){
    if($(this).hasClass('active'))
        socket.emit('diode read', {value: 0, userId: userId});
});

socket.on('diode read', function(msg){
    $("#diode-container").text(msg.value.toString());
    //$('#messages').prepend($('<li>Read Value: <span> - '+msg.value+'</span></li>'));
});


socket.on('toogle led', function(msg) {
    if(msg.value === false) {
        //$('#messages').prepend($('<li>Toogle LED: OFF<span> - '+msg.userId+'</span></li>'));
        $("#led-container").removeClass("on");
        $("#led-container").addClass("off");
        $("#led-container span").text("OFF");
    }
    else if(msg.value === true) {
        //$('#messages').prepend($('<li>Toogle LED: ON<span> - '+msg.userId+'</span></li>'));
        $("#led-container").removeClass("off");
        $("#led-container").addClass("on");
        $("#led-container span").text("ON");
    }
});

//socket.on('chat message', function(msg) {
//    $('#messages').prepend($('<li>'+msg.value+'<span> - '+msg.userId+'</span></li>'));
//});

socket.on('connected users', function(msg) {
    $('#user-container').html("");
    for(var i = 0; i < msg.length; i++) {
        //console.log(msg[i]+" )msg[i] == userId( "+userId);
        if(msg[i] == userId)
            $('#user-container').append($("<div id='" + msg[i] + "' class='my-circle'><span>"+msg[i]+"</span></div>"));
        else
            $('#user-container').append($("<div id='" + msg[i] + "' class='user-circle'><span>"+msg[i]+"</span></div>"));
    }
});

socket.on('user connect', function(msg) {
    if(userId === "Master"){
        console.log("Client side userId: "+msg);
        userId = msg;
    }
});

socket.on('user disconnect', function(msg) {
    if(msg === "Master"){
        console.log("user disconnect: " + msg);
        var element = '#'+msg;
        console.log(element);
        $(element).remove();
    }
});

socket.on('sorry', function(msg){
    alert(msg.value);
    socket.emit("user disconnect", {value: "notMaster"});
    //socket.disconnect;
});

socket.on('led on error', function(msg){
    alert(msg.value);
});

socket.on('calibrate alert', function(msg){
    if(confirm(msg.value)){
        socket.emit('calibrate confirm', msg);
        $("#diode-link").addClass('active').on('click');
        $("#diode-container").text("OK to click now");
    }
});


window.onunload = function(e) {
    socket.emit("user disconnect", userId);
};

tab.onclose = function(e){
    socket.emit("user disconnect", userId);
};

window.onclose = function(e) {
    socket.emit("user disconnect", userId);
};