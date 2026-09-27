var db = require('./pilmee-mysql');

db.configure(() => {
  db.set('host', 'localhost');
  db.set('user', 'root');
  db.set('database', 'ninjacode');
});

db.run('SELECT * FROM noticias ORDER BY id DESC', (err, result) => {
  db.list(result, 'id', 'titulo', () => {
    console.log('\n Records: ' + result.length);
  });
});
