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
//var myOnboardLed = new mraa.Gpio(3, false, true); //LED hooked up to digital pin (or built in pin on Galileo Gen1)
var myOnboardLed = new mraa.Gpio(7); //LED hooked up to digital pin 13 (or built in pin on Intel Galileo Gen2 as well as Intel Edison)
myOnboardLed.dir(mraa.DIR_OUT);//set the gpio direction to output
var photoDiode = new mraa.Aio(0);
photoDiode.setBit(12); // set ADC to 12 bit mode
var ledState = true; //Boolean to hold the state of Led

var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var connectedUsersArray = [];
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
    console.log("\n Add new User: u" + connectedUsersArray.length);
    if (connectedUsersArray.length > 0) {
        io.emit('sorry', "A User is Already Connected!!");
        //var element = connectedUsersArray[connectedUsersArray.length - 1];
        //userId = 'u' + (parseInt(element.replace("u", "")) + 1);
        return;
    }
    else {
        userId = "Welcome, Master";
    }
    console.log('a user connected: ' + userId);
    io.emit('user connect', userId);
    connectedUsersArray.push(userId);
    console.log('You are number: ' + connectedUsersArray.length);
    console.log('User has Connected: ' + connectedUsersArray);
    io.emit('connected users', connectedUsersArray);

    socket.on('user disconnect', function (msg) {
        console.log('remove: ' + msg);
        connectedUsersArray.splice(connectedUsersArray.lastIndexOf(msg), 1);
        io.emit('user disconnect', msg);
    });

    //socket.on('chat message', function (msg) {
    //    io.emit('chat message', msg);
    //    console.log('message: ' + msg.value);
    //});

    socket.on('toogle led', function (msg) {
        myOnboardLed.write(ledState ? 1 : 0); //if ledState is true then write a '1' (high) otherwise write a '0' (low)
        msg.value = ledState;
        io.emit('toogle led', msg);
        ledState = !ledState; //invert the ledState
    });

    socket.on('diode read', function (msg) {
        msg.value = photoDiode.readFloat() * 100.0;
        console.log(msg.value);
        io.emit('diode read', msg);
    });
    
    socket.on('calibrate range', function(msg){
        
    });


    http.listen(3000, function () {
        console.log('Web server Active listening on *:3000');
    });
}
