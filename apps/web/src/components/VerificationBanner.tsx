import Link from "next/link";
import { VERIFICATION_DEADLINE } from "@/lib/constants";

export function VerificationBanner() {
  const daysLeft = Math.max(
    0,
    Math.ceil((VERIFICATION_DEADLINE.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link
      href="/profile"
      className="block bg-brand-50 px-4 py-2 text-center text-sm text-brand-800 border-b border-brand-100"
    >
      Link your Scaler email within <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"}</strong> to
      keep your account after Aug 20.
    </Link>
  );
}
