import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _supabaseClient: SupabaseClient | undefined;
}

/**
 * Returns connection configuration for Supabase PostgreSQL
 */
export function getSupabasePoolConfig(): PoolConfig {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;

  if (connectionString) {
    return {
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 15000,
    };
  }

  const host =
    process.env.SUPABASE_DB_HOST ||
    process.env.PGHOST ||
    process.env.SQL_HOST ||
    'localhost';

  const isLocal = host === 'localhost' || host === '127.0.0.1';

  return {
    host,
    port: parseInt(process.env.SUPABASE_DB_PORT || process.env.PGPORT || '5432', 10),
    user: process.env.SUPABASE_DB_USER || process.env.PGUSER || process.env.SQL_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD || process.env.SQL_PASSWORD,
    database: process.env.SUPABASE_DB_NAME || process.env.PGDATABASE || process.env.SQL_DB_NAME || 'postgres',
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 15000,
  };
}

export const createPool = () => {
  if (!global._postgresPool) {
    const config = getSupabasePoolConfig();
    global._postgresPool = new Pool(config);

    global._postgresPool.on('error', (err) => {
      console.warn('[Supabase Postgres Pool] Erro na conexão cliente:', err?.message || err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
export { pool };

/**
 * Supabase client instance using REST API / Realtime (SUPABASE_URL + SUPABASE_ANON_KEY / SERVICE_ROLE)
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!global._supabaseClient) {
    global._supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return global._supabaseClient;
}

