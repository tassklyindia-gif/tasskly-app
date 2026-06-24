-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for jobs table (for status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
