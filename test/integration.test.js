'use strict';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('..');
const hasDatabase = Boolean(process.env.MYSQL_HOST);
const integrationTest = hasDatabase ? test : test.skip;
const settings = {
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};
const client = db.createClient(settings);
const pooledClient = db.createClient({ ...settings, pool: true, connectionLimit: 2 });

if (hasDatabase) {
  before(async () => {
    await client.runAsync('DROP TABLE IF EXISTS pilmee_items');
    await client.runAsync(
      'CREATE TABLE pilmee_items (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(100) NOT NULL)',
    );
  });

  after(async () => {
    await client.runAsync('DROP TABLE IF EXISTS pilmee_items');
    await pooledClient.endAsync();
  });
}

integrationTest('queries MySQL with named parameters and tracks metadata', async () => {
  const insert = await client.runEscapeAsync('INSERT INTO pilmee_items (title) VALUES (:title)', {
    title: 'modernized',
  });

  assert.equal(insert.count, 1);
  assert.equal(typeof insert.insertId, 'number');
  assert.equal(client.results(), 1);
  assert.equal(client.lastInsertId, insert.insertId);

  const { result, count } = await client.runEscapeAsync(
    'SELECT id, title FROM pilmee_items WHERE id = :id',
    { id: insert.insertId },
  );

  assert.equal(count, 1);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'modernized');
});

integrationTest('keeps insert ids separate for concurrent inserts', async () => {
  const titles = ['first', 'second', 'third'];
  const responses = await Promise.all(
    titles.map((title) =>
      client.runEscapeAsync('INSERT INTO pilmee_items (title) VALUES (:title)', { title }),
    ),
  );

  for (const [index, { insertId }] of responses.entries()) {
    const { result } = await client.runEscapeAsync(
      'SELECT title FROM pilmee_items WHERE id = :id',
      { id: insertId },
    );

    assert.equal(result[0].title, titles[index]);
  }
});

integrationTest('runs concurrent queries through a connection pool', async () => {
  const responses = await Promise.all(
    [1, 2, 3, 4, 5].map((value) =>
      pooledClient.runEscapeAsync('SELECT :value AS value', { value }),
    ),
  );

  assert.deepEqual(
    responses.map(({ result }) => result[0].value),
    [1, 2, 3, 4, 5],
  );
});

integrationTest('commits and rolls back transactions', async () => {
  await client.transaction(async (tx) => {
    await tx.runEscapeAsync('INSERT INTO pilmee_items (title) VALUES (:title)', {
      title: 'committed',
    });
  });

  await assert.rejects(
    pooledClient.transaction(async (tx) => {
      await tx.runEscapeAsync('INSERT INTO pilmee_items (title) VALUES (:title)', {
        title: 'rolled-back',
      });

      throw new Error('abort');
    }),
    /abort/,
  );

  const { result } = await client.runAsync(
    "SELECT title FROM pilmee_items WHERE title IN ('committed', 'rolled-back')",
  );

  assert.deepEqual(
    result.map(({ title }) => title),
    ['committed'],
  );
});

integrationTest('queryOne returns the first row or null', async () => {
  const { insertId } = await client.runEscapeAsync(
    'INSERT INTO pilmee_items (title) VALUES (:title)',
    { title: 'single' },
  );

  assert.deepEqual(
    await client.queryOne('SELECT title FROM pilmee_items WHERE id = :id', { id: insertId }),
    { title: 'single' },
  );
  assert.equal(
    await client.queryOne('SELECT title FROM pilmee_items WHERE id = :id', { id: -1 }),
    null,
  );
});
