var SteamUser = require('steam-user'); // The heart of the bot.  We'll write the soul ourselves.
var fs                = require('fs'); // For writing a dope-ass file for TradeOfferManager
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var TradeOfferManager = require('steam-tradeoffer-manager');
var events = require('events');
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


function login(cfg,logger) {
	logger.info("SteamAuth for " + cfg.username);
	var client = new SteamUser();
	var offers = new TradeOfferManager({
		steam:        client,
		domain:       cfg.domain,
		language:     "en", // English item descriptions
		pollInterval: 10000, // (Poll every 10 seconds (10,000 ms)
		cancelTime:   300000 // Expire any outgoing trade offers that have been up for 5+ minutes (300,000 ms)
	});

	client.logOn({
 		accountName : cfg.username,
		password : cfg.password
	});
	client.on('loggedOn',function(details){
		logger.info('Logged into steam as '+ client.steamID.getSteam3RenderedID());
		//If we want to go in-game after logging in
		//client.gamesPlayed(appid.TF2);
	});
	client.on('error',function(e){
		logger.error(e);
		process.exit(1);
	});
	client.on('webSession', function(sessionID, cookies){
		logger.debug("Got web session");
		// Set our status to "Online" (otherwise we always appear offline)
		client.friends.setPersonaState(SteamUser.Steam.EPersonaState.Online);
		offers.setCookies(cookies, function (err){
			if (err) {
				logger.error('Unable to set trade offer cookies: '+err);
				process.exit(1); // No point in staying up if we can't use trade offers
			}
			logger.debug("Trade offer cookies set.  Got API Key: " + offers.apiKey);
		});

	});

	return {
		client: client,
		offers: offers
	}
}

function getBackpack(offers,game,myItems,logger,eventEmitter){
	logger.info('Getting my backpack for ' + game);
    var i=1
	offers.loadInventory(appid[game],contextid[game], true, function (err, inventory) {
		if (err) {
			logger.error(err);
		} else {
			var pool = inventory.filter(function (item) {
                logger.info(item.market_hash_name) //Logging items in my back pack
                price = getItemPrice(item.market_hash_name)
                myItems[i] = item
                myItems[i].avgPrice = price.avgPrice
                myItems[i].lowestPrice = price.lowestPrice
                i=i+1
			});

			//steamID = '[U:1:222919618]';
			//accessToken = 'NjlGhvH5'
			////steamID = '76561198028866825';
			//// Start a new trade offer
			//var trade = offers.createOffer(steamID);
            //
			//// Add what we should to the current trade
			////logger.debug('Adding '+pool.length+' crates of series '+series);
			//trade.addMyItem(myItems[2]);
			////trade.addTheirItems(items)
            //
			////items - An array of item objects
			////Convenience method which simply calls addTheirItem for each item in the array.
			//// Send the offer off to Steam with a cute message
			//trade.send('Here are the free crates you requested!  <3', accessToken,function (err, status){
			//	if (err) {
			//		logger.error(err);
			//		client.friends.sendMessage(steamID, 'Something went wrong when trying to send the trade offer. Steam message: '+err);
			//	} else if (status == 'pending'){
			//		logger.warn('Trade offer sent but awaiting email confirmation. You should probably turn off email confirmation here: http://steamcommunity.com/my/edit/settings/');
			//		client.friends.sendMessage(steamID, 'Awaiting email confirmation');
			//	} else {
			//		logger.info('Trade offer sent successfully');
			//		client.friends.sendMessage(steamID, 'Trade offer sent successfully.  You can find the offer here: http://steamcommunity.com/tradeoffer/'+trade.id);
			//	}
			//});
			eventEmitter.emit('complete');
		}
	});



}


function getItemPrice(item){
    var xhr = new XMLHttpRequest();
    marketLink = "http://steamcommunity.com/market/priceoverview/?appid=730&market_hash_name=" + encodeURIComponent(item)
    xhr.open('GET', marketLink, false)
    xhr.send()
    var jsonResponse = JSON.parse(xhr.responseText)
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

function sendTradeOffer(offer,steamID,hisItem,myItem){
		console.log("Sending tradeoffer to " + hisId );
		console.log("My items: " + myItem);
		console.log("His items: " + hisItem);
		console.log("Tradeoffer sent.")


    //steamID = '76561198028866825';
    //// Start a new trade offer
    //var trade = offers.createOffer(steamID);
    //
    //// Add what we should to the current trade
    ////logger.debug('Adding '+pool.length+' crates of series '+series);
    //trade.addMyItems(myItems);
    //trade.addTheirItems(items)
    //
    //items - An array of item objects
    //Convenience method which simply calls addTheirItem for each item in the array.
    //// Send the offer off to Steam with a cute message
    //trade.send('Here are the free crates you requested!  <3', function (err, status){
    //    if (err) {
    //        logger.error(err);
    //        client.friends.sendMessage(steamID, 'Something went wrong when trying to send the trade offer. Steam message: '+err);
    //    } else if (status == 'pending'){
    //        logger.warn('Trade offer sent but awaiting email confirmation. You should probably turn off email confirmation here: http://steamcommunity.com/my/edit/settings/');
    //        client.friends.sendMessage(steamID, 'Awaiting email confirmation');
    //    } else {
    //        logger.info('Trade offer sent successfully');
    //        client.friends.sendMessage(steamID, 'Trade offer sent successfully.  You can find the offer here: http://steamcommunity.com/tradeoffer/'+trade.id);
    //    }
    //});
}



exports.login = login;
exports.getBackpack = getBackpack;
exports.getProfitItems = getProfitItems;
exports.sendTradeOffer = sendTradeOffer;
exports.appid = appid;
exports.contextid = contextid;