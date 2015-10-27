/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

/*
A simple node.js application intended to read data from Analog pins on the Intel based development boards such as the Intel(R) Galileo and Edison with Arduino breakout board.

MRAA - Low Level Skeleton Library for Communication on GNU/Linux platforms
Library in C/C++ to interface with Galileo & other Intel platforms, in a structured and sane API with port nanmes/numbering that match boards & with bindings to javascript & python.

Steps for installing MRAA & UPM Library on Intel IoT Platform with IoTDevKit Linux* image
Using a ssh client: 
1. echo "src maa-upm http://iotdk.intel.com/repos/1.1/intelgalactic" > /etc/opkg/intel-iotdk.conf
2. opkg update
3. opkg upgrade

Article: https://software.intel.com/en-us/html5/articles/intel-xdk-iot-edition-nodejs-templates
*/

//var async = require('async');

var mraa = require('mraa'); //require mraa
console.log('MRAA Version: ' + mraa.getVersion()); //write the mraa version to the console

var fs = require('fs');


var analogPin0 = new mraa.Aio(0); //setup access analog input Analog pin #0 (A0)
var digitalPin0 = new mraa.Gpio(5); //LED pin
digitalPin0.dir(mraa.DIR_OUT);

var rawData = [];
var realData = [];
var tubes = [0];

var path = "/tmp/output.txt";

const MIN = 0.0; //Value recorded from unlit tube
const MAX = 700.0; //Value recorded from lit empty tube
const SCALE = (100/(MAX-MIN));


setInterval(runMeasurements( saveToFile ), 60000);

function rawDataConverter() {
	realData = rawData.forEach(function(value) { 
		var data = (value-MIN)*SCALE;
		data = Math.log(data);
		return data;
	                  });

}

function runMeasurements(callback) {
    
    ledOnOff(1);  
    
    //Turn this into an asyncronous series loop
  	tubes.forEach(measureValue(value));

    ledOnOff(0);
    rawDataConverter();
    
    callback();//Probably saves to a file or something
}

function measureValue(tubeNumber) {
    
    //Multiplexer stuff
    
    var measurement = analogPin0.readFloat(); //read the value of the analog pin
    console.log(measurement); //write the value of the analog pin to the console
    rawData[tubeNumber] = measurement;
    
}

function ledOnOff(boolOnOff) {
    
        digitalPin0.write(boolOnOff);
    
}
    
function saveToFile() {
    var stream fs.createWriteStream(path);
    rawData.forEach(function(value){
    	stream.write('[');
    	stream.write(new Date().toString());
    	stream.write('] Tube Number: ');
    	stream.write(value);
    	stream.write(' Data: ');
    	stream.write(realData[value]);
    	stream.write('\n');

    });
    stream.end();

    
}
