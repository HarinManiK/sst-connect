"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/app/actions/posts";

export function PostComposer() {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        let imageUrl: string | null = null;

        if (file) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("Not authenticated");

          const path = `${user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("post-images")
            .upload(path, file);
          if (uploadError) throw new Error(uploadError.message);

          const { data } = supabase.storage.from("post-images").getPublicUrl(path);
          imageUrl = data.publicUrl;
        }

        await createPost(content, imageUrl);
        setContent("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-4 mt-3 rounded-xl border border-slate-200 p-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with your batch..."
        rows={2}
        className="w-full resize-none text-sm focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-slate-500"
        />
        <button
          type="submit"
          disabled={pending || (!content.trim() && !file)}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Posting..." : "Post"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </form>
  );
}
