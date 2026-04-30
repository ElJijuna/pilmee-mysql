![pilmee-mysql logo](http://eticagnu.org/wp-content/uploads/2013/05/pilmee-mysql.png)

  Library to manage mysql, using the mysql module, shortens the programming necessary to provide greater ease so the developer. 
  Power by @pilmee
  
## Installation

    $ npm install pilmee-mysql
  
## Example 1 - Basic:

```js
var db = require('pilmee-mysql');

db.configure(function(){
	db.set('host', 'localhost');
	db.set('user', 'root');
	db.set('database', 'ninjacode');
});

db.run('SELECT * FROM noticias ORDER BY id DESC', function(err, result){
 	console.log('\n Records: ' + db.results());
});
```

## Example 2 - Basic:

```js
var db = require('pilmee-mysql');

db.configure(function(){
	db.set('host', 'localhost');
	db.set('user', 'root');
	db.set('database', 'ninjacode');
});

db.run('SELECT * FROM noticias ORDER BY id DESC', function(err, result){
 	db.list(result, 'id', 'titulo', function(){
 		console.log('\n Records: ' + db.results());
 	});
});
```

## Example 3 - Use ExpressJS:

```js

/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var db = require('pilmee-mysql');
db.configure(function(){
  db.set('host', 'localhost');
  db.set('user', 'root');
  db.set('database', 'ninjacode');
});

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', function(req,  res){
  db.run('SELECT * FROM noticias', function(err, result, field){
    res.json(result);
  });
});

app.get('/xml', function(req,  res){
  db.run('SELECT * FROM noticias', function(err, result, field){
    db.toXML(result, function(xml){
      res.send(xml);
    });
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
```

## Contact:

  * Twitter: [@pilmee](http://twitter.com/pilmee)
  * Facebook: [PiLMee GaTes](http://fb.com/pilmee)
  * Github: [pilmee](http://github.com/pilmee)
  * Emails: pilmee@gmail.com, pilmee@eticagnu.org
	
