/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';
var request = require('request');

var expect = require('chai').expect;
var MongoClient = require('mongodb');
const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

//Stock Like Model
var mongoose = require('mongoose');
mongoose.connect(CONNECTION_STRING, { useNewUrlParser: true });
const stockLikeSchema = new mongoose.Schema({
  stock: String,
  ip: String
});
const StockLike = mongoose.model('StockLike',stockLikeSchema);

module.exports = function (app) {
  
  //Promise
  const stockPrice = (stock) => {
    return new Promise((resolve, reject) => {
      request('https://api.iextrading.com/1.0/stock/'+stock+'/price', (err, res, body) => {
        if (err) reject(err);
        resolve(body);
      });
    })
  }
  
  app.route('/api/stock-prices')
    .get(function (req, res){
      let stocks = req.query.stock;
      let like = req.query.hasOwnProperty('like') ? true : false;
      if (!Array.isArray(stocks)) {
        request('https://api.iextrading.com/1.0/stock/'+stocks+'/price', function (error, response, body) {
          let price = body;
          StockLike.countDocuments({stock: stocks}, (err, count) => {
            let likes = count;
            let stockData = {stock: stocks, price: price, likes: count};
            if (like)//like
              StockLike.findOne({stock: stocks, ip: req.ip}, (err, stock) => {
                if (!stock)//has liked
                {
                  let stocklike = StockLike({stock: stocks, ip: req.ip});
                  stocklike.save((err,stock) =>{
                    stockData.likes++;
                    res.json({stockData: stockData});
                  })                  
                }
                else
                  res.json({stockData: stockData});
              });
            else
              res.json({stockData: stockData});
          }); 
          
        });
      } else {
        async function f() {
          let stockData = [];
          for (let stock of stocks) {
            let price = await stockPrice(stock);
            let likes = await StockLike.countDocuments({stock: stock}).exec();
            let hasLiked = await StockLike.findOne({stock: stock, ip: req.ip}).exec();
            if (like && !hasLiked) {
              likes++;
              let stocklike = StockLike({stock: stock, ip: req.ip});
              await stocklike.save();
            }
            stockData.push({stock: stock, price: price, likes: likes});
          }
          res.json({stockData: stockData});
        }
        f();
      }
    });
    
};
