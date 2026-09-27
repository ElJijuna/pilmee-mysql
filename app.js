var db = require('./pilmee-mysql');

db.configure(function(){
  db.set('host', 'localhost');
	db.set('user', 'root');
	db.set('database', 'ninjacode');
});

db.run('SELECT * FROM noticias ORDER BY id DESC', function(err, result){
  db.list(result, 'id', 'titulo', function(){
    console.log('\n Records: ' + result.length);
  });
});
