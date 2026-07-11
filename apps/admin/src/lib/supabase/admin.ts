import { createClient } from "@supabase/supabase-js";

// Service-role client -- the whole admin panel runs server-side only
// (Server Components + Server Actions), so this never reaches a browser.
export function createAdminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
