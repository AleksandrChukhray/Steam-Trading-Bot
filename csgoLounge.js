var http = require('http'),
	request = require('request'),
	cheerio = require('cheerio'),
	events = require('events'),
	fs = require('fs'),
	debug = require('debug')('cslParser')

var csgoLounge = function(item,cookies,maxPages){
	var self = this
	this.tradeList = []
	this.tradeLinksArray = []
	this.totalMissingLinks = []
	this.finalArray = []
	if(!maxPages) {maxPages=1}
	if(!cookies) {cookies = 'PHPSESSID=qcgqquo4o50cp5clm75bs45lj5; tkz=c2cab3e2ff888ce4ecb06091e5a69db8; __utmt=1; id=76561198063846956; token=3a2adaf608ed50e29f2d29b59338ed06; __utma=210545287.444262926.1440134376.1440354373.1440357545.23; __utmb=210545287.3.10.1440357545; __utmc=210545287; __utmz=210545287.1440134376.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)'}
	this.tradesPerPage = 20 //const
	this.maxPages = maxPages
	this.totalRequiredTradesNumber = this.maxPages*this.tradesPerPage
	this.cookies = request.cookie(cookies)
	this.parseLounge(item)
	this.on('tradesParsingIsComplete',function(){
		self.tradeList.forEach(function(item,i,arr){
			 self.parseTradeLink(item)
		})
	})
	this.on('linksParsingIsComplete',function (){
		self.tradeLinksArray = unique(self.tradeLinksArray)
		debug('Now we can handle gotten links, total unique links parsed: ', self.tradeLinksArray.length,'. Cutting...')
		self.cutLinks()
	})
	this.on('done',function(){
	debug('done')
	})
}

csgoLounge.prototype = new events.EventEmitter;

csgoLounge.prototype.nameToLoungeId = function (name){
	loungeId = '39'
	return loungeId
}

csgoLounge.prototype.cutLinks  = function(){
	self  = this
	self.tradeLinksArray.forEach(function(item,i,arr){
		str  = item
		str = str.slice(str.indexOf('?'))
		partner ='[U:1:' + str.slice(str.indexOf('=') + 1,str.indexOf('&')) + ']'
		token = str.slice(str.lastIndexOf('=')+1)
		newItem = {
			partner:partner,
			token:token
		}
		self.finalArray.push(newItem)
		if(self.finalArray.length == self.tradeLinksArray.length){
			self.emit('done')
		}
	})
}

csgoLounge.prototype.getLinks = function(id){
	if(id){
		return this.finalArray[id]
	}
	else{
		return this.finalArray
	}
}

csgoLounge.prototype.parseLounge = function (itemname){
	var self = this
	id = self.nameToLoungeId(itemname)
	page = 1;
	while(page <= self.maxPages) {
		loungeUrl = 'http://csgolounge.com/result?&rquality%5B%5D=0&rdef_index%5B%5D=' + id + '&p=' + page
		self.parseTrades(loungeUrl)
		page++;
	}
}
csgoLounge.prototype.parseTrades = function(url){
	var self = this
	request({uri: url, method: 'GET', encoding: 'binary'},
		function (err, res, body) {
			if(err){
				debug('Got erorr, while requesting.Retrying',err)
				self.parseTrades(url)
			}
			else {
				var $ = cheerio.load(body);
				$('div.tradeheader>a').each(function () {
					extarUrl = $(this).attr('href')
					tradeUrl = 'http://csgolounge.com/' + extarUrl
					self.tradeList.push(tradeUrl)
				});
				//Check the end of parsing
				if (self.tradeList.length == self.totalRequiredTradesNumber) {
					debug('Got enougt trades,emiting event...')
					self.emit('tradesParsingIsComplete');
				}
			}
		});
}
csgoLounge.prototype.parseTradeLink = function (url){
	self = this
	var options = {
		url: url,
		headers: {
			cookie:self.cookies
		}
	};
	request(options,
		function (err, res, body) {
			if(err){
				debug('Got erorr, while requesting.Retrying',err)
				self.parseTradeLink(url)
			}
			else {
				var s = cheerio.load(body);
				checkCookies = s('a#logout').attr('href')
				if(!checkCookies){
					debug('Bad cookies, cant get steamoffer links, exiting...')
					process.exit(2)
				}
				//Debug
				//fs.open("vrosts.html","w",0644, function(err,file_handle){
				//    if(!err){ fs.write(file_handle,body,null,'utf8'); }
				//});
				//Getting steamoffer link
				checkButtonExist = s('div#offer>a.buttonright').text()
				if(checkButtonExist) {
					s('div#offer>a.buttonright').each(function () {
						tradeLink = s(this).attr('href')
						self.tradeLinksArray.push(tradeLink)
						diff = self.tradeList.length - self.totalMissingLinks.length
						debug('Got ',self.tradeLinksArray.length,' out off ',diff,' links')
						if(self.tradeLinksArray.length == diff ) {
							debug('Got enougt links,emiting event...')
							self.emit('linksParsingIsComplete');
						}
					});
				}
				else{
					self.totalMissingLinks.push('ss')
					debug('The tradeoffer button is not exist')
				}

			}
		});
}
function unique (arr) {
	var obj = {};
	for (var i = 0; i < arr.length; i++) {
		var str = arr[i];
		obj[str] = true; // запомнить строку в виде свойства объекта
	}
	return Object.keys(obj); // или собрать ключи перебором для IE8-
}

module.exports = csgoLounge

var lol = new csgoLounge('ITEM');

