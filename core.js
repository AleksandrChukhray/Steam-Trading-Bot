
var cfg = require('./cfg')
var steamAuth = require('./steamAuth')
var csgoLounge = require('./csgoLounge')
var bot = new steamAuth(cfg)
var myItems = []
var hisItemName = '★ M9 Bayonet | Fade (Factory New)' // Имя предмета который хотим получить при обмене
bot.on('gotBackpack',function (){
    myItems = [bot.getItem(5)] //Предмет ( или предметы, через запятую), которые хотим отдать.
    bayonet = new csgoLounge(hisItemName,'',1)
    bayonet.on('done', function() {
        console.log('done')
        traders = bayonet.getLinks();
        tradeMessage = 'Drochi moi chlen sebe v rot'
        traders.forEach(function (item, i, arr) {
            bot.createOffer(item.partner, item.token, hisItemName, myItems,tradeMessage )
        })
    })
})


