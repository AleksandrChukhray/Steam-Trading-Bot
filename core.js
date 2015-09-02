
var cfg = require('./cfg')
var request = require('request')
var steamAuth = require('./steamAuth')
var csgoLounge = require('./csgoLounge')
var bot = new steamAuth(cfg)
var myItems = []
var hisItemName = '★ Butterfly Knife | Fade (Factory New)' // Имя предмета который хотим получить при обмене
bot.on('gotBackpack',function (){
    myItems = [bot.getItem(10),bot.getItem(9)] //Предмет ( или предметы, через запятую), которые хотим отдать.
    bayonet = new csgoLounge(hisItemName,'',7)
    bayonet.on('done', function() {
        traders = bayonet.getLinks();
        tradeMessage = 'Hey, wanna trade?'
        traders.forEach(function (item, i, arr) {
           setTimeout(function dealy(){
                bot.createOffer(item.partner, item.token, hisItemName, myItems,tradeMessage )
               }
               , 100 + 2000*i
           )
        })
    })
})


