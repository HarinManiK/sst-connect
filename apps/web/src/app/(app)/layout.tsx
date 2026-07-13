import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { VerificationBanner } from "@/components/VerificationBanner";
import { Prefetcher } from "@/components/Prefetcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <Prefetcher />
      {profile && !profile.is_verified && <VerificationBanner />}
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
