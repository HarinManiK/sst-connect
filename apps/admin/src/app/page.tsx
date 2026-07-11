import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-email";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isAdminEmail(user.email)) {
    redirect("/users");
  }

  // Everyone else gets a plain 404 -- no login form, no hint that an admin
  // panel lives here. The only way in is the secret entry path.
  notFound();
}
