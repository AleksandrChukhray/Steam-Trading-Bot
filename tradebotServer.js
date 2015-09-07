var events = require('events');
var eventEmitter = new events.EventEmitter();
var debug = require('debug')('tradeBotServer')
var express = require('express')
var app = express()
var server
var csgoLounge = require('./csgoLounge')
var timeoutTime;
var timeoutTimer;
var steamAuth = require('./steamAuth')
var cfg = require('./cfgCrazyMax')
var date = new Date();
var tableName = 'MarketPricestest'
var bot
var myItem = []
var itemsForTrade = [];
var itemForTrade;
var mysql      = require('mysql');
var connection;
var inWork = false;
var iteration = 0;
var startTime = new Date();
function init()
{
    debug('First initialisation for steam market parsing server')
    server = app.listen(3000, function () {
        app.set('view engine', 'ejs');
    });
    bot = new steamAuth(cfg)
    connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : 'root',
        database : 'steambot'
    });
    bot.on('gotBackpack',function (){
        myItem = [bot.getItem(0)] //Item for sale
        getItemsForTrade(myItem[0])
        });
    bot.client.on('newItems', function (count) {
        debug(count," new items in our inventory");
        console.log((new Date() - startTime) /1000)
        process.exit(2);
    });
        //bayonet = new csgoLounge(hisItemName,'',7)
        //bayonet.on('done', function() {
        //    traders = bayonet.getLinks();
        //    tradeMessage = 'Hey, wanna trade?'
        //    traders.forEach(function (item, i, arr) {
        //        setTimeout(function dealy(){
        //                bot.createOffer(item.partner, item.token, hisItemName, myItems,tradeMessage )
        //            }
        //            , 100 + 2000*i
        //        )
        //    })
        //})
        timeoutTime = 1000 * 60 * 10 ;

}




function main(){
    if(inWork)    {
        debug('Iam already doing something, try again later')
        timeoutTimer = setTimeout(function () {
            eventEmitter.emit('wakeUp')
        }, timeoutTime)
    }
    else {
        debug('Timeout passed , im waking UP')
        inWork = true
        //Code here
        //Get items from back pack
        //Get it avg price
        //Choose items with the slightly larger price
        //Parse this items from lounge
        //Send offers for each parsed
        itemForTrade = itemsForTrade.pop()
        itemsForTrade.unshift(itemForTrade)
        csgoLoungeParse = new csgoLounge(itemForTrade, '')
        csgoLoungeParse.on('gotEnoughLinks' + csgoLoungeParse.id, function () {
            iteration++;
            traders = csgoLoungeParse.getLinks();
            tradeMessage = 'Hey, wanna trade? My knife has a beautiful look, check it ingame'
            bot.clearMassTradesData();
            traders.forEach(function (item, i, arr) {
            bot.createOffer(item.partner, item.token, itemForTrade, myItem,tradeMessage )
                })
            setTimeout(function () {
                inWork = false
                eventEmitter.emit('wakeUp')
            }, timeoutTime*2)
        })
            bot.on('AllTradesDone', function (){
                inWork = false
                clearTimeout(timeoutTimer);
                debug('Sleeping for 10min or until get new items')
                timeoutTimer = setTimeout(function () {
                    eventEmitter.emit('wakeUp')
                }, timeoutTime)
                debug('All trades sent')
            })
    }
}

function getItemsForTrade(item){
    // NEED REWORK
    // Учитывая максимальное количество оферов =  30
    //priceRising = 1.02;
    //itemsForTrade = [];
    //debug(item.market_hash_name)
    //connection.query("SELECT * FROM " + tableName + " WHERE itemname='" + item.market_hash_name + "'", function (err, rows, fields) {
    //    avgForFind = rows[0].avg7 * priceRising
    //    connection.query("SELECT * FROM " + tableName + " WHERE  avg7 BETWEEN " + avgForFind + " AND " + 2*avgForFind + " ORDER BY avg7", function (err, rows, fields) {
    //        debug('First item for trade: ',rows[0])
    //        debug('Second item for trade: ',rows[1])
    //        debug('Third item for trade: ',rows[2])
    //        itemsForTrade.push(rows[0])
    //        itemsForTrade.push(rows[1])
    //        itemsForTrade.push(rows[2])
    //        eventEmitter.emit('gotItemsForTrade')
    //    });
    //});
    debug('Getting items for trade...')
    itemsForTrade.push('★ M9 Bayonet | Night (Battle-Scarred))')
    itemsForTrade.push('★ Butterfly Knife | Stained (Battle-Scarred)')
    itemsForTrade.push('★ Falchion Knife | Case Hardened (Minimal Wear)')
    itemsForTrade.push('★ Huntsman Knife | Crimson Web (Field-Tested)')

    eventEmitter.emit('gotIFT')
}



eventEmitter.on('wakeUp', function(){
        main()
    });

eventEmitter.on('gotNewItems', function(){
        date =  new Date();
        main()
    });

eventEmitter.on('gotIFT', function(){
    debug('Got items for trade, waking up')
    eventEmitter.emit('wakeUp')
})



app.get('/', function (req, res) {
    workingTime = new Date() - startTime;
    workingTime = workingTime.toString()
    workingTime = workingTime/1000
    myItemForTrade = myItem[0].market_hash_name
    hisItemForTrade = itemForTrade

    res.render('index', {
        item : myItemForTrade,
        currentInTrade : hisItemForTrade,
        status : inWork,
        workingTime : workingTime
    });
});

init()
