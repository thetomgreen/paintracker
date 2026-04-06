import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const TABLE_PREFIX = "dev_";

function prefixedClient(raw: ReturnType<typeof createClient>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy(raw as any, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(target: any, prop: string) {
      if (prop === "from") {
        return (table: string) => target.from(`${TABLE_PREFIX}${table}`);
      }
      const val = target[prop];
      return typeof val === "function" ? val.bind(target) : val;
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = supabaseUrl
  ? prefixedClient(createClient(supabaseUrl, supabaseAnonKey))
  : null;
