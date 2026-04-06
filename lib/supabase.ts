import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const dbSchema = process.env.NEXT_PUBLIC_DB_SCHEMA || "dev";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey, { db: { schema: dbSchema } })
  : null;
