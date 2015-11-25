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

var Spreadsheet = require('edit-google-spreadsheet');
var mraa = require('mraa'); //require mraa
var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);

//Pin setups
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

//Global variables
var connectedUsersArray = [];
var maxArray = []; //array to hold max values of photodiode readings
var minArray = []; //array to hold min values of photodiode readings
var rawData = [];
var absorbance = [];
var userId;
var timeStamp; //Timestamp to print to spreadsheet or database
var measurementInterval = 1; //In minutes, time between measurements in a single trial
var timeToStartTrial; //Time to start the measurements
var numOfMeasurements = 10; //Number of measurements to run in a single trial
var measurementsRun = 0; //Number of measurements run so far
//var trialNumber; //Next trial being run
var connectedToGoogle = false;


//Initialization
var ledState = true; //Boolean to hold the state of Led

//Initialize google spreadsheet
Spreadsheet.load({
    debug: true,
    spreadsheetId: '1zNhnZOcdRuBETDI42NIp-M942_0rpXhX9trNpIWTiWA',
    worksheetId: 'od6',   
    oauth : {
      email: 'account-1@metal-being-113418.iam.gserviceaccount.com',
      key:  "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCi/DezSXfk+XCy\nHiOqGe3SCBTysEgkbhrDI2QmJYqUQKYO+kqukE9WAqyUsYk3an2/N/XAzlOkdGd7\nPidnj045MJLPlGxZtGzui0stPzkbZ4s+Xhvjk0msADX6TCDH7tBcCdyMOrSdbtAG\necI0/jUnTh+2l8sXQ1VU44+Gjivv2J/qYx3D5FH7yXk6kjAHacNrXQtmjX2n7+nE\n4ycNQxd9tJM9Pn4JSLMQdROUeAYAyQ8asdINn+bThIjBVM8u+vAwePlAypBj/4oz\norF9Oem8PQIfW1A/PqItjDdJfljHgMV3cQgdwIDauKGU+U4Sju+fIuLXLuFYRHMX\nRfzeG4YTAgMBAAECggEAB3z1Biyy8HcxYU2XL+J/Fa4/YCMPPXU9j4eZu1LwOf16\nY6fGNJz2uCnpSe+aMUyYOGfWx6PzHdQnSPdDEjP4URJVPGpCTCDI/HCz5IFKG2M3\nd4cVWvBSay+bS0OiIe1r7z6YvmyYDb+gmRuQ+6RORt8E//ubXhc+3WaTGoh/pkZH\nzhKf0C/+L32Mt8X6CPVHLO2oolPcYHdDEb1wUFqhPoOuzobzx42SjQuUywSffzkp\n2XB6rl+3kWU31cg4BhFN+FcDmJHSmwjM1Y8npRRJEtRjYzu7T76Lwd6v9AsOxz0Q\n01fx9D3LOzqzbbFVzcDcXEYnSXOm4oX/9M7Q7aUHWQKBgQDYAtBzyHF7GDjXponV\ngbssPCWLGijDKt8H1QUVnTFQaYRWI5sUZKNUlQeftXWokQhgGuORDCdoZfXweo1N\nqGjjveyzUo3cXU5FBJLjdXexL3leVbuYzYza+JrT6EdlWnpNIb8uI176CHcf6ToD\nPQk22i+R+p2JqSzSOU2IctQTfQKBgQDBKGhq/0qB6UivaMhZQJ4rh5F9v7nGcuTh\ngv8jDgtZpND8uJBtQZDeuimIvEj5YRKjYpKkv6FPJXoVxLETp0ahmwUCX7SRmsP8\ndbcx6SgmFyPdoms2QX/T7LjHY1bZYlNovbIUzBDNDBOJ+DOlCNGi6EaW3jA4IEQN\ny8uV9qIUzwKBgBiJ8U5F5gZa0RJGfAACNdYnmwg7V4gcVavZGjPDYLfG1N7IOrTN\nXfSc3XnaLlyQ5Uetpk5y+AMXGiJQeb7ps8izabFRXoY7H0od4+XtEUTSpNH/oUkR\niL/TYBtUls+/wIcEn2hJYl+7GHVKlGmLxIEzthW6R608x7e2BMXMbaUtAoGBAKWa\ne0ug7MRMueCJuZur5u/zHy3svt4Bi3I82Xm4hMqqn/LMWicR257ZhNqScw47x7sE\nvC07jpVI0E7xf9AVzlynh7ftTea4BefhFNtZxu5BUKKoqbqulWWgwxtPdBqUTmay\nnIdwHcdu3yGfBsgrs3A0LLEUdcro/u/FFhrQhU3JAoGAFdvc5C7L868TJD5FX0Wv\nx7EHU9yTL2C5hhZmKS5lZt1h8QLNkorM7l/34SpCNFuMciVd3YIK4DV5+GoHW9sJ\nIBZNjXmUHXNdRB8nBPMj16yNgc3kE/o4WdtMdYwEB4Bn/DN5IFtphjyR2kZSY+mv\ngq9yApMS3E6lNiYHCxH8bl8=\n-----END PRIVATE KEY-----\n"
         }
    }, function run(err, spreadsheet) {
        if(err) throw err;
 
        connectedToGoogle = true;
    });

//Socket.io listeners
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
        if(!ledState){ //if leds are on, alert user
            msg.value = "Error. You must calibrate when the LEDS are off!";
            io.emit('led on error', msg);
        }
        else{ //otherwise, send confirm dialog to user
            minArray.splice(0, minArray.length); //clear min array
            maxArray.splice(0, minArray.length); //clear max array
            msg.value  = "Click OK to continue when test tubes with pure water are in the device.\n Click CANCEL to cancel";
            
            io.emit('calibrate alert', msg);
        }
    });
    
    socket.on('calibrate confirm', function(msg){

            getMins(); //get min diode readings
            setTimeout(getMaxs, 1000); //wait 1 second for LEDs to warm up, then get max diode readings
    });

});
http.listen(3000, function () {
     console.log('Web server Active listening on *:3000');
});



//Functions
function convertToAbsorbance(data, cb) {
    var convertedValues = []
    convertedValues = data; //Temp for now
    //do the math to convert to transmittance
    cb(convertedValues);

}
function startTrial() { //Starts the next trial immediately


	


    measurementsRun = 0;
    var trialInterval = setInterval( function {

        spreadsheet.receive(function(err, rows, info) {
       	//console.log(info.lastRow);
       	nextRow = info['nextRow']; 

        rawData = []; // clears measurement buffer
        timeStamp = new Date().toString(); // Gets current timestamp
        myOnboardLed.write(1);
        setMux0();
        rawData.push(photoDiode.readFloat() * 100.0);
        setMux1();
        rawData.push(photoDiode.readFloat() * 100.0);
        setMux2();
        rawData.push(photoDiode.readFloat() * 100.0);
        setMux3();
        rawData.push(photoDiode.readFloat() * 100.0);
        setMux4();
        rawData.push(photoDiode.readFloat() * 100.0);
        setMux5();
        rawData.push(photoDiode.readFloat() * 100.0);
        setMux6();
        rawData.push(photoDiode.readFloat() * 100.0);
        setMux7();
        rawData.push(photoDiode.readFloat() * 100.0);
        myOnboardLed.write(0);
        convertToAbsorbance(rawData, function(convertedValues) {
            absorbance = convertedValues;
            }
        );

        var obj = {};
         obj[nextRow] = [[timeStamp, measurementsRun, 0, absorbance[0]], 
                            [timeStamp, measurementsRun, 1, absorbance[1]],
                            [timeStamp, measurementsRun, 2, absorbance[2]],
                            [timeStamp, measurementsRun, 3, absorbance[3]], 
                            [timeStamp, measurementsRun, 4, absorbance[4]], 
                            [timeStamp, measurementsRun, 5, absorbance[5]], 
                            [timeStamp, measurementsRun, 6, absorbance[6]], 
                            [timeStamp, measurementsRun, 7, absorbance[7]]
                            ];
         spreadsheet.add(obj);

        spreadsheet.send(function(err) {
            if(err) throw err;
            console.log("Updated doc");
        });       



   });        

        measurementsRun++;
        if(measurementsRun>= numOfMeasurements) {
            clearInterval(trialInterval);
        }

    }, measurementInterval * 60000);


}
function getMins(){ //reads diode min values into minArray and sets leds on after


			/*minArray = [];
			for(i = 0; i < 8; i++) {
				setMux(i);
				minArray.push(photoDiode.readFloat() * 100.0);
			}
			*/
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

			/*maxArray = [];
			for(i = 0; i < 8; i++) {
				setMux(i);
				maxArray.push(photoDiode.readFloat() * 100.0);
			}
			*/
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

//Use this instead
/*
function setMux(input) {
    var binary = [];
    var num = input;
    while(num>=1) {
        binary.unshift(num%2);
        num = Math.floor(num/2);
        muxA.write(binary[0]);
        muxB.write(binary[1]);
        muxC.write(binary[2]);
    }
    
}
*/

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
