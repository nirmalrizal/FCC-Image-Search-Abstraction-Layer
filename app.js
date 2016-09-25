var express = require('express');
var app = express();
var exphbs = require('express-handlebars');
var Search = require('bing.search');
var util = require('util');
var mongodb = require('mongodb').MongoClient;

require('dotenv').config({silent: true});

//environment variables
var port = process.env.PORT || 3000;
var dbUrl = process.env.DB_URL;

//listening app
app.listen(port,function(err){
  if(err){
    console.log('Listen Error :-- '+err);
  } else {
    console.log('Server listening on port : 3000');
  }
});

search = new Search(process.env.API_KEY);

//view engine middleware
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine' , 'handlebars');

//render homepage
app.get('/',function(req,res){
  res.render('index');
});

//getting the search query
app.get('/api/imagesearch/:query',function(req,res){
  var input = req.params.query;
  var when = new Date().toLocaleString();
  var size = req.query.offset || 10;
  search.images(input, {
      top: size
    },
    function(err, results) {
      if (err) throw err;
      res.send(results.map(makeList));
  });
  saveInput(input,when);
});

//getting request to view recent searches
app.get('/api/recent',function(req,res){
  searchDB(res);
});

//make proper list
function makeList(img){
  return{
    "url": img.url,
    "snippet": img.title,
    "thumbnail": img.thumbnail.url,
    "context": img.sourceUrl
  }
}

//insert searched data and time in database
function saveInput(userInput,getDate){
  mongodb.connect(dbUrl,function(err,db){
    if(err){
      console.log('DB connection error :--'+err);
    } else {
      var collection = db.collection('search-history');
      collection.insert({
        "term" : userInput,
        "when" : getDate
      },function(err){
        if(err){
          console.log('Insertion error :--'+err);
        } else {
          console.log('History Inserted');
        }
      });
    }
  });
}

//search database to parse the recent search
function searchDB(res){
  mongodb.connect(dbUrl,function(err,db){
    if(err) throw err;
    var collection = db.collection('search-history');
    collection.find().limit(10).sort({when:-1}).toArray(function(err,doc){
      if(err){
        console.log('Searching error :--'+err);
      } else {
        res.send(doc.map(function(el){
          return{
            term: el.term,
            when : el.when
          }
        }));
      }
    });
  });
}
