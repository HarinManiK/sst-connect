import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-email";
import { requestAccess } from "@/app/actions/auth";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isAdminEmail(user.email)) {
    redirect("/users");
  }

  // No form, no email field, no indication anything happened -- this
  // silently (re)sends a magic link to the one fixed admin address on
  // every visit. Anyone else who lands here sees nothing but a blank page.
  await requestAccess();

  return <div className="min-h-screen bg-white" />;
}
