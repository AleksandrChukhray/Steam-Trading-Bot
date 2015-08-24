
var cfg = require('./cfg')
var steamAuth = require('./steamAuth')
var csgoLounge = require('./csgoLounge')

var bot = new steamAuth(cfg)
bot.on('gotBackpack',function showBackpack(){   // do something
    var hisItemName = '★ M9 Bayonet'
    var myItems = [bot.getItem(5)]
    var hisItems = [];
    bot.getItemObjectFromSomeInventory('[U:1:123522147]',hisItemName,hisItems);
    bot.on('hisItemFound',function(){
        partner = '[U:1:123522147]'
        token = 'yWeV97p9'
        bot.createOffer(partner,token,hisItems,myItems,'Drochi moi chlen sebe v rot')
    })

    //bot.createOffer(partner,token,hisItemName,myItem)
    //itemname = '★ M9 Bayonet'
    //var bayonet = new csgoLounge(itemname,'',5)
    //bayonet.on('done', function(){
    //    traders = bayonet.getLinks();
    //    traders.forEach(function(item,i,arr){
    //        steamAuth.sendTradeOffer(offers,item.partner,item.token,'',backpack[6])
    //    })
    //})
})
