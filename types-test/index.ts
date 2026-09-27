import db = require('..');

const client = db.createClient({
  host: 'localhost',
  port: 3306,
});

client.run('SELECT 1', (error, result, fields) => {
  if (error) {
    throw error;
  }

  void result;
  void fields;
});

async function query(): Promise<void> {
  const response = await client.runEscapeAsync('SELECT :id AS id', { id: 1 });
  void response.result;
  const count: number = response.count;
  const insertId: number | null = response.insertId;
  void count;
  void insertId;
}

void query();
