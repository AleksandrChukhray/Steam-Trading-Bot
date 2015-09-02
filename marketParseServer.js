var events = require('events');
var eventEmitter = new events.EventEmitter();
var debug = require('debug')('mpServer')
var timeoutTimeAvg;
var timeoutTimeLowest;

function init()
{
    debug('First initialisation for steam market parsing server')
    timeoutTimeAvg = 5000 // 5 seconds
    timeoutTimeLowest = 1000
    setTimeout(function() {
        eventEmitter.emit('updateLowest')
    }, 100)
    setTimeout(function() {
        eventEmitter.emit('updateAvg')
    }, 200)
}


function updateLowest(){
    debug('Timeout passed , im updating lowest prices')
    timeoutTimer = setTimeout(function() {
        eventEmitter.emit('updateLowest')
    }, timeoutTimeLowest)
    // CODE HERE
}

function updateAvg(){
    debug('Timeout passed , im updating average prices')
    timeoutTimer = setTimeout(function() {
        eventEmitter.emit('updateAvg')
    }, timeoutTimeAvg)
    //Code here
}


eventEmitter.on('updateLowest', function(){
    updateLowest()
    });

eventEmitter.on('updateAvg', function(){
    updateAvg()
    });

init()
