import mysql, { type Pool, type PoolOptions, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

export type { Pool, ResultSetHeader, RowDataPacket };

let pool: Pool | null = null;

function poolOptionsFromEnv(): PoolOptions | null {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return { uri: url, connectionLimit: 10, waitForConnections: true };
  }

  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();
  if (!host || !user || !database) return null;

  return {
    host,
    port: Number(process.env.MYSQL_PORT?.trim() || "3306"),
    user,
    password: process.env.MYSQL_PASSWORD ?? "",
    database,
    connectionLimit: 10,
    waitForConnections: true,
  };
}

export function hasDatabaseConfig(): boolean {
  return poolOptionsFromEnv() !== null;
}

export function getPool(): Pool {
  const options = poolOptionsFromEnv();
  if (!options) {
    throw new Error(
      "MySQL is not configured. Set DATABASE_URL or MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE.",
    );
  }
  if (!pool) pool = mysql.createPool(options);
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
