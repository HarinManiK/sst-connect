"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { BackIcon, SendIcon } from "@/components/Icons";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ChatWindow({
  currentUserId,
  friendId,
  friendName,
  friendAvatar,
  initialMessages,
}: {
  currentUserId: string;
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${[currentUserId, friendId].sort().join(":")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as Message;
          const isThisConversation =
            (row.sender_id === currentUserId && row.receiver_id === friendId) ||
            (row.sender_id === friendId && row.receiver_id === currentUserId);
          if (!isThisConversation) return;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, friendId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");

    const { error } = await supabase
      .from("messages")
      .insert({ sender_id: currentUserId, receiver_id: friendId, content });

    setSending(false);
    if (error) setDraft(content);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-surface/90 px-3 py-2.5 backdrop-blur-lg safe-top">
        <Link
          href="/chats"
          className="tap flex h-9 w-9 items-center justify-center rounded-full text-slate-600"
        >
          <BackIcon className="text-xl" />
        </Link>
        <Avatar name={friendName} src={friendAvatar} size={38} />
        <h1 className="font-semibold text-slate-800">{friendName}</h1>
      </header>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
        {messages.map((m, idx) => {
          const mine = m.sender_id === currentUserId;
          const prev = messages[idx - 1];
          const grouped = prev && prev.sender_id === m.sender_id;
          return (
            <div
              key={m.id}
              className={`flex max-w-[78%] flex-col ${mine ? "self-end items-end" : "self-start items-start"} ${
                grouped ? "mt-0.5" : "mt-2"
              }`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2 text-[15px] ${
                  mine
                    ? "rounded-br-md bg-brand-600 text-white"
                    : "rounded-bl-md bg-surface text-slate-800 border border-border"
                }`}
              >
                {m.content}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-slate-400">{clockTime(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex items-center gap-2 border-t border-border bg-surface px-3 py-2.5 safe-bottom"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"
        >
          <SendIcon className="text-lg" />
        </button>
      </form>
    </div>
  );
}
