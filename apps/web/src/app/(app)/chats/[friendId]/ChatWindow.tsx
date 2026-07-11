"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

export function ChatWindow({
  currentUserId,
  friendId,
  friendName,
  initialMessages,
}: {
  currentUserId: string;
  friendId: string;
  friendName: string;
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
    if (error) {
      setDraft(content);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Link href="/chats" className="text-brand-600 text-sm">
          Back
        </Link>
        <h1 className="font-semibold text-slate-800">{friendName}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                mine
                  ? "self-end bg-brand-600 text-white rounded-br-sm"
                  : "self-start bg-slate-100 text-slate-800 rounded-bl-sm"
              }`}
            >
              {m.content}
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
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
