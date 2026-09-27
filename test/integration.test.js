'use strict';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('..');
const hasDatabase = Boolean(process.env.MYSQL_HOST);
const integrationTest = hasDatabase ? test : test.skip;
const client = db.createClient({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

if (hasDatabase) {
  before(async () => {
    await client.runAsync('DROP TABLE IF EXISTS pilmee_items');
    await client.runAsync(
      'CREATE TABLE pilmee_items (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(100) NOT NULL)',
    );
  });

  after(async () => {
    await client.runAsync('DROP TABLE IF EXISTS pilmee_items');
  });
}

integrationTest('queries MySQL with named parameters and tracks metadata', async () => {
  await client.runEscapeAsync('INSERT INTO pilmee_items (title) VALUES (:title)', {
    title: 'modernized',
  });

  assert.equal(client.results(), 1);
  assert.equal(typeof client.lastInsertId, 'number');

  const { result } = await client.runEscapeAsync(
    'SELECT id, title FROM pilmee_items WHERE id = :id',
    { id: client.lastInsertId },
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'modernized');
});
