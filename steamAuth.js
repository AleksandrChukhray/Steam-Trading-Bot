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
	this.game = cfg.game
	debug('Authoritation user: ',cfg.username)
	this.client = new SteamUser();
	this.offers = new TradeOfferManager({
		steam:        self.client,
		domain:       cfg.domain,
		language:     "en", // English item descriptions
		pollInterval: 10000, // (Poll every 10 seconds (10,000 ms)
		cancelTime:   1000*60*10// Expire any outgoing trade offers that have been up for 5+ minutes (300,000 ms)
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


steamAuth.prototype.getItem = function(id){
	return this.myBackpack[id]
}

steamAuth.prototype.clearMassTradesData = function(){
	this.successTrade = 0;
	this.erorrTrade = 0;
	this.tradeId = 0;
}

steamAuth.prototype.getItemObjectFromSomeInventory = function(trade,itemName,item,tradeId){
	var self = this
	trade.loadPartnerInventory(appid[self.game],contextid[self.game], function(err,inventory){
		if(!err) {
			debug('We got some inventory, looking for: ', itemName)
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
	var id = Math.random();
	if(!tradeMessage) {tradeMessage = 'Hey! Do you want to trade so?' }
	var trade = self.offers.createOffer(steamID);

			self.getItemObjectFromSomeInventory(trade,hisItemName,hisItems,id);//нужен итем из конкретного инвентаря :(((
			self.on('hisItemFound'+id, function () {
				trade.addTheirItems(hisItems);
				trade.addMyItems(myItems);
				function tradesDone(self)		{
					debug('Total trades:',self.tradeId,'. Success: ', self.successTrade,'. Erorr: ',self.erorrTrade, '.');
					if ((self.successTrade+self.erorrTrade == self.tradeId )){
						debug('Done.Total trades:',self.tradeId,'. Success: ', self.successTrade,'. Erorr: ',self.erorrTrade, '.');
						self.emit('AllTradesDone')
						//process.exit(1)
					}

				}
				trade.send(tradeMessage, accessToken,function (err, status){
					if (err) {
						self.erorrTrade++;
						// NEED REWORK
						debug(err.message)
						errCode = err.message.slice(-3,-1)
						if((errCode == 16) || (errCode == 10)){
							debug('Got offer error. Error code:',errCode)
							setTimeout(function(){
								self.createOffer(steamID,accessToken,hisItemName,myItems,tradeMessage)
							},60*1000)
						}
						else{
							self.erorrTrade++;
							tradesDone(self);
						}
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
