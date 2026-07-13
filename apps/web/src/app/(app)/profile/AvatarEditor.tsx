"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setAvatar, resetAvatar } from "@/app/actions/avatar";
import { Avatar } from "@/components/Avatar";
import { ImageIcon } from "@/components/Icons";

export function AvatarEditor({
  name,
  initialUrl,
}: {
  name: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function onPick(file: File | null) {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const res = await setAvatar(data.publicUrl);
      if (!res.ok) throw new Error(res.error ?? "Couldn't save photo");
      setUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onReset() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await resetAvatar();
    if (res.ok) setUrl(res.url);
    else setError(res.error ?? "Couldn't reset photo");
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="tap relative"
      >
        <Avatar name={name} src={url} size={92} />
        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-brand-600 text-white">
          <ImageIcon className="text-base" />
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="mt-2 flex items-center gap-3 text-xs">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="tap font-medium text-brand-600">
          {busy ? "Working…" : "Change photo"}
        </button>
        {url && (
          <button type="button" onClick={onReset} disabled={busy} className="tap font-medium text-slate-400">
            Reset
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
