var http = require('http'),
	request = require('request'),
	cheerio = require('cheerio'),
	events = require('events'),
	fs = require('fs'),
	debug = require('debug')('cslParser'),
  mysql      = require('mysql')

var csgoLounge = function(item,cookies){
	var self = this

	this.connection = mysql.createConnection({
		host     : 'localhost',
		user     : 'root',
		password : 'root',
		database : 'steambot'
	});
	this.connection.connect();
	this.id = Math.random();
	this.loungeId;
	this.tradeList = []
	this.tradeLinksArray = []
	this.totalMissingLinks = []
	this.finalArray = []
	this.currentPage = 1;
	this.parsedAllPages = false;
	this.linksToParse = 30;
	if(!cookies) {
		cookies = 'id=76561198063846956; token=ced748210fe6a8a2e439edd9040046de;  PHPSESSID=qcgqquo4o50cp5clm75bs45lj5;'//tkz=c2cab3e2ff888ce4ecb06091e5a69db8;'// __utmt=1; __utma=210545287.696016616.1440737987.1440867298.1440909464.10; __utmb=210545287.9.10.1440909464; __utmc=210545287; __utmz=210545287.1440737987.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)'
	}
	this.tradesPerPage = 20 //const
	self.totalRequiredTradesNumber = this.tradesPerPage
	this.cookies = request.cookie(cookies)
	this.nameToLoungeId(item)
	this.on('gotLoungeId' + self.id,function(){
		this.parseLounge()
	})
	self.on('pageParseComplete' + self.id,function(){
		if(self.tradeList.length == 0){
			self.emit('gotEnoughLinks'+self.id)		}
			self.tradeList.forEach(function(item,i,arr){
				 self.parseTradeLink(item)
			})
	})
	self.on('linksParsingIsComplete'+self.id,function(){
		self.tradeLinksArray = unique(self.tradeLinksArray)
		self.cutLinks()
		debug('Amount of links',self.finalArray.length)
		if((self.finalArray.length>=self.linksToParse)||(self.parsedAllPages)){
			debug('Done.Parsed enought links. Emitting event: ', 'gotEnoughLinks'+self.id)
			self.emit('gotEnoughLinks'+self.id)
			self.tradeList = [];
		}
		else{
			debug('Parsed not enought links. Let Parse one more page')
			self.tradeLinksArray = [];
			self.tradeList= [];
			self.totalMissingLinks = [];
			self.currentPage++;
			self.parseLounge()
		}
	})
}

csgoLounge.prototype = new events.EventEmitter;

csgoLounge.prototype.decodeKnifeItemName = function(name){
	if (name[0] == '$') {
		name = name.split("");
		name[0] = '★';
		name = name.join("");
	}
	return name
}

csgoLounge.prototype.encodeKnifeItemName = function(name){
	if (name[0] == '★') {
		name = name.split("");
		name[0] = '$';
		name = name.join("");
	}
	return name
}

csgoLounge.prototype.nameToLoungeId = function (name){
	self = this
	name = self.encodeKnifeItemName(name)
	debug('Converting ',name,' to loungeID')
	this.connection.query("SELECT id FROM loungeIdstest WHERE itemname = '" + name + "'", function(err, rows, fields) {
		if (err) debug(err);
		self.loungeId = rows[0].id
		debug('Got loungeID: ', rows[0].id)
		self.emit('gotLoungeId'+self.id)
	});
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
	loungeUrl = 'http://csgolounge.com/result?&rquality%5B%5D=0&rdef_index%5B%5D=' + self.loungeId + '&p=' + self.currentPage
	self.parseTrades(loungeUrl)
}
csgoLounge.prototype.parseTrades = function(url){
	var self = this
	request({uri: url, method: 'GET', encoding: 'binary'},
		function (err, res, body) {
			if(err){
				debug('Got erorr, while requesting Trades.Retrying',err)
				self.parseTrades(url)
			}
			else {
				var $ = cheerio.load(body);
				tradesOnPage = $('.tradepoll').length;
				if(tradesOnPage<20){
					self.parsedAllPages = true;
				}
				self.totalRequiredTradesNumber =  tradesOnPage
				$('div.tradeheader>a').each(function () {
					extarUrl = $(this).attr('href')
					tradeUrl = 'http://csgolounge.com/' + extarUrl
					self.tradeList.push(tradeUrl)
				});
				//Check the end of parsing
				if (self.tradeList.length == self.totalRequiredTradesNumber) {
					debug('Got enougt trades on a page,emiting event...')
					self.emit('pageParseComplete'+self.id);
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
				debug('Got erorr, while requesting Link.Retrying',err)
				self.parseTradeLink(url)
			}
			else {
				var s = cheerio.load(body);
				checkCookies = s('a#logout').attr('href')
				if(!checkCookies){
					if(!(self.tradeLinksArray.length>0)) {
						debug('Bad cookies, cant get steamoffer links, exiting...')
						process.exit(2)
					}
					else{
						debug('Bad cookies, but we already got some links, so continue...')
					}
				}
				//Getting steamoffer link
				checkButtonExist = s('div#offer>a.buttonright').text()
				if(checkButtonExist) {
					diff = self.tradeList.length - self.totalMissingLinks.length
					s('div#offer>a.buttonright').each(function () {
						tradeLink = s(this).attr('href')
						self.tradeLinksArray.push(tradeLink)
						debug('Got ',self.tradeLinksArray.length,' out off ',diff,' links')
						if(self.tradeLinksArray.length == diff ) {
							debug('Got enougt links,emiting event...')
							self.emit('linksParsingIsComplete'+self.id);
						}
					});
				}
				else{
					self.totalMissingLinks.push('ss')
					diff = self.tradeList.length - self.totalMissingLinks.length
					debug('The tradeoffer button is not exist')
					if(self.tradeLinksArray.length >= diff ) {
						debug('Got enougt links,emiting event...')
						self.emit('linksParsingIsComplete'+self.id);
					}
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

module.exports = csgoLounge;


