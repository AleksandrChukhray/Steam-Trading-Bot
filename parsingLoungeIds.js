var request = require('request')
var cheerio = require('cheerio')
var events = require('events')
var eventEmitter = new events.EventEmitter();
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
//function parseTotalPages(url){
//    request.post('http://csgolounge.com/ajax/tradeCsRightTmp.php', {form:{type:'Knife',page:'1'}},
//        function(err,httpResponse,body){
//            var $ = cheerio.load(body);
//            lastpage = $('ul.simplePagerNav.full').find('li').last().text();
//            return lastpage
//            eventEmitter.emit('complete');
//
//        })
//}

var parseLoungeIds =  function (cfg){
    var self = this
    this.index = 0;
    this.cfg={
        dbuser : cfg.dbuser,
        dbpass : cfg.dbpass,
        dbname : cfg.dbname
    }
    var mysql      = require('mysql');
   this.connection = mysql.createConnection({
        host     : 'localhost',
        user     : self.cfg.dbuser,
        password : self.cfg.dbpass,
        database : self.cfg.dbname
    });
    this.connection.connect();
    //try{
    //    connection.query("create table loungeIdsTest (id VARCHAR(10), itemname VARCHAR(30));")
    //}
    //catch(e){}
    //connection.query("TRUNCATE TABLE loungeIds")
    //connection.query("SELECT * FROM loungeIdstest", function (err, rows, fields) {
    //    if (err) throw err;
    //    rows.forEach(function(item,i,arr){
    //        console.log(item)
    //    })
    //});
    for(i=1;i<=70;i++) {
       setTimeout(self.parsePage(i), 100 + 1000*i)
    }
    // connection.end();
}

parseLoungeIds.prototype.parsePage = function (i){
    self = this
    request.post('http://csgolounge.com/ajax/tradeCsRightTmp.php', {form: {type: 'Type - All', page: i}},
        function (err, httpResponse, body) {
            if(err){
                console.log('Got error while requesting, retrying', err)
               self.parsePage(i)
            }
            else {
                var $ = cheerio.load(body);
                $('div.item').each(function () {
                    name = $(this).find('img').attr('alt')
                    rid = $(this).find('input').attr('value')
                    try
                    {
                    if (name[0] == '★') {
                        console.log('replacing')
                        name = name.split("");
                        name[0] = '$';
                        name = name.join("");
                    }
                    if (!(name.indexOf('StatTrak') + 1) && !(name.indexOf('\'') + 1 ) && !(name.indexOf('Souvenir') + 1 ) && !(name.indexOf('Sticker') + 1 )&& !(name.indexOf('Music Kit') + 1 ) ) {
                        name.replace('\'', '')
                        self.connection.query("INSERT INTO loungeIdstest (id,itemname) VALUES('" + rid + "','" + name + "')", function (err, rows, fields) {

                            if (err) throw err;
                        });
                        self.index++
                        console.log('Всего спарсил',self.index)
                    }
                } catch(e){
                        console.log(e)
                    }
                    console.log(name)
                    console.log(rid)
                });
            }
        })
}

cfg ={  dbuser : 'root',
    dbpass : 'root',
    dbname : 'steambot'
}

var lol = new parseLoungeIds(cfg)