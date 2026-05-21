import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const dbSchema = process.env.NEXT_PUBLIC_DB_SCHEMA || "public";
const useDevTables = process.env.NEXT_PUBLIC_USE_DEV_TABLES === "1";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function prefixedClient(raw: any) {
  return new Proxy(raw, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(target: any, prop: string) {
      if (prop === "from") {
        return (table: string) => target.from(`dev_${table}`);
      }
      const val = target[prop];
      return typeof val === "function" ? val.bind(target) : val;
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw: any = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey, { db: { schema: dbSchema } })
  : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = raw && useDevTables ? prefixedClient(raw) : raw;
