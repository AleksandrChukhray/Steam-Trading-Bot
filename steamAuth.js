var SteamUser = require('steam-user'); // The heart of the bot.  We'll write the soul ourselves.
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var TradeOfferManager = require('steam-tradeoffer-manager');
var events = require('events');
var debug = require('debug')('steamAuth')

var appid = {
	DOTA2: 570,
	CSGO:  730,
	Steam: 753
};

var contextid = {
	DOTA2: 2,
	CSGO:  2,
	Steam: 6
};

var steamAuth = function(cfg){
	self = this
	this.myBackpack = [];
	this.tradeId = 0;
	this.successTrade = 0;
	this.erorrTrade = 0;
	this.game = cfg.game
	debug('Authoritation user: ',cfg.username)
	this.client = new SteamUser();
	this.offers = new TradeOfferManager({
		steam:        self.client,
		domain:       cfg.domain,
		language:     "en", // English item descriptions
		pollInterval: 10000, // (Poll every 10 seconds (10,000 ms)
		cancelTime:   300000 // Expire any outgoing trade offers that have been up for 5+ minutes (300,000 ms)
	});
	self.client.logOn({
		accountName: cfg.username,
		password: cfg.password
	});
	this.client.on('loggedOn',function(details){
		debug('Logged into steam as '+ self.client.steamID.getSteam3RenderedID());
		//If we want to go in-game after logging in
		//client.gamesPlayed(appid.TF2);
	});
	this.client.on('error',function(e){
		debug(e);
		process.exit(-1);
	})
	this.client.on('webSession', function(sessionID, cookies){
		debug("Got web session");
		// Set our status to "Online" (otherwise we always appear offline)
		self.client.friends.setPersonaState(SteamUser.Steam.EPersonaState.Online)
		self.offers.setCookies(cookies, function (err){
			if (err) {
				debug('Unable to set trade offer cookies: ',err)
				process.exit(-1) // No point in staying up if we can't use trade offers
			}
			self.emit('cookiesSet')
			self.loadBackpack()
			debug("Trade offer cookies set.  Got API Key: ",self.offers.apiKey);
		});

	});
}

steamAuth.prototype = new events.EventEmitter;

steamAuth.prototype.loadBackpack = function (){
	self = this
	this.myBackpack = []
	debug('Getting my backpack for ' + self.game);
	this.offers.loadInventory(appid[self.game],contextid[self.game], true, function (err, inventory) {
		if (err) {
			debug(err);
		} else {
			inventory.forEach(function (item,i,arr) {
				debug(i,' ',item.market_hash_name) //Logging items in my back pack
                self.myBackpack.push(item)
			});
			self.emit('gotBackpack');
		}
	});
}


function getItemPrice(item){
    var xhr = new XMLHttpRequest();
    marketLink = "http://steamcommunity.com/market/priceoverview/?appid=730&market_hash_name=" + encodeURIComponent(item)
    xhr.open('GET', marketLink, false)
    xhr.send()
    var jsonResponse = JSON.parse(xhr.responseText)
	if (!jsonResponse.lowest_price) { jsonResponse.lowest_price = '$-1';}
    return{
        avgPrice : jsonResponse.median_price.slice(1),
        lowestPrice : jsonResponse.lowest_price.slice(1)
    }
}

function getProfitItems(itemCost){ // looking  for items in market which cost  a bit above that gotten itemCost
	console.log('Ищем предметы для трейда в маркете, для имеющегося предмета со стоимостью: ' + itemCost);
	listOfProfitItems = {
		"pistol" : "99000",
		"knife" : "101510",
		"gun" : "123"
	};
	console.log('Найдены предметы для треда:');
	console.log(listOfProfitItems);
	return listOfProfitItems
}
steamAuth.prototype.getItem = function(id){
	return this.myBackpack[id]
}
steamAuth.prototype.getItemObjectFromSomeInventory = function(trade,itemName,item,tradeId){
	var self = this
	trade.loadPartnerInventory(appid[self.game],contextid[self.game], function(err,inventory){
		if(!err) {
			debug('We got some inventory')
			for (i = 0; i < inventory.length; i++) {
				if (inventory[i].market_hash_name == itemName) {
					debug('Found needed weapon in partner inventory')
					item.push(inventory[i])
					self.emit('hisItemFound' + tradeId)
					break
				}
			}
			if (item.length == 0) {
				debug('Item was not found')
				self.erorrTrade++;
			}
		}
		else{
			debug(err)
		}
	});
}
steamAuth.prototype.createOffer = function (steamID,accessToken,hisItemName,myItems,tradeMessage){
	self = this
	var  hisItems=[];
	var tradeId= this.tradeId
	this.tradeId++;
	if(!tradeMessage) {tradeMessage = 'Hey! Do you want to trade so?' }
	var trade = self.offers.createOffer(steamID);
	trade.addMyItems(myItems);
	self.getItemObjectFromSomeInventory(trade,hisItemName,hisItems,tradeId);//нужен итем из конкретного инвентаря :(((
	this.on('hisItemFound'+tradeId, function () {
		trade.addTheirItems(hisItems);
		function tradesDone(self)		{
			if (self.successTrade+self.erorrTrade == self.tradeId ){
				debug('Done.Total trades:',self.tradeId,'. Success: ', self.successTrade,'. Erorr: ',self.erorrTrade, '.');
				process.exit(1)
			}
			debug('Total trades:',self.tradeId,'. Success: ', self.successTrade,'. Erorr: ',self.erorrTrade, '.');
		}
		trade.send(tradeMessage, accessToken,function (err, status){
			if (err) {
				debug(err);
				self.erorrTrade++;
				// NEED REWORK
				//debug('Got offer error, sleeping for a 5 sec')
				//s = 5000
				//var e = new Date().getTime() + (s);
                //
				//while (new Date().getTime() <= e) {
				//	;
				//}
				tradesDone(self);

			} else if (status == 'pending'){
				debug('Trade offer sent but awaiting email confirmation. You should probably turn off email confirmation here: http://steamcommunity.com/my/edit/settings/');
				self.successTrade++;
				tradesDone(self);
			} else {
				debug('Trade offer sent successfully');
				self.successTrade++;
				tradesDone(self);

			}
		});
	})
}


module.exports = steamAuth;
