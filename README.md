# @eljijuna/pilmee-mysql

Modern CommonJS MySQL client with callbacks, Promises, named parameters, and isolated clients.

## Requirements

- Node.js 20.19 or newer
- MySQL-compatible database

## Installation

The package is published to GitHub Packages:

```ini
# .npmrc
@eljijuna:registry=https://npm.pkg.github.com
```

```sh
npm install @eljijuna/pilmee-mysql
```

Private-package consumers must authenticate npm with a GitHub token that can read packages.

## Promise interface

```js
const db = require('@eljijuna/pilmee-mysql').createClient({
  host: 'localhost',
  user: 'root',
  password: 'secret',
  database: 'ninjacode',
});

async function main() {
  const { result: rows } = await db.runEscapeAsync(
    'SELECT * FROM noticias WHERE id = :id',
    { id: 1 },
  );

  console.log(rows);
}

main().catch(console.error);
```

Each client created with `createClient(options)` owns its configuration, result count, and last
insert ID. This prevents concurrent applications from sharing mutable state.

## Callback compatibility

The original singleton and callback methods remain available:

```js
const db = require('@eljijuna/pilmee-mysql');

db.configure(() => {
  db.set('host', 'localhost');
  db.set('user', 'root');
  db.set('database', 'ninjacode');
});

db.run('SELECT * FROM noticias', (error, rows, fields) => {
  if (error) throw error;
  console.log(rows, fields);
});
```

## Interface

- `createClient(options)` creates an isolated client.
- `run(sql, callback)` executes SQL using callbacks.
- `runEscape(sql, values, callback)` executes SQL with named parameters.
- `runAsync(sql)` returns `{ result, fields }`.
- `runEscapeAsync(sql, values)` returns `{ result, fields }`.
- `results()` returns the row count or affected-row count from the latest successful query.
- `lastInsertId` contains the latest insert ID.
- `set(key, value)` and `get(key)` manage legacy singleton configuration.
- `changeUser(connection, values, callback)` delegates to a MySQL connection.
- `list(...)` prints legacy tabular output.
- `toXML(...)` and `toXMLAsync(...)` serialize values as XML.

## Development

```sh
npm ci
npm run check
```

Integration tests run automatically when `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and
`MYSQL_DATABASE` are configured. GitHub Actions runs them against MySQL 8.

Publishing is triggered by a published GitHub Release and uses the repository's `GITHUB_TOKEN` to
upload `@eljijuna/pilmee-mysql` to GitHub Packages.

## License

MIT
