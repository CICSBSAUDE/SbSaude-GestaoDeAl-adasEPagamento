import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL;

const sqlHost = process.env.SUPABASE_DB_HOST || process.env.PGHOST || process.env.SQL_HOST || "localhost";
const sqlDbName = process.env.SUPABASE_DB_NAME || process.env.PGDATABASE || process.env.SQL_DB_NAME || "postgres";
const user = process.env.SUPABASE_DB_USER || process.env.PGUSER || process.env.SQL_USER || process.env.SQL_ADMIN_USER || "postgres";
const password = process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD || process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || "";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: connectionString
    ? {
        url: connectionString,
        ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      }
    : {
        host: sqlHost,
        user: user,
        password: password,
        database: sqlDbName,
        ssl: sqlHost === "localhost" ? false : { rejectUnauthorized: false },
      },
  verbose: true,
});

