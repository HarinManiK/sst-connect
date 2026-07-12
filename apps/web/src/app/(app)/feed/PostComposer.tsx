"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/app/actions/posts";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ImageIcon, CloseIcon } from "@/components/Icons";

export function PostComposer({
  authorName,
  authorAvatar,
}: {
  authorName: string;
  authorAvatar: string | null;
}) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function clearFile() {
    pickFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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
        clearFile();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-4 mt-3 p-3">
      <div className="flex gap-3">
        <Avatar name={authorName} src={authorAvatar} size={40} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something with your batch..."
          rows={2}
          className="mt-1.5 w-full resize-none bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {preview && (
        <div className="relative mt-2 ml-[52px]">
          <img src={preview} alt="" className="max-h-64 w-full rounded-xl object-cover" />
          <button
            type="button"
            onClick={clearFile}
            className="tap absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <CloseIcon className="text-sm" />
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="tap flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          <ImageIcon className="text-lg" />
          Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <Button type="submit" size="sm" disabled={pending || (!content.trim() && !file)}>
          {pending ? "Posting..." : "Post"}
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </form>
  );
}
