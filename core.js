
var cfg = require('./cfg')
var request = require('request')
var steamAuth = require('./steamAuth')
var csgoLounge = require('./csgoLounge')
var bot = new steamAuth(cfg)
var myItems = []
var hisItemName = '★ Butterfly Knife | Stained (Battle-Scarred)' // Имя предмета который хотим получить при обмене ★ Flip Knife
bot.on('gotBackpack',function (){
    myItems = [bot.getItem(9)]//,bot.getItem(11),bot.getItem(15)] //Предмет ( или предметы, через запятую), которые хотим отдать.
    bayonet = new csgoLounge(hisItemName,'',5)
    bayonet.on('gotEnoughLinks'+bayonet.id, function() {
        traders = bayonet.getLinks();
        tradeMessage = 'Hey, wanna trade? My knife has a beautiful look, fell free to check it in game.'
        bot.clearMassTradesData();
        traders.forEach(function (item, i, arr) {
           setTimeout(function dealy(){
                bot.createOffer(item.partner, item.token, hisItemName, myItems,tradeMessage )
               }
               , 100 + 100*i
           )
        })
    })
    bot.on('AllTradesDone', function (){
        process.exit(2);
    })
})



