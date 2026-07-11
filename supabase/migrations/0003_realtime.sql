-- Enable Realtime (used by the chat window's live message subscription).
alter publication supabase_realtime add table messages;
