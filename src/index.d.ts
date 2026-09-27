import type { Connection, FieldInfo, MysqlError, OkPacket } from 'mysql';

declare namespace db {
  type QueryResult = Array<Record<string, unknown>> | OkPacket;
  type QueryCallback = (
    error: MysqlError | null,
    result?: QueryResult,
    fields?: FieldInfo[],
  ) => void;

  interface QueryResponse<T = QueryResult> {
    result: T;
    fields?: FieldInfo[];
  }

  interface ClientOptions {
    host?: string;
    user?: string;
    password?: string;
    database?: string;
    port?: number;
    debug?: boolean;
    debugSQL?: boolean;
    format?: string;
    insecureAuth?: boolean;
    supportBigNumbers?: boolean;
    bigNumberStrings?: boolean;
    timezone?: string;
    [key: string]: unknown;
  }

  interface Client {
    lastInsertId: number | null;
    results(): number;
    configure(callback: () => void): void;
    set(key: string, value: unknown): ClientOptions;
    get(key: string): unknown;
    changeUser(
      connection: Connection,
      values: ClientOptions,
      callback: (error?: MysqlError) => void,
    ): void;
    run(sql: string, callback: QueryCallback): void;
    runEscape(sql: string, values: Record<string, unknown>, callback: QueryCallback): void;
    runAsync<T = QueryResult>(sql: string): Promise<QueryResponse<T>>;
    runEscapeAsync<T = QueryResult>(
      sql: string,
      values: Record<string, unknown>,
    ): Promise<QueryResponse<T>>;
    list(
      result: Array<Record<string, unknown>>,
      keyName: string,
      displayName: string,
      callback: () => void,
    ): void;
    toXML(json: unknown, callback: (xml: string) => void): void;
    toXMLAsync(json: unknown): Promise<string>;
  }

  interface PilmeeMysql extends Client {
    createClient(options?: ClientOptions): Client;
  }
}

declare const db: db.PilmeeMysql;
export = db;
