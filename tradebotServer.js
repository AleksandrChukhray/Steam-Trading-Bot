var events = require('events');
var eventEmitter = new events.EventEmitter();
var debug = require('debug')('tradeBotServer')
var express = require('express')
var app = express()
var server
var timeoutTime;
var timeoutTimer;
var date = new Date();

function init()
{
    debug('First initialisation for steam market parsing server')
    server = app.listen(3000, function () {
    });
    timeoutTime = 5000 // 5 seconds
    setTimeout(function() {
        eventEmitter.emit('wakeUp')
    }, 100)
}


function main(){
        clearTimeout(timeoutTimer);
    debug('Timeout passed , im waking UP')
    timeoutTimer = setTimeout(function() {
        eventEmitter.emit('wakeUp')
    }, timeoutTime)
    //Code here
    //Get items from back pack
    //Get it avg price
    //Choose items with the slightly larger price
    //Parse this items from lounge
    //Send offers for each parsed

}



eventEmitter.on('wakeUp', function(){
        main()
    });

eventEmitter.on('gotNewItems', function(){
        date =  new Date();
        main()
    });

app.get('/', function (req, res) {
    res.send(date);
});

init()
