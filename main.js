/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

/*
The Web Sockets Node.js sample application distributed within Intel® XDK IoT Edition under the IoT with Node.js Projects project creation option showcases how to use the socket.io NodeJS module to enable real time communication between clients and the development board via a web browser to toggle the state of the onboard LED.

MRAA - Low Level Skeleton Library for Communication on GNU/Linux platforms
Library in C/C++ to interface with Galileo & other Intel platforms, in a structured and sane API with port nanmes/numbering that match boards & with bindings to javascript & python.

Steps for installing/updating MRAA & UPM Library on Intel IoT Platforms with IoTDevKit Linux* image
Using a ssh client: 
1. echo "src maa-upm http://iotdk.intel.com/repos/1.1/intelgalactic" > /etc/opkg/intel-iotdk.conf
2. opkg update
3. opkg upgrade

OR
In Intel XDK IoT Edition under the Develop Tab (for Internet of Things Embedded Application)
Develop Tab
1. Connect to board via the IoT Device Drop down (Add Manual Connection or pick device in list)
2. Press the "Settings" button
3. Click the "Update libraries on board" option

Review README.md file for in-depth information about web sockets communication

*/

//var async = require('async');

var mraa = require('mraa'); //require mraa
console.log('MRAA Version: ' + mraa.getVersion()); //write the mraa version to the Intel XDK console
var myOnboardLed = new mraa.Gpio(8); //LED hooked up to digital pin 8
myOnboardLed.dir(mraa.DIR_OUT);//set the gpio direction to output
var photoDiode = new mraa.Aio(0);
photoDiode.setBit(12); // set ADC to 12 bit mode

//mux setup
var muxA = new mraa.Gpio(5); // pin A of mux select pins
muxA.dir(mraa.DIR_OUT);
var muxB = new mraa.Gpio(6); // pin B of mux select pins
muxB.dir(mraa.DIR_OUT);
var muxC = new mraa.Gpio(7); // pin C of mux select pins
muxC.dir(mraa.DIR_OUT);
function setMux0(){ //set mux input to channel 0
    muxC.write(0);
    muxB.write(0);
    muxA.write(0);
}
function setMux1(){ //set mux input to channel 1
    muxC.write(0);
    muxB.write(0);
    muxA.write(1);
}
function setMux2(){ //set mux input to channel 2
    muxC.write(0);
    muxB.write(1);
    muxA.write(0);
}
function setMux3(){ //set mux input to channel 3
    muxC.write(0);
    muxB.write(1);
    muxA.write(1);
}
function setMux4(){ //set mux input to channel 4
    muxC.write(1);
    muxB.write(0);
    muxA.write(0);
}
function setMux5(){ //set mux input to channel 5
    muxC.write(1);
    muxB.write(0);
    muxA.write(1);
}
function setMux6(){ //set mux input to channel 6
    muxC.write(1);
    muxB.write(1);
    muxA.write(0);
}
function setMux7(){ //set mux input to channel 7
    muxC.write(1);
    muxB.write(1);
    muxA.write(1);
}

var ledState = true; //Boolean to hold the state of Led

var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var connectedUsersArray = [];
var maxArray = []; //array to hold max values of photodiode readings
var minArray = []; //array to hold min values of photodiode readings
var userId;

app.get('/', function(req, res) {
    //Join all arguments together and normalize the resulting path.
    res.sendFile(path.join(__dirname + '/client', 'index.html'));
});

//Allow use of files in client folder
app.use(express.static(__dirname + '/client'));
app.use('/client', express.static(__dirname + '/client'));

//Socket.io Event handlers
io.on('connection', function(socket) {
    if (connectedUsersArray.length > 0) {
        io.emit('sorry', {value: "A User is Already Connected!! \n YOU WILL NOW BE DISCONNECTED"});
        io.emit('user disconnect', {value: "No User"});
        //var element = connectedUsersArray[connectedUsersArray.length - 1];
        //userId = 'u' + (parseInt(element.replace("u", "")) + 1);
        return;
    }
    else {
        console.log("\n Add new User: Master");
        userId = "Master";
    }
    console.log('a user connected: ' + userId);
    io.emit('user connect', userId);
    connectedUsersArray.push(userId);
    console.log('You are number: ' + connectedUsersArray.length);
    console.log('User has Connected: ' + connectedUsersArray);
    io.emit('connected users', connectedUsersArray);

    socket.on('user disconnect', function (msg) {
        if(msg === "Master"){
            console.log('remove: ' + msg);
            connectedUsersArray.splice(connectedUsersArray.lastIndexOf(msg), 1);
            io.emit('user disconnect', msg);
        }
        else{
            socket.emit('disconnect', msg);
        }
    });
    
    socket.on('disconnect', function(){
        if(connectedUsersArray[0] === "Master"){
            console.log('remove: Master');
            connectedUsersArray.splice(connectedUsersArray.lastIndexOf("Master"), 1);
            io.emit('user disconnect', "Master");
        }
    });

    //socket.on('chat message', function (msg) {
    //    io.emit('chat message', msg);
    //    console.log('message: ' + msg.value);
    //});

    socket.on('toogle led', function (msg) {
        myOnboardLed.write(ledState ? 1 : 0); /*if ledState is true then write a '1' (high) otherwise write a '0' (low)*/
        msg.value = ledState;
        io.emit('toogle led', msg);
        ledState = !ledState; //invert the ledState
    });

    socket.on('diode read', function (msg) {
        msg.value = (photoDiode.readFloat() * 100.0);
        console.log(msg.value);
        io.emit('diode read', msg);
    });
    
    socket.on('calibrate range', function(msg){
        if(!ledState){
            msg.value = "Error. You must calibrate when the LEDS are off!";
            io.emit('led on error', msg);
        }
        else{
            minArray.splice(0, 8); //clear min array
            maxArray.splice(0, 8); //clear max array
            msg.value  = "Click OK to continue when test tubes with pure water are in the device.\n Click CANCEL to cancel";
            
            io.emit('calibrate alert', msg);
        }
    });
    
    socket.on('calibrate confirm', function(msg){
            getMins();
            setTimeout(getMaxs, 1000);
    });

});
http.listen(3000, function () {
     console.log('Web server Active listening on *:3000');
});

function getMins(){ //reads diode min values into minArray and sets leds on after
            setMux0();
            minArray.push(photoDiode.readFloat() * 100.0);
            setMux1();
            minArray.push(photoDiode.readFloat() * 100.0);
            setMux2();
            minArray.push(photoDiode.readFloat() * 100.0);
            setMux3();
            minArray.push(photoDiode.readFloat() * 100.0);
            setMux4();
            minArray.push(photoDiode.readFloat() * 100.0);
            setMux5();
            minArray.push(photoDiode.readFloat() * 100.0);
            setMux6();
            minArray.push(photoDiode.readFloat() * 100.0);
            setMux7();
            minArray.push(photoDiode.readFloat() * 100.0);
            console.log("min reads done");
            myOnboardLed.write(1);
            console.log("leds on");
}
function getMaxs(){ //reads max values into maxArray from diodes and sets leds to off after
            setMux0();
            maxArray.push(photoDiode.readFloat() * 100.0);
            setMux1();
            maxArray.push(photoDiode.readFloat() * 100.0);
            setMux2();
            maxArray.push(photoDiode.readFloat() * 100.0);
            setMux3();
            maxArray.push(photoDiode.readFloat() * 100.0);
            setMux4();
            maxArray.push(photoDiode.readFloat() * 100.0);
            setMux5();
            maxArray.push(photoDiode.readFloat() * 100.0);
            setMux6();
            maxArray.push(photoDiode.readFloat() * 100.0);
            setMux7();
            maxArray.push(photoDiode.readFloat() * 100.0);
            console.log("max reads done");
            myOnboardLed.write(0);
            console.log("leds off");
}