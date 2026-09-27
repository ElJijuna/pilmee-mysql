import db = require('..');

const client = db.createClient({
  host: 'localhost',
  port: 3306,
  pool: true,
  connectionLimit: 5,
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
  const id: number | null = await client.transaction(async (tx) => {
    const { insertId } = await tx.runEscapeAsync('INSERT INTO t (a) VALUES (:a)', { a: 1 });

    await tx.runAsync('SELECT 1');

    return insertId;
  });
  void id;

  const user = await client.queryOne<{ id: number; name: string }>(
    'SELECT id, name FROM users WHERE id = :id',
    { id: 1 },
  );
  const name: string | undefined = user?.name;
  void name;
  await client.endAsync();
}

void query();
