var request = require('request')
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var debug = require('debug')('marketParsing')
var events = require('events');

var marketParser = function(){
    self = this
    this.successfullLowestUpdates = 0;
    this.totalLowestUpdates = 0;
    this.successfullAvgUpdates = 0;
    this.totalAvgUpdates = 0;
    this.working = false;
    var mysql      = require('mysql');
    this.connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : 'root',
        database : 'steambot',
    });
    this.tableName = 'marketPricestest'
    this.starSign = '★'
    this.connection.connect();
    this.exchangeRate = this.getExchangeRate();
};
marketParser.prototype =  new events.EventEmitter;
marketParser.prototype.getExchangeRate = function(){
    // RUB to USD steam exchange rate
    self = this
    currDate = new Date()
    currDate = currDate.toDateString()
    self.connection.query("SELECT * FROM exchangeRate", function(err, rows, fields) {
    if( rows[rows.length-1].date == currDate){
        self.exchangeRate = rows[rows.length-1].rate
        debug('Got exchange rate from BD: ', self.exchangeRate)
        return   rows[rows.length-1].rate
    }
        else{
        var xhr = new XMLHttpRequest();
        usdlink = "http://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=Operation%20Phoenix%20Case%20Key"
        rublink = "http://steamcommunity.com/market/priceoverview/?appid=730&currency=5&market_hash_name=Operation%20Phoenix%20Case%20Key"
        xhr.open('GET', usdlink, false)
        xhr.setRequestHeader('User-Agent','Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36');
        xhr.send()
        var jsonResponse1 = JSON.parse(xhr.responseText)
        usd = jsonResponse1.lowest_price
        usd = usd.slice(1)
        xhr.open('GET', rublink, false)
        xhr.setRequestHeader('User-Agent','Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36');
        xhr.send()
        var jsonResponse2 = JSON.parse(xhr.responseText)
        rub = jsonResponse2.lowest_price
        rub = rub.slice(0,rub.length-5)
        rub = rub.replace(',','.')
        rate = rub/usd;
        self.exchangeRate = rate
        self.connection.query("INSERT INTO exchangeRate (date,rate) VALUES('"+ currDate +"'," + rate + ")")
        debug('Got exchange rate from steam:',rate)
        return rate
    }
    });
}

marketParser.prototype.decodeKnifeItemName = function(name){
    if (name[0] == '$') {
        name = name.split("");
        name[0] = '★';
        name = name.join("");
    }
    return name
}

marketParser.prototype.encodeKnifeItemName = function(name){
    if (name[0] == '★') {
        name = name.split("");
        name[0] = '$';
        name = name.join("");
    }
    return name
}

marketParser.prototype.updateLowestPrice = function(){ //
    self =  this
    if(self.working){
        debug('We already doing something, wait 1 min to retry update lowest prices.')
        self.updateLowestPrice();
    }
    else {
        self.working = true;
        self.successfullLowestUpdates = 0;
        self.connection.query("START TRANSACTION")
        self.connection.query("SELECT itemname FROM " + self.tableName + "", function (err, rows, fields) {
            for (i = 0; i < rows.length; i++) {
                self.totalLowestUpdates = i;
                itemName = self.decodeKnifeItemName(rows[i].itemname)
                marketLink = "http://steamcommunity.com/market/priceoverview/?appid=730&market_hash_name=" + encodeURIComponent(itemName)
                self.setLowestPrice(marketLink, itemName)
            }
        });
    }
};
marketParser.prototype.setLowestPrice = function(url,item){

    self = this
    cookies = 'Cookie:sessionid=6810b2ea6ead3edc1885f8cd; steamCountry=RU%7C5250aa29b9285d7bb87172ecc5c679bf; webTradeEligibility=%7B%22allowed%22%3A1%2C%22allowed_at_time%22%3A0%2C%22steamguard_required_days%22%3A15%2C%22sales_this_year%22%3A467%2C%22max_sales_per_year%22%3A-1%2C%22forms_requested%22%3A0%2C%22new_device_cooldown_days%22%3A7%7D; recentlyVisitedAppHubs=570%2C730; steamLogin=76561198063846956%7C%7C9CED3EB2910F8AFE5263D6DF8DD091E71264A5CD; strInventoryLastContext=730_2; timezoneOffset=21600,0; __utma=268881843.2135091687.1441004919.1441213617.1441222606.29; __utmb=268881843.0.10.1441222606; __utmc=268881843; __utmz=268881843.1441203068.25.9.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); tsTradeOffersLastRead=1441225482 '
    var options = {
        url: url,
        headers: {
            cookie : cookies,
            'User-Agent' : "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36"
        }
    }
    request(options,
        function (err, res, body) {
            if(err){
                debug('Got erorr, while getting lowest price.Retrying',err)
                    self.setLowestPrice(url, item)
            }
            else {
                function updateSQL(lowest,item){
                    self.connection.query("UPDATE " + self.tableName + " SET lowest = '" + lowest + "' WHERE itemname='" + self.encodeKnifeItemName(item) + "'", function (err, rows, fields) {
                        if (err) throw err;
                        self.successfullLowestUpdates++;
                        debug('Updated ', self.successfullLowestUpdates, ' out of ', self.totalLowestUpdates)
                        if (self.successfullLowestUpdates == self.totalLowestUpdates) {
                            self.emit('lpuDone') //lowest prices update done
                            self.connection.query("COMMIT")
                            self.working = false                        }
                    });
                }
                try {
                    var jsonResponse = JSON.parse(body)
                    if (!jsonResponse.lowest_price) {
                        jsonResponse.lowest_price = '$-1';
                    }
                    updateSQL(jsonResponse.lowest_price.slice(1),item)
                }
                catch(e){
                    debug('Got error while parsing lowest price, for item:',item,'. Retrying')
                    if(body[0]=='<'){
                        setTimeout(function() {
                            self.setLowestPrice(url, item)
                        },5000)
                    }
                    else {
                        debug(e)
                        debug(body)
                        updateSQL('-1',item)
                    }
                }
            }
        });

};
marketParser.prototype.calcAvg30 = function(array){
    self = this
    summ = 0
    currentTime = array[array.length - 1][0].slice(0, 11)
    currentTime = new Date(currentTime);
    currentTime.setMonth(currentTime.getMonth() - 3) //Требуемый промежуток времени
    indexTime = new Date();
    var i;
    for (i = array.length - 1 ;  (indexTime > currentTime) && i>=0; i--) {
        summ = summ + array[i][1]
        indexTime = array[i][0].slice(0, 11)
        indexTime =  new Date(indexTime)
    }
    divider = array.length - i - 1
    summ = summ / divider
    summ = summ / self.exchangeRate
    return summ
}
marketParser.prototype.calcAvg7 = function(array){
    self = this
    summ = 0
    currentTime = array[array.length - 1][0].slice(0, 11)
    currentTime = new Date(currentTime);
    currentTime.setDate(currentTime.getDay() - 7)
    indexTime = new Date();
    var i;
    for (i = array.length - 1 ;  (indexTime > currentTime) && i>=0; i--) {
        summ = summ + array[i][1]
        indexTime = array[i][0].slice(0, 11)
        indexTime =  new Date(indexTime)
    }
    divider = array.length - i - 1
    summ = summ / divider
    summ = summ / self.exchangeRate
    return {summ:summ,divider:divider}
}
marketParser.prototype.updateAvgPrice = function(){ //
    self =  this
    if(self.working){
        debug('We already doing something, wait 1 min to retry updateAvgPrices.')
        self.updateAvgPrice();
    }
    else {
        self.working = true
        self.successfullAvgUpdates = 0;
        self.connection.query("START TRANSACTION")
        this.connection.query("SELECT itemname FROM " + self.tableName + "", function (err, rows, fields) {
            for (i = 0; i < rows.length; i++) {
                self.totalAvgUpdates = i;
                itemName = self.decodeKnifeItemName(rows[i].itemname)
                marketLink = "http://steamcommunity.com/market/pricehistory/?appid=730&market_hash_name=" + encodeURIComponent(itemName)
                self.setAvgPrice(marketLink, itemName)
            }
        });
    }
};
marketParser.prototype.setAvgPrice = function(url,item) {
    self = this
    cookies = 'sessionid=7f15b67dc81e85e718be6f88;  steamLogin=76561198063846956%7C%7C9CED3EB2910F8AFE5263D6DF8DD091E71264A5CD; '
    var options = {
        url: url,
        headers: {
            cookie: cookies
        }
    }
    request(options,
        function (err, res, body) {
            if (err) {
                debug('Got erorr, while getting median price.Retrying', err)
                self.setAvgPrice(url, item)
            }
            else {
                if (body == '[]') {
                    debug('Bad cookies')
                }
                else {
                    function updateSql(avg30,avg7,item){
                        self.connection.query("UPDATE " + self.tableName + " SET avg30 = '" + avg30 + "',avg7 = '" + avg7.summ + "',rarity ='"+ avg7.divider+"'  WHERE itemname='" + self.encodeKnifeItemName(item) + "'", function (err, rows, fields) {
                            if (err) throw err;
                            self.successfullAvgUpdates++;
                            debug('Updated ', self.successfullAvgUpdates, ' out of ', self.totalAvgUpdates)
                            if (self.successfullAvgUpdates == self.totalAvgUpdates) {
                                self.connection.query("COMMIT")
                                self.emit('apuDone') //lowest prices update done
                                self.working = false
                            }
                        });
                    }
                    try{
                        var jsonResponse = JSON.parse(body)
                        array = jsonResponse.prices
                        //Avg price calc
                        avg30 = self.calcAvg30(array)
                        avg7 = self.calcAvg7(array)
                        //end
                        updateSql(avg30,avg7,item)
                    }
                    catch(e){
                        debug('Got error while parsing avg price, for item:',item,'. Retrying')
                        if(body[0]=='<'){
                            setTimeout(function() {
                                self.setAvgPrice(url, item)
                            },10*1000)
                        }
                        else {
                            debug(e)
                            debug(body)
                            updateSql('-1','-1',item)
                        }
                    }
                }
            }
        })
}




var lol = new marketParser()
lol.updateAvgPrice() // Тут работает прекрасно

lol.on('apuDone',function(){
    console.log('asd')
})
//lol.updateMedianPrice();

