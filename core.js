
var cfg = require('./cfg')
var winston   = require('winston');
var steamAuth = require('./steamAuth')
var csgoLounge = require('./csgoLounge')
var events = require('events');
var eventEmitter = new events.EventEmitter();
//Define empty variable for further offers initialization
var backpack=new Array();
//Setup logging to file and console
var logger =  new (winston.Logger)({
     transports:[
         new (winston.transports.Console)({
             colorize : true,
             level: 'debug'
         }),
         new(winston.transports.File)({
             level : 'info',
             timestamp : true,
             filename : 'createdump.log',
             json : false
         })
     ]
    });

// Logging in and get client and offers keys

authKey = steamAuth.login(cfg,logger)
client = authKey.client
offers = authKey.offers
//Awaiting for success web session for get my back pack first time
client.on('webSession',function(details){
    steamAuth.getBackpack(offers,'CSGO',backpack,logger,eventEmitter)
});

eventEmitter.on('complete',function showBackpack(){
   // do something
})

//steamAuth.getBackpack(offers,'CSGO',backpack,logger)  // Получаем содержимое инвентаря
//console.log(backpack)
//choosenMyItem = backpack.pwnzKnife
//Для выбранных вещей ищем несколько вещей чуть подороже
//itemsForTrade = steamAuth.getProfitItems(choosenMyItem)
// Для каждого из найденных вещей нужно найти несколько продавцов на csgoLounge
//choosenHisItem = itemsForTrade.knife
//traders = csgoLounge.getTraders(choosenHisItem)
// Send trade offers for each of gotten traders
//choosenTrader = traders[1]
//steamAuth.sendTradeOffer(authKey,choosenTrader,choosenHisItem,choosenMyItem)
